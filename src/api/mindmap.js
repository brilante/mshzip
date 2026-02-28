'use strict';

/**
 * 마인드맵 API Router
 * 참고: mymind3 본체의 mindmap/crud.js + nodes/index.js 통합
 *
 * 라우트 목록:
 * - POST   /api/save            - 마인드맵 전체 저장
 * - POST   /api/savenode        - 노드 콘텐츠 저장
 * - GET    /api/savelist        - 저장 목록 조회
 * - GET    /api/load            - 마인드맵 로드
 * - DELETE /api/deletefolder    - 폴더 삭제
 * - GET    /api/mindmap/children - 노드 하위 조회
 * - GET    /api/loadnode        - 노드 콘텐츠 로드
 * - POST   /api/deletenode      - 노드 및 관련 파일 삭제
 * - POST   /api/mindmap/rename-folder - 폴더 이름 변경
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const storageService = require('../services/storage');
const UserIdEncoder = require('../utils/userIdEncoder');
const logger = require('../utils/logger');

// ── 보안: 입력값 검증 유틸리티 ──

const MAX_BASE64_SIZE = 10 * 1024 * 1024; // 10MB
const SAFE_NAME_REGEX = /^[a-zA-Z0-9가-힣ㄱ-ㅎㅏ-ㅣ\s_\-().+[\]]+$/;
// eslint-disable-next-line no-control-regex
const UNSAFE_FILENAME_CHARS = /[<>:"/\\|?*\x00-\x1F]/g;

function sanitizeTitle(title) {
  if (!title || typeof title !== 'string') return '';
  let safe = title.replace(/\.\./g, '_').replace(/[/\\]/g, '_');
  // 대괄호 제거 ([nodeId] 패턴과 혼동 방지)
  safe = safe.replace(/[[\]]/g, '_');
  safe = safe.replace(UNSAFE_FILENAME_CHARS, '_').trim();
  // 선행 마침표 제거 (숨김 파일 방지)
  safe = safe.replace(/^\.+/, '_');
  return safe.substring(0, 50);
}

function validateFolderName(name) {
  if (!name || typeof name !== 'string') return false;
  if (name.includes('..') || name.includes('/') || name.includes('\\')) return false;
  if (name.length > 200) return false;
  return SAFE_NAME_REGEX.test(name.trim());
}

function validateNodeId(nodeId) {
  if (!nodeId) return false;
  const id = String(nodeId);
  if (id.includes('..') || id.includes('/') || id.includes('\\')) return false;
  if (id.length > 50) return false;
  return /^[a-zA-Z0-9_-]+$/.test(id);
}

/**
 * 사용자 ID 추출 (세션에서)
 * @param {Object} req - Express request 객체
 * @returns {string} - 사용자 ID
 */
function getUserId(req) {
  // 1. 직접 설정된 세션 userId (ID/PW 로그인, Google OAuth 콜백 모두 설정)
  if (req.session && req.session.userId) {
    return req.session.userId;
  }
  // 2. Passport 세션 (serializeUser가 문자열 저장)
  if (req.session && req.session.passport && req.session.passport.user) {
    const passportUser = req.session.passport.user;
    // serializeUser가 username 문자열을 저장하므로 타입 확인
    if (typeof passportUser === 'string') return passportUser;
    if (passportUser.username) return passportUser.username;
  }
  // 3. Passport가 deserialize한 req.user
  if (req.user && req.user.username) {
    return req.user.username;
  }
  // 로컬 개발용 기본값
  return 'dev';
}

/**
 * 노드 경로 정리 (content 제거, 기존 path 유지)
 */
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

/**
 * 기존 JSON의 attachments 정보를 새 데이터에 병합
 */
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

/**
 * 마인드맵 JSON에서 nodeId로 노드 검색 (재귀)
 */
function findNodeInMindmap(data, nodeId) {
  const nodes = data?.mindMapData || (Array.isArray(data) ? data : []);
  for (const node of nodes) {
    if (String(node.id) === String(nodeId) || node.nodeId === nodeId) return node;
    if (node.children && node.children.length > 0) {
      const found = findNodeInMindmap({ mindMapData: node.children }, nodeId);
      if (found) return found;
    }
  }
  return null;
}


