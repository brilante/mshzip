'Section H: 메모리 안정성 테스트'
from __future__ import annotations

import os
import sys
import tracemalloc
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

import mshzip
from mshzip import hamming


@pytest.fixture(autouse=True)
def _save_native():
    orig = hamming._USE_NATIVE
    yield
    hamming._USE_NATIVE = orig


class TestSectionH:
    'C native 반복 호출 시 메모리 안정성'

    def test_h1_encode_1000(self):
        data = os.urandom(128)
        tracemalloc.start()
        _, baseline = tracemalloc.get_traced_memory()
        for _ in range(1000):
            hamming.encode(data)
        _, peak = tracemalloc.get_traced_memory()
        tracemalloc.stop()
        assert (peak - baseline) < 1 * 1024 * 1024

    def test_h2_decode_1000(self):
        data = os.urandom(128)
        cw = hamming.encode(data)
        tracemalloc.start()
        _, baseline = tracemalloc.get_traced_memory()
        for _ in range(1000):
            hamming.decode(cw)
        _, peak = tracemalloc.get_traced_memory()
        tracemalloc.stop()
        assert (peak - baseline) < 1 * 1024 * 1024

    def test_h3_encode_batch_1000(self):
        axes = [os.urandom(128) for _ in range(8)]
        tracemalloc.start()
        _, baseline = tracemalloc.get_traced_memory()
        for _ in range(1000):
            hamming.encode_batch(axes)
        _, peak = tracemalloc.get_traced_memory()
        tracemalloc.stop()
        assert (peak - baseline) < 5 * 1024 * 1024

    def test_h4_roundtrip_100_no_leak(self):
        data = os.urandom(65536)
        tracemalloc.start()
        _, baseline = tracemalloc.get_traced_memory()
        for _ in range(100):
            packed = mshzip.pack(data, coord_dict=True, dimensions=8)
            restored = mshzip.unpack(packed)
            assert restored == data
        _, peak = tracemalloc.get_traced_memory()
        tracemalloc.stop()
        assert (peak - baseline) < 10 * 1024 * 1024

    def test_h5_large_batch(self):
        axes = [os.urandom(128) for _ in range(10000)]
        batch = hamming.encode_batch(axes)
        assert len(batch) == 10000

    def test_h6_alternate_native(self):
        if not hamming._USE_NATIVE:
            pytest.skip('C native 미설치')
        data = os.urandom(128)
        results = []
        for i in range(100):
            hamming._USE_NATIVE = (i % 2 == 0)
            results.append(hamming.encode(data))
        assert all(r == results[0] for r in results)

    def test_h9_executor_create_destroy_100(self):
        'H9: executor 반복 생성/해제'
        tracemalloc.start()
        _, baseline = tracemalloc.get_traced_memory()
        data = os.urandom(4096)
        for _ in range(100):
            p = mshzip.Packer(coord_dict=True, dimensions=8)
            p.pack(data)
            p.close()
        _, peak = tracemalloc.get_traced_memory()
        tracemalloc.stop()
        assert (peak - baseline) < 10 * 1024 * 1024

    def test_h10_executor_no_close(self):
        'H10: close() 미호출 100회'
        data = os.urandom(4096)
        for _ in range(100):
            p = mshzip.Packer(coord_dict=True, dimensions=8)
            p.pack(data)
            # close() 의도적 미호출

    def test_h11_context_manager_100(self):
        'H11: context manager 100회'
        tracemalloc.start()
        _, baseline = tracemalloc.get_traced_memory()
        data = os.urandom(4096)
        for _ in range(100):
            with mshzip.Packer(coord_dict=True, dimensions=8) as p:
                p.pack(data)
        _, peak = tracemalloc.get_traced_memory()
        tracemalloc.stop()
        assert (peak - baseline) < 5 * 1024 * 1024
