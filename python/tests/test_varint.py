'varint module unit tests'
from __future__ import annotations

import pytest
from mshzip import varint


class TestEncode:
    def test_zero(self):
        assert varint.encode(0) == b'\x00'

    def test_one(self):
        assert varint.encode(1) == b'\x01'

    def test_max_1byte(self):
        assert varint.encode(127) == b'\x7f'

    def test_min_2byte(self):
        assert varint.encode(128) == bytes([0x80, 0x01])

    def test_max_2byte(self):
        assert varint.encode(16383) == bytes([0xff, 0x7f])

    def test_large_value(self):
        result = varint.encode(300)
        assert len(result) == 2

    def test_max_uint32(self):
        result = varint.encode(0xFFFFFFFF)
        assert len(result) == 5


class TestDecode:
    def test_zero(self):
        val, n = varint.decode(b'\x00')
        assert val == 0 and n == 1

    def test_one(self):
        val, n = varint.decode(b'\x01')
        assert val == 1 and n == 1

    def test_max_1byte(self):
        val, n = varint.decode(b'\x7f')
        assert val == 127 and n == 1

    def test_min_2byte(self):
        val, n = varint.decode(bytes([0x80, 0x01]))
        assert val == 128 and n == 2

    def test_with_offset(self):
        buf = b'\xff' + varint.encode(42)
        val, n = varint.decode(buf, offset=1)
        assert val == 42

    def test_memoryview(self):
        buf = memoryview(varint.encode(1000))
        val, n = varint.decode(buf)
        assert val == 1000

    def test_overflow(self):
        # 6+ consecutive continuation bits
        bad = bytes([0x80] * 6)
        with pytest.raises(ValueError, match='overflow'):
            varint.decode(bad)

    def test_incomplete(self):
        bad = bytes([0x80])
        with pytest.raises(ValueError, match='incomplete'):
            varint.decode(bad)


class TestRoundtrip:
    @pytest.mark.parametrize('value', [
        0, 1, 127, 128, 255, 256, 300, 16383, 16384,
        65535, 100000, 0xFFFFFFFF,
    ])
    def test_roundtrip(self, value):
        encoded = varint.encode(value)
        decoded, n = varint.decode(encoded)
        assert decoded == value
        assert n == len(encoded)


class TestArray:
    def test_encode_decode_array(self):
        values = [0, 1, 127, 128, 300, 16384, 100000]
        encoded = varint.encode_array(values)
        decoded, total = varint.decode_array(encoded, 0, len(values))
        assert decoded == values
        assert total == len(encoded)

    def test_empty_array(self):
        encoded = varint.encode_array([])
        assert encoded == b''

    def test_single_element(self):
        encoded = varint.encode_array([42])
        decoded, total = varint.decode_array(encoded, 0, 1)
        assert decoded == [42]
