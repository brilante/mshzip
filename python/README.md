# mshzip (Python)

고정 청크 dedup + 엔트로피 압축 유틸 — Python/UV 버전

MSH1 바이너리 포맷을 사용하며, Node.js 구현체와 100% 교차 호환됩니다.
표준 라이브러리만 사용 (외부 의존성 없음).

## 설치

```bash
# uv (권장)
uv pip install mshzip

# pip
pip install mshzip
```

## CLI 사용법

```bash
# 압축
mshzip pack -i data.bin -o data.msh
mshzip pack -i data.bin -o data.msh --chunk 1024 --crc --verbose

# 해제
mshzip unpack -i data.msh -o data.bin

# 파일 정보
mshzip info -i data.msh

# 병렬 처리
mshzip multi pack file1.bin file2.bin file3.bin --out-dir ./compressed --workers 4
mshzip multi unpack compressed/*.msh --out-dir ./restored

# stdin/stdout 파이프
cat data.bin | mshzip pack -i - -o - > data.msh
mshzip unpack -i data.msh -o - | sha256sum
```

## Python API

### 간편 API

```python
import mshzip

# 압축
compressed = mshzip.pack(b'hello world' * 100)

# 해제
original = mshzip.unpack(compressed)

# 옵션
compressed = mshzip.pack(data, chunk_size=1024, codec='gzip', crc=True)
```

### Packer / Unpacker 클래스

```python
from mshzip import Packer, Unpacker

packer = Packer(chunk_size=256, codec='gzip', crc=True)
compressed = packer.pack(data)

unpacker = Unpacker()
restored = unpacker.unpack(compressed)
```

### 스트리밍 API

```python
from mshzip import PackStream, UnpackStream, pack_stream, unpack_stream

# Generator 기반 스트리밍
ps = PackStream(chunk_size=128)
for frame in ps.feed(data):
    output.write(frame)
for frame in ps.flush():
    output.write(frame)

# 파일 I/O 편의 함수
with open('input.bin', 'rb') as inp, open('output.msh', 'wb') as out:
    stats = pack_stream(inp, out, chunk_size=256)

with open('output.msh', 'rb') as inp, open('restored.bin', 'wb') as out:
    stats = unpack_stream(inp, out)
```

### 병렬 처리

```python
from mshzip.parallel import WorkerPool, Task

pool = WorkerPool(4)
results = pool.run_all([
    Task(type='pack', input_path='a.bin', output_path='a.msh'),
    Task(type='pack', input_path='b.bin', output_path='b.msh'),
])
pool.shutdown()

for r in results:
    print(f'{r.success}: {r.input_size} -> {r.output_size} ({r.elapsed_ms}ms)')
```

## CLI 옵션

| 옵션 | 기본값 | 설명 |
|------|--------|------|
| `--chunk <N>` | 128 | 청크 크기 (8 ~ 16,777,216B) |
| `--frame <N>` | 67108864 | 프레임당 최대 바이트 (64MB) |
| `--codec <종류>` | gzip | `gzip` 또는 `none` |
| `--crc` | off | CRC32 체크섬 추가 |
| `--verbose` | off | 상세 출력 |
| `--workers <N>` | CPU 코어 수 | 병렬 Worker 수 (multi 명령) |

## 테스트

```bash
# uv
uv run pytest

# pytest 직접
pytest tests/ -v
```

253개 테스트: varint(30) + packer(16) + unpacker(14) + roundtrip(131) + compat(32) + stream(16) + cli(7) + parallel(7)

## 요구 사항

- Python 3.10+
- 외부 의존성 없음 (표준 라이브러리만 사용)
