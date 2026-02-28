'use strict';

/**
 * Skill API
 * Claude Code Agent Skills용 노드 데이터 접근 API
 *
 * ★ 경로 설계 원칙 (2026-02-28 변경)
 *   - 사용자 저장 경로: save/{yyyy}/{yyyyMM}/{yyyyMMdd}/{hash}/  (신규)
 *                       save/{hash}/                              (레거시)
 *   - 경로 결정은 항상 서버 측에서만 수행 (DB user_id_mapping.date_path 기반)
 *   - Claude Code는 실제 경로를 알 필요 없음 — API만 사용
 *   - 인증: 로컬 .env의 LOGIN_OK_ACCESSKEY 또는 발급된 Access Key
 *   - 로그인 시 세션에 경로 정보 캐시 → 미사용 시 세션 만료로 자동 파괴
 *
 * @routes
 * - GET    /ping                              : 연결 테스트
 * - GET    /mindmaps                          : 접근 가능 마인드맵 목록
 * - GET    /node/:mindmapId/:nodeId           : 노드 데이터 조회
 * - GET    /node/:nodeId                      : 노드 조회 (마인드맵 자동 탐색)
 * - PUT    /node/:mindmapId/:nodeId           : 노드 데이터 수정
 * - PUT    /node/:nodeId                      : 노드 수정 (마인드맵 자동 탐색)
 * - PATCH  /mindmap/:mindmapId                : 마인드맵 CRUD (add/update/delete/move)
 * - PUT    /mindmap/:mindmapId                : 마인드맵 구조 전체 저장
 *
 * @authentication
 * X-Access-Key-Hash: <sha256-hash>  (LOGIN_OK_ACCESSKEY 또는 발급 키)
 * Authorization: Bearer mym3_ak_xxxxx  (하위호환)
 *
 * @created 2026-02-25
 * @updated 2026-02-28  getUserFolder → async DB 기반으로 전환
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const zlib = require('zlib');
const { validateAccessKey, checkIpWhitelist } = require('../utils/accessKey');
const { validateLoginOkToken } = require('../utils/loginOkKey');
const UserIdEncoder = require('../utils/userIdEncoder');
const logger = require('../utils/logger');

// ══════════════════════════════════════════════════════
// skill API 전용 JSON 파서 미들웨어
//
// Content-Encoding: gzip → zlib으로 해제 후 UTF-8 파싱
// Content-Encoding 없음 → 기존 plain JSON 처리 (하위호환)
//
// CP949 감지 로직 제거 — 압축 방식으로 인코딩 문제 근본 해결
// ══════════════════════════════════════════════════════

/**
 * skill API 전용 JSON 파서 미들웨어
 * gzip 압축 자동 해제 + UTF-8 파싱
 */
function skillJsonParser(limit = '1mb') {
  return (req, res, next) => {
    if (!req.is('json')) return next();

    // express.json() 등 다른 미들웨어가 이미 파싱한 경우 스킵
    if (req.body !== undefined) return next();

    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      const raw = Buffer.concat(chunks);
      if (raw.length === 0) { req.body = {}; return next(); }

      const isGzip = req.headers['content-encoding'] === 'gzip';

      const parse = (buf) => {
        try {
          req.body = JSON.parse(buf.toString('utf-8'));
          next();
        } catch {
          res.status(400).json({ success: false, error: 'JSON 파싱 실패', code: 'PARSE_ERROR' });
        }
      };

      if (isGzip) {
        zlib.gunzip(raw, (err, decompressed) => {
          if (err) {
            return res.status(400).json({ success: false, error: 'gzip 해제 실패', code: 'DECOMPRESS_ERROR' });
          }
          logger.debug('[Skill API] gzip 해제', { compressed: raw.length, decompressed: decompressed.length });
          parse(decompressed);
        });
      } else {
        parse(raw);
      }
    });
    req.on('error', () => {
      res.status(400).json({ success: false, error: '요청 읽기 실패', code: 'READ_ERROR' });
    });
  };
}

// ── 설정 ──

const SAVE_PATH = path.resolve(__dirname, '../../save');
const KEYS_DATA_PATH = path.join(process.cwd(), 'config', 'access-keys-data.json');

// ── Access Keys 데이터 로드/저장 ──

function loadKeysData() {
  try {
    if (fs.existsSync(KEYS_DATA_PATH)) {
      return JSON.parse(fs.readFileSync(KEYS_DATA_PATH, 'utf-8'));
    }
  } catch (error) {
    logger.error('[Skill API] 키 데이터 로드 실패:', error);
  }
  return { nextId: 1, keys: [] };
}

