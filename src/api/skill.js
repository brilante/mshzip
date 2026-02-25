'use strict';

/**
 * Skill API
 * Claude Code Agent Skills용 노드 데이터 접근 API
 *
 * 참고소스: G:\MyWrok\mymind3\src\api\skill.js (동등 수준 구현)
 * 적응: PostgreSQL → JSON 파일 기반, nodeIdLookup → 파일 스캔
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
 * X-Access-Key-Hash: <sha256-hash>  (권장)
 * Authorization: Bearer mym3_ak_xxxxx  (하위호환)
 *
 * @created 2026-02-25
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { validateAccessKey, checkIpWhitelist } = require('../utils/accessKey');
const storageService = require('../services/storage');
const UserIdEncoder = require('../utils/userIdEncoder');
const logger = require('../utils/logger');

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
      if (node.children && node.children.length > 0) {
        collectAttachments(node.children);
      }
    }
  }
  collectAttachments(existingNodes);

  function applyAttachments(nodes) {
    for (const node of nodes) {
      if (attachmentsMap.has(node.id) && !node.attachments) {
        node.attachments = attachmentsMap.get(node.id);
      }
      if (node.children && node.children.length > 0) {
        applyAttachments(node.children);
      }
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
      if (node.children && node.children.length > 0) {
        traverse(node.children);
      }
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
// 인증 미들웨어
// ══════════════════════════════════════════════════════

/**
 * Access Key 인증 미들웨어
 * X-Access-Key-Hash 또는 Authorization: Bearer 지원
 */
function requireAccessKey(req, res, next) {
  try {
    const keysData = loadKeysData();
    let keyRecord = null;
    let authMethod = null;

    // 방법 1: 해시 기반 인증 (권장)
    const keyHash = req.headers['x-access-key-hash'];
    if (keyHash) {
      authMethod = 'hash';
      keyRecord = keysData.keys.find(k => k.key_hash === keyHash && k.is_active === 1);

      if (!keyRecord) {
        return res.status(401).json({
          success: false,
          error: '유효하지 않은 Access Key 해시입니다.',
          code: 'INVALID_KEY_HASH'
        });
      }
    }

    // 방법 2: Bearer 토큰 인증 (하위호환)
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
        return res.status(401).json({
          success: false,
          error: validation.error,
          code: 'INVALID_KEY'
        });
      }

      keyRecord = keysData.keys.find(k => k.key_id === validation.payload.keyId && k.is_active === 1);
      if (!keyRecord) {
        return res.status(401).json({
          success: false,
          error: '유효하지 않은 Access Key입니다.',
          code: 'KEY_NOT_FOUND'
        });
      }
    }

    // 만료 검사
    if (keyRecord.expires_at) {
      const expiresDate = new Date(keyRecord.expires_at);
      if (expiresDate < new Date()) {
        return res.status(401).json({
          success: false,
          error: 'Access Key가 만료되었습니다.',
          code: 'KEY_EXPIRED'
        });
      }
    }

    // IP 화이트리스트 검사
    if (keyRecord.ip_whitelist) {
      const whitelist = typeof keyRecord.ip_whitelist === 'string'
        ? JSON.parse(keyRecord.ip_whitelist)
        : keyRecord.ip_whitelist;
      const clientIp = getClientIp(req);

      if (!checkIpWhitelist(clientIp, whitelist)) {
        logger.warn('[Skill API] IP 제한 위반', {
          keyId: keyRecord.id,
          clientIp,
          whitelist,
          authMethod
        });
        return res.status(403).json({
          success: false,
          error: '허용되지 않은 IP 주소입니다.',
          code: 'IP_RESTRICTED'
        });
      }
    }

    // last_used_at 갱신
    keyRecord.last_used_at = new Date().toISOString();
    saveKeysData(keysData);

    // 요청 객체에 키 정보 저장
    const username = keyRecord.user_id; // mymind3v0에서는 user_id가 username
    req.accessKey = {
      userId: keyRecord.user_id,
      username: username,
      scope: keyRecord.scope || 'whitelist',
      permission: keyRecord.permission,
      keyId: keyRecord.key_id,
      record: keyRecord
    };

    logger.info('[Skill API] 인증 성공', {
      keyId: keyRecord.id,
      authMethod,
      scope: req.accessKey.scope,
      username
    });

    next();
  } catch (error) {
    logger.error('[Skill API] 인증 오류:', error);
    res.status(500).json({
      success: false,
      error: '인증 처리 중 오류가 발생했습니다.',
      code: 'AUTH_ERROR'
    });
  }
}

