'MSH format compression (pack) - SHA-256 dedup + entropy compression'
from __future__ import annotations

import gzip
import hashlib
import struct
import zlib

import sys

from . import varint
from .constants import (
    MAGIC, VERSION, Codec, CODEC_NAME, Flag,
    FRAME_HEADER_SIZE,
    DEFAULT_CHUNK_SIZE, DEFAULT_FRAME_LIMIT, DEFAULT_CODEC,
    DEFAULT_SUB_CHUNK_SIZE,
    MIN_CHUNK_SIZE, MAX_CHUNK_SIZE,
    AUTO_DETECT_CANDIDATES, AUTO_DETECT_SAMPLE_LIMIT, AUTO_FALLBACK_CHUNK_SIZE,
    BITDICT_EXTRA_HEADER_SIZE,
    COORDDICT_EXTRA_HEADER_SIZE,
)
from .dict_store import DictStore
from .bit_dict import BitDict
from .bit_reader import read_all_chunks


class Packer:
    'Compress file/stream to MSH format.'

    def __init__(
        self,
        chunk_size: int | str = DEFAULT_CHUNK_SIZE,
        frame_limit: int = DEFAULT_FRAME_LIMIT,
        codec: str = DEFAULT_CODEC,
        crc: bool = False,
        hier_dedup: str | bool = 'auto',
        sub_chunk_size: int = DEFAULT_SUB_CHUNK_SIZE,
        dict_store: DictStore | None = None,
        use_dict: bool = False,
        dict_dir: str | None = None,
        max_dict_size: int | None = None,
        bit_depth: int | None = None,
        strict_bit_dict: bool = False,
        coord_dict: bool = False,
        dimensions: int | None = None,
    ) -> None:
        self._auto_detect = (chunk_size == 'auto')
        self.chunk_size: int = AUTO_FALLBACK_CHUNK_SIZE if self._auto_detect else int(chunk_size)
        self.frame_limit = frame_limit
        self.codec_name = codec
        self.codec_id = CODEC_NAME.get(codec)
        self.use_crc = crc

        # 계층적 Dedup 옵션
        self.hier_dedup = hier_dedup
        self.sub_chunk_size = sub_chunk_size

        if not self._auto_detect:
            if not (MIN_CHUNK_SIZE <= self.chunk_size <= MAX_CHUNK_SIZE):
                raise ValueError(
                    f'Chunk size out of range: {MIN_CHUNK_SIZE}~{MAX_CHUNK_SIZE}'
                )
        if self.codec_id is None:
            raise ValueError(f'Unsupported codec: {codec}')
        if self.sub_chunk_size < MIN_CHUNK_SIZE:
            raise ValueError(
                f'Sub-chunk size too small: {self.sub_chunk_size} (min: {MIN_CHUNK_SIZE})'
            )

        # Global dict: hash(str) -> global index(int)
        self.dict_index: dict[str, int] = {}
        # Global chunk array: index -> chunk data(bytes)
        self.dict_chunks: list[bytes] = []

        # 외부 딕셔너리
        self._dict_store = dict_store
        self._use_dict = use_dict
        self._base_dict_count = 0

        if self._use_dict and not self._dict_store:
            self._dict_store = DictStore(
                dict_dir=dict_dir,
                max_dict_size=max_dict_size,
            )

        # CoordDict (XD 좌표 사전) 옵션
        self.coord_dict = coord_dict
        self._coord_dict_active = False
        self._coord_dimensions = dimensions

        if self.coord_dict:
            if bit_depth:
                raise ValueError('COORDDICT는 BITDICT와 동시 사용 불가')
            from .coord_dict import CoordDictPacker
            self._coord_dict_packer = CoordDictPacker(dimensions=self._coord_dimensions)
            self._coord_dict_active = True

        # BitDict (N비트 전수 사전) 옵션
        self.bit_depth: int | None = bit_depth
        self._bit_dict_active = False

        if self.bit_depth is not None:
            bd = BitDict(
                dict_dir=dict_dir,
                max_mem_bytes=max_dict_size,
            )
            if bd.is_over_limit(self.bit_depth):
                if strict_bit_dict:
                    raise MemoryError(
                        f'BitDict 메모리 초과: bit_depth={self.bit_depth}, '
                        f'필요={bd.estimate_mem_bytes(self.bit_depth)} > '
                        f'한계={bd.max_mem_bytes}'
                    )
                sys.stderr.write(
                    f'[mshzip] BitDict 메모리 초과 (bit_depth={self.bit_depth}), '
                    f'기존 모드로 폴백\n'
                )
                self.bit_depth = None
            else:
                bd.load(self.bit_depth)
                self._bit_dict_active = True

    def close(self) -> None:
        """리소스 정리 (ThreadPoolExecutor 등)."""
        if self._coord_dict_active and hasattr(self, '_coord_dict_packer'):
            self._coord_dict_packer.close()

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.close()

    def pack(self, data: bytes | bytearray | memoryview) -> bytes:
        'Compress buffer input to MSH format.'
        if isinstance(data, memoryview):
            input_view = data
        else:
            input_view = memoryview(data) if data else memoryview(b'')

        # CoordDict 모드: 별도 경로
        if self._coord_dict_active:
            return self._pack_coord_dict(bytes(input_view))

        # BitDict 모드: 별도 경로
        if self._bit_dict_active:
            return self._pack_bit_dict(bytes(input_view))

        # auto mode: detect optimal chunk size on first call
        if self._auto_detect and len(input_view) > 0:
            self.chunk_size = self._detect_chunk_size(bytes(input_view))
            self._auto_detect = False

        # 외부 딕셔너리 로드
        self._load_external_dict()

        frames: list[bytes] = []
        offset = 0
        total_len = len(input_view)

        while offset < total_len:
            frame_end = min(offset + self.frame_limit, total_len)
            frame = self._build_frame(input_view, offset, frame_end)
            frames.append(frame)
            offset = frame_end

        # Empty input also generates one empty frame
        if not frames:
            frame = self._build_frame(memoryview(b''), 0, 0)
            frames.append(frame)

        # 외부 딕셔너리 저장
        self._save_external_dict()

        return b''.join(frames)

    def _load_external_dict(self) -> None:
        '외부 딕셔너리 로드 (DictStore 사용 시).'
        if not self._dict_store:
            return
        if self._dict_store.is_over_limit(self.chunk_size):
            self._dict_store = None
            self._use_dict = False
            return

        loaded = self._dict_store.load(self.chunk_size)
        if loaded['entry_count'] > 0:
            self.dict_index = loaded['dict_index']
            self.dict_chunks = loaded['dict_chunks']
        self._base_dict_count = loaded['entry_count']

    def _save_external_dict(self) -> None:
        '외부 딕셔너리 저장 (DictStore 사용 시).'
        if not self._dict_store:
            return
        if len(self.dict_chunks) > self._base_dict_count:
            self._dict_store.save(
                self.chunk_size, self.dict_index, self.dict_chunks,
                self._base_dict_count,
            )

    def _build_frame(
        self,
        data: memoryview | bytes | bytearray,
        start: int,
        end: int,
    ) -> bytes:
        'Build frame for input range [start, end).'
        orig_bytes = end - start
        new_chunks: list[bytes] = []
        seq_indices: list[int] = []

        # Chunk split + dedup
        pos = start
        while pos < end:
            chunk_end = min(pos + self.chunk_size, end)
            chunk = bytes(data[pos:chunk_end])

            # Zero-pad if last chunk is smaller than chunk_size
            if len(chunk) < self.chunk_size:
                chunk = chunk + b'\x00' * (self.chunk_size - len(chunk))

            # Check duplicates via SHA-256 hash
            h = hashlib.sha256(chunk).hexdigest()

            idx = self.dict_index.get(h)
            if idx is None:
                idx = len(self.dict_chunks)
                self.dict_index[h] = idx
                self.dict_chunks.append(chunk)
                new_chunks.append(chunk)

            seq_indices.append(idx)
            pos = chunk_end

        dict_entries_in_frame = len(new_chunks)
        seq_count = len(seq_indices)

        # Dict1 (1차 사전)
        dict1 = b''.join(new_chunks) if new_chunks else b''

        # 계층적 Dedup 판단 및 적용
        use_hier = False

        if dict1 and self.hier_dedup is not False:
            should_apply = (
                self.hier_dedup is True
                or self._should_apply_hier_dedup(dict1, self.sub_chunk_size)
            )

            if should_apply:
                use_hier = True
                dict2_data, seq2_indices, dict2_entries = self._build_hier_dict(
                    dict1, self.sub_chunk_size
                )

                # Hier Header (8바이트): sub_chunk_size(4B) + dict2_entries(4B)
                hier_header = struct.pack('<II', self.sub_chunk_size, dict2_entries)

                dict2_section = dict2_data
                seq2_section = varint.encode_array(seq2_indices)
                seq1_section = varint.encode_array(seq_indices) if seq_indices else b''

                raw_payload = hier_header + dict2_section + seq2_section + seq1_section

        if not use_hier:
            seq_section = varint.encode_array(seq_indices) if seq_indices else b''
            raw_payload = dict1 + seq_section

        # Entropy compression
        compressed_payload = self._compress(raw_payload)

        # Build frame header (32 bytes)
        use_external_dict = self._base_dict_count > 0
        flags = (
            (Flag.CRC32 if self.use_crc else 0)
            | (Flag.HIERDEDUP if use_hier else 0)
            | (Flag.EXTERNAL_DICT if use_external_dict else 0)
        )
        header = bytearray(FRAME_HEADER_SIZE)
        off = 0
        header[off:off + 4] = MAGIC; off += 4
        struct.pack_into('<H', header, off, VERSION); off += 2
        struct.pack_into('<H', header, off, flags); off += 2
        struct.pack_into('<I', header, off, self.chunk_size); off += 4
        header[off] = self.codec_id; off += 1
        off += 3  # padding
        struct.pack_into('<I', header, off, orig_bytes & 0xFFFFFFFF); off += 4
        struct.pack_into('<I', header, off, orig_bytes >> 32); off += 4
        struct.pack_into('<I', header, off, dict_entries_in_frame); off += 4
        struct.pack_into('<I', header, off, seq_count); off += 4

        header_bytes = bytes(header)

        parts: list[bytes] = [header_bytes]

        # EXTERNAL_DICT 메타데이터: baseDictCount (4B)
        if use_external_dict:
            parts.append(struct.pack('<I', self._base_dict_count))

        # Compressed payload size (4 bytes LE)
        payload_size_buf = struct.pack('<I', len(compressed_payload))
        parts.extend([payload_size_buf, compressed_payload])

        # CRC32 (optional) — 전체 프레임 데이터(CRC 제외)에 대해 계산
        if self.use_crc:
            crc_data = b''.join(parts)
            crc_val = zlib.crc32(crc_data) & 0xFFFFFFFF
            parts.append(struct.pack('<I', crc_val))

        return b''.join(parts)

    def _pack_coord_dict(self, data: bytes) -> bytes:
        """CoordDict 모드 Pack."""
        frames: list[bytes] = []
        offset = 0
        total_len = len(data)

        while offset < total_len:
            frame_end = min(offset + self.frame_limit, total_len)
            frame = self._build_coord_dict_frame(data, offset, frame_end)
            frames.append(frame)
            offset = frame_end

        if not frames:
            frames.append(self._build_coord_dict_frame(b'', 0, 0))

        return b''.join(frames)

    def _build_coord_dict_frame(self, data: bytes, start: int, end: int) -> bytes:
        """CoordDict 프레임 빌드."""
        import math
        orig_bytes = end - start
        packer = self._coord_dict_packer
        D = packer.dimensions
        rs_axes = packer.rs_axes

        seq_count = 0
        if orig_bytes > 0:
            data_slice = data[start:end]
            encoded, seq_count = packer.encode(data_slice)
            compressed_payload = self._compress(encoded)
        else:
            compressed_payload = b''

        # 프레임 헤더 (32B)
        flags = (Flag.CRC32 if self.use_crc else 0) | Flag.COORDDICT
        chunk_size_field = D * 128

        header = bytearray(FRAME_HEADER_SIZE)
        off = 0
        header[off:off + 4] = MAGIC; off += 4
        struct.pack_into('<H', header, off, VERSION); off += 2
        struct.pack_into('<H', header, off, flags); off += 2
        struct.pack_into('<I', header, off, chunk_size_field); off += 4
        header[off] = self.codec_id; off += 1
        off += 3
        struct.pack_into('<I', header, off, orig_bytes & 0xFFFFFFFF); off += 4
        struct.pack_into('<I', header, off, orig_bytes >> 32); off += 4
        struct.pack_into('<I', header, off, 0); off += 4  # dictEntries = 0
        struct.pack_into('<I', header, off, seq_count); off += 4

        parts: list[bytes] = [bytes(header)]

        # CoordDict Extra Header (8B)
        extra = struct.pack('<HHBBxx', D, 1024, 11, rs_axes)
        parts.append(extra)

        # payloadSize (4B) + payload
        parts.append(struct.pack('<I', len(compressed_payload)))
        parts.append(compressed_payload)

        # CRC32
        if self.use_crc:
            crc_data = b''.join(parts)
            crc_val = zlib.crc32(crc_data) & 0xFFFFFFFF
            parts.append(struct.pack('<I', crc_val))

        return b''.join(parts)

    def _pack_bit_dict(self, data: bytes) -> bytes:
        """BitDict 모드 Pack: N비트 전수 사전."""
        frames: list[bytes] = []
        offset = 0
        total_len = len(data)

        while offset < total_len:
            frame_end = min(offset + self.frame_limit, total_len)
            frame = self._build_bit_dict_frame(data, offset, frame_end)
            frames.append(frame)
            offset = frame_end

        # Empty input
        if not frames:
            frames.append(self._build_bit_dict_frame(b'', 0, 0))

        return b''.join(frames)

    def _build_bit_dict_frame(self, data: bytes, start: int, end: int) -> bytes:
        """BitDict 프레임 빌드."""
        orig_bytes = end - start
        data_slice = data[start:end]

        # N비트씩 읽기 -> 인덱스 배열 (나머지 비트를 위해 패딩)
        seq_indices: list[int] = []
        if orig_bytes > 0:
            total_bits = orig_bytes * 8
            padded_chunks = -(-total_bits // self.bit_depth)  # ceil division
            padded_bit_len = padded_chunks * self.bit_depth
            padded_byte_len = -(-padded_bit_len // 8)  # ceil division

            padded_slice = data_slice
            if padded_byte_len > orig_bytes:
                padded_slice = data_slice + b'\x00' * (padded_byte_len - orig_bytes)

            seq_indices, _ = read_all_chunks(padded_slice, self.bit_depth)

        seq_count = len(seq_indices)

        # varint 인코딩 -> gzip 압축
        seq_section = varint.encode_array(seq_indices) if seq_count > 0 else b''
        compressed_payload = self._compress(seq_section)

        # 프레임 헤더
        flags = (Flag.CRC32 if self.use_crc else 0) | Flag.BITDICT
        chunk_size_field = (self.bit_depth + 7) // 8  # 바이트 호환

        header = bytearray(FRAME_HEADER_SIZE)
        off = 0
        header[off:off + 4] = MAGIC; off += 4
        struct.pack_into('<H', header, off, VERSION); off += 2
        struct.pack_into('<H', header, off, flags); off += 2
        struct.pack_into('<I', header, off, chunk_size_field); off += 4
        header[off] = self.codec_id; off += 1
        off += 3  # padding
        struct.pack_into('<I', header, off, orig_bytes & 0xFFFFFFFF); off += 4
        struct.pack_into('<I', header, off, orig_bytes >> 32); off += 4
        struct.pack_into('<I', header, off, 0); off += 4  # dictEntries = 0
        struct.pack_into('<I', header, off, seq_count); off += 4

        parts: list[bytes] = [bytes(header)]

        # BITDICT 추가 헤더: bitDepth (2B)
        parts.append(struct.pack('<H', self.bit_depth))

        # payloadSize (4B) + 압축 페이로드
        parts.append(struct.pack('<I', len(compressed_payload)))
        parts.append(compressed_payload)

        # CRC32 (선택)
        if self.use_crc:
            crc_data = b''.join(parts)
            crc_val = zlib.crc32(crc_data) & 0xFFFFFFFF
            parts.append(struct.pack('<I', crc_val))

        return b''.join(parts)

    def _detect_chunk_size(self, data: bytes) -> int:
        'Auto-detect optimal chunk size by sampling data.'
        sample_end = min(len(data), AUTO_DETECT_SAMPLE_LIMIT)
        sample = data[:sample_end]

        best_cs = AUTO_FALLBACK_CHUNK_SIZE
        best_cost = float('inf')

        for cs in AUTO_DETECT_CANDIDATES:
            if cs > sample_end:
                continue

            hashes: set[str] = set()
            pos = 0
            total_chunks = 0

            while pos < sample_end:
                end = min(pos + cs, sample_end)
                chunk = sample[pos:end]

                if len(chunk) < cs:
                    chunk = chunk + b'\x00' * (cs - len(chunk))

                h = hashlib.sha256(chunk).hexdigest()
                hashes.add(h)
                total_chunks += 1
                pos += cs

            unique_count = len(hashes)
            dict_cost = unique_count * cs
            # Estimate varint byte count (LEB128: 7-bit units)
            varint_bytes = 1 if unique_count <= 127 else 2 if unique_count <= 16383 else 3
            seq_cost = total_chunks * varint_bytes
            total_cost = dict_cost + seq_cost

            if total_cost < best_cost:
                best_cost = total_cost
                best_cs = cs

        return best_cs

    def _build_hier_dict(
        self,
        dict1: bytes,
        sub_chunk_size: int,
    ) -> tuple[bytes, list[int], int]:
        'Dict1을 sub_chunk_size로 재분할하여 2차 중복 제거 수행 (프레임 로컬).'
        dict2_index: dict[str, int] = {}
        dict2_chunks: list[bytes] = []
        seq2_indices: list[int] = []

        pos = 0
        while pos < len(dict1):
            sub_end = min(pos + sub_chunk_size, len(dict1))
            sub_chunk = dict1[pos:sub_end]

            # 마지막 서브청크 패딩
            if len(sub_chunk) < sub_chunk_size:
                sub_chunk = sub_chunk + b'\x00' * (sub_chunk_size - len(sub_chunk))

            h = hashlib.sha256(sub_chunk).hexdigest()

            idx = dict2_index.get(h)
            if idx is None:
                idx = len(dict2_chunks)
                dict2_index[h] = idx
                dict2_chunks.append(sub_chunk)

            seq2_indices.append(idx)
            pos = sub_end

        dict2_data = b''.join(dict2_chunks) if dict2_chunks else b''
        return (dict2_data, seq2_indices, len(dict2_chunks))

    def _should_apply_hier_dedup(
        self,
        dict1: bytes,
        sub_chunk_size: int,
    ) -> bool:
        '2차 pass 적용 여부 자동 판단. 손익분기: dupRatio > varintBytes / subChunkSize × 1.2'
        # 최소 크기: 서브청크 4개 미만이면 의미 없음
        if len(dict1) < sub_chunk_size * 4:
            return False

        # 샘플링 (최대 32KB)
        sample_limit = min(len(dict1), 32 * 1024)
        sample = dict1[:sample_limit]
        hashes: set[str] = set()
        total_sub_chunks = 0

        pos = 0
        while pos < len(sample):
            sub_end = min(pos + sub_chunk_size, len(sample))
            sub_chunk = sample[pos:sub_end]

            if len(sub_chunk) < sub_chunk_size:
                sub_chunk = sub_chunk + b'\x00' * (sub_chunk_size - len(sub_chunk))

            hashes.add(hashlib.sha256(sub_chunk).hexdigest())
            total_sub_chunks += 1
            pos = sub_end

        dup_ratio = 1 - (len(hashes) / total_sub_chunks)
        avg_varint = 1 if len(hashes) <= 127 else 2 if len(hashes) <= 16383 else 3
        break_even = avg_varint / sub_chunk_size

        # 안전 마진 20%
        return dup_ratio > break_even * 1.2

    def _compress(self, data: bytes) -> bytes:
        'Compress payload.'
        if not data:
            return data

        if self.codec_id == Codec.NONE:
            return data
        elif self.codec_id == Codec.GZIP:
            return gzip.compress(data, compresslevel=1)
        else:
            return data