function saveKeysData(data) {
  try {
    fs.writeFileSync(KEYS_DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    logger.error('[Skill API] 키 데이터 저장 실패:', error);
  }
}

// ── 노드 ID 생성 ──

const CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const NODE_ID_LENGTH = 10;

function generateNodeId() {
  const bytes = crypto.randomBytes(NODE_ID_LENGTH);
  let result = '';
  for (let i = 0; i < NODE_ID_LENGTH; i++) {
    result += CHARSET[bytes[i] % CHARSET.length];
  }
  return result;
}

// ── 노드 검색 (재귀) ──

function findNodeById(data, nodeId) {
  const nodes = data?.mindMapData || (Array.isArray(data) ? data : []);
  for (const node of nodes) {
    if (String(node.id) === String(nodeId) || node.nodeId === nodeId) return node;
    if (node.children && node.children.length > 0) {
      const found = findNodeById({ mindMapData: node.children }, nodeId);
      if (found) return found;
    }
  }
  return null;
}

// ── 노드 제거 (재귀) ──

function removeNode(nodes, nodeId) {
  for (let i = 0; i < nodes.length; i++) {
    if (String(nodes[i].id) === String(nodeId) || nodes[i].nodeId === nodeId) {
      return nodes.splice(i, 1)[0];
    }
    if (nodes[i].children && nodes[i].children.length > 0) {
      const removed = removeNode(nodes[i].children, nodeId);
      if (removed) return removed;
    }
  }
  return null;
}

// ── 노드 경로 정리 ──

const UNSAFE_FILENAME_CHARS = /[<>:"/\\|?*\x00-\x1F]/g;

function sanitizeNodePaths(node) {
  if (!node.path) {
    const title = (node.title || '').substring(0, 50).replace(UNSAFE_FILENAME_CHARS, '_');
    node.path = `${title}[${node.nodeId || node.id}].html`;
  }
  if (Object.prototype.hasOwnProperty.call(node, 'content')) {
    delete node.content;
  }
  if (node.children && node.children.length > 0) {
    node.children.forEach(child => sanitizeNodePaths(child));
  }
}

// ── attachments 병합 ──

function mergeAttachments(newNodes, existingNodes) {
  if (!existingNodes || !Array.isArray(existingNodes)) return;
  const attachmentsMap = new Map();
  function collectAttachments(nodes) {
    for (const node of nodes) {
      if (node.attachments && node.attachments.length > 0) {
        attachmentsMap.set(node.id, node.attachments);
      }
      if (node.children && node.children.length > 0) collectAttachments(node.children);
    }
  }
  collectAttachments(existingNodes);
  function applyAttachments(nodes) {
    for (const node of nodes) {
      if (attachmentsMap.has(node.id) && !node.attachments) {
        node.attachments = attachmentsMap.get(node.id);
      }
      if (node.children && node.children.length > 0) applyAttachments(node.children);
    }
  }
  applyAttachments(newNodes);
}

// ── 노드 수 카운트 ──

function countNodes(data) {
  let count = 0;
  function traverse(nodes) {
    if (!Array.isArray(nodes)) return;
    for (const node of nodes) {
      count++;
      if (node.children && node.children.length > 0) traverse(node.children);
    }
  }
  if (data.mindMapData) traverse(data.mindMapData);
  else if (Array.isArray(data)) traverse(data);
  return count;
}

// ── 실행파일 차단 ──

const BLOCKED_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.com', '.msi', '.scr', '.pif',
  '.dll', '.sys', '.vbs', '.vbe', '.wsf', '.wsh', '.ps1'
];

function isExecutableFile(filename) {
  const ext = path.extname(filename).toLowerCase();
  return BLOCKED_EXTENSIONS.includes(ext);
}

// ── 클라이언트 IP ──

function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    '127.0.0.1';
}

// ══════════════════════════════════════════════════════
// ★ 사용자 저장소 경로 해석 (DB 기반, 비동기)
//
// 설계 원칙:
//   - 경로는 서버만 알면 됨. Claude Code는 경로 불필요.
//   - DB user_id_mapping.date_path + user_id_hash 조합
//   - 로그인 시 세션에 캐시됨 → 세션 만료 시 자동 파괴
//   - DB 매핑 없는 레거시 사용자는 파일시스템 스캔 폴백
// ══════════════════════════════════════════════════════

/**
 * 사용자 저장소 상대 경로 반환 (DB 기반)
 *
 * 반환 예시:
 *   신규: '2026/202602/20260228/JDJiJDEw...'
 *   레거시: 'JDJiJDEw...'
 *
 * @param {string} username
 * @returns {Promise<string>} save/ 기준 상대 경로
 */
async function resolveUserRelativePath(username) {
  // UserIdEncoder.resolveUserPath() 가 DB 조회 + 캐시를 담당
  // date_path 있으면 → 'yyyy/yyyyMM/yyyyMMdd/{hash}'
  // date_path 없으면 → '{hash}' (레거시)
  return UserIdEncoder.resolveUserPath(username, SAVE_PATH);
}

/**
 * 사용자 저장소 절대 경로 반환
 * @param {string} username
 * @returns {Promise<string>} 절대 경로
 */
async function getUserAbsPath(username) {
  const rel = await resolveUserRelativePath(username);
  return path.join(SAVE_PATH, rel);
}

// ══════════════════════════════════════════════════════
// 인증 미들웨어
// ══════════════════════════════════════════════════════

/**
 * Access Key 인증 미들웨어
 * - LOGIN_OK_ACCESSKEY (로그인 후 .env에 저장된 단기 토큰) 우선
 * - 발급된 Access Key (X-Access-Key-Hash) 차선
 * - Bearer 토큰 (하위호환)
 */
