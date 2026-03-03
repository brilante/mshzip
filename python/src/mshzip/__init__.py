'mshzip - Fixed-chunk dedup + entropy compression'
from __future__ import annotations

from .packer import Packer
from .unpacker import Unpacker
from .dict_store import DictStore
from .bit_dict import BitDict
from .coord_dict import CoordDictPacker, CoordDictUnpacker
from . import hamming
from . import reed_solomon
from .stream import PackStream, UnpackStream, pack_stream, unpack_stream
from . import constants
from . import varint
from . import bit_reader


def pack(data: bytes | bytearray, **opts) -> bytes:
    'Compress data (simple API).'
    packer = Packer(**opts)
    return packer.pack(data)


def unpack(data: bytes | bytearray, **opts) -> bytes:
    'Decompress data (simple API).'
    unpacker = Unpacker(**opts)
    return unpacker.unpack(data)


__all__ = [
    'pack', 'unpack',
    'Packer', 'Unpacker', 'DictStore', 'BitDict',
    'CoordDictPacker', 'CoordDictUnpacker',
    'hamming', 'reed_solomon',
    'PackStream', 'UnpackStream',
    'pack_stream', 'unpack_stream',
    'constants', 'varint', 'bit_reader',
]

__version__ = '2.0.0'
