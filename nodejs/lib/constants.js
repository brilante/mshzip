'use strict';

/**
 * MSH compression format constants
 * - Frame-based streamable container
 * - Fixed-chunk dedup + entropy compression
 */

// Magic number
const MAGIC = Buffer.from('MSH1');

// Version
const VERSION = 1;

// Codec ID
const CODEC = {
  NONE: 0,
  GZIP: 1,
};

// Codec name <-> ID mapping
const CODEC_NAME = {
  none: CODEC.NONE,
  gzip: CODEC.GZIP,
};

const CODEC_ID_TO_NAME = {
  [CODEC.NONE]: 'none',
  [CODEC.GZIP]: 'gzip',
};

// Flag bits
const FLAG = {
  CRC32: 0x0001,
  HIERDEDUP: 0x0002, // 계층적 Dedup 적용됨
  MULTILEVEL: 0x0004, // N단계 계층적 Dedup (3단계 이상)
  EXTERNAL_DICT: 0x0008, // 외부 영구 딕셔너리 참조
  BITDICT: 0x0010, // N비트 전수 사전 모드
  COORDDICT: 0x0020, // XD 좌표 사전 모드
};

// 알려진 모든 플래그 비트 마스크 (하위 호환성 검증용)
const KNOWN_FLAGS = FLAG.CRC32 | FLAG.HIERDEDUP | FLAG.MULTILEVEL | FLAG.EXTERNAL_DICT | FLAG.BITDICT | FLAG.COORDDICT;

// 최대 계층적 Dedup 단계 수
const MAX_HIER_LEVELS = 4;

// Frame header size (fixed)
// magic(4) + version(2) + flags(2) + chunkSize(4) + codec(1) + pad(3) +
// origBytes(4+4) + dictEntries(4) + seqCount(4) = 32 bytes
const FRAME_HEADER_SIZE = 32;

// Defaults
const DEFAULT_CHUNK_SIZE = 'auto'; // auto-detect (previous default: 128)
const DEFAULT_FRAME_LIMIT = 64 * 1024 * 1024; // 64MB per frame (input bytes)
const DEFAULT_CODEC = 'gzip';

// Chunk size range
const MIN_CHUNK_SIZE = 8;
const MAX_CHUNK_SIZE = 16 * 1024 * 1024; // 16MB

// Hierarchical dedup defaults
const DEFAULT_SUB_CHUNK_SIZE = 32; // 2차 청크 크기 (바이트)

// ── MSHD (영구 딕셔너리 파일) 상수 ──
const MSHD_MAGIC = Buffer.from('MSHD');
const MSHD_VERSION = 1;
// MSHD 헤더: magic(4) + version(2) + chunkSize(4) + entryCount(4) = 14 bytes
const MSHD_HEADER_SIZE = 14;
// 딕셔너리 엔트리: sha256(32) + chunk(chunkSize)
const MSHD_HASH_SIZE = 32; // SHA-256

// BitDict (N비트 전수 사전) 상수
const DEFAULT_BIT_DEPTH = 18;
const MIN_BIT_DEPTH = 8;
const MAX_BIT_DEPTH = 32;
const PRACTICAL_MAX_BIT_DEPTH = 24;
const BITDICT_EXTRA_HEADER_SIZE = 2; // bitDepth uint16 LE

// CoordDict (XD 좌표 사전) 상수
const COORDDICT_EXTRA_HEADER_SIZE = 8;
const COORDDICT_BITS_PER_AXIS = 1024;
const COORDDICT_HAMMING_BITS = 11;
const COORDDICT_RS_GROUP_SIZE = 8;

// Auto chunk size detection
const AUTO_DETECT_CANDIDATES = [32, 64, 128, 256, 512, 1024, 2048, 4096];
const AUTO_DETECT_SAMPLE_LIMIT = 1024 * 1024; // 1MB
const AUTO_DETECT_STREAM_MIN = 64 * 1024; // 64KB (streaming minimum sample)
const AUTO_FALLBACK_CHUNK_SIZE = 128; // fallback when auto-detect fails

module.exports = {
  MAGIC,
  VERSION,
  CODEC,
  CODEC_NAME,
  CODEC_ID_TO_NAME,
  FLAG,
  KNOWN_FLAGS,
  FRAME_HEADER_SIZE,
  DEFAULT_CHUNK_SIZE,
  DEFAULT_FRAME_LIMIT,
  DEFAULT_CODEC,
  DEFAULT_SUB_CHUNK_SIZE,
  MIN_CHUNK_SIZE,
  MAX_CHUNK_SIZE,
  MAX_HIER_LEVELS,
  DEFAULT_BIT_DEPTH,
  MIN_BIT_DEPTH,
  MAX_BIT_DEPTH,
  PRACTICAL_MAX_BIT_DEPTH,
  BITDICT_EXTRA_HEADER_SIZE,
  AUTO_DETECT_CANDIDATES,
  AUTO_DETECT_SAMPLE_LIMIT,
  AUTO_DETECT_STREAM_MIN,
  AUTO_FALLBACK_CHUNK_SIZE,
  MSHD_MAGIC,
  MSHD_VERSION,
  MSHD_HEADER_SIZE,
  MSHD_HASH_SIZE,
  COORDDICT_EXTRA_HEADER_SIZE,
  COORDDICT_BITS_PER_AXIS,
  COORDDICT_HAMMING_BITS,
  COORDDICT_RS_GROUP_SIZE,
};
