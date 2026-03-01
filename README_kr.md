# mshzip

**고정 청크 중복제거(dedup) + 엔트로피 압축 유틸 (모노레포)**

반복 패턴이 많은 데이터를 SHA-256 해시 기반으로 중복 제거한 뒤, gzip 엔트로피 압축을 적용하는 도구입니다.
MSH1 바이너리 포맷을 공유하며, Node.js와 Python 구현체 간 100% 교차 호환됩니다.

```
원본 100MB (반복 패턴) →  1.4KB (100.0% 압축, 694 MB/s)
원본  50MB (로그 파일) →  9.0MB ( 82.0% 압축,  56 MB/s)
원본  50MB (JSON)     →  7.4MB ( 85.1% 압축,  57 MB/s)
```

---

## 구현체

| 구현체 | 언어 | 의존성 | 테스트 |
|--------|------|--------|--------|
| **[nodejs/](nodejs/)** | Node.js 18+ | dotenv | 221 PASS |
| **[python/](python/)** | Python 3.10+ | 없음 (표준 라이브러리만) | 253 PASS |

두 구현체는 동일한 MSH1 바이너리 포맷을 사용합니다. Node.js로 압축한 파일을 Python으로 해제하거나 그 반대도 가능합니다.

---

## 빠른 시작

### Node.js

```bash
cd nodejs
npm install

# 압축/해제
node cli.js pack -i data.bin -o data.msh
node cli.js unpack -i data.msh -o data.bin

# 파일 정보
node cli.js info -i data.msh

# 병렬 처리
node cli.js multi pack *.log --out-dir ./compressed --workers 4

# 스트리밍 (stdin/stdout)
cat data.bin | node cli.js pack -i - -o - > data.msh
node cli.js unpack -i data.msh -o - | sha256sum

# 벤치마크
npm test
```

### Python (uv)

```bash
cd python
uv sync

# 압축/해제
uv run mshzip pack -i data.bin -o data.msh
uv run mshzip unpack -i data.msh -o data.bin

# 파일 정보
uv run mshzip info -i data.msh

# 병렬 처리
uv run mshzip multi pack file1.bin file2.bin --out-dir ./compressed --workers 4

# 스트리밍 (stdin/stdout)
cat data.bin | uv run mshzip pack -i - -o - > data.msh

# 테스트
uv run pytest
```

### Python (pip)

```bash
cd python
pip install -e .

mshzip pack -i data.bin -o data.msh
mshzip unpack -i data.msh -o data.bin
```

---

## CLI 옵션

```
mshzip pack -i <input> -o <output> [옵션]
  -i <path>         입력 파일 (- = stdin)
  -o <path>         출력 파일 (- = stdout)
  --chunk <N|auto>  청크 크기 (바이트) 또는 auto (기본: auto)
  --frame <N>       프레임당 최대 바이트 (기본: 64MB)
  --codec <type>    gzip | none (기본: gzip)
  --crc             CRC32 체크섬 추가
  --verbose         상세 출력

mshzip unpack -i <input> -o <output>
mshzip info -i <file>
mshzip multi pack|unpack <files...> --out-dir <dir> [--workers N]
```

---

## API

### Node.js

```javascript
const { pack, unpack } = require('./lib');

// 간단 API
const compressed = pack(Buffer.from('hello world'.repeat(100)));
const restored = unpack(compressed);

// 옵션 지정
const compressed2 = pack(data, {
  chunkSize: 256,     // auto | 8~16MB
  frameLimit: 64 * 1024 * 1024,
  codec: 'gzip',      // gzip | none
  crc: true
});
```

```javascript
// 스트리밍 API
const { PackStream, UnpackStream } = require('./lib');
const { pipeline } = require('stream/promises');

const ps = new PackStream({ chunkSize: 128, codec: 'gzip' });
await pipeline(
  fs.createReadStream('data.bin'),
  ps,
  fs.createWriteStream('data.msh')
);
console.log(ps.stats);
// { bytesIn, bytesOut, frameCount, dictSize, chunkSize }
```

