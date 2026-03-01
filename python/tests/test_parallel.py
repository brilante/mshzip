'WorkerPool parallel processing tests'
from __future__ import annotations

from pathlib import Path

import pytest
import mshzip
from mshzip.parallel import WorkerPool, Task


class TestWorkerPool:
    def test_single_pack(self, tmp_path):
        data = b'single pack test ' * 100
        in_file = tmp_path / 'input.bin'
        out_file = tmp_path / 'output.msh'
        in_file.write_bytes(data)

        pool = WorkerPool(2)
        pool.init()
        result = pool.run_task(Task(
            type='pack',
            input_path=str(in_file),
            output_path=str(out_file),
        ))
        pool.shutdown()

        assert result.success
        assert result.input_size == len(data)
        assert result.output_size > 0
        assert out_file.exists()

        # unpack verification
        restored = mshzip.unpack(out_file.read_bytes())
        assert restored == data

    def test_single_unpack(self, tmp_path):
        data = b'single unpack test ' * 100
        packed = mshzip.pack(data)
        in_file = tmp_path / 'input.msh'
        out_file = tmp_path / 'output.bin'
        in_file.write_bytes(packed)

        pool = WorkerPool(2)
        pool.init()
        result = pool.run_task(Task(
            type='unpack',
            input_path=str(in_file),
            output_path=str(out_file),
        ))
        pool.shutdown()

        assert result.success
        assert out_file.read_bytes() == data

    def test_run_all(self, tmp_path):
        tasks = []
        originals = []
        for i in range(4):
            data = f'parallel test {i} '.encode() * 100
            originals.append(data)
            in_file = tmp_path / f'input{i}.bin'
            out_file = tmp_path / f'output{i}.msh'
            in_file.write_bytes(data)
            tasks.append(Task(
                type='pack',
                input_path=str(in_file),
                output_path=str(out_file),
            ))

        pool = WorkerPool(2)
        pool.init()
        results = pool.run_all(tasks)
        pool.shutdown()

        assert all(r.success for r in results)
        for i in range(4):
            msh = (tmp_path / f'output{i}.msh').read_bytes()
            assert mshzip.unpack(msh) == originals[i]

    def test_error_handling(self, tmp_path):
        pool = WorkerPool(1)
        pool.init()
        result = pool.run_task(Task(
            type='pack',
            input_path=str(tmp_path / 'nonexistent.bin'),
            output_path=str(tmp_path / 'output.msh'),
        ))
        pool.shutdown()

        assert not result.success
        assert result.error != ''

    def test_auto_init(self, tmp_path):
        data = b'auto init'
        in_file = tmp_path / 'input.bin'
        out_file = tmp_path / 'output.msh'
        in_file.write_bytes(data)

        pool = WorkerPool(1)
        # Call run_task without calling init()
        result = pool.run_task(Task(
            type='pack',
            input_path=str(in_file),
            output_path=str(out_file),
        ))
        pool.shutdown()
        assert result.success

    def test_custom_options(self, tmp_path):
        data = b'custom opts ' * 100
        in_file = tmp_path / 'input.bin'
        out_file = tmp_path / 'output.msh'
        in_file.write_bytes(data)

        pool = WorkerPool(1)
        result = pool.run_task(Task(
            type='pack',
            input_path=str(in_file),
            output_path=str(out_file),
            chunk_size=32,
            codec='none',
            crc=True,
        ))
        pool.shutdown()

        assert result.success
        restored = mshzip.unpack(out_file.read_bytes())
        assert restored == data

    def test_pack_then_unpack(self, tmp_path):
        'Parallel pack -> parallel unpack round-trip.'
        files_data = [f'file {i} content '.encode() * 50 for i in range(3)]
        pack_tasks = []
        for i, data in enumerate(files_data):
            in_file = tmp_path / f'f{i}.bin'
            in_file.write_bytes(data)
            pack_tasks.append(Task(
                type='pack',
                input_path=str(in_file),
                output_path=str(tmp_path / f'f{i}.msh'),
            ))

        pool = WorkerPool(2)
        pack_results = pool.run_all(pack_tasks)
        assert all(r.success for r in pack_results)

        unpack_tasks = [
            Task(
                type='unpack',
                input_path=str(tmp_path / f'f{i}.msh'),
                output_path=str(tmp_path / f'f{i}.restored'),
            )
            for i in range(3)
        ]
        unpack_results = pool.run_all(unpack_tasks)
        pool.shutdown()

        assert all(r.success for r in unpack_results)
        for i, data in enumerate(files_data):
            assert (tmp_path / f'f{i}.restored').read_bytes() == data
