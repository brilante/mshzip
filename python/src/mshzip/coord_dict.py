'CoordDict — 적응형 XD 좌표 사전 (병렬 처리)'
from __future__ import annotations

import math
import os
from concurrent.futures import ThreadPoolExecutor

from . import hamming
from . import reed_solomon as rs

BITS_PER_AXIS = 1024
BYTES_PER_AXIS = 128       # 1024 / 8
HAMMING_BYTES = 130         # ceil(1035 / 8)
RS_GROUP_SIZE = 8
COORDDICT_EXTRA_HEADER_SIZE = 8
MIN_CHUNKS_FOR_PARALLEL = 4  # 이 이상일 때만 병렬화


class CoordDictPacker:
    """CoordDict 인코더 (C native + OpenMP 시 병렬 처리)."""

    def __init__(self, dimensions: int | None = None) -> None:
        self.dimensions = dimensions or os.cpu_count() or 4
        if self.dimensions < 1:
            raise ValueError(f'CoordDict dimensions must be >= 1, got {self.dimensions}')
        self.chunk_data_size = self.dimensions * BYTES_PER_AXIS
        self.rs_axes = math.ceil(self.dimensions / RS_GROUP_SIZE)
        self.total_axes_per_chunk = self.dimensions + self.rs_axes
        self.encoded_chunk_size = self.total_axes_per_chunk * HAMMING_BYTES
        self._executor: ThreadPoolExecutor | None = None

    def _get_executor(self) -> ThreadPoolExecutor:
        """Lazy 초기화: 첫 사용 시 생성."""
        if self._executor is None:
            self._executor = ThreadPoolExecutor(
                max_workers=min(os.cpu_count() or 4, 8)
            )
        return self._executor

    def encode(self, data: bytes | bytearray) -> tuple[bytes, int]:
        """입력 데이터를 CoordDict 인코딩. 반환: (encoded, seqCount)."""
        chunks: list[bytes] = []
        off = 0
        while off < len(data):
            chunk = data[off:off + self.chunk_data_size]
            if len(chunk) < self.chunk_data_size:
                chunk = chunk + b'\x00' * (self.chunk_data_size - len(chunk))
            chunks.append(chunk)
            off += self.chunk_data_size

        if not chunks:
            return b'', 0

        seq_count = len(chunks)

        # C native + 4청크 이상 → ThreadPoolExecutor 병렬 처리
        if len(chunks) >= MIN_CHUNKS_FOR_PARALLEL and hamming._USE_NATIVE:
            executor = self._get_executor()
            encoded_parts = list(executor.map(self.encode_chunk, chunks))
        else:
            encoded_parts = [self.encode_chunk(c) for c in chunks]

        return b''.join(encoded_parts), seq_count

    def close(self) -> None:
        """ThreadPoolExecutor 정리."""
        if self._executor:
            self._executor.shutdown(wait=False)
            self._executor = None

    def encode_chunk(self, chunk: bytes) -> bytes:
        """단일 청크 인코딩: D × 128B → (D + R) × 130B."""
        D = self.dimensions

        # D개 축으로 분배
        data_axes = [
            chunk[i * BYTES_PER_AXIS:(i + 1) * BYTES_PER_AXIS]
            for i in range(D)
        ]

        # Hamming 인코딩 (배치 API)
        hamming_axes = hamming.encode_batch(data_axes)

        # RS 패리티축
        parity_axes = rs.generate_parity(hamming_axes, RS_GROUP_SIZE)

        return b''.join(hamming_axes) + b''.join(parity_axes)


class CoordDictUnpacker:
    """CoordDict 디코더 (C native + OpenMP 시 병렬 처리)."""

    def __init__(self) -> None:
        self._executor: ThreadPoolExecutor | None = None

    def _get_executor(self) -> ThreadPoolExecutor:
        """Lazy 초기화."""
        if self._executor is None:
            self._executor = ThreadPoolExecutor(
                max_workers=min(os.cpu_count() or 4, 8)
            )
        return self._executor

    def decode(
        self,
        raw_payload: bytes,
        dimensions: int,
        rs_axes: int,
        seq_count: int,
        orig_bytes: int,
    ) -> bytes:
        """CoordDict 디코딩: 인코딩 페이로드 → 원본."""
        total_axes_per_chunk = dimensions + rs_axes
        encoded_chunk_size = total_axes_per_chunk * HAMMING_BYTES

        # 청크 슬라이스 분리
        encoded_chunks: list[bytes] = []
        offset = 0
        for _ in range(seq_count):
            encoded_chunks.append(raw_payload[offset:offset + encoded_chunk_size])
            offset += encoded_chunk_size

        # C native + 4청크 이상 → 병렬 디코딩
        if len(encoded_chunks) >= MIN_CHUNKS_FOR_PARALLEL and hamming._USE_NATIVE:
            executor = self._get_executor()
            decode_fn = lambda enc: self.decode_chunk(enc, dimensions, rs_axes)
            restored_chunks = list(executor.map(decode_fn, encoded_chunks))
        else:
            restored_chunks = [
                self.decode_chunk(enc, dimensions, rs_axes)
                for enc in encoded_chunks
            ]

        full = b''.join(restored_chunks)
        return full[:orig_bytes]

    def close(self) -> None:
        """ThreadPoolExecutor 정리."""
        if self._executor:
            self._executor.shutdown(wait=False)
            self._executor = None

    def decode_chunk(
        self,
        encoded_chunk: bytes,
        dimensions: int,
        rs_axes: int,
    ) -> bytes:
        """단일 청크 디코딩: (D + R) × 130B → D × 128B."""
        total_axes = dimensions + rs_axes

        # 축 분리
        all_axes = [
            encoded_chunk[i * HAMMING_BYTES:(i + 1) * HAMMING_BYTES]
            for i in range(total_axes)
        ]
        data_axes = all_axes[:dimensions]
        parity_axes = all_axes[dimensions:]

        # Hamming 디코딩 (배치 API)
        batch_results = hamming.decode_batch(data_axes)
        decoded = [r[0] for r in batch_results]
        damaged = [r[2] for r in batch_results]

        # RS 복구
        if any(damaged):
            recovered = rs.recover(data_axes, parity_axes, damaged, RS_GROUP_SIZE)
            for i in range(dimensions):
                if damaged[i]:
                    data, _, _ = hamming.decode(recovered[i])
                    decoded[i] = data

        return b''.join(decoded)
