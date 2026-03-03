'Layer 2: BitDict 전용 전수 검증 테스트 (Python)'
from __future__ import annotations

import math
import os
import struct

import pytest

from mshzip.bit_reader import read_bits, write_bits, read_all_chunks, write_all_chunks
from mshzip.bit_dict import BitDict, MSBD_MAGIC, MSBD_HEADER_SIZE
from mshzip.packer import Packer
from mshzip.unpacker import Unpacker
from mshzip.constants import Flag


# ============================================================
# 섹션 2A: 비트 I/O 전수 검증
# ============================================================

class TestBitIOComprehensive:
    """2A: 비트 I/O 전수 검증."""

    # 2A-1: readBits/writeBits 왕복 -- bitDepth별
    BIT_DEPTHS_2A1 = [1, 2, 3, 4, 7, 8, 9, 12, 15, 16, 17, 18, 24, 32]

    @pytest.mark.parametrize('n', BIT_DEPTHS_2A1)
    def test_2a1_write_read_min(self, n):
        """readBits/writeBits bitDepth={n} min=0 왕복."""
        byte_len = (n + 7) // 8
        buf = bytearray(byte_len)
        write_bits(buf, 0, n, 0)
        assert read_bits(buf, 0, n) == 0

    @pytest.mark.parametrize('n', BIT_DEPTHS_2A1)
    def test_2a1_write_read_max(self, n):
        """readBits/writeBits bitDepth={n} max 왕복."""
        max_val = ((1 << n) - 1) if n <= 31 else 0xFFFFFFFF
        byte_len = (n + 7) // 8
        buf = bytearray(byte_len)
        write_bits(buf, 0, n, max_val)
        assert read_bits(buf, 0, n) == max_val

    # 2A-2: readBits 비정렬 오프셋 검증
    OFFSET_CASES = [
        (0, 8), (1, 8), (3, 8), (7, 8),
        (0, 18), (18, 18), (36, 18),
        (5, 12), (4, 4), (0, 1), (7, 1), (0, 32),
    ]

    @pytest.mark.parametrize('bit_off,bd', OFFSET_CASES)
    def test_2a2_unaligned_offset(self, bit_off, bd):
        """비정렬 offset={bit_off} bitDepth={bd} 왕복."""
        buf = bytearray(10)
        max_val = ((1 << bd) - 1) if bd <= 31 else 0xFFFFFFFF
        val = max_val // 2
        write_bits(buf, bit_off, bd, val)
        assert read_bits(buf, bit_off, bd) == val

    # 2A-3: readAllChunks/writeAllChunks 왕복
    DEPTHS_2A3 = [7, 8, 12, 13, 16, 18, 20, 24]
    SIZES_2A3 = [1, 10, 100, 1000, 10000, 65535]

    @pytest.mark.parametrize('bd', DEPTHS_2A3)
    @pytest.mark.parametrize('sz', SIZES_2A3)
    def test_2a3_read_write_all_chunks(self, bd, sz):
        """readAllChunks/writeAllChunks 왕복 bd={bd} sz={sz}."""
        data = os.urandom(sz)
        values, _ = read_all_chunks(data, bd)
        restored = write_all_chunks(values, bd)
        used_bits = len(values) * bd
        used_bytes = used_bits // 8
        assert restored[:used_bytes] == data[:used_bytes]

    # 2A-4: 나머지 비트 패딩 정밀 검증
    @pytest.mark.parametrize('orig_bytes', list(range(1, 19)))
    def test_2a4_remainder_padding(self, orig_bytes, tmp_path):
        """패딩 검증 origBytes={orig_bytes}."""
        data = os.urandom(orig_bytes)
        packed = Packer(bit_depth=18, dict_dir=str(tmp_path)).pack(data)
        restored = Unpacker().unpack(packed)
        assert len(restored) == len(data)
        assert restored == data


# ============================================================
# 섹션 2B: BitDict 클래스 전수 검증
# ============================================================

