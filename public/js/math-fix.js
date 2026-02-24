/**
 * MyMind3 수학 공식 렌더링 문제 완전 해결
 *
 * 문제점:
 * - KaTeX 플러그인이 제대로 작동하지 않음
 * - 수학 공식이 렌더링되지 않음
 * - 에디터 초기화 문제
 */

(function() {
    'use strict';

    console.log('[MathFix] 수학 공식 렌더링 문제 해결 시작');

    // LaTeX 환경 구문 렌더링 함수 - \begin{...} \end{...} 패턴 처리
    function renderLatexEnvironments(element) {
        if (!element || !window.katex) return;

        console.log('[MathFix] LaTeX 환경 구문 렌더링 시작');

        // 텍스트 노드들을 찾아서 LaTeX 환경 구문 처리
        const walker = document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );

        const textNodes = [];
        let node;
        while (node = walker.nextNode()) {
            textNodes.push(node);
        }

        textNodes.forEach(textNode => {
            let content = textNode.textContent;
            let modified = false;

            // LaTeX 환경 패턴 매칭 (aligned, matrix, cases 등)
            const latexEnvPattern = /\\begin\{([^}]+)\}([\s\S]*?)\\end\{\1\}/g;

            content = content.replace(latexEnvPattern, (match, envName, envContent) => {
                try {
                    console.log(`[MathFix] LaTeX 환경 발견: ${envName}`);

                    // 전체 LaTeX 블록을 KaTeX로 렌더링
                    const rendered = window.katex.renderToString(match, {
                        displayMode: true,
                        throwOnError: false,
                        strict: false,
                        trust: false
                    });

                    modified = true;
                    return `<div class="katex-display">${rendered}</div>`;
                } catch (error) {
                    console.error(`[MathFix] LaTeX 환경 렌더링 실패 (${envName}):`, error);
                    return match; // 원본 유지
                }
            });

            if (modified) {
                // 텍스트 노드를 HTML 노드로 교체
                const wrapper = document.createElement('div');
                wrapper.innerHTML = content;

                // wrapper의 모든 자식을 textNode 위치에 삽입
                const parent = textNode.parentNode;
                while (wrapper.firstChild) {
                    parent.insertBefore(wrapper.firstChild, textNode);
                }
                parent.removeChild(textNode);

                console.log('[MathFix] LaTeX 환경 구문 렌더링 완료');
            }
        });

        console.log('[MathFix] LaTeX 환경 구문 렌더링 종료');
    }

    // HTML 태그 정제 함수 - KaTeX 수식 내부의 <p></p> 태그 제거
    function cleanHTMLTags(element) {
        if (!element) return;

        console.log('[MathFix] HTML 태그 정제 시작');

        // 수학 공식 구분자 패턴
        const mathDelimiters = [
            { start: '$$', end: '$$' },
            { start: '$', end: '$' },
            { start: '\\[', end: '\\]' },
            { start: '\\(', end: '\\)' }
        ];

        // 텍스트 노드들을 찾아서 HTML 태그 정제
        const walker = document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );

        const textNodes = [];
        let node;
        while (node = walker.nextNode()) {
            textNodes.push(node);
        }

        textNodes.forEach(textNode => {
            let content = textNode.textContent;
            let modified = false;

            // HTML 태그 패턴 제거 (</p><p>, <p>, </p> 등)
            const htmlTagPatterns = [
                /<\s*\/?\s*p\s*>/gi,        // <p>, </p>
                /<\s*\/\s*p\s*>\s*<\s*p\s*>/gi,  // </p><p>
                /<\s+\/?\s*p\s+>/gi,        // < p >, < /p > (공백 포함)
                /&lt;\s*\/?\s*p\s*&gt;/gi,  // &lt;p&gt;, &lt;/p&gt;
                /&amp;/gi                   // &amp; → &
            ];

            htmlTagPatterns.forEach(pattern => {
                const beforeReplace = content;
                content = content.replace(pattern, '');
                if (beforeReplace !== content) {
                    modified = true;
                    console.log('[MathFix] HTML 태그 정제:', pattern.toString());
                }
            });

            // 수식 내부의 특수 패턴 정제
            content = content.replace(/amp;/gi, '');  // amp; 제거

            if (modified) {
                textNode.textContent = content;
                console.log('[MathFix] 텍스트 노드 정제 완료');
            }
        });

        console.log('[MathFix] HTML 태그 정제 완료');
    }

    // 강화된 KaTeX 렌더링 함수
    function forceKaTeXRender(element) {
        if (!element || !window.katex || !window.renderMathInElement) {
            console.warn('[MathFix] KaTeX 라이브러리가 없습니다');
            return;
        }

        try {
            // 1. 먼저 LaTeX 환경 구문 렌더링 (\begin{...} \end{...})
            renderLatexEnvironments(element);

            // 2. HTML 태그 정제
            cleanHTMLTags(element);

            // 3. renderMathInElement를 사용한 강제 렌더링
            window.renderMathInElement(element, {
                delimiters: [
                    {left: '$$', right: '$$', display: true},
                    {left: '$', right: '$', display: false},
                    {left: '\\[', right: '\\]', display: true},
                    {left: '\\(', right: '\\)', display: false}
                ],
                throwOnError: false,
                errorColor: '#cc0000',
                strict: false,
                trust: false,
                macros: {
                    "\\RR": "\\mathbb{R}",
                    "\\NN": "\\mathbb{N}",
                    "\\ZZ": "\\mathbb{Z}",
                    "\\QQ": "\\mathbb{Q}",
                    "\\CC": "\\mathbb{C}"
                }
            });

            console.log('[MathFix] KaTeX 렌더링 완료');
        } catch (error) {
            console.error('[MathFix] KaTeX 렌더링 실패:', error);
        }
    }

    // 에디터 생성 후 KaTeX 강화 함수
    function enhanceEditor() {
        console.log('[MathFix] 에디터 KaTeX 기능 강화 시작');

        // 기존 에디터 확인
        if (!window.MyMind3Editor || !window.MyMind3Editor.editor) {
            console.warn('[MathFix] 에디터가 없습니다. 강제 생성을 시도합니다.');

            // 에디터 강제 생성
            const container = document.getElementById('toastEditor');
            if (container && window.toastui && window.toastui.Editor) {
                try {
                    const editorOptions = {
                        el: container,
                        height: '100%',
                        initialEditType: 'markdown',
                        previewStyle: 'vertical',
                        initialValue: '',
                        usageStatistics: false,
                        hideModeSwitch: true
                    };

                    // KaTeX 플러그인 시도
                    if (window.toastui.Editor.plugin && window.toastui.Editor.plugin.katex) {
                        editorOptions.plugins = [[window.toastui.Editor.plugin.katex]];
                        console.log('[MathFix] 공식 KaTeX 플러그인 사용');
                    }

                    const editorInstance = new window.toastui.Editor(editorOptions);

                    // MyMind3Editor에 할당 (getter 문제 해결)
                    if (window.MyMind3Editor) {
                        // editor 속성이 getter only이므로 _editorInstance로 직접 저장
                        window.MyMind3Editor._editorInstance = editorInstance;
                        console.log('[MathFix] 에디터 생성 완료 (_editorInstance로 저장)');
                    }
                } catch (error) {
                    console.error('[MathFix] 에디터 생성 실패:', error);
                    return false;
                }
            }
        }

        // 에디터 변경 이벤트에 KaTeX 렌더링 추가
        const editorInstance = window.MyMind3Editor?.editor || window.MyMind3Editor?._editorInstance;
        if (editorInstance) {
            const editor = editorInstance;

            // 기존 이벤트 제거 (중복 방지)
            editor.off('change.mathfix');

            // 새로운 변경 이벤트 추가
            editor.on('change.mathfix', function() {
                console.log('[MathFix] 에디터 내용 변경 감지');

                // 디바운스 적용
                clearTimeout(window.mathFixTimeout);
                window.mathFixTimeout = setTimeout(() => {
                    // 프리뷰 영역에서 KaTeX 렌더링
                    const previewArea = document.querySelector('.toastui-editor-md-preview');
                    if (previewArea) {
                        forceKaTeXRender(previewArea);
                    }

                    // 커스텀 프리뷰도 렌더링
                    const customPreview = document.getElementById('customPreview');
                    if (customPreview) {
                        forceKaTeXRender(customPreview);
                    }
                }, 300);
            });

            console.log('[MathFix] 에디터 KaTeX 이벤트 등록 완료');
            return true;
        }

        return false;
    }

    // MyMind3Editor의 refreshCustomPreview 함수 강화
    function enhanceCustomPreview() {
        if (window.MyMind3Editor && typeof window.MyMind3Editor.refreshCustomPreview === 'function') {
            const originalRefresh = window.MyMind3Editor.refreshCustomPreview;

            window.MyMind3Editor.refreshCustomPreview = function() {
                // 기존 함수 실행
                const result = originalRefresh.apply(this, arguments);

                // KaTeX 렌더링 추가
                setTimeout(() => {
                    const customPreview = document.getElementById('customPreview');
                    if (customPreview) {
                        forceKaTeXRender(customPreview);
                        console.log('[MathFix] 커스텀 프리뷰 KaTeX 렌더링 완료');
                    }
                }, 100);

                return result;
            };

            console.log('[MathFix] refreshCustomPreview 함수 강화 완료');
        }
    }

    // 노드 콘텐츠 로딩 후 KaTeX 렌더링 강화
    function enhanceNodeContent() {
        if (window.MyMind3Editor && typeof window.MyMind3Editor.showNodeContent === 'function') {
            const originalShowNodeContent = window.MyMind3Editor.showNodeContent;

            window.MyMind3Editor.showNodeContent = function(nodeId) {
                // 기존 함수 실행
                const result = originalShowNodeContent.apply(this, arguments);

                // 노드 콘텐츠 로딩 후 KaTeX 렌더링
                setTimeout(() => {
                    const previewArea = document.querySelector('.toastui-editor-md-preview');
                    const customPreview = document.getElementById('customPreview');

                    if (previewArea) {
                        forceKaTeXRender(previewArea);
                    }

                    if (customPreview) {
                        forceKaTeXRender(customPreview);
                    }

                    console.log('[MathFix] 노드 콘텐츠 로딩 후 KaTeX 렌더링 완료');
                }, 800);

                return result;
            };

            console.log('[MathFix] showNodeContent 함수 강화 완료');
        }
    }

    // 전역 KaTeX 렌더링 함수 제공
    window.mathFix = {
        forceRender: forceKaTeXRender,
        enhanceEditor: enhanceEditor,
        renderAll: function() {
            console.log('[MathFix] 전체 페이지 KaTeX 렌더링 시작');

            // 모든 프리뷰 영역 렌더링
            const previewAreas = document.querySelectorAll('.toastui-editor-md-preview, #customPreview, .preview-content');
            previewAreas.forEach(area => {
                forceKaTeXRender(area);
            });

            // 전체 문서 렌더링 (마지막 수단)
            forceKaTeXRender(document.body);

            console.log('[MathFix] 전체 KaTeX 렌더링 완료');
        }
    };

    // DOM 준비 후 실행
    function initialize() {
        console.log('[MathFix] 초기화 시작');

        // 에디터 강화
        if (enhanceEditor()) {
            enhanceCustomPreview();
            enhanceNodeContent();
            console.log('[MathFix] 모든 강화 작업 완료');
        } else {
            console.warn('[MathFix] 에디터 강화 실패');
        }

        // 전역 렌더링 함수 등록
        console.log('[MathFix] 전역 mathFix 객체 등록 완료');
    }

    // 초기화 실행
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

    console.log('[MathFix] 수학 공식 렌더링 문제 해결 스크립트 로드 완료');

})();