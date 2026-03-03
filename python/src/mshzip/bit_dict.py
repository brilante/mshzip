'BitDict - N비트 전수 사전 관리'
from __future__ import annotations

import os
import struct
from pathlib import Path

from .dict_store import _get_free_mem

# MSBD 파일 포맷 (12B 헤더):
#   magic(4B 'MSBD') + version(2B) + bitDepth(2B) + reserved(4B)
MSBD_MAGIC: bytes = b'MSBD'
MSBD_VERSION: int = 1
MSBD_HEADER_SIZE: int = 12

DEFAULT_DICT_DIR: str = str(Path.home() / '.mshzip')


class BitDict:
    """N비트 전수 사전 관리.

    index = pattern value (수학적 항등) -> 실제 엔트리 데이터 불필요.
    MSBD 파일은 bitDepth 메타데이터만 저장.
    """

    def __init__(
        self,
        dict_dir: str | None = None,
        max_mem_bytes: int | None = None,
    ) -> None:
        self.dir = dict_dir or os.environ.get('MSHZIP_DICT_DIR', DEFAULT_DICT_DIR)
        self.max_mem_bytes = max_mem_bytes or int(_get_free_mem() * 0.8)

    def path(self, bit_depth: int) -> str:
        """MSBD 파일 경로."""
        return os.path.join(self.dir, f'bitdict-{bit_depth}.msbd')

    def generate(self, bit_depth: int) -> str:
        """MSBD 사전 파일 생성."""
        if bit_depth < 1 or bit_depth > 32:
            raise ValueError(f'bit_depth out of range: 1~32, got {bit_depth}')

        self._ensure_dir()
        file_path = self.path(bit_depth)

        header = bytearray(MSBD_HEADER_SIZE)
        header[0:4] = MSBD_MAGIC
        struct.pack_into('<H', header, 4, MSBD_VERSION)
        struct.pack_into('<H', header, 6, bit_depth)
        # reserved(4B) = 0 (이미 bytearray로 초기화)

        with open(file_path, 'wb') as f:
            f.write(header)

        return file_path

    def load(self, bit_depth: int) -> int:
        """사전 로드 (없으면 자동 생성)."""
        file_path = self.path(bit_depth)
        if not os.path.exists(file_path):
            self.generate(bit_depth)
            return bit_depth

        with open(file_path, 'rb') as f:
            buf = f.read(MSBD_HEADER_SIZE)

        if len(buf) < MSBD_HEADER_SIZE:
            raise ValueError(f'MSBD 파일 손상: {file_path}')

        if buf[0:4] != MSBD_MAGIC:
            raise ValueError(f'MSBD 매직넘버 불일치: {buf[0:4]!r}')

        file_bit_depth = struct.unpack_from('<H', buf, 6)[0]
        if file_bit_depth != bit_depth:
            raise ValueError(
                f'bitDepth 불일치: 파일={file_bit_depth}, 요청={bit_depth}'
            )

        return bit_depth

    def estimate_mem_bytes(self, bit_depth: int) -> int:
        """N비트 전수 사전의 추정 메모리 (바이트)."""
        return (2 ** bit_depth) * 4

    def is_over_limit(self, bit_depth: int) -> bool:
        """시스템 메모리 초과 여부."""
        return self.estimate_mem_bytes(bit_depth) >= self.max_mem_bytes

    def info(self, bit_depth: int) -> dict:
        """사전 정보 조회."""
        file_path = self.path(bit_depth)
        result: dict = {
            'exists': False,
            'path': file_path,
            'bit_depth': bit_depth,
            'pattern_count': 2 ** bit_depth,
            'estimated_mem_mb': round(
                self.estimate_mem_bytes(bit_depth) / 1024 / 1024, 1
            ),
            'is_over_limit': self.is_over_limit(bit_depth),
        }

        if not os.path.exists(file_path):
            return result

        try:
            with open(file_path, 'rb') as f:
                f.read(MSBD_HEADER_SIZE)
            result['exists'] = True
        except OSError:
            pass

        return result

    def _ensure_dir(self) -> None:
        os.makedirs(self.dir, exist_ok=True)
