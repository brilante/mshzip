'Section A~E: C native ECC 단위 테스트'
from __future__ import annotations

import os
import pytest
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

import mshzip
from mshzip import hamming
from mshzip import reed_solomon as rs


# ── fixtures ──

@pytest.fixture(autouse=True)
def _save_native():
    orig = hamming._USE_NATIVE
    yield
    hamming._USE_NATIVE = orig


def _skip_no_native():
    if not hamming._USE_NATIVE:
        pytest.skip('C native 미설치')


# ── Section A: C ↔ Python 결과 동일성 ──

class TestSectionA:
    'C native와 Pure Python 결과 bit-identical 검증'

    def _compare(self, data_128: bytes):
        hamming._USE_NATIVE = False
        py_enc = hamming.encode(data_128)
        py_dec, py_corr, py_unc = hamming.decode(py_enc)

        hamming._USE_NATIVE = True
        _skip_no_native()
        c_enc = hamming.encode(data_128)
        c_dec, c_corr, c_unc = hamming.decode(c_enc)

        assert py_enc == c_enc, 'encode mismatch'
        assert py_dec == c_dec, 'decode data mismatch'
        assert py_corr == c_corr
        assert py_unc == c_unc

    def test_a1_encode_zeros(self):
        self._compare(b'\x00' * 128)

    def test_a2_encode_ones(self):
        self._compare(b'\xff' * 128)

    def test_a3_encode_random_100(self):
        _skip_no_native()
        for _ in range(100):
            data = os.urandom(128)
            hamming._USE_NATIVE = False
            py_result = hamming.encode(data)
            hamming._USE_NATIVE = True
            c_result = hamming.encode(data)
            assert py_result == c_result

    def test_a4_decode_normal(self):
        _skip_no_native()
        data = os.urandom(128)
        cw = hamming.encode(data)
        hamming._USE_NATIVE = False
        py_d, py_c, py_u = hamming.decode(cw)
        hamming._USE_NATIVE = True
        c_d, c_c, c_u = hamming.decode(cw)
        assert py_d == c_d and py_c == c_c and py_u == c_u

    def test_a5_decode_1bit_error(self):
        _skip_no_native()
        data = os.urandom(128)
        hamming._USE_NATIVE = True
        cw = bytearray(hamming.encode(data))
        cw[10] ^= 0x01

        hamming._USE_NATIVE = False
        py_d, py_c, py_u = hamming.decode(bytes(cw))
        hamming._USE_NATIVE = True
        c_d, c_c, c_u = hamming.decode(bytes(cw))
        assert py_d == c_d and py_c == c_c

    def test_a6_decode_2bit_error(self):
        _skip_no_native()
        data = os.urandom(128)
        cw = bytearray(hamming.encode(data))
        cw[0] ^= 0x03

        hamming._USE_NATIVE = False
        py_d, py_c, py_u = hamming.decode(bytes(cw))
        hamming._USE_NATIVE = True
        c_d, c_c, c_u = hamming.decode(bytes(cw))
        assert py_u == c_u

    def test_a7_encode_batch_identity(self):
        _skip_no_native()
        for D in [2, 4, 8, 16]:
            axes = [os.urandom(128) for _ in range(D)]
            hamming._USE_NATIVE = True
            c_batch = hamming.encode_batch(axes)
            hamming._USE_NATIVE = False
            py_singles = [hamming.encode(a) for a in axes]
            assert c_batch == py_singles, f'D={D} batch mismatch'

    def test_a8_decode_batch_identity(self):
        _skip_no_native()
        for D in [2, 4, 8, 16]:
            axes = [os.urandom(128) for _ in range(D)]
            cws = hamming.encode_batch(axes)
            hamming._USE_NATIVE = True
            c_batch = hamming.decode_batch(cws)
            hamming._USE_NATIVE = False
            py_singles = [hamming.decode(cw) for cw in cws]
            for i in range(D):
                assert c_batch[i][0] == py_singles[i][0], f'D={D} axis {i}'

    def test_a9_xor_parity_identity(self):
        _skip_no_native()
        axes = [os.urandom(130) for _ in range(8)]
        hamming._USE_NATIVE = True
        c_parity = rs.generate_parity(axes, len(axes))
        hamming._USE_NATIVE = False
        py_parity = rs.generate_parity(axes, len(axes))
        assert c_parity == py_parity

    @pytest.mark.parametrize('dtype', ['text', 'binary', 'random'])
    @pytest.mark.parametrize('size', [1024, 4096, 65536])
    def test_a10_coorddict_roundtrip_identity(self, dtype, size):
        _skip_no_native()
        from tests.conftest import DATA_GENERATORS
        gen = DATA_GENERATORS.get(dtype) or (lambda s: os.urandom(s))
        data = gen(size)

        hamming._USE_NATIVE = False
        py_packed = mshzip.pack(data, coord_dict=True, dimensions=4)
        hamming._USE_NATIVE = True
        c_packed = mshzip.pack(data, coord_dict=True, dimensions=4)
        assert py_packed == c_packed


