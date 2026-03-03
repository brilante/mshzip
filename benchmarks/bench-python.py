"""다층 벤치마크 — Python
Layer 1~5 교차 조합, 결과를 SQLite DB에 저장
"""
import os
import sys
import time
import random
import sqlite3
import platform

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from python.src.mshzip.packer import Packer
from python.src.mshzip.unpacker import Unpacker

DB_PATH = os.path.join(os.path.dirname(__file__), 'results.db')


# ── 데이터 생성 ──

def generate_text(size: int) -> bytes:
    words = b'The quick brown fox jumps over the lazy dog. Lorem ipsum dolor sit amet consectetur adipiscing elit. '
    buf = words * ((size // len(words)) + 2)
    return buf[:size]


def generate_binary(size: int) -> bytes:
    pattern = bytes([0x01, 0x02, 0x03, 0x04, 0xAA, 0xBB, 0xCC, 0xDD,
                     0x10, 0x20, 0x30, 0x40, 0x50, 0x60, 0x70, 0x80])
    buf = bytearray(size)
    for i in range(size):
        buf[i] = (pattern[i % 16] + (i // 256)) & 0xFF
    return bytes(buf)


def generate_random(size: int) -> bytes:
    return bytes(random.getrandbits(8) for _ in range(size))


def generate_mixed(size: int) -> bytes:
    half = size // 2
    return generate_text(half) + generate_random(size - half)


DATA_GENERATORS = {
    'text': generate_text,
    'binary': generate_binary,
    'random': generate_random,
    'mixed': generate_mixed,
}


# ── DB ──

def init_db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS benchmarks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            platform TEXT NOT NULL,
            data_type TEXT NOT NULL,
            data_size INTEGER NOT NULL,
            mode TEXT NOT NULL,
            dimensions INTEGER,
            crc INTEGER NOT NULL,
            compressed_size INTEGER NOT NULL,
            ratio REAL NOT NULL,
            pack_ms REAL NOT NULL,
            unpack_ms REAL NOT NULL,
            roundtrip_ok INTEGER NOT NULL,
            timestamp TEXT NOT NULL DEFAULT (datetime('now'))
        )
    """)
    conn.execute('CREATE INDEX IF NOT EXISTS idx_bench_mode ON benchmarks(mode)')
    conn.execute('CREATE INDEX IF NOT EXISTS idx_bench_type ON benchmarks(data_type)')
    conn.execute('CREATE INDEX IF NOT EXISTS idx_bench_size ON benchmarks(data_size)')
    conn.commit()
    return conn


# ── 벤치마크 ──

def run_benchmark(data: bytes, mode: str, dimensions: int | None, crc: bool):
    opts: dict = {'crc': crc}

    if mode == 'coorddict':
        opts['coord_dict'] = True
        opts['dimensions'] = dimensions
    elif mode == 'bitdict':
        opts['bit_depth'] = 8

    # Pack
    t0 = time.perf_counter()
    packer = Packer(**opts)
    compressed = packer.pack(data)
    pack_ms = (time.perf_counter() - t0) * 1000

    # Unpack
    t1 = time.perf_counter()
    unpacker = Unpacker()
    restored = unpacker.unpack(compressed)
    unpack_ms = (time.perf_counter() - t1) * 1000

    roundtrip_ok = (restored == data)
    ratio = (1 - len(compressed) / len(data)) * 100 if len(data) > 0 else 0.0

    return {
        'compressed_size': len(compressed),
        'ratio': round(ratio, 2),
        'pack_ms': round(pack_ms, 2),
        'unpack_ms': round(unpack_ms, 2),
        'roundtrip_ok': 1 if roundtrip_ok else 0,
    }


def main():
    random.seed(42)
    conn = init_db()

    # --platform 인자: python (기본) 또는 python-c
    plat = 'python'
    if '--platform' in sys.argv:
        idx = sys.argv.index('--platform')
        if idx + 1 < len(sys.argv):
            plat = sys.argv[idx + 1]

    DATA_TYPES = ['text', 'binary', 'random', 'mixed']
    SIZES = [256, 1024, 4096, 16384, 65536, 262144, 1048576]
    DIMENSIONS = [2, 4, 8, 16, 32]
    CRC_OPTIONS = [0, 1]

    total = 0
    passed = 0
    rows = []

    # C 네이티브 상태 표시
    try:
        from python.src.mshzip import _ecc_native
        native_ok = _ecc_native.is_available()
    except ImportError:
        native_ok = False

    print(f'=== Python 다층 벤치마크 시작 (platform={plat}, native={native_ok}) ===')
    print(f'CPU: {platform.processor()}, Cores: {os.cpu_count()}')
    print()

    for dtype in DATA_TYPES:
        for size in SIZES:
            data = DATA_GENERATORS[dtype](size)
            size_label = f'{size // 1048576}MB' if size >= 1048576 else \
                         f'{size // 1024}KB' if size >= 1024 else f'{size}B'

            for crc in CRC_OPTIONS:
                # normal
                try:
                    r = run_benchmark(data, 'normal', None, crc == 1)
                    rows.append((plat, dtype, size, 'normal', None, crc,
                                 r['compressed_size'], r['ratio'], r['pack_ms'],
                                 r['unpack_ms'], r['roundtrip_ok']))
                    total += 1
                    if r['roundtrip_ok']:
                        passed += 1
                except Exception as e:
                    print(f'  FAIL normal {dtype}/{size_label}/crc={crc}: {e}')
                    total += 1

                # bitdict
                try:
                    r = run_benchmark(data, 'bitdict', None, crc == 1)
                    rows.append((plat, dtype, size, 'bitdict', None, crc,
                                 r['compressed_size'], r['ratio'], r['pack_ms'],
                                 r['unpack_ms'], r['roundtrip_ok']))
                    total += 1
                    if r['roundtrip_ok']:
                        passed += 1
                except Exception as e:
                    print(f'  FAIL bitdict {dtype}/{size_label}/crc={crc}: {e}')
                    total += 1

                # coorddict
                for D in DIMENSIONS:
                    try:
                        r = run_benchmark(data, 'coorddict', D, crc == 1)
                        rows.append((plat, dtype, size, 'coorddict', D, crc,
                                     r['compressed_size'], r['ratio'], r['pack_ms'],
                                     r['unpack_ms'], r['roundtrip_ok']))
                        total += 1
                        if r['roundtrip_ok']:
                            passed += 1
                    except Exception as e:
                        print(f'  FAIL coorddict D={D} {dtype}/{size_label}/crc={crc}: {e}')
                        total += 1

        print(f'[{dtype}] 완료')

    conn.executemany("""
        INSERT INTO benchmarks (platform, data_type, data_size, mode, dimensions, crc,
                                compressed_size, ratio, pack_ms, unpack_ms, roundtrip_ok)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, rows)
    conn.commit()
    conn.close()

    print()
    print(f'=== 완료: {passed}/{total} PASS ===')
    print(f'DB: {DB_PATH}')


if __name__ == '__main__':
    main()
