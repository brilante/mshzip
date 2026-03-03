'Streaming compression/decompression - generator based'
from __future__ import annotations

from typing import BinaryIO, Generator

from .packer import Packer
from .unpacker import Unpacker
from .constants import (
    MAGIC, Flag, FRAME_HEADER_SIZE,
    DEFAULT_CHUNK_SIZE, DEFAULT_FRAME_LIMIT, DEFAULT_CODEC,
    DEFAULT_SUB_CHUNK_SIZE,
    AUTO_DETECT_STREAM_MIN,
)


class PackStream:
    'Streaming compression. Feed data via feed(), yield frames.'

    def __init__(
        self,
        chunk_size: int | str = DEFAULT_CHUNK_SIZE,
        frame_limit: int = DEFAULT_FRAME_LIMIT,
        codec: str = DEFAULT_CODEC,
        crc: bool = False,
        hier_dedup: str | bool = 'auto',
        sub_chunk_size: int = DEFAULT_SUB_CHUNK_SIZE,
        bit_depth: int | None = None,
        strict_bit_dict: bool = False,
        coord_dict: bool = False,
        dimensions: int | None = None,
    ) -> None:
        self._auto_mode = (chunk_size == 'auto')
        self._detected = not self._auto_mode

        self._packer = Packer(
            chunk_size=chunk_size,
            frame_limit=frame_limit,
            codec=codec,
            crc=crc,
            hier_dedup=hier_dedup,
            sub_chunk_size=sub_chunk_size,
            bit_depth=bit_depth,
            strict_bit_dict=strict_bit_dict,
            coord_dict=coord_dict,
            dimensions=dimensions,
        )
        self._frame_limit = self._packer.frame_limit
        self._pending = bytearray()
        self._total_bytes_in = 0
        self._total_bytes_out = 0
        self._frame_count = 0

    def _try_auto_detect(self) -> None:
        'Auto mode: detect optimal chunk size when enough data is buffered.'
        if self._detected:
            return
        if len(self._pending) >= AUTO_DETECT_STREAM_MIN:
            self._packer.chunk_size = self._packer._detect_chunk_size(bytes(self._pending))
            self._packer._auto_detect = False
            self._detected = True

    def feed(self, data: bytes | bytearray) -> Generator[bytes, None, None]:
        'Feed data chunk and yield completed frames.'
        self._pending.extend(data)
        self._total_bytes_in += len(data)

        # auto mode: attempt detection
        self._try_auto_detect()

        # Emit frames only when detection is complete (or fixed mode)
        if self._detected:
            build_fn = (
                self._packer._build_coord_dict_frame
                if self._packer._coord_dict_active
                else self._packer._build_bit_dict_frame
                if self._packer._bit_dict_active
                else self._packer._build_frame
            )
            while len(self._pending) >= self._frame_limit:
                slice_data = bytes(self._pending[:self._frame_limit])
                needs_bytes = self._packer._bit_dict_active or self._packer._coord_dict_active
                frame = build_fn(
                    slice_data if needs_bytes else memoryview(slice_data),
                    0, len(slice_data),
                )
                self._total_bytes_out += len(frame)
                self._frame_count += 1
                yield frame
                del self._pending[:self._frame_limit]

    def flush(self) -> Generator[bytes, None, None]:
        'Flush remaining data as frames.'
        # Force detection at flush if not yet detected
        if not self._detected and self._pending:
            self._packer.chunk_size = self._packer._detect_chunk_size(bytes(self._pending))
            self._packer._auto_detect = False
            self._detected = True

        build_fn = (
            self._packer._build_coord_dict_frame
            if self._packer._coord_dict_active
            else self._packer._build_bit_dict_frame
            if self._packer._bit_dict_active
            else self._packer._build_frame
        )
        needs_bytes = self._packer._bit_dict_active or self._packer._coord_dict_active
        if self._pending:
            pending_bytes = bytes(self._pending)
            frame = build_fn(
                pending_bytes if needs_bytes else memoryview(pending_bytes),
                0, len(pending_bytes),
            )
            self._total_bytes_out += len(frame)
            self._frame_count += 1
            yield frame
        elif self._frame_count == 0:
            frame = build_fn(
                b'' if needs_bytes else memoryview(b''),
                0, 0,
            )
            self._total_bytes_out += len(frame)
            self._frame_count += 1
            yield frame
        self._pending.clear()

    @property
    def stats(self) -> dict:
        return {
            'bytes_in': self._total_bytes_in,
            'bytes_out': self._total_bytes_out,
            'frame_count': self._frame_count,
            'dict_size': len(self._packer.dict_chunks),
            'chunk_size': self._packer.chunk_size,
        }


