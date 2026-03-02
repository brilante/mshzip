'MSH format compression (pack) - SHA-256 dedup + entropy compression'
from __future__ import annotations

import gzip
import hashlib
import struct
import zlib

from . import varint
from .constants import (
    MAGIC, VERSION, Codec, CODEC_NAME, Flag,
    FRAME_HEADER_SIZE,
    DEFAULT_CHUNK_SIZE, DEFAULT_FRAME_LIMIT, DEFAULT_CODEC,
    DEFAULT_SUB_CHUNK_SIZE,
    MIN_CHUNK_SIZE, MAX_CHUNK_SIZE,
    AUTO_DETECT_CANDIDATES, AUTO_DETECT_SAMPLE_LIMIT, AUTO_FALLBACK_CHUNK_SIZE,
)
from .dict_store import DictStore


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

    def pack(self, data: bytes | bytearray | memoryview) -> bytes:
        'Compress buffer input to MSH format.'
        if isinstance(data, memoryview):
            input_view = data
        else:
            input_view = memoryview(data) if data else memoryview(b'')

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
