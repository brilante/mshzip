'use strict';

/**
 * 사용자 설정 API
 * DB 기반 구현 (참고소스 동등). Access Key 인증 지원 (Hook용).
 *
 * @routes
 * - GET  /api/user/settings  : 사용자 설정 조회
 * - POST /api/user/settings  : 사용자 설정 저장
 */

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const logger = require('../../utils/logger');

let UserSettings = null;
let dbAvailable = false;

// DB 모듈 지연 로드 (서버 시작 후 연결 가능)
function getModel() {
  if (!UserSettings) {
    try {
      UserSettings = require('../../db/models/UserSettings');
      dbAvailable = true;
    } catch {
      dbAvailable = false;
    }
  }
  return dbAvailable ? UserSettings : null;
}

// 기본 설정값
const defaultSettings = {
  theme: 'light',
  language: 'ko',
  autoSaveInterval: '30',
  defaultNodeExpanded: 'true',
  confirmDelete: 'true',
  editorFontSize: '14',
  defaultService: 'gpt',
  multiAiEnabled: 'false',
  paymentCurrency: 'USD',
  aiServices: JSON.stringify({
    gpt: { enabled: true, model: 'gpt-4o-mini', paymentMethod: 'apikey' },
    claude: { enabled: false, model: 'claude-sonnet-4-20250514', paymentMethod: 'apikey' }
  })
};

/**
 * 요청에서 사용자 ID 추출
 * 1. 세션 인증 (웹 UI)
 * 2. Access Key Hash 인증 (Hook)
 */
function getUserId(req) {
  // 1. 세션 인증
  if (req.session?.passport?.user?.username) return req.session.passport.user.username;
  if (req.session?.userId) return req.session.userId;

  // 2. Access Key Hash 인증 (Hook용)
  const hash = req.headers['x-access-key-hash'];
  if (hash) {
    return resolveUserIdFromKeyHash(hash);
  }

  return null;
}

/**
 * Access Key Hash → user_id 매핑
 * access-keys-data.json에서 활성 키의 key_hash로 user_id 조회
 */
function resolveUserIdFromKeyHash(hash) {
  try {
    const dataPath = path.join(process.cwd(), 'config', 'access-keys-data.json');
    if (!fs.existsSync(dataPath)) return null;

    const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    const key = data.keys.find(k => k.key_hash === hash && k.is_active === 1);
    return key?.user_id || null;
  } catch {
    return null;
  }
}

/**
 * GET /api/user/settings - 사용자 설정 조회
 */
router.get('/settings', async (req, res) => {
  try {
    const userId = getUserId(req);
    const model = getModel();

    if (model && userId) {
      const userSettings = await model.getAll(userId);
      res.json({
        success: true,
        data: { ...defaultSettings, ...userSettings },
        source: Object.keys(userSettings).length > 0 ? 'user' : 'default'
      });
    } else {
      // DB 미연결 또는 미인증 → 기본값 반환
      res.json({
        success: true,
        data: { ...defaultSettings },
        source: 'default'
      });
    }
  } catch (err) {
    logger.error('사용자 설정 조회 실패:', err.message);
    res.json({
      success: true,
      data: { ...defaultSettings },
      source: 'default'
    });
  }
});

/**
 * POST /api/user/settings - 사용자 설정 저장
 */
router.post('/settings', async (req, res) => {
  try {
    const userId = getUserId(req);
    const model = getModel();

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '인증이 필요합니다.'
      });
    }

    if (model) {
      const saved = await model.setMany(userId, req.body);
      logger.info('사용자 설정 저장', { userId, saved, keys: Object.keys(req.body) });
      res.json({
        success: true,
        message: '설정이 저장되었습니다.',
        saved,
        keys: Object.keys(req.body)
      });
    } else {
      // DB 미연결 → 에러
      res.status(503).json({
        success: false,
        message: 'DB 연결 불가'
      });
    }
  } catch (err) {
    logger.error('사용자 설정 저장 실패:', err.message);
    res.status(500).json({
      success: false,
      message: '설정 저장에 실패했습니다.'
    });
  }
});

module.exports = router;
