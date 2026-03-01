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
    MIN_CHUNK_SIZE, MAX_CHUNK_SIZE,
    AUTO_DETECT_CANDIDATES, AUTO_DETECT_SAMPLE_LIMIT, AUTO_FALLBACK_CHUNK_SIZE,
)


class Packer:
    'Compress file/stream to MSH format.'

    def __init__(
        self,
        chunk_size: int | str = DEFAULT_CHUNK_SIZE,
        frame_limit: int = DEFAULT_FRAME_LIMIT,
        codec: str = DEFAULT_CODEC,
        crc: bool = False,
    ) -> None:
        self._auto_detect = (chunk_size == 'auto')
        self.chunk_size: int = AUTO_FALLBACK_CHUNK_SIZE if self._auto_detect else int(chunk_size)
        self.frame_limit = frame_limit
        self.codec_name = codec
        self.codec_id = CODEC_NAME.get(codec)
        self.use_crc = crc

        if not self._auto_detect:
            if not (MIN_CHUNK_SIZE <= self.chunk_size <= MAX_CHUNK_SIZE):
                raise ValueError(
                    f'Chunk size out of range: {MIN_CHUNK_SIZE}~{MAX_CHUNK_SIZE}'
                )
        if self.codec_id is None:
            raise ValueError(f'Unsupported codec: {codec}')

        # Global dict: hash(str) -> global index(int)
        self.dict_index: dict[str, int] = {}
        # Global chunk array: index -> chunk data(bytes)
        self.dict_chunks: list[bytes] = []

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

        return b''.join(frames)

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

        # Payload layout: [dict section] + [sequence section]
        dict_section = b''.join(new_chunks) if new_chunks else b''
        seq_section = varint.encode_array(seq_indices) if seq_indices else b''
        raw_payload = dict_section + seq_section

        # Entropy compression
        compressed_payload = self._compress(raw_payload)

        # Build frame header (32 bytes)
        flags = Flag.CRC32 if self.use_crc else 0
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

        # Compressed payload size (4 bytes LE)
        payload_size_buf = struct.pack('<I', len(compressed_payload))

        parts = [header_bytes, payload_size_buf, compressed_payload]

        # CRC32 (optional)
        if self.use_crc:
            crc_data = header_bytes + payload_size_buf + compressed_payload
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