class TestBitDictClass:
    """2B: BitDict 클래스 전수 검증."""

    # 2B-1: isOverLimit 경계값
    OVER_LIMIT_CASES = [
        (1024, 8, True),        # 2^8*4=1024 >= 1024
        (1025, 8, False),       # 1024 < 1025
        (1048575, 18, True),    # 2^18*4=1048576 >= 1048575
        (1048576, 18, True),    # 1048576 >= 1048576
        (1048577, 18, False),   # 1048576 < 1048577
        (4, 1, True),           # 2^1*4=8 >= 4
        (8, 1, True),           # 8 >= 8
        (9, 1, False),          # 8 < 9
    ]

    @pytest.mark.parametrize('max_mem,bd,expected', OVER_LIMIT_CASES)
    def test_2b1_is_over_limit(self, max_mem, bd, expected, tmp_path):
        """isOverLimit maxMem={max_mem} bd={bd} -> {expected}."""
        bit_dict = BitDict(dict_dir=str(tmp_path), max_mem_bytes=max_mem)
        assert bit_dict.is_over_limit(bd) is expected

    # 2B-2: MSBD 파일 무결성
    def test_2b2_file_size(self, tmp_path):
        """generate(18) 파일 크기 = 12."""
        bd = BitDict(dict_dir=str(tmp_path))
        fp = bd.generate(18)
        assert os.path.getsize(fp) == 12

    def test_2b2_magic(self, tmp_path):
        """generate(18) magic = MSBD."""
        bd = BitDict(dict_dir=str(tmp_path))
        fp = bd.generate(18)
        with open(fp, 'rb') as f:
            buf = f.read()
        assert buf[:4] == MSBD_MAGIC

    def test_2b2_version(self, tmp_path):
        """generate(18) version = 1."""
        bd = BitDict(dict_dir=str(tmp_path))
        fp = bd.generate(18)
        with open(fp, 'rb') as f:
            buf = f.read()
        assert struct.unpack_from('<H', buf, 4)[0] == 1

    def test_2b2_bit_depth(self, tmp_path):
        """generate(18) bitDepth = 18."""
        bd = BitDict(dict_dir=str(tmp_path))
        fp = bd.generate(18)
        with open(fp, 'rb') as f:
            buf = f.read()
        assert struct.unpack_from('<H', buf, 6)[0] == 18

    def test_2b2_load(self, tmp_path):
        """load(18) 성공."""
        bd = BitDict(dict_dir=str(tmp_path))
        bd.generate(18)
        assert bd.load(18) == 18

    def test_2b2_auto_generate(self, tmp_path):
        """auto-generate: 파일 없어도 load 성공."""
        sub = str(tmp_path / 'auto-gen')
        bd = BitDict(dict_dir=sub)
        assert bd.load(12) == 12
        assert os.path.exists(bd.path(12))

    # 2B-3: MSBD 파일 손상 방어
    def test_2b3_magic_corrupted(self, tmp_path):
        """magic 변조 에러."""
        bd = BitDict(dict_dir=str(tmp_path))
        fp = bd.generate(18)
        with open(fp, 'rb') as f:
            buf = bytearray(f.read())
        buf[0:4] = b'XXXX'
        with open(fp, 'wb') as f:
            f.write(buf)
        with pytest.raises(ValueError, match='매직넘버'):
            bd.load(18)

    def test_2b3_file_too_small(self, tmp_path):
        """파일 크기 < 12B 에러."""
        bd = BitDict(dict_dir=str(tmp_path))
        fp = bd.path(19)
        os.makedirs(os.path.dirname(fp), exist_ok=True)
        with open(fp, 'wb') as f:
            f.write(b'\x00' * 4)
        with pytest.raises(ValueError, match='손상'):
            bd.load(19)

    def test_2b3_bit_depth_mismatch(self, tmp_path):
        """bitDepth 불일치 에러."""
        bd = BitDict(dict_dir=str(tmp_path))
        bd.generate(16)
        fp = bd.path(16)
        with open(fp, 'rb') as f:
            buf = bytearray(f.read())
        struct.pack_into('<H', buf, 6, 20)
        with open(fp, 'wb') as f:
            f.write(buf)
        with pytest.raises(ValueError, match='불일치'):
            bd.load(16)

    def test_2b3_empty_file(self, tmp_path):
        """빈 파일 에러."""
        bd = BitDict(dict_dir=str(tmp_path))
        fp = bd.path(21)
        os.makedirs(os.path.dirname(fp), exist_ok=True)
        with open(fp, 'wb') as f:
            f.write(b'')
        with pytest.raises(ValueError, match='손상'):
            bd.load(21)

    def test_2b3_no_file_auto_generate(self, tmp_path):
        """파일 없음 -> auto-generate 성공."""
        sub = str(tmp_path / 'no-file')
        bd = BitDict(dict_dir=sub)
        assert bd.load(15) == 15

    def test_2b3_reload(self, tmp_path):
        """load 후 재로드 성공."""
        bd = BitDict(dict_dir=str(tmp_path))
        bd.generate(18)
        assert bd.load(18) == 18
        assert bd.load(18) == 18

    # 2B-4: bitDepth 범위 검증
    def test_2b4_generate_zero(self, tmp_path):
        """generate(0) -> 에러."""
        bd = BitDict(dict_dir=str(tmp_path))
        with pytest.raises(ValueError, match='range'):
            bd.generate(0)

    def test_2b4_generate_33(self, tmp_path):
        """generate(33) -> 에러."""
        bd = BitDict(dict_dir=str(tmp_path))
        with pytest.raises(ValueError, match='range'):
            bd.generate(33)

    def test_2b4_generate_1(self, tmp_path):
        """generate(1) -> 성공."""
        bd = BitDict(dict_dir=str(tmp_path))
        fp = bd.generate(1)
        assert os.path.exists(fp)

    def test_2b4_generate_32(self, tmp_path):
        """generate(32) -> 성공."""
        bd = BitDict(dict_dir=str(tmp_path))
        fp = bd.generate(32)
        assert os.path.exists(fp)


