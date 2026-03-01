'unsigned varint (uvarint) encode/decode - protobuf LEB128 compatible'
from __future__ import annotations


def encode(value: int) -> bytes:
    'Encode uint32 value as uvarint, return bytes.'
    result = bytearray()
    while value > 0x7F:
        result.append((value & 0x7F) | 0x80)
        value >>= 7
    result.append(value & 0x7F)
    return bytes(result)


def encode_array(values: list[int]) -> bytes:
    'Encode multiple uint32 values as consecutive uvarints.'
    parts = bytearray()
    for v in values:
        parts.extend(encode(v))
    return bytes(parts)


def decode(buf: bytes | bytearray | memoryview, offset: int = 0) -> tuple[int, int]:
    'Returns (value, bytes_read).'
    value = 0
    shift = 0
    bytes_read = 0
    pos = offset

    while pos < len(buf):
        b = buf[pos]
        value |= (b & 0x7F) << shift
        pos += 1
        bytes_read += 1
        if (b & 0x80) == 0:
            return (value & 0xFFFFFFFF, bytes_read)
        shift += 7
        if shift > 35:
            raise ValueError('varint overflow: value too large')

    raise ValueError('varint incomplete: insufficient data')


def decode_array(
    buf: bytes | bytearray | memoryview,
    offset: int,
    count: int,
) -> tuple[list[int], int]:
    'Returns (values, total_bytes_read).'
    values: list[int] = []
    total_read = 0

    for _ in range(count):
        value, bytes_read = decode(buf, offset + total_read)
        values.append(value)
        total_read += bytes_read

    return (values, total_read)
