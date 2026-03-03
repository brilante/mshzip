'Section I: 에러 주입 (Error Injection) 테스트'
from __future__ import annotations

import os
import pytest
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

import mshzip
from mshzip import hamming
from mshzip import reed_solomon as rs
from mshzip.coord_dict import CoordDictPacker, CoordDictUnpacker, HAMMING_BYTES, BYTES_PER_AXIS


@pytest.fixture(autouse=True)
def _save_native():
    orig = hamming._USE_NATIVE
    yield
    hamming._USE_NATIVE = orig


class TestSectionI:
    'ECC 에러 정정 E2E 검증'

    def test_i1_1bit_flip_axis_0(self):
        data = os.urandom(128 * 8)
        p = CoordDictPacker(dimensions=8)
        encoded, seq = p.encode(data)
        corrupted = bytearray(encoded)
        corrupted[10] ^= 0x01
        u = CoordDictUnpacker()
        restored = u.decode(bytes(corrupted), 8, 1, seq, len(data))
        assert restored == data

    def test_i2_1bit_flip_axis_7(self):
        data = os.urandom(128 * 8)
        p = CoordDictPacker(dimensions=8)
        encoded, seq = p.encode(data)
        axis7_offset = 7 * HAMMING_BYTES + 5
        corrupted = bytearray(encoded)
        corrupted[axis7_offset] ^= 0x01
        u = CoordDictUnpacker()
        restored = u.decode(bytes(corrupted), 8, 1, seq, len(data))
        assert restored == data

    def test_i3_1bit_flip_all_axes(self):
        'I3: 모든 축에 각각 1-bit flip'
        D = 8
        data = os.urandom(128 * D)
        p = CoordDictPacker(dimensions=D)
        encoded, seq = p.encode(data)
        corrupted = bytearray(encoded)
        for i in range(D):
            offset = i * HAMMING_BYTES + 3
            corrupted[offset] ^= 0x01
        u = CoordDictUnpacker()
        restored = u.decode(bytes(corrupted), D, 1, seq, len(data))
        assert restored == data

    def test_i4_axis_0_total_damage(self):
        'I4: 축 0 손상(syndrome>1035) → uncorrectable 감지 → RS 복구'
        D = 8
        data = os.urandom(128 * D)
        p = CoordDictPacker(dimensions=D)
        encoded, seq = p.encode(data)
        corrupted = bytearray(encoded)
        # 축 0: 위치 12(byte 1, bit 4)와 위치 1024(byte 127, bit 0) flip
        # syndrome = 12 XOR 1024 = 1036 > 1035 → uncorrectable
        corrupted[1] ^= 0x10
        corrupted[127] ^= 0x01
        u = CoordDictUnpacker()
        restored = u.decode(bytes(corrupted), D, 1, seq, len(data))
        assert restored == data

    def test_i5_axis_7_total_damage(self):
        'I5: 축 7 손상(syndrome>1035) → uncorrectable 감지 → RS 복구'
        D = 8
        data = os.urandom(128 * D)
        p = CoordDictPacker(dimensions=D)
        encoded, seq = p.encode(data)
        corrupted = bytearray(encoded)
        ax7_start = 7 * HAMMING_BYTES
        # 축 7: 동일 패턴으로 uncorrectable 유도
        corrupted[ax7_start + 1] ^= 0x10
        corrupted[ax7_start + 127] ^= 0x01
        u = CoordDictUnpacker()
        restored = u.decode(bytes(corrupted), D, 1, seq, len(data))
        assert restored == data

    def test_i6_parity_axis_damage(self):
        'I6: parity 축 손상 → 데이터 무영향'
        D = 8
        data = os.urandom(128 * D)
        p = CoordDictPacker(dimensions=D)
        encoded, seq = p.encode(data)
        corrupted = bytearray(encoded)
        parity_start = D * HAMMING_BYTES
        for j in range(HAMMING_BYTES):
            corrupted[parity_start + j] = 0x00
        u = CoordDictUnpacker()
        restored = u.decode(bytes(corrupted), D, 1, seq, len(data))
        assert restored == data

    def test_i10_no_error_passthrough(self):
        D = 8
        data = os.urandom(128 * D)
        p = CoordDictPacker(dimensions=D)
        encoded, seq = p.encode(data)
        u = CoordDictUnpacker()
        restored = u.decode(encoded, D, 1, seq, len(data))
        assert restored == data

    def test_i11_e2e_pack_corrupt_unpack(self):
        'I11: pack → corrupt → unpack (codec=none)'
        data = os.urandom(1024)
        packed_raw = mshzip.pack(data, coord_dict=True, dimensions=8, codec='none')
        corrupted = bytearray(packed_raw)
        # CoordDict extra header: 32B header + 8B extra + 4B payloadSize = 44
        payload_start = 44
        if len(corrupted) > payload_start + 20:
            corrupted[payload_start + 15] ^= 0x01
        restored = mshzip.unpack(bytes(corrupted))
        assert restored == data

    def test_i12_e2e_1mb_1bit(self):
        'I12: 1MB 에러 주입'
        data = os.urandom(1024 * 8)
        packed = mshzip.pack(data, coord_dict=True, dimensions=8, codec='none')
        corrupted = bytearray(packed)
        payload_start = 44
        if len(corrupted) > payload_start + 100:
            corrupted[payload_start + 50] ^= 0x02
        restored = mshzip.unpack(bytes(corrupted))
        assert restored == data

    def test_i13_parallel_decode_error_correction(self):
        'I13: 병렬 디코딩 에러 정정 (10청크 중 3개 1-bit flip)'
        D = 8
        data = os.urandom(128 * D * 10)
        p = CoordDictPacker(dimensions=D)
        encoded, seq = p.encode(data)
        corrupted = bytearray(encoded)
        total_axes = D + 1
        chunk_size = total_axes * HAMMING_BYTES
        for chunk_idx in [2, 5, 8]:
            offset = chunk_idx * chunk_size + 10
            if offset < len(corrupted):
                corrupted[offset] ^= 0x01
        u = CoordDictUnpacker()
        restored = u.decode(bytes(corrupted), D, 1, seq, len(data))
        assert restored == data
        p.close()
        u.close()
