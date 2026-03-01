'use strict';

const { Transform } = require('stream');
const { pipeline } = require('stream/promises');
const { Packer } = require('./packer');
const { Unpacker } = require('./unpacker');
const {
  MAGIC, FLAG, FRAME_HEADER_SIZE,
  DEFAULT_CHUNK_SIZE, DEFAULT_FRAME_LIMIT, DEFAULT_CODEC,
  AUTO_DETECT_STREAM_MIN,
} = require('./constants');

/**
 * Streaming compression Transform
 *
 * Buffers input data up to frameLimit size, then
 * outputs MSH compressed data frame by frame.
 *
 * Usage:
 *   input.pipe(new PackStream(opts)).pipe(output)
 */
class PackStream extends Transform {
  /**
   * @param {Object} [opts]
   * @param {number} [opts.chunkSize=128]
   * @param {number} [opts.frameLimit=67108864]
   * @param {string} [opts.codec='gzip']
   * @param {boolean} [opts.crc=false]
   */
  constructor(opts = {}) {
    super();
    const rawChunk = opts.chunkSize !== undefined ? opts.chunkSize : DEFAULT_CHUNK_SIZE;
    this._autoMode = (rawChunk === 'auto');
    this._detected = !this._autoMode;

    this._packer = new Packer({
      chunkSize: rawChunk,
      frameLimit: opts.frameLimit || DEFAULT_FRAME_LIMIT,
      codec: opts.codec || DEFAULT_CODEC,
      crc: !!opts.crc,
    });
    this._frameLimit = this._packer.frameLimit;
    this._pending = Buffer.alloc(0);
    this._totalBytesIn = 0;
    this._totalBytesOut = 0;
    this._frameCount = 0;
  }

  /**
   * auto mode: detect optimal chunk size when enough data is buffered
   */
  _tryAutoDetect() {
    if (this._detected) return;
    if (this._pending.length >= AUTO_DETECT_STREAM_MIN) {
      this._packer.chunkSize = this._packer._detectChunkSize(this._pending);
      this._packer._autoDetect = false;
      this._detected = true;
    }
  }

  _transform(chunk, encoding, callback) {
    try {
      this._pending = Buffer.concat([this._pending, chunk]);
      this._totalBytesIn += chunk.length;

      // auto mode: attempt detection
      this._tryAutoDetect();

      // Only emit frames when detection is complete (or in fixed mode)
      if (this._detected) {
        while (this._pending.length >= this._frameLimit) {
          const slice = this._pending.slice(0, this._frameLimit);
          const frame = this._packer._buildFrame(slice, 0, slice.length);
          this._totalBytesOut += frame.length;
          this._frameCount++;
          this.push(frame);
          this._pending = this._pending.slice(this._frameLimit);
        }
      }

      callback();
    } catch (err) {
      callback(err);
    }
  }

  _flush(callback) {
    try {
      // Force detection at flush if not yet detected
      if (!this._detected && this._pending.length > 0) {
        this._packer.chunkSize = this._packer._detectChunkSize(this._pending);
        this._packer._autoDetect = false;
        this._detected = true;
      }

      if (this._pending.length > 0) {
        const frame = this._packer._buildFrame(this._pending, 0, this._pending.length);
        this._totalBytesOut += frame.length;
        this._frameCount++;
        this.push(frame);
      } else if (this._frameCount === 0) {
        // Empty input -> one empty frame
        const frame = this._packer._buildFrame(Buffer.alloc(0), 0, 0);
        this._totalBytesOut += frame.length;
        this._frameCount++;
        this.push(frame);
      }
      this._pending = Buffer.alloc(0);
      callback();
    } catch (err) {
      callback(err);
    }
  }

  /** Return stats object */
  get stats() {
    return {
      bytesIn: this._totalBytesIn,
      bytesOut: this._totalBytesOut,
      frameCount: this._frameCount,
      dictSize: this._packer.dictChunks.length,
      chunkSize: this._packer.chunkSize,
    };
  }
}

/**
 * Streaming decompression Transform
 *
 * Parses MSH stream frame by frame and outputs original data.
 * Handles incomplete frames (frame boundary spanning chunks) via internal buffer.
 *
 * Usage:
 *   input.pipe(new UnpackStream()).pipe(output)
 */
class UnpackStream extends Transform {
  constructor() {
    super();
    this._unpacker = new Unpacker();
    this._buf = Buffer.alloc(0);
    this._totalBytesIn = 0;
    this._totalBytesOut = 0;
    this._frameCount = 0;
  }

  _transform(chunk, encoding, callback) {
    try {
      this._buf = Buffer.concat([this._buf, chunk]);
      this._totalBytesIn += chunk.length;

      while (true) {
        // Minimum header + payloadSize field (36B) required
        if (this._buf.length < FRAME_HEADER_SIZE + 4) break;

        // Verify magic number
        const magic = this._buf.slice(0, 4);
        if (!magic.equals(MAGIC)) {
          callback(new Error(`Invalid magic number: ${magic.toString('hex')}`));
          return;
        }

        // Check CRC flag from flags
        const flags = this._buf.readUInt16LE(6);
        const hasCRC = (flags & FLAG.CRC32) !== 0;

        // Read payloadSize
        const payloadSize = this._buf.readUInt32LE(FRAME_HEADER_SIZE);

        // Calculate total frame size
        const totalFrameSize = FRAME_HEADER_SIZE + 4 + payloadSize + (hasCRC ? 4 : 0);

        // Check if enough frame data is available
        if (this._buf.length < totalFrameSize) break;

        // Extract complete frame and restore
        const frameBuf = this._buf.slice(0, totalFrameSize);
        this._buf = this._buf.slice(totalFrameSize);

        const { data } = this._unpacker._readFrame(frameBuf, 0);
        this._totalBytesOut += data.length;
        this._frameCount++;
        this.push(data);
      }

      callback();
    } catch (err) {
      callback(err);
    }
  }

  _flush(callback) {
    if (this._buf.length > 0) {
      callback(new Error(`Remaining data at stream end: ${this._buf.length} bytes`));
    } else {
      callback();
    }
  }

  /** Return stats object */
  get stats() {
    return {
      bytesIn: this._totalBytesIn,
      bytesOut: this._totalBytesOut,
      frameCount: this._frameCount,
      dictSize: this._unpacker.dict.length,
    };
  }
}

/**
 * Stream-based compression convenience function
 * @param {Readable} input - Input stream
 * @param {Writable} output - Output stream
 * @param {Object} [opts] - PackStream options
 * @returns {Promise<Object>} stats
 */
async function packStream(input, output, opts = {}) {
  const ps = new PackStream(opts);
  await pipeline(input, ps, output);
  return ps.stats;
}

/**
 * Stream-based decompression convenience function
 * @param {Readable} input - Input stream (MSH data)
 * @param {Writable} output - Output stream
 * @returns {Promise<Object>} stats
 */
async function unpackStream(input, output) {
  const us = new UnpackStream();
  await pipeline(input, us, output);
  return us.stats;
}

module.exports = {
  PackStream,
  UnpackStream,
  packStream,
  unpackStream,
};