// ══════════════════════════════════════════════════════
// POST /api/save - 마인드맵 전체 저장
// ══════════════════════════════════════════════════════

router.post('/save', express.json(), async (req, res) => {
  let { folderName, data } = req.body;
  const userId = getUserId(req);

  console.log('=== Mindmap Save API called ===');
  console.log('User ID:', userId);
  console.log('Folder name:', folderName);

  if (!folderName) return res.status(400).json({ error: 'Folder name required' });
  if (!data || typeof data !== 'object') {
    return res.status(400).json({ error: 'Invalid data: mindmap data is required' });
  }

  // 노드 경로 정리
  if (data.mindMapData) {
    data.mindMapData.forEach(rootNode => sanitizeNodePaths(rootNode));
  }

  try {
    // 서버 측 중복 폴더명 안전장치
    let actualFolder = folderName;
    try {
      const checkPath = `${folderName}/${folderName}.json`;
      const existingCheck = await storageService.loadFile(userId, checkPath);
      if (existingCheck) {
        const existingData = JSON.parse(existingCheck);
        const existingNodeId = existingData.mindMapData?.[0]?.nodeId;
        const newNodeId = data.mindMapData?.[0]?.nodeId;
        if (existingNodeId && newNodeId && existingNodeId !== newNodeId) {
          // 다른 마인드맵이 같은 폴더명 사용 중 → 자동 suffix
          let suffix = 2;
          let found = true;
          while (found) {
            const candidate = `${folderName} (${suffix})`;
            try {
              await storageService.loadFile(userId, `${candidate}/${candidate}.json`);
              suffix++;
            } catch {
              found = false;
              actualFolder = candidate;
            }
          }
          console.log(`[Save] 중복 폴더 감지: "${folderName}" → "${actualFolder}"`);
        }
      }
    } catch {
      // 기존 파일 없음 → 정상 진행 (새 폴더)
    }

    const jsonFileName = `${actualFolder}.json`;
    const filePath = `${actualFolder}/${jsonFileName}`;

    // 세션에 currentFolder 저장
    if (req.session) {
      req.session.currentFolder = actualFolder;
    }

    // 기존 JSON 읽어서 attachments 병합
    try {
      const existingContent = await storageService.loadFile(userId, filePath);
      if (existingContent) {
        const existingData = JSON.parse(existingContent);
        if (existingData.mindMapData && data.mindMapData) {
          mergeAttachments(data.mindMapData, existingData.mindMapData);
        }
      }
    } catch (readErr) {
      console.log('[Save] No existing file to merge attachments from');
    }

    const jsonContent = JSON.stringify(data, null, 2);
    await storageService.saveFile(userId, filePath, jsonContent);
    console.log(`JSON saved via StorageService: ${filePath}`);

    res.json({ success: true, path: filePath, actualFolder });
  } catch (err) {
    console.error('Save failed:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to save file', details: err.message });
  }
});


// ══════════════════════════════════════════════════════
// POST /api/savenode - 노드 콘텐츠 저장
// ══════════════════════════════════════════════════════