# ============================================================
# 섹션 2C: Packer BitDict 모드 왕복
# ============================================================

class TestPackerBitDict:
    """2C: Packer BitDict 모드 왕복."""

    # 2C-1: bitDepth x 데이터 크기 매트릭스
    DEPTHS = [8, 12, 16, 18, 20, 24]
    SIZES = [0, 1, 127, 128, 1024, 10000, 65536]

    @pytest.mark.parametrize('bd', DEPTHS)
    @pytest.mark.parametrize('sz', SIZES)
    def test_2c1_roundtrip_matrix(self, bd, sz, tmp_path):
        """bitDepth={bd} size={sz} 왕복."""
        data = os.urandom(sz) if sz > 0 else b''
        packed = Packer(bit_depth=bd, dict_dir=str(tmp_path)).pack(data)
        restored = Unpacker().unpack(packed)
        assert len(restored) == len(data)
        assert restored == data

    # 2C-2: 데이터 패턴별 왕복
    PATTERN_DEPTHS = [8, 18, 24]
    PATTERN_SIZE = 4096

    @staticmethod
    def _gen_pattern(name, sz):
        if name == 'allZero':
            return b'\x00' * sz
        elif name == 'allOne':
            return b'\xff' * sz
        elif name == 'sequential':
            return bytes(i & 0xFF for i in range(sz))
        elif name == 'random':
            return os.urandom(sz)
        elif name == 'alternating':
            return bytes(0xAA if i % 2 == 0 else 0x55 for i in range(sz))
        return os.urandom(sz)

    @pytest.mark.parametrize('pattern', ['allZero', 'allOne', 'sequential', 'random', 'alternating'])
    @pytest.mark.parametrize('bd', PATTERN_DEPTHS)
    def test_2c2_pattern_roundtrip(self, pattern, bd, tmp_path):
        """패턴={pattern} bitDepth={bd} 왕복."""
        data = self._gen_pattern(pattern, self.PATTERN_SIZE)
        packed = Packer(bit_depth=bd, dict_dir=str(tmp_path)).pack(data)
        restored = Unpacker().unpack(packed)
        assert len(restored) == len(data)
        assert restored == data

    # 2C-3: 프레임 헤더 필드 검증
    def test_2c3_magic(self, tmp_path):
        """magic = MSH1."""
        data = os.urandom(256)
        packed = Packer(bit_depth=18, dict_dir=str(tmp_path)).pack(data)
        assert packed[:4] == b'MSH1'

    def test_2c3_bitdict_flag(self, tmp_path):
        """flags & BITDICT != 0."""
        data = os.urandom(256)
        packed = Packer(bit_depth=18, dict_dir=str(tmp_path)).pack(data)
        flags = struct.unpack_from('<H', packed, 6)[0]
        assert (flags & Flag.BITDICT) != 0

    def test_2c3_no_hierdedup_flag(self, tmp_path):
        """flags & HIERDEDUP == 0."""
        data = os.urandom(256)
        packed = Packer(bit_depth=18, dict_dir=str(tmp_path)).pack(data)
        flags = struct.unpack_from('<H', packed, 6)[0]
        assert (flags & Flag.HIERDEDUP) == 0

    def test_2c3_no_external_dict_flag(self, tmp_path):
        """flags & EXTERNAL_DICT == 0."""
        data = os.urandom(256)
        packed = Packer(bit_depth=18, dict_dir=str(tmp_path)).pack(data)
        flags = struct.unpack_from('<H', packed, 6)[0]
        assert (flags & Flag.EXTERNAL_DICT) == 0

    def test_2c3_dict_entries_zero(self, tmp_path):
        """dictEntries == 0."""
        data = os.urandom(256)
        packed = Packer(bit_depth=18, dict_dir=str(tmp_path)).pack(data)
        dict_entries = struct.unpack_from('<I', packed, 24)[0]
        assert dict_entries == 0

    def test_2c3_bit_depth_header(self, tmp_path):
        """bitDepth(offset 32) == 18."""
        data = os.urandom(256)
        packed = Packer(bit_depth=18, dict_dir=str(tmp_path)).pack(data)
        bd_val = struct.unpack_from('<H', packed, 32)[0]
        assert bd_val == 18

    # 2C-4: seqCount 정밀 검증
    SEQ_COUNT_CASES = [
        (0, 18, 0),
        (1, 18, 1),
        (9, 18, 4),
        (1024, 8, 1024),
        (1024, 18, 456),
        (65536, 24, 21846),
    ]

    @pytest.mark.parametrize('orig_bytes,bd,expected_seq', SEQ_COUNT_CASES)
    def test_2c4_seq_count(self, orig_bytes, bd, expected_seq, tmp_path):
        """seqCount origBytes={orig_bytes} bd={bd} -> {expected_seq}."""
        data = os.urandom(orig_bytes) if orig_bytes > 0 else b''
        packed = Packer(bit_depth=bd, dict_dir=str(tmp_path)).pack(data)
        seq_count = struct.unpack_from('<I', packed, 28)[0]
        assert seq_count == expected_seq


