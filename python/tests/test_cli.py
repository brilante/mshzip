'CLI subprocess tests'
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

import pytest
import mshzip


def run_cli(*args: str, input_data: bytes | None = None) -> subprocess.CompletedProcess:
    'Run mshzip CLI as subprocess.'
    return subprocess.run(
        [sys.executable, '-m', 'mshzip.cli', *args],
        capture_output=True,
        input=input_data,
        timeout=30,
        cwd=str(Path(__file__).parent.parent),
        env={**__import__('os').environ, 'PYTHONPATH': str(Path(__file__).parent.parent / 'src')},
    )


class TestPackUnpack:
    def test_pack_unpack_file(self, tmp_path):
        data = b'CLI pack/unpack test ' * 50
        in_file = tmp_path / 'input.bin'
        msh_file = tmp_path / 'output.msh'
        out_file = tmp_path / 'restored.bin'
        in_file.write_bytes(data)

        # pack
        r = run_cli('pack', '-i', str(in_file), '-o', str(msh_file))
        assert r.returncode == 0, r.stderr.decode()
        assert msh_file.exists()

        # unpack
        r = run_cli('unpack', '-i', str(msh_file), '-o', str(out_file))
        assert r.returncode == 0, r.stderr.decode()
        assert out_file.read_bytes() == data

    def test_pack_with_options(self, tmp_path):
        data = b'options test ' * 100
        in_file = tmp_path / 'input.bin'
        msh_file = tmp_path / 'output.msh'
        out_file = tmp_path / 'restored.bin'
        in_file.write_bytes(data)

        r = run_cli(
            'pack', '-i', str(in_file), '-o', str(msh_file),
            '--chunk', '32', '--codec', 'none', '--crc', '--verbose',
        )
        assert r.returncode == 0

        r = run_cli('unpack', '-i', str(msh_file), '-o', str(out_file))
        assert r.returncode == 0
        assert out_file.read_bytes() == data

    def test_pack_stdin_stdout(self, tmp_path):
        data = b'stdin stdout test'
        r = run_cli('pack', '-i', '-', '-o', '-', input_data=data)
        assert r.returncode == 0
        packed = r.stdout
        assert packed[:4] == b'MSH1'

        r = run_cli('unpack', '-i', '-', '-o', '-', input_data=packed)
        assert r.returncode == 0
        assert r.stdout == data


class TestInfo:
    def test_info(self, tmp_path):
        data = b'info test ' * 100
        msh_file = tmp_path / 'test.msh'
        msh_file.write_bytes(mshzip.pack(data))

        r = run_cli('info', '-i', str(msh_file))
        assert r.returncode == 0
        output = r.stdout.decode('utf-8', errors='replace')
        assert '#0' in output
        assert 'gzip' in output


class TestMulti:
    def test_multi_pack_unpack(self, tmp_path):
        # Create input files
        files = []
        for i in range(3):
            f = tmp_path / f'file{i}.bin'
            f.write_bytes(f'multi test {i} '.encode() * 50)
            files.append(str(f))

        comp_dir = tmp_path / 'compressed'
        rest_dir = tmp_path / 'restored'

        # multi pack
        r = run_cli(
            'multi', 'pack', *files,
            '--out-dir', str(comp_dir), '--workers', '2',
        )
        assert r.returncode == 0, r.stderr.decode()

        # multi unpack
        msh_files = [str(f) for f in comp_dir.glob('*.msh')]
        assert len(msh_files) == 3
        r = run_cli(
            'multi', 'unpack', *msh_files,
            '--out-dir', str(rest_dir), '--workers', '2',
        )
        assert r.returncode == 0, r.stderr.decode()

        # Verify: file names with .msh suffix removed after unpack
        for i in range(3):
            original = (tmp_path / f'file{i}.bin').read_bytes()
            candidates = list(rest_dir.glob(f'file{i}*'))
            assert len(candidates) >= 1, f'file{i} restored file not found: {list(rest_dir.iterdir())}'
            restored = candidates[0].read_bytes()
            assert restored == original


class TestHelp:
    def test_no_args(self):
        r = run_cli()
        assert r.returncode == 0

    def test_invalid_command(self):
        r = run_cli('invalid')
        assert r.returncode != 0