/**
 * 권한 검사 미들웨어
 */
function requirePermission(permission) {
  return (req, res, next) => {
    if (permission === 'read') return next();
    if (permission === 'write' && req.accessKey.permission !== 'readwrite') {
      return res.status(403).json({
        success: false,
        error: '쓰기 권한이 없습니다.',
        code: 'PERMISSION_DENIED'
      });
    }
    next();
  };
}

/**
 * 마인드맵 접근 권한 검증
 */
function checkMindmapAccess(accessKey, mindmapId) {
  if (accessKey.scope === 'all') return true;

  // 키 레코드의 mindmap_id 필드 확인 (단일 마인드맵 키)
  if (accessKey.record.mindmap_id === mindmapId) return true;

  // scope='whitelist'인데 일치하지 않으면 거부
  return false;
}

// ── 사용자 폴더 찾기 ──

/**
 * 사용자 폴더 찾기 (1차: UserIdEncoder, 2차: .userid 마커 전체 스캔)
 * mymind3v0에서는 세션 userId(dev)와 Access Key userId(bril)가 다를 수 있으므로
 * 폴더가 비어있거나 마인드맵이 없으면 전체 save 폴더를 스캔
 */
function getUserFolder(username) {
  const folder = UserIdEncoder.findUserFolderSync(username, SAVE_PATH);
  const userPath = path.join(SAVE_PATH, folder);

  // 해당 폴더가 존재하고 마인드맵이 있으면 사용
  if (fs.existsSync(userPath)) {
    const subdirs = fs.readdirSync(userPath).filter(f => {
      try { return fs.statSync(path.join(userPath, f)).isDirectory(); }
      catch { return false; }
    });
    if (subdirs.length > 0) return folder;
  }

  // 폴더가 비어있거나 없으면 save 아래 모든 사용자 폴더 탐색
  // (세션 userId와 Access Key userId 불일치 대응)
  try {
    const allEntries = fs.readdirSync(SAVE_PATH, { withFileTypes: true });
    for (const entry of allEntries) {
      if (!entry.isDirectory() || entry.name.startsWith('_')) continue;
      const entryPath = path.join(SAVE_PATH, entry.name);
      const subdirs = fs.readdirSync(entryPath).filter(f => {
        try { return fs.statSync(path.join(entryPath, f)).isDirectory(); }
        catch { return false; }
      });
      if (subdirs.length > 0) {
        logger.info('[Skill API] 대체 사용자 폴더 사용', {
          requestedUser: username,
          actualFolder: entry.name
        });
        return entry.name;
      }
    }
  } catch { /* save 디렉토리 접근 실패 */ }

  return folder;
}

// ── 전체 마인드맵에서 노드 탐색 (GET /node/:nodeId용) ──

function findNodeInAllMindmaps(username, nodeId) {
  const userFolder = getUserFolder(username);
  const userPath = path.join(SAVE_PATH, userFolder);

  if (!fs.existsSync(userPath)) return null;

  const folders = fs.readdirSync(userPath).filter(f => {
    try {
      return fs.statSync(path.join(userPath, f)).isDirectory();
    } catch { return false; }
  });

  for (const mindmapId of folders) {
    const jsonPath = path.join(userPath, mindmapId, `${mindmapId}.json`);
    if (!fs.existsSync(jsonPath)) continue;

    try {
      const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
      const node = findNodeById(data, nodeId);
      if (node) return { mindmapId, data, node };
    } catch { /* JSON 파싱 실패 무시 */ }
  }

  return null;
}

// ── JSON attachments 배열 갱신 ──