# ============================================================
# 섹션 2D: Unpacker BitDict 복원 검증
# ============================================================

class TestUnpackerBitDict:
    """2D: Unpacker BitDict 복원 검증."""

    # 2D-1: 상호 배타 플래그 방어
    def test_2d1_bitdict_hierdedup_error(self, tmp_path):
        """BITDICT|HIERDEDUP (0x0012) -> 에러."""
        data = os.urandom(64)
        packed = bytearray(Packer(bit_depth=18, dict_dir=str(tmp_path)).pack(data))
        struct.pack_into('<H', packed, 6, Flag.BITDICT | Flag.HIERDEDUP)
        with pytest.raises(ValueError, match='동시 사용'):
            Unpacker().unpack(bytes(packed))

    def test_2d1_bitdict_external_dict_error(self, tmp_path):
        """BITDICT|EXTERNAL_DICT (0x0018) -> 에러."""
        data = os.urandom(64)
        packed = bytearray(Packer(bit_depth=18, dict_dir=str(tmp_path)).pack(data))
        struct.pack_into('<H', packed, 6, Flag.BITDICT | Flag.EXTERNAL_DICT)
        with pytest.raises(ValueError, match='동시 사용'):
            Unpacker().unpack(bytes(packed))

    def test_2d1_bitdict_hierdedup_external_error(self, tmp_path):
        """BITDICT|HIERDEDUP|EXTERNAL_DICT (0x001A) -> 에러."""
        data = os.urandom(64)
        packed = bytearray(Packer(bit_depth=18, dict_dir=str(tmp_path)).pack(data))
        struct.pack_into('<H', packed, 6, Flag.BITDICT | Flag.HIERDEDUP | Flag.EXTERNAL_DICT)
        with pytest.raises(ValueError, match='동시 사용'):
            Unpacker().unpack(bytes(packed))

    # 2D-2: origBytes 트리밍 정밀 검증
    ORIG_BYTES_CASES = [1, 2, 3, 9, 10, 100, 255, 256, 1023, 1024]

    @pytest.mark.parametrize('orig_bytes', ORIG_BYTES_CASES)
    def test_2d2_orig_bytes_trimming(self, orig_bytes, tmp_path):
        """origBytes={orig_bytes} 트리밍 정밀 검증."""
        data = os.urandom(orig_bytes)
        packed = Packer(bit_depth=18, dict_dir=str(tmp_path)).pack(data)
        restored = Unpacker().unpack(packed)
        assert len(restored) == orig_bytes
        assert restored == data


