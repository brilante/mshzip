'비트 단위 읽기/쓰기 유틸리티 (MSB-first)'
from __future__ import annotations


def read_bits(buf: bytes | bytearray | memoryview, bit_offset: int, n: int) -> int:
    """Buffer에서 N비트 읽기."""
    if n < 1 or n > 32:
        raise ValueError(f'read_bits: n must be 1~32, got {n}')
    if bit_offset + n > len(buf) * 8:
        raise IndexError(
            f'read_bits: offset={bit_offset}, n={n}, buf_bits={len(buf) * 8}'
        )

    value = 0
    remaining = n
    current_bit = bit_offset

    while remaining > 0:
        byte_idx = current_bit >> 3
        bit_in_byte = current_bit & 7
        bits_avail = 8 - bit_in_byte
        bits_to_read = min(bits_avail, remaining)
        shift = bits_avail - bits_to_read
        mask = (1 << bits_to_read) - 1
        bits = (buf[byte_idx] >> shift) & mask

        value = (value << bits_to_read) | bits
        current_bit += bits_to_read
        remaining -= bits_to_read

    return value


def write_bits(buf: bytearray, bit_offset: int, n: int, value: int) -> None:
    """Buffer에 N비트 쓰기."""
    if n < 1 or n > 32:
        raise ValueError(f'write_bits: n must be 1~32, got {n}')
    if bit_offset + n > len(buf) * 8:
        raise IndexError(
            f'write_bits: offset={bit_offset}, n={n}, buf_bits={len(buf) * 8}'
        )

    remaining = n
    current_bit = bit_offset

    while remaining > 0:
        byte_idx = current_bit >> 3
        bit_in_byte = current_bit & 7
        bits_avail = 8 - bit_in_byte
        bits_to_write = min(bits_avail, remaining)
        shift = remaining - bits_to_write
        mask = (1 << bits_to_write) - 1
        bits = (value >> shift) & mask
        byte_shift = bits_avail - bits_to_write
        byte_mask = ~(mask << byte_shift) & 0xFF

        buf[byte_idx] = (buf[byte_idx] & byte_mask) | (bits << byte_shift)
        current_bit += bits_to_write
        remaining -= bits_to_write


def read_all_chunks(
    buf: bytes | bytearray | memoryview, bit_depth: int
) -> tuple[list[int], int]:
    """N비트 청크 전부 읽기 -> (값 리스트, 총 비트 수)."""
    total_bits = len(buf) * 8
    count = total_bits // bit_depth
    values = [read_bits(buf, i * bit_depth, bit_depth) for i in range(count)]
    return values, total_bits


def write_all_chunks(values: list[int], bit_depth: int) -> bytes:
    """인덱스 배열 -> N비트씩 bytes로 기록."""
    total_bits = len(values) * bit_depth
    byte_count = (total_bits + 7) // 8
    buf = bytearray(byte_count)

    for i, v in enumerate(values):
        write_bits(buf, i * bit_depth, bit_depth, v)

    return bytes(buf)
