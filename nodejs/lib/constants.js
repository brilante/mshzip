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
};

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
  FRAME_HEADER_SIZE,
  DEFAULT_CHUNK_SIZE,
  DEFAULT_FRAME_LIMIT,
  DEFAULT_CODEC,
  MIN_CHUNK_SIZE,
  MAX_CHUNK_SIZE,
  AUTO_DETECT_CANDIDATES,
  AUTO_DETECT_SAMPLE_LIMIT,
  AUTO_DETECT_STREAM_MIN,
  AUTO_FALLBACK_CHUNK_SIZE,
};