function requireAccessKey(req, res, next) {
  try {
    const keysData = loadKeysData();
    let keyRecord = null;
    let authMethod = null;

    const keyHash = req.headers['x-access-key-hash'];
    if (keyHash) {
      authMethod = 'hash';

      // ── LOGIN_OK 토큰 경로 (Claude Code → .env LOGIN_OK_ACCESSKEY) ──
      const storedLoginOkToken = process.env.LOGIN_OK_ACCESSKEY;
      if (storedLoginOkToken && keyHash === storedLoginOkToken) {
        const loginOkResult = validateLoginOkToken(storedLoginOkToken, keyHash);
        if (!loginOkResult.valid) {
          return res.status(401).json({
            success: false,
            error: loginOkResult.reason,
            code: 'LOGIN_OK_KEY_EXPIRED'
          });
        }

        res.setHeader('X-Login-Key-Remaining-Seconds', Math.floor(loginOkResult.remainingMs / 1000));

        req.accessKey = {
          userId:     loginOkResult.payload.username,
          username:   loginOkResult.payload.username,
          scope:      'all',
          permission: 'readwrite',
          keyId:      'login_ok',
          record: {
            id:          0,
            scope:       'all',
            permission:  'readwrite',
            mindmap_id:  null,
            ip_whitelist: null
          }
        };

        logger.info('[Skill API] LOGIN_OK 토큰 인증 성공', {
          username:   loginOkResult.payload.username,
          remainingSec: Math.floor(loginOkResult.remainingMs / 1000)
        });

        return next();
      }

      // ── 일반 Access Key 경로 ──
      keyRecord = keysData.keys.find(k => k.key_hash === keyHash && k.is_active === 1);
      if (!keyRecord) {
        return res.status(401).json({
          success: false,
          error: '유효하지 않은 Access Key 해시입니다.',
          code: 'INVALID_KEY_HASH'
        });
      }
    }

    // Bearer 토큰 (하위호환)
    if (!keyRecord) {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          error: 'Access Key가 필요합니다. (X-Access-Key-Hash 헤더 또는 Authorization: Bearer 사용)',
          code: 'UNAUTHORIZED'
        });
      }

      authMethod = 'bearer';
      const accessKey = authHeader.substring(7);
      const validation = validateAccessKey(accessKey);

      if (!validation.valid) {
        return res.status(401).json({ success: false, error: validation.error, code: 'INVALID_KEY' });
      }

      keyRecord = keysData.keys.find(k => k.key_id === validation.payload.keyId && k.is_active === 1);
      if (!keyRecord) {
        return res.status(401).json({ success: false, error: '유효하지 않은 Access Key입니다.', code: 'KEY_NOT_FOUND' });
      }
    }

    // 만료 검사
    if (keyRecord.expires_at && new Date(keyRecord.expires_at) < new Date()) {
      return res.status(401).json({ success: false, error: 'Access Key가 만료되었습니다.', code: 'KEY_EXPIRED' });
    }

    // IP 화이트리스트
    if (keyRecord.ip_whitelist) {
      const whitelist = typeof keyRecord.ip_whitelist === 'string'
        ? JSON.parse(keyRecord.ip_whitelist)
        : keyRecord.ip_whitelist;
      if (!checkIpWhitelist(getClientIp(req), whitelist)) {
        return res.status(403).json({ success: false, error: '허용되지 않은 IP 주소입니다.', code: 'IP_RESTRICTED' });
      }
    }

    keyRecord.last_used_at = new Date().toISOString();
    saveKeysData(keysData);

    req.accessKey = {
      userId:     keyRecord.user_id,
      username:   keyRecord.user_id,
      scope:      keyRecord.scope || 'whitelist',
      permission: keyRecord.permission,
      keyId:      keyRecord.key_id,
      record:     keyRecord
    };

    logger.info('[Skill API] 인증 성공', {
      keyId: keyRecord.id, authMethod,
      scope: req.accessKey.scope, username: req.accessKey.username
    });

    next();
  } catch (error) {
    logger.error('[Skill API] 인증 오류:', error);
    res.status(500).json({ success: false, error: '인증 처리 중 오류가 발생했습니다.', code: 'AUTH_ERROR' });
  }
}

function requirePermission(permission) {
  return (req, res, next) => {
    if (permission === 'read') return next();
    if (permission === 'write' && req.accessKey.permission !== 'readwrite') {
      return res.status(403).json({ success: false, error: '쓰기 권한이 없습니다.', code: 'PERMISSION_DENIED' });
    }
    next();
  };
}

function checkMindmapAccess(accessKey, mindmapId) {
  if (accessKey.scope === 'all') return true;
  if (accessKey.record.mindmap_id === mindmapId) return true;
  return false;
}

// ── JSON attachments 배열 갱신 ──

