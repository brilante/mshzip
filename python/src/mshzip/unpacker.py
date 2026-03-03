'MSH format restore (unpack) - frame parsing + dict accumulation'
from __future__ import annotations

import gzip
import math
import struct

from . import varint
from .constants import (
    MAGIC, Codec, Flag, KNOWN_FLAGS,
    FRAME_HEADER_SIZE,
    BITDICT_EXTRA_HEADER_SIZE,
    COORDDICT_EXTRA_HEADER_SIZE,
)
from .dict_store import DictStore
from .bit_reader import write_all_chunks


class Unpacker:
    'Restore MSH format data to original.'

    def __init__(
        self,
        dict_store: DictStore | None = None,
        dict_dir: str | None = None,
    ) -> None:
        self.dict: list[bytes] = []
        self._dict_store = dict_store
        self._dict_dir = dict_dir
        self._coord_dict_unpacker = None

    def close(self) -> None:
        """리소스 정리."""
        if self._coord_dict_unpacker is not None:
            self._coord_dict_unpacker.close()
            self._coord_dict_unpacker = None

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.close()

    def unpack(self, data: bytes | bytearray | memoryview) -> bytes:
        'Restore MSH data to original.'
        if isinstance(data, memoryview):
            buf = data
        else:
            buf = memoryview(data) if data else memoryview(b'')
        parts: list[bytes] = []
        offset = 0

        while offset < len(buf):
            restored, bytes_consumed = self._read_frame(buf, offset)
            parts.append(restored)
            offset += bytes_consumed

        return b''.join(parts)

    def _read_frame(
        self,
        buf: memoryview | bytes | bytearray,
        offset: int,
    ) -> tuple[bytes, int]:
        'Read and restore single frame. Returns (data, bytes_consumed).'
        start_offset = offset

        if offset + FRAME_HEADER_SIZE > len(buf):
            raise ValueError(f'Insufficient frame header: offset={offset}')

        # Verify magic number
        magic = bytes(buf[offset:offset + 4])
        if magic != MAGIC:
            raise ValueError(f'Invalid magic number: {magic!r}')

        # Header parsing (manual offset - 1:1 mapping with Node.js original)
        off = offset + 4  # after magic
        version = struct.unpack_from('<H', buf, off)[0]; off += 2
        flags = struct.unpack_from('<H', buf, off)[0]; off += 2

        # 알 수 없는 flags 방어적 에러 (하위 호환성)
        unknown_flags = flags & ~KNOWN_FLAGS
        if unknown_flags:
            raise ValueError(
                f'Unsupported flags: 0x{unknown_flags:04x}. '
                'This file requires a newer version of mshzip.'
            )

        chunk_size = struct.unpack_from('<I', buf, off)[0]; off += 4
        codec_id = buf[off]; off += 1
        off += 3  # padding
        orig_bytes_lo = struct.unpack_from('<I', buf, off)[0]; off += 4
        orig_bytes_hi = struct.unpack_from('<I', buf, off)[0]; off += 4
        orig_bytes = orig_bytes_hi * 0x100000000 + orig_bytes_lo
        dict_entries = struct.unpack_from('<I', buf, off)[0]; off += 4
        seq_count = struct.unpack_from('<I', buf, off)[0]; off += 4

        has_hier_dedup = (flags & Flag.HIERDEDUP) != 0
        has_external_dict = (flags & Flag.EXTERNAL_DICT) != 0
        has_bit_dict = (flags & Flag.BITDICT) != 0
        has_coord_dict = (flags & Flag.COORDDICT) != 0

        # COORDDICT 상호 배타 검증
        if has_coord_dict and (flags & (Flag.BITDICT | Flag.HIERDEDUP | Flag.MULTILEVEL | Flag.EXTERNAL_DICT)):
            raise ValueError('COORDDICT는 다른 모드와 동시 사용 불가')

        # BITDICT와 HIERDEDUP/EXTERNAL_DICT 상호 배타 검증
        if has_bit_dict and (flags & (Flag.HIERDEDUP | Flag.EXTERNAL_DICT)):
            raise ValueError('BITDICT는 HIERDEDUP/EXTERNAL_DICT와 동시 사용 불가')

        # COORDDICT: Extra Header 읽기
        coord_dimensions = 0
        coord_rs_axes = 0
        if has_coord_dict:
            coord_dimensions = struct.unpack_from('<H', buf, off)[0]; off += 2
            off += 2  # bitsPerAxis skip
            off += 1  # hammingBits skip
            coord_rs_axes = buf[off]; off += 1
            off += 2  # reserved

        # BITDICT: bitDepth 읽기
        bit_depth = 0
        if has_bit_dict:
            bit_depth = struct.unpack_from('<H', buf, off)[0]; off += BITDICT_EXTRA_HEADER_SIZE

        # EXTERNAL_DICT: baseDictCount 읽기 + 외부 딕셔너리 로드
        base_dict_count = 0
        if has_external_dict:
            base_dict_count = struct.unpack_from('<I', buf, off)[0]; off += 4
            self._load_external_dict(chunk_size, base_dict_count)

        # Compressed payload size
        payload_size = struct.unpack_from('<I', buf, off)[0]; off += 4

        # Read compressed payload
        compressed_payload = bytes(buf[off:off + payload_size])
        off += payload_size

        # CRC32 check
        has_crc = (flags & Flag.CRC32) != 0
        if has_crc:
            off += 4  # CRC skip (Node.js original also skips verification)

        # Decompress payload
        raw_payload = self._decompress(compressed_payload, codec_id)

        # ── COORDDICT 모드 ──
        if has_coord_dict:
            if seq_count > 0 and orig_bytes > 0:
                if self._coord_dict_unpacker is None:
                    from .coord_dict import CoordDictUnpacker
                    self._coord_dict_unpacker = CoordDictUnpacker()
                restored_data = self._coord_dict_unpacker.decode(
                    raw_payload, coord_dimensions, coord_rs_axes, seq_count, orig_bytes
                )
            else:
                restored_data = b''
            return (restored_data, off - start_offset)

        # ── BITDICT 모드: 사전 섹션 없이 바로 시퀀스 복원 ──
        if has_bit_dict:
            if seq_count > 0 and orig_bytes > 0:
                indices, _ = varint.decode_array(raw_payload, 0, seq_count)
                restored = write_all_chunks(indices, bit_depth)
                restored_data = restored[:orig_bytes]
            else:
                restored_data = b''
            return (restored_data, off - start_offset)

        # Parse dict section
        payload_off = 0

        if has_hier_dedup and dict_entries > 0:
            # ── 계층적 Dedup 복원: Dict2 + Seq2 → Dict1 ──

            # Hier Header (8B)
            sub_chunk_size = struct.unpack_from('<I', raw_payload, payload_off)[0]
            payload_off += 4
            dict2_entries = struct.unpack_from('<I', raw_payload, payload_off)[0]
            payload_off += 4

            # Dict2 Section
            dict2: list[bytes] = []
            for _ in range(dict2_entries):
                dict2.append(bytes(raw_payload[payload_off:payload_off + sub_chunk_size]))
                payload_off += sub_chunk_size

            # Seq2 Section → Dict1 복원
            sub_chunks_per_chunk = math.ceil(chunk_size / sub_chunk_size)
            seq2_count = dict_entries * sub_chunks_per_chunk
            seq2_indices, seq2_bytes = varint.decode_array(
                raw_payload, payload_off, seq2_count
            )
            payload_off += seq2_bytes

            # 서브청크 재조립 → Dict1 복원
            for i in range(dict_entries):
                parts: list[bytes] = []
                for j in range(sub_chunks_per_chunk):
                    idx = seq2_indices[i * sub_chunks_per_chunk + j]
                    if idx >= len(dict2):
                        raise ValueError(
                            f'Dict2 index out of range: {idx} >= {len(dict2)}'
                        )
                    parts.append(dict2[idx])
                restored = b''.join(parts)[:chunk_size]
                self.dict.append(restored)
        else:
            # ── 기존 복원 ──
            for _ in range(dict_entries):
                chunk = bytes(raw_payload[payload_off:payload_off + chunk_size])
                self.dict.append(chunk)
                payload_off += chunk_size

        # Parse sequence section
        if seq_count > 0 and orig_bytes > 0:
            indices, _ = varint.decode_array(raw_payload, payload_off, seq_count)

            chunks: list[bytes] = []
            for idx in indices:
                if idx >= len(self.dict):
                    raise ValueError(
                        f'Dict index out of range: {idx} >= {len(self.dict)}'
                    )
                chunks.append(self.dict[idx])

            full_data = b''.join(chunks)
            restored_data = full_data[:orig_bytes]
        else:
            restored_data = b''

        return (restored_data, off - start_offset)

    def _load_external_dict(self, chunk_size: int, base_dict_count: int) -> None:
        '외부 딕셔너리 로드 (EXTERNAL_DICT 프레임 처리 시).'
        if len(self.dict) >= base_dict_count:
            return

        store = self._dict_store or DictStore(dict_dir=self._dict_dir)
        loaded = store.load(chunk_size)

        if loaded['entry_count'] < base_dict_count:
            raise ValueError(
                f'외부 딕셔너리 엔트리 부족: {loaded["entry_count"]} < {base_dict_count}. '
                f'dict-{chunk_size}.mshdict 파일이 손상되었거나 버전이 불일치합니다.'
            )

        self.dict = loaded['dict_chunks'][:base_dict_count]

    @staticmethod
    def _decompress(data: bytes, codec_id: int) -> bytes:
        'Decompress payload.'
        if not data:
            return data

        if codec_id == Codec.NONE:
            return data
        elif codec_id == Codec.GZIP:
            return gzip.decompress(data)
        else:
            raise ValueError(f'Unsupported codec ID: {codec_id}')
