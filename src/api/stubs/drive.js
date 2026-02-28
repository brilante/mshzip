'use strict';

/**
 * 구글 드라이브 API 라우터
 * 드라이브 연결/해제, 설정 관리
 * 참고소스(mymind3) 동등 구현
 *
 * Drive는 백업 전용 — primary storage는 항상 로컬
 */

const express = require('express');
const router = express.Router();
const https = require('https');
const DriveSettings = require('../../db/models/DriveSettings');
const EncryptionService = require('../../services/encryptionService');
const logger = require('../../utils/logger');

/**
 * 인증 미들웨어
 */
const requireAuth = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: '로그인이 필요합니다.' });
  }
  next();
};

/**
 * Google OAuth URL 생성
 */
function getAuthUrl(userId) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_DRIVE_CALLBACK_URL
    || (process.env.GOOGLE_CALLBACK_URL || '').replace('/api/auth/google/callback', '/api/drive/callback');

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.appdata',
    access_type: 'offline',
    prompt: 'consent',
    state: Buffer.from(userId).toString('base64')
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Google에서 토큰 교환 (authorization code → access/refresh token)
 */
function exchangeToken(code) {
  return new Promise((resolve, reject) => {
    const redirectUri = process.env.GOOGLE_DRIVE_CALLBACK_URL
      || (process.env.GOOGLE_CALLBACK_URL || '').replace('/api/auth/google/callback', '/api/drive/callback');

    const postData = new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    }).toString();

    const options = {
      hostname: 'oauth2.googleapis.com',
      path: '/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode !== 200) {
            reject(new Error(parsed.error_description || parsed.error || '토큰 교환 실패'));
          } else {
            resolve(parsed);
          }
        } catch (e) {
          reject(new Error('토큰 응답 파싱 실패'));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

/**
 * Google Drive API 호출 (간단한 GET)
 */
function callDriveApi(accessToken, path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'www.googleapis.com',
      path,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          reject(new Error('Drive API 응답 파싱 실패'));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

/**
 * refresh_token으로 access_token 갱신
 */
function refreshAccessToken(refreshToken) {
  return new Promise((resolve, reject) => {
    const postData = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    }).toString();

    const options = {
      hostname: 'oauth2.googleapis.com',
      path: '/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode !== 200) {
            reject(new Error(parsed.error_description || '토큰 갱신 실패'));
          } else {
            resolve(parsed);
          }
        } catch (e) {
          reject(new Error('토큰 갱신 응답 파싱 실패'));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

/**
 * 인증된 access_token 가져오기 (만료 시 자동 갱신)
 */
async function getValidAccessToken(settings) {
  let accessToken = EncryptionService.decrypt(settings.access_token_encrypted);
  const refreshToken = settings.refresh_token_encrypted
    ? EncryptionService.decrypt(settings.refresh_token_encrypted)
    : null;

  // 토큰 만료 확인
  if (settings.token_expiry && new Date(settings.token_expiry) < new Date()) {
    if (!refreshToken) {
      throw new Error('토큰 만료. 다시 연결해주세요.');
    }

    try {
      const newTokens = await refreshAccessToken(refreshToken);
      accessToken = newTokens.access_token;

      // DB 업데이트
      const expiryDate = new Date(Date.now() + (newTokens.expires_in || 3600) * 1000).toISOString();
      await DriveSettings.updateTokens(
        settings.user_id,
        EncryptionService.encrypt(newTokens.access_token),
        newTokens.refresh_token
          ? EncryptionService.encrypt(newTokens.refresh_token)
          : settings.refresh_token_encrypted,
        expiryDate
      );

      logger.info('[Drive] 토큰 갱신 완료', { userId: settings.user_id });
    } catch (error) {
      logger.error('[Drive] 토큰 갱신 실패', { error: error.message });
      throw new Error('토큰 갱신 실패. 다시 연결해주세요.');
    }
  }

  return accessToken;
}


// ==================== 라우트 ====================

/**
 * OAuth 시작 - Google 인증 페이지로 리다이렉트
 * GET /api/drive/auth
 */
router.get('/auth', requireAuth, (req, res) => {
  try {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      logger.error('[Drive] Google OAuth 미설정');
      return res.redirect('/?drive=error&message=' + encodeURIComponent('Google OAuth 미설정'));
    }

    const authUrl = getAuthUrl(req.session.userId);
    logger.info('[Drive] OAuth 시작', { userId: req.session.userId });
    res.redirect(authUrl);
  } catch (error) {
    logger.error('[Drive] OAuth 시작 실패', { error: error.message });
    res.redirect('/?drive=error&message=' + encodeURIComponent(error.message));
  }
});

/**
 * OAuth 콜백 (백업 전용)
 * GET /api/drive/callback
 * 토큰 저장 후 설정 페이지로 리다이렉트
 */
router.get('/callback', async (req, res) => {
  try {
    const { code, state } = req.query;

    if (!code || !state) {
      throw new Error('잘못된 콜백 파라미터');
    }

    // state에서 userId 복원
    const userId = Buffer.from(state, 'base64').toString('utf8');

    // 토큰 교환
    const tokens = await exchangeToken(code);

    // 암호화하여 DB 저장
    const encryptedAccess = EncryptionService.encrypt(tokens.access_token);
    const encryptedRefresh = tokens.refresh_token
      ? EncryptionService.encrypt(tokens.refresh_token)
      : null;
    const expiryDate = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null;

    // 설정 조회 또는 생성
    let settings = await DriveSettings.getByUserId(userId);
    if (!settings) {
      await DriveSettings.create(userId);
    }

    // 토큰 저장
    await DriveSettings.updateTokens(userId, encryptedAccess, encryptedRefresh, expiryDate);
    await DriveSettings.setEnabled(userId, true);

    logger.info('[Drive] 드라이브 연결 완료', { userId });
    res.redirect('/?drive=connected');
  } catch (error) {
    logger.error('[Drive] OAuth 콜백 실패', { error: error.message });
    res.redirect('/?drive=error&message=' + encodeURIComponent(error.message));
  }
});

/**
 * 연결 테스트
 * GET /api/drive/test-connection
 */
router.get('/test-connection', requireAuth, async (req, res) => {
  try {
    const settings = await DriveSettings.getByUserId(req.session.userId);
    if (!settings || !settings.access_token_encrypted) {
      return res.json({ success: false, error: '드라이브 미연결' });
    }

    const accessToken = await getValidAccessToken(settings);
    const result = await callDriveApi(accessToken, '/drive/v3/about?fields=user,storageQuota');

    if (result.status === 200) {
      res.json({
        success: true,
        user: result.data.user,
        quota: result.data.storageQuota
      });
    } else {
      res.json({ success: false, error: '토큰 만료 또는 권한 부족' });
    }
  } catch (error) {
    logger.error('[Drive] 연결 테스트 실패', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 설정 조회
 * GET /api/drive/settings
 */
router.get('/settings', requireAuth, async (req, res) => {
  try {
    const settings = await DriveSettings.getByUserId(req.session.userId);

    if (!settings) {
      return res.json({
        connected: false,
        enabled: false,
        path: null,
        migratedToLocal: false
      });
    }

    res.json({
      connected: !!(settings.access_token_encrypted),
      enabled: !!(settings.drive_enabled),
      path: settings.drive_path || '/MyMind3/saves',
      migratedToLocal: !!(settings.migrated_to_local)
    });
  } catch (error) {
    logger.error('[Drive] 설정 조회 실패', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * 설정 저장
 * POST /api/drive/settings
 */
router.post('/settings', requireAuth, async (req, res) => {
  try {
    const { enabled, path } = req.body;
    const userId = req.session.userId;

    let settings = await DriveSettings.getByUserId(userId);
    if (!settings) {
      await DriveSettings.create(userId);
    }

    if (typeof enabled === 'boolean') {
      await DriveSettings.setEnabled(userId, enabled);
    }

    if (path) {
      await DriveSettings.setDrivePath(userId, path);
    }

    res.json({ success: true });
  } catch (error) {
    logger.error('[Drive] 설정 저장 실패', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * 연결 해제 (즉시 토큰 삭제)
 * POST /api/drive/disconnect
 */
router.post('/disconnect', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;

    await DriveSettings.deleteByUserId(userId);
    logger.info('[Drive] 드라이브 연결 해제', { userId });

    res.json({ success: true, message: '드라이브 연결이 해제되었습니다.' });
  } catch (error) {
    logger.error('[Drive] 연결 해제 실패', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * 드라이브 마인드맵 목록 조회
 * GET /api/drive/mindmaps
 */
router.get('/mindmaps', requireAuth, async (req, res) => {
  try {
    const settings = await DriveSettings.getByUserId(req.session.userId);
    if (!settings || !settings.drive_enabled) {
      return res.status(400).json({ error: '드라이브 미연결' });
    }

    const accessToken = await getValidAccessToken(settings);
    const folderId = settings.drive_path || 'root';
    const query = encodeURIComponent(`'${folderId}' in parents and mimeType='application/zip'`);
    const fields = encodeURIComponent('files(id,name,modifiedTime,size)');

    const result = await callDriveApi(
      accessToken,
      `/drive/v3/files?q=${query}&fields=${fields}&orderBy=modifiedTime%20desc`
    );

    if (result.status !== 200) {
      return res.status(400).json({ error: '드라이브 조회 실패' });
    }

    res.json({
      success: true,
      mindmaps: (result.data.files || []).map(m => ({
        id: m.id,
        name: m.name,
        modifiedTime: m.modifiedTime
      }))
    });
  } catch (error) {
    logger.error('[Drive] 마인드맵 목록 조회 실패', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * 드라이브 마인드맵 삭제
 * DELETE /api/drive/mindmap/:name
 */
router.delete('/mindmap/:name', requireAuth, async (req, res) => {
  try {
    const { name } = req.params;

    if (!name) {
      return res.status(400).json({ error: '마인드맵 이름이 필요합니다.' });
    }

    // Path Traversal 방지
    if (name.includes('..') || name.includes('/') || name.includes('\\')) {
      return res.status(400).json({ error: '잘못된 마인드맵 이름입니다.' });
    }

    const settings = await DriveSettings.getByUserId(req.session.userId);
    if (!settings || !settings.drive_enabled) {
      return res.status(400).json({ error: '드라이브 미연결' });
    }

    const accessToken = await getValidAccessToken(settings);

    // Drive에서 마인드맵 폴더/ZIP 검색
    const parentId = settings.drive_path || 'root';
    const query = encodeURIComponent(
      `(name='${name}' or name='${name}.zip') and '${parentId}' in parents and trashed=false`
    );
    const fields = encodeURIComponent('files(id,name)');

    const result = await callDriveApi(accessToken, `/drive/v3/files?q=${query}&fields=${fields}`);

    if (result.status !== 200 || !result.data.files || result.data.files.length === 0) {
      return res.status(404).json({ error: '마인드맵을 찾을 수 없습니다.' });
    }

    // 파일 삭제
    let deleted = 0;
    for (const file of result.data.files) {
      await new Promise((resolve, reject) => {
        const options = {
          hostname: 'www.googleapis.com',
          path: `/drive/v3/files/${file.id}`,
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${accessToken}` }
        };
        const req = https.request(options, (res) => {
          let data = '';
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => {
            if (res.statusCode === 204 || res.statusCode === 200) {
              resolve();
            } else {
              reject(new Error(`삭제 실패: HTTP ${res.statusCode}`));
            }
          });
        });
        req.on('error', reject);
        req.end();
      });
      deleted++;
    }

    logger.info('[Drive] 마인드맵 삭제 완료', { name, deleted });
    res.json({ success: true, deleted });
  } catch (error) {
    logger.error('[Drive] 마인드맵 삭제 실패', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
