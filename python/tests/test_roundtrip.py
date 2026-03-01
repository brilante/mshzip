'pack→unpack roundtrip integrity tests'
from __future__ import annotations

import hashlib

import os

import pytest
import mshzip
from mshzip import Packer, Unpacker
from conftest import (
    DATA_GENERATORS, SIZES_SMALL, SIZES_MEDIUM, CHUNK_SIZES,
)


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


# ── Basic roundtrip: 9 data types × 11 sizes ──

class TestBasicRoundtrip:
    @pytest.mark.parametrize('gen_name', DATA_GENERATORS.keys())
    @pytest.mark.parametrize('size', SIZES_SMALL)
    def test_roundtrip(self, gen_name, size):
        gen = DATA_GENERATORS[gen_name]
        data = gen(size)
        packed = mshzip.pack(data)
        restored = mshzip.unpack(packed)
        assert sha256(restored) == sha256(data), (
            f'{gen_name} size={size}: roundtrip failed'
        )


# ── Various chunk sizes ──

class TestChunkSizes:
    @pytest.mark.parametrize('chunk_size', CHUNK_SIZES)
    def test_repeat_pattern(self, chunk_size):
        data = bytes(range(256)) * 40  # 10KB
        packed = mshzip.pack(data, chunk_size=chunk_size)
        restored = mshzip.unpack(packed)
        assert restored == data

    @pytest.mark.parametrize('chunk_size', CHUNK_SIZES)
    def test_random_data(self, chunk_size):
        import os
        data = os.urandom(4096)
        packed = mshzip.pack(data, chunk_size=chunk_size)
        restored = mshzip.unpack(packed)
        assert restored == data


# ── Codec combinations ──

class TestCodecs:
    @pytest.mark.parametrize('codec', ['gzip', 'none'])
    def test_codec_roundtrip(self, codec):
        data = b'hello world ' * 1000
        packed = mshzip.pack(data, codec=codec)
        restored = mshzip.unpack(packed)
        assert restored == data

    @pytest.mark.parametrize('codec', ['gzip', 'none'])
    @pytest.mark.parametrize('crc', [True, False])
    def test_codec_crc_combo(self, codec, crc):
        data = bytes(range(256)) * 4
        packed = mshzip.pack(data, codec=codec, crc=crc)
        restored = mshzip.unpack(packed)
        assert restored == data


# ── Frame boundaries ──

class TestFrameBoundary:
    def test_multi_frame_small_limit(self):
        data = b'x' * 1000
        packed = mshzip.pack(data, chunk_size=8, frame_limit=100)
        restored = mshzip.unpack(packed)
        assert restored == data

    def test_exact_frame_limit(self):
        data = b'x' * 256
        packed = mshzip.pack(data, chunk_size=128, frame_limit=256)
        restored = mshzip.unpack(packed)
        assert restored == data

    def test_frame_limit_plus_one(self):
        data = b'x' * 257
        packed = mshzip.pack(data, chunk_size=128, frame_limit=256)
        restored = mshzip.unpack(packed)
        assert restored == data


# ── Medium sizes ──

class TestMediumSize:
    @pytest.mark.parametrize('size', SIZES_MEDIUM)
    def test_repeat_medium(self, size):
        data = bytes(range(256)) * (size // 256 + 1)
        data = data[:size]
        packed = mshzip.pack(data)
        restored = mshzip.unpack(packed)
        assert sha256(restored) == sha256(data)


# ── Simple API ──

class TestSimpleAPI:
    def test_pack_unpack(self):
        data = b'simple api test'
        assert mshzip.unpack(mshzip.pack(data)) == data

    def test_pack_with_opts(self):
        data = b'opts test'
        packed = mshzip.pack(data, chunk_size=16, codec='none', crc=True)
        assert mshzip.unpack(packed) == data

    def test_packer_unpacker_classes(self):
        data = b'class test'
        p = Packer(chunk_size=32)
        u = Unpacker()
        assert u.unpack(p.pack(data)) == data