function addAttachmentToNode(mindmapJsonPath, nodeId, fileInfo) {
  try {
    const mindmapData = JSON.parse(fs.readFileSync(mindmapJsonPath, 'utf-8'));
    const node = findNodeById(mindmapData, nodeId);
    if (!node) return false;

    if (!Array.isArray(node.attachments)) node.attachments = [];

    const existingIdx = node.attachments.findIndex(a => a.name === fileInfo.name);
    if (existingIdx >= 0) {
      node.attachments[existingIdx] = fileInfo;
    } else {
      node.attachments.push(fileInfo);
    }

    fs.writeFileSync(mindmapJsonPath, JSON.stringify(mindmapData, null, 2), 'utf-8');
    return true;
  } catch (error) {
    logger.warn('[Skill API] attachments 갱신 실패:', error.message);
    return false;
  }
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

    const userFolder = getUserFolder(username);
    const userPath = path.join(SAVE_PATH, userFolder);

    if (!fs.existsSync(userPath)) {
      return res.json({ success: true, mindmaps: [] });
    }

    // 사용자 폴더의 모든 마인드맵 폴더 나열
    const allFolders = fs.readdirSync(userPath).filter(f => {
      try {
        return fs.statSync(path.join(userPath, f)).isDirectory();
      } catch { return false; }
    });

    let accessibleMindmaps;
    if (scope === 'all') {
      accessibleMindmaps = allFolders;
    } else {
      // 화이트리스트: 키의 mindmap_id만
      const allowed = req.accessKey.record.mindmap_id;
      accessibleMindmaps = allowed ? allFolders.filter(m => m === allowed) : [];
    }

    // 마인드맵 정보 구성
    const mindmaps = [];
    for (const id of accessibleMindmaps) {
      let name = id;
      const jsonPath = path.join(userPath, id, `${id}.json`);
      if (fs.existsSync(jsonPath)) {
        try {
          const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
          if (data.name) name = data.name;
          else if (data.mindMapData?.[0]?.title) name = data.mindMapData[0].title;
          else if (Array.isArray(data) && data[0]?.text) name = data[0].text;
        } catch { /* 무시 */ }
      }
      mindmaps.push({ id, name });
    }

    logger.info('[Skill API] 마인드맵 목록 조회', {
      keyId: req.accessKey.keyId,
      scope,
      count: mindmaps.length
    });

    res.json({ success: true, mindmaps });
  } catch (error) {
    logger.error('[Skill API] 마인드맵 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '마인드맵 목록 조회 중 오류가 발생했습니다.',
      code: 'INTERNAL_ERROR'
    });
  }
});

// ══════════════════════════════════════════════════════
// 노드 조회 내부 핸들러
// ══════════════════════════════════════════════════════

