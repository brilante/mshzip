'Streaming compression/decompression - generator based'
from __future__ import annotations

from typing import BinaryIO, Generator

from .packer import Packer
from .unpacker import Unpacker
from .constants import (
    MAGIC, Flag, FRAME_HEADER_SIZE,
    DEFAULT_CHUNK_SIZE, DEFAULT_FRAME_LIMIT, DEFAULT_CODEC,
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
    ) -> None:
        self._auto_mode = (chunk_size == 'auto')
        self._detected = not self._auto_mode

        self._packer = Packer(
            chunk_size=chunk_size,
            frame_limit=frame_limit,
            codec=codec,
            crc=crc,
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
            while len(self._pending) >= self._frame_limit:
                slice_data = bytes(self._pending[:self._frame_limit])
                frame = self._packer._build_frame(
                    memoryview(slice_data), 0, len(slice_data),
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

        if self._pending:
            pending_bytes = bytes(self._pending)
            frame = self._packer._build_frame(
                memoryview(pending_bytes), 0, len(pending_bytes),
            )
            self._total_bytes_out += len(frame)
            self._frame_count += 1
            yield frame
        elif self._frame_count == 0:
            frame = self._packer._build_frame(memoryview(b''), 0, 0)
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

            payload_size = int.from_bytes(
                self._buf[FRAME_HEADER_SIZE:FRAME_HEADER_SIZE + 4], 'little',
            )

            total_frame_size = (
                FRAME_HEADER_SIZE + 4 + payload_size + (4 if has_crc else 0)
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
    read_size: int = 65536,
) -> dict:
    'Stream-based compression convenience function. Returns stats dict.'
    ps = PackStream(
        chunk_size=chunk_size,
        frame_limit=frame_limit,
        codec=codec,
        crc=crc,
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