function addAttachmentToNode(mindmapJsonPath, nodeId, fileInfo) {
  try {
    const mindmapData = JSON.parse(fs.readFileSync(mindmapJsonPath, 'utf-8'));
    const node = findNodeById(mindmapData, nodeId);
    if (!node) return false;
    if (!Array.isArray(node.attachments)) node.attachments = [];
    const existingIdx = node.attachments.findIndex(a => a.name === fileInfo.name);
    if (existingIdx >= 0) node.attachments[existingIdx] = fileInfo;
    else node.attachments.push(fileInfo);
    fs.writeFileSync(mindmapJsonPath, JSON.stringify(mindmapData, null, 2), 'utf-8');
    return true;
  } catch (error) {
    logger.warn('[Skill API] attachments 갱신 실패:', error.message);
    return false;
  }
}

// ── 전체 마인드맵에서 노드 탐색 ──

async function findNodeInAllMindmaps(username, nodeId) {
  const userPath = await getUserAbsPath(username);
  if (!fs.existsSync(userPath)) return null;

  const folders = fs.readdirSync(userPath).filter(f => {
    try { return fs.statSync(path.join(userPath, f)).isDirectory(); }
    catch { return false; }
  });

  for (const mindmapId of folders) {
    const jsonPath = path.join(userPath, mindmapId, `${mindmapId}.json`);
    if (!fs.existsSync(jsonPath)) continue;
    try {
      const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
      const node = findNodeById(data, nodeId);
      if (node) return { mindmapId, data, node };
    } catch { /* 무시 */ }
  }
  return null;
}

// ══════════════════════════════════════════════════════
// GET /ping - 연결 테스트
// ══════════════════════════════════════════════════════

router.get('/ping', requireAccessKey, (req, res) => {
  res.json({
    success: true,
    message: 'pong',
    username: req.accessKey.username,
    scope: req.accessKey.scope,
    keyId: req.accessKey.record.id
  });
});

// ══════════════════════════════════════════════════════
// GET /mindmaps - 접근 가능 마인드맵 목록
// ══════════════════════════════════════════════════════

router.get('/mindmaps', requireAccessKey, async (req, res) => {
  try {
    const { username, scope } = req.accessKey;

    // ★ DB에서 경로 조회 (Claude Code는 이 경로를 알 필요 없음)
    const userPath = await getUserAbsPath(username);

    if (!fs.existsSync(userPath)) {
      return res.json({ success: true, mindmaps: [] });
    }

    const allFolders = fs.readdirSync(userPath).filter(f => {
      try { return fs.statSync(path.join(userPath, f)).isDirectory() && !f.startsWith('.'); }
      catch { return false; }
    });

    const accessibleMindmaps = scope === 'all'
      ? allFolders
      : (req.accessKey.record.mindmap_id
          ? allFolders.filter(m => m === req.accessKey.record.mindmap_id)
          : []);

    const mindmaps = [];
    for (const id of accessibleMindmaps) {
      let name = id;
      const jsonPath = path.join(userPath, id, `${id}.json`);
      if (fs.existsSync(jsonPath)) {
        try {
          const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
          if (data.name) name = data.name;
          else if (data.mindMapData?.[0]?.title) name = data.mindMapData[0].title;
        } catch { /* 무시 */ }
      }
      mindmaps.push({ id, name });
    }

    logger.info('[Skill API] 마인드맵 목록 조회', { username, scope, count: mindmaps.length });
    res.json({ success: true, mindmaps });
  } catch (error) {
    logger.error('[Skill API] 마인드맵 목록 조회 오류:', error);
    res.status(500).json({ success: false, error: '마인드맵 목록 조회 중 오류가 발생했습니다.', code: 'INTERNAL_ERROR' });
  }
});

// ══════════════════════════════════════════════════════
// 노드 조회 내부 핸들러
// ══════════════════════════════════════════════════════

