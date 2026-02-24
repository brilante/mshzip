/**
 * Node ID 관리 모듈
 *
 * ID 생성은 서버(src/api/node-id.js)에서만 수행.
 * 클라이언트는 서버에서 미리 받아온 ID 풀에서 동기적으로 꺼내 사용.
 *
 * 노드 ID 형식:
 * - V2 (현재): 10자 (A-Z, 0-9) - 36^10 조합
 * - V1 (레거시): 6자 (예: ASD003) - 하위 호환용
 */

(function() {
  'use strict';

  // 전역 네임스페이스 확인
  window.MyMind3 = window.MyMind3 || {};

  // 노드 ID 레지스트리 (로컬 캐시)
  const nodeIdRegistry = new Set();

  // === ID 풀 (서버에서 미리 가져온 ID들) ===
  const idPool = [];
  const POOL_MIN_SIZE = 5;
  const POOL_FETCH_SIZE = 20;
  let poolFetching = false;

  /**
   * 노드 ID 레지스트리 관리 객체
   */
  const NodeIdRegistry = {
    /**
     * ID 등록
     * @param {string} nodeId - 등록할 노드 ID
     * @returns {boolean} 등록 성공 여부
     */
    register(nodeId) {
      if (this.has(nodeId)) {
        console.warn('[NodeId] 중복 ID 등록 시도: ' + nodeId);
        return false;
      }
      nodeIdRegistry.add(nodeId);
      return true;
    },

    /**
     * ID 존재 여부 확인
     * @param {string} nodeId - 확인할 노드 ID
     * @returns {boolean}
     */
    has(nodeId) {
      return nodeIdRegistry.has(nodeId);
    },

    /**
     * 레지스트리 초기화 (마인드맵 전체 로드 시 호출)
     */
    clear() {
      nodeIdRegistry.clear();
      console.log('[NodeId] 레지스트리 초기화됨');
    },

    /**
     * 현재 등록된 ID 수
     * @returns {number}
     */
    size() {
      return nodeIdRegistry.size;
    },

    /**
     * 모든 등록된 ID 반환 (디버깅용)
     * @returns {Array<string>}
     */
    getAll() {
      return Array.from(nodeIdRegistry);
    }
  };

  // === ID 풀 관리 ===

  /**
   * secureFetch 래퍼 (CSRF 토큰 자동 포함)
   */
  function safeFetch(url, options) {
    if (window.csrfUtils && window.csrfUtils.secureFetch) {
      return window.csrfUtils.secureFetch(url, options);
    }
    return fetch(url, options);
  }

  /**
   * 서버에서 ID 풀 보충
   */
  async function refillPool() {
    if (poolFetching || idPool.length >= POOL_MIN_SIZE) return;
    poolFetching = true;
    try {
      const response = await safeFetch('/api/node-id/generate-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mindmap_id: '_pool', count: POOL_FETCH_SIZE })
      });
      const data = await response.json();
      if (data.success && Array.isArray(data.nodeIds)) {
        data.nodeIds.forEach(id => {
          idPool.push(id);
          nodeIdRegistry.add(id);
        });
        console.log('[NodeId] 풀 보충 완료: ' + data.nodeIds.length + '개 (현재 ' + idPool.length + '개)');
        // 풀 보충 후 nodeId가 없는 노드 자동 보정
        _postRefillMigrate();
      }
    } catch (error) {
      console.error('[NodeId] 풀 보충 실패:', error);
    } finally {
      poolFetching = false;
    }
  }

  /**
   * 풀 리필 후 nodeId가 없는 노드를 자동 보정
   * 초기 로드 시 풀이 비어서 null이 된 노드를 수정
   */
  function _postRefillMigrate() {
    const mindMapData = window.MyMind3?.MindMapData?.mindMapData;
    if (!mindMapData || !Array.isArray(mindMapData)) return;

    let fixedCount = 0;
    const processNode = function(node) {
      if (!node.nodeId || !isValidNodeId(node.nodeId)) {
        if (idPool.length > 0) {
          node.nodeId = idPool.shift();
          // 풀에서 꺼낸 ID는 refillPool에서 이미 nodeIdRegistry.add()됨 → register 생략
          if (!NodeIdRegistry.has(node.nodeId)) {
            NodeIdRegistry.register(node.nodeId);
          }
          fixedCount++;

          // path 보정 (숫자 ID fallback → nodeId로 교체)
          if (node.path && /\[\d+\]\.html$/.test(node.path)) {
            node.path = node.path.replace(/\[\d+\]\.html$/, '[' + node.nodeId + '].html');
          }

          // DOM 업데이트 (tooltip, data-node-id)
          _updateNodeDOM(node);
        }
      }
      if (node.children && node.children.length > 0) {
        node.children.forEach(processNode);
      }
    };

    mindMapData.forEach(processNode);
    if (fixedCount > 0) {
      console.log('[NodeId] 후처리 마이그레이션: ' + fixedCount + '개 노드에 ID 부여');
      // 변경사항 자동 저장 트리거
      if (window.MyMind3?.UI?.Toolbar?._saveMindMap) {
        window.MyMind3.UI.Toolbar._saveMindMap();
      }
    }
  }

  /**
   * 노드의 DOM 요소 업데이트 (tooltip, data-node-id 속성)
   */
  function _updateNodeDOM(node) {
    const nodeEl = document.querySelector('.mindmap-node[data-id="' + node.id + '"]');
    if (!nodeEl) return;

    // data-node-id 속성 추가
    nodeEl.setAttribute('data-node-id', node.nodeId);

    // 툴팁 업데이트
    const content = nodeEl.querySelector('.node-content');
    if (content) {
      content.title = (node.title || '') + '[' + node.nodeId + ']';
    }
  }

  /**
   * 풀에서 ID 꺼내기 (동기)
   * 풀이 비면 비동기로 보충 시작
   * @returns {string|null} 노드 ID 또는 null
   */
  function getIdFromPool() {
    // 풀이 부족하면 비동기 보충 시작
    if (idPool.length <= POOL_MIN_SIZE) {
      refillPool();
    }

    if (idPool.length > 0) {
      return idPool.shift();
    }

    // 풀이 완전히 비어있는 경우 (비정상)
    console.warn('[NodeId] 풀이 비어있음 - 서버 보충 대기 중');
    return null;
  }

  // 초기 풀 보충 (CSRF 토큰 준비 후 실행)
  document.addEventListener('DOMContentLoaded', function() {
    setTimeout(refillPool, 500);
  });

  // === 검증 함수 ===

  /**
   * 10자 노드 ID 형식 검증 (V2)
   * @param {string} nodeId - 검증할 값
   * @returns {boolean} 유효 여부
   */
  function isValidNodeIdV2(nodeId) {
    if (typeof nodeId !== 'string') return false;
    return /^[A-Z0-9]{10}$/.test(nodeId);
  }

  /**
   * 노드 ID 형식 검증 (V1 + V2 모두 허용)
   * @param {any} nodeId - 검증할 값
   * @returns {boolean} 유효 여부
   */
  function isValidNodeId(nodeId) {
    if (typeof nodeId !== 'string') return false;
    // V2 신규 (10자) | V2 레거시-특수문자/소문자 포함 (10자) | V1 레거시 (6자)
    return isValidNodeIdV2(nodeId) || /^[A-Za-z0-9!@#$\-_+=~]{10}$/.test(nodeId) || /^[A-Z]{3}[0-9]{3}$/.test(nodeId);
  }

  // === ID 생성 (서버 전용) ===

  /**
   * 서버에서 노드 ID 생성
   * @param {string} mindmapId - 마인드맵 ID
   * @returns {Promise<string>} 생성된 노드 ID
   */
  async function generateNodeIdFromServer(mindmapId) {
    try {
      const response = await safeFetch('/api/node-id/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mindmap_id: mindmapId })
      });

      const data = await response.json();
      if (data.success && data.nodeId) {
        nodeIdRegistry.add(data.nodeId);
        console.log('[NodeId] 서버에서 생성: ' + data.nodeId.substring(0, 8) + '...');
        return data.nodeId;
      }

      throw new Error(data.message || '서버 응답 오류');
    } catch (error) {
      console.error('[NodeId] 서버 생성 실패:', error);
      // 풀에서 꺼내기 (폴백)
      const poolId = getIdFromPool();
      if (poolId) return poolId;
      throw error;
    }
  }

  /**
   * 서버에서 노드 ID 일괄 생성
   * @param {string} mindmapId - 마인드맵 ID
   * @param {number} count - 생성할 개수
   * @returns {Promise<string[]>} 생성된 노드 ID 배열
   */
  async function generateNodeIdBatch(mindmapId, count = 10) {
    try {
      const response = await safeFetch('/api/node-id/generate-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mindmap_id: mindmapId, count })
      });

      const data = await response.json();
      if (data.success && Array.isArray(data.nodeIds)) {
        data.nodeIds.forEach(id => nodeIdRegistry.add(id));
        console.log('[NodeId] 서버에서 일괄 생성: ' + data.nodeIds.length + '개');
        return data.nodeIds;
      }

      throw new Error(data.message || '서버 응답 오류');
    } catch (error) {
      console.error('[NodeId] 일괄 생성 실패:', error);
      return [];
    }
  }

  /**
   * 노드 ID 발급 (동기 - 풀에서 꺼냄)
   * 서버에서 미리 가져온 ID 풀에서 꺼내 사용.
   * @returns {string|null} 노드 ID
   */
  function generate() {
    const id = getIdFromPool();
    if (id) {
      console.log('[NodeId] 풀에서 발급: ' + id.substring(0, 8) + '...');
    }
    return id;
  }

  // === 노드 ID 부여 ===

  /**
   * 노드에 ID 부여 (비동기 - 서버 생성)
   * @param {Object} node - 노드 객체
   * @param {string} mindmapId - 마인드맵 ID
   * @returns {Promise<string>} 부여된 nodeId
   */
  async function ensureNodeIdAsync(node, mindmapId) {
    if (!node) return null;

    // 이미 유효한 nodeId가 있으면 유지
    if (node.nodeId && isValidNodeId(node.nodeId)) {
      if (!NodeIdRegistry.has(node.nodeId)) {
        NodeIdRegistry.register(node.nodeId);
      }
      return node.nodeId;
    }

    // 서버에서 새 ID 생성
    if (mindmapId) {
      node.nodeId = await generateNodeIdFromServer(mindmapId);
    } else {
      // mindmapId 없으면 풀에서 꺼냄
      node.nodeId = generate();
    }

    return node.nodeId;
  }

  /**
   * 노드에 ID 부여 (동기 - 풀에서 꺼냄, 레거시 호환)
   * @param {Object} node - 노드 객체
   * @returns {string} 부여된 nodeId
   */
  function ensureNodeId(node) {
    if (!node) return null;

    // 이미 유효한 nodeId가 있으면 유지
    if (node.nodeId && isValidNodeId(node.nodeId)) {
      if (!NodeIdRegistry.has(node.nodeId)) {
        NodeIdRegistry.register(node.nodeId);
      }
      return node.nodeId;
    }

    // 풀에서 새 ID 꺼냄
    node.nodeId = generate();
    if (node.nodeId) {
      console.log('[NodeId] 새 ID 부여: ' + node.nodeId.substring(0, 8) + '...');
    }
    return node.nodeId;
  }

  /**
   * 클립보드에 텍스트 복사 (폴백 포함)
   * @param {string} text - 복사할 텍스트
   * @returns {Promise<boolean>} 성공 여부
   */
  async function copyToClipboard(text) {
    // 1차 시도: Clipboard API
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (err) {
        console.warn('[NodeId] Clipboard API 실패, fallback 사용');
      }
    }

    // 2차 시도: execCommand
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    textarea.style.left = '-9999px';
    textarea.style.top = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();

    try {
      const success = document.execCommand('copy');
      if (success) {
        document.body.removeChild(textarea);
        return true;
      }
    } catch (err) {
      console.warn('[NodeId] execCommand 실패');
    }
    document.body.removeChild(textarea);

    // 3차 시도: prompt로 표시 (사용자가 직접 복사)
    prompt('노드 ID를 복사하세요:', text);
    return false;
  }

  /**
   * 마인드맵 데이터의 모든 노드에 nodeId 부여 (마이그레이션)
   * @param {Array} mindMapData - 마인드맵 데이터 배열
   */
  function migrateNodeIds(mindMapData) {
    if (!Array.isArray(mindMapData)) return;

    const processNode = function(node) {
      // nodeId가 없거나 유효하지 않으면 풀에서 발급
      if (!node.nodeId || !isValidNodeId(node.nodeId)) {
        node.nodeId = generate();
        if (node.nodeId) {
          NodeIdRegistry.register(node.nodeId);
        }
      } else {
        // 기존 nodeId 등록 (중복 체크)
        if (!NodeIdRegistry.register(node.nodeId)) {
          // 중복 발생 시 새 ID 발급
          console.warn('[NodeId] 중복 발견: ' + node.nodeId.substring(0, 8) + '..., 새 ID 발급');
          node.nodeId = generate();
          if (node.nodeId) {
            NodeIdRegistry.register(node.nodeId);
          }
        }
      }

      // 자식 노드 재귀 처리
      if (node.children && node.children.length > 0) {
        node.children.forEach(processNode);
      }
    };

    mindMapData.forEach(processNode);
    console.log('[NodeId] 마이그레이션 완료: ' + NodeIdRegistry.size() + '개 ID 등록됨');
  }

  /**
   * 노드 ID 삭제 (서버에 알림)
   * @param {string} nodeId - 삭제할 노드 ID
   */
  async function deleteNodeId(nodeId) {
    if (!nodeId) return;

    // 로컬 레지스트리에서 제거
    nodeIdRegistry.delete(nodeId);

    // 서버에 삭제 요청 (비동기, 실패해도 무시)
    try {
      await safeFetch('/api/node-id/' + encodeURIComponent(nodeId), {
        method: 'DELETE'
      });
      console.log('[NodeId] 삭제 완료: ' + nodeId.substring(0, 8) + '...');
    } catch (error) {
      console.warn('[NodeId] 삭제 요청 실패:', error);
    }
  }

  // 전역 네임스페이스에 등록
  window.MyMind3.NodeId = {
    Registry: NodeIdRegistry,
    // 서버 API (비동기)
    generateFromServer: generateNodeIdFromServer,
    generateBatch: generateNodeIdBatch,
    ensureAsync: ensureNodeIdAsync,
    delete: deleteNodeId,
    isValidV2: isValidNodeIdV2,
    // 동기 (풀에서 꺼냄)
    generate: generate,
    isValid: isValidNodeId,
    ensure: ensureNodeId,
    copyToClipboard: copyToClipboard,
    migrate: migrateNodeIds,
    // 풀 관리
    refillPool: refillPool,
    // nodeId 없는 노드 자동 보정 (외부 호출용)
    fixMissingIds: _postRefillMigrate
  };

  console.log('[NodeId] 모듈 로드 완료 (V2: 10자 지원)');
})();
