/**
 * webmcp-tools.js - MyMind3 WebMCP 도구 등록
 *
 * WebMCP(navigator.modelContext) 지원 브라우저에서는 네이티브 등록,
 * 미지원 브라우저에서는 window.__webmcp_tools polyfill로 등록한다.
 * AI 에이전트가 Playwright를 통해 이 도구들을 발견/호출할 수 있다.
 */
(function () {
  'use strict';

  // 도구 정의
  const tools = [
    {
      name: 'search_nodes',
      description: '마인드맵 노드를 제목으로 검색한다',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: '검색어' }
        },
        required: ['query']
      },
      handler: async ({ query }) => {
        const tree = window.jsMind?.current?.data;
        if (!tree) return { error: '마인드맵 데이터 없음', results: [] };

        const results = [];
        const search = (node) => {
          if (node.topic && node.topic.toLowerCase().includes(query.toLowerCase())) {
            results.push({ id: node.id, title: node.topic });
          }
          if (node.children) node.children.forEach(search);
        };
        search(tree);
        return { query, results, count: results.length };
      }
    },
    {
      name: 'get_mindmap_info',
      description: '현재 열린 마인드맵의 기본 정보를 반환한다',
      inputSchema: {
        type: 'object',
        properties: {}
      },
      handler: async () => {
        const jm = window.jsMind?.current;
        if (!jm) return { error: '마인드맵 미로드' };

        const countNodes = (node) => {
          let count = 1;
          if (node.children) node.children.forEach(c => { count += countNodes(c); });
          return count;
        };

        return {
          id: jm.id || jm.name,
          rootTopic: jm.data?.topic || '',
          nodeCount: countNodes(jm.data),
          format: jm.format || 'node_tree'
        };
      }
    },
    {
      name: 'get_selected_node',
      description: '현재 선택된 노드의 정보를 반환한다',
      inputSchema: {
        type: 'object',
        properties: {}
      },
      handler: async () => {
        const jm = window.jsMind?.instance;
        if (!jm) return { error: 'jsMind 인스턴스 없음' };

        const selected = jm.get_selected_node();
        if (!selected) return { error: '선택된 노드 없음' };

        return {
          id: selected.id,
          topic: selected.topic,
          parentId: selected.parent?.id || null,
          childCount: selected.children?.length || 0,
          isRoot: selected.isroot || false
        };
      }
    },
    {
      name: 'navigate_to_node',
      description: '특정 ID의 노드로 이동하여 선택한다',
      inputSchema: {
        type: 'object',
        properties: {
          nodeId: { type: 'string', description: '이동할 노드 ID' }
        },
        required: ['nodeId']
      },
      handler: async ({ nodeId }) => {
        const jm = window.jsMind?.instance;
        if (!jm) return { error: 'jsMind 인스턴스 없음' };

        const node = jm.get_node(nodeId);
        if (!node) return { error: `노드 '${nodeId}' 없음` };

        jm.select_node(nodeId);
        return {
          success: true,
          nodeId: node.id,
          topic: node.topic
        };
      }
    },
    {
      name: 'ai_chat',
      description: 'AI 채팅에 메시지를 전송한다',
      inputSchema: {
        type: 'object',
        properties: {
          message: { type: 'string', description: '보낼 메시지' }
        },
        required: ['message']
      },
      handler: async ({ message }) => {
        const chatInput = document.getElementById('promptInput') ||
                          document.querySelector('[data-role="chat-input"]');
        if (!chatInput) return { error: 'AI 채팅 입력 필드를 찾을 수 없음' };

        chatInput.value = message;
        chatInput.dispatchEvent(new Event('input', { bubbles: true }));

        const sendBtn = document.getElementById('sendPrompt') ||
                        document.querySelector('[data-role="send-button"]');
        if (sendBtn) {
          sendBtn.click();
          return { success: true, message: '메시지 전송됨' };
        }
        return { error: '전송 버튼을 찾을 수 없음' };
      }
    }
  ];

  // Polyfill 레지스트리 (navigator.modelContext 미지원 시 사용)
  const polyfillRegistry = {
    _tools: new Map(),

    register(tool) {
      this._tools.set(tool.name, tool);
    },

    list() {
      return Array.from(this._tools.values()).map(t => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema
      }));
    },

    async invoke(name, args = {}) {
      const tool = this._tools.get(name);
      if (!tool) return { error: `도구 '${name}' 없음` };
      try {
        return await tool.handler(args);
      } catch (e) {
        return { error: e.message };
      }
    },

    has(name) {
      return this._tools.has(name);
    }
  };

  // 도구 등록
  function registerTools() {
    const useNative = 'modelContext' in navigator &&
                      typeof navigator.modelContext?.registerTool === 'function';

    tools.forEach(tool => {
      if (useNative) {
        try {
          navigator.modelContext.registerTool(tool);
        } catch (e) {
          console.warn(`[WebMCP] 네이티브 등록 실패 (${tool.name}):`, e.message);
          polyfillRegistry.register(tool);
        }
      } else {
        polyfillRegistry.register(tool);
      }
    });

    // Polyfill은 항상 전역에 노출 (Playwright에서 접근용)
    window.__webmcp_tools = polyfillRegistry;

    const mode = useNative ? 'native' : 'polyfill';
    console.log(`[WebMCP] ${tools.length}개 도구 등록 완료 (mode: ${mode})`);
  }

  // DOM 준비 후 등록
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', registerTools);
  } else {
    registerTools();
  }
})();