```javascript
// 병렬 처리 API
const { WorkerPool } = require('./lib/parallel');

const pool = new WorkerPool(4);
await pool.init();
const results = await pool.runAll([
  { type: 'pack', inputPath: 'a.bin', outputPath: 'a.msh' },
  { type: 'pack', inputPath: 'b.bin', outputPath: 'b.msh' },
]);
pool.destroy();
```

### Python

```python
import mshzip

# 간단 API
compressed = mshzip.pack(b'hello world' * 100)
restored = mshzip.unpack(compressed)

# 옵션 지정
compressed2 = mshzip.pack(data,
    chunk_size=256,     # 'auto' | 8~16MB
    frame_limit=64 * 1024 * 1024,
    codec='gzip',       # 'gzip' | 'none'
    crc=True
)
```

```python
# 스트리밍 API
from mshzip import PackStream, UnpackStream, pack_stream

ps = PackStream(chunk_size=256)
for frame in ps.feed(data_chunk):
    output.write(frame)
for frame in ps.flush():
    output.write(frame)
print(ps.stats)
# {'bytes_in', 'bytes_out', 'frame_count', 'dict_size', 'chunk_size'}

# 파일 I/O 편의 함수
with open('input.bin', 'rb') as inp, open('output.msh', 'wb') as out:
    stats = pack_stream(inp, out, chunk_size=256, codec='gzip')
```

```python
# 병렬 처리 API
from mshzip.parallel import WorkerPool, Task

pool = WorkerPool(num_workers=4)
results = pool.run_all([
    Task(type='pack', input_path='a.bin', output_path='a.msh'),
    Task(type='unpack', input_path='b.msh', output_path='b.bin'),
])
pool.shutdown()
```

---

## 주요 기능

| 기능 | 설명 |
|------|------|
| **고정 청크 Dedup** | SHA-256 해시 기반 중복 제거 |
| **자동 청크 감지** | 입력 데이터 분석 후 최적 청크 크기 자동 선택 (8~4096B) |
| **스트리밍** | Node.js: Transform Stream / Python: Generator 기반 |
| **병렬 처리** | Node.js: Worker Thread / Python: ProcessPoolExecutor |
| **프레임 기반** | 사전이 프레임 간 누적, 64-bit 지원 (4GB+ 파일) |
| **CRC32** | 프레임별 선택적 무결성 검증 |
| **교차 호환** | Node.js ↔ Python MSH1 파일 100% 호환 |
| **CLI** | pack / unpack / info / multi 4개 명령 (양 구현체 동일) |
| **stdin/stdout** | `-i -` / `-o -` 로 파이프라인 연결 가능 |

---

## 압축 알고리즘

### 압축 (Pack)

```
입력 데이터
  ↓
1. 청크 크기 자동 감지 (auto 모드 시, 1MB 샘플링)
   후보: [32, 64, 128, 256, 512, 1024, 2048, 4096]B
   비용 = (고유 청크 수 × 청크 크기) + (전체 청크 수 × varint 바이트)
   → 최소 비용 청크 크기 선택
  ↓
2. 고정 크기 청크로 분할 (마지막 청크는 0x00 패딩)
  ↓
3. 각 청크 SHA-256 해시 → 중복 제거
   - 새 청크 → 사전에 추가 (글로벌 인덱스 부여)
   - 기존 청크 → 기존 인덱스 참조
  ↓
4. 프레임 생성 (frameLimit마다 분할, 기본 64MB)
   - 사전 섹션: 이 프레임의 새로운 청크들
   - 시퀀스 섹션: varint 인코딩된 인덱스 배열
  ↓
5. 페이로드 gzip 압축 (level=1, 속도 우선)
  ↓
6. 프레임: 헤더(32B) + 페이로드크기(4B) + 압축 페이로드 [+ CRC32(4B)]
  ↓
출력 MSH1 파일
```

### 해제 (Unpack)

```
MSH1 파일
  ↓
1. 매직넘버 'MSH1' 검증
2. 프레임 헤더 파싱 (32B)
3. 페이로드 gzip 해제
4. 사전 섹션에서 새 청크 추출 → 글로벌 사전에 누적
5. 시퀀스 섹션 varint 디코딩 → 인덱스 배열
6. 인덱스로 사전 참조 → 원본 청크 순서대로 재조립
7. origBytes로 트림 (패딩 제거)
  ↓
원본 데이터
```

