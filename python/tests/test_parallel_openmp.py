'Section J: OpenMP C 배치 병렬화 테스트'
from __future__ import annotations

import os
import time
import pytest
import sys
from concurrent.futures import ThreadPoolExecutor

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from mshzip import hamming
from mshzip import reed_solomon as rs


@pytest.fixture(autouse=True)
def _save_native():
    orig = hamming._USE_NATIVE
    yield
    hamming._USE_NATIVE = orig


def _skip_no_native():
    if not hamming._USE_NATIVE:
        pytest.skip('C native 미설치')


# ── J1: init_tables 스레드 안전성 ──

class TestJ1InitTables:

    def test_j1_concurrent_init(self):
        'J1: 10스레드 동시 encode → init_tables 경합'
        _skip_no_native()
        data_set = [os.urandom(128) for _ in range(100)]
        expected = [hamming.encode(d) for d in data_set]

        def encode_chunk(chunk):
            return [hamming.encode(d) for d in chunk]

        with ThreadPoolExecutor(max_workers=10) as ex:
            chunks = [data_set[i * 10:(i + 1) * 10] for i in range(10)]
            futures = [ex.submit(encode_chunk, c) for c in chunks]
            results = [r for f in futures for r in f.result()]

        assert results == expected

    def test_j2_first_call(self):
        'J2: DLL 로드 직후 첫 encode'
        _skip_no_native()
        data = os.urandom(128)
        cw = hamming.encode(data)
        dec, _, _ = hamming.decode(cw)
        assert dec == data

    def test_j3_repeated_init(self):
        'J3: 1000회 연속 호출'
        _skip_no_native()
        data = os.urandom(128)
        results = [hamming.encode(data) for _ in range(1000)]
        assert all(r == results[0] for r in results)


# ── J2: 배치 병렬 정확성 ──

class TestJ2BatchParallel:

    @pytest.mark.parametrize('count', [4, 8, 32, 100])
    def test_j4_to_j7_encode_batch(self, count):
        _skip_no_native()
        axes = [os.urandom(128) for _ in range(count)]
        batch = hamming.encode_batch(axes)
        singles = [hamming.encode(a) for a in axes]
        assert batch == singles

    @pytest.mark.parametrize('count', [4, 32])
    def test_j8_j9_decode_batch(self, count):
        _skip_no_native()
        originals = [os.urandom(128) for _ in range(count)]
        cws = [hamming.encode(d) for d in originals]
        batch_results = hamming.decode_batch(cws)
        for i, (data, corr, unc) in enumerate(batch_results):
            assert data == originals[i]
            assert not corr and not unc

    def test_j10_parallel_decode_mixed_errors(self):
        'J10: 32 axes 중 8개에 1-bit error'
        _skip_no_native()
        originals = [os.urandom(128) for _ in range(32)]
        codewords = hamming.encode_batch(originals)
        corrupted = list(codewords)
        error_indices = [0, 4, 7, 10, 15, 20, 25, 31]
        for idx in error_indices:
            buf = bytearray(corrupted[idx])
            buf[idx % 130] ^= 0x01
            corrupted[idx] = bytes(buf)
        results = hamming.decode_batch(corrupted)
        for i, (data, corr, unc) in enumerate(results):
            assert data == originals[i], f'axis {i} data mismatch'
            if i in error_indices:
                assert corr, f'axis {i} should be corrected'


# ── J3: NULL 포인터 / 경계 방어 ──

class TestJ3NullGuard:

    def test_j11_encode_batch_count_0(self):
        result = hamming.encode_batch([])
        assert result == []

    def test_j13_decode_batch_count_0(self):
        result = hamming.decode_batch([])
        assert result == []

    def test_j14_rs_xor_count_0(self):
        parity = rs.generate_parity([])
        assert parity == []


# ── J4: OpenMP 성능 ──

class TestJ4Performance:

    def test_j17_batch_throughput_scaling(self):
        _skip_no_native()
        axes_4 = [os.urandom(128) for _ in range(4)]
        axes_1000 = [os.urandom(128) for _ in range(1000)]

        t0 = time.perf_counter()
        for _ in range(10):
            hamming.encode_batch(axes_4)
        t_small = (time.perf_counter() - t0) / 10

        t0 = time.perf_counter()
        for _ in range(10):
            hamming.encode_batch(axes_1000)
        t_large = (time.perf_counter() - t0) / 10

        # 1000개는 4개보다 오래 걸리지만, throughput(개당)은 비슷하거나 나아야 함
        throughput_small = 4 / t_small if t_small > 0 else float('inf')
        throughput_large = 1000 / t_large if t_large > 0 else float('inf')
        # throughput_large가 throughput_small의 50% 이상이면 OK
        assert throughput_large >= throughput_small * 0.5

    def test_j18_batch_vs_loop(self):
        _skip_no_native()
        axes = [os.urandom(128) for _ in range(100)]

        t0 = time.perf_counter()
        for _ in range(3):
            batch = hamming.encode_batch(axes)
        t_batch = (time.perf_counter() - t0) / 3

        t0 = time.perf_counter()
        for _ in range(3):
            loop = [hamming.encode(a) for a in axes]
        t_loop = (time.perf_counter() - t0) / 3

        assert batch == loop
        # batch가 loop보다 느리지 않아야 함 (2배까지 허용)
        assert t_batch < t_loop * 2
