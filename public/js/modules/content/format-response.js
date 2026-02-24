/**
 * format-response.js
 * AI 응답 포맷팅 모듈
 *
 * 마크다운을 HTML로 변환하고, 코드 블록, LaTeX 수식, 테이블 등을 처리합니다.
 *
 * @module format-response
 */

(function() {
  'use strict';

  /**
   * AI 응답을 HTML 형식으로 포맷팅
   * 마크다운 문법을 HTML로 변환하고, 코드 블록, LaTeX 수식, 테이블 등을 처리합니다.
   *
   * @param {string} content - AI 응답 원본 텍스트
   * @returns {string} HTML로 변환된 응답
   */
  function formatAIResponse(content) {
    console.log('[formatAIResponse] Original content:', content.substring(0, 200));

    // 먼저 마크다운 테이블을 HTML 테이블로 변환
    content = convertMarkdownTablesToHTML(content);

    // AI 이미지 처리 (마크다운 이미지를 HTML + 버튼으로 변환)
    const imagePlaceholders = [];
    let imageIndex = 0;

    // 마크다운 이미지 ![alt](URL) 형식을 HTML로 변환 (파일 URL 및 외부 URL 모두 지원)
    content = content.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, src) => {
      const imgHtml = `
        <div class="ai-generated-image" data-image-src="${src}" style="margin: 15px 0; text-align: center;">
          <img src="${src}" alt="${alt || 'AI 생성 이미지'}" style="max-width: 100%; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        </div>`;
      const placeholder = `___AI_IMAGE_${imageIndex}___`;
      imagePlaceholders.push({ placeholder, html: imgHtml });
      imageIndex++;
      return placeholder;
    });


    // 코드 블록을 HTML로 변환하고 보호 (LaTeX보다 먼저 처리)
    const codePlaceholders = [];
    let codeIndex = 0;

    // 1. 언어 지정 코드 블록: ```language\ncode\n```
    content = content.replace(/```(\w+)\n([\s\S]*?)```/g, (match, lang, code) => {
      const escapedCode = code
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

      const htmlCode = `<pre><code class="language-${lang}">${escapedCode}</code></pre>`;
      const placeholder = `___CODE_BLOCK_${codeIndex}___`;
      codePlaceholders.push({ placeholder, html: htmlCode });
      codeIndex++;
      return placeholder;
    });

    // 2. 일반 코드 블록: ```\ncode\n```
    content = content.replace(/```\n([\s\S]*?)```/g, (match, code) => {
      const escapedCode = code
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

      const htmlCode = `<pre><code>${escapedCode}</code></pre>`;
      const placeholder = `___CODE_BLOCK_${codeIndex}___`;
      codePlaceholders.push({ placeholder, html: htmlCode });
      codeIndex++;
      return placeholder;
    });

    // 3. 인라인 코드: `code`
    content = content.replace(/`([^`]+)`/g, (match, code) => {
      const escapedCode = code
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

      return `<code>${escapedCode}</code>`;
    });

    // LaTeX 수식을 임시로 보호 (placeholder로 대체)
    const latexPlaceholders = [];
    let placeholderIndex = 0;

    // Display math $$...$$ 보호 (가장 먼저 - $...$ 보다 우선)
    content = content.replace(/\$\$([\s\S]*?)\$\$/g, (match) => {
      const placeholder = `___LATEX_DISPLAY_${placeholderIndex}___`;
      latexPlaceholders.push({ placeholder, original: match });
      placeholderIndex++;
      return placeholder;
    });

    // Inline math $...$ 보호
    content = content.replace(/\$([^\$\n]+?)\$/g, (match) => {
      const placeholder = `___LATEX_INLINE_${placeholderIndex}___`;
      latexPlaceholders.push({ placeholder, original: match });
      placeholderIndex++;
      return placeholder;
    });

    // Display math \[...\] 보호
    content = content.replace(/\\\[([\s\S]*?)\\\]/g, (match) => {
      const placeholder = `___LATEX_DISPLAY_${placeholderIndex}___`;
      latexPlaceholders.push({ placeholder, original: match });
      placeholderIndex++;
      return placeholder;
    });

    // Inline math \(...\) 보호
    content = content.replace(/\\\(([\s\S]*?)\\\)/g, (match) => {
      const placeholder = `___LATEX_INLINE_${placeholderIndex}___`;
      latexPlaceholders.push({ placeholder, original: match });
      placeholderIndex++;
      return placeholder;
    });

    // HTML 테이블 보호 (줄바꿈 처리 전에 테이블을 먼저 보호)
    const tablePlaceholders = [];
    let tableIndex = 0;

    content = content.replace(/<table[\s\S]*?<\/table>/gi, (match) => {
      const placeholder = `___TABLE_${tableIndex}___`;
      tablePlaceholders.push({ placeholder, html: match });
      tableIndex++;
      return placeholder;
    });

    // **bold** 텍스트를 HTML bold로 변환 (LaTeX가 보호된 상태에서)
    content = content.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // 줄바꿈을 문단 구분으로 변환 (LaTeX가 placeholder 상태에서 안전하게 처리)
    // 빈 문단 생성 방지 - 실제 내용이 있는 경우만 </p><p> 태그 삽입
    content = content.replace(/\n\n+/g, (match, offset, string) => {
      // 앞뒤로 실제 텍스트가 있는지 확인
      const before = string.substring(0, offset).trim();
      const after = string.substring(offset + match.length).trim();

      // 앞뒤 모두 내용이 있을 때만 문단 구분자 삽입
      if (before && after) {
        return '</p><p>';
      }
      // 그렇지 않으면 단순 줄바꿈으로 처리
      return '<br>';
    });
    content = content.replace(/\n/g, '<br>');

    // 문단 태그로 감싸기 (아직 포맷팅되지 않은 경우)
    if (!content.includes('<p>') && !content.includes('<div>') && !content.includes('<table>')) {
      content = `<p>${content}</p>`;
    }

    // 코드 블록 복원 (가장 먼저)
    codePlaceholders.forEach(({ placeholder, html }) => {
      content = content.replace(placeholder, html);
    });

    // 테이블 복원 (코드 블록 다음, LaTeX 전)
    tablePlaceholders.forEach(({ placeholder, html }) => {
      content = content.replace(placeholder, html);
    });

    // AI 이미지 복원
    imagePlaceholders.forEach(({ placeholder, html }) => {
      content = content.replace(placeholder, html);
    });

    // LaTeX 수식 복원 (가장 마지막에 - 줄바꿈 처리 후)
    // LaTeX placeholder를 KaTeX로 렌더링하여 복원
    latexPlaceholders.forEach(({ placeholder, original }) => {
      try {
        let latex = original;
        let displayMode = false;

        // Display mode 여부 확인 및 LaTeX 추출
        if (original.startsWith('$$') && original.endsWith('$$')) {
          latex = original.slice(2, -2).trim();
          displayMode = true;
        } else if (original.startsWith('$') && original.endsWith('$')) {
          latex = original.slice(1, -1).trim();
          displayMode = false;
        } else if (original.startsWith('\\[') && original.endsWith('\\]')) {
          latex = original.slice(2, -2).trim();
          displayMode = true;
        } else if (original.startsWith('\\(') && original.endsWith('\\)')) {
          latex = original.slice(2, -2).trim();
          displayMode = false;
        }

        // KaTeX로 렌더링
        if (typeof katex !== 'undefined') {
          const rendered = katex.renderToString(latex, { displayMode, throwOnError: false });
          content = content.replace(placeholder, rendered);
        } else {
          content = content.replace(placeholder, original);
        }
      } catch (e) {
        console.warn('[formatAIResponse] KaTeX 렌더링 실패:', e);
        content = content.replace(placeholder, original);
      }
    });

    // 연속된 <br> 태그 정리 (3개 이상을 2개로 축소)
    content = content.replace(/(<br\s*\/?>){3,}/gi, '<br><br>');

    // 표 앞뒤의 <br> 태그 모두 제거
    content = content.replace(/(<br\s*\/?>)+(\s*<table)/gi, '$2'); // 표 앞 <br> 제거
    content = content.replace(/(<\/table>\s*)(<br\s*\/?>)+/gi, '$1'); // 표 뒤 <br> 제거

    console.log('[formatAIResponse] Formatted content:', content.substring(0, 200));
    return content;
  }

  /**
   * 마크다운 테이블들을 HTML 테이블로 변환
   * 코드 블록 내의 테이블은 변환하지 않습니다.
   *
   * @param {string} text - 마크다운 텍스트
   * @returns {string} HTML 테이블로 변환된 텍스트
   */
  function convertMarkdownTablesToHTML(text) {
    const lines = text.split('\n');
    let result = [];
    let inTable = false;
    let tableLines = [];
    let inCodeBlock = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // 코드 블록 체크
      if (line.trim().startsWith('```')) {
        inCodeBlock = !inCodeBlock;
        // 코드 블록 종료 시 테이블도 종료
        if (!inCodeBlock && inTable && tableLines.length > 0) {
          result.push(buildHTMLTableFromLines(tableLines));
          tableLines = [];
          inTable = false;
        }
        // 코드 블록 시작/종료 라인은 result에 추가
        result.push(line);
        continue;
      }

      // 코드 블록 안에서는 그대로 유지
      if (inCodeBlock) {
        // 코드 블록 내용은 테이블 처리 없이 그대로 추가
        result.push(line);
        continue;
      }

      // 일반 마크다운 테이블 처리
      const trimmed = line.trim();
      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        if (!inTable) {
          inTable = true;
          tableLines = [];
        }
        tableLines.push(line);
      } else if (trimmed.includes('---') && trimmed.includes('|') && inTable) {
        // 구분선 포함
        tableLines.push(line);
      } else {
        // 테이블 종료
        if (inTable && tableLines.length > 0) {
          result.push(buildHTMLTableFromLines(tableLines));
          tableLines = [];
          inTable = false;
        }
        result.push(line);
      }
    }

    // 마지막 테이블 처리
    if (inTable && tableLines.length > 0) {
      result.push(buildHTMLTableFromLines(tableLines));
    }

    return result.join('\n');
  }

  /**
   * 테이블 라인 배열로부터 HTML 테이블 생성
   * 마크다운 테이블 형식의 라인들을 파싱하여 HTML 테이블로 변환합니다.
   *
   * @param {string[]} lines - 마크다운 테이블 라인 배열
   * @returns {string} HTML 테이블 문자열
   */
  function buildHTMLTableFromLines(lines) {
    if (lines.length < 2) return lines.join('\n');

    console.log('[buildHTMLTableFromLines] Lines:', lines);

    // 헤더 라인
    const headerLine = lines[0];
    const headers = headerLine.split('|').map(h => h.trim()).filter(h => h);

    // 구분선 찾기
    let separatorIndex = -1;
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].includes('---') || lines[i].includes('—')) {
        separatorIndex = i;
        break;
      }
    }

    if (separatorIndex === -1) {
      // 구분선이 없으면 원본 반환
      return lines.join('\n');
    }

    // 데이터 라인들
    const dataLines = lines.slice(separatorIndex + 1);
    const dataRows = dataLines.map(line => {
      return line.split('|').map(cell => cell.trim()).filter(cell => cell);
    });

    // HTML 테이블 생성
    let html = '<table>\n';

    // 헤더
    html += '  <thead>\n    <tr>';
    headers.forEach(header => {
      html += `<th>${header}</th>`;
    });
    html += '</tr>\n  </thead>\n';

    // 바디
    if (dataRows.length > 0) {
      html += '  <tbody>\n';
      dataRows.forEach(row => {
        if (row.length > 0) {
          html += '    <tr>';
          row.forEach(cell => {
            html += `<td>${cell}</td>`;
          });
          html += '</tr>\n';
        }
      });
      html += '  </tbody>\n';
    }

    html += '</table>';

    console.log('[buildHTMLTableFromLines] Generated HTML:', html.substring(0, 200));
    return html;
  }

  // 전역 객체에 함수 노출
  window.formatAIResponse = formatAIResponse;
  window.convertMarkdownTablesToHTML = convertMarkdownTablesToHTML;
  window.buildHTMLTableFromLines = buildHTMLTableFromLines;

  // 모듈 로드 완료 로그
  console.log('[format-response] 모듈 로드 완료');

})();
