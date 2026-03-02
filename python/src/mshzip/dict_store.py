'DictStore - 청크사이즈별 영구 딕셔너리 관리'
from __future__ import annotations

import os
import struct
from pathlib import Path

from .constants import (
    MSHD_MAGIC, MSHD_VERSION, MSHD_HEADER_SIZE, MSHD_HASH_SIZE,
)

# 기본 딕셔너리 디렉토리: ~/.mshzip/
DEFAULT_DICT_DIR = str(Path.home() / '.mshzip')


def _get_free_mem() -> int:
    'OS별 유휴 메모리 바이트 반환.'
    try:
        # Linux/Mac: /proc/meminfo 또는 os.sysconf
        if hasattr(os, 'sysconf'):
            page_size = os.sysconf('SC_PAGE_SIZE')
            avail = os.sysconf('SC_AVPHYS_PAGES')
            return page_size * avail
    except (ValueError, OSError):
        pass

    try:
        # Windows: ctypes
        import ctypes
        kernel32 = ctypes.windll.kernel32  # type: ignore[attr-defined]

        class MEMORYSTATUSEX(ctypes.Structure):
            _fields_ = [
                ('dwLength', ctypes.c_ulong),
                ('dwMemoryLoad', ctypes.c_ulong),
                ('ullTotalPhys', ctypes.c_ulonglong),
                ('ullAvailPhys', ctypes.c_ulonglong),
                ('ullTotalPageFile', ctypes.c_ulonglong),
                ('ullAvailPageFile', ctypes.c_ulonglong),
                ('ullTotalVirtual', ctypes.c_ulonglong),
                ('ullAvailVirtual', ctypes.c_ulonglong),
                ('ullAvailExtendedVirtual', ctypes.c_ulonglong),
            ]

        mem = MEMORYSTATUSEX()
        mem.dwLength = ctypes.sizeof(MEMORYSTATUSEX)
        kernel32.GlobalMemoryStatusEx(ctypes.byref(mem))
        return mem.ullAvailPhys
    except Exception:
        pass

    # fallback: 512MB
    return 512 * 1024 * 1024


