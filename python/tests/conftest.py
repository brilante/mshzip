'pytest common fixtures - 9 data generators'
from __future__ import annotations

import hashlib
import os
import random

import pytest


def gen_zeros(size: int) -> bytes:
    'All 0x00'
    return b'\x00' * size


def gen_ones(size: int) -> bytes:
    'All 0xFF'
    return b'\xff' * size


def gen_repeat(size: int) -> bytes:
    'Repeating pattern (ABCD...)'
    pattern = bytes(range(256))
    repeats = size // 256 + 1
    return (pattern * repeats)[:size]


def gen_random(size: int) -> bytes:
    'Random data'
    return os.urandom(size)


def gen_text(size: int) -> bytes:
    'Text-like data (ASCII repeat)'
    text = b'Hello World! This is mshzip compression test data. '
    repeats = size // len(text) + 1
    return (text * repeats)[:size]


def gen_binary(size: int) -> bytes:
    'Binary header-like data'
    header = bytes([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])
    repeats = size // len(header) + 1
    return (header * repeats)[:size]


def gen_sparse(size: int) -> bytes:
    'Sparse data (mostly 0, occasional values)'
    data = bytearray(size)
    for i in range(0, size, 64):
        if i < size:
            data[i] = (i // 64) & 0xFF
    return bytes(data)


def gen_high_entropy(size: int) -> bytes:
    'High entropy (sha256 chain)'
    result = bytearray()
    seed = b'mshzip-high-entropy-seed'
    while len(result) < size:
        seed = hashlib.sha256(seed).digest()
        result.extend(seed)
    return bytes(result[:size])


def gen_single_byte(size: int) -> bytes:
    'Single byte repeat (0x42)'
    return b'\x42' * size


DATA_GENERATORS = {
    'zeros': gen_zeros,
    'ones': gen_ones,
    'repeat': gen_repeat,
    'random': gen_random,
    'text': gen_text,
    'binary': gen_binary,
    'sparse': gen_sparse,
    'high_entropy': gen_high_entropy,
    'single_byte': gen_single_byte,
}

SIZES_SMALL = [0, 1, 7, 8, 64, 127, 128, 129, 256, 1024, 4096]
SIZES_MEDIUM = [10_000, 100_000, 1_000_000]
CHUNK_SIZES = [8, 16, 32, 64, 128, 256, 512, 1024]