router.post('/savenode', express.json(), async (req, res) => {
  const { folder, folderName, nodeId, content, nodeName } = req.body;
  const userId = getUserId(req);
  const targetFolder = folder || folderName;

  console.log('[SaveNode] Received params:', {
    folder,
    folderName,
    nodeId,
    nodeName,
    contentLength: content?.length || 0
  });

  if (!targetFolder || !nodeId) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  // 보안: 입력값 검증 (Path Traversal 방지)
  if (!validateFolderName(targetFolder)) {
    console.warn(`[SaveNode] 잘못된 폴더명 차단: "${targetFolder}" from ${req.ip}`);
    return res.status(400).json({ error: 'Invalid folder name' });
  }
  if (!validateNodeId(nodeId)) {
    console.warn(`[SaveNode] 잘못된 nodeId 차단: "${nodeId}" from ${req.ip}`);
    return res.status(400).json({ error: 'Invalid nodeId' });
  }

  // 보안: Base64 이미지 크기 제한 (10MB)
  if (content && content.length > MAX_BASE64_SIZE) {
    console.warn(`[SaveNode] 콘텐츠 크기 초과: ${content.length} bytes from ${req.ip}`);
    return res.status(413).json({ error: 'Content too large (max 10MB)' });
  }

  try {
    let processedContent = content || '';

    // === 1단계: 파일 경로 결정 ===
    let filePath = null;
    const suffix = `[${nodeId}].html`;

    // 1차: 기존 title[nodeId].html 파일이 있으면 그대로 사용
    try {
      const files = await storageService.listFiles(userId, targetFolder);
      const matchedFile = files.find(f => !f.isDirectory && f.name.endsWith(suffix));
      if (matchedFile) {
        filePath = `${targetFolder}/${matchedFile.name}`;
      }
    } catch (e) { /* 폴더 미존재 등 */ }

    // 2차: 마인드맵 JSON에서 노드 title 읽어 새 파일명 생성
    if (!filePath) {
      try {
        const mindmapJsonPath = `${targetFolder}/${targetFolder}.json`;
        const jsonContent = await storageService.loadFile(userId, mindmapJsonPath);
        const mindmapData = JSON.parse(jsonContent);
        const node = findNodeInMindmap(mindmapData, nodeId);
        const nodeTitle = sanitizeTitle(node?.title) || sanitizeTitle(nodeName) || nodeId;
        filePath = `${targetFolder}/${nodeTitle}[${nodeId}].html`;
      } catch (e) {
        // 3차 폴백: nodeName 또는 nodeId를 title로 사용
        const fallbackTitle = sanitizeTitle(nodeName) || nodeId;
        filePath = `${targetFolder}/${fallbackTitle}[${nodeId}].html`;
      }
    }

    // === 2단계: 이미지 폴더명 결정 ===
    const htmlFileName = filePath.split('/').pop();
    const nodeImageFolder = htmlFileName.replace('.html', '');

    // === 2.5단계: 레거시 nodeId 전용 폴더 → title[nodeId] 리네임 ===
    if (nodeImageFolder !== nodeId) {
      try {
        const files = await storageService.listFiles(userId, targetFolder);
        const legacyFolder = files.find(f => f.isDirectory && f.name === nodeId);
        const newFolderExists = files.find(f => f.isDirectory && f.name === nodeImageFolder);
        if (legacyFolder && !newFolderExists) {
          await storageService.move(
            userId,
            `${targetFolder}/${nodeId}`,
            `${targetFolder}/${nodeImageFolder}`
          );
          console.log(`[SaveNode] 폴더 리네임: ${nodeId}/ → ${nodeImageFolder}/`);
          processedContent = processedContent.split(`${nodeId}/`).join(`${nodeImageFolder}/`);
        }
      } catch (renameErr) {
        console.warn(`[SaveNode] 폴더 리네임 실패 (무시):`, renameErr.message);
      }
    }

    let copiedImageCount = 0;

    // === 3단계: Q&A 이미지 복사 처리 ===
    const qaMatches = [];
    const qaPathRegex = /src="([^"]*_qa\/([^"]+))"/gi;
    let qaMatch;
    while ((qaMatch = qaPathRegex.exec(content || '')) !== null) {
      qaMatches.push({
        fullMatch: qaMatch[0],
        qaPath: qaMatch[1],
        fileName: qaMatch[2]
      });
    }

    for (const match of qaMatches) {
      try {
        let qaRelativePath = match.qaPath;
        try {
          qaRelativePath = decodeURIComponent(qaRelativePath);
        } catch (e) { }

        const qaPatternMatch = qaRelativePath.match(/(\w+_qa\/[^"'\s)]+)/);
        if (qaPatternMatch) {
          qaRelativePath = qaPatternMatch[1];
        }

        const sourcePath = `${targetFolder}/${qaRelativePath}`;
        const destPath = `${targetFolder}/${nodeImageFolder}/${match.fileName}`;

        const fileExists = await storageService.exists(userId, sourcePath);
        if (fileExists) {
          const imageData = await storageService.loadFile(userId, sourcePath, { binary: true });
          await storageService.saveFile(userId, destPath, imageData);
          const newPath = `${nodeImageFolder}/${match.fileName}`;
          processedContent = processedContent.replace(match.qaPath, newPath);
          copiedImageCount++;
        }
      } catch (copyErr) {
        console.error(`[SaveNode] 이미지 복사 실패:`, copyErr.message);
      }
    }

    await storageService.saveFile(userId, filePath, processedContent);

    const basePath = `/api/image/${encodeURIComponent(targetFolder)}/`;
    res.json({
      success: true,
      path: filePath,
      imagesProcessed: copiedImageCount,
      basePath,
      nodeImageFolder
    });
  } catch (err) {
    console.error('Failed to save node content:', err.message);
    res.status(500).json({ error: 'Failed to save node content', details: err.message });
  }
});


// ══════════════════════════════════════════════════════
// GET /api/savelist - 저장 목록 조회
// ══════════════════════════════════════════════════════

router.get('/savelist', async (req, res) => {
  const userId = getUserId(req);

  try {
    const files = await storageService.listFiles(userId, '');
    const folders = [];

    for (const entry of files) {
      if (!entry.isDirectory) continue;
      if (entry.name.startsWith('.') || entry.name.startsWith('_')) continue;

      const jsonPath = `${entry.name}/${entry.name}.json`;
      let title = entry.name;
      let updatedAt = entry.mtime?.toISOString() || null;

      try {
        const jsonContent = await storageService.loadFile(userId, jsonPath);
        const data = JSON.parse(jsonContent);
        title = data.mindMapData?.[0]?.title || entry.name;
        const info = await storageService.getFileInfo(userId, jsonPath);
        updatedAt = info.mtime?.toISOString() || updatedAt;
      } catch (e) {
        // JSON 읽기 실패 → 폴더명 사용
      }

      folders.push({ folder: entry.name, title, updatedAt });
    }

    // 최근 수정 순 정렬
    folders.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));

    res.json({ success: true, folders });
  } catch (err) {
    console.error('[/api/savelist] Error:', err.message);
    res.json({ success: false, error: err.message, folders: [] });
  }
});


// ══════════════════════════════════════════════════════
// GET /api/load - 마인드맵 로드
// ══════════════════════════════════════════════════════

router.get('/load', async (req, res) => {
  const folder = req.query.folder;
  const userId = getUserId(req);

  if (!folder) {
    return res.status(400).json({ error: 'Folder parameter required' });
  }

  // 세션에 currentFolder 저장
  if (req.session) {
    req.session.currentFolder = folder;
  }

  try {
    const files = await storageService.listFiles(userId, folder);
    const fileNames = files
      .filter(f => !f.isDirectory && f.type !== 'directory')
      .map(f => f.name);

    let jsonFileName = fileNames.find(f => f === `${folder}.json`);
    if (!jsonFileName) {
      jsonFileName = fileNames.find(f => f.endsWith('.json'));
    }

    if (!jsonFileName) {
      return res.status(404).json({ error: 'No JSON file found' });
    }

    const filePath = `${folder}/${jsonFileName}`;
    const content = await storageService.loadFile(userId, filePath);
    const jsonData = JSON.parse(content);
    jsonData.currentFolder = folder;
    res.json(jsonData);
  } catch (err) {
    console.error('[/api/load] Error:', err.message);
    if (err.code === 'ENOENT' || (err.message && err.message.includes('not found'))) {
      return res.status(404).json({ error: 'Folder not found' });
    }
    res.status(500).json({ error: 'Failed to load mindmap' });
  }
});


// ══════════════════════════════════════════════════════
// DELETE /api/deletefolder - 마인드맵 폴더 삭제
// ══════════════════════════════════════════════════════

router.delete('/deletefolder', async (req, res) => {
  const folderName = req.query.folder;

  if (!folderName) {
    return res.status(400).json({ success: false, error: '폴더 이름이 필요합니다.' });
  }

  const userId = getUserId(req);

  try {
    await storageService.deleteDirectory(userId, folderName);

    console.log('[/api/deletefolder] 폴더 삭제 완료:', folderName);
    res.json({ success: true, message: `"${folderName}" 폴더가 삭제되었습니다.` });
  } catch (err) {
    console.error('[/api/deletefolder] Error:', err.message);
    res.status(500).json({ success: false, error: '폴더 삭제 중 오류가 발생했습니다.' });
  }
});


// ══════════════════════════════════════════════════════
// GET /api/mindmap/children - 특정 노드의 하위 노드 조회
// ══════════════════════════════════════════════════════

router.get('/mindmap/children', async (req, res) => {
  const { folder, nodeId } = req.query;
  const userId = getUserId(req);

  if (!folder || !nodeId) {
    return res.status(400).json({ error: 'folder and nodeId parameters required' });
  }

  try {
    const jsonPath = `${folder}/${folder}.json`;
    const jsonContent = await storageService.loadFile(userId, jsonPath);
    const data = JSON.parse(jsonContent);

    const node = findNodeInMindmap(data, nodeId);
    if (!node) {
      return res.status(404).json({ error: 'Node not found' });
    }

    res.json({
      success: true,
      children: node.children || [],
      nodeId: node.nodeId || node.id
    });
  } catch (err) {
    if (err.code === 'ENOENT') {
      return res.status(404).json({ error: '마인드맵을 찾을 수 없습니다.' });
    }
    console.error('Children query failed:', err.message);
    res.status(500).json({ error: 'Failed to query children', details: err.message });
  }
});


// ══════════════════════════════════════════════════════
// GET /api/loadnode - 노드 콘텐츠 로드
// ══════════════════════════════════════════════════════

router.get('/loadnode', async (req, res) => {
  const { folder, nodeId } = req.query;
  const userId = getUserId(req);

  if (!folder || !nodeId) {
    return res.status(400).json({ error: 'Folder and nodeId parameters required' });
  }

  // 보안: 입력값 검증 (Path Traversal 방지)
  if (!validateFolderName(folder)) {
    console.warn(`[LoadNode] 잘못된 폴더명 차단: "${folder}" from ${req.ip}`);
    return res.status(400).json({ error: 'Invalid folder name' });
  }
  if (!validateNodeId(nodeId)) {
    console.warn(`[LoadNode] 잘못된 nodeId 차단: "${nodeId}" from ${req.ip}`);
    return res.status(400).json({ error: 'Invalid nodeId' });
  }

  try {
    const baseImagePath = `/api/image/${encodeURIComponent(folder)}/`;

    // 1차: title[nodeId].html 패턴 파일 검색 (정규 형식)
    const suffix = `[${nodeId}].html`;
    try {
      const files = await storageService.listFiles(userId, folder);
      const matchedFile = files.find(f => !f.isDirectory && f.name.endsWith(suffix));
      if (matchedFile) {
        const matchedPath = `${folder}/${matchedFile.name}`;
        let content = await storageService.loadFile(userId, matchedPath);
        if (content && content.length > 0) {
          // 상대 경로 이미지를 API 프록시 경로로 변환
          content = content.replace(
            /src="((?![/]|data:|https?:\/\/)[^"]+\/[^"]+)"/g,
            `src="${baseImagePath}$1"`
          );
          return res.json({ content });
        }
      }
    } catch (patternErr) { /* 폴더 없음 */ }

    // 2차: nodeId.html 폴백 (레거시 파일명 호환)
    try {
      const htmlPath = `${folder}/${nodeId}.html`;
      const htmlExists = await storageService.exists(userId, htmlPath);
      if (htmlExists) {
        let content = await storageService.loadFile(userId, htmlPath);
        if (content && content.length > 0) {
          content = content.replace(
            /src="((?![/]|data:|https?:\/\/)[^"]+\/[^"]+)"/g,
            `src="${baseImagePath}$1"`
          );
          return res.json({ content });
        }
      }
    } catch (htmlErr) { /* 파일 없음 */ }

    // 3차: nodeId.txt 검색
    try {
      const txtPath = `${folder}/${nodeId}.txt`;
      const txtExists = await storageService.exists(userId, txtPath);
      if (txtExists) {
        const content = await storageService.loadFile(userId, txtPath);
        return res.json({ content });
      }
    } catch (txtErr) { /* 파일 없음 */ }

    return res.json({ content: '' });
  } catch (err) {
    console.error('[/api/loadnode] Error:', err.message);
    return res.status(500).json({ error: 'Failed to read node content file' });
  }
});


// ══════════════════════════════════════════════════════
// POST /api/deletenode - 노드 및 관련 파일 삭제
// ══════════════════════════════════════════════════════

router.post('/deletenode', express.json(), async (req, res) => {
  const { folder, nodeId, nodeData } = req.body;
  const userId = getUserId(req);
  const nodeIdStr = String(nodeId);

  if (!folder || !nodeId) {
    return res.status(400).json({ error: 'Folder name and node ID required' });
  }

  // 보안: 입력값 검증 (Path Traversal 방지)
  if (!validateFolderName(folder)) {
    console.warn('[NodeDelete] 잘못된 폴더명 차단:', folder, 'from', req.ip);
    return res.status(400).json({ error: 'Invalid folder name' });
  }
  if (!validateNodeId(String(nodeId))) {
    console.warn('[NodeDelete] 잘못된 nodeId 차단:', nodeId, 'from', req.ip);
    return res.status(400).json({ error: 'Invalid nodeId' });
  }

  // ★ DB 기반 경로 조회 (날짜 경로 포함)
  const SAVE_PATH = path.resolve(__dirname, '../../save');
  const relativePath = await UserIdEncoder.resolveUserPath(userId, SAVE_PATH);
  const folderPath = path.join(SAVE_PATH, relativePath, folder);
  const deletedFiles = [];

  const collectAllNodeFiles = (node) => {
    const files = [];
    const nodeInfo = {
      id: String(node.id),
      nodeId: String(node.nodeId || node.id),
      html: `${node.nodeId || node.id}.html`,
      txt: `${node.nodeId || node.id}.txt`,
      pdf: node.pdf || null,
      ppt: node.ppt || null
    };
    files.push(nodeInfo);

    if (node.children && Array.isArray(node.children)) {
      node.children.forEach(child => {
        files.push(...collectAllNodeFiles(child));
      });
    }
    return files;
  };

  try {
    let nodesToDelete = [];

    if (nodeData) {
      nodesToDelete = collectAllNodeFiles(nodeData);
    } else {
      nodesToDelete = [{
        id: nodeIdStr,
        nodeId: nodeIdStr,
        html: `${nodeIdStr}.html`,
        txt: `${nodeIdStr}.txt`,
        pdf: null,
        ppt: null
      }];
    }

    nodesToDelete.forEach(nodeInfo => {
      // title[nodeId].html 패턴 파일 삭제 (정규 형식)
      try {
        const delSuffix = `[${nodeInfo.nodeId}].html`;
        const allFiles = fs.readdirSync(folderPath);
        allFiles.filter(f => f.endsWith(delSuffix)).forEach(f => {
          const matchedPath = path.join(folderPath, f);
          fs.unlinkSync(matchedPath);
          deletedFiles.push(matchedPath);
        });
      } catch (e) { /* skip */ }

      // nodeId.html 폴백 삭제 (레거시)
      const htmlPath = path.join(folderPath, nodeInfo.html);
      if (fs.existsSync(htmlPath)) {
        fs.unlinkSync(htmlPath);
        deletedFiles.push(htmlPath);
      }

      const txtPath = path.join(folderPath, nodeInfo.txt);
      if (fs.existsSync(txtPath)) {
        fs.unlinkSync(txtPath);
        deletedFiles.push(txtPath);
      }

      // nodeId 전용 폴더 삭제
      const nodeIdFolderPath = path.join(folderPath, nodeInfo.nodeId);
      if (fs.existsSync(nodeIdFolderPath)) {
        const stat = fs.statSync(nodeIdFolderPath);
        if (stat.isDirectory()) {
          fs.rmSync(nodeIdFolderPath, { recursive: true, force: true });
          deletedFiles.push(nodeIdFolderPath);
        }
      }

      // title[nodeId] 형식 폴더 삭제
      try {
        const folderSuffix = `[${nodeInfo.nodeId}]`;
        const allFolderItems = fs.readdirSync(folderPath);
        allFolderItems.filter(f => f.endsWith(folderSuffix)).forEach(f => {
          const itemPath = path.join(folderPath, f);
          if (fs.existsSync(itemPath) && fs.statSync(itemPath).isDirectory()) {
            fs.rmSync(itemPath, { recursive: true, force: true });
            deletedFiles.push(itemPath);
          }
        });
      } catch (e) { /* skip */ }

      // 레거시: nodeId_images 형식 폴더 삭제
      const legacyImagesFolderName = `${nodeInfo.id}_images`;
      const legacyImagesFolderPath = path.join(folderPath, legacyImagesFolderName);
      if (fs.existsSync(legacyImagesFolderPath)) {
        fs.rmSync(legacyImagesFolderPath, { recursive: true, force: true });
        deletedFiles.push(legacyImagesFolderPath);
      }

      // 레거시: nodeId_ 접두사 폴더 삭제
      try {
        const allItems = fs.readdirSync(folderPath);
        const nodeIdPrefix = `${nodeInfo.id}_`;
        const nodeIdPrefix2 = `${nodeInfo.nodeId}_`;
        for (const item of allItems) {
          if ((item.startsWith(nodeIdPrefix) || item.startsWith(nodeIdPrefix2)) && item !== legacyImagesFolderName) {
            const itemPath = path.join(folderPath, item);
            const stat = fs.statSync(itemPath);
            if (stat.isDirectory()) {
              fs.rmSync(itemPath, { recursive: true, force: true });
              deletedFiles.push(itemPath);
            }
          }
        }
      } catch (readDirErr) { /* 무시 */ }

      if (nodeInfo.pdf) {
        const pdfPath = path.join(folderPath, nodeInfo.pdf);
        if (fs.existsSync(pdfPath)) {
          fs.unlinkSync(pdfPath);
          deletedFiles.push(pdfPath);
        }
      }

      if (nodeInfo.ppt) {
        const pptPath = path.join(folderPath, nodeInfo.ppt);
        if (fs.existsSync(pptPath)) {
          fs.unlinkSync(pptPath);
          deletedFiles.push(pptPath);
        }
      }
    });

    res.json({
      success: true,
      nodeId: nodeIdStr,
      deletedFiles: deletedFiles.map(f => path.basename(f)),
      count: deletedFiles.length,
      nodesDeleted: nodesToDelete.length
    });
  } catch (err) {
    console.error('Failed to delete node files:', err);
    res.status(500).json({
      error: 'Failed to delete node files',
      details: err.message,
      deletedFiles: deletedFiles.map(f => path.basename(f))
    });
  }
});


// ══════════════════════════════════════════════════════
// POST /api/mindmap/rename-folder - 마인드맵 폴더 이름 변경
// ══════════════════════════════════════════════════════

router.post('/mindmap/rename-folder', express.json(), async (req, res) => {
  const { oldFolderName, newFolderName } = req.body;
  const userId = getUserId(req);

  if (!oldFolderName || !newFolderName) {
    return res.status(400).json({ success: false, error: 'oldFolderName and newFolderName required' });
  }

  if (!validateFolderName(oldFolderName) || !validateFolderName(newFolderName)) {
    return res.status(400).json({ success: false, error: 'Invalid folder name' });
  }

  if (oldFolderName === newFolderName) {
    return res.json({ success: true, message: 'Same name, no change needed' });
  }

  try {
    // 새 폴더명 중복 체크
    const newFolderExists = await storageService.exists(userId, newFolderName);
    if (newFolderExists) {
      return res.status(409).json({
        success: false,
        error: 'Folder already exists',
        message: '같은 이름의 폴더가 이미 존재합니다.'
      });
    }

    // 기존 폴더 존재 확인
    const oldFolderExists = await storageService.exists(userId, oldFolderName);
    if (!oldFolderExists) {
      return res.status(404).json({ success: false, error: 'Source folder not found' });
    }

    // 폴더 이동 (이름 변경)
    await storageService.move(userId, oldFolderName, newFolderName);

    // JSON 파일 이름도 변경 (oldName/oldName.json → newName/newName.json)
    const oldJsonName = `${oldFolderName}.json`;
    const newJsonName = `${newFolderName}.json`;
    const oldJsonExists = await storageService.exists(userId, `${newFolderName}/${oldJsonName}`);
    if (oldJsonExists) {
      await storageService.move(
        userId,
        `${newFolderName}/${oldJsonName}`,
        `${newFolderName}/${newJsonName}`
      );
    }

    console.log(`[rename-folder] "${oldFolderName}" → "${newFolderName}" (user: ${userId})`);

    res.json({
      success: true,
      data: { oldFolderName, newFolderName },
      message: 'Folder renamed successfully'
    });
  } catch (err) {
    console.error('[rename-folder] Error:', err.message);
    res.status(500).json({
      success: false,
      error: 'Failed to rename folder',
      message: err.message
    });
  }
});


module.exports = router;
