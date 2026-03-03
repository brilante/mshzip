'use strict';

const { Packer } = require('./packer');
const { Unpacker } = require('./unpacker');
const { PackStream, UnpackStream, packStream, unpackStream } = require('./stream');
const { DictStore } = require('./dict-store');
const { BitDict } = require('./bit-dict');
const { CoordDictPacker, CoordDictUnpacker } = require('./coord-dict');
const hamming = require('./hamming');
const reedSolomon = require('./reed-solomon');
const bitReader = require('./bit-reader');
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
 * @param {Object} [opts] - { dictStore, dictDir }
 * @returns {Buffer}
 */
function unpack(input, opts = {}) {
  const unpacker = new Unpacker(opts);
  return unpacker.unpack(input);
}

module.exports = {
  Packer,
  Unpacker,
  DictStore,
  BitDict,
  CoordDictPacker,
  CoordDictUnpacker,
  hamming,
  reedSolomon,
  bitReader,
  pack,
  unpack,
  PackStream,
  UnpackStream,
  packStream,
  unpackStream,
  constants,
  varint,
};