class DictStore:
    """청크사이즈별 영구 딕셔너리 파일 관리.

    MSHD 파일 포맷:
      magic(4B 'MSHD') + version(2B) + chunkSize(4B) + entryCount(4B) = 14B 헤더
      [sha256_hash(32B) + chunk_data(chunkSize B)] × entryCount  (append-only)
    """

    def __init__(
        self,
        dict_dir: str | None = None,
        max_dict_size: int | None = None,
    ) -> None:
        self.dir = dict_dir or os.environ.get('MSHZIP_DICT_DIR', DEFAULT_DICT_DIR)
        env_max = os.environ.get('MSHZIP_MAX_DICT_SIZE')
        self.max_size = max_dict_size or (int(env_max) if env_max else self._calc_max_size())

    def _calc_max_size(self) -> int:
        '유휴 메모리의 80% 계산.'
        return int(_get_free_mem() * 0.8)

    def path(self, chunk_size: int) -> str:
        '딕셔너리 파일 경로.'
        return os.path.join(self.dir, f'dict-{chunk_size}.mshdict')

    def _ensure_dir(self) -> None:
        os.makedirs(self.dir, exist_ok=True)

    def init(self, chunk_size: int) -> str:
        '빈 딕셔너리 파일 초기화.'
        self._ensure_dir()
        file_path = self.path(chunk_size)

        header = bytearray(MSHD_HEADER_SIZE)
        header[0:4] = MSHD_MAGIC
        struct.pack_into('<H', header, 4, MSHD_VERSION)
        struct.pack_into('<I', header, 6, chunk_size)
        struct.pack_into('<I', header, 10, 0)  # entryCount = 0

        with open(file_path, 'wb') as f:
            f.write(header)

        return file_path

    def load(self, chunk_size: int) -> dict:
        """딕셔너리 로드.

        Returns:
            dict with keys: dict_index (dict[str,int]),
            dict_chunks (list[bytes]), entry_count (int)
        """
        file_path = self.path(chunk_size)

        if not os.path.exists(file_path):
            return {'dict_index': {}, 'dict_chunks': [], 'entry_count': 0}

        with open(file_path, 'rb') as f:
            buf = f.read()

        # 헤더 검증
        if len(buf) < MSHD_HEADER_SIZE:
            raise ValueError(
                f'MSHD 파일 손상: 헤더 크기 부족 ({len(buf)} < {MSHD_HEADER_SIZE})'
            )

        magic = buf[0:4]
        if magic != MSHD_MAGIC:
            raise ValueError(f'MSHD 매직넘버 불일치: {magic!r}')

        version = struct.unpack_from('<H', buf, 4)[0]
        if version != MSHD_VERSION:
            raise ValueError(f'MSHD 버전 불일치: {version} (지원: {MSHD_VERSION})')

        file_chunk_size = struct.unpack_from('<I', buf, 6)[0]
        if file_chunk_size != chunk_size:
            raise ValueError(
                f'MSHD chunkSize 불일치: 파일={file_chunk_size}, 요청={chunk_size}'
            )

        entry_count = struct.unpack_from('<I', buf, 10)[0]
        entry_size = MSHD_HASH_SIZE + chunk_size
        expected_size = MSHD_HEADER_SIZE + entry_count * entry_size

        if len(buf) < expected_size:
            raise ValueError(
                f'MSHD 파일 손상: {len(buf)} < {expected_size} ({entry_count}개 엔트리 기대)'
            )

        # 엔트리 파싱
        dict_index: dict[str, int] = {}
        dict_chunks: list[bytes] = []
        offset = MSHD_HEADER_SIZE

        for i in range(entry_count):
            hash_hex = buf[offset:offset + MSHD_HASH_SIZE].hex()
            offset += MSHD_HASH_SIZE
            chunk = buf[offset:offset + chunk_size]
            offset += chunk_size

            dict_index[hash_hex] = i
            dict_chunks.append(chunk)

        return {
            'dict_index': dict_index,
            'dict_chunks': dict_chunks,
            'entry_count': entry_count,
        }

    def save(
        self,
        chunk_size: int,
        dict_index: dict[str, int],
        dict_chunks: list[bytes],
        prev_count: int,
    ) -> None:
        """딕셔너리 저장 (append-only: 새 엔트리만 추가).

        Args:
            chunk_size: 청크 크기
            dict_index: 전체 해시→인덱스 매핑
            dict_chunks: 전체 청크 리스트
            prev_count: 이전 로드 시 엔트리 수
        """
        new_count = len(dict_chunks) - prev_count
        if new_count <= 0:
            return

        self._ensure_dir()
        file_path = self.path(chunk_size)
        entry_size = MSHD_HASH_SIZE + chunk_size

        # 인덱스→해시 역방향 맵 구성
        index_to_hash: dict[int, str] = {}
        for hash_hex, idx in dict_index.items():
            index_to_hash[idx] = hash_hex

        if not os.path.exists(file_path):
            # 파일 없으면 새로 생성
            header = bytearray(MSHD_HEADER_SIZE)
            header[0:4] = MSHD_MAGIC
            struct.pack_into('<H', header, 4, MSHD_VERSION)
            struct.pack_into('<I', header, 6, chunk_size)
            struct.pack_into('<I', header, 10, len(dict_chunks))

            with open(file_path, 'wb') as f:
                f.write(header)
                for i in range(len(dict_chunks)):
                    f.write(bytes.fromhex(index_to_hash[i]))
                    f.write(dict_chunks[i])
            return

        # 기존 파일에 append
        with open(file_path, 'r+b') as f:
            # entryCount 업데이트 (offset 10, 4B LE)
            f.seek(10)
            f.write(struct.pack('<I', len(dict_chunks)))

            # 새 엔트리 append (파일 끝에)
            f.seek(MSHD_HEADER_SIZE + prev_count * entry_size)
            for i in range(prev_count, len(dict_chunks)):
                f.write(bytes.fromhex(index_to_hash[i]))
                f.write(dict_chunks[i])

    def is_over_limit(self, chunk_size: int) -> bool:
        '딕셔너리 크기가 maxSize 초과 여부.'
        file_path = self.path(chunk_size)
        if not os.path.exists(file_path):
            return False

        try:
            size = os.path.getsize(file_path)
            return size > self.max_size
        except OSError:
            return False

    def info(self, chunk_size: int) -> dict:
        '딕셔너리 정보 조회.'
        file_path = self.path(chunk_size)
        result: dict = {'exists': False, 'path': file_path}

        if not os.path.exists(file_path):
            return result

        try:
            size = os.path.getsize(file_path)
            with open(file_path, 'rb') as f:
                header = f.read(MSHD_HEADER_SIZE)

            result['exists'] = True
            result['size'] = size
            result['entry_count'] = struct.unpack_from('<I', header, 10)[0]
            result['chunk_size'] = struct.unpack_from('<I', header, 6)[0]
            result['max_size'] = self.max_size
            result['over_limit'] = size > self.max_size
        except OSError:
            pass

        return result
