'Section L: 라이프사이클 관리 테스트'
from __future__ import annotations

import os
import time
import pytest
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

import mshzip
from mshzip import hamming
from mshzip.coord_dict import CoordDictPacker, CoordDictUnpacker


@pytest.fixture(autouse=True)
def _save_native():
    orig = hamming._USE_NATIVE
    yield
    hamming._USE_NATIVE = orig


# ── L1: Packer 라이프사이클 ──

class TestL1Packer:

    def test_l1_close(self):
        p = mshzip.Packer(coord_dict=True, dimensions=8)
        p.pack(os.urandom(4096))
        p.close()
        assert p._coord_dict_packer._executor is None

    def test_l2_close_double(self):
        p = mshzip.Packer(coord_dict=True, dimensions=8)
        p.pack(os.urandom(4096))
        p.close()
        p.close()  # 중복 호출 에러 없음

    def test_l3_close_not_called(self):
        'GC 의존'
        p = mshzip.Packer(coord_dict=True, dimensions=8)
        p.pack(os.urandom(4096))
        del p  # GC 처리

    def test_l4_context_manager(self):
        data = os.urandom(4096)
        with mshzip.Packer(coord_dict=True, dimensions=8) as p:
            packed = p.pack(data)
        assert p._coord_dict_packer._executor is None
        assert mshzip.unpack(packed) == data

    def test_l5_context_manager_exception(self):
        with pytest.raises(ValueError):
            with mshzip.Packer(coord_dict=True, dimensions=8) as p:
                p.pack(os.urandom(4096))
                raise ValueError('test')
        assert p._coord_dict_packer._executor is None


# ── L2: Unpacker 라이프사이클 ──

class TestL2Unpacker:

    def test_l6_unpacker_close(self):
        u = mshzip.Unpacker()
        u.close()  # 에러 없음

    def test_l7_unpacker_context_manager(self):
        data = os.urandom(4096)
        packed = mshzip.pack(data, coord_dict=True, dimensions=8)
        with mshzip.Unpacker() as u:
            restored = u.unpack(packed)
        assert restored == data


# ── L3: CoordDictPacker executor 관리 ──

class TestL3CoordDictPacker:

    def test_l8_lazy_init_none(self):
        p = CoordDictPacker(dimensions=8)
        assert p._executor is None
        p.close()

    def test_l9_lazy_init_on_parallel(self):
        if not hamming._USE_NATIVE:
            pytest.skip('C native 미설치')
        p = CoordDictPacker(dimensions=8)
        data = os.urandom(4096)
        p.encode(data)
        assert p._executor is not None
        p.close()

    def test_l10_lazy_init_skip_serial(self):
        p = CoordDictPacker(dimensions=8)
        data = os.urandom(3072)  # 3 chunks → 직렬
        p.encode(data)
        assert p._executor is None
        p.close()

    def test_l11_close_then_reuse(self):
        'L11: close 후 재사용'
        if not hamming._USE_NATIVE:
            pytest.skip('C native 미설치')
        p = CoordDictPacker(dimensions=8)
        data = os.urandom(4096)
        p.encode(data)
        p.close()
        assert p._executor is None
        # 재사용
        enc, _ = p.encode(data)
        assert p._executor is not None
        assert len(enc) > 0
        p.close()

    def test_l12_shutdown_fast(self):
        'L12: close 시간 < 100ms'
        if not hamming._USE_NATIVE:
            pytest.skip('C native 미설치')
        p = CoordDictPacker(dimensions=8)
        p.encode(os.urandom(4096))
        t0 = time.perf_counter()
        p.close()
        elapsed = (time.perf_counter() - t0) * 1000
        assert elapsed < 100, f'close took {elapsed:.1f}ms'


# ── L4: CoordDictUnpacker executor 관리 ──

class TestL4CoordDictUnpacker:

    def test_l13_unpacker_lazy_init(self):
        u = CoordDictUnpacker()
        assert u._executor is None
        u.close()

    def test_l14_unpacker_parallel_decode(self):
        if not hamming._USE_NATIVE:
            pytest.skip('C native 미설치')
        data = os.urandom(4096)
        p = CoordDictPacker(dimensions=8)
        encoded, seq = p.encode(data)
        p.close()
        u = CoordDictUnpacker()
        u.decode(encoded, 8, 1, seq, len(data))
        assert u._executor is not None
        u.close()

    def test_l15_unpacker_close(self):
        u = CoordDictUnpacker()
        u.close()
        assert u._executor is None