async function handleNodeRead(req, res, mindmapId, nodeId) {
  const { username } = req.accessKey;

  // 마인드맵 접근 권한 확인
  if (!checkMindmapAccess(req.accessKey, mindmapId)) {
    return res.status(403).json({
      success: false,
      error: '이 마인드맵에 대한 접근 권한이 없습니다.',
      code: 'MINDMAP_ACCESS_DENIED'
    });
  }

  // 마인드맵 데이터 로드
  const userFolder = getUserFolder(username);
  const contentDir = path.join(SAVE_PATH, userFolder, mindmapId);
  const mindmapJsonPath = path.join(contentDir, `${mindmapId}.json`);

  if (!fs.existsSync(mindmapJsonPath)) {
    return res.status(404).json({
      success: false,
      error: '마인드맵을 찾을 수 없습니다.',
      code: 'MINDMAP_NOT_FOUND'
    });
  }

  let mindmapData;
  try {
    mindmapData = JSON.parse(fs.readFileSync(mindmapJsonPath, 'utf-8'));
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: '마인드맵 데이터를 읽을 수 없습니다.',
      code: 'READ_ERROR'
    });
  }

  // 노드 찾기
  const node = findNodeById(mindmapData, nodeId);
  if (!node) {
    return res.status(404).json({
      success: false,
      error: '노드를 찾을 수 없습니다.',
      code: 'NODE_NOT_FOUND'
    });
  }

  // 노드 콘텐츠 로드
  let nodeContentText = null;

  // title[nodeId].html 패턴 파일 찾기
  let htmlFilePath = null;
  if (fs.existsSync(contentDir)) {
    const matchingFiles = fs.readdirSync(contentDir).filter(f => f.endsWith(`[${nodeId}].html`));
    if (matchingFiles.length > 0) {
      htmlFilePath = path.join(contentDir, matchingFiles[0]);
    }
  }

  // nodeId.html 폴백
  if (!htmlFilePath) {
    const directPath = path.join(contentDir, `${nodeId}.html`);
    if (fs.existsSync(directPath)) {
      htmlFilePath = directPath;
    }
  }

  if (htmlFilePath && fs.existsSync(htmlFilePath)) {
    nodeContentText = fs.readFileSync(htmlFilePath, 'utf-8');
  } else {
    // 레거시 JSON 폴백
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
  const nodeFolder = path.join(contentDir, nodeId);
  if (fs.existsSync(nodeFolder) && fs.statSync(nodeFolder).isDirectory()) {
    const files = fs.readdirSync(nodeFolder).filter(f => !isExecutableFile(f));
    for (const file of files) {
      const filePath = path.join(nodeFolder, file);
      try {
        if (!fs.statSync(filePath).isFile()) continue;
      } catch { continue; }

      const ext = path.extname(file).toLowerCase();
      const textExts = ['.md', '.txt', '.html', '.css', '.js', '.json', '.csv', '.xml', '.yaml', '.yml', '.sql', '.py', '.sh'];
      if (textExts.includes(ext)) {
        attachments.push({
          name: file,
          type: ext.substring(1),
          size: fs.statSync(filePath).size,
          content: fs.readFileSync(filePath, 'utf-8')
        });
      } else {
        attachments.push({
          name: file,
          type: ext.substring(1),
          size: fs.statSync(filePath).size,
          content: null
        });
      }
    }
  }

  // title[nodeId]/ 패턴 폴더도 확인 (참고소스 호환)
  if (fs.existsSync(contentDir)) {
    const nodeTitle = (node.title || '').substring(0, 50).replace(UNSAFE_FILENAME_CHARS, '_');
    const altFolder = path.join(contentDir, `${nodeTitle}[${nodeId}]`);
    if (altFolder !== nodeFolder && fs.existsSync(altFolder) && fs.statSync(altFolder).isDirectory()) {
      const files = fs.readdirSync(altFolder).filter(f => !isExecutableFile(f));
      for (const file of files) {
        if (attachments.find(a => a.name === file)) continue;
        const filePath = path.join(altFolder, file);
        try {
          if (!fs.statSync(filePath).isFile()) continue;
        } catch { continue; }

        const ext = path.extname(file).toLowerCase();
        const textExts = ['.md', '.txt', '.html', '.css', '.js', '.json', '.csv', '.xml', '.yaml', '.yml', '.sql', '.py', '.sh'];
        if (textExts.includes(ext)) {
          attachments.push({
            name: file,
            type: ext.substring(1),
            size: fs.statSync(filePath).size,
            content: fs.readFileSync(filePath, 'utf-8')
          });
        } else {
          attachments.push({
            name: file,
            type: ext.substring(1),
            size: fs.statSync(filePath).size,
            content: null
          });
        }
      }
    }
  }

  logger.info('[Skill API] 노드 조회', {
    keyId: req.accessKey.keyId,
    mindmapId,
    nodeId
  });

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
      attachments: attachments
    }
  });
}

// ══════════════════════════════════════════════════════
// 노드 수정 내부 핸들러
// ══════════════════════════════════════════════════════

