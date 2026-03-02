'MSH compression format constants'
from __future__ import annotations

# Magic number (4 bytes)
MAGIC: bytes = b'MSH1'

# Version
VERSION: int = 1


# Codec ID
class Codec:
    NONE: int = 0
    GZIP: int = 1


# Codec name <-> ID mapping
CODEC_NAME: dict[str, int] = {
    'none': Codec.NONE,
    'gzip': Codec.GZIP,
}

CODEC_ID_TO_NAME: dict[int, str] = {
    Codec.NONE: 'none',
    Codec.GZIP: 'gzip',
}


# Flag bits
class Flag:
    CRC32: int = 0x0001
    HIERDEDUP: int = 0x0002  # 계층적 Dedup 적용됨
    MULTILEVEL: int = 0x0004  # N단계 계층적 Dedup (3단계 이상)
    EXTERNAL_DICT: int = 0x0008  # 외부 영구 딕셔너리 참조

# 알려진 모든 플래그 비트 마스크 (하위 호환성 검증용)
KNOWN_FLAGS: int = Flag.CRC32 | Flag.HIERDEDUP | Flag.MULTILEVEL | Flag.EXTERNAL_DICT


# Frame header size (fixed 32 bytes)
# magic(4) + version(2) + flags(2) + chunkSize(4) + codec(1) + pad(3)
# + origBytes(4+4) + dictEntries(4) + seqCount(4) = 32
FRAME_HEADER_SIZE: int = 32

# Defaults
DEFAULT_CHUNK_SIZE: int | str = 'auto'  # auto-detect (previous default: 128)
DEFAULT_FRAME_LIMIT: int = 64 * 1024 * 1024  # 64MB
DEFAULT_CODEC: str = 'gzip'

# Chunk size range
MIN_CHUNK_SIZE: int = 8
MAX_CHUNK_SIZE: int = 16 * 1024 * 1024  # 16MB

# Hierarchical dedup defaults
DEFAULT_SUB_CHUNK_SIZE: int = 32  # 2차 청크 크기 (바이트)

# 최대 계층적 Dedup 단계 수
MAX_HIER_LEVELS: int = 4

# ── MSHD (영구 딕셔너리 파일) 상수 ──
MSHD_MAGIC: bytes = b'MSHD'
MSHD_VERSION: int = 1
# MSHD 헤더: magic(4) + version(2) + chunkSize(4) + entryCount(4) = 14 bytes
MSHD_HEADER_SIZE: int = 14
# 딕셔너리 엔트리: sha256(32) + chunk(chunkSize)
MSHD_HASH_SIZE: int = 32  # SHA-256

# Auto chunk size detection
AUTO_DETECT_CANDIDATES: list[int] = [32, 64, 128, 256, 512, 1024, 2048, 4096]
AUTO_DETECT_SAMPLE_LIMIT: int = 1024 * 1024  # 1MB
AUTO_DETECT_STREAM_MIN: int = 64 * 1024  # 64KB (streaming minimum sample)
AUTO_FALLBACK_CHUNK_SIZE: int = 128  # Fallback when auto-detect fails