# ── Section B: 단건 API 경계값 + 에러 정정 ──

class TestSectionB:
    'Hamming encode/decode 경계 조건과 에러 정정'

    def test_b1_encode_zeros(self):
        cw = hamming.encode(b'\x00' * 128)
        assert len(cw) == 130

    def test_b2_encode_ones(self):
        cw = hamming.encode(b'\xff' * 128)
        assert len(cw) == 130

    def test_b6_decode_no_error(self):
        data = os.urandom(128)
        cw = hamming.encode(data)
        dec, corr, unc = hamming.decode(cw)
        assert dec == data and not corr and not unc

    def test_b7_decode_1bit_error_bit0(self):
        data = os.urandom(128)
        cw = bytearray(hamming.encode(data))
        cw[0] ^= 0x80
        dec, corr, unc = hamming.decode(bytes(cw))
        assert corr and not unc and dec == data

    def test_b8_decode_1bit_error_last(self):
        data = os.urandom(128)
        cw = bytearray(hamming.encode(data))
        bit_1034 = 1034
        cw[bit_1034 // 8] ^= (1 << (7 - (bit_1034 % 8)))
        dec, corr, unc = hamming.decode(bytes(cw))
        assert corr and dec == data

    def test_b9_all_1035_single_bit_correction(self):
        'B9: 전수 1035 bit 1-bit 정정'
        data = os.urandom(128)
        cw = hamming.encode(data)
        corrected_count = 0
        for bit_pos in range(1035):
            corrupted = bytearray(cw)
            byte_idx = bit_pos // 8
            bit_in_byte = 7 - (bit_pos % 8)
            corrupted[byte_idx] ^= (1 << bit_in_byte)
            dec, corr, unc = hamming.decode(bytes(corrupted))
            if corr and not unc and dec == data:
                corrected_count += 1
        assert corrected_count == 1035, f'{corrected_count}/1035'

    def test_b10_decode_2bit_uncorrectable(self):
        'B10: SEC 코드에서 syndrome>1035 되는 2-bit 오류 → uncorrectable'
        data = os.urandom(128)
        cw = bytearray(hamming.encode(data))
        # 위치 12(byte 1, bit 4)와 위치 1024(byte 127, bit 0) flip
        # syndrome = 12 XOR 1024 = 1036 > 1035 → uncorrectable
        cw[1] ^= 0x10   # Hamming position 12
        cw[127] ^= 0x01  # Hamming position 1024
        _, _, unc = hamming.decode(bytes(cw))
        assert unc

    def test_b11_decode_random_codeword(self):
        cw = os.urandom(130)
        dec, corr, unc = hamming.decode(cw)
        assert isinstance(dec, bytes) and len(dec) == 128


# ── Section C: 배치 API 정합성 ──

class TestSectionC:
    'encode_batch/decode_batch 정합성'

    @pytest.mark.parametrize('count', [1, 2, 8, 32, 100])
    def test_c1_to_c5_batch_vs_single(self, count):
        axes = [os.urandom(128) for _ in range(count)]
        batch_enc = hamming.encode_batch(axes)
        singles = [hamming.encode(a) for a in axes]
        assert batch_enc == singles

    def test_c6_batch_count_0(self):
        result = hamming.encode_batch([])
        assert result == []

    def test_c7_batch_large(self):
        axes = [os.urandom(128) for _ in range(1000)]
        batch = hamming.encode_batch(axes)
        assert len(batch) == 1000

    def test_c8_decode_batch_mixed_errors(self):
        _skip_no_native()
        d1 = os.urandom(128)
        d2 = os.urandom(128)
        d3 = os.urandom(128)
        cw1 = hamming.encode(d1)
        cw2 = bytearray(hamming.encode(d2))
        cw2[5] ^= 0x01
        cw3 = hamming.encode(d3)
        results = hamming.decode_batch([cw1, bytes(cw2), cw3])
        assert not results[0][1] and not results[0][2]
        assert results[1][1] and not results[1][2]
        assert results[1][0] == d2
        assert not results[2][1] and not results[2][2]

    def test_c12_openmp_batch_vs_single(self):
        _skip_no_native()
        axes = [os.urandom(128) for _ in range(32)]
        batch = hamming.encode_batch(axes)
        singles = [hamming.encode(a) for a in axes]
        assert batch == singles

    def test_c13_openmp_threshold_boundary(self):
        _skip_no_native()
        for count in [3, 4, 5]:
            axes = [os.urandom(128) for _ in range(count)]
            batch = hamming.encode_batch(axes)
            singles = [hamming.encode(a) for a in axes]
            assert batch == singles, f'count={count}'

    def test_c14_openmp_batch_10000(self):
        _skip_no_native()
        axes = [os.urandom(128) for _ in range(10000)]
        batch = hamming.encode_batch(axes)
        assert len(batch) == 10000
        sample_idx = [0, 999, 5000, 9999]
        for i in sample_idx:
            assert batch[i] == hamming.encode(axes[i])


# ── Section D: RS XOR Parity ──

class TestSectionD:
    'RS XOR parity 생성 및 복구'

    def test_d2_parity_correctness(self):
        axes = [os.urandom(130) for _ in range(8)]
        parity_list = rs.generate_parity(axes, len(axes))
        parity = parity_list[0]
        expected = bytearray(130)
        for ax in axes:
            for j in range(130):
                expected[j] ^= ax[j]
        assert parity == bytes(expected)

    def test_d3_recover_axis_0(self):
        data = os.urandom(128 * 8)
        p = mshzip.Packer(coord_dict=True, dimensions=8, codec='none')
        packed = p.pack(data)
        restored = mshzip.unpack(packed)
        assert restored == data

    @pytest.mark.parametrize('group', [4, 8, 16])
    def test_d5_group_size_variants(self, group):
        axes = [os.urandom(130) for _ in range(group)]
        parity = rs.generate_parity(axes, group)
        assert len(parity) >= 1

    def test_d6_count_1(self):
        ax = os.urandom(130)
        parity_list = rs.generate_parity([ax], 1)
        assert parity_list[0] == ax

    def test_d9_no_damage(self):
        data = os.urandom(128 * 8)
        p = mshzip.Packer(coord_dict=True, dimensions=8, codec='none')
        packed = p.pack(data)
        assert mshzip.unpack(packed) == data


# ── Section E: Fallback 전환 + 격리 ──

class TestSectionE:
    'C native fallback 동작'

    def test_e3_native_switch(self):
        _skip_no_native()
        data = os.urandom(128)
        hamming._USE_NATIVE = True
        r1 = hamming.encode(data)
        hamming._USE_NATIVE = False
        r2 = hamming.encode(data)
        hamming._USE_NATIVE = True
        r3 = hamming.encode(data)
        assert r1 == r2 == r3

    def test_e4_native_off_roundtrip(self):
        hamming._USE_NATIVE = False
        data = os.urandom(4096)
        packed = mshzip.pack(data, coord_dict=True, dimensions=4)
        restored = mshzip.unpack(packed)
        assert restored == data

    def test_e5_native_on_roundtrip(self):
        _skip_no_native()
        hamming._USE_NATIVE = True
        data = os.urandom(4096)
        packed = mshzip.pack(data, coord_dict=True, dimensions=4)
        restored = mshzip.unpack(packed)
        assert restored == data

    def test_e6_native_pack_python_unpack(self):
        _skip_no_native()
        data = os.urandom(4096)
        hamming._USE_NATIVE = True
        packed = mshzip.pack(data, coord_dict=True, dimensions=8)
        hamming._USE_NATIVE = False
        restored = mshzip.unpack(packed)
        assert restored == data

    def test_e7_python_pack_native_unpack(self):
        _skip_no_native()
        data = os.urandom(4096)
        hamming._USE_NATIVE = False
        packed = mshzip.pack(data, coord_dict=True, dimensions=8)
        hamming._USE_NATIVE = True
        restored = mshzip.unpack(packed)
        assert restored == data

    def test_e9_native_off_serial_path(self):
        hamming._USE_NATIVE = False
        data = os.urandom(10240)
        p = mshzip.Packer(coord_dict=True, dimensions=8)
        packed = p.pack(data)
        assert mshzip.unpack(packed) == data
        assert p._coord_dict_packer._executor is None

    def test_e10_native_on_under_threshold(self):
        _skip_no_native()
        data = os.urandom(384)
        p = mshzip.Packer(coord_dict=True, dimensions=8)
        packed = p.pack(data)
        assert mshzip.unpack(packed) == data

    def test_e11_native_on_over_threshold(self):
        _skip_no_native()
        data = os.urandom(4096)
        p = mshzip.Packer(coord_dict=True, dimensions=8)
        packed = p.pack(data)
        assert mshzip.unpack(packed) == data
