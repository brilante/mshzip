'use strict';

const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

/**
 * GET /api/health - 서버 상태 확인
 * Phase4→CC: 관측성 확보를 위한 헬스체크 엔드포인트
 */
router.get('/health', (req, res) => {
  logger.info('헬스체크 요청');
  res.json({
    success: true,
    data: {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    }
  });
});

/**
 * GET /api/features - CC 기능 목록 반환
 * Phase0→CC: 구현된 기능 지표 확인
 */
router.get('/features', (req, res) => {
  const implemented = [
    { phase: 0, feature: 'CLAUDE.md 검증 규칙', status: 'active' },
    { phase: 0, feature: 'Plan Mode 지표 수립', status: 'active' },
    { phase: 0, feature: 'Ralph Loop 탈출조건', status: 'active' },
    { phase: 1, feature: 'Rules 분산 시스템', status: 'active' },
    { phase: 1, feature: 'Skills 역할 전문화', status: 'active' },
    { phase: 1, feature: 'Hooks 스키마 검증', status: 'active' },
    { phase: 2, feature: 'Memory 컨텍스트 압축', status: 'active' },
    { phase: 2, feature: 'Subagent 컨텍스트 격리', status: 'active' },
    { phase: 2, feature: 'Context7 + Glob/Grep', status: 'active' },
    { phase: 3, feature: 'MCP 도구 표준화', status: 'active' },
    { phase: 3, feature: 'Ralph 무한루프 방지', status: 'active' },
    { phase: 3, feature: 'PreToolUse 권한 게이트', status: 'active' },
    { phase: 4, feature: '팀즈 병렬 평가', status: 'active' },
    { phase: 4, feature: 'Hook 기반 관측성', status: 'active' },
    { phase: 4, feature: 'PR Review 실험 관리', status: 'active' },
    { phase: 5, feature: 'Memory 지식 보존', status: 'active' },
    { phase: 5, feature: '모델 선택 비용 최적화', status: 'active' },
    { phase: 5, feature: '3중 보안 체계', status: 'active' },
    { phase: 5, feature: 'AskUserQuestion HiTL', status: 'active' }
  ];
  res.json({
    success: true,
    data: {
      implemented,
      totalFeatures: implemented.length,
      ccVersion: '1.0.0'
    }
  });
});

module.exports = router;