# ============================================================
# 섹션 2E: 폴백 + 엄격 모드
# ============================================================

class TestFallback:
    """2E: 폴백 + 엄격 모드."""

    # 2E-1: 메모리 폴백
    FALLBACK_CASES = [
        (30, 1024, False, None),
        (32, 1024, False, None),
        (24, 64 * 1024 * 1024, False, None),
        (24, 65 * 1024 * 1024, True, 24),
        (18, 1048576, False, None),
        (18, 2 * 1024 * 1024, True, 18),
    ]

    @pytest.mark.parametrize('bd,max_dict,expect_active,expect_bd', FALLBACK_CASES)
    def test_2e1_memory_fallback(self, bd, max_dict, expect_active, expect_bd, tmp_path):
        """폴백 bd={bd} maxDict={max_dict} -> active={expect_active}."""
        packer = Packer(
            bit_depth=bd,
            dict_dir=str(tmp_path),
            max_dict_size=max_dict,
        )
        assert packer._bit_dict_active is expect_active
        assert packer.bit_depth == expect_bd

    # 2E-2: strictBitDict 에러
    def test_2e2_strict_30_error(self, tmp_path):
        """strict bd=30 maxDict=1024 -> 에러."""
        with pytest.raises(MemoryError, match='메모리 초과'):
            Packer(
                bit_depth=30, dict_dir=str(tmp_path),
                max_dict_size=1024, strict_bit_dict=True,
            )

    def test_2e2_strict_32_error(self, tmp_path):
        """strict bd=32 maxDict=1024 -> 에러."""
        with pytest.raises(MemoryError, match='메모리 초과'):
            Packer(
                bit_depth=32, dict_dir=str(tmp_path),
                max_dict_size=1024, strict_bit_dict=True,
            )

    def test_2e2_strict_18_ok(self, tmp_path):
        """strict bd=18 maxDict=2MB -> 성공."""
        packer = Packer(
            bit_depth=18, dict_dir=str(tmp_path),
            max_dict_size=2 * 1024 * 1024, strict_bit_dict=True,
        )
        assert packer._bit_dict_active is True

    def test_2e2_strict_8_ok(self, tmp_path):
        """strict bd=8 maxDict=1MB -> 성공."""
        packer = Packer(
            bit_depth=8, dict_dir=str(tmp_path),
            max_dict_size=1024 * 1024, strict_bit_dict=True,
        )
        assert packer._bit_dict_active is True

    # 2E-3: 폴백 후 정상 동작
    def test_2e3_fallback_roundtrip(self, tmp_path):
        """폴백 Packer로 pack -> unpack 왕복."""
        data = os.urandom(1024)
        packer = Packer(
            bit_depth=30, dict_dir=str(tmp_path),
            max_dict_size=1024,
        )
        packed = packer.pack(data)
        restored = Unpacker().unpack(packed)
        assert restored == data

    def test_2e3_fallback_no_bitdict_flag(self, tmp_path):
        """폴백 프레임에 BITDICT 플래그 없음."""
        data = os.urandom(1024)
        packer = Packer(
            bit_depth=30, dict_dir=str(tmp_path),
            max_dict_size=1024,
        )
        packed = packer.pack(data)
        flags = struct.unpack_from('<H', packed, 6)[0]
        assert (flags & Flag.BITDICT) == 0

    def test_2e3_fallback_dict_entries_positive(self, tmp_path):
        """폴백 프레임 dictEntries > 0."""
        data = os.urandom(1024)
        packer = Packer(
            bit_depth=30, dict_dir=str(tmp_path),
            max_dict_size=1024,
        )
        packed = packer.pack(data)
        dict_entries = struct.unpack_from('<I', packed, 24)[0]
        assert dict_entries > 0

    def test_2e3_fallback_large_data(self, tmp_path):
        """폴백 후 대용량 데이터 왕복."""
        data = os.urandom(32768)
        packer = Packer(
            bit_depth=32, dict_dir=str(tmp_path),
            max_dict_size=512,
        )
        packed = packer.pack(data)
        restored = Unpacker().unpack(packed)
        assert restored == data