async function handleNodeWrite(req, res, mindmapId, nodeId) {
  const { username } = req.accessKey;
  const { append, content, filename } = req.body || {};

  // body 검증
  if (append === undefined && content === undefined) {
    return res.status(400).json({
      success: false,
      error: 'append 또는 content 필드가 필요합니다.',
      code: 'EMPTY_BODY',
      hint: '요청 body에 { "append": "내용" } 또는 { "content": "내용" }을 포함하세요.'
    });
  }

  // 마인드맵 접근 권한 확인
  if (!checkMindmapAccess(req.accessKey, mindmapId)) {
    return res.status(403).json({
      success: false,
      error: '이 마인드맵에 대한 접근 권한이 없습니다.',
      code: 'MINDMAP_ACCESS_DENIED'
    });
  }

  // 마인드맵 파일 확인
  const userFolder = getUserFolder(username);
  const contentDir = path.join(SAVE_PATH, userFolder, mindmapId);
  const mindmapJsonPath = path.join(contentDir, `${mindmapId}.json`);

  if (!fs.existsSync(mindmapJsonPath)) {
    return res.status(404).json({
      success: false,
      error: '마인드맵을 찾을 수 없습니다.',
      code: 'MINDMAP_NOT_FOUND'
    });
  }

  // filename이 있으면 첨부 파일 모드
  if (filename) {
    if (isExecutableFile(filename)) {
      return res.status(400).json({
        success: false,
        error: '실행파일은 첨부할 수 없습니다.',
        code: 'EXECUTABLE_NOT_ALLOWED'
      });
    }

    const sanitizedFilename = filename.replace(/[<>:"/\\|?*]/g, '_');
    const mdFilename = sanitizedFilename.endsWith('.md') ? sanitizedFilename : `${sanitizedFilename}.md`;
    const nodeFolder = path.join(contentDir, nodeId);
    if (!fs.existsSync(nodeFolder)) {
      fs.mkdirSync(nodeFolder, { recursive: true });
    }

    const mdFilePath = path.join(nodeFolder, mdFilename);
    if (append) {
      const timestamp = new Date().toISOString();
      const appendText = `\n\n---\n[${timestamp}] Agent Skill 기록:\n${append}`;
      const existing = fs.existsSync(mdFilePath) ? fs.readFileSync(mdFilePath, 'utf-8') : '';
      fs.writeFileSync(mdFilePath, existing + appendText, 'utf-8');
    } else if (content !== undefined) {
      fs.writeFileSync(mdFilePath, content, 'utf-8');
    }

    // attachments 배열 갱신
    const fileStats = fs.statSync(mdFilePath);
    addAttachmentToNode(mindmapJsonPath, nodeId, {
      name: mdFilename,
      type: 'md',
      size: fileStats.size,
      uploadedAt: new Date().toISOString()
    });

    logger.info('[Skill API] 노드 첨부파일 저장', {
      keyId: req.accessKey.keyId,
      mindmapId, nodeId,
      filename: mdFilename,
      mode: append ? 'append' : 'overwrite'
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
    if (matchingFiles.length > 0) {
      htmlFilePath = path.join(contentDir, matchingFiles[0]);
    }
  }

  // nodeId.html 폴백
  if (!htmlFilePath) {
    const directPath = path.join(contentDir, `${nodeId}.html`);
    if (fs.existsSync(directPath)) {
      htmlFilePath = directPath;
    }
  }

  // 파일이 없으면 JSON에서 노드 title로 새 파일명 생성
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

  // 기존 콘텐츠 로드
  let existingContent = '';
  if (fs.existsSync(htmlFilePath)) {
    existingContent = fs.readFileSync(htmlFilePath, 'utf-8');
  }

  // 추가 또는 덮어쓰기
  if (append) {
    const timestamp = new Date().toISOString();
    existingContent = existingContent + `\n\n<hr>\n<p><strong>[${timestamp}] Agent Skill 기록:</strong></p>\n${append}`;
  } else if (content !== undefined) {
    existingContent = content;
  }

  // 디렉토리 확인 후 저장
  const dir = path.dirname(htmlFilePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(htmlFilePath, existingContent, 'utf-8');

  const bytesWritten = Buffer.byteLength(existingContent, 'utf-8');
  logger.info('[Skill API] 노드 HTML 파일 저장', {
    keyId: req.accessKey.keyId,
    mindmapId, nodeId,
    mode: append ? 'append' : 'overwrite',
    bytesWritten
  });

  res.json({
    success: true,
    message: '노드가 업데이트되었습니다.',
    mindmapId, nodeId,
    filePath: path.basename(htmlFilePath),
    bytesWritten
  });
}

// ══════════════════════════════════════════════════════
// GET /node/:mindmapId/:nodeId - 노드 조회 (mindmapId 지정)
// ══════════════════════════════════════════════════════

router.get('/node/:mindmapId/:nodeId',
  requireAccessKey,
  requirePermission('read'),
  async (req, res) => {
    try {
      const { mindmapId, nodeId } = req.params;
      await handleNodeRead(req, res, decodeURIComponent(mindmapId), nodeId);
    } catch (error) {
      logger.error('[Skill API] 노드 조회 오류:', error);
      res.status(500).json({
        success: false,
        error: '노드 조회 중 오류가 발생했습니다.',
        code: 'INTERNAL_ERROR'
      });
    }
  }
);

// ══════════════════════════════════════════════════════
// GET /node/:nodeId - 노드 조회 (마인드맵 자동 탐색)
// ══════════════════════════════════════════════════════

router.get('/node/:nodeId',
  requireAccessKey,
  requirePermission('read'),
  async (req, res) => {
    try {
      const { nodeId } = req.params;
      const { username, scope } = req.accessKey;

      // scope='all': 전체 마인드맵에서 노드 탐색
      if (scope === 'all') {
        const result = findNodeInAllMindmaps(username, nodeId);
        if (result) {
          return handleNodeRead(req, res, result.mindmapId, nodeId);
        }
        return res.status(404).json({
          success: false,
          error: '노드를 찾을 수 없습니다.',
          code: 'NODE_NOT_FOUND'
        });
      }

      // scope='whitelist': 키의 mindmap_id에서만 검색
      const mindmapId = req.accessKey.record.mindmap_id;
      if (mindmapId) {
        return handleNodeRead(req, res, mindmapId, nodeId);
      }

      return res.status(400).json({
        success: false,
        error: 'mindmapId를 지정해주세요. (GET /api/skill/node/:mindmapId/:nodeId)',
        code: 'MINDMAP_ID_REQUIRED',
        hint: '접근 가능한 마인드맵 목록: GET /api/skill/mindmaps'
      });
    } catch (error) {
      logger.error('[Skill API] 노드 조회 오류:', error);
      res.status(500).json({
        success: false,
        error: '노드 조회 중 오류가 발생했습니다.',
        code: 'INTERNAL_ERROR'
      });
    }
  }
);

// ══════════════════════════════════════════════════════
// PUT /node/:mindmapId/:nodeId - 노드 수정 (mindmapId 지정)
// ══════════════════════════════════════════════════════

router.put('/node/:mindmapId/:nodeId',
  requireAccessKey,
  requirePermission('write'),
  express.json({ limit: '1mb' }),
  async (req, res) => {
    try {
      const { mindmapId, nodeId } = req.params;
      await handleNodeWrite(req, res, decodeURIComponent(mindmapId), nodeId);
    } catch (error) {
      logger.error('[Skill API] 노드 수정 오류:', error);
      res.status(500).json({
        success: false,
        error: '노드 수정 중 오류가 발생했습니다.',
        code: 'INTERNAL_ERROR'
      });
    }
  }
);

// ══════════════════════════════════════════════════════
// PUT /node/:nodeId - 노드 수정 (마인드맵 자동 탐색)
// ══════════════════════════════════════════════════════

router.put('/node/:nodeId',
  requireAccessKey,
  requirePermission('write'),
  express.json({ limit: '1mb' }),
  async (req, res) => {
    try {
      const { nodeId } = req.params;
      const { username, scope } = req.accessKey;

      if (scope === 'all') {
        const result = findNodeInAllMindmaps(username, nodeId);
        if (result) {
          return handleNodeWrite(req, res, result.mindmapId, nodeId);
        }
        return res.status(404).json({
          success: false,
          error: '노드를 찾을 수 없습니다.',
          code: 'NODE_NOT_FOUND'
        });
      }

      const mindmapId = req.accessKey.record.mindmap_id;
      if (mindmapId) {
        return handleNodeWrite(req, res, mindmapId, nodeId);
      }

      return res.status(400).json({
        success: false,
        error: 'mindmapId를 지정해주세요.',
        code: 'MINDMAP_ID_REQUIRED'
      });
    } catch (error) {
      logger.error('[Skill API] 노드 수정 오류:', error);
      res.status(500).json({
        success: false,
        error: '노드 수정 중 오류가 발생했습니다.',
        code: 'INTERNAL_ERROR'
      });
    }
  }
);

// ══════════════════════════════════════════════════════
// PATCH /mindmap/:mindmapId - 마인드맵 CRUD
// ══════════════════════════════════════════════════════

router.patch('/mindmap/:mindmapId',
  requireAccessKey,
  requirePermission('write'),
  express.json({ limit: '1mb' }),
  async (req, res) => {
    try {
      const { mindmapId: rawMindmapId } = req.params;
      const mindmapId = decodeURIComponent(rawMindmapId);
      const { username } = req.accessKey;
      const { operations } = req.body;

      if (!checkMindmapAccess(req.accessKey, mindmapId)) {
        return res.status(403).json({
          success: false,
          error: '이 마인드맵에 대한 접근 권한이 없습니다.',
          code: 'MINDMAP_ACCESS_DENIED'
        });
      }

      if (!Array.isArray(operations) || operations.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'operations 배열이 필요합니다.',
          code: 'VALIDATION_ERROR'
        });
      }

      const validOps = ['update', 'add', 'delete', 'move'];
      for (const op of operations) {
        if (!validOps.includes(op.op)) {
          return res.status(400).json({
            success: false,
            error: `유효하지 않은 operation: ${op.op}`,
            code: 'VALIDATION_ERROR'
          });
        }
      }

      // 마인드맵 로드
      const userFolder = getUserFolder(username);
      const contentDir = path.join(SAVE_PATH, userFolder, mindmapId);
      const jsonFilePath = path.join(contentDir, `${mindmapId}.json`);

      if (!fs.existsSync(jsonFilePath)) {
        return res.status(404).json({
          success: false,
          error: '마인드맵을 찾을 수 없습니다.',
          code: 'MINDMAP_NOT_FOUND'
        });
      }

      const data = JSON.parse(fs.readFileSync(jsonFilePath, 'utf-8'));

      if (!data.mindMapData || !Array.isArray(data.mindMapData)) {
        return res.status(400).json({
          success: false,
          error: '잘못된 마인드맵 데이터 구조입니다.',
          code: 'INVALID_DATA'
        });
      }

      let appliedCount = 0;

      for (const op of operations) {
        switch (op.op) {
          case 'update': {
            const node = findNodeById(data, op.nodeId);
            if (node && op.changes) {
              Object.assign(node, op.changes);
              appliedCount++;
            }
            break;
          }
          case 'add': {
            const parent = findNodeById(data, op.parentId);
            if (parent && op.node) {
              // text → title 정규화
              if (!op.node.title && op.node.text) {
                op.node.title = op.node.text;
                delete op.node.text;
              }
              // id/nodeId 정규화
              if (op.node.id != null && typeof op.node.id === 'string' && isNaN(Number(op.node.id))) {
                if (!op.node.nodeId) op.node.nodeId = op.node.id;
                op.node.id = null;
              }
              // nodeId 자동 생성
              if (!op.node.nodeId) {
                op.node.nodeId = generateNodeId();
              }
              // 필수 속성 자동 채우기
              if (op.node.id == null) {
                op.node.id = data.nextNodeId || 1;
                data.nextNodeId = op.node.id + 1;
              }
              if (op.node.parentId == null) op.node.parentId = parent.id;
              if (op.node.level == null) op.node.level = (parent.level || 0) + 1;
              if (op.node.expanded == null) op.node.expanded = true;
              if (!op.node.children) op.node.children = [];
              // 좌표 기본값
              if (op.node.x == null && parent.x != null) op.node.x = parent.x + 460;
              if (op.node.y == null && parent.y != null) {
                const siblingIndex = parent.children ? parent.children.length : 0;
                op.node.y = parent.y + (siblingIndex * 60);
              }
              if (!parent.children) parent.children = [];
              parent.children.push(op.node);
              if (op.node.id >= (data.nextNodeId || 0)) {
                data.nextNodeId = op.node.id + 1;
              }
              // content가 있으면 .html 파일로 즉시 저장
              if (op.node.content) {
                const nodeTitle = (op.node.title || '').substring(0, 50).replace(UNSAFE_FILENAME_CHARS, '_');
                const htmlFileName = `${nodeTitle}[${op.node.nodeId}].html`;
                try {
                  if (!fs.existsSync(contentDir)) {
                    fs.mkdirSync(contentDir, { recursive: true });
                  }
                  fs.writeFileSync(path.join(contentDir, htmlFileName), op.node.content, 'utf-8');
                  logger.info('[Skill API] PATCH add: 노드 콘텐츠 .html 저장', {
                    nodeId: op.node.nodeId, htmlFileName
                  });
                } catch (htmlErr) {
                  logger.warn('[Skill API] PATCH add: .html 저장 실패', { error: htmlErr.message });
                }
                op.node.path = htmlFileName;
                delete op.node.content;
              }
              appliedCount++;
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

      // 중복 ID 수정 + nextNodeId 보정
      const seenIds = new Map();
      let maxId = 0;
      const collectIds = (nodes) => {
        for (const node of (nodes || [])) {
          if (typeof node.id === 'number' && node.id > maxId) maxId = node.id;
          if (seenIds.has(node.id)) {
            const newId = maxId + 1;
            maxId = newId;
            node.id = newId;
            if (node.children) {
              node.children.forEach(child => { child.parentId = newId; });
            }
          }
          seenIds.set(node.id, node);
          if (node.children?.length > 0) collectIds(node.children);
        }
      };
      collectIds(data.mindMapData);
      if (!data.nextNodeId || data.nextNodeId <= maxId) {
        data.nextNodeId = maxId + 1;
      }

      // JSON 저장
      fs.writeFileSync(jsonFilePath, JSON.stringify(data, null, 2), 'utf-8');

      logger.info('[Skill API] PATCH 적용', {
        keyId: req.accessKey.keyId,
        mindmapId,
        applied: appliedCount,
        total: operations.length
      });

      res.json({
        success: true,
        applied: appliedCount,
        total: operations.length
      });
    } catch (error) {
      logger.error('[Skill API] PATCH 오류:', error);
      res.status(500).json({
        success: false,
        error: '마인드맵 수정 중 오류가 발생했습니다.',
        code: 'INTERNAL_ERROR'
      });
    }
  }
);

// ══════════════════════════════════════════════════════
// PUT /mindmap/:mindmapId - 마인드맵 전체 저장
// ══════════════════════════════════════════════════════

router.put('/mindmap/:mindmapId',
  requireAccessKey,
  requirePermission('write'),
  express.json({ limit: '5mb' }),
  async (req, res) => {
    try {
      const { mindmapId: rawMindmapId } = req.params;
      const mindmapId = decodeURIComponent(rawMindmapId);
      const { username } = req.accessKey;

      if (!checkMindmapAccess(req.accessKey, mindmapId)) {
        return res.status(403).json({
          success: false,
          error: '이 마인드맵에 대한 접근 권한이 없습니다.',
          code: 'MINDMAP_ACCESS_DENIED'
        });
      }

      const { data, options = {} } = req.body;
      if (!data) {
        return res.status(400).json({
          success: false,
          error: 'data 필드가 필요합니다.',
          code: 'VALIDATION_ERROR'
        });
      }

      if (!data.mindMapData || !Array.isArray(data.mindMapData)) {
        return res.status(400).json({
          success: false,
          error: 'data.mindMapData 배열이 필요합니다.',
          code: 'VALIDATION_ERROR'
        });
      }

      const userFolder = getUserFolder(username);
      const mindmapDir = path.join(SAVE_PATH, userFolder, mindmapId);
      const jsonFilePath = path.join(mindmapDir, `${mindmapId}.json`);

      const exists = fs.existsSync(jsonFilePath);
      if (exists && options.overwrite === false) {
        return res.status(409).json({
          success: false,
          error: '이미 존재하는 마인드맵입니다. overwrite: true로 설정하세요.',
          code: 'ALREADY_EXISTS'
        });
      }

      // 노드 경로 정리
      data.mindMapData.forEach(rootNode => sanitizeNodePaths(rootNode));

      // attachments 병합
      if (options.preserveContent && exists) {
        try {
          const existingData = JSON.parse(fs.readFileSync(jsonFilePath, 'utf-8'));
          if (existingData.mindMapData && data.mindMapData) {
            mergeAttachments(data.mindMapData, existingData.mindMapData);
          }
        } catch { /* 무시 */ }
      }

      // 디렉토리 생성
      if (!fs.existsSync(mindmapDir)) {
        fs.mkdirSync(mindmapDir, { recursive: true });
      }

      // JSON 저장
      fs.writeFileSync(jsonFilePath, JSON.stringify(data, null, 2), 'utf-8');

      const nodeCount = countNodes(data);
      logger.info('[Skill API] 마인드맵 구조 저장', {
        keyId: req.accessKey.keyId,
        mindmapId,
        nodeCount,
        overwrite: exists
      });

      res.json({
        success: true,
        mindmapId,
        nodeCount,
        message: exists ? '마인드맵이 업데이트되었습니다.' : '마인드맵이 생성되었습니다.'
      });
    } catch (error) {
      logger.error('[Skill API] 마인드맵 저장 오류:', error);
      res.status(500).json({
        success: false,
        error: '마인드맵 저장 중 오류가 발생했습니다.',
        code: 'SAVE_ERROR'
      });
    }
  }
);

module.exports = router;