### 압축 효과 예시

```
640B 입력 (chunkSize=128B)
  → 5개 청크: [A, B, A, A, C]  (A가 3번 반복)
  → 사전: 3개 × 128B = 384B (A, B, C만 저장)
  → 시퀀스: [0, 1, 0, 0, 2] → 5 바이트 (varint)
  → gzip 압축 후 출력

100MB 반복 패턴
  → 781,250개 청크 중 고유 ~10개
  → 사전: 1,280B + 시퀀스: ~781KB → gzip → ~1.4KB
  → 99.9999% 압축!
```

---

## 성능

### 데이터 유형별 압축률

| 데이터 유형 | 압축률 | Pack 속도 | 설명 |
|-------------|--------|-----------|------|
| 반복 패턴 | ~95-100% | 200-694 MB/s | 대부분 청크가 중복 |
| 로그 파일 | ~82% | 56 MB/s | 타임스탬프 변동, 구조 반복 |
| JSON 문서 | ~85% | 57 MB/s | 키 이름, 구조 반복 |
| 텍스트 혼합 | ~40% | 100 MB/s | 부분적 중복 |
| 전체 0x00 | ~99% | 500+ MB/s | 완벽한 중복 |
| 랜덤 바이너리 | -1~-2% | 50 MB/s | 중복 없음, 오버헤드만 발생 |
| 이미 압축된 파일 (mp4, zip, jpg) | -1~-2% | - | dedup 효과 거의 없음 |

### 자동 청크 감지 결과

| 데이터 유형 | 자동 선택 크기 | 이유 |
|-------------|---------------|------|
| 10B 패턴 반복 | 128B | 작은 패턴 → 작은 청크가 dedup 극대화 |
| 256B 패턴 반복 | 256B | 패턴 크기 일치 → 1:1 매핑 최적 |
| 로그 파일 | 256B | 로그 라인 ~200B → 구조 반복 포착 |
| JSON 문서 | 512B | JSON 객체 단위 반복 |
| 랜덤 바이너리 | 2048B | dedup 불가 → 큰 청크로 시퀀스 오버헤드 최소화 |

---

## MSH1 포맷

상세 명세: [spec/FORMAT.md](spec/FORMAT.md)

### 프레임 구조

```
┌──────────────────────────────────────────────────────────────────┐
│ Frame Header (32B)  │ PayloadSize (4B)  │ Payload  │ CRC32 (4B) │
└──────────────────────────────────────────────────────────────────┘
```

### 프레임 헤더 (32 바이트, Little-Endian)

| 오프셋 | 크기 | 타입 | 필드 | 설명 |
|--------|------|------|------|------|
| 0 | 4 | bytes | magic | `MSH1` (0x4D534831) |
| 4 | 2 | uint16 | version | 포맷 버전 (현재: 1) |
| 6 | 2 | uint16 | flags | 비트 플래그 (0x0001 = CRC32) |
| 8 | 4 | uint32 | chunkSize | 청크 크기 (8B ~ 16MB) |
| 12 | 1 | uint8 | codecId | 0 = none, 1 = gzip |
| 13 | 3 | - | padding | 예약 (0x000000) |
| 16 | 4 | uint32 | origBytesLo | 원본 크기 하위 32비트 |
| 20 | 4 | uint32 | origBytesHi | 원본 크기 상위 32비트 |
| 24 | 4 | uint32 | dictEntries | 프레임 내 새 사전 항목 수 |
| 28 | 4 | uint32 | seqCount | 시퀀스 인덱스 수 |

### 페이로드 (압축 해제 후)

```
[사전 섹션: dictEntries × chunkSize 바이트] [시퀀스 섹션: seqCount개 uvarint 값]
```

### 멀티 프레임

```
┌──────────┬──────────┬─────┬──────────┐
│ Frame #0 │ Frame #1 │ ... │ Frame #N │
└──────────┴──────────┴─────┴──────────┘

- 각 프레임은 frameLimit(기본 64MB) 단위로 분할
- 사전은 프레임 간 누적 (글로벌 사전)
- origBytesLo + origBytesHi로 64-bit 원본 크기 지원 (4GB+)
```

