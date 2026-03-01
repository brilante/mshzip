'Node.js ↔ Python cross-compatibility tests'
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

import pytest
import mshzip

# Path setup
SPEC_DIR = Path(__file__).parent.parent.parent / 'spec' / 'test-vectors'
NODEJS_CLI = Path(__file__).parent.parent.parent / 'nodejs' / 'cli.js'

VECTOR_NAMES = [
    'empty',
    'small-repeat',
    'boundary-127',
    'boundary-128',
    'boundary-129',
    'multi-frame',
    'crc32',
    'codec-none',
    'large-chunk',
    'text-data',
    'binary-random',
    'single-byte',
]


class TestNodeToPython:
    'Unpack Node.js-generated .msh with Python.'

    @pytest.mark.parametrize('name', VECTOR_NAMES)
    def test_unpack(self, name):
        msh_file = SPEC_DIR / f'{name}.msh'
        bin_file = SPEC_DIR / f'{name}.bin'
        if not msh_file.exists():
            pytest.skip(f'Test vector not found: {name}')
        msh_data = msh_file.read_bytes()
        expected = bin_file.read_bytes()
        result = mshzip.unpack(msh_data)
        assert result == expected, f'{name}: Node.js→Python unpack failed'


class TestPythonToNode:
    'Unpack Python-generated .msh with Node.js.'

    @pytest.mark.parametrize('name', VECTOR_NAMES)
    def test_roundtrip_via_node(self, name, tmp_path):
        bin_file = SPEC_DIR / f'{name}.bin'
        if not bin_file.exists():
            pytest.skip(f'Test vector not found: {name}')

        original = bin_file.read_bytes()

        # Pack with Python
        packed = mshzip.pack(original)
        msh_file = tmp_path / f'{name}.msh'
        msh_file.write_bytes(packed)

        # Unpack with Node.js
        out_file = tmp_path / f'{name}.bin'
        result = subprocess.run(
            ['node', str(NODEJS_CLI), 'unpack', '-i', str(msh_file), '-o', str(out_file)],
            capture_output=True,
            timeout=30,
        )
        assert result.returncode == 0, (
            f'{name}: Node.js unpack failed: {result.stderr.decode()}'
        )
        restored = out_file.read_bytes()
        assert restored == original, f'{name}: Python→Node.js unpack failed'


class TestBidirectional:
    'Bidirectional cross-validation: various option combinations.'

    @pytest.mark.parametrize('chunk_size', [8, 32, 128, 1024])
    def test_chunk_sizes(self, chunk_size, tmp_path):
        data = bytes(range(256)) * 4
        # Python pack → Node.js unpack
        packed = mshzip.pack(data, chunk_size=chunk_size)
        msh_file = tmp_path / 'test.msh'
        msh_file.write_bytes(packed)
        out_file = tmp_path / 'test.bin'
        result = subprocess.run(
            ['node', str(NODEJS_CLI), 'unpack', '-i', str(msh_file), '-o', str(out_file)],
            capture_output=True, timeout=30,
        )
        assert result.returncode == 0
        assert out_file.read_bytes() == data

    @pytest.mark.parametrize('codec', ['gzip', 'none'])
    @pytest.mark.parametrize('crc', [True, False])
    def test_codec_crc(self, codec, crc, tmp_path):
        data = b'codec crc test ' * 50
        packed = mshzip.pack(data, codec=codec, crc=crc)
        msh_file = tmp_path / 'test.msh'
        msh_file.write_bytes(packed)
        out_file = tmp_path / 'test.bin'
        result = subprocess.run(
            ['node', str(NODEJS_CLI), 'unpack', '-i', str(msh_file), '-o', str(out_file)],
            capture_output=True, timeout=30,
        )
        assert result.returncode == 0
        assert out_file.read_bytes() == data
