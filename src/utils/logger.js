'use strict';

/**
 * Phase4→CC: 관측성 확보를 위한 로거
 * 간단한 console 기반 로거 (운영 시 Winston으로 교체 가능)
 */
const logger = {
  debug: (msg, meta = {}) => {
    if (process.env.LOG_DEBUG_ENABLED === 'true') {
      console.log(`[DEBUG] ${new Date().toISOString()} ${msg}`, Object.keys(meta).length ? meta : '');
    }
  },
  info: (msg, meta = {}) => {
    console.log(`[INFO] ${new Date().toISOString()} ${msg}`, Object.keys(meta).length ? meta : '');
  },
  warn: (msg, meta = {}) => {
    console.warn(`[WARN] ${new Date().toISOString()} ${msg}`, Object.keys(meta).length ? meta : '');
  },
  error: (msg, meta = {}) => {
    console.error(`[ERROR] ${new Date().toISOString()} ${msg}`, Object.keys(meta).length ? meta : '');
  }
};

module.exports = logger;