async function handleNodeRead(req, res, mindmapId, nodeId) {
  const { username } = req.accessKey;

  if (!checkMindmapAccess(req.accessKey, mindmapId)) {
    return res.status(403).json({ success: false, error: '이 마인드맵에 대한 접근 권한이 없습니다.', code: 'MINDMAP_ACCESS_DENIED' });
  }

  // ★ DB에서 사용자 경로 조회
  const userPath = await getUserAbsPath(username);
  const contentDir = path.join(userPath, mindmapId);
  const mindmapJsonPath = path.join(contentDir, `${mindmapId}.json`);

  if (!fs.existsSync(mindmapJsonPath)) {
    return res.status(404).json({ success: false, error: '마인드맵을 찾을 수 없습니다.', code: 'MINDMAP_NOT_FOUND' });
  }

  let mindmapData;
  try {
    mindmapData = JSON.parse(fs.readFileSync(mindmapJsonPath, 'utf-8'));
  } catch {
    return res.status(500).json({ success: false, error: '마인드맵 데이터를 읽을 수 없습니다.', code: 'READ_ERROR' });
  }

  const node = findNodeById(mindmapData, nodeId);
  if (!node) {
    return res.status(404).json({ success: false, error: '노드를 찾을 수 없습니다.', code: 'NODE_NOT_FOUND' });
  }

  // 노드 콘텐츠 로드 (title[nodeId].html 패턴)
  let nodeContentText = null;
  let htmlFilePath = null;

  if (fs.existsSync(contentDir)) {
    const matchingFiles = fs.readdirSync(contentDir).filter(f => f.endsWith(`[${nodeId}].html`));
    if (matchingFiles.length > 0) htmlFilePath = path.join(contentDir, matchingFiles[0]);
  }

  if (!htmlFilePath) {
    const directPath = path.join(contentDir, `${nodeId}.html`);
    if (fs.existsSync(directPath)) htmlFilePath = directPath;
  }

  if (htmlFilePath && fs.existsSync(htmlFilePath)) {
    nodeContentText = fs.readFileSync(htmlFilePath, 'utf-8');
  } else {
    const legacyJsonPath = path.join(contentDir, `node_${nodeId}.json`);
    if (fs.existsSync(legacyJsonPath)) {
      try {
        const legacyData = JSON.parse(fs.readFileSync(legacyJsonPath, 'utf-8'));
        nodeContentText = legacyData.content || '';
      } catch { /* 무시 */ }
    }
  }

  // 첨부파일 로드
  const attachments = [];
  const textExts = ['.md', '.txt', '.html', '.css', '.js', '.json', '.csv', '.xml', '.yaml', '.yml', '.sql', '.py', '.sh'];

  function loadAttachmentsFrom(folderPath) {
    if (!fs.existsSync(folderPath) || !fs.statSync(folderPath).isDirectory()) return;
    const files = fs.readdirSync(folderPath).filter(f => !isExecutableFile(f));
    for (const file of files) {
      if (attachments.find(a => a.name === file)) continue;
      const filePath = path.join(folderPath, file);
      try { if (!fs.statSync(filePath).isFile()) continue; } catch { continue; }
      const ext = path.extname(file).toLowerCase();
      attachments.push({
        name: file,
        type: ext.substring(1),
        size: fs.statSync(filePath).size,
        content: textExts.includes(ext) ? fs.readFileSync(filePath, 'utf-8') : null
      });
    }
  }

  loadAttachmentsFrom(path.join(contentDir, nodeId));

  // title[nodeId]/ 패턴 폴더도 확인
  const nodeTitle = (node.title || '').substring(0, 50).replace(UNSAFE_FILENAME_CHARS, '_');
  loadAttachmentsFrom(path.join(contentDir, `${nodeTitle}[${nodeId}]`));

  logger.info('[Skill API] 노드 조회', { username, mindmapId, nodeId });

  res.json({
    success: true,
    mindmapId,
    node: {
      id: node.nodeId || node.id,
      title: node.text || node.title || node.name,
      content: (nodeContentText !== null && nodeContentText !== '') ? nodeContentText : (node.content || ''),
      children: (node.children || []).map(c => ({
        id: c.nodeId || c.id,
        title: c.text || c.title || c.name
      })),
      qa: node.qa || [],
      attachments
    }
  });
}

// ══════════════════════════════════════════════════════
// 노드 수정 내부 핸들러
// ══════════════════════════════════════════════════════

