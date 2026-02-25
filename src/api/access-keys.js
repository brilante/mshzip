'use strict';

/**
 * Access Keys API
 * Claude Code Agent Skills용 API 키 관리
 *
 * @routes
 * - GET    /api/access-keys        : 내 키 목록 조회
 * - POST   /api/access-keys        : 새 키 발급
 * - DELETE /api/access-keys/:id    : 키 삭제
 * - GET    /api/access-keys/my-ip  : 현재 접속 IP 조회
 * - GET    /api/access-keys/key-path    : 키 파일 경로 조회
 * - POST   /api/access-keys/key-path    : 키 파일 경로 설정
 * - GET    /api/access-keys/server-url  : 서버 주소 조회
 * - POST   /api/access-keys/server-url  : 서버 주소 설정
 * - POST   /api/access-keys/save-to-file    : 키 파일 저장
 * - POST   /api/access-keys/test-connection : 연결 테스트
 *
 * @created 2026-02-25
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { generateAccessKey, hashAccessKey } = require('../utils/accessKey');
const logger = require('../utils/logger');

// ── JSON 파일 기반 저장소 ──

const DATA_PATH = path.join(process.cwd(), 'config', 'access-keys-data.json');

/**
 * Access Keys 데이터 로드
 */
function loadKeysData() {
  try {
    if (fs.existsSync(DATA_PATH)) {
      const content = fs.readFileSync(DATA_PATH, 'utf-8');
      return JSON.parse(content);
    }
  } catch (error) {
    logger.error('[AccessKeys] 데이터 로드 실패:', error);
  }
  return { nextId: 1, keys: [] };
}

/**
 * Access Keys 데이터 저장
 */