---

## 프로젝트 구조

```
mshzip/
├── spec/                           # MSH1 포맷 사양 + 교차 테스트 벡터
│   ├── FORMAT.md                   # 바이너리 포맷 명세서
│   ├── generate-vectors.js         # Node.js로 테스트 벡터 생성
│   └── test-vectors/               # .bin + .msh 쌍 (12개)
│
├── nodejs/                         # Node.js 구현체
│   ├── cli.js                      # CLI 진입점 (pack/unpack/info/multi)
│   ├── lib/                        # 핵심 모듈 (7개)
│   │   ├── index.js                # 모듈 export
│   │   ├── constants.js            # MSH1 상수/기본값 정의
│   │   ├── packer.js               # 압축 엔진 (SHA-256 dedup + 프레임 생성)
│   │   ├── unpacker.js             # 해제 엔진 (프레임 파싱 + 사전 누적)
│   │   ├── stream.js               # Transform Stream (PackStream/UnpackStream)
│   │   ├── varint.js               # uvarint(LEB128) 인코딩/디코딩
│   │   └── parallel.js             # Worker Thread 풀 (멀티 파일)
│   ├── test/                       # 벤치마크 (221 PASS)
│   │   ├── benchmark.js            # 종합 테스트 (코덱/청크/스트림/병렬)
│   │   ├── benchmark-4k-movie.js   # 4K 영상 벤치마크
│   │   └── benchmark-large-movie.js# 대용량 스트리밍 벤치마크
│   └── package.json
│
├── python/                         # Python 구현체
│   ├── src/mshzip/                 # 핵심 모듈 (8개)
│   │   ├── __init__.py             # 공개 API export
│   │   ├── constants.py            # MSH1 상수/기본값 정의
│   │   ├── packer.py               # 압축 엔진
│   │   ├── unpacker.py             # 해제 엔진
│   │   ├── stream.py               # Generator 기반 스트리밍
│   │   ├── varint.py               # uvarint(LEB128) 인코딩/디코딩
│   │   ├── parallel.py             # ProcessPoolExecutor (멀티 파일)
│   │   └── cli.py                  # CLI 진입점
│   ├── tests/                      # pytest (253 PASS)
│   │   ├── conftest.py             # 9개 데이터 생성기 + 테스트 상수
│   │   ├── test_varint.py          # varint 인코딩/디코딩 (30개)
│   │   ├── test_packer.py          # 압축 (16개)
│   │   ├── test_unpacker.py        # 해제 (14개)
│   │   ├── test_roundtrip.py       # pack→unpack 왕복 검증 (131개)
│   │   ├── test_compat.py          # Node.js 교차 호환 (32개)
│   │   ├── test_stream.py          # 스트리밍 API (16개)
│   │   ├── test_cli.py             # CLI 서브프로세스 (7개)
│   │   └── test_parallel.py        # 워커 풀 (7개)
│   └── pyproject.toml              # uv/PyPI 설정 (hatchling 빌드)
│
├── .github/workflows/ci.yml        # CI: test(3 Python버전) + lint + docker
└── MSHZIP Logic.md                 # 압축 알고리즘 상세 설계 문서
```

---

## 모듈 역할

| 모듈 | Node.js | Python | 역할 |
|------|---------|--------|------|
| **constants** | `lib/constants.js` | `src/mshzip/constants.py` | MSH1 매직넘버, 헤더 크기, 기본값, 코덱 ID |
| **varint** | `lib/varint.js` | `src/mshzip/varint.py` | LEB128 가변 정수 인코딩/디코딩 |
| **packer** | `lib/packer.js` | `src/mshzip/packer.py` | 압축 엔진: SHA-256 사전, 청크 분할, 프레임 조립 |
| **unpacker** | `lib/unpacker.js` | `src/mshzip/unpacker.py` | 해제 엔진: 프레임 파싱, 사전 누적, 인덱스→청크 복원 |
| **stream** | `lib/stream.js` | `src/mshzip/stream.py` | 스트리밍: Transform Stream / Generator |
| **parallel** | `lib/parallel.js` | `src/mshzip/parallel.py` | 병렬: Worker Thread / ProcessPoolExecutor |
| **cli** | `cli.js` | `src/mshzip/cli.py` | CLI: pack / unpack / info / multi 4개 명령 |