async function handleNodeWrite(req, res, mindmapId, nodeId) {
  const { username } = req.accessKey;
  const { append, content, filename } = req.body || {};

  if (append === undefined && content === undefined) {
    return res.status(400).json({
      success: false,
      error: 'append 또는 content 필드가 필요합니다.',
      code: 'EMPTY_BODY',
      hint: '요청 body에 { "append": "내용" } 또는 { "content": "내용" }을 포함하세요.'
    });
  }

  if (!checkMindmapAccess(req.accessKey, mindmapId)) {
    return res.status(403).json({ success: false, error: '이 마인드맵에 대한 접근 권한이 없습니다.', code: 'MINDMAP_ACCESS_DENIED' });
  }

  // ★ DB에서 사용자 경로 조회
  const userPath = await getUserAbsPath(username);
  const contentDir = path.join(userPath, mindmapId);
  const mindmapJsonPath = path.join(contentDir, `${mindmapId}.json`);

  if (!fs.existsSync(mindmapJsonPath)) {
    return res.status(404).json({ success: false, error: '마인드맵을 찾을 수 없습니다.', code: 'MINDMAP_NOT_FOUND' });
  }

  // 첨부 파일 모드
  if (filename) {
    if (isExecutableFile(filename)) {
      return res.status(400).json({ success: false, error: '실행파일은 첨부할 수 없습니다.', code: 'EXECUTABLE_NOT_ALLOWED' });
    }

    const sanitizedFilename = filename.replace(/[<>:"/\\|?*]/g, '_');
    const mdFilename = sanitizedFilename.endsWith('.md') ? sanitizedFilename : `${sanitizedFilename}.md`;
    const nodeFolder = path.join(contentDir, nodeId);
    if (!fs.existsSync(nodeFolder)) fs.mkdirSync(nodeFolder, { recursive: true });

    const mdFilePath = path.join(nodeFolder, mdFilename);
    if (append) {
      const appendText = `\n\n---\n[${new Date().toISOString()}] Agent Skill 기록:\n${append}`;
      const existing = fs.existsSync(mdFilePath) ? fs.readFileSync(mdFilePath, 'utf-8') : '';
      fs.writeFileSync(mdFilePath, existing + appendText, 'utf-8');
    } else if (content !== undefined) {
      fs.writeFileSync(mdFilePath, content, 'utf-8');
    }

    const fileStats = fs.statSync(mdFilePath);
    addAttachmentToNode(mindmapJsonPath, nodeId, {
      name: mdFilename, type: 'md', size: fileStats.size, uploadedAt: new Date().toISOString()
    });

    return res.json({
      success: true,
      message: `첨부파일이 저장되었습니다: ${mdFilename}`,
      mindmapId, nodeId,
      filePath: `${nodeId}/${mdFilename}`,
      bytesWritten: fileStats.size
    });
  }

  // HTML 파일 모드
  let htmlFilePath = null;
  if (fs.existsSync(contentDir)) {
    const matchingFiles = fs.readdirSync(contentDir).filter(f => f.endsWith(`[${nodeId}].html`));
    if (matchingFiles.length > 0) htmlFilePath = path.join(contentDir, matchingFiles[0]);
  }
  if (!htmlFilePath) {
    const directPath = path.join(contentDir, `${nodeId}.html`);
    if (fs.existsSync(directPath)) htmlFilePath = directPath;
  }
  if (!htmlFilePath) {
    try {
      const mindmapData = JSON.parse(fs.readFileSync(mindmapJsonPath, 'utf-8'));
      const node = findNodeById(mindmapData, nodeId);
      const nodeTitle = (node?.title || nodeId).substring(0, 50).replace(UNSAFE_FILENAME_CHARS, '_');
      htmlFilePath = path.join(contentDir, `${nodeTitle}[${nodeId}].html`);
    } catch {
      htmlFilePath = path.join(contentDir, `${nodeId}.html`);
    }
  }

  let existingContent = fs.existsSync(htmlFilePath) ? fs.readFileSync(htmlFilePath, 'utf-8') : '';

  if (append) {
    existingContent += `\n\n<hr>\n<p><strong>[${new Date().toISOString()}] Agent Skill 기록:</strong></p>\n${append}`;
  } else if (content !== undefined) {
    existingContent = content;
  }

  const dir = path.dirname(htmlFilePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(htmlFilePath, existingContent, 'utf-8');

  const bytesWritten = Buffer.byteLength(existingContent, 'utf-8');
  logger.info('[Skill API] 노드 HTML 파일 저장', { username, mindmapId, nodeId, mode: append ? 'append' : 'overwrite', bytesWritten });

  res.json({
    success: true,
    message: '노드가 업데이트되었습니다.',
    mindmapId, nodeId,
    filePath: path.basename(htmlFilePath),
    bytesWritten
  });
}

// ══════════════════════════════════════════════════════
// GET /node/:mindmapId/:nodeId
// ══════════════════════════════════════════════════════

router.get('/node/:mindmapId/:nodeId', requireAccessKey, requirePermission('read'), async (req, res) => {
  try {
    await handleNodeRead(req, res, decodeURIComponent(req.params.mindmapId), req.params.nodeId);
  } catch (error) {
    logger.error('[Skill API] 노드 조회 오류:', error);
    res.status(500).json({ success: false, error: '노드 조회 중 오류가 발생했습니다.', code: 'INTERNAL_ERROR' });
  }
});

// ══════════════════════════════════════════════════════
// GET /node/:nodeId - 마인드맵 자동 탐색
// ══════════════════════════════════════════════════════

router.get('/node/:nodeId', requireAccessKey, requirePermission('read'), async (req, res) => {
  try {
    const { nodeId } = req.params;
    const { username, scope } = req.accessKey;

    if (scope === 'all') {
      const result = await findNodeInAllMindmaps(username, nodeId);
      if (result) return handleNodeRead(req, res, result.mindmapId, nodeId);
      return res.status(404).json({ success: false, error: '노드를 찾을 수 없습니다.', code: 'NODE_NOT_FOUND' });
    }

    const mindmapId = req.accessKey.record.mindmap_id;
    if (mindmapId) return handleNodeRead(req, res, mindmapId, nodeId);

    return res.status(400).json({
      success: false,
      error: 'mindmapId를 지정해주세요. (GET /api/skill/node/:mindmapId/:nodeId)',
      code: 'MINDMAP_ID_REQUIRED'
    });
  } catch (error) {
    logger.error('[Skill API] 노드 조회 오류:', error);
    res.status(500).json({ success: false, error: '노드 조회 중 오류가 발생했습니다.', code: 'INTERNAL_ERROR' });
  }
});

// ══════════════════════════════════════════════════════
// PUT /node/:mindmapId/:nodeId
// ══════════════════════════════════════════════════════

router.put('/node/:mindmapId/:nodeId', requireAccessKey, requirePermission('write'), skillJsonParser('1mb'), async (req, res) => {
  try {
    await handleNodeWrite(req, res, decodeURIComponent(req.params.mindmapId), req.params.nodeId);
  } catch (error) {
    logger.error('[Skill API] 노드 수정 오류:', error);
    res.status(500).json({ success: false, error: '노드 수정 중 오류가 발생했습니다.', code: 'INTERNAL_ERROR' });
  }
});

// ══════════════════════════════════════════════════════
// PUT /node/:nodeId - 마인드맵 자동 탐색
// ══════════════════════════════════════════════════════

router.put('/node/:nodeId', requireAccessKey, requirePermission('write'), skillJsonParser('1mb'), async (req, res) => {
  try {
    const { nodeId } = req.params;
    const { username, scope } = req.accessKey;

    if (scope === 'all') {
      const result = await findNodeInAllMindmaps(username, nodeId);
      if (result) return handleNodeWrite(req, res, result.mindmapId, nodeId);
      return res.status(404).json({ success: false, error: '노드를 찾을 수 없습니다.', code: 'NODE_NOT_FOUND' });
    }

    const mindmapId = req.accessKey.record.mindmap_id;
    if (mindmapId) return handleNodeWrite(req, res, mindmapId, nodeId);

    return res.status(400).json({ success: false, error: 'mindmapId를 지정해주세요.', code: 'MINDMAP_ID_REQUIRED' });
  } catch (error) {
    logger.error('[Skill API] 노드 수정 오류:', error);
    res.status(500).json({ success: false, error: '노드 수정 중 오류가 발생했습니다.', code: 'INTERNAL_ERROR' });
  }
});

// ══════════════════════════════════════════════════════
// PATCH /mindmap/:mindmapId - 마인드맵 CRUD
// ══════════════════════════════════════════════════════

router.patch('/mindmap/:mindmapId', requireAccessKey, requirePermission('write'), skillJsonParser('1mb'), async (req, res) => {
  try {
    const mindmapId = decodeURIComponent(req.params.mindmapId);
    const { username } = req.accessKey;
    const { operations } = req.body;

    if (!checkMindmapAccess(req.accessKey, mindmapId)) {
      return res.status(403).json({ success: false, error: '이 마인드맵에 대한 접근 권한이 없습니다.', code: 'MINDMAP_ACCESS_DENIED' });
    }

    if (!Array.isArray(operations) || operations.length === 0) {
      return res.status(400).json({ success: false, error: 'operations 배열이 필요합니다.', code: 'VALIDATION_ERROR' });
    }

    const validOps = ['update', 'add', 'delete', 'move'];
    for (const op of operations) {
      if (!validOps.includes(op.op)) {
        return res.status(400).json({ success: false, error: `유효하지 않은 operation: ${op.op}`, code: 'VALIDATION_ERROR' });
      }
    }

    // ★ DB에서 사용자 경로 조회
    const userPath = await getUserAbsPath(username);
    const contentDir = path.join(userPath, mindmapId);
    const jsonFilePath = path.join(contentDir, `${mindmapId}.json`);

    if (!fs.existsSync(jsonFilePath)) {
      return res.status(404).json({ success: false, error: '마인드맵을 찾을 수 없습니다.', code: 'MINDMAP_NOT_FOUND' });
    }

    const data = JSON.parse(fs.readFileSync(jsonFilePath, 'utf-8'));

    if (!data.mindMapData || !Array.isArray(data.mindMapData)) {
      return res.status(400).json({ success: false, error: '잘못된 마인드맵 데이터 구조입니다.', code: 'INVALID_DATA' });
    }

    let appliedCount = 0;
    const newNodeIds = [];

    for (const op of operations) {
      switch (op.op) {
        case 'update': {
          const node = findNodeById(data, op.nodeId);
          if (node && op.changes) { Object.assign(node, op.changes); appliedCount++; }
          break;
        }
        case 'add': {
          const parent = findNodeById(data, op.parentId);
          if (parent && op.node) {
            if (!op.node.title && op.node.text) { op.node.title = op.node.text; delete op.node.text; }
            if (op.node.id != null && typeof op.node.id === 'string' && isNaN(Number(op.node.id))) {
              if (!op.node.nodeId) op.node.nodeId = op.node.id;
              op.node.id = null;
            }
            if (!op.node.nodeId) op.node.nodeId = generateNodeId();
            if (op.node.id == null) { op.node.id = data.nextNodeId || 1; data.nextNodeId = op.node.id + 1; }
            if (op.node.parentId == null) op.node.parentId = parent.id;
            if (op.node.level == null) op.node.level = (parent.level || 0) + 1;
            if (op.node.expanded == null) op.node.expanded = true;
            if (!op.node.children) op.node.children = [];
            if (op.node.x == null && parent.x != null) op.node.x = parent.x + 460;
            if (op.node.y == null && parent.y != null) {
              const siblingIndex = parent.children ? parent.children.length : 0;
              op.node.y = parent.y + (siblingIndex * 60);
            }
            if (!parent.children) parent.children = [];
            parent.children.push(op.node);
            if (op.node.id >= (data.nextNodeId || 0)) data.nextNodeId = op.node.id + 1;

            if (op.node.content) {
              const nodeTitle = (op.node.title || '').substring(0, 50).replace(UNSAFE_FILENAME_CHARS, '_');
              const htmlFileName = `${nodeTitle}[${op.node.nodeId}].html`;
              try {
                if (!fs.existsSync(contentDir)) fs.mkdirSync(contentDir, { recursive: true });
                fs.writeFileSync(path.join(contentDir, htmlFileName), op.node.content, 'utf-8');
              } catch (htmlErr) {
                logger.warn('[Skill API] PATCH add: .html 저장 실패', { error: htmlErr.message });
              }
              op.node.path = htmlFileName;
              delete op.node.content;
            }
            appliedCount++;
            newNodeIds.push(op.node.nodeId);
          }
          break;
        }
        case 'delete': {
          const removed = removeNode(data.mindMapData, op.nodeId);
          if (removed) appliedCount++;
          break;
        }
        case 'move': {
          const movedNode = removeNode(data.mindMapData, op.nodeId);
          if (movedNode) {
            const newParent = findNodeById(data, op.newParentId);
            if (newParent) {
              if (!newParent.children) newParent.children = [];
              const idx = op.index !== undefined ? op.index : newParent.children.length;
              newParent.children.splice(idx, 0, movedNode);
              appliedCount++;
            }
          }
          break;
        }
      }
    }

    // 중복 ID 보정
    const seenIds = new Map();
    let maxId = 0;
    const collectIds = (nodes) => {
      for (const node of (nodes || [])) {
        if (typeof node.id === 'number' && node.id > maxId) maxId = node.id;
        if (seenIds.has(node.id)) {
          const newId = maxId + 1;
          maxId = newId;
          node.id = newId;
          if (node.children) node.children.forEach(child => { child.parentId = newId; });
        }
        seenIds.set(node.id, node);
        if (node.children?.length > 0) collectIds(node.children);
      }
    };
    collectIds(data.mindMapData);
    if (!data.nextNodeId || data.nextNodeId <= maxId) data.nextNodeId = maxId + 1;

    fs.writeFileSync(jsonFilePath, JSON.stringify(data, null, 2), 'utf-8');

    logger.info('[Skill API] PATCH 적용', { username, mindmapId, applied: appliedCount, total: operations.length });

    res.json({ success: true, applied: appliedCount, total: operations.length, newNodeIds });
  } catch (error) {
    logger.error('[Skill API] PATCH 오류:', error);
    res.status(500).json({ success: false, error: '마인드맵 수정 중 오류가 발생했습니다.', code: 'INTERNAL_ERROR' });
  }
});

// ══════════════════════════════════════════════════════
// PUT /mindmap/:mindmapId - 마인드맵 전체 저장
// ══════════════════════════════════════════════════════

router.put('/mindmap/:mindmapId', requireAccessKey, requirePermission('write'), skillJsonParser('5mb'), async (req, res) => {
  try {
    const mindmapId = decodeURIComponent(req.params.mindmapId);
    const { username } = req.accessKey;

    if (!checkMindmapAccess(req.accessKey, mindmapId)) {
      return res.status(403).json({ success: false, error: '이 마인드맵에 대한 접근 권한이 없습니다.', code: 'MINDMAP_ACCESS_DENIED' });
    }

    const { data, options = {} } = req.body;
    if (!data?.mindMapData || !Array.isArray(data.mindMapData)) {
      return res.status(400).json({ success: false, error: 'data.mindMapData 배열이 필요합니다.', code: 'VALIDATION_ERROR' });
    }

    // ★ DB에서 사용자 경로 조회
    const userPath = await getUserAbsPath(username);
    const mindmapDir = path.join(userPath, mindmapId);
    const jsonFilePath = path.join(mindmapDir, `${mindmapId}.json`);

    const exists = fs.existsSync(jsonFilePath);
    if (exists && options.overwrite === false) {
      return res.status(409).json({ success: false, error: '이미 존재하는 마인드맵입니다. overwrite: true로 설정하세요.', code: 'ALREADY_EXISTS' });
    }

    data.mindMapData.forEach(rootNode => sanitizeNodePaths(rootNode));

    if (options.preserveContent && exists) {
      try {
        const existingData = JSON.parse(fs.readFileSync(jsonFilePath, 'utf-8'));
        if (existingData.mindMapData && data.mindMapData) mergeAttachments(data.mindMapData, existingData.mindMapData);
      } catch { /* 무시 */ }
    }

    if (!fs.existsSync(mindmapDir)) fs.mkdirSync(mindmapDir, { recursive: true });
    fs.writeFileSync(jsonFilePath, JSON.stringify(data, null, 2), 'utf-8');

    const nodeCount = countNodes(data);
    logger.info('[Skill API] 마인드맵 구조 저장', { username, mindmapId, nodeCount });

    res.json({
      success: true,
      mindmapId,
      nodeCount,
      message: exists ? '마인드맵이 업데이트되었습니다.' : '마인드맵이 생성되었습니다.'
    });
  } catch (error) {
    logger.error('[Skill API] 마인드맵 저장 오류:', error);
    res.status(500).json({ success: false, error: '마인드맵 저장 중 오류가 발생했습니다.', code: 'SAVE_ERROR' });
  }
});

module.exports = router;
