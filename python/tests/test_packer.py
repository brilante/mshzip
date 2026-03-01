'Packer class unit tests'
from __future__ import annotations

import struct

import pytest
from mshzip import Packer
from mshzip.constants import (
    MAGIC, VERSION, FRAME_HEADER_SIZE,
    MIN_CHUNK_SIZE, MAX_CHUNK_SIZE,
)


class TestInit:
    def test_default_opts(self):
        p = Packer()
        assert p.chunk_size == 128
        assert p.codec_name == 'gzip'
        assert p.use_crc is False

    def test_custom_opts(self):
        p = Packer(chunk_size=64, codec='none', crc=True)
        assert p.chunk_size == 64
        assert p.codec_name == 'none'
        assert p.use_crc is True

    def test_invalid_chunk_size_small(self):
        with pytest.raises(ValueError, match='out of range'):
            Packer(chunk_size=4)

    def test_invalid_chunk_size_large(self):
        with pytest.raises(ValueError, match='out of range'):
            Packer(chunk_size=MAX_CHUNK_SIZE + 1)

    def test_invalid_codec(self):
        with pytest.raises(ValueError, match='codec'):
            Packer(codec='lz4')


class TestPack:
    def test_empty_input(self):
        p = Packer()
        result = p.pack(b'')
        # Empty input also generates minimum frame header
        assert len(result) >= FRAME_HEADER_SIZE + 4
        assert result[:4] == MAGIC

    def test_small_input(self):
        p = Packer(chunk_size=8)
        data = b'hello!!!'
        result = p.pack(data)
        assert result[:4] == MAGIC
        assert len(result) > FRAME_HEADER_SIZE

    def test_header_format(self):
        p = Packer(chunk_size=128, codec='gzip')
        result = p.pack(b'x' * 256)
        # magic
        assert result[:4] == MAGIC
        # version
        ver = struct.unpack_from('<H', result, 4)[0]
        assert ver == VERSION
        # chunk size
        cs = struct.unpack_from('<I', result, 8)[0]
        assert cs == 128

    def test_dedup_same_chunks(self):
        p = Packer(chunk_size=8, codec='none')
        # same 8-byte repeat -> only 1 entry in dict
        data = b'ABCDEFGH' * 10
        result = p.pack(data)
        assert len(p.dict_chunks) == 1
        assert len(p.dict_index) == 1

    def test_dedup_unique_chunks(self):
        p = Packer(chunk_size=8, codec='none')
        # all different chunks
        data = bytes(range(64))  # 8 unique chunks
        result = p.pack(data)
        assert len(p.dict_chunks) == 8

    def test_padding_last_chunk(self):
        p = Packer(chunk_size=8, codec='none')
        # 5 bytes -> zero-padded to 8 bytes
        data = b'hello'
        result = p.pack(data)
        assert len(p.dict_chunks) == 1
        assert len(p.dict_chunks[0]) == 8

    def test_codec_none(self):
        p = Packer(chunk_size=128, codec='none')
        data = b'test data'
        result = p.pack(data)
        assert result[:4] == MAGIC

    def test_crc_flag(self):
        p = Packer(chunk_size=128, crc=True)
        data = b'test'
        result = p.pack(data)
        # Verify CRC bit in flags
        flags = struct.unpack_from('<H', result, 6)[0]
        assert flags & 0x0001 != 0

    def test_no_crc_flag(self):
        p = Packer(chunk_size=128, crc=False)
        data = b'test'
        result = p.pack(data)
        flags = struct.unpack_from('<H', result, 6)[0]
        assert flags & 0x0001 == 0

    def test_orig_bytes_in_header(self):
        p = Packer(chunk_size=128, codec='none')
        data = b'x' * 500
        result = p.pack(data)
        lo = struct.unpack_from('<I', result, 16)[0]
        hi = struct.unpack_from('<I', result, 20)[0]
        assert hi * 0x100000000 + lo == 500

    def test_memoryview_input(self):
        p = Packer(chunk_size=128)
        data = memoryview(b'test data here')
        result = p.pack(data)
        assert result[:4] == MAGIC

    def test_multi_frame(self):
        p = Packer(chunk_size=8, frame_limit=64, codec='none')
        # 128 bytes -> 2 frames of 64B each
        data = bytes(range(128))
        result = p.pack(data)
        # Find second frame start
        count = result.count(MAGIC)
        assert count == 2
