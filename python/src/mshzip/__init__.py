'mshzip - Fixed-chunk dedup + entropy compression'
from __future__ import annotations

from .packer import Packer
from .unpacker import Unpacker
from .stream import PackStream, UnpackStream, pack_stream, unpack_stream
from . import constants
from . import varint


def pack(data: bytes | bytearray, **opts) -> bytes:
    'Compress data (simple API).'
    packer = Packer(**opts)
    return packer.pack(data)


def unpack(data: bytes | bytearray) -> bytes:
    'Decompress data (simple API).'
    unpacker = Unpacker()
    return unpacker.unpack(data)


__all__ = [
    'pack', 'unpack',
    'Packer', 'Unpacker',
    'PackStream', 'UnpackStream',
    'pack_stream', 'unpack_stream',
    'constants', 'varint',
]

__version__ = '1.0.0'