function saveKeysData(data) {
  try {
    const dir = path.dirname(DATA_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (error) {
    logger.error('[AccessKeys] 데이터 저장 실패:', error);
    return false;
  }
}

// ── settings_admin.json 설정 관리 ──

/**
 * settings_admin.json에서 설정 로드
 */
function loadAdminSettings() {
  try {
    const settingsPath = path.join(process.cwd(), 'config', 'settings_admin.json');
    if (fs.existsSync(settingsPath)) {
      const content = fs.readFileSync(settingsPath, 'utf-8');
      return JSON.parse(content);
    }
  } catch (error) {
    logger.error('[AccessKeys] settings_admin.json 로드 실패:', error);
  }
  return {};
}

/**
 * settings_admin.json에 설정 저장
 */
function saveAdminSettings(settings) {
  try {
    const settingsPath = path.join(process.cwd(), 'config', 'settings_admin.json');
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
    return true;
  } catch (error) {
    logger.error('[AccessKeys] settings_admin.json 저장 실패:', error);
    return false;
  }
}

// ── 키 파일 읽기 ──

/**
 * .mymindmp3 파일 또는 .env에서 Access Key 읽기
 * 우선순위: .mymindmp3 파일 > .env 파일
 */
function getAccessKeyFromFile() {
  // 1. settings_admin.json에서 키 파일 경로 확인
  const settings = loadAdminSettings();
  const keyFilePath = settings.accessKeyFilePath;

  if (keyFilePath) {
    try {
      // .mymindmp3 파일에서 읽기
      if (fs.existsSync(keyFilePath)) {
        const keyContent = fs.readFileSync(keyFilePath, 'utf-8').trim();
        if (keyContent && keyContent.startsWith('mym3_ak_')) {
          logger.info('[AccessKeys] .mymindmp3 파일에서 키 로드 성공');
          return keyContent;
        }
      }
    } catch (error) {
      logger.warn('[AccessKeys] .mymindmp3 파일 읽기 실패, .env로 폴백:', error.message);
    }
  }

  // 2. .env 파일에서 읽기 (하위 호환성)
  return getEnvKeyFromFile('MYMIND3_ACCESS_KEY');
}

/**
 * .env 파일에서 특정 키를 실시간으로 읽기
 * process.env는 서버 시작 시점에 캐시되므로, 동적 변경 감지를 위해 직접 파일 읽기
 */
function getEnvKeyFromFile(keyName) {
  try {
    const envPath = path.join(process.cwd(), '.env');
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const lines = envContent.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      // 주석 무시
      if (trimmed.startsWith('#')) continue;
      // KEY=VALUE 형식 파싱
      if (trimmed.startsWith(keyName + '=')) {
        return trimmed.substring(keyName.length + 1).trim();
      }
    }
    return null;
  } catch (error) {
    logger.error('[AccessKeys] .env 파일 읽기 실패:', error);
    return null;
  }
}

// ── 사용자 식별 ──

/**
 * 요청에서 사용자 ID(username) 추출
 */
function getUserId(req) {
  if (req.session?.passport?.user?.username) return req.session.passport.user.username;
  if (req.session?.userId) return req.session.userId;
  return 'dev';
}

// ── API 엔드포인트 ──

/**
 * 현재 접속 IP 조회
 * GET /api/access-keys/my-ip
 */
router.get('/my-ip', (req, res) => {
  try {
    const clientIp = getClientIp(req);
    res.json({ ip: clientIp });
  } catch (error) {
    logger.error('[AccessKeys] IP 조회 실패:', error);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

/**
 * 키 파일 경로 조회
 * GET /api/access-keys/key-path
 */
router.get('/key-path', (req, res) => {
  try {
    const settings = loadAdminSettings();
    res.json({
      success: true,
      path: settings.accessKeyFilePath || ''
    });
  } catch (error) {
    logger.error('[AccessKeys] 키 파일 경로 조회 실패:', error);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

/**
 * 키 파일 경로 설정
 * POST /api/access-keys/key-path
 *
 * 경로 변경 시, 기존 경로에 유효한 키 파일이 있고 새 경로에 없으면 자동 복사
 */
router.post('/key-path', (req, res) => {
  try {
    const { path: keyPath } = req.body;

    if (!keyPath || typeof keyPath !== 'string') {
      return res.status(400).json({ success: false, message: '경로를 입력해주세요.' });
    }

    // 경로 유효성 검사 (기본적인 검증)
    const cleanPath = keyPath.trim();
    if (cleanPath.length > 500) {
      return res.status(400).json({ success: false, message: '경로가 너무 깁니다.' });
    }

    const settings = loadAdminSettings();
    const oldPath = settings.accessKeyFilePath;

    // 키 파일 자동 마이그레이션: 경로가 변경되고, 기존 경로에 키가 있고, 새 경로에 없으면 복사
    let migrated = false;
    if (oldPath && oldPath !== cleanPath) {
      try {
        const oldExists = fs.existsSync(oldPath);
        const newExists = fs.existsSync(cleanPath);

        if (oldExists && !newExists) {
          const oldContent = fs.readFileSync(oldPath, 'utf-8').trim();
          if (oldContent && oldContent.startsWith('mym3_ak_')) {
            // 새 경로의 디렉토리 생성
            const dir = path.dirname(cleanPath);
            if (!fs.existsSync(dir)) {
              fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(cleanPath, oldContent, 'utf-8');
            migrated = true;
            logger.info('[AccessKeys] 키 파일 마이그레이션 완료', { from: oldPath, to: cleanPath });
          }
        }
      } catch (e) {
        logger.warn('[AccessKeys] 키 파일 마이그레이션 실패:', e.message);
      }
    }

    // settings_admin.json 업데이트
    settings.accessKeyFilePath = cleanPath;

    if (saveAdminSettings(settings)) {
      logger.info('[AccessKeys] 키 파일 경로 설정됨:', cleanPath);
      const message = migrated
        ? '경로가 저장되었습니다. 기존 키 파일이 새 경로로 복사되었습니다.'
        : '경로가 저장되었습니다.';
      res.json({ success: true, message, migrated });
    } else {
      res.status(500).json({ success: false, message: '설정 저장에 실패했습니다.' });
    }
  } catch (error) {
    logger.error('[AccessKeys] 키 파일 경로 설정 실패:', error);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

/**
 * 서버 주소 조회
 * GET /api/access-keys/server-url
 */
router.get('/server-url', (req, res) => {
  try {
    const settings = loadAdminSettings();
    const saved = !!settings.serverUrl;
    res.json({
      success: true,
      url: settings.serverUrl || 'http://localhost:5858',
      saved
    });
  } catch (error) {
    logger.error('[AccessKeys] 서버 주소 조회 실패:', error);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

/**
 * 서버 주소 설정
 * POST /api/access-keys/server-url
 */
router.post('/server-url', (req, res) => {
  try {
    const { url } = req.body;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ success: false, message: '서버 주소를 입력해주세요.' });
    }

    const cleanUrl = url.trim().replace(/\/+$/, ''); // 끝 슬래시 제거
    if (cleanUrl.length > 500) {
      return res.status(400).json({ success: false, message: '주소가 너무 깁니다.' });
    }

    const settings = loadAdminSettings();
    settings.serverUrl = cleanUrl;

    if (saveAdminSettings(settings)) {
      logger.info('[AccessKeys] 서버 주소 설정됨:', cleanUrl);
      res.json({ success: true, message: '서버 주소가 저장되었습니다.' });
    } else {
      res.status(500).json({ success: false, message: '설정 저장에 실패했습니다.' });
    }
  } catch (error) {
    logger.error('[AccessKeys] 서버 주소 설정 실패:', error);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

/**
 * 내 키 목록 조회
 * GET /api/access-keys
 */
router.get('/', (req, res) => {
  try {
    const username = getUserId(req);
    const data = loadKeysData();

    // 활성 키만 필터 (해당 사용자)
    const activeKeys = data.keys.filter(k => k.user_id === username && k.is_active === 1);

    // 데이터 가공
    const keysWithDetails = activeKeys.map(key => ({
      ...key,
      scope: key.scope || 'whitelist',
      mindmap_name: key.mindmap_id,
      whitelist_mindmaps: key.mindmap_id ? [key.mindmap_id] : [],
      ip_whitelist: key.ip_whitelist ? JSON.parse(key.ip_whitelist) : null
    }));

    res.json({ success: true, keys: keysWithDetails });
  } catch (error) {
    logger.error('[AccessKeys] 목록 조회 실패:', error);
    res.status(500).json({ success: false, message: '키 목록 조회에 실패했습니다.' });
  }
});

/**
 * 새 키 발급
 * POST /api/access-keys
 *
 * @body {string} name - 키 이름
 * @body {string} scope - 접근 범위 ('all' | 'whitelist')
 * @body {string} permission - 권한 ('read' | 'readwrite')
 * @body {string[]} ip_whitelist - IP 화이트리스트
 * @body {number} expires_days - 만료일 (일 단위)
 */
router.post('/', (req, res) => {
  try {
    const username = getUserId(req);
    const { name, scope, permission, ip_whitelist, expires_days } = req.body;

    const data = loadKeysData();

    // 기존 키 존재 여부 확인 (1개 제한)
    const existingCount = data.keys.filter(k => k.user_id === username && k.is_active === 1).length;
    if (existingCount > 0) {
      return res.status(400).json({
        success: false,
        message: '이미 발급된 키가 있습니다. 기존 키를 삭제한 후 새 키를 발급해주세요.'
      });
    }

    // 유효성 검사
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: '키 이름을 입력해주세요.' });
    }

    if (name.length > 50) {
      return res.status(400).json({ success: false, message: '키 이름은 50자 이내로 입력해주세요.' });
    }

    // scope는 항상 'all' (모든 마인드맵 접근 가능)
    const keyScope = 'all';

    // 권한 검증
    const validPermissions = ['read', 'readwrite'];
    const perm = validPermissions.includes(permission) ? permission : 'readwrite';

    // 만료일 계산
    let expiresAt = null;
    if (expires_days && expires_days > 0) {
      const days = Math.min(Math.max(parseInt(expires_days), 1), 365);
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + days);
    }

    // IP 화이트리스트 처리
    let ipWhitelistJson = null;
    if (ip_whitelist && Array.isArray(ip_whitelist) && ip_whitelist.length > 0) {
      const cleanedIps = ip_whitelist.map(ip => ip.trim()).filter(ip => ip);
      if (cleanedIps.length > 0) {
        ipWhitelistJson = JSON.stringify(cleanedIps);
      }
    }

    // Access Key 생성
    const keyData = generateAccessKey({
      userId: username,
      mindmapId: 'all', // 항상 모든 마인드맵 접근
      permission: perm,
      expiresAt
    });

    // owner_username_hash 생성
    const ownerUsernameHash = crypto.createHash('sha256').update(username).digest('hex');

    // 새 키 레코드
    const newKeyId = data.nextId;
    const newKey = {
      id: newKeyId,
      user_id: username,
      name: name.trim(),
      key_hash: keyData.keyHash,
      key_prefix: keyData.keyPrefix,
      key_id: keyData.keyId,
      scope: keyScope,
      mindmap_id: null,
      permission: perm,
      ip_whitelist: ipWhitelistJson,
      expires_at: expiresAt ? expiresAt.toISOString() : null,
      owner_username_hash: ownerUsernameHash,
      created_at: new Date().toISOString(),
      last_used_at: null,
      is_active: 1
    };

    data.keys.push(newKey);
    data.nextId = newKeyId + 1;

    if (!saveKeysData(data)) {
      return res.status(500).json({ success: false, message: '키 저장에 실패했습니다.' });
    }

    logger.info('[AccessKeys] 새 키 발급', {
      userId: username,
      keyId: newKeyId,
      name: name.trim(),
      scope: keyScope
    });

    // 키 파일 자동 저장
    let savedFilePath = null;
    try {
      const settings = loadAdminSettings();
      let keyFilePath = settings.accessKeyFilePath;

      // 경로가 없으면 기본 경로 자동 설정
      if (!keyFilePath) {
        keyFilePath = path.join(process.cwd(), '.mymindmp3');
        settings.accessKeyFilePath = keyFilePath;
        saveAdminSettings(settings);
        logger.info('[AccessKeys] 키 파일 기본 경로 자동 설정:', keyFilePath);
      }

      // 디렉토리 확인 및 생성
      const dir = path.dirname(keyFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // 키 파일 저장
      fs.writeFileSync(keyFilePath, keyData.key, 'utf-8');
      savedFilePath = keyFilePath;
      logger.info('[AccessKeys] 키 파일 자동 저장 완료', { keyFilePath });
    } catch (e) {
      logger.warn('[AccessKeys] 키 파일 자동 저장 실패:', e);
    }

    // 성공 응답 (전체 키는 여기서만 반환)
    res.json({
      success: true,
      message: '키가 발급되었습니다.',
      key: keyData.key,
      id: newKeyId,
      filePath: savedFilePath
    });
  } catch (error) {
    logger.error('[AccessKeys] 키 발급 실패:', error);
    res.status(500).json({ success: false, message: '키 발급에 실패했습니다.' });
  }
});

/**
 * 키를 설정된 파일 경로에 저장
 * POST /api/access-keys/save-to-file
 */
router.post('/save-to-file', (req, res) => {
  try {
    const { keyValue } = req.body;

    if (!keyValue || !keyValue.startsWith('mym3_ak_')) {
      return res.status(400).json({
        success: false,
        message: '유효한 Access Key가 아닙니다.'
      });
    }

    // 설정된 키 파일 경로 확인
    const settings = loadAdminSettings();
    const keyFilePath = settings.accessKeyFilePath;

    if (!keyFilePath) {
      return res.status(400).json({
        success: false,
        message: '키 파일 경로가 설정되지 않았습니다.',
        details: '먼저 "키 파일 경로"를 설정해주세요.'
      });
    }

    // 디렉토리 존재 확인 및 생성
    const dir = path.dirname(keyFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // 키 파일 저장
    fs.writeFileSync(keyFilePath, keyValue, 'utf-8');

    logger.info('[AccessKeys] 키 파일 저장 완료', { keyFilePath });

    res.json({
      success: true,
      message: '키가 파일에 저장되었습니다.',
      filePath: keyFilePath
    });

  } catch (error) {
    logger.error('[AccessKeys] 키 파일 저장 실패:', error);
    res.status(500).json({
      success: false,
      message: '키 파일 저장에 실패했습니다.',
      details: error.message
    });
  }
});

/**
 * 연결 테스트
 * POST /api/access-keys/test-connection
 *
 * settings_admin.json의 serverUrl로 실제 HTTP 요청을 보내
 * 키 파일의 Access Key가 유효한지 확인
 */
router.post('/test-connection', async (req, res) => {
  try {
    const settings = loadAdminSettings();
    const serverUrl = settings.serverUrl;

    // 서버 주소 확인
    if (!serverUrl) {
      return res.json({
        success: false,
        message: '서버 주소가 설정되지 않았습니다.',
        details: '서버 주소를 먼저 저장해주세요.'
      });
    }

    // .mymindmp3 파일 또는 .env에서 Access Key 읽기
    const accessKey = getAccessKeyFromFile();

    if (!accessKey) {
      const keyPath = settings.accessKeyFilePath;

      if (keyPath) {
        return res.json({
          success: false,
          message: '.mymindmp3 파일을 찾을 수 없습니다.',
          details: `설정된 경로(${keyPath})에 키 파일이 없습니다. 키를 발급 후 "파일로 저장"하여 해당 경로에 저장해주세요.`
        });
      } else {
        return res.json({
          success: false,
          message: 'Access Key가 설정되지 않았습니다.',
          details: '키 파일 경로를 설정하거나, .env 파일에 MYMIND3_ACCESS_KEY를 등록해주세요.'
        });
      }
    }

    const { keyId } = req.body;
    if (!keyId) {
      return res.status(400).json({ success: false, message: '키 ID가 필요합니다.' });
    }

    // serverUrl + 키 파일의 Access Key로 실제 HTTP 연결 테스트
    const pingUrl = `${serverUrl.replace(/\/+$/, '')}/api/skill/ping`;
    logger.info('[AccessKeys] 연결 테스트 시작', { serverUrl: pingUrl, keyId });

    const http = pingUrl.startsWith('https') ? require('https') : require('http');
    const pingResult = await new Promise((resolve, reject) => {
      const urlObj = new URL(pingUrl);
      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port,
        path: urlObj.pathname,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessKey}`
        },
        timeout: 10000
      };

      const httpReq = http.request(options, (response) => {
        let body = '';
        response.on('data', (chunk) => body += chunk);
        response.on('end', () => {
          try {
            resolve({ status: response.statusCode, data: JSON.parse(body) });
          } catch {
            resolve({ status: response.statusCode, data: { message: body } });
          }
        });
      });

      httpReq.on('error', (err) => reject(err));
      httpReq.on('timeout', () => {
        httpReq.destroy();
        reject(new Error(`서버 응답 시간 초과 (${serverUrl})`));
      });
      httpReq.end();
    });

    // 응답 분석
    if (pingResult.status === 200 && pingResult.data.success) {
      const pingData = pingResult.data;

      // 키 ID 불일치 경고 (연결 자체는 성공)
      const keyMismatch = String(pingData.keyId) !== String(keyId);

      // 마인드맵 목록도 조회
      let accessibleMindmaps = [];
      try {
        const mindmapsUrl = `${serverUrl.replace(/\/+$/, '')}/api/skill/mindmaps`;
        const mindmapsUrlObj = new URL(mindmapsUrl);
        const mindmapsResult = await new Promise((resolve, reject) => {
          const opts = {
            hostname: mindmapsUrlObj.hostname,
            port: mindmapsUrlObj.port,
            path: mindmapsUrlObj.pathname,
            method: 'GET',
            headers: { 'Authorization': `Bearer ${accessKey}` },
            timeout: 10000
          };
          const mReq = http.request(opts, (response) => {
            let body = '';
            response.on('data', (chunk) => body += chunk);
            response.on('end', () => {
              try { resolve(JSON.parse(body)); } catch { resolve({}); }
            });
          });
          mReq.on('error', () => resolve({}));
          mReq.on('timeout', () => { mReq.destroy(); resolve({}); });
          mReq.end();
        });
        if (mindmapsResult.mindmaps) {
          accessibleMindmaps = mindmapsResult.mindmaps.map(m => m.id || m);
        }
      } catch {
        // 마인드맵 목록 조회 실패는 무시 (연결 자체는 성공)
      }

      const keyScope = pingData.scope || 'unknown';
      let detailParts = [];
      if (accessibleMindmaps.length > 0) {
        detailParts.push(keyScope === 'all'
          ? `전체 마인드맵 (${accessibleMindmaps.length}개)에 접근 가능합니다.`
          : `${accessibleMindmaps.length}개 마인드맵에 접근 가능합니다.`);
      } else {
        detailParts.push('마인드맵 접근 확인 완료');
      }

      if (keyMismatch) {
        detailParts.push(`참고: 키 파일의 키(ID: ${pingData.keyId})로 연결되었습니다. 선택한 키(ID: ${keyId})와 다릅니다.`);
      }

      logger.info('[AccessKeys] 연결 테스트 성공 (HTTP)', {
        serverUrl,
        keyId,
        actualKeyId: pingData.keyId,
        keyMismatch,
        scope: keyScope,
        username: pingData.username,
        mindmaps: accessibleMindmaps.length
      });

      res.json({
        success: true,
        message: `연결 성공 (${serverUrl})`,
        scope: keyScope,
        mindmaps: accessibleMindmaps,
        details: detailParts.join(' '),
        keyMismatch
      });
    } else if (pingResult.status === 401) {
      return res.json({
        success: false,
        message: 'Access Key 인증 실패',
        details: '키 파일의 Access Key가 유효하지 않습니다. 키를 재발급하거나 키 파일을 확인해주세요.'
      });
    } else {
      return res.json({
        success: false,
        message: `서버 응답 오류 (HTTP ${pingResult.status})`,
        details: pingResult.data.message || pingResult.data.error || '알 수 없는 오류'
      });
    }
  } catch (error) {
    logger.error('[AccessKeys] 연결 테스트 실패:', error);

    // 네트워크 오류 구분
    if (error.code === 'ECONNREFUSED') {
      return res.json({
        success: false,
        message: '서버에 연결할 수 없습니다.',
        details: `${loadAdminSettings().serverUrl || '서버'}에 접속할 수 없습니다. 서버가 실행 중인지 확인해주세요.`
      });
    }
    if (error.code === 'ENOTFOUND') {
      return res.json({
        success: false,
        message: '서버 주소를 찾을 수 없습니다.',
        details: `설정된 서버 주소가 올바른지 확인해주세요.`
      });
    }

    res.status(500).json({
      success: false,
      message: '연결 테스트 중 오류가 발생했습니다.',
      details: error.message
    });
  }
});

/**
 * 키 삭제
 * DELETE /api/access-keys/:id
 */
router.delete('/:id', (req, res) => {
  try {
    const username = getUserId(req);
    const keyId = parseInt(req.params.id);

    if (isNaN(keyId)) {
      return res.status(400).json({ success: false, message: '잘못된 키 ID입니다.' });
    }

    const data = loadKeysData();

    // 소유권 확인
    const keyIndex = data.keys.findIndex(k => k.id === keyId && k.user_id === username && k.is_active === 1);

    if (keyIndex === -1) {
      return res.status(404).json({ success: false, message: '키를 찾을 수 없습니다.' });
    }

    // 소프트 삭제
    data.keys[keyIndex].is_active = 0;

    if (!saveKeysData(data)) {
      return res.status(500).json({ success: false, message: '키 삭제에 실패했습니다.' });
    }

    logger.info('[AccessKeys] 키 삭제', {
      userId: username,
      keyId,
      name: data.keys[keyIndex].name
    });

    res.json({ success: true, message: '키가 삭제되었습니다.' });
  } catch (error) {
    logger.error('[AccessKeys] 키 삭제 실패:', error);
    res.status(500).json({ success: false, message: '키 삭제에 실패했습니다.' });
  }
});

/**
 * 클라이언트 IP 추출
 */
function getClientIp(req) {
  // 프록시를 통한 접속 시 X-Forwarded-For 헤더 확인
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  // 직접 접속 시
  return req.ip || req.connection?.remoteAddress || 'unknown';
}

module.exports = router;
