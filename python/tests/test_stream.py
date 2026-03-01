'PackStream/UnpackStream streaming tests'
from __future__ import annotations

import io
import os

import pytest
import mshzip
from mshzip.stream import PackStream, UnpackStream, pack_stream, unpack_stream


def stream_roundtrip(data: bytes, **opts) -> bytes:
    'PackStream → UnpackStream roundtrip.'
    ps = PackStream(**opts)
    us = UnpackStream()
    msh_parts: list[bytes] = []
    for frame in ps.feed(data):
        msh_parts.append(frame)
    for frame in ps.flush():
        msh_parts.append(frame)
    msh_data = b''.join(msh_parts)

    restored_parts: list[bytes] = []
    for chunk in us.feed(msh_data):
        restored_parts.append(chunk)
    us.finalize()
    return b''.join(restored_parts)


class TestPackStreamBasic:
    def test_empty(self):
        assert stream_roundtrip(b'') == b''

    def test_small(self):
        data = b'hello world'
        assert stream_roundtrip(data, chunk_size=8) == data

    def test_exact_chunk(self):
        data = b'x' * 128
        assert stream_roundtrip(data) == data

    def test_large(self):
        data = os.urandom(100_000)
        assert stream_roundtrip(data) == data

    def test_codec_none(self):
        data = b'test' * 100
        assert stream_roundtrip(data, codec='none') == data

    def test_crc(self):
        data = b'crc test' * 50
        assert stream_roundtrip(data, crc=True) == data


class TestPackStreamIncremental:
    def test_byte_by_byte(self):
        'Feed PackStream byte by byte.'
        data = b'byte by byte' * 10
        ps = PackStream(chunk_size=8)
        msh_parts: list[bytes] = []
        for b in data:
            for frame in ps.feed(bytes([b])):
                msh_parts.append(frame)
        for frame in ps.flush():
            msh_parts.append(frame)

        us = UnpackStream()
        restored: list[bytes] = []
        for chunk in us.feed(b''.join(msh_parts)):
            restored.append(chunk)
        us.finalize()
        assert b''.join(restored) == data

    def test_multi_frame_via_feed(self):
        'Feed data larger than frameLimit to generate multiple frames.'
        data = b'x' * 1000
        ps = PackStream(chunk_size=8, frame_limit=100)
        frames: list[bytes] = []
        for frame in ps.feed(data):
            frames.append(frame)
        for frame in ps.flush():
            frames.append(frame)
        assert ps.stats['frame_count'] >= 2


class TestUnpackStreamIncremental:
    def test_byte_by_byte_unpack(self):
        'Feed UnpackStream byte by byte.'
        data = b'incremental unpack test'
        packed = mshzip.pack(data, chunk_size=8)

        us = UnpackStream()
        restored: list[bytes] = []
        for b in packed:
            for chunk in us.feed(bytes([b])):
                restored.append(chunk)
        us.finalize()
        assert b''.join(restored) == data

    def test_invalid_magic(self):
        us = UnpackStream()
        with pytest.raises(ValueError, match='magic'):
            list(us.feed(b'XXXX' + b'\x00' * 40))

    def test_residual_data(self):
        us = UnpackStream()
        us._buf = bytearray(b'leftover')
        with pytest.raises(ValueError, match='Remaining'):
            us.finalize()


class TestStreamStats:
    def test_pack_stats(self):
        ps = PackStream(chunk_size=128)
        list(ps.feed(b'x' * 256))
        list(ps.flush())
        stats = ps.stats
        assert stats['bytes_in'] == 256
        assert stats['bytes_out'] > 0
        assert stats['frame_count'] >= 1
        assert stats['dict_size'] >= 1

    def test_unpack_stats(self):
        packed = mshzip.pack(b'hello' * 100, chunk_size=8)
        us = UnpackStream()
        list(us.feed(packed))
        us.finalize()
        stats = us.stats
        assert stats['bytes_in'] == len(packed)
        assert stats['bytes_out'] == 500


class TestConvenienceFunctions:
    def test_pack_unpack_stream(self, tmp_path):
        data = b'stream convenience test ' * 100
        in_file = tmp_path / 'input.bin'
        msh_file = tmp_path / 'output.msh'
        out_file = tmp_path / 'restored.bin'
        in_file.write_bytes(data)

        # pack
        with open(in_file, 'rb') as inp, open(msh_file, 'wb') as out:
            stats = pack_stream(inp, out, chunk_size=64)
        assert stats['bytes_in'] == len(data)

        # unpack
        with open(msh_file, 'rb') as inp, open(out_file, 'wb') as out:
            stats = unpack_stream(inp, out)
        assert out_file.read_bytes() == data

    def test_io_bytesio(self):
        data = b'BytesIO test' * 50
        msh_buf = io.BytesIO()
        pack_stream(io.BytesIO(data), msh_buf, chunk_size=32)

        msh_buf.seek(0)
        out_buf = io.BytesIO()
        unpack_stream(msh_buf, out_buf)
        assert out_buf.getvalue() == data


class TestPackUnpackConsistency:
    def test_stream_matches_api(self):
        'PackStream output produces same unpack result as pack() API.'
        data = b'consistency check' * 100
        api_packed = mshzip.pack(data, chunk_size=64)
        api_restored = mshzip.unpack(api_packed)

        stream_restored = stream_roundtrip(data, chunk_size=64)
        assert stream_restored == api_restored == data
