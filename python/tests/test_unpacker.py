'Unpacker 클래스 단위 테스트'
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
        data = b'x' * 128  # 청크 크기 정확히
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
        # 고유 청크 4개
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
        with pytest.raises(ValueError, match='매직'):
            Unpacker().unpack(b'XXXX' + b'\x00' * 40)

    def test_truncated_header(self):
        with pytest.raises(ValueError, match='헤더 부족'):
            Unpacker().unpack(b'MSH1' + b'\x00' * 10)

    def test_invalid_codec(self):
        p = Packer(chunk_size=8, codec='none')
        packed = bytearray(p.pack(b'test1234'))
        # 코덱 ID를 99로 변조
        packed[12] = 99
        with pytest.raises(ValueError, match='코덱'):
            Unpacker().unpack(bytes(packed))

    def test_dict_index_overflow(self):
        p = Packer(chunk_size=8, codec='none')
        packed = bytearray(p.pack(b'testtest'))
        # seqCount 영역의 인덱스를 변조하기 어려우므로
        # 사전 인덱스 범위를 벗어나는 경우 에러 발생 테스트
        # 간접적으로: 사전 항목을 0으로 만들고 시퀀스 유지
        # dictEntries를 0으로 변조
        import struct
        struct.pack_into('<I', packed, 24, 0)
        with pytest.raises(ValueError, match='범위 초과'):
            Unpacker().unpack(bytes(packed))

    def test_memoryview_input(self):
        data = b'memoryview test'
        packed = Packer(chunk_size=8).pack(data)
        result = Unpacker().unpack(memoryview(packed))
        assert result == data
