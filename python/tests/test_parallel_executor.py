'Section K: ThreadPoolExecutor 청크 병렬 처리 테스트'
from __future__ import annotations

import os
import pytest
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

import mshzip
from mshzip import hamming
from mshzip.coord_dict import (
    CoordDictPacker, CoordDictUnpacker,
    MIN_CHUNKS_FOR_PARALLEL, HAMMING_BYTES,
)


@pytest.fixture(autouse=True)
def _save_native():
    orig = hamming._USE_NATIVE
    yield
    hamming._USE_NATIVE = orig


def _skip_no_native():
    if not hamming._USE_NATIVE:
        pytest.skip('C native 미설치')


# ── K1: 병렬/직렬 경로 전환 조건 ──

class TestK1PathSwitch:

    def test_k1_parallel_path(self):
        'K1: native ON + 4청크 → 병렬'
        _skip_no_native()
        data = os.urandom(4096)
        p = CoordDictPacker(dimensions=8)
        encoded, seq = p.encode(data)
        assert seq == 4
        if hamming._USE_NATIVE:
            assert p._executor is not None
        p.close()

    def test_k2_serial_path(self):
        'K2: native ON + 3청크 → 직렬'
        _skip_no_native()
        data = os.urandom(3072)
        p = CoordDictPacker(dimensions=8)
        encoded, seq = p.encode(data)
        assert seq == 3
        assert p._executor is None
        p.close()

    def test_k3_native_off_always_serial(self):
        'K3: native OFF → 항상 직렬'
        hamming._USE_NATIVE = False
        data = os.urandom(10240)
        p = CoordDictPacker(dimensions=8)
        p.encode(data)
        assert p._executor is None
        p.close()

    def test_k4_single_chunk_serial(self):
        'K4: 1청크 → 직렬'
        _skip_no_native()
        data = os.urandom(1024)
        p = CoordDictPacker(dimensions=8)
        p.encode(data)
        assert p._executor is None
        p.close()

    def test_k5_100_chunks_parallel(self):
        'K5: 100청크 → 병렬'
        _skip_no_native()
        data = os.urandom(102400)
        p = CoordDictPacker(dimensions=8)
        encoded, seq = p.encode(data)
        assert seq == 100
        assert p._executor is not None
        p.close()


# ── K2: 병렬 vs 직렬 결과 동일성 ──

class TestK2Identity:

    def test_k6_encode_identical(self):
        'K6: 1MB parallel == serial'
        _skip_no_native()
        data = os.urandom(65536)  # 64KB
        hamming._USE_NATIVE = False
        p_seq = CoordDictPacker(dimensions=8)
        enc_seq, _ = p_seq.encode(data)
        p_seq.close()

        hamming._USE_NATIVE = True
        p_par = CoordDictPacker(dimensions=8)
        enc_par, _ = p_par.encode(data)
        p_par.close()
        assert enc_seq == enc_par

    def test_k7_decode_identical(self):
        'K7: decode parallel == serial'
        _skip_no_native()
        data = os.urandom(65536)
        p = CoordDictPacker(dimensions=8)
        encoded, seq = p.encode(data)
        p.close()

        hamming._USE_NATIVE = False
        u_seq = CoordDictUnpacker()
        dec_seq = u_seq.decode(encoded, 8, 1, seq, len(data))
        u_seq.close()

        hamming._USE_NATIVE = True
        u_par = CoordDictUnpacker()
        dec_par = u_par.decode(encoded, 8, 1, seq, len(data))
        u_par.close()
        assert dec_seq == dec_par == data

    @pytest.mark.parametrize('dims', [4, 8, 16])
    def test_k8_roundtrip_dims(self, dims):
        'K8: roundtrip 다양한 dimensions'
        data = os.urandom(16384)
        packed = mshzip.pack(data, coord_dict=True, dimensions=dims)
        assert mshzip.unpack(packed) == data

    def test_k9_encode_text(self):
        'K9: text 데이터 병렬/직렬 동일'
        _skip_no_native()
        text = b'Hello World! ' * 5000
        hamming._USE_NATIVE = False
        p1 = CoordDictPacker(dimensions=8)
        enc1, _ = p1.encode(text)
        p1.close()

        hamming._USE_NATIVE = True
        p2 = CoordDictPacker(dimensions=8)
        enc2, _ = p2.encode(text)
        p2.close()
        assert enc1 == enc2

    def test_k10_encode_zeros(self):
        'K10: zeros 데이터 동일'
        _skip_no_native()
        data = b'\x00' * 65536
        hamming._USE_NATIVE = False
        p1 = CoordDictPacker(dimensions=8)
        enc1, _ = p1.encode(data)
        p1.close()

        hamming._USE_NATIVE = True
        p2 = CoordDictPacker(dimensions=8)
        enc2, _ = p2.encode(data)
        p2.close()
        assert enc1 == enc2


# ── K3: Unpacker 병렬 디코딩 ──

class TestK3UnpackerParallel:

    def test_k11_parallel_decode_4plus(self):
        'K11: 4+ 청크 병렬 decode'
        data = os.urandom(10240)
        packed = mshzip.pack(data, coord_dict=True, dimensions=8)
        assert mshzip.unpack(packed) == data

    def test_k12_serial_decode_under_3(self):
        'K12: 3청크 미만 직렬 decode'
        data = os.urandom(2048)
        packed = mshzip.pack(data, coord_dict=True, dimensions=8)
        assert mshzip.unpack(packed) == data

    def test_k13_parallel_decode_error_correction(self):
        'K13: 병렬 decode + 에러 정정'
        D = 8
        data = os.urandom(128 * D * 10)
        p = CoordDictPacker(dimensions=D)
        encoded, seq = p.encode(data)
        corrupted = bytearray(encoded)
        total_axes = D + 1
        chunk_size = total_axes * HAMMING_BYTES
        for chunk_idx in [1, 4, 7]:
            offset = chunk_idx * chunk_size + 20
            if offset < len(corrupted):
                corrupted[offset] ^= 0x04
        u = CoordDictUnpacker()
        restored = u.decode(bytes(corrupted), D, 1, seq, len(data))
        assert restored == data
        p.close()
        u.close()


# ── K4: 다양한 dimensions ──

class TestK4Dimensions:

    @pytest.mark.parametrize('dims', [2, 4, 16, 32])
    def test_k14_to_k17_dims_parallel(self, dims):
        data = os.urandom(dims * 128 * 4)  # 4 chunks
        packed = mshzip.pack(data, coord_dict=True, dimensions=dims)
        assert mshzip.unpack(packed) == data


# ── K5: max_workers 경계 ──

class TestK5Workers:

    def test_k18_max_workers_capped(self):
        p = CoordDictPacker(dimensions=8)
        data = os.urandom(4096)
        if hamming._USE_NATIVE:
            p.encode(data)
            if p._executor is not None:
                assert p._executor._max_workers <= 8
        p.close()

    def test_k19_chunks_less_than_workers(self):
        'K19: 4청크 < 8 workers'
        data = os.urandom(4096)
        packed = mshzip.pack(data, coord_dict=True, dimensions=8)
        assert mshzip.unpack(packed) == data

    def test_k20_chunks_much_more_than_workers(self):
        'K20: 1000청크 >> 8 workers'
        data = os.urandom(1024 * 1000)
        packed = mshzip.pack(data, coord_dict=True, dimensions=8)
        assert mshzip.unpack(packed) == data
