'BitDict (N비트 전수 사전) 테스트'
from __future__ import annotations

import os
import shutil
import struct
import tempfile

import pytest

from mshzip.bit_reader import (
    read_bits, write_bits, read_all_chunks, write_all_chunks,
)
from mshzip.bit_dict import BitDict, MSBD_MAGIC, MSBD_HEADER_SIZE
from mshzip.packer import Packer
from mshzip.unpacker import Unpacker
from mshzip.stream import PackStream, UnpackStream
from mshzip.constants import Flag, KNOWN_FLAGS


# ── bit-reader 단위 테스트 ──

class TestBitReader:
    def test_read_write_8bit_roundtrip(self):
        buf = bytearray([0xAB, 0xCD, 0xEF])
        assert read_bits(buf, 0, 8) == 0xAB
        assert read_bits(buf, 8, 8) == 0xCD
        assert read_bits(buf, 16, 8) == 0xEF

        out = bytearray(3)
        write_bits(out, 0, 8, 0xAB)
        write_bits(out, 8, 8, 0xCD)
        write_bits(out, 16, 8, 0xEF)
        assert out == buf

    def test_read_write_12bit(self):
        buf = bytearray([0xAB, 0xC0])
        assert read_bits(buf, 0, 12) == 0xABC

        out = bytearray(2)
        write_bits(out, 0, 12, 0xABC)
        assert out[0] == 0xAB
        assert out[1] & 0xF0 == 0xC0

    def test_read_write_18bit_roundtrip(self):
        val = 0x2ABCD
        buf = bytearray(3)
        write_bits(buf, 0, 18, val)
        assert read_bits(buf, 0, 18) == val

    def test_read_write_1bit_boundary(self):
        buf = bytearray([0x80])
        assert read_bits(buf, 0, 1) == 1
        assert read_bits(buf, 1, 1) == 0

    def test_read_out_of_range(self):
        buf = bytearray(2)
        with pytest.raises(IndexError):
            read_bits(buf, 10, 8)

    def test_write_out_of_range(self):
        buf = bytearray(2)
        with pytest.raises(IndexError):
            write_bits(buf, 10, 8, 0xFF)

    @pytest.mark.parametrize('bit_depth', [8, 12, 16, 18, 24])
    def test_read_all_write_all_roundtrip(self, bit_depth):
        data = os.urandom(100)
        values, total_bits = read_all_chunks(data, bit_depth)
        restored = write_all_chunks(values, bit_depth)

        used_bits = len(values) * bit_depth
        used_bytes = used_bits // 8
        assert restored[:used_bytes] == data[:used_bytes]


# ── BitDict 클래스 테스트 ──

class TestBitDict:
    @pytest.fixture(autouse=True)
    def setup(self, tmp_path):
        self.tmp_dir = str(tmp_path)

    def test_is_over_limit(self):
        bd = BitDict(dict_dir=self.tmp_dir, max_mem_bytes=1024 * 1024)
        assert bd.is_over_limit(8) is False    # 2^8 * 4 = 1KB
        assert bd.is_over_limit(18) is True    # 2^18 * 4 = 1MB

    def test_generate_and_load(self):
        bd = BitDict(dict_dir=self.tmp_dir)
        file_path = bd.generate(18)
        assert os.path.exists(file_path)

        with open(file_path, 'rb') as f:
            buf = f.read()
        assert len(buf) == MSBD_HEADER_SIZE
        assert buf[:4] == MSBD_MAGIC
        assert struct.unpack_from('<H', buf, 6)[0] == 18

        loaded = bd.load(18)
        assert loaded == 18

    def test_auto_generate_on_load(self):
        bd = BitDict(dict_dir=self.tmp_dir)
        # 파일 없이 로드 -> 자동 생성
        loaded = bd.load(16)
        assert loaded == 16
        assert os.path.exists(bd.path(16))

    def test_info(self):
        bd = BitDict(dict_dir=self.tmp_dir)
        bd.generate(16)
        info = bd.info(16)
        assert info['exists'] is True
        assert info['bit_depth'] == 16
        assert info['pattern_count'] == 65536
        assert info['estimated_mem_mb'] == 0.2  # Python round(0.25,1)=0.2 (banker's rounding)


# ── Pack/Unpack 왕복 테스트 ──

class TestPackUnpack:
    @pytest.fixture(autouse=True)
    def setup(self, tmp_path):
        self.tmp_dir = str(tmp_path)

    @pytest.mark.parametrize('bit_depth', [8, 16, 18])
    def test_roundtrip(self, bit_depth):
        data = os.urandom(1024)
        packed = Packer(bit_depth=bit_depth, dict_dir=self.tmp_dir).pack(data)
        restored = Unpacker().unpack(packed)
        assert restored == data

    def test_repetitive_data_roundtrip(self):
        data = bytes(range(256)) * 16
        packed = Packer(bit_depth=8, dict_dir=self.tmp_dir).pack(data)
        restored = Unpacker().unpack(packed)
        assert restored == data

    def test_empty_data_roundtrip(self):
        packed = Packer(bit_depth=18, dict_dir=self.tmp_dir).pack(b'')
        restored = Unpacker().unpack(packed)
        assert restored == b''

    def test_fallback_on_memory_exceed(self):
        packer = Packer(
            bit_depth=30,
            dict_dir=self.tmp_dir,
            max_dict_size=1024,
        )
        assert packer._bit_dict_active is False
        assert packer.bit_depth is None

    def test_strict_bitdict_raises(self):
        with pytest.raises(MemoryError, match='메모리 초과'):
            Packer(
                bit_depth=30,
                dict_dir=self.tmp_dir,
                max_dict_size=1024,
                strict_bit_dict=True,
            )

    def test_bitdict_frame_flags(self):
        data = os.urandom(256)
        packed = Packer(bit_depth=18, dict_dir=self.tmp_dir).pack(data)

        # 프레임 헤더 검증
        assert packed[:4] == b'MSH1'
        flags = struct.unpack_from('<H', packed, 6)[0]
        assert flags & Flag.BITDICT != 0
        assert flags & Flag.HIERDEDUP == 0
        assert flags & Flag.EXTERNAL_DICT == 0

        # bitDepth 추가 헤더 (offset 32)
        bit_depth = struct.unpack_from('<H', packed, 32)[0]
        assert bit_depth == 18


# ── KNOWN_FLAGS 검증 ──

class TestConstants:
    def test_bitdict_flag_exists(self):
        assert Flag.BITDICT == 0x0010

    def test_known_flags_includes_bitdict(self):
        assert (KNOWN_FLAGS & Flag.BITDICT) != 0


# ── 스트리밍 왕복 ──

class TestStream:
    @pytest.fixture(autouse=True)
    def setup(self, tmp_path):
        self.tmp_dir = str(tmp_path)

    def test_stream_roundtrip(self):
        data = os.urandom(2048)
        ps = PackStream(bit_depth=18)
        us = UnpackStream()

        frames = list(ps.feed(data))
        frames.extend(ps.flush())

        restored_parts = []
        for frame in frames:
            for part in us.feed(frame):
                restored_parts.append(part)
        us.finalize()

        restored = b''.join(restored_parts)
        assert restored == data
