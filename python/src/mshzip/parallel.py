'ProcessPoolExecutor based parallel processing'
from __future__ import annotations

import os
import time
from concurrent.futures import ProcessPoolExecutor
from dataclasses import dataclass
from pathlib import Path
from typing import Literal

from .packer import Packer
from .unpacker import Unpacker
from .constants import DEFAULT_CHUNK_SIZE, DEFAULT_FRAME_LIMIT, DEFAULT_CODEC, DEFAULT_SUB_CHUNK_SIZE


@dataclass
class TaskResult:
    'Task result.'
    success: bool
    input_size: int = 0
    output_size: int = 0
    elapsed_ms: float = 0.0
    dict_size: int = 0
    error: str = ''


@dataclass
class Task:
    'Parallel task definition.'
    type: Literal['pack', 'unpack']
    input_path: str
    output_path: str
    chunk_size: int | str = DEFAULT_CHUNK_SIZE
    frame_limit: int = DEFAULT_FRAME_LIMIT
    codec: str = DEFAULT_CODEC
    crc: bool = False
    hier_dedup: str | bool = 'auto'
    sub_chunk_size: int = DEFAULT_SUB_CHUNK_SIZE


def _worker_fn(task: Task) -> TaskResult:
    'Function executed in worker process.'
    try:
        start = time.monotonic()
        input_data = Path(task.input_path).read_bytes()

        if task.type == 'pack':
            packer = Packer(
                chunk_size=task.chunk_size,
                frame_limit=task.frame_limit,
                codec=task.codec,
                crc=task.crc,
                hier_dedup=task.hier_dedup,
                sub_chunk_size=task.sub_chunk_size,
            )
            output_data = packer.pack(input_data)
            Path(task.output_path).write_bytes(output_data)
            elapsed = (time.monotonic() - start) * 1000
            return TaskResult(
                success=True,
                input_size=len(input_data),
                output_size=len(output_data),
                elapsed_ms=elapsed,
                dict_size=len(packer.dict_chunks),
            )
        elif task.type == 'unpack':
            unpacker = Unpacker()
            output_data = unpacker.unpack(input_data)
            Path(task.output_path).write_bytes(output_data)
            elapsed = (time.monotonic() - start) * 1000
            return TaskResult(
                success=True,
                input_size=len(input_data),
                output_size=len(output_data),
                elapsed_ms=elapsed,
                dict_size=len(unpacker.dict),
            )
        else:
            return TaskResult(
                success=False,
                error=f'Unknown task type: {task.type}',
            )
    except Exception as e:
        return TaskResult(success=False, error=str(e))


class WorkerPool:
    'ProcessPoolExecutor based parallel processing pool.'

    def __init__(self, size: int | None = None) -> None:
        self._size = size or os.cpu_count() or 4
        self._executor: ProcessPoolExecutor | None = None

    def init(self) -> None:
        'Initialize pool.'
        if self._executor is None:
            self._executor = ProcessPoolExecutor(max_workers=self._size)

    def run_task(self, task: Task) -> TaskResult:
        'Run single task.'
        if self._executor is None:
            self.init()
        assert self._executor is not None
        future = self._executor.submit(_worker_fn, task)
        return future.result()

    def run_all(self, tasks: list[Task]) -> list[TaskResult]:
        'Run multiple tasks concurrently.'
        if self._executor is None:
            self.init()
        assert self._executor is not None
        futures = [self._executor.submit(_worker_fn, t) for t in tasks]
        return [f.result() for f in futures]

    def shutdown(self) -> None:
        'Shutdown pool.'
        if self._executor:
            self._executor.shutdown(wait=True)
            self._executor = None