---

## 교차 호환성 검증

`spec/test-vectors/` 디렉토리에 Node.js로 생성한 12개 테스트 벡터가 포함되어 있습니다.

```bash
# 테스트 벡터 생성 (Node.js)
cd spec && node generate-vectors.js

# Python에서 교차 호환 테스트
cd python && uv run pytest tests/test_compat.py -v
```

### 테스트 벡터 목록

| 벡터 | 원본 크기 | MSH 크기 | 목적 |
|------|-----------|----------|------|
| empty | 0B | 36B | 빈 입력 엣지 케이스 |
| single-byte | 1B | 60B | 최소 입력 |
| boundary-127 | 127B | 62B | 청크 경계 -1 |
| boundary-128 | 128B | 61B | 정확히 청크 크기 |
| boundary-129 | 129B | 64B | 청크 경계 +1 |
| small-repeat | 1KB | 323B | 반복 패턴 dedup |
| multi-frame | 512B | 499B | 멀티 프레임 (chunk=32, frame=128) |
| crc32 | 300B | 85B | CRC32 체크섬 활성화 |
| codec-none | 420B | 552B | 비압축 코덱 |
| large-chunk | 8KB | 91B | 큰 청크 크기 (4096B) |
| text-data | 1.3KB | 96B | 텍스트 데이터 |
| binary-random | 2KB | 2.1KB | 랜덤 바이너리 (오버헤드 확인) |

검증 항목:
- Node.js .msh → Python unpack (12개 벡터)
- Python .msh → Node.js unpack (12개 벡터)
- 다양한 chunk_size / codec / crc 조합 양방향 (8개)

---

## 기본 설정값

| 상수 | 값 | 설명 |
|------|------|------|
| `DEFAULT_CHUNK_SIZE` | `auto` | 자동 감지 (폴백: 128B) |
| `DEFAULT_FRAME_LIMIT` | 64MB | 프레임당 입력 바이트 상한 |
| `DEFAULT_CODEC` | `gzip` | gzip level=1 (속도 우선) |
| `MIN_CHUNK_SIZE` | 8B | 최소 청크 크기 |
| `MAX_CHUNK_SIZE` | 16MB | 최대 청크 크기 |
| `AUTO_DETECT_SAMPLE_LIMIT` | 1MB | 자동 감지용 샘플 크기 |
| `AUTO_DETECT_STREAM_MIN` | 64KB | 스트리밍 시 감지 최소 버퍼 |

---

## 배포

### npm (Node.js)

```bash
cd nodejs
npm pack
# → mshzip-1.0.0.tgz
```

### PyPI (Python)

```bash
cd python
uv build
# → dist/mshzip-1.0.0.tar.gz + mshzip-1.0.0-py3-none-any.whl
```

---

## CI/CD

GitHub Actions 파이프라인 (`.github/workflows/ci.yml`):

```
push/PR → [병렬] Test (Python 3.12/3.13/3.14) + Lint (ruff)
                            ↓ 모두 통과
                    [main만] Docker 빌드
```

---

## 제한 사항

1. **사전 메모리**: 고유 청크가 많은 랜덤 데이터에서는 메모리 사용량이 원본에 근접
2. **이미 압축된 데이터**: mp4, zip, jpg 등은 dedup 효과 거의 없음 (-1~-2%)
3. **코덱**: gzip(level=1)과 none만 지원
4. **파일 간 사전 비공유**: 병렬 처리 시 각 파일은 독립 사전 사용
5. **V8 Map 제한**: Node.js에서 ~1,677만 청크 초과 시 청크 크기 자동 증가 필요 (5GB+ 파일)
6. **자동 감지 오버헤드**: ~16ms (1MB 샘플 × 8 후보) — 대부분 무시 가능

---

## 라이선스

MIT
