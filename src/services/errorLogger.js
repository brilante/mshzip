/**
 * 에러 로거 서비스 (경량 버전)
 * 원본(mymind3) errorLogger와 인터페이스 호환
 * Winston + DB 대신 console 기반 출력
 *
 * @version 1.0.0
 */

'use strict';

const LEVELS = {
  CRITICAL: { label: 'CRITICAL', color: '\x1b[41m\x1b[37m' },
  ERROR: { label: 'ERROR', color: '\x1b[31m' },
  WARNING: { label: 'WARNING', color: '\x1b[33m' },
  INFO: { label: 'INFO', color: '\x1b[36m' },
  DEBUG: { label: 'DEBUG', color: '\x1b[90m' }
};

const RESET = '\x1b[0m';
let errorIdCounter = 0;

function generateErrorId() {
  return `ERR-${Date.now()}-${++errorIdCounter}`;
}

function formatLog(level, message, error, context) {
  const timestamp = new Date().toISOString();
  const levelInfo = LEVELS[level] || LEVELS.INFO;
  const errorId = generateErrorId();

  const parts = [
    `${levelInfo.color}[${levelInfo.label}]${RESET}`,
    `${timestamp}`,
    `[${errorId}]`,
    message
  ];

  if (context?.source) {
    parts.push(`(${context.source})`);
  }

  const logLine = parts.join(' ');

  if (level === 'CRITICAL' || level === 'ERROR') {
    console.error(logLine);
    if (error?.stack) console.error(error.stack);
  } else if (level === 'WARNING') {
    console.warn(logLine);
    if (error?.message) console.warn(`  → ${error.message}`);
  } else {
    console.log(logLine);
  }

  return errorId;
}

module.exports = {
  start() {},
  stop() {},

  critical(message, error, context = {}) {
    return formatLog('CRITICAL', message, error, context);
  },

  error(message, error, context = {}) {
    return formatLog('ERROR', message, error, context);
  },

  warning(message, error, context = {}) {
    return formatLog('WARNING', message, error, context);
  },

  info(message, context = {}) {
    return formatLog('INFO', message, null, context);
  },

  debug(message, context = {}) {
    return formatLog('DEBUG', message, null, context);
  },

  getConfig() {
    return { levels: Object.keys(LEVELS), output: ['console'] };
  },

  isLevelEnabled() {
    return true;
  },

  async getStats() {
    return { total: 0, by_source: {}, by_day: {} };
  },

  async search() {
    return [];
  }
};