class UnpackStream:
    'Streaming decompression. Feed MSH data via feed(), yield original data.'

    def __init__(self) -> None:
        self._unpacker = Unpacker()
        self._buf = bytearray()
        self._total_bytes_in = 0
        self._total_bytes_out = 0
        self._frame_count = 0

    def feed(self, data: bytes | bytearray) -> Generator[bytes, None, None]:
        'Feed MSH data chunk and yield restored original data.'
        self._buf.extend(data)
        self._total_bytes_in += len(data)

        while True:
            if len(self._buf) < FRAME_HEADER_SIZE + 4:
                break

            magic = bytes(self._buf[:4])
            if magic != MAGIC:
                raise ValueError(f'Invalid magic number: {magic.hex()}')

            flags = int.from_bytes(self._buf[6:8], 'little')
            has_crc = (flags & Flag.CRC32) != 0
            has_bit_dict = (flags & Flag.BITDICT) != 0
            has_external_dict = (flags & Flag.EXTERNAL_DICT) != 0
            has_coord_dict = (flags & Flag.COORDDICT) != 0

            # 추가 헤더 크기: COORDDICT(8B) | BITDICT(2B) | EXTERNAL_DICT(4B) | 기본(0B)
            extra_header = 8 if has_coord_dict else (2 if has_bit_dict else (4 if has_external_dict else 0))
            payload_offset = FRAME_HEADER_SIZE + extra_header

            if len(self._buf) < payload_offset + 4:
                break

            payload_size = int.from_bytes(
                self._buf[payload_offset:payload_offset + 4], 'little',
            )

            total_frame_size = (
                payload_offset + 4 + payload_size + (4 if has_crc else 0)
            )

            if len(self._buf) < total_frame_size:
                break

            frame_buf = bytes(self._buf[:total_frame_size])
            del self._buf[:total_frame_size]

            restored, _ = self._unpacker._read_frame(frame_buf, 0)
            self._total_bytes_out += len(restored)
            self._frame_count += 1
            yield restored

    def finalize(self) -> None:
        'Check for remaining data at stream end.'
        if self._buf:
            raise ValueError(
                f'Remaining data at stream end: {len(self._buf)} bytes'
            )

    @property
    def stats(self) -> dict:
        return {
            'bytes_in': self._total_bytes_in,
            'bytes_out': self._total_bytes_out,
            'frame_count': self._frame_count,
            'dict_size': len(self._unpacker.dict),
        }


def pack_stream(
    input_stream: BinaryIO,
    output_stream: BinaryIO,
    chunk_size: int | str = DEFAULT_CHUNK_SIZE,
    frame_limit: int = DEFAULT_FRAME_LIMIT,
    codec: str = DEFAULT_CODEC,
    crc: bool = False,
    hier_dedup: str | bool = 'auto',
    sub_chunk_size: int = DEFAULT_SUB_CHUNK_SIZE,
    bit_depth: int | None = None,
    coord_dict: bool = False,
    dimensions: int | None = None,
    read_size: int = 65536,
) -> dict:
    'Stream-based compression convenience function. Returns stats dict.'
    ps = PackStream(
        chunk_size=chunk_size,
        frame_limit=frame_limit,
        codec=codec,
        crc=crc,
        hier_dedup=hier_dedup,
        sub_chunk_size=sub_chunk_size,
        bit_depth=bit_depth,
        coord_dict=coord_dict,
        dimensions=dimensions,
    )

    while True:
        chunk = input_stream.read(read_size)
        if not chunk:
            break
        for frame in ps.feed(chunk):
            output_stream.write(frame)

    for frame in ps.flush():
        output_stream.write(frame)

    return ps.stats


def unpack_stream(
    input_stream: BinaryIO,
    output_stream: BinaryIO,
    read_size: int = 65536,
) -> dict:
    'Stream-based decompression convenience function. Returns stats dict.'
    us = UnpackStream()

    while True:
        chunk = input_stream.read(read_size)
        if not chunk:
            break
        for data in us.feed(chunk):
            output_stream.write(data)

    us.finalize()
    return us.stats
