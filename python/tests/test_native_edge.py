'Section G: Edge Case 테스트'
from __future__ import annotations

import os
import pytest
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

import mshzip
from mshzip import hamming


@pytest.fixture(autouse=True)
def _save_native():
    orig = hamming._USE_NATIVE
    yield
    hamming._USE_NATIVE = orig


class TestSectionG:
    'Edge case 테스트'

    def test_g1_empty_data(self):
        p = mshzip.Packer(coord_dict=True, dimensions=4)
        packed = p.pack(b'')
        restored = mshzip.unpack(packed)
        assert restored == b''

    def test_g2_1byte(self):
        data = b'\x42'
        packed = mshzip.pack(data, coord_dict=True, dimensions=2)
        assert mshzip.unpack(packed) == data

    def test_g3_127bytes(self):
        data = os.urandom(127)
        packed = mshzip.pack(data, coord_dict=True, dimensions=2)
        assert mshzip.unpack(packed) == data

    def test_g4_128bytes_exact_axis(self):
        data = os.urandom(128)
        packed = mshzip.pack(data, coord_dict=True, dimensions=2)
        assert mshzip.unpack(packed) == data

    def test_g5_129bytes(self):
        data = os.urandom(129)
        packed = mshzip.pack(data, coord_dict=True, dimensions=2)
        assert mshzip.unpack(packed) == data

    def test_g6_1023bytes(self):
        data = os.urandom(1023)
        packed = mshzip.pack(data, coord_dict=True, dimensions=8)
        assert mshzip.unpack(packed) == data

    def test_g7_1024bytes_exact_chunk(self):
        data = os.urandom(1024)
        packed = mshzip.pack(data, coord_dict=True, dimensions=8)
        assert mshzip.unpack(packed) == data

    def test_g8_1025bytes(self):
        data = os.urandom(1025)
        packed = mshzip.pack(data, coord_dict=True, dimensions=8)
        assert mshzip.unpack(packed) == data

    def test_g9_5mb(self):
        data = os.urandom(5 * 1024 * 1024)
        packed = mshzip.pack(data, coord_dict=True, dimensions=8)
        assert mshzip.unpack(packed) == data

    def test_g12_bytes_vs_bytearray(self):
        raw = os.urandom(1024)
        p1 = mshzip.pack(raw, coord_dict=True, dimensions=4)
        p2 = mshzip.pack(bytearray(raw), coord_dict=True, dimensions=4)
        assert p1 == p2

    def test_g13_d2_min_chunk(self):
        data = os.urandom(256)
        packed = mshzip.pack(data, coord_dict=True, dimensions=2)
        assert mshzip.unpack(packed) == data

    def test_g14_d32_min_chunk(self):
        data = os.urandom(4096)
        packed = mshzip.pack(data, coord_dict=True, dimensions=32)
        assert mshzip.unpack(packed) == data

    def test_g15_min_chunks_boundary_4(self):
        'G15: MIN_CHUNKS 정확 경계 (4청크)'
        data = os.urandom(4096)
        packed = mshzip.pack(data, coord_dict=True, dimensions=8)
        assert mshzip.unpack(packed) == data

    def test_g16_min_chunks_boundary_3(self):
        'G16: MIN_CHUNKS 미만 (3청크)'
        data = os.urandom(3072)
        packed = mshzip.pack(data, coord_dict=True, dimensions=8)
        assert mshzip.unpack(packed) == data
