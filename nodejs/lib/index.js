'use strict';

const { Packer } = require('./packer');
const { Unpacker } = require('./unpacker');
const { PackStream, UnpackStream, packStream, unpackStream } = require('./stream');
const constants = require('./constants');
const varint = require('./varint');

/**
 * Simple API
 */

/**
 * Compress data
 * @param {Buffer} input
 * @param {Object} [opts] - { chunkSize, frameLimit, codec, crc }
 * @returns {Buffer}
 */
function pack(input, opts = {}) {
  const packer = new Packer(opts);
  return packer.pack(input);
}

/**
 * Decompress data
 * @param {Buffer} input
 * @returns {Buffer}
 */
function unpack(input) {
  const unpacker = new Unpacker();
  return unpacker.unpack(input);
}

module.exports = {
  Packer,
  Unpacker,
  pack,
  unpack,
  PackStream,
  UnpackStream,
  packStream,
  unpackStream,
  constants,
  varint,
};
