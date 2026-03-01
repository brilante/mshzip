'Unpacker class unit tests'
from __future__ import annotations

import pytest
from mshzip import Packer, Unpacker
from mshzip.constants import MAGIC


class TestUnpack:
    def test_empty_roundtrip(self):
        packed = Packer().pack(b'')
        result = Unpacker().unpack(packed)
        assert result == b''

    def test_small_roundtrip(self):
        data = b'hello world'
        packed = Packer(chunk_size=8).pack(data)
        result = Unpacker().unpack(packed)
        assert result == data

    def test_exact_chunk_boundary(self):
        data = b'x' * 128  # Exact chunk size
        packed = Packer(chunk_size=128).pack(data)
        result = Unpacker().unpack(packed)
        assert result == data

    def test_chunk_minus_one(self):
        data = b'x' * 127
        packed = Packer(chunk_size=128).pack(data)
        result = Unpacker().unpack(packed)
        assert result == data

    def test_chunk_plus_one(self):
        data = b'x' * 129
        packed = Packer(chunk_size=128).pack(data)
        result = Unpacker().unpack(packed)
        assert result == data

    def test_dict_accumulation(self):
        u = Unpacker()
        p = Packer(chunk_size=8, codec='none')
        # 4 unique chunks
        data = bytes(range(32))
        packed = p.pack(data)
        u.unpack(packed)
        assert len(u.dict) == 4

    def test_multi_frame(self):
        p = Packer(chunk_size=8, frame_limit=32, codec='none')
        data = bytes(range(64))
        packed = p.pack(data)
        result = Unpacker().unpack(packed)
        assert result == data

    def test_with_crc(self):
        data = b'test with crc' * 10
        packed = Packer(chunk_size=16, crc=True).pack(data)
        result = Unpacker().unpack(packed)
        assert result == data

    def test_codec_none(self):
        data = b'no compression test'
        packed = Packer(chunk_size=8, codec='none').pack(data)
        result = Unpacker().unpack(packed)
        assert result == data


class TestErrors:
    def test_invalid_magic(self):
        with pytest.raises(ValueError, match='magic'):
            Unpacker().unpack(b'XXXX' + b'\x00' * 40)

    def test_truncated_header(self):
        with pytest.raises(ValueError, match='header'):
            Unpacker().unpack(b'MSH1' + b'\x00' * 10)

    def test_invalid_codec(self):
        p = Packer(chunk_size=8, codec='none')
        packed = bytearray(p.pack(b'test1234'))
        # Tamper codec ID to 99
        packed[12] = 99
        with pytest.raises(ValueError, match='codec'):
            Unpacker().unpack(bytes(packed))

    def test_dict_index_overflow(self):
        p = Packer(chunk_size=8, codec='none')
        packed = bytearray(p.pack(b'testtest'))
        # Hard to tamper seqCount indices directly, so
        # test dict index out of range error indirectly:
        # set dictEntries to 0 while keeping sequence
        # Tamper dictEntries to 0
        import struct
        struct.pack_into('<I', packed, 24, 0)
        with pytest.raises(ValueError, match='out of range'):
            Unpacker().unpack(bytes(packed))

    def test_memoryview_input(self):
        data = b'memoryview test'
        packed = Packer(chunk_size=8).pack(data)
        result = Unpacker().unpack(memoryview(packed))
        assert result == data
