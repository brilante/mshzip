/**
 * MyMind3 마인드맵 검색 기능
 * - 노드 제목, 콘텐츠, 노드ID 검색
 * - 검색 결과 노드 하이라이트 (노란색 테두리 점멸)
 * - 접힌 노드 자동 펼침 + 검색 초기화 시 복원
 * - 에디터 내 키워드 하이라이트 (노란색 배경)
 */
window.MyMind3 = window.MyMind3 || {};
window.MyMind3.Features = window.MyMind3.Features || {};

window.MyMind3.Features.Search = (function() {
  'use strict';

  // 상태 변수
  let currentSearchQuery = '';
  let searchResults = [];
  let nodeContentCache = new Map();
  let isSearchActive = false;
  let isContentLoaded = false;
  let currentFolder = '';
  let expandedStatesBeforeSearch = null; // 검색 전 접힘 상태 백업

  // DOM 요소 참조
  let searchInput = null;
  let searchBtn = null;
  let clearBtn = null;
  let resultCount = null;

  /**
   * 검색 모듈 초기화
   */
  function init() {
    searchInput = document.getElementById('mindmapSearchInput');
    searchBtn = document.getElementById('mindmapSearchBtn');
    clearBtn = document.getElementById('mindmapSearchClearBtn');
    resultCount = document.getElementById('searchResultCount');

    if (!searchInput || !searchBtn) {
      console.warn('[Search] 검색 UI 요소를 찾을 수 없습니다.');
      return false;
    }

    // 이벤트 핸들러 등록
    attachEventHandlers();
    console.log('[Search] 마인드맵 검색 기능 초기화 완료');
    return true;
  }

  /**
   * 이벤트 핸들러 등록
   */
  function attachEventHandlers() {
    // 검색 버튼 클릭
    searchBtn.addEventListener('click', handleSearch);

    // Enter 키로 검색
    searchInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSearch();
      }
      // ESC로 검색 취소
      if (e.key === 'Escape') {
        clearSearch();
      }
    });

    // 초기화 버튼 클릭
    if (clearBtn) {
      clearBtn.addEventListener('click', clearSearch);
    }

    // Ctrl+F 단축키
    document.addEventListener('keydown', function(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        // 에디터에 포커스가 있으면 기본 동작 허용
        const activeEl = document.activeElement;
        if (activeEl && (activeEl.closest('.toastui-editor') || activeEl.tagName === 'TEXTAREA')) {
          return;
        }
        e.preventDefault();
        searchInput.focus();
        searchInput.select();
      }
    });

    // 입력값 변경 시 클리어 버튼 표시/숨김
    searchInput.addEventListener('input', function() {
      if (clearBtn) {
        clearBtn.style.display = this.value.length > 0 ? 'inline-block' : 'none';
      }
    });
  }

  /**
   * 현재 폴더 설정 (마인드맵 로드 시 호출)
   * @param {string} folder - 폴더명
   */
  function setCurrentFolder(folder) {
    currentFolder = folder;
    nodeContentCache.clear();
    isContentLoaded = false;
    console.log('[Search] 폴더 설정됨:', folder);
  }

  /**
   * 단일 노드 콘텐츠 로드
   * @param {string} nodeId - 노드 ID
   * @returns {Promise<string>} 노드 콘텐츠 (텍스트)
   */
  async function loadNodeContent(nodeId) {
    if (!currentFolder || !nodeId) return '';

    // 캐시 확인
    if (nodeContentCache.has(nodeId)) {
      return nodeContentCache.get(nodeId);
    }

    try {
      const encodedFolder = encodeURIComponent(currentFolder);
      const response = await fetch(`/api/loadnode?folder=${encodedFolder}&nodeId=${nodeId}`);

      if (!response.ok) {
        // 404는 파일 없음 - 정상 케이스
        if (response.status === 404) {
          nodeContentCache.set(nodeId, '');
          return '';
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const content = data.content || '';

      // HTML 태그 제거하고 텍스트만 캐시
      const textContent = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      nodeContentCache.set(nodeId, textContent);

      return textContent;
    } catch (err) {
      console.warn('[Search] 노드 콘텐츠 로드 실패:', nodeId, err.message);
      nodeContentCache.set(nodeId, '');
      return '';
    }
  }

  /**
   * 모든 노드 콘텐츠 사전 로드
   * @returns {Promise<number>} 로드된 노드 수
   * Promise.allSettled 사용으로 부분 실패 허용
   */
  async function preloadAllNodeContents() {
    if (!currentFolder) {
      console.warn('[Search] 폴더가 설정되지 않았습니다.');
      return 0;
    }

    const nodes = document.querySelectorAll('.mindmap-node');
    const nodeIds = Array.from(nodes).map(n => n.dataset.id).filter(Boolean);

    console.log('[Search] 콘텐츠 사전 로드 시작:', nodeIds.length, '개 노드');

    // 병렬 로드 (최대 5개씩) - Promise.allSettled 사용
    const batchSize = 5;
    let loadedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < nodeIds.length; i += batchSize) {
      const batch = nodeIds.slice(i, i + batchSize);
      const results = await Promise.allSettled(batch.map(async (nodeId) => {
        await loadNodeContent(nodeId);
        return nodeId;
      }));

      // 결과 집계
      results.forEach(result => {
        if (result.status === 'fulfilled') {
          loadedCount++;
        } else {
          failedCount++;
          console.warn('[Search] 노드 콘텐츠 로드 실패:', result.reason);
        }
      });
    }

    isContentLoaded = true;
    console.log('[Search] 콘텐츠 사전 로드 완료:', loadedCount, '개 성공,', failedCount, '개 실패');
    return loadedCount;
  }

  // ============ 데이터 트리 순회 헬퍼 ============

  /**
   * MindMapData 트리 전체를 재귀 순회하여 flat 배열 반환
   * @returns {Array} 모든 노드의 flat 배열
   */
  function findAllNodesInData() {
    const result = [];
    const mindMapData = window.MyMind3 && window.MyMind3.MindMapData
      ? window.MyMind3.MindMapData.mindMapData
      : [];

    function traverse(nodes) {
      if (!nodes || nodes.length === 0) return;
      for (const node of nodes) {
        result.push(node);
        if (node.children && node.children.length > 0) {
          traverse(node.children);
        }
      }
    }

    traverse(mindMapData);
    return result;
  }

  /**
   * 특정 노드의 모든 조상 노드 반환 (내부 id 기준)
   * @param {number} nodeInternalId - 노드의 내부 ID
   * @returns {Array} 조상 노드 배열 (가까운 부모부터)
   */
  function getAncestorChain(nodeInternalId) {
    const MindMapData = window.MyMind3 && window.MyMind3.MindMapData;
    if (!MindMapData) return [];

    const ancestors = [];
    let currentId = nodeInternalId;

    // 부모 체인 추적 (최대 깊이 제한으로 무한 루프 방지)
    for (let i = 0; i < 100; i++) {
      const info = MindMapData.findNodeAndParent(currentId);
      if (!info || !info.parent) break;
      ancestors.push(info.parent);
      currentId = info.parent.id;
    }

    return ancestors;
  }

  /**
   * 전체 트리의 expanded 상태 저장
   * @returns {Map<number, boolean>} id → expanded 상태 맵
   */
  function saveExpandedStates() {
    const states = new Map();
    const allNodes = findAllNodesInData();
    for (const node of allNodes) {
      if (node.children && node.children.length > 0) {
        states.set(node.id, node.expanded);
      }
    }
    return states;
  }

  /**
   * 저장된 expanded 상태 복원 + 재렌더링
   */
  function restoreExpandedStates() {
    if (!expandedStatesBeforeSearch) return;

    const allNodes = findAllNodesInData();
    let changed = false;

    for (const node of allNodes) {
      if (expandedStatesBeforeSearch.has(node.id)) {
        const savedState = expandedStatesBeforeSearch.get(node.id);
        if (node.expanded !== savedState) {
          node.expanded = savedState;
          changed = true;
        }
      }
    }

    expandedStatesBeforeSearch = null;

    // 상태 변경이 있으면 재렌더링
    if (changed) {
      const renderer = window.MyMind3 && window.MyMind3.NodeRenderer;
      if (renderer && typeof renderer.renderMindMap === 'function') {
        renderer.renderMindMap();
      }
    }
  }

  /**
   * 검색 실행 (비동기 - 콘텐츠 검색 포함)
   */
  async function handleSearch() {
    const query = searchInput.value.trim();

    if (query.length === 0) {
      showToastMessage(t('searchEmptyQuery', '검색어를 입력해주세요.'), 'warning');
      return;
    }

    if (query.length < 1) {
      showToastMessage(t('searchMinLength', '검색어는 1자 이상 입력해주세요.'), 'warning');
      return;
    }

    currentSearchQuery = query;
    searchResults = [];

    // 기존 하이라이트 제거
    removeAllHighlights();

    // 검색 버튼 로딩 상태
    if (searchBtn) {
      searchBtn.disabled = true;
      searchBtn.textContent = t('searchSearching', '검색중...');
    }

    try {
      // 콘텐츠가 사전 로드되지 않았으면 로드
      if (!isContentLoaded && currentFolder) {
        await preloadAllNodeContents();
      }

      // 노드 검색 (제목 + 콘텐츠 + 노드ID)
      await searchAllNodes(query);

      // 결과 표시
      updateResultCount();

      // 검색 활성화 상태
      isSearchActive = true;

      // 현재 에디터/프리뷰에 키워드 하이라이트 적용
      // DOM 준비 확인 후 하이라이트 적용
      requestAnimationFrame(function() {
        const editorEl = document.querySelector('.toastui-editor-contents');
        const previewEl = document.querySelector('.custom-preview-container');
        if (editorEl || previewEl) {
          highlightEditorContent(query);
        } else {
          // 폴백: DOM이 아직 준비되지 않은 경우 지연 실행
          setTimeout(function() {
            highlightEditorContent(query);
          }, 100);
        }
      });
    } finally {
      // 버튼 상태 복원
      if (searchBtn) {
        searchBtn.disabled = false;
        searchBtn.textContent = t('searchBtn', '검색');
      }
    }

    if (clearBtn) {
      clearBtn.style.display = 'inline-block';
    }
  }

  /**
   * 모든 노드에서 검색 (제목 + 콘텐츠 + 노드ID)
   * 데이터 트리를 직접 순회하여 접힌 노드도 검색 가능
   * @param {string} query - 검색어
   */
  async function searchAllNodes(query) {
    const lowerQuery = query.toLowerCase();
    const upperQuery = query.toUpperCase();

    // 데이터 트리에서 전체 노드 리스트 가져오기
    const allNodes = findAllNodesInData();
    const matchedNodes = [];

    for (const node of allNodes) {
      const title = node.title || '';
      const lowerTitle = title.toLowerCase();

      let matchInTitle = lowerTitle.includes(lowerQuery);
      let matchInContent = false;
      let matchInNodeId = false;

      // 노드 콘텐츠 검색 (캐시된 콘텐츠, 내부 id 키)
      const cachedContent = nodeContentCache.get(String(node.id)) || '';
      if (cachedContent.toLowerCase().includes(lowerQuery)) {
        matchInContent = true;
      }

      // 노드 ID 검색 (대소문자 무시)
      if (node.nodeId) {
        const upperNodeId = node.nodeId.toUpperCase();
        if (upperNodeId.includes(upperQuery)) {
          matchInNodeId = true;
        }
      }

      if (matchInTitle || matchInContent || matchInNodeId) {
        matchedNodes.push({
          node: node,
          title: title,
          matchInTitle: matchInTitle,
          matchInContent: matchInContent,
          matchInNodeId: matchInNodeId
        });
      }
    }

    // 매칭 노드 중 DOM에 없는 노드가 있으면 조상 펼침 필요
    let needRerender = false;
    const nodesToExpand = new Set();

    for (const match of matchedNodes) {
      const domNode = document.querySelector(`.mindmap-node[data-id="${match.node.id}"]`);
      if (!domNode) {
        // DOM에 없음 = 접힌 조상 아래에 있음
        const ancestors = getAncestorChain(match.node.id);
        for (const ancestor of ancestors) {
          if (!ancestor.expanded) {
            nodesToExpand.add(ancestor);
          }
        }
      }
    }

    // 접힌 조상이 있으면 expanded 상태 백업 후 펼치기
    if (nodesToExpand.size > 0) {
      // 최초 검색 시에만 상태 저장 (연속 검색 시 원본 유지)
      if (!expandedStatesBeforeSearch) {
        expandedStatesBeforeSearch = saveExpandedStates();
      }

      // 조상 펼치기
      for (const ancestor of nodesToExpand) {
        ancestor.expanded = true;
      }

      // 재렌더링
      const renderer = window.MyMind3 && window.MyMind3.NodeRenderer;
      if (renderer && typeof renderer.renderMindMap === 'function') {
        renderer.renderMindMap();
        needRerender = true;
      }
    }

    // DOM 노드에 하이라이트 적용
    for (const match of matchedNodes) {
      const nodeEl = document.querySelector(`.mindmap-node[data-id="${match.node.id}"]`);
      if (!nodeEl) continue;

      searchResults.push({
        nodeId: String(match.node.id),
        element: nodeEl,
        title: match.title,
        matchInTitle: match.matchInTitle,
        matchInContent: match.matchInContent,
        matchInNodeId: match.matchInNodeId
      });

      // 노드 하이라이트 적용
      nodeEl.classList.add('search-highlight');
      if (match.matchInTitle) {
        nodeEl.classList.add('match-title');
      }
      if (match.matchInContent) {
        nodeEl.classList.add('match-content');
      }
      if (match.matchInNodeId) {
        nodeEl.classList.add('match-node-id');
      }
    }

    // 첫 번째 매칭 노드로 스크롤
    if (searchResults.length > 0 && searchResults[0].element) {
      searchResults[0].element.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center'
      });
    }

    // 검색 결과 로그
    const titleMatches = searchResults.filter(r => r.matchInTitle).length;
    const contentMatches = searchResults.filter(r => r.matchInContent).length;
    const nodeIdMatches = searchResults.filter(r => r.matchInNodeId).length;
    console.log('[Search] 검색 결과:', searchResults.length, '개 노드');
    console.log('[Search]   - 제목 매칭:', titleMatches, '개');
    console.log('[Search]   - 콘텐츠 매칭:', contentMatches, '개');
    console.log('[Search]   - 노드ID 매칭:', nodeIdMatches, '개');
  }

  /**
   * 검색 결과 카운트 업데이트 (간단히 숫자만 표시)
   */
  function updateResultCount() {
    if (!resultCount) return;

    const count = searchResults.length;

    if (count > 0) {
      resultCount.textContent = count + '개';
      resultCount.classList.remove('no-results');
    } else {
      resultCount.textContent = t('zeroResults', '0개');
      resultCount.classList.add('no-results');
    }

    resultCount.style.display = 'inline-block';
  }

  /**
   * 모든 하이라이트 제거
   */
  function removeAllHighlights() {
    // 노드 하이라이트 제거
    document.querySelectorAll('.mindmap-node.search-highlight').forEach(function(el) {
      el.classList.remove('search-highlight');
      el.classList.remove('match-title');
      el.classList.remove('match-content');
      el.classList.remove('match-node-id');
    });

    // 에디터 하이라이트 제거
    removeEditorHighlights();
  }

  /**
   * 에디터 및 프리뷰 내 하이라이트 제거
   */
  function removeEditorHighlights() {
    // 에디터 하이라이트 제거
    const editorContents = document.querySelector('.toastui-editor-contents');
    if (editorContents) {
      const highlights = editorContents.querySelectorAll('.search-keyword-highlight');
      highlights.forEach(function(span) {
        const parent = span.parentNode;
        if (parent) {
          parent.replaceChild(document.createTextNode(span.textContent), span);
          parent.normalize();
        }
      });
    }

    // 프리뷰 하이라이트 제거
    const previewContainer = document.querySelector('.custom-preview-container');
    if (previewContainer) {
      const highlights = previewContainer.querySelectorAll('.search-keyword-highlight');
      highlights.forEach(function(span) {
        const parent = span.parentNode;
        if (parent) {
          parent.replaceChild(document.createTextNode(span.textContent), span);
          parent.normalize();
        }
      });
    }
  }

  /**
   * 에디터 및 프리뷰 내용에 키워드 하이라이트 적용
   * @param {string} query - 검색어
   */
  function highlightEditorContent(query) {
    if (!query || !isSearchActive) return;

    // 기존 하이라이트 제거
    removeEditorHighlights();

    // 에디터 콘텐츠 하이라이트
    const editorContents = document.querySelector('.toastui-editor-contents');
    if (editorContents) {
      highlightContainer(editorContents, query);
    }

    // 프리뷰 콘텐츠 하이라이트 (커스텀 프리뷰)
    const previewContainer = document.querySelector('.custom-preview-container');
    if (previewContainer) {
      highlightContainer(previewContainer, query);
      console.log('[Search] 프리뷰 하이라이트 적용:', query);
    }
  }

  /**
   * 특정 컨테이너 내 텍스트 하이라이트
   * @param {Element} container - 컨테이너 요소
   * @param {string} query - 검색어
   */
  function highlightContainer(container, query) {
    // 텍스트 노드 검색 및 하이라이트
    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );

    const textNodes = [];
    let node;
    while (node = walker.nextNode()) {
      if (node.textContent.toLowerCase().includes(query.toLowerCase())) {
        textNodes.push(node);
      }
    }

    // 각 텍스트 노드에서 검색어 하이라이트
    textNodes.forEach(function(textNode) {
      highlightTextNode(textNode, query);
    });
  }

  /**
   * 텍스트 노드에서 검색어 하이라이트
   * @param {Node} textNode - 텍스트 노드
   * @param {string} query - 검색어
   */
  function highlightTextNode(textNode, query) {
    const text = textNode.textContent;
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();

    const index = lowerText.indexOf(lowerQuery);
    if (index === -1) return;

    const before = text.substring(0, index);
    const match = text.substring(index, index + query.length);
    const after = text.substring(index + query.length);

    const parent = textNode.parentNode;
    if (!parent) return;

    const frag = document.createDocumentFragment();

    if (before) {
      frag.appendChild(document.createTextNode(before));
    }

    const span = document.createElement('span');
    span.className = 'search-keyword-highlight';
    span.textContent = match;
    frag.appendChild(span);

    if (after) {
      // 나머지 텍스트에서도 검색어 찾기 (재귀적으로)
      const afterNode = document.createTextNode(after);
      frag.appendChild(afterNode);
      parent.replaceChild(frag, textNode);

      // 나머지 부분에서도 하이라이트 (재귀)
      if (after.toLowerCase().includes(lowerQuery)) {
        setTimeout(function() {
          highlightTextNode(afterNode, query);
        }, 0);
      }
    } else {
      parent.replaceChild(frag, textNode);
    }
  }

  /**
   * 검색 초기화
   */
  function clearSearch() {
    currentSearchQuery = '';
    searchResults = [];
    isSearchActive = false;

    if (searchInput) {
      searchInput.value = '';
    }

    if (clearBtn) {
      clearBtn.style.display = 'none';
    }

    if (resultCount) {
      resultCount.style.display = 'none';
    }

    removeAllHighlights();

    // 검색으로 펼쳤던 노드 원래 상태로 복원
    restoreExpandedStates();

    console.log('[Search] 검색 초기화됨');
  }

  /**
   * 노드 콘텐츠 캐시 업데이트
   * @param {string} nodeId - 노드 ID
   * @param {string} content - 콘텐츠 (HTML 또는 텍스트)
   */
  function cacheNodeContent(nodeId, content) {
    if (!nodeId || !content) return;

    // HTML 태그 제거하고 텍스트만 저장
    const textContent = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    nodeContentCache.set(nodeId, textContent);
  }

  /**
   * 노드 선택 시 에디터 하이라이트 적용
   * (노드 클릭 이벤트에서 호출)
   */
  function onNodeSelected(nodeId) {
    if (!isSearchActive || !currentSearchQuery) return;

    // 약간의 지연 후 하이라이트 (에디터 콘텐츠 로드 대기)
    setTimeout(function() {
      highlightEditorContent(currentSearchQuery);
    }, 100);
  }

  /**
   * 토스트 메시지 표시
   * @param {string} message - 메시지
   * @param {string} type - 타입 (success, warning, error)
   */
  function showToastMessage(message, type) {
    if (typeof showToast === 'function') {
      showToast(message, type);
    } else {
      console.log('[Search]', message);
    }
  }

  /**
   * 검색 상태 반환
   */
  function getSearchState() {
    return {
      isActive: isSearchActive,
      query: currentSearchQuery,
      resultCount: searchResults.length
    };
  }

  // 공개 API
  return {
    init: init,
    search: handleSearch,
    clear: clearSearch,
    cacheNodeContent: cacheNodeContent,
    onNodeSelected: onNodeSelected,
    highlightEditorContent: highlightEditorContent,
    getSearchState: getSearchState,
    setCurrentFolder: setCurrentFolder,
    loadNodeContent: loadNodeContent,
    preloadAllNodeContents: preloadAllNodeContents,
    get isActive() { return isSearchActive; },
    get query() { return currentSearchQuery; },
    get results() { return searchResults; },
    get isContentLoaded() { return isContentLoaded; }
  };
})();

// DOMContentLoaded 시 자동 초기화
// DOM 준비 상태 확인 후 초기화
document.addEventListener('DOMContentLoaded', function() {
  // 검색 UI 요소 존재 확인 후 초기화
  function tryInit() {
    const searchInput = document.getElementById('mindmapSearchInput');
    const searchBtn = document.getElementById('mindmapSearchBtn');

    if (searchInput && searchBtn) {
      window.MyMind3.Features.Search.init();
      return true;
    }
    return false;
  }

  // 즉시 시도
  if (!tryInit()) {
    // 실패 시 재시도 (최대 5회)
    let retryCount = 0;
    const maxRetry = 5;
    const retryInterval = setInterval(function() {
      retryCount++;
      if (tryInit() || retryCount >= maxRetry) {
        clearInterval(retryInterval);
        if (retryCount >= maxRetry) {
          console.warn('[Search] 검색 UI 요소를 찾을 수 없어 초기화를 건너뜁니다.');
        }
      }
    }, 200);
  }
});
