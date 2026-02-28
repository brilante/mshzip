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
  agentSkillsEnabled: 'false',
  autoCreateEnabled: 'false',
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
 * 1차: lok_ 토큰 → 복호화하여 username 추출
 * 2차: SHA256 해시 → access-keys-data.json에서 user_id 조회
 */
function resolveUserIdFromKeyHash(hash) {
  try {
    // 1차: lok_ 토큰 → 복호화하여 username 추출
    if (hash && hash.startsWith('lok_')) {
      try {
        const { validateLoginOkToken } = require('../../utils/loginOkKey');
        const result = validateLoginOkToken(hash, hash);
        if (result.valid && result.payload?.username) {
          return result.payload.username;
        }
      } catch {}
      return null;
    }

    // 2차: SHA256 해시 → access-keys-data.json lookup
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

// ══════════════════════════════════════════════════════
// .env 파일 동기화 유틸리티
// agentSkillsEnabled 변경 시 AGENT_SKILLS_TODO 키를 .env에 기록
// ══════════════════════════════════════════════════════

const ENV_PATH = path.resolve(__dirname, '../../../.env');

/**
 * .env 파일의 특정 키 값을 업데이트
 * 키가 없으면 파일 끝에 추가, 있으면 해당 줄 교체
 * process.env도 즉시 업데이트하여 서버 재시작 없이 반영
 */
function updateEnvFile(key, value) {
  try {
    let content = fs.existsSync(ENV_PATH)
      ? fs.readFileSync(ENV_PATH, 'utf8')
      : '';
    const regex = new RegExp('^' + key + '=.*$', 'm');
    if (regex.test(content)) {
      content = content.replace(regex, key + '=' + value);
    } else {
      content = content.trimEnd() + '\n' + key + '=' + value + '\n';
    }
    fs.writeFileSync(ENV_PATH, content, 'utf8');
    process.env[key] = value;
    logger.info('[user-settings] .env 동기화', { key, value });
    return true;
  } catch (err) {
    logger.warn('[user-settings] .env 동기화 실패:', err.message);
    return false;
  }
}

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

      // ── agentSkillsEnabled 변경 시 .env 동기화 ──────────────────
      // DB값: 메뉴 표시 여부 / .env값: Hook 실행 여부 (별도 관리)
      let envSynced = false;
      if (req.body.agentSkillsEnabled !== undefined) {
        const todoEnabled = String(req.body.agentSkillsEnabled) === 'true';
        envSynced = updateEnvFile('AGENT_SKILLS_TODO', String(todoEnabled));
      }

      res.json({
        success: true,
        message: '설정이 저장되었습니다.',
        saved,
        keys: Object.keys(req.body),
        ...(envSynced ? { envSynced: true } : {})
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
