'Section M: 병렬 동시성 안전성 테스트'
from __future__ import annotations

import os
import time
import pytest
import sys
from concurrent.futures import ThreadPoolExecutor

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

import mshzip
from mshzip import hamming
from mshzip.coord_dict import CoordDictPacker


@pytest.fixture(autouse=True)
def _save_native():
    orig = hamming._USE_NATIVE
    yield
    hamming._USE_NATIVE = orig


def _skip_no_native():
    if not hamming._USE_NATIVE:
        pytest.skip('C native 미설치')


# ── M1: 동시 Packer 인스턴스 ──

class TestM1ConcurrentPackers:

    def test_m1_2_packers(self):
        _skip_no_native()
        d1 = os.urandom(50 * 1024)
        d2 = os.urandom(100 * 1024)

        def pack_unpack(data, dims):
            with mshzip.Packer(coord_dict=True, dimensions=dims) as p:
                packed = p.pack(data)
            return mshzip.unpack(packed) == data

        with ThreadPoolExecutor(max_workers=2) as ex:
            f1 = ex.submit(pack_unpack, d1, 4)
            f2 = ex.submit(pack_unpack, d2, 8)
            assert f1.result()
            assert f2.result()

    def test_m2_4_packers(self):
        _skip_no_native()
        datasets = [os.urandom(20 * 1024) for _ in range(4)]

        def pack_unpack(data):
            packed = mshzip.pack(data, coord_dict=True, dimensions=8)
            return mshzip.unpack(packed) == data

        with ThreadPoolExecutor(max_workers=4) as ex:
            results = list(ex.map(pack_unpack, datasets))
        assert all(results)

    def test_m3_same_data_concurrent(self):
        _skip_no_native()
        data = os.urandom(10 * 1024)

        def do_pack(d):
            return mshzip.pack(d, coord_dict=True, dimensions=8)

        with ThreadPoolExecutor(max_workers=2) as ex:
            r1 = ex.submit(do_pack, data)
            r2 = ex.submit(do_pack, data)
            assert r1.result() == r2.result()

    def test_m4_different_dims_concurrent(self):
        _skip_no_native()

        def roundtrip(dims):
            data = os.urandom(dims * 128 * 5)
            packed = mshzip.pack(data, coord_dict=True, dimensions=dims)
            return mshzip.unpack(packed) == data

        with ThreadPoolExecutor(max_workers=2) as ex:
            f1 = ex.submit(roundtrip, 4)
            f2 = ex.submit(roundtrip, 8)
            assert f1.result() and f2.result()


# ── M2: _USE_NATIVE 전환 ──

class TestM2NativeSwitch:

    def test_m6_alternate_encode(self):
        _skip_no_native()
        data = os.urandom(128)
        results = []
        for i in range(100):
            hamming._USE_NATIVE = (i % 2 == 0)
            results.append(hamming.encode(data))
        assert all(r == results[0] for r in results)


# ── M3: GIL + ctypes ──

class TestM3GIL:

    def test_m7_gil_released(self):
        'M7: C 호출 시 GIL 해제 → 2스레드 동시 encode 정확성'
        _skip_no_native()
        data = [os.urandom(128) for _ in range(100)]
        expected = hamming.encode_batch(data)

        def do_encode():
            return hamming.encode_batch(data)

        with ThreadPoolExecutor(max_workers=2) as ex:
            f1 = ex.submit(do_encode)
            f2 = ex.submit(do_encode)
            r1 = f1.result()
            r2 = f2.result()

        assert r1 == expected
        assert r2 == expected

    def test_m8_python_c_interleave(self):
        _skip_no_native()
        data = os.urandom(128)

        def c_batch():
            hamming._USE_NATIVE = True
            return hamming.encode_batch([data] * 10)

        def py_single():
            hamming._USE_NATIVE = False
            return [hamming.encode(data) for _ in range(10)]

        with ThreadPoolExecutor(max_workers=2) as ex:
            f1 = ex.submit(c_batch)
            f2 = ex.submit(py_single)
            r1 = f1.result()
            r2 = f2.result()
        assert r1 == r2


# ── M4: 대규모 동시성 ──

class TestM4LargeScale:

    def test_m9_10_packers(self):
        _skip_no_native()

        def roundtrip(idx):
            data = os.urandom(10 * 1024)
            packed = mshzip.pack(data, coord_dict=True, dimensions=8)
            return mshzip.unpack(packed) == data

        with ThreadPoolExecutor(max_workers=10) as ex:
            results = list(ex.map(roundtrip, range(10)))
        assert all(results)

    def test_m10_100_concurrent_encode(self):
        _skip_no_native()

        def encode_one(d):
            return hamming.encode(d)

        data_list = [os.urandom(128) for _ in range(100)]
        with ThreadPoolExecutor(max_workers=10) as ex:
            results = list(ex.map(encode_one, data_list))
        expected = [hamming.encode(d) for d in data_list]
        assert results == expected

    def test_m11_pack_unpack_concurrent(self):
        _skip_no_native()
        data = os.urandom(10 * 1024)
        packed = mshzip.pack(data, coord_dict=True, dimensions=8)

        def do_pack():
            return mshzip.pack(data, coord_dict=True, dimensions=8)

        def do_unpack():
            return mshzip.unpack(packed)

        with ThreadPoolExecutor(max_workers=2) as ex:
            f1 = ex.submit(do_pack)
            f2 = ex.submit(do_unpack)
            assert len(f1.result()) > 0
            assert f2.result() == data


# ── M5: executor 재사용 ──

class TestM5ExecutorReuse:

    def test_m12_same_packer_10_packs(self):
        data = os.urandom(4096)
        p = mshzip.Packer(coord_dict=True, dimensions=8)
        for _ in range(10):
            packed = p.pack(data)
            assert mshzip.unpack(packed) == data
        p.close()

    def test_m13_executor_recreation(self):
        'M13: close → pack 재생성'
        if not hamming._USE_NATIVE:
            pytest.skip('C native 미설치')
        p = CoordDictPacker(dimensions=8)
        data = os.urandom(4096)
        p.encode(data)
        p.close()
        assert p._executor is None
        p.encode(data)
        assert p._executor is not None
        p.close()


# ── M6: 스트레스 ──

class TestM6Stress:

    def test_m14_1000_roundtrip(self):
        data = os.urandom(4096)
        for _ in range(1000):
            packed = mshzip.pack(data, coord_dict=True, dimensions=8)
            assert mshzip.unpack(packed) == data

    def test_m15_rotating_dims(self):
        dims_list = [2, 4, 8, 16, 32]
        for i in range(50):
            d = dims_list[i % len(dims_list)]
            data = os.urandom(d * 128 * 2)
            packed = mshzip.pack(data, coord_dict=True, dimensions=d)
            assert mshzip.unpack(packed) == data

    def test_m16_fast_create_destroy(self):
        data = os.urandom(4096)
        for _ in range(100):
            p = mshzip.Packer(coord_dict=True, dimensions=8)
            p.pack(data)
            p.close()

    def test_m17_long_running_executor(self):
        'M17: 5초간 반복'
        data = os.urandom(4096)
        p = mshzip.Packer(coord_dict=True, dimensions=8)
        end = time.perf_counter() + 2  # 2초로 축소 (CI 친화)
        count = 0
        while time.perf_counter() < end:
            packed = p.pack(data)
            assert mshzip.unpack(packed) == data
            count += 1
        p.close()
        assert count > 10
