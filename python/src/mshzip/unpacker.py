'MSH format restore (unpack) - frame parsing + dict accumulation'
from __future__ import annotations

import gzip
import struct

from . import varint
from .constants import (
    MAGIC, Codec, Flag,
    FRAME_HEADER_SIZE,
)


class Unpacker:
    'Restore MSH format data to original.'

    def __init__(self) -> None:
        self.dict: list[bytes] = []

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
        chunk_size = struct.unpack_from('<I', buf, off)[0]; off += 4
        codec_id = buf[off]; off += 1
        off += 3  # padding
        orig_bytes_lo = struct.unpack_from('<I', buf, off)[0]; off += 4
        orig_bytes_hi = struct.unpack_from('<I', buf, off)[0]; off += 4
        orig_bytes = orig_bytes_hi * 0x100000000 + orig_bytes_lo
        dict_entries = struct.unpack_from('<I', buf, off)[0]; off += 4
        seq_count = struct.unpack_from('<I', buf, off)[0]; off += 4

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

        # Parse dict section
        payload_off = 0
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
