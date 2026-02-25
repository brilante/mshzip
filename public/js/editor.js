/**
 * MyMind3 TOAST UI Editor with KaTeX Integration
 * Tab-based editor with custom tabs (에디터 / 프리뷰)
 * @version 2.0.7 - Fix padding with !important flags in inline styles
 */

(function() {
    'use strict';

    console.log('[MyMind3Editor] Initializing tab-based editor module...');

    // 전역 변수
    let editorInstance = null;
    let latexRenderer = null;
    let currentNodeId = null;
    let currentTab = 'write'; // 'write' or 'preview'

    // 프리뷰 커서 위치 관리
    let previewCursorPosition = null;

    // 노드 콘텐츠 캐시 (노드 전환 속도 최적화)
    const _nodeContentCache = new Map();

    // 자동저장 관련 상태
    let _isDirty = false;
    let _autoSaveTimer = null;
    let _autoSaveDelay = 30000; // 기본 30초, 사용자 설정에서 로드

    // Mermaid CDN 지연 로더 상태
    let _mermaidLoaded = false;
    let _mermaidLoading = false;
    let _mermaidLoadCallbacks = [];

    /**
     * 노드 로딩 오버레이 매니저
     * - 1초 이상 지연 시 로딩바 표시
     * - 60초 초과 시 실패 처리
     * - 로딩 중 UI 잠금
     */
    const NodeLoadingManager = {
      _delayTimer: null,
      _timeoutTimer: null,
      _overlayEl: null,
      _isActive: false,

      start() {
        // 이전 로딩 정리
        this.finish(true);
        this._isActive = true;

        // 1초 후 오버레이 표시
        this._delayTimer = setTimeout(() => {
          if (this._isActive) {
            this._showOverlay();
          }
        }, 1000);

        // 60초 타임아웃
        this._timeoutTimer = setTimeout(() => {
          if (this._isActive) {
            this._timeout();
          }
        }, 60000);
      },

      _showOverlay() {
        if (this._overlayEl) return;

        const overlay = document.createElement('div');
        overlay.className = 'node-loading-overlay';
        overlay.innerHTML =
          '<div class="node-loading-container">' +
            '<div class="node-loading-bar-track">' +
              '<div class="node-loading-bar"></div>' +
            '</div>' +
            '<div class="node-loading-text">' +
              (window.i18n?.loadingNodeContent || '노드 내용을 불러오는 중...') +
            '</div>' +
          '</div>';

        document.body.appendChild(overlay);
        this._overlayEl = overlay;
      },

      finish(silent) {
        this._isActive = false;

        if (this._delayTimer) {
          clearTimeout(this._delayTimer);
          this._delayTimer = null;
        }
        if (this._timeoutTimer) {
          clearTimeout(this._timeoutTimer);
          this._timeoutTimer = null;
        }

        if (this._overlayEl) {
          const el = this._overlayEl;
          this._overlayEl = null;
          el.classList.add('fade-out');
          el.addEventListener('animationend', () => el.remove(), { once: true });
          // 안전 장치: 애니메이션이 끝나지 않더라도 제거
          setTimeout(() => { if (el.parentNode) el.remove(); }, 300);
        }
      },

      _timeout() {
        this.finish();
        if (window.showToast) {
          window.showToast(
            window.i18n?.loadingNodeFailed || '노드 내용을 불러오는 데 실패했습니다. 다시 시도해 주세요.',
            'error',
            5000
          );
        }
      }
    };

    // 전역 노출 (디버깅/테스트용)
    window.NodeLoadingManager = NodeLoadingManager;

    /**
     * KaTeX 커스텀 렌더러
     */
    function katexPlugin() {
        const toHTMLRenderers = {
            latex(node) {
                try {
                    return [
                        { type: 'openTag', tagName: 'span', outerNewLine: false },
                        { type: 'html', content: window.katex.renderToString(node.literal, { throwOnError: false }) },
                        { type: 'closeTag', tagName: 'span', outerNewLine: false }
                    ];
                } catch (e) {
                    console.error('[MyMind3Editor] KaTeX render error:', e);
                    return [{ type: 'text', content: node.literal }];
                }
            },
            latexBlock(node) {
                try {
                    return [
                        { type: 'openTag', tagName: 'div', outerNewLine: true },
                        { type: 'html', content: window.katex.renderToString(node.literal, {
                            throwOnError: false,
                            displayMode: true
                        }) },
                        { type: 'closeTag', tagName: 'div', outerNewLine: true }
                    ];
                } catch (e) {
                    console.error('[MyMind3Editor] KaTeX render error:', e);
                    return [{ type: 'text', content: node.literal }];
                }
            }
        };
        return { toHTMLRenderers };
    }

    /**
     * LaTeX 렌더링 함수
     */
    function renderLatexInElement(element) {
        if (!element || !window.katex) return;

        if (element.classList && element.classList.contains('katex-rendered')) {
            return;
        }

        const text = element.innerHTML;
        if (!text || !text.includes('$')) return;

        try {
            let processed = text.replace(/&lt;br\s*\/?&gt;/gi, '');
            processed = processed.replace(/<br\s*\/?>/gi, '');

            // FIX: 블록 수식 처리 ($$...$$) - 더 넓은 패턴 매칭
            processed = processed.replace(/\$\$([\s\S]+?)\$\$/g, (match, latex) => {
                // 테이블/리스트 등 구조적 HTML이 포함되면 수식이 아님 - 건드리지 않음
                if (/<\/?(table|thead|tbody|tr|td|th|ul|ol|li|h[1-6]|img|video)[^>]*>/i.test(match)) {
                    return match;
                }
                try {
                    // HTML 엔티티 디코딩 + HTML 태그 제거 (TOAST UI가 _를 <em>으로 변환하는 등의 문제 방지)
                    let cleanLatex = latex.trim()
                        .replace(/<\/?(em|strong|i|b|code|span|a|p|div|br|sup|sub)[^>]*>/gi, '')
                        .replace(/&amp;/g, '&')
                        .replace(/&lt;/g, '<')
                        .replace(/&gt;/g, '>')
                        .replace(/&quot;/g, '"')
                        .replace(/&#39;/g, "'")
                        .replace(/&nbsp;/g, ' ');

                    return window.katex.renderToString(cleanLatex, {
                        displayMode: true,
                        throwOnError: false
                    });
                } catch (e) {
                    console.error('[renderLatex] Display math error:', e);
                    return match;
                }
            });

            // FIX: 인라인 수식 처리 ($...$) - 줄바꿈 포함, 더 넓은 패턴
            processed = processed.replace(/\$([^$]+?)\$/g, (match, latex) => {
                try {
                    // HTML 엔티티 디코딩 + HTML 태그 제거
                    let cleanLatex = latex.trim()
                        .replace(/<\/?(em|strong|i|b|code|span|a|p|div|br|sup|sub)[^>]*>/gi, '')
                        .replace(/&amp;/g, '&')
                        .replace(/&lt;/g, '<')
                        .replace(/&gt;/g, '>')
                        .replace(/&quot;/g, '"')
                        .replace(/&#39;/g, "'")
                        .replace(/&nbsp;/g, ' ');

                    return window.katex.renderToString(cleanLatex, {
                        displayMode: false,
                        throwOnError: false
                    });
                } catch (e) {
                    console.error('[renderLatex] Inline math error:', e);
                    return match;
                }
            });

            if (processed !== text) {
                element.innerHTML = processed;
                if (element.classList) {
                    element.classList.add('katex-rendered');
                }
            }
        } catch (e) {
            console.error('[MyMind3Editor] LaTeX rendering error:', e);
        }
    }

    /**
     * 프리뷰 렌더러 설정
     * 최대 재시도 제한 추가 (무한 루프 방지)
     */
    let previewRendererRetryCount = 0;
    const MAX_PREVIEW_RETRY = 25; // 최대 25회 (5초)

    function setupPreviewRenderer() {
        const previewEl = document.querySelector('.toastui-editor-contents');
        if (!previewEl) {
            previewRendererRetryCount++;
            if (previewRendererRetryCount >= MAX_PREVIEW_RETRY) {
                console.warn('[MyMind3Editor] Preview not found after', MAX_PREVIEW_RETRY, 'retries. Giving up.');
                return;
            }
            console.log('[MyMind3Editor] Preview not found, retrying...', previewRendererRetryCount, '/', MAX_PREVIEW_RETRY);
            setTimeout(setupPreviewRenderer, 200);
            return;
        }
        // 성공 시 카운터 리셋
        previewRendererRetryCount = 0;

        console.log('[MyMind3Editor] Preview found, setting up LaTeX renderer');

        // 모든 요소 렌더링
        function renderAll() {
            const elements = previewEl.querySelectorAll('p, div, li, td, th, h1, h2, h3, h4, h5, h6');
            elements.forEach(el => el.classList.remove('katex-rendered'));
            elements.forEach(renderLatexInElement);
            console.log(`[MyMind3Editor] Rendered LaTeX in ${elements.length} elements`);
        }

        // 전역 변수에 저장
        latexRenderer = renderAll;

        // MutationObserver로 변경 감지
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === 1) {
                            renderLatexInElement(node);
                            const children = node.querySelectorAll('p, div, li, td, th, h1, h2, h3, h4, h5, h6');
                            children.forEach(renderLatexInElement);
                        }
                    });
                } else if (mutation.type === 'characterData' && mutation.target.parentElement) {
                    renderLatexInElement(mutation.target.parentElement);
                }
            });
        });

        observer.observe(previewEl, {
            childList: true,
            subtree: true,
            characterData: true
        });

        // 초기 및 주기적 렌더링
        setTimeout(renderAll, 100);
        setTimeout(renderAll, 500);
        setTimeout(renderAll, 1000);

        console.log('[MyMind3Editor] LaTeX renderer activated');
    }

    /**
     * Scroll Sync 항상 활성화
     * 최대 재시도 제한 추가 (무한 루프 방지)
     */
    let scrollSyncRetryCount = 0;
    const MAX_SCROLL_SYNC_RETRY = 30; // 최대 30회 (3초)

    function enableScrollSync() {
        // scroll-sync 체크박스 찾기
        const scrollSyncCheckbox = document.querySelector('.scroll-sync input[type="checkbox"]');

        if (scrollSyncCheckbox) {
            // 성공 시 카운터 리셋
            scrollSyncRetryCount = 0;

            // 항상 체크 상태로 설정
            scrollSyncCheckbox.checked = true;

            // 체크 상태 변경 방지 (사용자가 해제하지 못하도록)
            scrollSyncCheckbox.addEventListener('change', function(e) {
                if (!this.checked) {
                    this.checked = true;
                    console.log('[MyMind3Editor] Scroll sync forcibly enabled');
                }
            });

            console.log('[MyMind3Editor] Scroll sync permanently enabled');
        } else {
            // 아직 생성되지 않았으면 재시도 (최대 횟수 제한)
            scrollSyncRetryCount++;
            if (scrollSyncRetryCount >= MAX_SCROLL_SYNC_RETRY) {
                console.warn('[MyMind3Editor] Scroll sync checkbox not found after', MAX_SCROLL_SYNC_RETRY, 'retries. Giving up.');
                return;
            }
            setTimeout(enableScrollSync, 100);
        }
    }

    /**
     * 커스텀 탭 UI 생성
     */
    function createCustomTabs() {
        const container = document.getElementById('toastEditor');
        if (!container) {
            console.error('[MyMind3Editor] toastEditor container not found for tabs');
            return;
        }

        // 기존 커스텀 탭이 있으면 제거
        const existingTabs = document.getElementById('customEditorTabs');
        if (existingTabs) {
            console.log('[MyMind3Editor] Removing existing tabs');
            existingTabs.remove();
        }

        // 커스텀 탭 생성 (높이 30% 감소: padding 12px→8px, font-size 15px→11px)
        const tabsHTML = `
            <div id="customEditorTabs" style="display: flex; gap: 0; border-bottom: 2px solid #ddd; background: #f8f9fa; padding: 0;">
                <button id="customTabWrite" class="custom-tab-btn active" style="flex: 1; padding: 8px 14px; border: none; background: #fff; cursor: pointer; font-size: 11px; font-weight: 600; border-bottom: 2px solid #1976d2; color: #1976d2; transition: all 0.2s;">
                    ${mmIcon('edit', 14)} 에디터
                </button>
                <button id="customTabPreview" class="custom-tab-btn" style="flex: 1; padding: 8px 14px; border: none; background: transparent; cursor: pointer; font-size: 11px; font-weight: 600; border-bottom: 2px solid transparent; color: #666; transition: all 0.2s;">
                    ${mmIcon('eye', 14)} 프리뷰
                </button>
            </div>
        `;

        container.insertAdjacentHTML('beforebegin', tabsHTML);
        console.log('[MyMind3Editor] Custom tabs created');

        // 탭 클릭 이벤트
        document.getElementById('customTabWrite').addEventListener('click', () => {
            console.log('[MyMind3Editor] Write tab clicked');
            switchTab('write');
        });
        document.getElementById('customTabPreview').addEventListener('click', () => {
            console.log('[MyMind3Editor] Preview tab clicked');
            switchTab('preview');
        });
    }

    /**
     * HTML 소스에서 텍스트로 된 HTML 태그 제거 (렌더링 전 처리)
     * < /h3 >< p >, < /p >< p > 등의 패턴을 HTML 문자열에서 직접 제거
     */
    function cleanHTMLSourceTags(htmlSource) {
        if (!htmlSource || typeof htmlSource !== 'string') return htmlSource;

        console.log('[cleanHTMLSourceTags] HTML 소스 정제 시작');

        // HTML 소스에서 텍스트로 된 태그 패턴들을 제거
        let cleanedHTML = htmlSource
            // 기본 HTML 태그 텍스트 패턴
            .replace(/&lt;\s*p\s*&gt;/gi, '')           // &lt;p&gt;
            .replace(/&lt;\s*\/\s*p\s*&gt;/gi, '')      // &lt;/p&gt;
            .replace(/&lt;\s*h[1-6]\s*&gt;/gi, '')      // &lt;h3&gt;
            .replace(/&lt;\s*\/\s*h[1-6]\s*&gt;/gi, '') // &lt;/h3&gt;

            // 공백이 포함된 패턴들 (< p >, < /p >, < h3 >, < /h3 > 등)
            .replace(/&lt;\s+p\s*&gt;/gi, '')           // &lt; p&gt;
            .replace(/&lt;\s*\/\s*p\s+&gt;/gi, '')      // &lt;/p &gt;
            .replace(/&lt;\s+\/\s*p\s*&gt;/gi, '')      // &lt; /p&gt;
            .replace(/&lt;\s+h[1-6]\s*&gt;/gi, '')      // &lt; h3&gt;
            .replace(/&lt;\s*\/\s*h[1-6]\s+&gt;/gi, '') // &lt;/h3 &gt;
            .replace(/&lt;\s+\/\s*h[1-6]\s*&gt;/gi, '') // &lt; /h3&gt;

            // 연속된 태그 조합들
            .replace(/&lt;\s*\/\s*h[1-6]\s*&gt;\s*&lt;\s*p\s*&gt;/gi, '') // &lt;/h3&gt;&lt;p&gt;
            .replace(/&lt;\s*\/\s*p\s*&gt;\s*&lt;\s*p\s*&gt;/gi, '')      // &lt;/p&gt;&lt;p&gt;
            .replace(/&lt;\s*\/\s*p\s*&gt;\s*&lt;\s*h[1-6]\s*&gt;/gi, '') // &lt;/p&gt;&lt;h3&gt;

            // 실제 < > 문자로 된 패턴들 (이스케이프되지 않은 경우)
            .replace(/<\s*(?!\/?\w+[^>]*>)\s*p\s*>/gi, '')          // <p> (실제 태그가 아닌 텍스트)
            .replace(/<\s*\/\s*p\b\s*(?!>)/gi, '')                  // </p (실제 태그가 아닌 텍스트, </pre 제외)
            .replace(/<\s*h[1-6]\s*(?!\/?\w+[^>]*>)>/gi, '')       // <h3> (실제 태그가 아닌 텍스트)
            .replace(/<\s*\/\s*h[1-6]\s*(?!>)/gi, '')              // </h3 (실제 태그가 아닌 텍스트)

            // 기타 일반적인 HTML 태그들
            .replace(/&lt;\s*br\s*\/?&gt;/gi, '')       // &lt;br&gt;, &lt;br/&gt;
            .replace(/&lt;\s*div\s*&gt;/gi, '')         // &lt;div&gt;
            .replace(/&lt;\s*\/\s*div\s*&gt;/gi, '')    // &lt;/div&gt;
            .replace(/&lt;\s*span\s*&gt;/gi, '')        // &lt;span&gt;
            .replace(/&lt;\s*\/\s*span\s*&gt;/gi, '');  // &lt;/span&gt;

        if (cleanedHTML !== htmlSource) {
            console.log('[cleanHTMLSourceTags] HTML 소스에서 태그 텍스트 제거 완료');
        }

        return cleanedHTML;
    }

    // ========================================
    // Mermaid 다이어그램 렌더링 (Phase 1, 2)
    // ========================================

    /**
     * Mermaid CDN 지연 로더 - 최초 mermaid 코드블록 감지 시 1회만 로드
     * @returns {Promise<void>}
     */
    async function loadMermaidLibrary() {
        if (_mermaidLoaded && window.mermaid) return;
        if (_mermaidLoading) {
            return new Promise(resolve => _mermaidLoadCallbacks.push(resolve));
        }
        _mermaidLoading = true;

        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            // major 버전 고정 (@10) - v10→v11 API 브레이킹 체인지 방지
            script.src = 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js';
            script.onload = () => {
                const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
                window.mermaid.initialize({
                    startOnLoad: false,
                    theme: isDark ? 'dark' : 'default',
                    securityLevel: 'strict'
                });
                _mermaidLoaded = true;
                _mermaidLoading = false;
                _mermaidLoadCallbacks.forEach(cb => cb());
                _mermaidLoadCallbacks = [];
                console.log('[Mermaid] CDN 로드 완료 (theme:', isDark ? 'dark' : 'default', ')');
                resolve();
            };
            script.onerror = () => {
                _mermaidLoading = false;
                _mermaidLoadCallbacks.forEach(cb => cb());
                _mermaidLoadCallbacks = [];
                console.error('[Mermaid] CDN 로드 실패');
                reject(new Error('Mermaid CDN 로드 실패'));
            };
            document.head.appendChild(script);
        });
    }

    /**
     * 프리뷰 컨테이너 내 mermaid 코드블록을 SVG 다이어그램으로 렌더링
     * - pre code.language-mermaid 감지
     * - CDN 실패 시 폴백 메시지 표시
     * - for...of + await 순차 처리 (DOM 충돌 방지)
     * @param {Element} container - 프리뷰 컨테이너
     */
    async function renderMermaidInPreview(container) {
        // TOAST UI Editor: data-language="mermaid", 표준 마크다운: class="language-mermaid"
        const mermaidBlocks = container.querySelectorAll('pre code.language-mermaid, pre code[data-language="mermaid"]');
        if (mermaidBlocks.length === 0) return;

        try {
            await loadMermaidLibrary();
        } catch (e) {
            // CDN 실패 시 사용자 피드백
            mermaidBlocks.forEach(codeEl => {
                const preEl = codeEl.parentElement;
                const errorDiv = document.createElement('div');
                errorDiv.className = 'mermaid-error';
                errorDiv.innerHTML = '<p>Mermaid 라이브러리를 로드할 수 없습니다</p>'
                    + '<pre>' + codeEl.textContent + '</pre>';
                preEl.replaceWith(errorDiv);
            });
            return;
        }

        // for...of + await 순차 처리 (forEach 병렬 금지 - DOM ID 충돌)
        let idx = 0;
        for (const codeEl of mermaidBlocks) {
            const preEl = codeEl.parentElement;
            // TOAST UI Editor: <div class="toastui-editor-ww-code-block"><pre><code> 구조
            // 교체 대상은 wrapper div가 있으면 그것, 없으면 pre
            const replaceTarget = (preEl.parentElement && preEl.parentElement.classList.contains('toastui-editor-ww-code-block'))
                ? preEl.parentElement : preEl;
            const code = codeEl.textContent.trim();

            try {
                // 고유 ID: Date.now + index + random (밀리초 충돌 방지)
                const uniqueId = 'mermaid-' + Date.now() + '-' + (idx++) + '-' + Math.random().toString(36).slice(2, 6);
                const { svg } = await window.mermaid.render(uniqueId, code);

                const wrapper = document.createElement('div');
                wrapper.className = 'mermaid-rendered';
                wrapper.innerHTML = svg;
                replaceTarget.replaceWith(wrapper);
            } catch (err) {
                const errorDiv = document.createElement('div');
                errorDiv.className = 'mermaid-error';
                errorDiv.innerHTML = '<p>Mermaid 렌더링 오류</p>'
                    + '<pre>' + (err.message || '알 수 없는 오류') + '</pre>'
                    + '<pre>' + code + '</pre>';
                replaceTarget.replaceWith(errorDiv);
            }
        }
    }

    /**
     * Mermaid CSS 스타일 동적 삽입 (1회만)
     */
    function injectMermaidStyles() {
        if (document.getElementById('mermaid-preview-styles')) return;
        const style = document.createElement('style');
        style.id = 'mermaid-preview-styles';
        style.textContent = `
            .mermaid-rendered {
                text-align: center;
                padding: 16px;
                margin: 12px 0;
                border: 1px solid #e0e0e0;
                border-radius: 8px;
                background: #fafafa;
                overflow-x: auto;
            }
            .mermaid-rendered svg {
                max-width: 100%;
                height: auto;
            }
            .mermaid-error {
                padding: 12px;
                margin: 12px 0;
                border: 1px solid #ff4444;
                border-radius: 8px;
                background: #fff5f5;
                color: #cc0000;
                font-size: 13px;
            }
            .mermaid-error pre {
                margin: 8px 0 0;
                padding: 8px;
                background: #f8f8f8;
                border-radius: 4px;
                font-size: 12px;
                overflow-x: auto;
                white-space: pre-wrap;
            }
            [data-theme="dark"] .mermaid-rendered {
                border-color: #2a2a2a;
                background: #0a0a0a;
            }
            [data-theme="dark"] .mermaid-error {
                border-color: #cc3333;
                background: #1a0000;
                color: #ff6666;
            }
            [data-theme="dark"] .mermaid-error pre {
                background: #111111;
            }
        `;
        document.head.appendChild(style);
    }

    // CSS 즉시 삽입
    injectMermaidStyles();

    /**
     * 프리뷰에서 HTML 태그가 텍스트로 표시되는 것 강제 삭제
     * <p>, </p>, <h3>, </h3> 등 모든 HTML 태그 패턴 제거
     */
    function cleanPTagTexts(container) {
        if (!container) return;

        // TextNode를 순회하면서 HTML 태그 패턴 제거
        // Mermaid SVG 내부 텍스트 노드는 스킵 (다이어그램 레이블 보호)
        const walker = document.createTreeWalker(
            container,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: function(node) {
                    if (node.parentElement && (node.parentElement.closest('.mermaid-rendered') || node.parentElement.closest('.mermaid-error'))) {
                        return NodeFilter.FILTER_REJECT;
                    }
                    return NodeFilter.FILTER_ACCEPT;
                }
            },
            false
        );

        const textNodes = [];
        let node;
        while (node = walker.nextNode()) {
            textNodes.push(node);
        }

        let cleanedCount = 0;
        textNodes.forEach(textNode => {
            let content = textNode.textContent;
            const originalContent = content;

            // HTML 태그 패턴들을 제거
            content = content
                // <p> 관련 태그들
                .replace(/<\s*p\s*>/gi, '')               // <p>
                .replace(/<\s*\/\s*p\s*>/gi, '')          // </p>
                .replace(/<\s*p\s+[^>]*>/gi, '')          // <p class="...">

                // <h1>, <h2>, <h3>, <h4>, <h5>, <h6> 관련 태그들
                .replace(/<\s*h[1-6]\s*>/gi, '')          // <h1>, <h2>, <h3>, etc.
                .replace(/<\s*\/\s*h[1-6]\s*>/gi, '')     // </h1>, </h2>, </h3>, etc.
                .replace(/<\s*h[1-6]\s+[^>]*>/gi, '')     // <h3 class="...">

                // 공백이 포함된 패턴들 (< p >, < /p >, < h3 >, < /h3 > 등)
                .replace(/<\s+p\s*>/gi, '')               // < p>
                .replace(/<\s*\/\s*p\s+>/gi, '')          // </p >
                .replace(/<\s+\/\s*p\s*>/gi, '')          // < /p>
                .replace(/<\s+h[1-6]\s*>/gi, '')          // < h3>
                .replace(/<\s*\/\s*h[1-6]\s+>/gi, '')     // </h3 >
                .replace(/<\s+\/\s*h[1-6]\s*>/gi, '')     // < /h3>

                // 연속된 태그 조합들 (< /h3 >< p >, < /p >< p > 등)
                .replace(/<\s*\/\s*h[1-6]\s*>\s*<\s*p\s*>/gi, '') // </h3><p>
                .replace(/<\s*\/\s*p\s*>\s*<\s*p\s*>/gi, '')      // </p><p>
                .replace(/<\s*\/\s*p\s*>\s*<\s*h[1-6]\s*>/gi, '') // </p><h3>

                // HTML 엔티티 형태
                .replace(/&lt;\s*p\s*&gt;/gi, '')         // &lt;p&gt;
                .replace(/&lt;\s*\/\s*p\s*&gt;/gi, '')    // &lt;/p&gt;
                .replace(/&lt;\s*h[1-6]\s*&gt;/gi, '')    // &lt;h3&gt;
                .replace(/&lt;\s*\/\s*h[1-6]\s*&gt;/gi, '') // &lt;/h3&gt;

                // 기타 일반적인 HTML 태그들 (필요시 추가)
                .replace(/<\s*br\s*\/?>/gi, '')           // <br>, <br/>
                .replace(/<\s*div\s*>/gi, '')             // <div>
                .replace(/<\s*\/\s*div\s*>/gi, '')        // </div>
                .replace(/<\s*span\s*>/gi, '')            // <span>
                .replace(/<\s*\/\s*span\s*>/gi, '');      // </span>

            if (originalContent !== content) {
                textNode.textContent = content;
                cleanedCount++;
            }
        });

        if (cleanedCount > 0) {
            console.log(`[cleanPTagTexts] ${cleanedCount}개의 텍스트 노드에서 HTML 태그 텍스트 제거 완료`);
        }
    }

    /**
     * 프리뷰 영역을 맨 위로 스크롤
     */
    function forceScrollToTop() {
        // 커스텀 프리뷰 컨테이너 (실제 스크롤 대상)
        const customPreviewContainer = document.querySelector('.custom-preview-container');
        if (customPreviewContainer) {
            customPreviewContainer.scrollTop = 0;
        }
        // 에디터 마크다운 영역도 맨 위로
        const mdContainer = document.querySelector('.toastui-editor-md-container .toastui-editor-md-scroll-sync');
        if (mdContainer) {
            mdContainer.scrollTop = 0;
        }
        const mdPreview = document.querySelector('.toastui-editor-md-preview');
        if (mdPreview) {
            mdPreview.scrollTop = 0;
        }
    }

    /**
     * 이미지 경로 변환 헬퍼 함수
     * /폴더명/노드ID/파일명 → /api/files/폴더명/노드ID/파일명
     */
    function convertImagePaths(container) {
        if (!container) return;
        const images = container.querySelectorAll('img');
        images.forEach(img => {
            const src = img.getAttribute('src');
            if (src && src.startsWith('/') && !src.startsWith('/api/files/')) {
                const match = src.match(/^\/([^/]+\/\d+\/[^/]+\.(jpeg|jpg|png|gif|webp))$/i);
                if (match) {
                    img.setAttribute('src', '/api/files' + src);
                    console.log('[convertImagePaths] Converted:', src);
                }
            }
        });
    }

    /**
     * 커스텀 프리뷰 갱신 (노드 내용 변경 시 호출)
     */
    function refreshCustomPreview() {
        if (!editorInstance) {
            console.log('[MyMind3Editor] No editor instance for refresh');
            return;
        }

        const customPreview = document.querySelector('.custom-preview-container');
        if (!customPreview) {
            console.log('[MyMind3Editor] No custom preview to refresh');
            return;
        }

        // FIX: 커스텀 프리뷰 컨테이너 표시 확인 및 강제 표시
        if (getComputedStyle(customPreview).display === 'none') {
            console.warn('[MyMind3Editor] Custom preview container was hidden, forcing display');
            customPreview.style.display = 'block';
        }

        // FIX: getHTML() 호출 시 에러 처리 추가
        try {
            // editorInstance.getHTML()로 직접 HTML 생성 (프리뷰가 숨겨져 있어도 동작)
            let html;
            try {
                html = editorInstance.getHTML();
            } catch (htmlError) {
                // getHTML() 실패 시 getMarkdown()으로 폴백 (복잡한 LaTeX/수식 콘텐츠에서 발생 가능)
                console.warn('[MyMind3Editor] getHTML() failed, falling back to getMarkdown():', htmlError.message);
                const markdown = editorInstance.getMarkdown();
                if (markdown && markdown.trim().length > 0) {
                    html = markdown
                        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
                        .replace(/^## (.+)$/gm, '<h2>$1</h2>')
                        .replace(/^# (.+)$/gm, '<h1>$1</h1>')
                        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                        .replace(/\*(.+?)\*/g, '<em>$1</em>')
                        .replace(/\n\n/g, '</p><p>')
                        .replace(/\n/g, '<br>');
                    html = '<p>' + html + '</p>';
                } else {
                    html = '<p>(내용 없음)</p>';
                }
            }

            // FIX: HTML이 비어있거나 매우 짧으면 마크다운에서 재시도
            if (!html || html.trim().length < 10) {
                console.warn('[MyMind3Editor] HTML is empty or too short, trying markdown');
                const markdown = editorInstance.getMarkdown();
                if (markdown && markdown.trim().length > 0) {
                    // 간단한 마크다운 → HTML 변환 (기본 렌더링)
                    html = markdown
                        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
                        .replace(/^## (.+)$/gm, '<h2>$1</h2>')
                        .replace(/^# (.+)$/gm, '<h1>$1</h1>')
                        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                        .replace(/\*(.+?)\*/g, '<em>$1</em>')
                        .replace(/\n/g, '<br>');
                    console.log('[MyMind3Editor] Fallback HTML generated from markdown');
                }
            }

            // 렌더링 전에 HTML 소스에서 태그 텍스트 제거
            html = cleanHTMLSourceTags(html);

            // 이미지 경로 변환: /폴더명/노드ID/파일명 → /api/files/폴더명/노드ID/파일명
            // 짧은 경로로 저장된 이미지를 실제 API 경로로 변환
            // FIX: /api/files/로 시작하지 않는 경로만 변환 (negative lookahead)
            html = html.replace(/src="\/(?!api\/files\/|save\/)([^"]+\/\d+\/[^"]+\.(jpeg|jpg|png|gif|webp))"/gi,
                'src="/api/files/$1"');

            // 프리뷰 최상단에 빈 줄 3개 추가
            const emptyLines = '<br><br><br>';
            customPreview.innerHTML = emptyLines + html;

            // NEW: 마크다운 위치 정보를 HTML 요소에 부여 (별도 try-catch로 프리뷰 렌더링 실패 방지)
            try {
                const rawMarkdown = editorInstance.getMarkdown();
                const blocks = parseMarkdownPositions(rawMarkdown);
                attachMarkdownPositions(customPreview, blocks);
            } catch (posError) {
                console.warn('[MyMind3Editor] Markdown position mapping failed (non-critical):', posError.message);
            }

            console.log('[MyMind3Editor] Custom preview content updated from editor.getHTML()');
        } catch (error) {
            console.error('[MyMind3Editor] Error generating preview HTML:', error);

            // CRITICAL: 에러 발생 시에도 원본 마크다운 내용은 반드시 표시
            let rawMarkdown = editorInstance.getMarkdown();

            // 에러 시에도 마크다운에서 HTML 태그 텍스트 제거
            rawMarkdown = cleanHTMLSourceTags(rawMarkdown);

            const emptyLines = '<br><br><br>';
            customPreview.innerHTML = emptyLines + `
                <div class="preview-error-banner">
                    <h4>${mmIcon('alert-triangle', 16)} 프리뷰 렌더링 오류</h4>
                    <p>마크다운을 HTML로 변환하는 중 오류가 발생했습니다. 원본 마크다운을 표시합니다.</p>
                    <details>
                        <summary>오류 상세 정보</summary>
                        <p class="preview-error-detail">${error.message}</p>
                    </details>
                </div>
                <div class="preview-raw-markdown">${rawMarkdown.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
            `;

            console.log('[MyMind3Editor] Error handling with cleaned markdown source');

            console.log('[MyMind3Editor] Displayed raw markdown due to rendering error');
            return;
        }


        // CRITICAL FIX: 커스텀 프리뷰의 모든 요소에 대해 LaTeX 렌더링
        // latexRenderer는 .toastui-editor-contents를 대상으로 하므로 custom-preview-container에는 작동 안함
        setTimeout(() => {
            // STEP 1: 전체 HTML에서 크로스-엘리먼트 display math ($$...$$) 먼저 처리
            // TOAST UI가 멀티라인 $$...$$ 를 여러 <p>로 분리하므로, 전체 HTML에서 매칭 필요
            try {
                let fullHTML = customPreview.innerHTML;
                const hasDisplayMath = fullHTML.includes('$$');
                if (hasDisplayMath && window.katex) {
                    const newHTML = fullHTML.replace(/\$\$([\s\S]+?)\$\$/g, (match, latex) => {
                        // 테이블/리스트 등 구조적 HTML이 포함된 매칭은 건드리지 않음 (표 파괴 방지)
                        if (/<\/?(table|thead|tbody|tr|td|th|ul|ol|li|h[1-6]|img|video|iframe)[^>]*>/i.test(match)) {
                            return match;
                        }
                        try {
                            let cleanLatex = latex.trim()
                                .replace(/<\/?(em|strong|i|b|code|span|a|p|div|br|sup|sub)[^>]*>/gi, '')
                                .replace(/&amp;/g, '&')
                                .replace(/&lt;/g, '<')
                                .replace(/&gt;/g, '>')
                                .replace(/&quot;/g, '"')
                                .replace(/&#39;/g, "'")
                                .replace(/&nbsp;/g, ' ');
                            return window.katex.renderToString(cleanLatex, {
                                displayMode: true,
                                throwOnError: false
                            });
                        } catch (e) {
                            console.warn('[renderLatex] Cross-element display math error:', e.message);
                            return match;
                        }
                    });
                    if (newHTML !== fullHTML) {
                        customPreview.innerHTML = newHTML;
                        console.log('[MyMind3Editor] Cross-element display math rendered');
                    }
                }
            } catch (crossMathError) {
                console.warn('[MyMind3Editor] Cross-element math processing failed (non-critical):', crossMathError.message);
            }

            // STEP 2: 요소별 인라인 수식 ($...$) 렌더링
            const elements = customPreview.querySelectorAll('p, div, li, td, th, h1, h2, h3, h4, h5, h6, span');
            let renderedCount = 0;

            elements.forEach(el => {
                // katex-rendered 클래스 제거하여 재렌더링 가능하게
                el.classList.remove('katex-rendered');

                // LaTeX 렌더링 (인라인 + 남은 display math)
                renderLatexInElement(el);

                if (el.classList.contains('katex-rendered')) {
                    renderedCount++;
                }
            });

            console.log(`[MyMind3Editor] LaTeX re-rendered in custom preview: ${renderedCount} elements`);

            // STEP 3: Mermaid 다이어그램 렌더링 (KaTeX 이후, .catch로 에러 안전 처리)
            renderMermaidInPreview(customPreview).catch(function(err) {
                console.warn('[Mermaid] 프리뷰 렌더링 실패:', err.message);
            });

            // ENHANCED FIX: LaTeX 렌더링 후 스크롤 재조정
            forceScrollToTop();

            // CRITICAL FIX: LaTeX 렌더링 후 빈 <p> 태그 제거
            setTimeout(() => {
                const emptyPTags = customPreview.querySelectorAll('p');
                let removedCount = 0;
                emptyPTags.forEach(pTag => {
                    if (pTag.innerHTML.trim() === '') {
                        console.log('[refreshCustomPreview] Removing empty <p> tag');
                        pTag.remove();
                        removedCount++;
                    }
                });
                if (removedCount > 0) {
                    console.log(`[refreshCustomPreview] Removed ${removedCount} empty <p> tags`);
                }

                // DOM 기반 이미지 경로 변환 (LaTeX 렌더링 후 재확인)
                convertImagePaths(customPreview);

                // FIX: 프리뷰 갱신 후 첨부파일 목록도 새로고침 (innerHTML로 사라지므로)
                if (window.NodeAttachments && window.NodeAttachments.refreshAttachmentList) {
                    console.log('[MyMind3Editor] Refreshing attachment list after preview update');
                    window.NodeAttachments.refreshAttachmentList();
                }

                // 모든 DOM 변경 완료 후 스크롤을 맨 위로 (항상 첫 내용부터 표시)
                forceScrollToTop();
            }, 50);
        }, 100);
    }

    // ========================================
    // REFACTOR-009: switchTab 분해
    // ========================================

    /**
     * 탭 버튼 스타일 업데이트
     * @param {string} activeTab - 활성화할 탭 ('write' 또는 'preview')
     */
    function updateTabButtonStyles(activeTab) {
        const writeBtn = document.getElementById('customTabWrite');
        const previewBtn = document.getElementById('customTabPreview');

        if (!writeBtn || !previewBtn) return;

        if (activeTab === 'write') {
            writeBtn.classList.add('active');
            writeBtn.style.background = '#fff';
            writeBtn.style.borderBottomColor = '#1976d2';
            writeBtn.style.color = '#1976d2';

            previewBtn.classList.remove('active');
            previewBtn.style.background = 'transparent';
            previewBtn.style.borderBottomColor = 'transparent';
            previewBtn.style.color = '#666';
        } else {
            writeBtn.classList.remove('active');
            writeBtn.style.background = 'transparent';
            writeBtn.style.borderBottomColor = 'transparent';
            writeBtn.style.color = '#666';

            previewBtn.classList.add('active');
            previewBtn.style.background = '#fff';
            previewBtn.style.borderBottomColor = '#1976d2';
            previewBtn.style.color = '#1976d2';
        }
    }

    /**
     * 에디터 영역 요소들 가져오기
     * @returns {Object} 에디터 관련 DOM 요소들
     */
    function getEditorElements() {
        return {
            mdContainer: document.querySelector('.toastui-editor-md-container'),
            mdEditor: document.querySelector('.toastui-editor.md-mode'),
            mdSplitter: document.querySelector('.toastui-editor-md-splitter'),
            previewContainer: document.querySelector('.toastui-editor-md-preview')
        };
    }

    /**
     * Write 모드 UI 표시
     */
    function showWriteMode() {
        console.log('[MyMind3Editor] Switching to WRITE mode');

        // 마크다운 모드로 전환
        if (editorInstance.isMarkdownMode && !editorInstance.isMarkdownMode()) {
            editorInstance.changeMode('markdown');
        }

        const { mdContainer, mdEditor, mdSplitter, previewContainer } = getEditorElements();

        // mdContainer는 항상 보여야 함
        if (mdContainer) mdContainer.style.display = 'flex';
        // 에디터 영역 보이기 (전체 너비)
        if (mdEditor) {
            mdEditor.style.display = 'block';
            mdEditor.style.width = '100%';
            mdEditor.style.flex = '1';
        }
        // 구분선 숨기기
        if (mdSplitter) mdSplitter.style.display = 'none';
        // 프리뷰 숨기기
        if (previewContainer) {
            previewContainer.style.setProperty('display', 'none', 'important');
            previewContainer.style.setProperty('width', '0', 'important');
            previewContainer.style.setProperty('flex', '0', 'important');
        }

        // 백그라운드에서 프리뷰 렌더링
        setTimeout(() => {
            refreshCustomPreview();
            console.log('[MyMind3Editor] Background preview refresh on write tab switch');
        }, 100);
    }

    /**
     * 탭 전환
     */
    function switchTab(tab) {
        console.log(`[MyMind3Editor] switchTab called: ${tab}`);

        if (!editorInstance) {
            console.warn('[MyMind3Editor] No editor instance, cannot switch tab');
            return;
        }

        currentTab = tab;
        updateTabButtonStyles(tab);

        if (tab === 'write') {
            showWriteMode();
        } else {
            showPreviewMode();
        }

        console.log(`[MyMind3Editor] Switched to ${tab} tab`);
    }

    /**
     * 프리뷰 커서 설정
     * 읽기 전용 - 텍스트 선택/복사만 가능, 입력 불가
     * @param {HTMLElement} customPreview - 프리뷰 컨테이너
     */
    function setupPreviewCursor(customPreview) {
        if (!customPreview) return;

        // 이미 설정된 경우 스킵
        if (customPreview.getAttribute('data-cursor-setup') === 'true') return;
        customPreview.setAttribute('data-cursor-setup', 'true');

        // 프리뷰는 읽기 전용 - contenteditable 사용하지 않음
        // 텍스트 선택/복사는 user-select: text CSS로 가능
        customPreview.removeAttribute('contenteditable');

        // 클릭 시 커서 위치 저장 (에디터 전환 시 복원용)
        customPreview.addEventListener('mouseup', (e) => {
            savePreviewCursorPosition(e.target);
        });

        console.log('[MyMind3Editor] Preview read-only mode initialized');
    }

    /**
     * 프리뷰 커서 위치 저장 (DOM 인덱스 기반 - WYSIWYG 모드 지원)
     */
    function savePreviewCursorPosition(clickedElement) {
        const selection = window.getSelection();
        const customPreview = document.querySelector('.custom-preview-container');
        if (!customPreview) return;

        // clickedElement가 없으면 selection에서 가져오기
        if (!clickedElement && selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            clickedElement = range.startContainer;
        }

        if (!clickedElement) return;

        // 클릭한 요소의 텍스트 가져오기 (텍스트 노드 처리 개선)
        let clickedText = '';
        let originalClickedElement = clickedElement;

        if (clickedElement.nodeType === Node.TEXT_NODE) {
            clickedText = clickedElement.textContent.trim();
        } else {
            // 요소 내부의 첫 번째 텍스트 가져오기
            const walker = document.createTreeWalker(clickedElement, NodeFilter.SHOW_TEXT, null, false);
            const firstText = walker.nextNode();
            if (firstText) {
                clickedText = firstText.textContent.trim();
            }
            if (!clickedText) {
                clickedText = clickedElement.textContent.trim().substring(0, 100);
            }
        }

        // 텍스트 노드인 경우 부모 요소로 이동
        let targetElement = clickedElement;
        if (targetElement.nodeType === Node.TEXT_NODE) {
            targetElement = targetElement.parentElement;
        }

        // 가장 가까운 블록 요소 찾기 (p, h1-h6, li, td, th, pre, blockquote)
        const blockTags = ['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'TD', 'TH', 'PRE', 'BLOCKQUOTE'];
        let blockElement = targetElement;
        while (blockElement && blockElement !== customPreview && blockElement !== document.body) {
            if (blockTags.includes(blockElement.tagName)) {
                break;
            }
            blockElement = blockElement.parentElement;
        }

        // 블록 요소를 찾지 못한 경우: 이전 형제 블록 요소 찾기
        if (!blockElement || blockElement === customPreview || blockElement === document.body) {
            // 프리뷰 내 모든 블록 요소와 텍스트 노드 순회하여 클릭된 위치 찾기
            const allBlocks = Array.from(customPreview.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, td, th, pre, blockquote'));

            // 클릭한 텍스트로 가장 가까운 이전 블록 찾기
            let foundBlockIndex = -1;
            const allNodes = Array.from(customPreview.childNodes);

            for (let i = 0; i < allNodes.length; i++) {
                const node = allNodes[i];
                if (blockTags.includes(node.tagName)) {
                    foundBlockIndex = allBlocks.indexOf(node);
                }
                // 클릭한 텍스트를 포함하는 노드 발견
                if (node === originalClickedElement ||
                    node.contains(originalClickedElement) ||
                    (node.nodeType === Node.TEXT_NODE && node.textContent.includes(clickedText.substring(0, 20)))) {
                    break;
                }
            }

            if (foundBlockIndex >= 0) {
                blockElement = allBlocks[foundBlockIndex];
            } else {
                // 텍스트 기반으로 찾기
                console.log('[MyMind3Editor] Searching by text:', clickedText.substring(0, 30));
                previewCursorPosition = {
                    node: originalClickedElement,
                    offset: 0,
                    blockIndex: -1,
                    blockTag: 'TEXT',
                    blockText: '',
                    clickedText: clickedText.substring(0, 100),
                    markdownLine: -1,
                    markdownEndLine: -1,
                    blockType: 'text'
                };
                console.log('[MyMind3Editor] Preview cursor position saved (text-only):', {
                    clickedText: clickedText.substring(0, 50)
                });
                return;
            }
        }

        // 프리뷰 컨테이너 내 모든 블록 요소 수집
        const allBlocks = Array.from(customPreview.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, td, th, pre, blockquote'));

        // 클릭한 블록 요소의 인덱스 찾기
        const blockIndex = allBlocks.indexOf(blockElement);

        // 블록 요소 텍스트 (더 정확한 매칭용)
        const blockText = blockElement.textContent.trim().substring(0, 100);

        // Selection에서 range 정보 가져오기 (있는 경우)
        let range = null;
        let textOffset = 0;
        if (selection && selection.rangeCount > 0) {
            range = selection.getRangeAt(0);
            textOffset = range.startOffset;
        }

        previewCursorPosition = {
            node: range ? range.startContainer : clickedElement,
            offset: textOffset,
            blockIndex: blockIndex,
            blockTag: blockElement.tagName,
            blockText: blockText,
            clickedText: clickedText.substring(0, 100),
            // 기존 호환성을 위한 필드 (DOM 인덱스 기반으로 계산)
            markdownLine: blockIndex,
            markdownEndLine: blockIndex,
            blockType: blockElement.tagName.toLowerCase()
        };

        console.log('[MyMind3Editor] Preview cursor position saved (DOM-based):', {
            blockIndex: blockIndex,
            blockTag: blockElement.tagName,
            blockText: blockText.substring(0, 30),
            clickedText: clickedText.substring(0, 30)
        });
    }

    /**
     * 텍스트를 기반으로 마크다운에서 라인 번호 찾기
     * @param {string} text - 검색할 텍스트
     * @returns {number} 마크다운 라인 번호 (0-based)
     */
    function findMarkdownLineByText(text) {
        if (!text || !editorInstance) return 0;

        const markdown = editorInstance.getMarkdown();
        const lines = markdown.split('\n');

        // 텍스트 정규화 (공백, 특수문자 제거)
        const normalizeText = (t) => t.replace(/[*#_`\[\]()]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
        const searchText = normalizeText(text);

        if (!searchText) return 0;

        // 정확한 매칭 시도
        for (let i = 0; i < lines.length; i++) {
            const lineText = normalizeText(lines[i]);
            if (lineText && lineText.includes(searchText.substring(0, 20))) {
                console.log(`[MyMind3Editor] Found text match at line ${i}: "${lines[i].substring(0, 50)}"`);
                return i;
            }
        }

        // 부분 매칭 시도 (첫 10자)
        const partialSearch = searchText.substring(0, 10);
        for (let i = 0; i < lines.length; i++) {
            const lineText = normalizeText(lines[i]);
            if (lineText && lineText.includes(partialSearch)) {
                console.log(`[MyMind3Editor] Found partial match at line ${i}: "${lines[i].substring(0, 50)}"`);
                return i;
            }
        }

        return 0;
    }

    /**
     * 프리뷰 DOM 위치를 마크다운 라인으로 변환
     * @param {Range} range - Selection range
     * @returns {number} 마크다운 라인 번호
     */
    function calculateMarkdownLine(range) {
        const customPreview = document.querySelector('.custom-preview-container');
        if (!customPreview) return 0;

        // range의 시작점을 포함하는 가장 가까운 블록 요소 찾기
        let targetNode = range.startContainer;
        if (targetNode.nodeType === Node.TEXT_NODE) {
            targetNode = targetNode.parentElement;
        }

        // 블록 요소로 올라가기
        while (targetNode && !['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'DIV', 'PRE', 'BLOCKQUOTE', 'TABLE', 'TR'].includes(targetNode.tagName)) {
            targetNode = targetNode.parentElement;
            if (targetNode === customPreview || !targetNode) break;
        }

        if (!targetNode || targetNode === customPreview) {
            return 0;
        }

        // 해당 블록 요소가 프리뷰 내에서 몇 번째인지 계산
        const allBlocks = customPreview.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, pre, blockquote, table, tr');
        let lineCount = 0;

        for (let i = 0; i < allBlocks.length; i++) {
            if (allBlocks[i] === targetNode || allBlocks[i].contains(targetNode)) {
                lineCount = i + 1;
                break;
            }
        }

        return lineCount;
    }

    /**
     * 마크다운을 파싱하여 각 블록의 라인 번호 정보 반환
     * @param {string} markdown - 마크다운 텍스트
     * @returns {Array} 블록 정보 배열 [{type, startLine, endLine}, ...]
     */
    function parseMarkdownPositions(markdown) {
        const lines = markdown.split('\n');
        const blocks = [];
        let i = 0;

        while (i < lines.length) {
            const line = lines[i];
            const trimmedLine = line.trim();

            // 빈 줄 건너뛰기
            if (!trimmedLine) {
                i++;
                continue;
            }

            // 코드블록 (``` 또는 ~~~)
            if (trimmedLine.startsWith('```') || trimmedLine.startsWith('~~~')) {
                const startLine = i;
                const fence = trimmedLine.substring(0, 3);
                i++;
                while (i < lines.length && !lines[i].trim().startsWith(fence)) {
                    i++;
                }
                blocks.push({ type: 'pre', startLine, endLine: i });
                i++;
                continue;
            }

            // 헤딩 (# ~ ######)
            const headingMatch = trimmedLine.match(/^(#{1,6})\s/);
            if (headingMatch) {
                blocks.push({ type: `h${headingMatch[1].length}`, startLine: i, endLine: i });
                i++;
                continue;
            }

            // 테이블 (| 로 시작하는 연속 라인)
            if (trimmedLine.startsWith('|')) {
                const startLine = i;
                while (i < lines.length && lines[i].trim().startsWith('|')) {
                    i++;
                }
                blocks.push({ type: 'table', startLine, endLine: i - 1 });
                continue;
            }

            // 리스트 아이템 (-, *, +, 숫자.)
            const listMatch = trimmedLine.match(/^([-*+]|\d+\.)\s/);
            if (listMatch) {
                const startLine = i;
                // 같은 리스트 레벨의 연속 아이템 찾기
                const listType = listMatch[1].match(/\d/) ? 'ol' : 'ul';
                while (i < lines.length) {
                    const nextLine = lines[i].trim();
                    if (!nextLine) {
                        // 빈 줄이 있으면 리스트 종료 확인
                        if (i + 1 < lines.length && !lines[i + 1].trim().match(/^([-*+]|\d+\.)\s/)) {
                            break;
                        }
                    } else if (!nextLine.match(/^([-*+]|\d+\.)\s/) && !nextLine.startsWith('  ')) {
                        break;
                    }
                    i++;
                }
                blocks.push({ type: listType, startLine, endLine: i - 1 });
                continue;
            }

            // 인용구 (>로 시작)
            if (trimmedLine.startsWith('>')) {
                const startLine = i;
                while (i < lines.length && lines[i].trim().startsWith('>')) {
                    i++;
                }
                blocks.push({ type: 'blockquote', startLine, endLine: i - 1 });
                continue;
            }

            // 일반 문단
            const startLine = i;
            while (i < lines.length) {
                const nextLine = lines[i].trim();
                if (!nextLine || nextLine.startsWith('#') || nextLine.startsWith('```') ||
                    nextLine.startsWith('|') || nextLine.match(/^([-*+]|\d+\.)\s/) ||
                    nextLine.startsWith('>')) {
                    break;
                }
                i++;
            }
            blocks.push({ type: 'p', startLine, endLine: i - 1 });
        }

        return blocks;
    }

    /**
     * HTML 프리뷰 요소에 마크다운 위치 정보 부여 (순차 매핑 + 타입 기반)
     * @param {Element} previewContainer - 프리뷰 컨테이너
     * @param {Array} blocks - parseMarkdownPositions에서 반환된 블록 정보
     */
    function attachMarkdownPositions(previewContainer, blocks) {
        if (!blocks || blocks.length === 0) {
            console.log('[MyMind3Editor] No blocks to attach');
            return;
        }

        // DOM 요소 타입과 블록 타입 매핑
        const tagToType = {
            'H1': 'h1', 'H2': 'h2', 'H3': 'h3', 'H4': 'h4', 'H5': 'h5', 'H6': 'h6',
            'P': 'p',
            'LI': 'ul', // li는 ul 또는 ol
            'PRE': 'code',
            'BLOCKQUOTE': 'blockquote',
            'TH': 'table', 'TD': 'table',
            'TR': 'table',
            'TABLE': 'table'
        };

        // 프리뷰의 모든 블록 요소 수집 (Mermaid 렌더링 결과 내부 요소 제외)
        const rawElements = previewContainer.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, td, th, pre, blockquote');
        const allElements = Array.from(rawElements).filter(el => !el.closest('.mermaid-rendered') && !el.closest('.mermaid-error'));

        // 블록 인덱스 (각 타입별로 추적)
        const blockIndexByType = {};
        blocks.forEach((block, idx) => {
            const type = block.type;
            if (!blockIndexByType[type]) {
                blockIndexByType[type] = [];
            }
            blockIndexByType[type].push(idx);
        });

        // 사용된 블록 인덱스 추적 (각 타입별)
        const usedBlockIndex = {};
        Object.keys(blockIndexByType).forEach(type => {
            usedBlockIndex[type] = 0;
        });

        let attachedCount = 0;

        allElements.forEach((el) => {
            // 빈 요소 제외 (단, 이미지가 있는 경우는 포함)
            const elText = el.textContent.trim();
            if (!elText && !el.querySelector('img')) {
                return;
            }

            // 요소의 타입 결정
            const tagName = el.tagName;
            let elType = tagToType[tagName] || 'p';

            // LI는 부모에 따라 ul 또는 ol로 구분
            if (tagName === 'LI') {
                const parent = el.parentElement;
                if (parent && parent.tagName === 'OL') {
                    elType = 'ol';
                }
            }

            // 해당 타입의 다음 사용 가능한 블록 찾기
            const typeBlocks = blockIndexByType[elType];
            if (typeBlocks && usedBlockIndex[elType] < typeBlocks.length) {
                const blockIdx = typeBlocks[usedBlockIndex[elType]];
                const block = blocks[blockIdx];

                el.setAttribute('data-md-start-line', block.startLine);
                el.setAttribute('data-md-end-line', block.endLine);
                el.setAttribute('data-md-type', block.type);

                usedBlockIndex[elType]++;
                attachedCount++;
            } else {
                // 해당 타입의 블록이 없으면, 가장 가까운 블록 사용 (폴백)
                // 순서 기반으로 아직 사용되지 않은 블록 중 첫 번째 사용
                for (let i = 0; i < blocks.length; i++) {
                    const block = blocks[i];
                    if (!block._used) {
                        el.setAttribute('data-md-start-line', block.startLine);
                        el.setAttribute('data-md-end-line', block.endLine);
                        el.setAttribute('data-md-type', block.type);
                        block._used = true;
                        attachedCount++;
                        break;
                    }
                }
            }
        });

        // _used 플래그 정리
        blocks.forEach(b => delete b._used);

        console.log(`[MyMind3Editor] Attached markdown positions to ${attachedCount} elements (type-based sequential)`);
    }

    /**
     * 프리뷰 커서 위치에 이미지 삽입 (정확한 라인 위치)
     * @param {object} editor - TOAST UI Editor 인스턴스
     * @param {string} imageMarkdown - 삽입할 이미지 마크다운
     */
    function insertImageAtPreviewCursor(editor, imageMarkdown) {
        if (!previewCursorPosition) {
            console.log('[MyMind3Editor] No preview cursor position, appending to end');
            const currentMarkdown = editor.getMarkdown();
            if (currentMarkdown.trim()) {
                editor.setMarkdown(currentMarkdown + '\n\n' + imageMarkdown.trim());
            } else {
                editor.setMarkdown(imageMarkdown.trim());
            }
            refreshCustomPreview();
            return;
        }

        const hasClickedText = previewCursorPosition.clickedText && previewCursorPosition.clickedText.trim().length > 3;
        const hasBlockText = previewCursorPosition.blockText && previewCursorPosition.blockText.trim().length > 3;

        console.log(`[MyMind3Editor] insertImageAtPreviewCursor - clickedText: "${previewCursorPosition.clickedText?.substring(0, 30)}", blockText: "${previewCursorPosition.blockText?.substring(0, 30)}"`);

        // 방법 1: HTML 기반 삽입 - clickedText 사용 (가장 정확함)
        if (hasClickedText) {
            try {
                const html = editor.getHTML();
                if (html && html.trim()) {
                    const result = insertTextAfterClickedText(html, previewCursorPosition.clickedText, imageMarkdown);
                    if (result.success) {
                        editor.setHTML(result.html);
                        console.log('[MyMind3Editor] Image inserted via HTML after clickedText');
                        setTimeout(() => refreshCustomPreview(), 50);
                        return;
                    }
                }
            } catch (e) {
                console.log('[MyMind3Editor] HTML clickedText insertion failed:', e.message);
            }
        }

        // 방법 2: HTML 기반 삽입 - blockText 사용
        if (hasBlockText) {
            try {
                const html = editor.getHTML();
                if (html && html.trim()) {
                    const result = insertTextAfterClickedText(html, previewCursorPosition.blockText, imageMarkdown);
                    if (result.success) {
                        editor.setHTML(result.html);
                        console.log('[MyMind3Editor] Image inserted via HTML after blockText');
                        setTimeout(() => refreshCustomPreview(), 50);
                        return;
                    }
                }
            } catch (e) {
                console.log('[MyMind3Editor] HTML blockText insertion failed:', e.message);
            }
        }

        // 방법 3: 마크다운 기반 삽입 (폴백)
        console.log('[MyMind3Editor] Falling back to markdown line-based insertion');

        // data-md-* 속성에서 정확한 라인 번호 가져오기
        let insertAfterLine = previewCursorPosition.markdownEndLine;

        if (insertAfterLine === undefined || insertAfterLine === null) {
            // 폴백: 기존 방식 사용
            insertAfterLine = previewCursorPosition.markdownLine || 0;
        }

        const markdown = editor.getMarkdown();
        const lines = markdown.split('\n');

        // 유효 범위 확인
        insertAfterLine = Math.min(insertAfterLine, lines.length - 1);
        insertAfterLine = Math.max(0, insertAfterLine);

        console.log(`[MyMind3Editor] Inserting image at line ${insertAfterLine} (block type: ${previewCursorPosition.blockType || 'unknown'})`);

        // 해당 라인 다음에 이미지 삽입
        const insertPosition = insertAfterLine + 1;
        lines.splice(insertPosition, 0, '', imageMarkdown.trim(), '');

        editor.setMarkdown(lines.join('\n'));

        // 프리뷰 새로고침
        setTimeout(() => {
            refreshCustomPreview();
        }, 50);
    }

    /**
     * 프리뷰 커서 위치에 텍스트 삽입
     * @param {object} editor - TOAST UI Editor 인스턴스
     * @param {string} text - 삽입할 텍스트
     */
    function insertAtPreviewCursor(editor, text) {
        // 커서 위치가 없으면 끝에 추가
        if (!previewCursorPosition) {
            console.log('[MyMind3Editor] No preview cursor position, appending to end');
            appendToEnd(editor, text);
            return;
        }

        const hasBlockIndex = previewCursorPosition.blockIndex !== undefined && previewCursorPosition.blockIndex >= 0;
        const hasClickedText = previewCursorPosition.clickedText && previewCursorPosition.clickedText.trim().length > 0;

        console.log('[MyMind3Editor] insertAtPreviewCursor - blockIndex:', previewCursorPosition.blockIndex,
            'clickedText:', previewCursorPosition.clickedText?.substring(0, 30),
            'blockText:', previewCursorPosition.blockText?.substring(0, 30));

        // 방법 1: HTML 기반 삽입 (블록 인덱스가 있는 경우)
        if (hasBlockIndex) {
            try {
                const html = editor.getHTML();
                if (html && html.trim()) {
                    const result = insertTextAfterBlockByIndex(html, previewCursorPosition.blockIndex, text, previewCursorPosition.blockText);
                    if (result.success) {
                        editor.setHTML(result.html);
                        console.log('[MyMind3Editor] Successfully inserted via HTML at block index', previewCursorPosition.blockIndex);
                        setTimeout(() => refreshCustomPreview(), 50);
                        return;
                    }
                }
            } catch (e) {
                console.log('[MyMind3Editor] HTML insertion failed:', e.message);
            }
        }

        // 방법 2: 텍스트 기반 삽입 (clickedText 사용)
        if (hasClickedText) {
            try {
                const html = editor.getHTML();
                if (html && html.trim()) {
                    const result = insertTextAfterClickedText(html, previewCursorPosition.clickedText, text);
                    if (result.success) {
                        editor.setHTML(result.html);
                        console.log('[MyMind3Editor] Successfully inserted via HTML after clicked text');
                        setTimeout(() => refreshCustomPreview(), 50);
                        return;
                    }
                }
            } catch (e) {
                console.log('[MyMind3Editor] HTML text-based insertion failed:', e.message);
            }
        }

        // 방법 3: 마크다운 기반 삽입 (폴백)
        const searchText = hasClickedText ? previewCursorPosition.clickedText : previewCursorPosition.blockText;
        if (searchText) {
            try {
                const markdown = editor.getMarkdown();
                if (markdown && markdown.trim()) {
                    const result = insertTextAfterBlockByText(markdown, searchText, text);
                    if (result.success) {
                        editor.setMarkdown(result.markdown);
                        console.log('[MyMind3Editor] Successfully inserted via markdown');
                        setTimeout(() => refreshCustomPreview(), 50);
                        return;
                    }
                }
            } catch (e) {
                console.log('[MyMind3Editor] Markdown insertion failed:', e.message);
            }
        }

        // 모든 방법 실패 시 끝에 추가
        console.log('[MyMind3Editor] All insertion methods failed, appending to end');
        appendToEnd(editor, text);
    }

    /**
     * HTML에서 클릭한 텍스트 다음에 삽입
     */
    function insertTextAfterClickedText(html, clickedText, insertText) {
        if (!clickedText || clickedText.length < 3) {
            return { success: false };
        }

        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // 텍스트 정규화 - 더 긴 텍스트 사용
        const normalizedClickedText = clickedText.trim().toLowerCase();

        // 모든 텍스트 노드 순회하여 가장 정확한 매칭 찾기
        const walker = document.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, null, false);
        let foundNode = null;
        let bestMatchLength = 0;
        let node;

        while (node = walker.nextNode()) {
            const nodeText = node.textContent.trim().toLowerCase();
            if (!nodeText) continue;

            // 정확한 일치 우선
            if (nodeText === normalizedClickedText) {
                foundNode = node;
                break;
            }

            // 긴 부분 문자열 매칭 (최소 30자 또는 전체 길이)
            const matchLength = Math.min(normalizedClickedText.length, 50);
            const searchText = normalizedClickedText.substring(0, matchLength);

            if (nodeText.includes(searchText) && matchLength > bestMatchLength) {
                foundNode = node;
                bestMatchLength = matchLength;
            }
        }

        if (!foundNode) {
            return { success: false };
        }

        // 이미지 마크다운을 HTML로 변환 (기존 줄바꿈 사이에 삽입)
        const imgMatch = insertText.match(/!\[([^\]]*)\]\(([^)]+)\)/);
        let insertHtml;
        if (imgMatch) {
            // 이미지만 삽입 (추가 줄바꿈 없이)
            insertHtml = `<p><img src="${imgMatch[2]}" alt="${imgMatch[1]}"></p>`;
        } else {
            insertHtml = `<p>${insertText}</p>`;
        }

        // 찾은 텍스트 노드의 부모 요소 다음에 삽입
        let parentBlock = foundNode.parentElement;
        while (parentBlock && !['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'DIV', 'BLOCKQUOTE', 'PRE'].includes(parentBlock.tagName)) {
            parentBlock = parentBlock.parentElement;
        }

        if (parentBlock && parentBlock !== doc.body) {
            parentBlock.insertAdjacentHTML('afterend', insertHtml);
        } else {
            // 부모 블록이 없으면 텍스트 노드 바로 다음에 삽입
            const tempDiv = doc.createElement('div');
            tempDiv.innerHTML = insertHtml;
            foundNode.parentNode.insertBefore(tempDiv.firstChild, foundNode.nextSibling);
        }

        return { success: true, html: doc.body.innerHTML };
    }

    /**
     * HTML에서 특정 블록 인덱스 다음에 텍스트 삽입
     */
    function insertTextAfterBlockByIndex(html, blockIndex, text, blockText) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const blocks = doc.body.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, td, th, pre, blockquote');

        if (blockIndex >= blocks.length) {
            return { success: false };
        }

        let targetBlock = blocks[blockIndex];

        // blockText로 더 정확한 매칭 시도
        if (blockText) {
            const normalizedBlockText = blockText.trim().substring(0, 50).toLowerCase();
            for (let i = Math.max(0, blockIndex - 2); i < Math.min(blocks.length, blockIndex + 3); i++) {
                const elemText = blocks[i].textContent.trim().substring(0, 50).toLowerCase();
                if (elemText.includes(normalizedBlockText.substring(0, 20)) || normalizedBlockText.includes(elemText.substring(0, 20))) {
                    targetBlock = blocks[i];
                    break;
                }
            }
        }

        // 이미지 마크다운을 HTML로 변환
        const imgMatch = text.match(/!\[([^\]]*)\]\(([^)]+)\)/);
        let insertHtml;
        if (imgMatch) {
            insertHtml = `<p><img src="${imgMatch[2]}" alt="${imgMatch[1]}"></p>`;
        } else {
            insertHtml = `<p>${text}</p>`;
        }

        // 타겟 블록 다음에 삽입
        targetBlock.insertAdjacentHTML('afterend', insertHtml);

        return { success: true, html: doc.body.innerHTML };
    }

    /**
     * 마크다운에서 특정 텍스트 다음에 삽입
     */
    function insertTextAfterBlockByText(markdown, blockText, insertText) {
        if (!blockText) {
            return { success: false };
        }

        const lines = markdown.split('\n');
        const normalizedBlockText = blockText.trim().substring(0, 30).toLowerCase();

        // 텍스트로 라인 찾기
        for (let i = 0; i < lines.length; i++) {
            const lineText = lines[i].replace(/[#*_`\[\]()]/g, '').trim().toLowerCase();
            if (lineText.includes(normalizedBlockText.substring(0, 20))) {
                // 해당 라인 다음에 삽입
                lines.splice(i + 1, 0, '', insertText.trim(), '');
                return { success: true, markdown: lines.join('\n') };
            }
        }

        return { success: false };
    }

    /**
     * 에디터 끝에 텍스트 추가
     */
    function appendToEnd(editor, text) {
        // HTML 방식 시도
        try {
            const html = editor.getHTML();
            if (html && html.trim()) {
                const imgMatch = text.match(/!\[([^\]]*)\]\(([^)]+)\)/);
                let insertHtml;
                if (imgMatch) {
                    insertHtml = `<p><img src="${imgMatch[2]}" alt="${imgMatch[1]}"></p>`;
                } else {
                    insertHtml = `<p>${text}</p>`;
                }
                editor.setHTML(html + insertHtml);
                setTimeout(() => refreshCustomPreview(), 50);
                return;
            }
        } catch (e) {
            console.log('[MyMind3Editor] HTML append failed:', e.message);
        }

        // 마크다운 방식
        const currentMarkdown = editor.getMarkdown();
        if (currentMarkdown && currentMarkdown.trim()) {
            editor.setMarkdown(currentMarkdown + '\n\n' + text.trim());
        } else {
            editor.setMarkdown(text.trim());
        }
        setTimeout(() => refreshCustomPreview(), 50);
    }

    /**
     * 프리뷰 커서 위치 초기화
     */
    function clearPreviewCursorPosition() {
        previewCursorPosition = null;
    }

    /**
     * Preview 모드 UI 표시
     * FIX: refreshCustomPreview()와 동일한 방식으로 프리뷰 생성하여 이미지 표시 일관성 확보
     */
    function showPreviewMode() {
        console.log('[MyMind3Editor] Switching to PREVIEW mode');

        const { mdContainer, mdEditor, mdSplitter, previewContainer } = getEditorElements();

        console.log('[MyMind3Editor] Preview elements found:', {
            mdContainer: !!mdContainer,
            mdEditor: !!mdEditor,
            mdSplitter: !!mdSplitter,
            previewContainer: !!previewContainer
        });

        // mdContainer는 항상 보여야 함
        if (mdContainer) mdContainer.style.display = 'flex';
        // 에디터 영역 숨기기
        if (mdEditor) {
            mdEditor.style.display = 'none';
            mdEditor.style.width = '0';
            mdEditor.style.flex = '0';
        }
        // 구분선 숨기기
        if (mdSplitter) mdSplitter.style.display = 'none';

        // FIX: 프리뷰 컨테이너 설정 및 빈 커스텀 프리뷰 생성
        if (previewContainer) {
            previewContainer.style.setProperty('display', 'flex', 'important');
            previewContainer.style.setProperty('flex', '1', 'important');
            previewContainer.style.setProperty('width', '100%', 'important');
            previewContainer.style.setProperty('overflow', 'hidden', 'important');

            // 기존 커스텀 프리뷰가 없으면 빈 컨테이너 생성
            let customPreview = document.querySelector('.custom-preview-container');
            if (!customPreview) {
                customPreview = document.createElement('div');
                customPreview.className = 'custom-preview-container toastui-editor-contents';
                // 현재 테마에 따라 배경색 결정
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            const bgColor = isDark ? '#000000' : 'white';
            const textColor = isDark ? '#ffffff' : '#333333';

            customPreview.style.cssText = `
                    width: 100% !important;
                    height: 100% !important;
                    padding: 10px 40px 40px 40px !important;
                    overflow-y: auto !important;
                    overflow-x: hidden !important;
                    background: ${bgColor} !important;
                    color: ${textColor} !important;
                    user-select: text !important;
                    -webkit-user-select: text !important;
                    -moz-user-select: text !important;
                    -ms-user-select: text !important;
                    cursor: text !important;
                    flex: 1 !important;
                `;
                previewContainer.innerHTML = '';
                previewContainer.appendChild(customPreview);
            }

            setupTableCopyHandler(customPreview);

            // 프리뷰 커서 설정 (클릭/방향키로 커서 위치 지정 가능)
            setupPreviewCursor(customPreview);
        }

        // 선택 스타일 추가
        addSelectionStyles();

        // FIX: 강제 리플로우 트리거 - display 변경 후 브라우저가 레이아웃을 완료하도록
        if (previewContainer) {
            void previewContainer.offsetHeight; // 강제 리플로우
        }

        // FIX: refreshCustomPreview()를 호출하여 에디터 → 프리뷰 전환 시에도 동일한 로직으로 이미지 표시
        // 딜레이를 50ms → 100ms로 증가하여 에디터 내부 상태 동기화 보장
        setTimeout(() => {
            // FIX: 에디터 인스턴스 확인
            if (!editorInstance) {
                console.warn('[MyMind3Editor] No editor instance in showPreviewMode timeout');
                return;
            }

            // FIX: 프리뷰 컨테이너가 실제로 표시되는지 확인
            const previewCheck = document.querySelector('.toastui-editor-md-preview');
            if (previewCheck && getComputedStyle(previewCheck).display === 'none') {
                console.warn('[MyMind3Editor] Preview container still hidden, forcing display');
                previewCheck.style.setProperty('display', 'flex', 'important');
            }

            refreshCustomPreview();
            console.log('[MyMind3Editor] Preview refreshed via refreshCustomPreview() in showPreviewMode');

            // LaTeX 렌더링 (refreshCustomPreview 완료 후)
            setTimeout(() => renderPreviewLatex(), 100);

            // 이미지 경로 변환 확인 (추가 안전장치)
            setTimeout(() => {
                const customPreview = document.querySelector('.custom-preview-container');
                convertImagePaths(customPreview);
                console.log('[MyMind3Editor] Image paths re-checked in showPreviewMode');
            }, 150);
        }, 100);

        // Scroll Sync 활성화
        setTimeout(enableScrollSync, 300);
    }

    /**
     * 프리뷰 HTML 콘텐츠 가져오기 (정제 포함)
     * FIX: refreshCustomPreview()와 동일한 정제 로직 적용
     * @returns {string} HTML 콘텐츠
     */
    function getPreviewHtmlContent() {
        try {
            let htmlContent = editorInstance.getHTML();
            console.log('[MyMind3Editor] Preview HTML generated successfully');

            // FIX: refreshCustomPreview()와 동일하게 cleanHTMLSourceTags() 적용
            // 이전에는 다른 패턴을 사용하여 프리뷰 형식이 달랐음
            htmlContent = cleanHTMLSourceTags(htmlContent);

            // FIX: 이미지 경로 변환 추가 (노드 선택 시 프리뷰에서 이미지가 바로 보이도록)
            // /폴더명/노드ID/파일명 → /api/files/폴더명/노드ID/파일명
            // FIX: /api/files/로 시작하지 않는 경로만 변환 (negative lookahead로 이중 경로 방지)
            htmlContent = htmlContent.replace(/src="\/(?!api\/files\/)([^"]+\/\d+\/[^"]+\.(jpeg|jpg|png|gif|webp))"/gi,
                'src="/api/files/$1"');

            return htmlContent;
        } catch (error) {
            console.error('[MyMind3Editor] Error generating preview HTML:', error);
            const rawMarkdown = editorInstance.getMarkdown();
            // FIX: 에러 시에도 cleanHTMLSourceTags() 적용
            const cleanedMarkdown = cleanHTMLSourceTags(rawMarkdown);
            return `
                <div class="preview-error-banner">
                    <h4>${mmIcon('alert-triangle', 16)} 프리뷰 렌더링 오류</h4>
                    <p>마크다운을 HTML로 변환하는 중 오류가 발생했습니다.</p>
                </div>
                <div class="preview-raw-markdown">${cleanedMarkdown.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
            `;
        }
    }

    /**
     * 커스텀 프리뷰 요소 생성
     * FIX: refreshCustomPreview()와 동일하게 빈 줄 3개 추가
     * @param {string} htmlContent - HTML 콘텐츠
     * @returns {HTMLElement} 커스텀 프리뷰 div
     */
    function createCustomPreviewElement(htmlContent) {
        const customPreview = document.createElement('div');
        customPreview.className = 'custom-preview-container toastui-editor-contents';
        // FIX: refreshCustomPreview()와 동일하게 프리뷰 최상단에 빈 줄 3개 추가
        const emptyLines = '<br><br><br>';
        customPreview.innerHTML = emptyLines + htmlContent;
        customPreview.style.cssText = `
            width: 100% !important;
            height: 100% !important;
            padding: 10px 40px 40px 40px !important;
            overflow-y: auto !important;
            overflow-x: hidden !important;
            background: white !important;
            user-select: text !important;
            -webkit-user-select: text !important;
            -moz-user-select: text !important;
            -ms-user-select: text !important;
            cursor: text !important;
            flex: 1 !important;
        `;
        return customPreview;
    }

    /**
     * 커스텀 프리뷰를 컨테이너에 마운트
     * @param {HTMLElement} container - 프리뷰 컨테이너
     * @param {HTMLElement} customPreview - 커스텀 프리뷰 요소
     */
    function mountCustomPreview(container, customPreview) {
        // 기존 커스텀 프리뷰 제거
        const existing = document.querySelector('.custom-preview-container');
        if (existing) existing.remove();

        container.style.setProperty('display', 'flex', 'important');
        container.style.setProperty('flex', '1', 'important');
        container.style.setProperty('width', '100%', 'important');
        container.style.setProperty('overflow', 'hidden', 'important');
        container.innerHTML = '';
        container.appendChild(customPreview);

        console.log('[MyMind3Editor] Preview replaced with custom div');
    }

    /**
     * 표 복사 이벤트 핸들러 설정
     * @param {HTMLElement} customPreview - 커스텀 프리뷰 요소
     */
    function setupTableCopyHandler(customPreview) {
        customPreview.addEventListener('copy', function(e) {
            const selection = window.getSelection();
            if (!selection || selection.rangeCount === 0) return;

            const range = selection.getRangeAt(0);
            const container = range.commonAncestorContainer;
            const parentElement = container.nodeType === 3 ? container.parentElement : container;

            let table = parentElement.tagName === 'TABLE' ? parentElement :
                        parentElement.closest('table') || parentElement.querySelector('table');

            if (table && (selection.containsNode(table, true) || table.contains(parentElement))) {
                const rows = table.querySelectorAll('tr');
                const markdownRows = [];

                rows.forEach((row, rowIndex) => {
                    const cells = row.querySelectorAll('th, td');
                    const cellTexts = Array.from(cells).map(cell => cell.innerText.trim());
                    markdownRows.push('| ' + cellTexts.join(' | ') + ' |');

                    if (rowIndex === 0 && row.querySelectorAll('th').length > 0) {
                        const separator = Array(cellTexts.length).fill('---').join(' | ');
                        markdownRows.push('| ' + separator + ' |');
                    }
                });

                e.preventDefault();
                e.clipboardData.setData('text/plain', markdownRows.join('\n'));
                console.log('[MyMind3Editor] Table copied as markdown');
            }
        });
    }

    /**
     * 텍스트 선택 스타일 추가
     */
    function addSelectionStyles() {
        if (document.getElementById('custom-selection-style')) return;

        const style = document.createElement('style');
        style.id = 'custom-selection-style';
        style.textContent = `
            .custom-preview-container, .custom-preview-container * {
                user-select: text !important;
                -webkit-user-select: text !important;
                -moz-user-select: text !important;
                -ms-user-select: text !important;
            }
            .custom-preview-container ::selection {
                background-color: #b3d7ff !important;
                color: #000 !important;
            }
            .custom-preview-container ::-moz-selection {
                background-color: #b3d7ff !important;
                color: #000 !important;
            }
        `;
        document.head.appendChild(style);
        console.log('[MyMind3Editor] Selection styles added');
    }

    /**
     * 프리뷰에서 LaTeX 렌더링
     */
    function renderPreviewLatex() {
        const customPreview = document.querySelector('.custom-preview-container');
        if (!customPreview) {
            console.warn('[MyMind3Editor] Custom preview not found for LaTeX rendering');
            return;
        }

        console.log('[MyMind3Editor] Rendering LaTeX in custom preview');

        if (window.mathFix && typeof window.mathFix.forceRender === 'function') {
            try {
                window.mathFix.forceRender(customPreview);
                console.log('[MyMind3Editor] mathFix.forceRender completed');
            } catch (error) {
                console.error('[MyMind3Editor] mathFix.forceRender failed:', error);
                renderLatexFallback(customPreview);
            }
        } else {
            renderLatexFallback(customPreview);
        }
    }

    /**
     * LaTeX 렌더링 폴백
     * @param {HTMLElement} container - 컨테이너 요소
     */
    function renderLatexFallback(container) {
        const elements = container.querySelectorAll('p, div, li, td, th, h1, h2, h3, h4, h5, h6, span');
        let renderedCount = 0;

        elements.forEach(el => {
            el.classList.remove('katex-rendered');
            if (typeof renderLatexInElement === 'function') {
                renderLatexInElement(el);
                if (el.classList.contains('katex-rendered')) renderedCount++;
            }
        });

        console.log(`[MyMind3Editor] Fallback LaTeX rendered: ${renderedCount} elements`);
    }

    /**
     * TOAST UI Editor 생성
     */
    function createEditor() {
        if (editorInstance) {
            console.log('[MyMind3Editor] Editor already exists');
            return;
        }

        console.log('[MyMind3Editor] Creating TOAST UI Editor (tab mode)...');

        const container = document.getElementById('toastEditor');
        if (!container) {
            console.error('[MyMind3Editor] toastEditor container not found');
            return;
        }

        // 에디터 옵션 설정
        let editorOptions = {
            el: container,
            height: '100%',
            initialEditType: 'markdown',
            previewStyle: 'vertical',  // vertical 모드 (좌우 분할)
            initialValue: '',
            usageStatistics: false,
            hideModeSwitch: true  // 하단 Markdown/WYSIWYG 탭 숨기기
        };

        // KaTeX 플러그인
        if (typeof window.toastui !== 'undefined' &&
            window.toastui.Editor &&
            window.toastui.Editor.plugin &&
            window.toastui.Editor.plugin.katex) {
            console.log('[MyMind3Editor] Using official KaTeX plugin');
            editorOptions.plugins = [[window.toastui.Editor.plugin.katex]];
        } else if (window.katex) {
            console.log('[MyMind3Editor] Using custom KaTeX renderer');
            editorOptions.customHTMLRenderer = katexPlugin().toHTMLRenderers;
        } else {
            console.warn('[MyMind3Editor] KaTeX not available');
        }

        try {
            editorInstance = new window.toastui.Editor(editorOptions);
            console.log('[MyMind3Editor] Editor created successfully');

            // FIX: 에디터 내용 변경 시 자동 프리뷰 렌더링 (디바운스 적용)
            let changeTimeout;
            editorInstance.on('change', () => {
                // 읽기 전용 모드에서는 dirty 플래그 설정 안 함
                if (window.MyMind3?.isReadOnly) return;
                // dirty 플래그 설정 (자동저장용)
                _isDirty = true;

                // 자동저장 타이머: 마지막 수정 후 설정 간격(기본 30초) 뒤 저장
                clearTimeout(_autoSaveTimer);
                _autoSaveTimer = setTimeout(() => {
                    if (_isDirty) {
                        console.log('[MyMind3Editor] 자동저장 실행');
                        saveContent();
                    }
                }, _autoSaveDelay);

                // 디바운스: 500ms 이내 연속 입력 시 마지막 한 번만 실행
                clearTimeout(changeTimeout);
                changeTimeout = setTimeout(() => {
                    try {
                        refreshCustomPreview();

                        // CRITICAL FIX: <P></P> 태그 제거 및 이미지 경로 변환 후처리
                        setTimeout(() => {
                            const previewEl = document.querySelector('.toastui-editor-md-preview');
                            if (previewEl) {
                                // 빈 <p> 태그 제거
                                const emptyPTags = previewEl.querySelectorAll('p');
                                emptyPTags.forEach(pTag => {
                                    if (pTag.innerHTML.trim() === '') {
                                        console.log('[MyMind3Editor] Removing empty <p> tag');
                                        pTag.remove();
                                    }
                                });

                                // 이미지 경로 변환: /폴더명/노드ID/파일명 → /api/files/폴더명/노드ID/파일명
                                convertImagePaths(previewEl);
                            }
                        }, 100);

                        console.log('[MyMind3Editor] Auto preview refresh on content change');
                    } catch (error) {
                        console.error('[MyMind3Editor] Error refreshing preview on change:', error);
                    }
                }, 500);
            });

            // CRITICAL FIX: Prevent "~~~~" insertion on Ctrl+S
            // Block Ctrl+S inside the editor to prevent TOAST UI from inserting code fence
            setTimeout(() => {
                const editorElements = container.querySelectorAll('textarea, [contenteditable="true"], .CodeMirror, .ProseMirror, .toastui-editor');
                editorElements.forEach(el => {
                    // Spell check 비활성화 (성능 향상)
                    el.setAttribute('spellcheck', 'false');

                    // Ctrl+S 이벤트 기본 동작만 차단 (에디터 내부)
                    // preventDefault만 호출하여 TOAST UI의 "~~~~" 삽입을 막되,
                    // stopPropagation은 호출하지 않아 전역 저장 핸들러는 작동하도록 함
                    el.addEventListener('keydown', function(e) {
                        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                            e.preventDefault();  // TOAST UI의 기본 동작만 막기
                            // stopPropagation 제거 - 이벤트가 document까지 버블링되어야 저장 가능
                            console.log('[MyMind3Editor] Prevented default Ctrl+S behavior (blocking ~~~~)');
                            // return false 제거 - 이벤트 계속 전파
                        }
                    }, { capture: true });  // Use capture phase to intercept before TOAST UI
                });
                console.log('[MyMind3Editor] Spell check disabled and Ctrl+S blocked');
            }, 100);

            // 설정값 로드 (폰트 크기, 자동저장 간격)
            const settings = JSON.parse(localStorage.getItem('mymind3_settings') || '{}');
            const editorFontSize = settings.editorFontSize || '14';

            // 자동저장 간격 로드 (서버 설정 우선, 폴백: localStorage → 기본 30초)
            _loadAutoSaveDelay();
            console.log(`[MyMind3Editor] Applying font size: ${editorFontSize}px`);

            // 하단 탭 완전히 숨기기 및 프리뷰 스타일 추가 (CSS)
            const style = document.createElement('style');
            style.id = 'hideModeSwitchStyle';
            style.textContent = `
                /* Spell check 비활성화 (성능 향상) */
                .toastui-editor textarea,
                .toastui-editor [contenteditable="true"],
                .toastui-editor .CodeMirror,
                .toastui-editor .ProseMirror,
                .CodeMirror,
                .ProseMirror {
                    -webkit-spellcheck: false !important;
                    spellcheck: false !important;
                }

                .toastui-editor-mode-switch,
                .toastui-editor-tabs {
                    display: none !important;
                }

                /* 에디터(편집 모드) 폰트 크기 */
                .toastui-editor .CodeMirror,
                .toastui-editor .ProseMirror,
                .toastui-editor-md-container .CodeMirror-line,
                .toastui-editor-md-container .cm-line {
                    font-size: ${editorFontSize}px !important;
                }

                /* 프리뷰 전체 스타일 */
                .toastui-editor-contents {
                    padding: 10px 40px 40px 40px !important;
                    line-height: 1.8 !important;
                    font-size: ${editorFontSize}px !important;
                    color: #333 !important;
                    max-width: 100% !important;
                    margin: 0 !important;
                }

                /* 문단 스타일 */
                .toastui-editor-contents p {
                    margin-bottom: 1.2em !important;
                    text-indent: 2em !important;
                    line-height: 1.8 !important;
                    text-align: justify !important;
                    word-break: keep-all !important;
                    overflow-wrap: break-word !important;
                }

                /* 첫 번째 문단은 들여쓰기 제외 */
                .toastui-editor-contents > p:first-of-type,
                .toastui-editor-contents h1 + p,
                .toastui-editor-contents h2 + p,
                .toastui-editor-contents h3 + p,
                .toastui-editor-contents h4 + p,
                .toastui-editor-contents h5 + p,
                .toastui-editor-contents h6 + p {
                    text-indent: 0 !important;
                }

                /* 제목 스타일 */
                .toastui-editor-contents h1 {
                    font-size: 2em !important;
                    margin-top: 1.5em !important;
                    margin-bottom: 0.8em !important;
                    font-weight: 700 !important;
                    border-bottom: 2px solid #eee !important;
                    padding-bottom: 0.3em !important;
                }

                .toastui-editor-contents h2 {
                    font-size: 1.6em !important;
                    margin-top: 1.3em !important;
                    margin-bottom: 0.7em !important;
                    font-weight: 600 !important;
                    border-bottom: 1px solid #eee !important;
                    padding-bottom: 0.2em !important;
                }

                .toastui-editor-contents h3 {
                    font-size: 1.4em !important;
                    margin-top: 1.2em !important;
                    margin-bottom: 0.6em !important;
                    font-weight: 600 !important;
                }

                .toastui-editor-contents h4 {
                    font-size: 1.2em !important;
                    margin-top: 1.1em !important;
                    margin-bottom: 0.5em !important;
                    font-weight: 600 !important;
                }

                .toastui-editor-contents h5,
                .toastui-editor-contents h6 {
                    font-size: 1em !important;
                    margin-top: 1em !important;
                    margin-bottom: 0.5em !important;
                    font-weight: 600 !important;
                }

                /* 리스트 스타일 */
                .toastui-editor-contents ul,
                .toastui-editor-contents ol {
                    margin: 1em 0 !important;
                    padding-left: 2em !important;
                }

                .toastui-editor-contents li {
                    margin-bottom: 0.5em !important;
                    line-height: 1.8 !important;
                }

                .toastui-editor-contents li p {
                    text-indent: 0 !important;
                    margin-bottom: 0.5em !important;
                }

                /* 인용구 스타일 */
                .toastui-editor-contents blockquote {
                    border-left: 4px solid #1976d2 !important;
                    margin: 1.5em 0 !important;
                    padding: 0.8em 1.2em !important;
                    background-color: #f5f9fc !important;
                    color: #555 !important;
                }

                .toastui-editor-contents blockquote p {
                    text-indent: 0 !important;
                    margin-bottom: 0.5em !important;
                }

                /* 코드 블록 스타일 */
                .toastui-editor-contents pre {
                    background-color: #f6f8fa !important;
                    border: 1px solid #e1e4e8 !important;
                    border-radius: 6px !important;
                    padding: 16px !important;
                    margin: 1.5em 0 !important;
                    overflow-x: auto !important;
                }

                .toastui-editor-contents code {
                    background-color: #f6f8fa !important;
                    padding: 0.2em 0.4em !important;
                    border-radius: 3px !important;
                    font-family: 'Consolas', 'Monaco', monospace !important;
                    font-size: 0.9em !important;
                }

                .toastui-editor-contents pre code {
                    background-color: transparent !important;
                    padding: 0 !important;
                }

                /* 테이블 스타일 */
                .toastui-editor-contents table {
                    border-collapse: collapse !important;
                    width: 100% !important;
                    margin: 1.5em 0 !important;
                }

                .toastui-editor-contents table th,
                .toastui-editor-contents table td {
                    border: 1px solid #ddd !important;
                    padding: 8px 12px !important;
                    text-align: left !important;
                    line-height: 1.6 !important;
                }

                .toastui-editor-contents table th {
                    background-color: #f6f8fa !important;
                    font-weight: 600 !important;
                }

                /* 수평선 스타일 */
                .toastui-editor-contents hr {
                    border: none !important;
                    border-top: 2px solid #eee !important;
                    margin: 2em 0 !important;
                }

                /* 링크 스타일 */
                .toastui-editor-contents a {
                    color: #1976d2 !important;
                    text-decoration: none !important;
                }

                .toastui-editor-contents a:hover {
                    text-decoration: underline !important;
                }

                /* 이미지 스타일 */
                .toastui-editor-contents img {
                    max-width: 100% !important;
                    height: auto !important;
                    display: block !important;
                    margin: 1.5em auto !important;
                    border-radius: 4px !important;
                }

                /* 강조 스타일 */
                .toastui-editor-contents strong {
                    font-weight: 700 !important;
                    color: #000 !important;
                }

                .toastui-editor-contents em {
                    font-style: italic !important;
                    color: #555 !important;
                }
            `;
            document.head.appendChild(style);

            // 커스텀 탭 생성
            setTimeout(() => {
                createCustomTabs();
                setupPreviewRenderer();
                // 초기 상태: 프리뷰 탭 활성화 (기본값 변경)
                switchTab('preview');
                // Scroll Sync 항상 활성화
                enableScrollSync();
            }, 100);

            // contentArea 숨기고 에디터 표시
            const contentArea = document.getElementById('contentArea');
            if (contentArea) contentArea.style.display = 'none';
            if (container) container.style.display = 'block';

        } catch (error) {
            console.error('[MyMind3Editor] Error creating editor:', error);
        }
    }

    /**
     * HTML을 Markdown으로 변환
     */
    function htmlToMarkdown(html) {
        if (!html) return '';

        let markdown = html;

        // 헤더 변환
        markdown = markdown.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n');
        markdown = markdown.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n');
        markdown = markdown.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n');
        markdown = markdown.replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n');
        markdown = markdown.replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n\n');
        markdown = markdown.replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n\n');

        // 굵게, 기울임
        markdown = markdown.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**');
        markdown = markdown.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**');
        markdown = markdown.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');
        markdown = markdown.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*');

        // 링크
        markdown = markdown.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)');

        // 이미지
        markdown = markdown.replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>/gi, '![$2]($1)');

        // FIX: 테이블 변환 (HTML → Markdown) - 리스트보다 먼저 처리해야 함!
        markdown = markdown.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (match, tableContent) => {
            let rows = [];
            let isHeader = true;

            // <thead>와 <tbody> 제거하여 <tr> 추출 쉽게 함
            const cleanTable = tableContent
                .replace(/<thead[^>]*>/gi, '')
                .replace(/<\/thead>/gi, '')
                .replace(/<tbody[^>]*>/gi, '')
                .replace(/<\/tbody>/gi, '');

            // <tr> 태그로 행 분리
            const trMatches = cleanTable.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi);
            if (!trMatches) return match; // 테이블 구조가 없으면 원본 반환

            trMatches.forEach((tr, rowIndex) => {
                // <th> 또는 <td> 태그로 셀 추출
                const cellMatches = tr.match(/<t[hd][^>]*>[\s\S]*?<\/t[hd]>/gi);
                if (!cellMatches) return;

                const cells = cellMatches.map(cell => {
                    // 태그 제거하고 내용만 추출
                    let content = cell
                        .replace(/<t[hd][^>]*>/gi, '')
                        .replace(/<\/t[hd]>/gi, '')
                        .trim();

                    // 중첩된 HTML 태그 제거 (span, strong, em 등)
                    // 단, LaTeX ($...$, $$...$$)는 유지
                    content = content
                        .replace(/<span[^>]*>/gi, '')
                        .replace(/<\/span>/gi, '')
                        .replace(/<strong[^>]*>/gi, '**')
                        .replace(/<\/strong>/gi, '**')
                        .replace(/<em[^>]*>/gi, '*')
                        .replace(/<\/em>/gi, '*')
                        .replace(/<br\s*\/?>/gi, ' ')  // <br> 태그를 공백으로
                        .replace(/<[^>]+>/g, '');  // 나머지 태그 제거

                    // HTML 엔티티 디코딩
                    content = content
                        .replace(/&nbsp;/g, ' ')
                        .replace(/&lt;/g, '<')
                        .replace(/&gt;/g, '>')
                        .replace(/&amp;/g, '&')
                        .replace(/&quot;/g, '"');

                    // FIX: 테이블 셀 내 개행 제거 (마크다운 테이블 깨짐 방지)
                    // 줄바꿈 문자를 공백으로 변환
                    content = content.replace(/\r?\n/g, ' ');
                    // 연속된 공백을 하나로 정리
                    content = content.replace(/\s+/g, ' ');

                    // 파이프 이스케이프 (마크다운 테이블 구분자 충돌 방지)
                    content = content.replace(/\|/g, '\\|');

                    return content.trim();
                });

                // 마크다운 테이블 행 생성
                rows.push('| ' + cells.join(' | ') + ' |');

                // 첫 번째 행 후 구분선 추가 (헤더)
                if (rowIndex === 0) {
                    const separator = cells.map(() => '---').join(' | ');
                    rows.push('| ' + separator + ' |');
                }
            });

            return '\n' + rows.join('\n') + '\n\n';
        });

        // FIX: 리스트 처리 개선 (테이블 변환 후에 처리)
        // <li><p>내용</p></li> → <li>내용</li>
        markdown = markdown.replace(/<li[^>]*>\s*<p[^>]*>([\s\S]*?)<\/p>\s*<\/li>/gi, '<li>$1</li>');

        // 리스트 항목 변환
        markdown = markdown.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (match, content) => {
            // 내용에서 추가 태그 정리
            let cleanContent = content
                .replace(/<br\s*\/?>/gi, '')  // br 태그 제거
                .replace(/<p[^>]*>/gi, '')     // 남은 p 시작 태그 제거
                .replace(/<\/p>/gi, '')        // p 종료 태그 제거
                .trim();
            return '- ' + cleanContent + '\n';
        });

        // 리스트 컨테이너
        markdown = markdown.replace(/<ul[^>]*>/gi, '\n');
        markdown = markdown.replace(/<\/ul>/gi, '\n');
        markdown = markdown.replace(/<ol[^>]*>/gi, '\n');
        markdown = markdown.replace(/<\/ol>/gi, '\n');

        // 단락
        markdown = markdown.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n');

        // BR 태그
        markdown = markdown.replace(/<br\s*\/?>/gi, '\n');

        // 코드 블록 변환 (나머지 HTML 태그 제거 전에 처리)
        // 1. 언어 지정 코드 블록: <pre><code class="language-xxx">...</code></pre>
        // 큰따옴표/작은따옴표 모두 지원 (HTML 양식 호환)
        markdown = markdown.replace(/<pre[^>]*><code[^>]*class=["']language-([^"']+)["'][^>]*>([\s\S]*?)<\/code><\/pre>/gi, (match, lang, code) => {
            // HTML 엔티티 디코딩
            const decodedCode = code
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&amp;/g, '&')
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'")
                .replace(/&nbsp;/g, ' ');
            return '\n```' + lang + '\n' + decodedCode.trim() + '\n```\n\n';
        });

        // 2. 일반 코드 블록: <pre><code>...</code></pre>
        markdown = markdown.replace(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, (match, code) => {
            const decodedCode = code
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&amp;/g, '&')
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'")
                .replace(/&nbsp;/g, ' ');
            return '\n```\n' + decodedCode.trim() + '\n```\n\n';
        });

        // 3. 단순 <pre> 블록: <pre>...</pre>
        markdown = markdown.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, (match, code) => {
            const decodedCode = code
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&amp;/g, '&')
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'")
                .replace(/&nbsp;/g, ' ');
            return '\n```\n' + decodedCode.trim() + '\n```\n\n';
        });

        // 4. 인라인 코드: <code>text</code>
        markdown = markdown.replace(/<code[^>]*>([^<]+)<\/code>/gi, (match, code) => {
            const decodedCode = code
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&amp;/g, '&')
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'")
                .replace(/&nbsp;/g, ' ');
            return '`' + decodedCode + '`';
        });

        // 나머지 HTML 태그 제거
        markdown = markdown.replace(/<[^>]+>/g, '');

        // HTML 엔티티 디코딩
        markdown = markdown.replace(/&nbsp;/g, ' ');
        markdown = markdown.replace(/&lt;/g, '<');
        markdown = markdown.replace(/&gt;/g, '>');
        markdown = markdown.replace(/&amp;/g, '&');
        markdown = markdown.replace(/&quot;/g, '"');

        // FIX: 마크다운 정렬 개선 (읽기 쉽게)
        // 1. 연속된 빈 줄 정리 (3개 이상 → 2개)
        markdown = markdown.replace(/\n{3,}/g, '\n\n');

        // 2. 리스트 항목 뒤 빈 줄 추가 (리스트 끝에서)
        markdown = markdown.replace(/^(- .+)$/gm, '$1');

        // 3. 헤더와 내용 사이 줄바꿈 확보
        markdown = markdown.replace(/(^#{1,6} .+)(\n)(?!\n)/gm, '$1\n\n');

        // 4. 수평선 앞뒤 줄바꿈 정리 (테이블 구분선은 제외!)
        // 테이블 구분선: | --- | --- | 형태는 건드리지 않음
        // 수평선: 줄 전체가 ---로만 이루어진 경우만 매칭
        markdown = markdown.replace(/^(---)\s*$/gm, '\n$1\n');

        // 5. 최종 연속 빈 줄 정리
        markdown = markdown.replace(/\n{3,}/g, '\n\n');

        // FIX: 마크다운 테이블 헤더 구분자 보정
        // 헤더 구분자가 없는 마크다운 테이블의 첫 번째 행 뒤에만 구분자 추가
        const lines = markdown.split('\n');
        const fixedLines = [];

        // FIX: 테이블 구분자 정확한 패턴 (셀 내용에 ---가 있어도 오인식 방지)
        // 구분자 행은 | --- | --- | 형태로, 셀 내용 없이 -, :, |, 공백으로만 구성
        const isTableSeparatorRow = (line) => {
            const trimmed = line.trim();
            if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) return false;
            // | 사이의 모든 셀이 :?-+:? 형태인지 확인
            const cells = trimmed.slice(1, -1).split('|');
            return cells.every(cell => /^\s*:?-+:?\s*$/.test(cell));
        };

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const nextLine = i + 1 < lines.length ? lines[i + 1] : '';
            const prevLine = i > 0 ? lines[i - 1] : '';

            const isTableRow = line.trim().startsWith('|') && line.trim().endsWith('|');
            const isHeaderSeparator = isTableSeparatorRow(line);
            const nextIsTableRow = nextLine.trim().startsWith('|') && nextLine.trim().endsWith('|');
            const nextIsHeaderSeparator = isTableSeparatorRow(nextLine);
            const prevIsTableRow = prevLine.trim().startsWith('|') && prevLine.trim().endsWith('|');

            // 현재 줄 추가
            fixedLines.push(line);

            // 테이블 첫 행 감지: 이전 줄이 비어있거나 테이블이 아니고, 현재 줄이 테이블 행이고, 다음 줄도 테이블 행인데 구분자가 아닌 경우
            const isFirstTableRow = isTableRow && !isHeaderSeparator && !prevIsTableRow && nextIsTableRow && !nextIsHeaderSeparator;

            if (isFirstTableRow) {
                // 컬럼 개수 계산
                const columnCount = (line.match(/\|/g) || []).length - 1;
                const separator = '| ' + Array(columnCount).fill('---').join(' | ') + ' |';
                fixedLines.push(separator);
            }
        }

        markdown = fixedLines.join('\n');

        // FIX: Remove "~~~~" (code fence marker) that shouldn't be saved alone
        // "~~~~" is a markdown code fence delimiter (4 tildes)
        markdown = markdown.replace(/^~~~~\s*$/gm, '');  // Remove lines with only "~~~~"

        return markdown.trim();
    }

    /**
     * 에디터 후처리 (이미지 경로 변환, LaTeX, 프리뷰 갱신)
     * requestAnimationFrame으로 DOM 업데이트 직후 실행
     */
    function postProcessEditor() {
        requestAnimationFrame(() => {
            // 이미지 경로 변환
            const previewEl = document.querySelector('.toastui-editor-md-preview');
            convertImagePaths(previewEl);
            const customPreview = document.querySelector('.custom-preview-container');
            convertImagePaths(customPreview);

            // 커스텀 프리뷰 갱신
            refreshCustomPreview();

            // LaTeX 재렌더링
            if (latexRenderer) {
                latexRenderer();
            }

            // 스크롤 최상단
            forceScrollToTop();
        });
    }

    /**
     * 노드 내용 로드 및 표시
     */
    async function showNodeContent(nodeId) {
        currentNodeId = nodeId;
        clearPreviewCursorPosition();

        // 에디터가 없으면 생성
        if (!editorInstance) {
            createEditor();
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        const currentFolder = window.currentQAFolder || window.MyMind3?.currentFolder || localStorage.getItem('currentFolder');

        if (!currentFolder) {
            if (editorInstance) {
                editorInstance.setMarkdown('# 오류\n\n폴더가 선택되지 않았습니다.');
            }
            return;
        }

        // 노드의 고유 nodeId 가져오기
        let actualNodeId = nodeId;
        const node = window.MyMind3?.MindMapData?.findNodeById(nodeId);
        if (node && node.nodeId) {
            actualNodeId = node.nodeId;
        }

        // 로딩 매니저 시작 (1초 딜레이 후 오버레이 표시)
        NodeLoadingManager.start();

        try {
            let content;
            const cacheKey = `${currentFolder}/${actualNodeId}`;

            // 항상 서버에서 최신 내용 fetch (Skill API 등 외부 쓰기 반영)
            const response = await fetch(`/api/loadnode?folder=${encodeURIComponent(currentFolder)}&nodeId=${actualNodeId}`, {
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            const serverContent = data.content || '';

            // 항상 서버 응답 사용 (Skill API 등 외부 쓰기 반영)
            content = serverContent;
            _nodeContentCache.set(cacheKey, content);

            if (content && content.trim() !== '<p><br></p>') {
                let markdown = content;

                // HTML 감지 및 변환
                const isHTML = /^<[a-z]|<(h[1-6]|ul|ol|li|p|div|span|table|tr|td|th|blockquote|pre|code|strong|em|a|img)\b/i.test(content.trim());
                if (isHTML) {
                    markdown = htmlToMarkdown(content);
                }

                if (editorInstance) {
                    editorInstance.setMarkdown(markdown);
                    forceScrollToTop();
                    postProcessEditor();
                }
            } else {
                if (editorInstance) {
                    editorInstance.setMarkdown('');
                    forceScrollToTop();
                    postProcessEditor();
                }
            }

        } catch (error) {
            console.error('[MyMind3Editor] Error loading node content:', error);
            if (editorInstance) {
                editorInstance.setMarkdown(`# 오류\n\n노드 내용을 불러오는 중 오류가 발생했습니다:\n\n${error.message}`);
                postProcessEditor();
            }
        } finally {
            // 로딩 매니저 종료 (오버레이 제거 + UI 잠금 해제)
            NodeLoadingManager.finish();
        }
    }

    /**
     * 노드 내용 저장
     */
    async function saveContent() {
        // 읽기 전용 모드 체크
        if (window.MyMind3?.isReadOnly) {
            console.log('[MyMind3Editor] 읽기 전용 모드 - 저장 차단');
            return { success: false, error: 'Read-only mode' };
        }

        if (!editorInstance) {
            console.error('[MyMind3Editor] No editor instance');
            return { success: false, error: 'No editor instance' };
        }

        if (!currentNodeId) {
            console.error('[MyMind3Editor] No current node');
            return { success: false, error: 'No current node' };
        }

        const markdown = editorInstance.getMarkdown();
        const html = editorInstance.getHTML();

        console.log(`[MyMind3Editor] Saving content for node ${currentNodeId}, length: ${markdown.length}`);

        // FIX: "전체복사"와 동일한 결과를 위해 마크다운 저장
        // HTML 대신 마크다운을 저장하여 일관성 확보
        const contentToSave = markdown;

        const currentFolder = window.currentQAFolder || window.MyMind3?.currentFolder || localStorage.getItem('currentFolder');

        if (!currentFolder) {
            console.error('[MyMind3Editor] No current folder');
            return { success: false, error: 'No current folder' };
        }

        try {
            // 현재 노드 정보 가져오기
            const currentNode = window.MyMind3?.MindMapData?.findNodeById(currentNodeId);

            const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};
            const response = await fetch('/api/savenode', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...csrfHeaders
                },
                credentials: 'include',
                body: JSON.stringify({
                    folder: currentFolder,
                    nodeId: currentNode?.nodeId || currentNodeId,
                    content: contentToSave,
                    nodeName: currentNode?.title || ''  // 서버에서 title[nodeId].html 파일명에 사용
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                console.error('[MyMind3Editor] Save failed with status:', response.status, errorData);
                return { success: false, error: errorData.error || `HTTP ${response.status}` };
            }

            const data = await response.json();

            // 저장 성공 시 캐시 업데이트 + dirty 리셋
            if (data.success) {
                _isDirty = false;
                clearTimeout(_autoSaveTimer);
                const actualNodeId = currentNode?.nodeId || currentNodeId;
                const cacheKey = `${currentFolder}/${actualNodeId}`;
                _nodeContentCache.set(cacheKey, contentToSave);
            }

            console.log('[MyMind3Editor] Save result:', data);

            return data;

        } catch (error) {
            console.error('[MyMind3Editor] Error saving content:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 에디터 숨기기
     */
    function hide() {
        const container = document.getElementById('toastEditor');
        const tabs = document.getElementById('customEditorTabs');
        if (container) container.style.display = 'none';
        if (tabs) tabs.style.display = 'none';
    }

    /**
     * 에디터 표시
     */
    function show() {
        const container = document.getElementById('toastEditor');
        const tabs = document.getElementById('customEditorTabs');
        if (container) container.style.display = 'block';
        if (tabs) tabs.style.display = 'flex';
    }

    /**
     * 프리뷰 크기 갱신 (패널 리사이즈 시 호출)
     */
    function refreshPreviewSize() {
        if (currentTab !== 'preview') {
            console.log('[MyMind3Editor] Not in preview mode, skipping resize');
            return;
        }

        const customPreview = document.querySelector('.custom-preview-container');
        if (!customPreview) {
            console.log('[MyMind3Editor] No custom preview to resize');
            return;
        }

        // 부모 컨테이너의 크기에 맞춰 프리뷰 영역 갱신
        const previewContainer = document.querySelector('.toastui-editor-md-preview');
        if (previewContainer) {
            const containerWidth = previewContainer.offsetWidth;
            const containerHeight = previewContainer.offsetHeight;

            console.log('[MyMind3Editor] Refreshing preview size:', {
                width: containerWidth,
                height: containerHeight
            });

            // 프리뷰 컨테이너 크기 재설정 (강제)
            previewContainer.style.setProperty('width', '100%', 'important');
            previewContainer.style.setProperty('height', '100%', 'important');
            previewContainer.style.setProperty('flex', '1', 'important');

            // 커스텀 프리뷰 크기 재설정
            customPreview.style.setProperty('width', '100%', 'important');
            customPreview.style.setProperty('height', '100%', 'important');
            customPreview.style.setProperty('flex', '1', 'important');

            // 스크롤 위치 유지
            const scrollTop = customPreview.scrollTop;
            const scrollLeft = customPreview.scrollLeft;

            // 강제 리플로우
            customPreview.offsetHeight;

            // 스크롤 위치 복원
            customPreview.scrollTop = scrollTop;
            customPreview.scrollLeft = scrollLeft;

            console.log('[MyMind3Editor] Preview size refreshed successfully');
        }
    }

    /**
     * 자동저장 간격 로드 (서버 API → 기본값 30초)
     */
    async function _loadAutoSaveDelay() {
        try {
            const res = await fetch('/api/user/settings', { credentials: 'include' });
            if (res.ok) {
                const result = await res.json();
                if (result.success && result.data?.autoSaveInterval) {
                    const seconds = parseInt(result.data.autoSaveInterval, 10);
                    if (seconds >= 15) {
                        _autoSaveDelay = seconds * 1000;
                        console.log(`[MyMind3Editor] 자동저장 간격: ${seconds}초`);
                        return;
                    }
                }
            }
        } catch (e) {
            // 로그인 안 된 상태 등 — 기본값 사용
        }
        console.log(`[MyMind3Editor] 자동저장 간격: 기본 ${_autoSaveDelay / 1000}초`);
    }

    /**
     * 초기화
     */
    function initialize() {
        console.log('[MyMind3Editor] Checking dependencies...');

        // 의존성 확인
        if (typeof window.toastui === 'undefined') {
            console.error('[MyMind3Editor] TOAST UI Editor not loaded');
            return;
        }

        if (typeof window.katex === 'undefined') {
            console.warn('[MyMind3Editor] KaTeX not loaded');
        }

        console.log('[MyMind3Editor] Dependencies OK');
        console.log('[MyMind3Editor] Editor module initialized (tab mode with custom tabs)');
    }

    // 외부에서 노드 콘텐츠 캐시 업데이트 (Ctrl+S 등 외부 저장 시 호출)
    function updateContentCache(nodeId, content) {
        const folder = window.currentQAFolder || window.MyMind3?.currentFolder || localStorage.getItem('currentFolder');
        if (folder && nodeId) {
            const cacheKey = `${folder}/${nodeId}`;
            _nodeContentCache.set(cacheKey, content);
        }
    }

    // 에디터 상태 초기화 (마인드맵 전환 시 호출)
    function clearEditorState() {
        _isDirty = false;
        clearTimeout(_autoSaveTimer);
        _nodeContentCache.clear();
        currentNodeId = null;
        clearPreviewCursorPosition();
        if (editorInstance) {
            editorInstance.setMarkdown('');
        }
        console.log('[MyMind3Editor] 에디터 상태 초기화 완료 (캐시/노드ID/커서)');
    }

    // 전역 객체에 노출
    window.MyMind3Editor = {
        initialize,
        createEditor,
        showNodeContent,
        saveContent,
        hide,
        show,
        htmlToMarkdown,
        switchTab,
        refreshPreviewSize,
        refreshCustomPreview,
        cleanPTagTexts,     // 추가: HTML 태그 정제 함수 노출 (DOM 후처리)
        cleanHTMLSourceTags, // 추가: HTML 소스 정제 함수 노출 (렌더링 전처리)
        insertAtPreviewCursor, // 추가: 프리뷰 커서 위치에 텍스트 삽입
        insertImageAtPreviewCursor, // 추가: 프리뷰 커서 위치에 이미지 삽입 (정확한 위치)
        clearPreviewCursorPosition, // 추가: 프리뷰 커서 위치 초기화
        clearEditorState, // 마인드맵 전환 시 에디터 상태 초기화
        updateContentCache, // 외부 저장 시 캐시 업데이트 (Ctrl+S 등)
        get isDirty() { return _isDirty; },
        markClean() { _isDirty = false; clearTimeout(_autoSaveTimer); },
        get editor() {
            return editorInstance;
        },
        get currentTab() {
            return currentTab;
        },
        get previewCursorPosition() {
            return previewCursorPosition;
        },
        renderMermaidInPreview: renderMermaidInPreview
    };

    // Mermaid 다크모드 테마 동기화 (themechange 이벤트 리스너)
    window.addEventListener('themechange', function(e) {
        if (window.mermaid && _mermaidLoaded) {
            var isDark = e.detail.theme === 'dark';
            window.mermaid.initialize({
                startOnLoad: false,
                theme: isDark ? 'dark' : 'default',
                securityLevel: 'strict'
            });
            console.log('[Mermaid] 테마 전환:', isDark ? 'dark' : 'default');
            // 열린 프리뷰가 있으면 재렌더링
            var customPreview = document.querySelector('.custom-preview-container');
            if (customPreview && customPreview.offsetParent !== null) {
                renderMermaidInPreview(customPreview).catch(function(err) {
                    console.warn('[Mermaid] 테마 전환 렌더링 실패:', err.message);
                });
            }
        }
    });

    // 하위 호환성을 위한 전역 함수
    window.toastEditor = {
        getEditor: () => editorInstance,
        save: () => saveContent()
    };

    // forceScrollToTop 함수를 전역으로 노출
    window.forceScrollToTop = forceScrollToTop;

    // 자동 초기화
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

})();
