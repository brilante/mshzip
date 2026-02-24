/**
 * copy-utils.js - 복사 관련 유틸리티 모듈
 *
 * Q&A 내용 및 텍스트를 노드/에디터에 복사하는 기능 제공
 *
 * 포함 기능:
 * - extractQAImagePaths: Q&A HTML에서 이미지 경로 추출
 * - copyQAToNode: Q&A 내용을 선택된 노드에 복사 (이미지 포함)
 * - copyToEditor: 텍스트를 에디터에 복사 (커서 위치 또는 끝에 추가)
 */
(function() {
  'use strict';

  /**
   * Q&A HTML에서 이미지 경로를 추출하는 함수
   * @param {HTMLElement} contentDiv - Q&A 내용이 담긴 DOM 요소
   * @returns {string[]} 추출된 이미지 경로 배열 (중복 제거됨)
   */
  function extractQAImagePaths(contentDiv) {
    const paths = [];
    if (!contentDiv) return paths;

    // 1. img 태그에서 src 추출
    const images = contentDiv.querySelectorAll('img');
    images.forEach(img => {
      const src = img.getAttribute('src');
      if (src && src.includes('_qa/')) {
        const match = src.match(/([^\/]+_qa\/[^"'\s\)]+)/);
        if (match) paths.push(match[1]);
      }
    });

    // 2. data-image-src 속성에서 추출
    const aiImages = contentDiv.querySelectorAll('[data-image-src]');
    aiImages.forEach(el => {
      const src = el.getAttribute('data-image-src');
      if (src && src.includes('_qa/')) {
        const match = src.match(/([^\/]+_qa\/[^"'\s\)]+)/);
        if (match) paths.push(match[1]);
      }
    });

    // 중복 제거
    return [...new Set(paths)];
  }

  /**
   * Q&A 내용을 선택된 노드에 복사하는 함수 (이미지 포함)
   * @param {string} contentText - 복사할 텍스트 내용
   * @param {HTMLElement} contentDiv - Q&A 내용이 담긴 DOM 요소 (이미지 추출용)
   */
  async function copyQAToNode(contentText, contentDiv) {
    console.log('[copyQAToNode] Called');

    // 1. 선택된 노드 확인
    const nodeId = window.MyMind3?.MindMapData?.currentEditingNodeId || window.selectedNodeId;
    if (!nodeId) {
      console.log('[copyQAToNode] No node selected, copying to editor only');
      showToast('노드가 선택되지 않았습니다. 에디터에만 복사됩니다.', 'warning');
      copyToEditor(contentText);
      return;
    }

    // 2. 폴더명 가져오기
    const folderName = window.MyMind3?.currentFolder || localStorage.getItem('currentFolder') || 'untitled';
    console.log('[copyQAToNode] nodeId:', nodeId, 'folder:', folderName);

    // 3. Q&A HTML에서 이미지 경로 추출
    const qaPaths = extractQAImagePaths(contentDiv);
    console.log('[copyQAToNode] Extracted QA image paths:', qaPaths);

    // 4. 이미지가 있는 경우: 이미지만 복사 (텍스트 제외)
    //    이미지가 없는 경우: 전체 내용 복사
    let textToCopy = contentText;
    if (qaPaths.length > 0) {
      // 마크다운에서 이미지 태그만 추출 (![alt](path) 형식)
      const imageMarkdownMatches = contentText.match(/!\[[^\]]*\]\([^)]+\)/g);
      if (imageMarkdownMatches && imageMarkdownMatches.length > 0) {
        textToCopy = imageMarkdownMatches.join('\n\n');
        console.log('[copyQAToNode] Copying images only:', textToCopy);
      } else {
        // 마크다운 형식이 아닌 경우, 추출한 경로로 마크다운 이미지 생성
        const imageMarkdowns = qaPaths.map(function(qaPath, idx) {
          return '![Image ' + (idx + 1) + '](' + qaPath + ')';
        });
        textToCopy = imageMarkdowns.join('\n\n');
        console.log('[copyQAToNode] Generated markdown from paths:', textToCopy);
      }
    }
    copyToEditor(textToCopy);

    // 5. 이미지가 있으면 /api/savenode 호출하여 이미지 복사
    if (qaPaths.length > 0) {
      try {
        const toastEditor = window.MyMind3Editor?.editor;
        if (!toastEditor) {
          console.warn('[copyQAToNode] No editor found');
          return;
        }

        // 원본 HTML(이미지 경로 포함)을 서버에 전송하여 이미지 복사 처리
        // 서버에서 _qa/ 패턴을 찾아 이미지를 복사하고 경로를 변환함
        const editorHtml = toastEditor.getHTML();  // HTML with image src attributes
        console.log('[copyQAToNode] Sending editor HTML to server, length:', editorHtml.length);

        // 현재 노드 정보 가져오기
        const currentNode = window.MyMind3?.MindMapData?.findNodeById(nodeId);

        const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};
        const response = await fetch('/api/savenode', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...csrfHeaders },
          body: JSON.stringify({
            folder: folderName,
            nodeId: currentNode?.nodeId || nodeId,
            content: editorHtml,  // 원본 HTML (이미지 src 포함) - 서버는 'content' 파라미터를 기대함
            nodeName: currentNode?.title || ''  // 서버에서 title[nodeId].html 파일명에 사용
          })
        });

        if (response.ok) {
          const data = await response.json();
          console.log('[copyQAToNode] Images copied successfully, basePath:', data.basePath);

          // 에디터의 이미지 경로도 업데이트 (_qa → 절대 경로로 변환)
          let updatedHtml = toastEditor.getHTML();
          const basePath = data.basePath || '';  // 서버에서 받은 절대 경로 기본값
          const imgFolder = data.nodeImageFolder || nodeId;  // 서버가 반환한 실제 이미지 폴더명
          qaPaths.forEach(qaPath => {
            const fileName = qaPath.split('/').pop();
            const nodeImagePath = `${basePath}${imgFolder}/${fileName}`;  // 절대 경로로 생성
            updatedHtml = updatedHtml.replace(new RegExp(qaPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), nodeImagePath);
          });
          toastEditor.setHTML(updatedHtml);

          showToast('Q&A 내용과 이미지가 노드에 복사되었습니다.', 'success');
        } else {
          console.warn('[copyQAToNode] Failed to copy images:', response.status);
          showToast('내용은 복사되었지만 이미지 복사에 실패했습니다.', 'warning');
        }
      } catch (error) {
        console.error('[copyQAToNode] Error copying images:', error);
        showToast('내용은 복사되었지만 이미지 복사 중 오류가 발생했습니다.', 'warning');
      }
    } else {
      showToast('Q&A 내용이 노드에 복사되었습니다.', 'success');
    }
  }

  /**
   * 텍스트를 에디터에 복사하는 함수 (커서 위치 또는 끝에 추가)
   * @param {string} text - 복사할 텍스트 내용
   */
  function copyToEditor(text) {
    console.log('[copyToEditor] Called with text length:', text?.length);
    console.log('[copyToEditor] window.selectedNodeId:', window.selectedNodeId);
    console.log('[copyToEditor] window.MyMind3Editor:', window.MyMind3Editor);
    console.log('[copyToEditor] window.MyMind3Editor?.editor:', window.MyMind3Editor?.editor);

    if (!text || typeof text !== 'string') {
      console.error('Invalid text to copy:', text);
      return;
    }

    // MyMind3Editor 참조 가져오기
    const toastEditor = window.MyMind3Editor?.editor;
    console.log('[copyToEditor] toastEditor:', toastEditor);
    console.log('[copyToEditor] toastEditor?.setMarkdown:', typeof toastEditor?.setMarkdown);

    // MyMind3Editor가 사용 가능한지 확인
    if (toastEditor && typeof toastEditor.setMarkdown === 'function') {
      // Toast UI Editor가 활성화됨
      try {
        console.log('[copyToEditor] Copying to MyMind3Editor...');

        // HTML 요소가 포함되어 있으면 완전한 마크다운 변환 수행
        if (text.includes('<')) {
          console.log('[copyToEditor] HTML 태그 감지, 완전한 마크다운 변환 시작...');
          console.log('[copyToEditor] 변환 전 HTML 길이:', text.length);
          console.log('[copyToEditor] 변환 전 샘플 (첫 200자):', text.substring(0, 200));

          if (typeof window.MyMind3Editor?.htmlToMarkdown === 'function') {
            text = window.MyMind3Editor.htmlToMarkdown(text);
            console.log('[copyToEditor] 완전한 HTML→마크다운 변환 완료');
            console.log('[copyToEditor] 변환 후 마크다운 길이:', text.length);
            console.log('[copyToEditor] 변환 후 샘플 (첫 200자):', text.substring(0, 200));
          } else {
            console.warn('[copyToEditor] htmlToMarkdown 함수를 찾을 수 없음');
          }
        } else {
          console.log('[copyToEditor] HTML 태그가 없는 순수 텍스트로 판단');
        }

        // 1. 현재 내용 확인
        const currentMarkdown = toastEditor.getMarkdown();
        const hasContent = currentMarkdown.trim();

        // 2. 먼저 HTML에서 빈 <p></p> 태그를 제거한 후 마크다운으로 변환
        let cleanedText = text;

        // 임시 DOM 요소를 생성해서 <p></p> 태그 제거
        if (text.includes('<p>') || text.includes('<P>')) {
          console.log('[copyToEditor] HTML에서 빈 <p></p> 태그 제거 중...');
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = cleanedText;

          // 빈 p 태그들을 모두 찾아서 제거
          const emptyPTags = tempDiv.querySelectorAll('p');
          let removedCount = 0;

          emptyPTags.forEach(pTag => {
            const content = pTag.innerHTML.trim();
            // 완전히 빈 p 태그이거나 &nbsp;, <br> 같은 것만 있는 경우
            if (content === '' || content === '&nbsp;' || content === '<br>' || content === '<br/>') {
              console.log('[copyToEditor] 빈 <p> 태그 제거:', pTag.outerHTML);
              pTag.remove();
              removedCount++;
            }
          });

          cleanedText = tempDiv.innerHTML;
          console.log(`[copyToEditor] ${removedCount}개의 빈 <p> 태그 제거 완료`);
        }

        // 3. 현재 탭에 따라 커서 위치에 삽입 또는 끝에 추가
        const currentTab = window.MyMind3Editor?.currentTab;
        console.log('[copyToEditor] Current tab:', currentTab);

        if (currentTab === 'write') {
          // 에디터 모드: insertText() API로 커서 위치에 삽입 시도
          try {
            // 에디터에 포커스가 있는지 확인
            const editorEl = document.querySelector('.toastui-editor-md-editor .ProseMirror');
            const hasFocus = editorEl && document.activeElement === editorEl;

            if (hasFocus) {
              // 커서가 에디터 내에 있으면 insertText 사용
              toastEditor.insertText('\n\n' + cleanedText.trim() + '\n\n');
              console.log('Content inserted at cursor position (write mode)');
            } else {
              // 커서가 없으면 끝에 추가
              let newMarkdown;
              if (hasContent) {
                newMarkdown = currentMarkdown + '\n\n' + cleanedText.trim();
              } else {
                newMarkdown = cleanedText.trim();
              }
              toastEditor.setMarkdown(newMarkdown);
              console.log('Content appended to end (write mode, no cursor focus)');
            }
          } catch (e) {
            console.warn('[copyToEditor] insertText failed, falling back to setMarkdown:', e);
            let newMarkdown;
            if (hasContent) {
              newMarkdown = currentMarkdown + '\n\n' + cleanedText.trim();
            } else {
              newMarkdown = cleanedText.trim();
            }
            toastEditor.setMarkdown(newMarkdown);
          }
        } else if (currentTab === 'preview') {
          // 프리뷰 모드: 커서 위치에 삽입
          const previewCursorPos = window.MyMind3Editor?.previewCursorPosition;

          // 이미지 마크다운인 경우 정확한 위치에 삽입
          const isImageMarkdown = /^\!\[.*?\]\(.*?\)$/.test(cleanedText.trim());

          if (isImageMarkdown && typeof window.MyMind3Editor?.insertImageAtPreviewCursor === 'function') {
            // 이미지 마크다운: 정확한 커서 위치(블록 끝)에 삽입
            console.log('[copyToEditor] Image markdown detected, using insertImageAtPreviewCursor');
            window.MyMind3Editor.insertImageAtPreviewCursor(toastEditor, cleanedText.trim());
            console.log('Image inserted at preview cursor position (accurate)');
          } else if (previewCursorPos && previewCursorPos.markdownLine > 0) {
            // 프리뷰 커서 위치가 있으면 해당 위치에 삽입
            window.MyMind3Editor.insertAtPreviewCursor(toastEditor, cleanedText.trim());
            console.log('Content inserted at preview cursor position');
          } else {
            // 커서 위치가 없으면 끝에 추가
            let newMarkdown;
            if (hasContent) {
              newMarkdown = currentMarkdown + '\n\n' + cleanedText.trim();
            } else {
              newMarkdown = cleanedText.trim();
            }
            toastEditor.setMarkdown(newMarkdown);
            console.log('Content appended to end (preview mode, no cursor)');
          }

          // 프리뷰 새로고침
          setTimeout(() => {
            if (typeof window.MyMind3Editor?.refreshCustomPreview === 'function') {
              window.MyMind3Editor.refreshCustomPreview();
            }
          }, 50);
        } else {
          // 기본: 끝에 추가
          let newMarkdown;
          if (hasContent) {
            newMarkdown = currentMarkdown + '\n\n' + cleanedText.trim();
          } else {
            newMarkdown = cleanedText.trim();
          }
          toastEditor.setMarkdown(newMarkdown);
          console.log('Content copied to MyMind3Editor (default mode)');
        }

        // 수학 공식 기준으로 <P></P> 태그 완전 제거
        setTimeout(() => {
          const previewElement = document.querySelector('.toastui-editor-md-preview');
          if (previewElement) {
            let attempts = 0;
            const maxAttempts = 10; // 최대 10번 시도

            function removePTagsAroundMath() {
              attempts++;
              console.log(`[copyToEditor] <P></P> 태그 제거 시도 ${attempts}/${maxAttempts}`);

              const allPTags = previewElement.querySelectorAll('p');
              let removedCount = 0;

              allPTags.forEach(pTag => {
                const content = pTag.innerHTML.trim();

                // 완전히 빈 <p> 태그 제거
                if (content === '') {
                  console.log('[copyToEditor] 빈 <p> 태그 제거:', pTag.outerHTML);
                  pTag.remove();
                  removedCount++;
                  return;
                }

                // 수학 공식 주변의 빈 <p> 태그 확인
                const prevSibling = pTag.previousElementSibling;
                const nextSibling = pTag.nextElementSibling;

                // 앞 뒤에 수학 공식(.katex)이 있고 자신은 빈 태그인 경우
                if (content === '' &&
                  ((prevSibling && prevSibling.querySelector('.katex')) ||
                    (nextSibling && nextSibling.querySelector('.katex')))) {
                  console.log('[copyToEditor] 수학 공식 주변 빈 <p> 태그 제거:', pTag.outerHTML);
                  pTag.remove();
                  removedCount++;
                }
              });

              console.log(`[copyToEditor] 이번 시도에서 ${removedCount}개 <p> 태그 제거됨`);

              // 아직 빈 <p> 태그가 남아있고 최대 시도 횟수에 도달하지 않았으면 재시도
              const remainingEmptyPTags = previewElement.querySelectorAll('p');
              const stillHasEmptyPTags = Array.from(remainingEmptyPTags).some(p => p.innerHTML.trim() === '');

              if (stillHasEmptyPTags && attempts < maxAttempts) {
                console.log('[copyToEditor] 아직 빈 <p> 태그가 남아있음, 0.2초 후 재시도...');
                setTimeout(removePTagsAroundMath, 200);
              } else {
                const finalEmptyCount = Array.from(previewElement.querySelectorAll('p')).filter(p => p.innerHTML.trim() === '').length;
                console.log(`[copyToEditor] <P></P> 태그 제거 완료! 남은 빈 태그: ${finalEmptyCount}개`);
              }
            }

            // 첫 번째 시도 시작
            removePTagsAroundMath();
          }
        }, 100);


        // KaTeX 재렌더링 트리거
        const renderKaTeX = () => {
          // test3/editor.html 패턴의 renderAll 함수 호출
          const previewEl = document.querySelector('.toastui-editor-md-preview');
          if (previewEl && window.katex) {
            console.log('[copyToEditor] Triggering KaTeX rendering');

            const elements = previewEl.querySelectorAll('p, div, li, td, th, h1, h2, h3, h4, h5, h6');
            elements.forEach(el => {
              el.classList.remove('katex-rendered');

              const text = el.innerHTML;
              if (text && text.includes('$')) {
                try {
                  let processed = text.replace(/&lt;br\s*\/?&gt;/gi, '');
                  processed = processed.replace(/<br\s*\/?>/gi, '');

                  // 블록 수식
                  processed = processed.replace(/\$\$([^$]+?)\$\$/g, (match, latex) => {
                    try {
                      return window.katex.renderToString(latex.trim(), {
                        displayMode: true,
                        throwOnError: false
                      });
                    } catch (e) {
                      return match;
                    }
                  });

                  // 인라인 수식
                  processed = processed.replace(/\$([^$\n]+?)\$/g, (match, latex) => {
                    try {
                      return window.katex.renderToString(latex.trim(), {
                        displayMode: false,
                        throwOnError: false
                      });
                    } catch (e) {
                      return match;
                    }
                  });

                  if (processed !== text) {
                    el.innerHTML = processed;
                    el.classList.add('katex-rendered');
                  }
                } catch (e) {
                  console.error('[copyToEditor] KaTeX error:', e);
                }
              }
            });

            console.log('[copyToEditor] KaTeX rendering complete');
          }
        };

        // 프리뷰 탭이 활성화된 경우 프리뷰 새로고침
        if (window.MyMind3Editor?.currentTab === 'preview' &&
          typeof window.MyMind3Editor?.refreshCustomPreview === 'function') {
          console.log('[copyToEditor] Refreshing preview after content copy...');
          setTimeout(() => {
            window.MyMind3Editor.refreshCustomPreview();
            // 프리뷰 새로고침 후 KaTeX 렌더링 (표 밖의 수식 렌더링)
            setTimeout(renderKaTeX, 50);
            console.log('[copyToEditor] Preview refreshed');
          }, 200);
          setTimeout(() => {
            window.MyMind3Editor.refreshCustomPreview();
            // 프리뷰 새로고침 후 KaTeX 렌더링 (재시도)
            setTimeout(renderKaTeX, 50);
          }, 700);
          setTimeout(() => {
            window.MyMind3Editor.refreshCustomPreview();
            // 프리뷰 새로고침 후 KaTeX 렌더링 (최종)
            setTimeout(renderKaTeX, 50);
          }, 1200);
        } else {
          // 프리뷰 탭이 비활성화된 경우에도 KaTeX 렌더링 시도
          setTimeout(renderKaTeX, 150);
          setTimeout(renderKaTeX, 600);
          setTimeout(renderKaTeX, 1100);
        }

        return;
      } catch (err) {
        console.warn('MyMind3Editor failed:', err);
      }
    }

    // Fallback: 에디터가 없으면 알림
    console.warn('[copyToEditor] No editor available');
    alert(window.i18n?.alertOpenEditor || '에디터를 먼저 열어주세요. (노드를 선택하세요)');
  }

  /**
   * 토스트 메시지 표시 헬퍼 함수
   * @param {string} message - 표시할 메시지
   * @param {string} type - 메시지 타입 ('success', 'warning', 'error')
   */
  function showToast(message, type) {
    // window.showToast가 있으면 사용, 없으면 console.log
    if (typeof window.showToast === 'function') {
      window.showToast(message, type);
    } else {
      console.log(`[Toast ${type}] ${message}`);
    }
  }

  // 전역 객체에 함수 노출
  window.CopyUtils = {
    extractQAImagePaths: extractQAImagePaths,
    copyQAToNode: copyQAToNode,
    copyToEditor: copyToEditor
  };

  // 개별 함수도 window에 직접 노출 (기존 코드 호환성 유지)
  window.extractQAImagePaths = extractQAImagePaths;
  window.copyQAToNode = copyQAToNode;
  window.copyToEditor = copyToEditor;

  console.log('[CopyUtils] 모듈 로드 완료');
})();
