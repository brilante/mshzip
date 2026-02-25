'use strict';

/**
 * Node ID API (로컬 개발용)
 * 참고: mymind3 본체의 node-id.js와 동일 구조 (DB 대신 인메모리)
 *
 * 라우트 목록:
 * - POST   /api/node-id/generate       - 단일 노드 ID 생성
 * - POST   /api/node-id/generate-batch  - 일괄 노드 ID 생성
 * - POST   /api/node-id/validate        - 노드 ID 검증
 * - DELETE /api/node-id/:nodeId         - 노드 ID 삭제
 * - GET    /api/node-id/list/:mindmapId - 마인드맵별 노드 ID 조회
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const logger = require('../utils/logger');

// 문자셋 (36종류: A-Z, 0-9)
const CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const NODE_ID_LENGTH = 10;

// 인메모리 저장소 (서버 재시작 시 초기화)
const nodeIdStore = new Set();

/**
 * 10자 노드 ID 생성
 * @returns {string} 10자 노드 ID
 */
function generateNodeId() {
  const bytes = crypto.randomBytes(NODE_ID_LENGTH);
  let result = '';
  for (let i = 0; i < NODE_ID_LENGTH; i++) {
    result += CHARSET[bytes[i] % CHARSET.length];
  }
  return result;
}

/**
 * 10자 노드 ID 형식 검증
 * @param {string} nodeId
 * @returns {boolean}
 */
function isValidNodeIdV2(nodeId) {
  if (typeof nodeId !== 'string') return false;
  return /^[A-Z0-9]{10}$/.test(nodeId);
}

/**
 * 모든 형식 허용 (하위 호환)
 * @param {string} nodeId
 * @returns {boolean}
 */
function isValidNodeId(nodeId) {
  if (typeof nodeId !== 'string') return false;
  return isValidNodeIdV2(nodeId) || /^[A-Za-z0-9_-]{10}$/.test(nodeId) || /^[A-Z]{3}[0-9]{3}$/.test(nodeId);
}

/**
 * POST /api/node-id/generate
 * 단일 노드 ID 생성
 */
router.post('/generate', express.json(), (req, res) => {
  const { mindmap_id } = req.body;

  if (!mindmap_id) {
    return res.status(400).json({ success: false, message: 'mindmap_id가 필요합니다.' });
  }

  let nodeId;
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    nodeId = generateNodeId();
    if (!nodeIdStore.has(nodeId)) {
      nodeIdStore.add(nodeId);
      return res.json({ success: true, nodeId });
    }
    attempts++;
  }

  res.status(500).json({ success: false, message: '노드 ID 생성 실패: 최대 시도 초과' });
});

/**
 * POST /api/node-id/generate-batch
 * 일괄 노드 ID 생성
 */
router.post('/generate-batch', express.json(), (req, res) => {
  const { mindmap_id, count = 1 } = req.body;

  if (!mindmap_id) {
    return res.status(400).json({ success: false, message: 'mindmap_id가 필요합니다.' });
  }

  const requestCount = Math.min(Math.max(1, parseInt(count) || 1), 100);
  const nodeIds = [];

  for (let i = 0; i < requestCount; i++) {
    let attempts = 0;
    while (attempts < 10) {
      const nodeId = generateNodeId();
      if (!nodeIdStore.has(nodeId)) {
        nodeIdStore.add(nodeId);
        nodeIds.push(nodeId);
        break;
      }
      attempts++;
    }
  }

  res.json({ success: true, nodeIds, count: nodeIds.length });
});

/**
 * POST /api/node-id/validate
 * 노드 ID 검증
 */
router.post('/validate', express.json(), (req, res) => {
  const { node_id } = req.body;

  if (!node_id) {
    return res.status(400).json({ success: false, message: 'node_id가 필요합니다.' });
  }

  const valid = isValidNodeId(node_id);
  res.json({
    success: true,
    available: !nodeIdStore.has(node_id),
    valid
  });
});

/**
 * DELETE /api/node-id/:nodeId
 * 노드 ID 삭제
 */
router.delete('/:nodeId', (req, res) => {
  const { nodeId } = req.params;

  if (!nodeId || !isValidNodeId(nodeId)) {
    return res.status(400).json({ success: false, message: '유효하지 않은 노드 ID입니다.' });
  }

  const deleted = nodeIdStore.delete(nodeId);
  res.json({ success: true, deleted });
});

/**
 * GET /api/node-id/list/:mindmapId
 * 마인드맵별 노드 ID 조회 (인메모리이므로 전체 반환)
 */
router.get('/list/:mindmapId', (req, res) => {
  res.json({
    success: true,
    nodeIds: Array.from(nodeIdStore),
    count: nodeIdStore.size
  });
});

// 헬퍼 함수 export
router.generateNodeId = generateNodeId;
router.isValidNodeId = isValidNodeId;
router.isValidNodeIdV2 = isValidNodeIdV2;

module.exports = router;
