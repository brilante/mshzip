/**
 * markdown-utils.js
 * 마크다운/HTML 변환 유틸리티 모듈
 *
 * 마크다운과 HTML 간의 변환 기능을 제공합니다.
 * - MathML → LaTeX 변환
 * - HTML → 포맷된 텍스트 변환
 * - HTML 테이블 → 마크다운 테이블 변환
 * - 마크다운 → HTML 변환
 * - 마크다운 테이블 → HTML 테이블 변환
 *
 * @module MarkdownUtils
 * @version 1.0.0
 */

(function(global) {
  'use strict';

  /**
   * MathML 요소를 LaTeX 문자열로 변환
   * @param {Element} mathElement - MathML math 요소
   * @returns {string} LaTeX 문자열
   */
  function convertMathMLToLaTeX(mathElement) {
    if (!mathElement) return '';

    // 노드를 재귀적으로 처리하여 LaTeX로 변환
    const processNode = (node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent;
      }

      const tagName = node.tagName?.toLowerCase();
      const children = Array.from(node.childNodes).map(processNode).join('');

      switch (tagName) {
        case 'mi': // 식별자 (변수)
        case 'mn': // 숫자
        case 'mo': // 연산자
          return node.textContent;

        case 'msup': // 위첨자 (^)
          const base = processNode(node.childNodes[0]);
          const sup = processNode(node.childNodes[1]);
          return `${base}^{${sup}}`;

        case 'msub': // 아래첨자 (_)
          const baseS = processNode(node.childNodes[0]);
          const sub = processNode(node.childNodes[1]);
          return `${baseS}_{${sub}}`;

        case 'mfrac': // 분수
          const num = processNode(node.childNodes[0]);
          const den = processNode(node.childNodes[1]);
          return `\\frac{${num}}{${den}}`;

        case 'msqrt': // 제곱근
          return `\\sqrt{${children}}`;

        case 'mroot': // n제곱근
          const radicand = processNode(node.childNodes[0]);
          const index = processNode(node.childNodes[1]);
          return `\\sqrt[${index}]{${radicand}}`;

        case 'munderover': // 위아래 기호 (합, 적분 등)
          const op = processNode(node.childNodes[0]);
          const under = processNode(node.childNodes[1]);
          const over = processNode(node.childNodes[2]);
          return `${op}_{${under}}^{${over}}`;

        case 'msubsup': // 위아래 첨자
          const baseSubSup = processNode(node.childNodes[0]);
          const subSubSup = processNode(node.childNodes[1]);
          const supSubSup = processNode(node.childNodes[2]);
          return `${baseSubSup}_{${subSubSup}}^{${supSubSup}}`;

        case 'mrow': // 그룹
        case 'mstyle':
        case 'math':
          return children;

        default:
          return children;
      }
    };

    return processNode(mathElement);
  }

  /**
   * HTML을 포맷된 텍스트로 변환 (줄바꿈 정보 유지)
   * KaTeX/MathJax 렌더링된 수식을 원본 LaTeX로 복원합니다.
   * @param {HTMLElement} element - 변환할 HTML 엘리먼트
   * @returns {string} 포맷된 텍스트
   */
  function convertHtmlToFormattedText(element) {
    if (!element) return '';

    // 원본 수정을 피하기 위해 복제
    const clone = element.cloneNode(true);

    // KaTeX 렌더링된 수식을 원본 LaTeX로 복원
    clone.querySelectorAll('.katex').forEach(katexSpan => {
      // KaTeX는 <math><semantics><annotation encoding="application/x-tex">에 원본 LaTeX 저장
      const annotation = katexSpan.querySelector('math semantics annotation[encoding="application/x-tex"]');
      if (annotation) {
        const latex = annotation.textContent;

        // Display math인지 inline math인지 확인
        // KaTeX는 display mode일 때 .katex-display 클래스 사용
        const isDisplay = katexSpan.classList.contains('katex-display') ||
          katexSpan.parentElement?.classList.contains('katex-display');

        // Display math: $$...$$ 또는 \[...\], Inline math: $...$ 또는 \(...\)
        const wrappedLatex = isDisplay
          ? `$$${latex}$$`
          : `$${latex}$`;

        console.log('[convertHtmlToFormattedText] KaTeX → LaTeX:', wrappedLatex.substring(0, 100));

        // KaTeX span 전체를 LaTeX로 교체
        const textNode = document.createTextNode(wrappedLatex);
        katexSpan.replaceWith(textNode);
      }
    });

    // MathJax 렌더링된 수식을 원본 LaTeX로 복원
    clone.querySelectorAll('mjx-container').forEach(container => {
      // MathJax는 접근성을 위해 <mjx-assistive-mml>에 MathML 저장
      const assistiveMml = container.querySelector('mjx-assistive-mml math');
      if (assistiveMml) {
        const isDisplay = container.getAttribute('display') === 'true';

        // MathML을 LaTeX로 변환
        const latex = convertMathMLToLaTeX(assistiveMml);

        // Display math (블록): \[...\], Inline math (인라인): \(...\)
        const wrappedLatex = isDisplay
          ? `\n\n\\[${latex}\\]\n\n`
          : `\\(${latex}\\)`;

        console.log('[convertHtmlToFormattedText] MathML → LaTeX:', wrappedLatex.substring(0, 100));
        container.replaceWith(wrappedLatex);
      }
    });

    // 요소 순서대로 처리: 테이블, 헤더, 리스트, 단락, div, 줄바꿈

    // <table> → HTML 테이블 형식 유지 (마크다운 테이블은 LaTeX 렌더링 미지원)
    // TOAST UI Editor의 KaTeX 플러그인은 마크다운 테이블 내 LaTeX를 렌더링하지 않음
    // 해결책: 마크다운 변환 대신 HTML 테이블 형식 유지
    clone.querySelectorAll('table').forEach(table => {
      // 테이블을 HTML 문자열로 변환하고 줄바꿈으로 감싸기
      const tableHTML = '\n\n' + table.outerHTML + '\n\n';

      console.log('[Table] Keeping HTML format for LaTeX support');
      table.replaceWith(tableHTML);
    });

    // <h1>, <h2>, <h3> 등 → # 접두사와 함께 이중 줄바꿈
    for (let i = 1; i <= 6; i++) {
      clone.querySelectorAll(`h${i}`).forEach(h => {
        const text = h.textContent.trim();
        const prefix = '#'.repeat(i);
        h.replaceWith(`\n\n${prefix} ${text}\n\n`);
      });
    }

    // <li> → 글머리 기호 또는 번호와 함께 줄바꿈
    clone.querySelectorAll('li').forEach((li, index) => {
      const text = li.textContent.trim();
      const parentTag = li.parentElement?.tagName.toLowerCase();
      const prefix = parentTag === 'ol' ? `${index + 1}. ` : '- ';
      li.replaceWith('\n' + prefix + text);
    });

    // <p> → 이중 줄바꿈 (단락 구분)
    clone.querySelectorAll('p').forEach(p => {
      const text = p.textContent.trim();
      if (text) {
        p.replaceWith('\n\n' + text);
      } else {
        // 빈 <p> 태그 완전 제거 (프리뷰에서 <P></P> 노출 방지)
        p.remove();
      }
    });

    // <br> → 줄바꿈 (줄바꿈 유지)
    clone.querySelectorAll('br').forEach(br => {
      br.replaceWith('\n');
    });

    // <strong>, <b> → 텍스트만 유지 (태그 제거, 내용 보존)
    clone.querySelectorAll('strong, b').forEach(elem => {
      elem.replaceWith(elem.textContent);
    });

    // <div> → 내용 앞에 줄바꿈 (블록 구조 유지)
    clone.querySelectorAll('div').forEach(div => {
      const text = div.textContent.trim();
      if (text) {
        // div가 마크다운 구조 요소를 포함하는지 확인
        const hasStructure = div.querySelector('p, h1, h2, h3, h4, h5, h6, ul, ol, li, table');
        if (!hasStructure) {
          div.replaceWith('\n' + text);
        }
      }
    });

    // 최종 텍스트 내용 가져오기
    let text = clone.textContent || '';

    console.log('[convertHtmlToFormattedText] Before cleanup:', text.substring(0, 300));

    // 과도한 공백 정리하되 단일/이중 줄바꿈 유지
    // 연속 공백 3개 이상을 단일 공백으로 교체
    text = text.replace(/   +/g, ' ');

    // 과도한 빈 줄 제거로 <P></P> 태그 방지
    // 연속 줄바꿈 3개 이상을 2개로 교체 (단락 구분 유지)
    text = text.replace(/\n{3,}/g, '\n\n');

    // 수식 주변의 불필요한 빈 줄 제거
    // LaTeX 블록 수식 주변 정리: \n\n$$...$$\n\n → \n\n$$...$$\n\n (변경 없음)
    // LaTeX 인라인 수식 앞뒤 빈 줄 제거: \n\n$...$\n\n → \n$...$\n
    text = text.replace(/\n\n(\$[^$\n]+?\$)\n\n/g, '\n$1\n');

    // 헤더 주변 빈 줄 정리: \n\n## ...\n\n → \n\n## ...\n
    text = text.replace(/\n\n(#{1,6}\s[^\n]+)\n\n/g, '\n\n$1\n');

    // 앞뒤 공백 제거하되 내부 구조 유지
    text = text.trim();

    console.log('[convertHtmlToFormattedText] After cleanup:', text.substring(0, 300));

    return text;
  }

  /**
   * HTML 테이블을 마크다운 테이블로 변환
   * @param {string} html - 테이블을 포함한 HTML 문자열
   * @returns {string} 마크다운 테이블로 변환된 문자열
   */
  function convertHTMLTableToMarkdown(html) {
    console.log('[convertHTMLTableToMarkdown] Converting HTML tables to markdown...');

    // HTML 파싱을 위한 임시 div 생성
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    // 모든 테이블 찾기
    const tables = tempDiv.querySelectorAll('table');

    if (tables.length === 0) {
      console.log('[convertHTMLTableToMarkdown] No tables found');
      return html;
    }

    console.log(`[convertHTMLTableToMarkdown] Found ${tables.length} table(s)`);

    // 각 테이블을 마크다운으로 변환
    tables.forEach((table, tableIndex) => {
      console.log(`[convertHTMLTableToMarkdown] Processing table ${tableIndex + 1}...`);

      const rows = [];
      const thead = table.querySelector('thead');
      const tbody = table.querySelector('tbody');

      // 헤더 행 처리
      if (thead) {
        const headerRows = thead.querySelectorAll('tr');
        headerRows.forEach((tr) => {
          const cells = tr.querySelectorAll('th, td');
          const cellTexts = Array.from(cells).map(cell => {
            // 중첩 요소 처리하여 텍스트 내용 가져오기
            let text = cell.textContent.trim();
            // 셀에 LaTeX 수식이 포함되어 있는지 확인 (<span>$...$</span> 내)
            const spanWithFormula = cell.querySelector('span');
            if (spanWithFormula && spanWithFormula.textContent.includes('$')) {
              text = spanWithFormula.textContent.trim();
            }
            return text;
          });
          rows.push('| ' + cellTexts.join(' | ') + ' |');
        });

        // 구분선 행 추가
        if (rows.length > 0) {
          const firstRow = rows[0];
          const columnCount = (firstRow.match(/\|/g) || []).length - 1;
          const separator = '|' + ' --- |'.repeat(columnCount);
          rows.push(separator);
        }
      }

      // 본문 행 처리
      if (tbody) {
        const bodyRows = tbody.querySelectorAll('tr');
        bodyRows.forEach((tr) => {
          const cells = tr.querySelectorAll('th, td');
          const cellTexts = Array.from(cells).map(cell => {
            // 중첩 요소 처리하여 텍스트 내용 가져오기
            let text = cell.textContent.trim();
            // 셀에 LaTeX 수식이 포함되어 있는지 확인 (<span>$...$</span> 내)
            const spanWithFormula = cell.querySelector('span');
            if (spanWithFormula && spanWithFormula.textContent.includes('$')) {
              text = spanWithFormula.textContent.trim();
            }
            return text;
          });
          rows.push('| ' + cellTexts.join(' | ') + ' |');
        });
      }

      // 마크다운 테이블 생성
      const markdownTable = rows.join('\n');
      console.log(`[convertHTMLTableToMarkdown] Markdown table ${tableIndex + 1}:\n${markdownTable.substring(0, 300)}...`);

      // HTML 테이블을 마크다운 테이블로 교체
      table.outerHTML = markdownTable;
    });

    // 마크다운 테이블이 포함된 업데이트된 HTML 반환
    const result = tempDiv.innerHTML;
    console.log('[convertHTMLTableToMarkdown] Conversion complete');
    return result;
  }

  /**
   * 마크다운을 HTML로 변환 (마크다운 → HTML 완전 변환)
   * @param {string} markdown - 마크다운 문자열
   * @returns {string} HTML 문자열
   */
  function markdownToHTML(markdown) {
    console.log('[markdownToHTML] Input:', markdown);

    const lines = markdown.split('\n');
    let result = [];
    let inTable = false;
    let tableLines = [];
    let inList = false;
    let listItems = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // 빈 줄 처리
      if (!trimmed) {
        // 리스트 종료
        if (inList) {
          result.push('<ul>');
          listItems.forEach(item => result.push(`<li>${item}</li>`));
          result.push('</ul>');
          listItems = [];
          inList = false;
        }
        // 테이블 종료
        if (inTable && tableLines.length > 0) {
          result.push(convertMarkdownTableToHTML(tableLines));
          tableLines = [];
          inTable = false;
        }
        // 빈 줄은 무시 (단락 간격은 CSS로 처리)
        continue;
      }

      // 테이블 행 감지
      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        // 리스트가 열려있으면 먼저 닫기
        if (inList) {
          result.push('<ul>');
          listItems.forEach(item => result.push(`<li>${item}</li>`));
          result.push('</ul>');
          listItems = [];
          inList = false;
        }

        if (!inTable) {
          inTable = true;
          tableLines = [];
        }
        tableLines.push(trimmed);
        continue;
      }

      // 테이블이 열려있으면 닫기
      if (inTable && tableLines.length > 0) {
        result.push(convertMarkdownTableToHTML(tableLines));
        tableLines = [];
        inTable = false;
      }

      // 헤더 처리 (## ... 또는 ### ...)
      if (trimmed.startsWith('##')) {
        // 리스트가 열려있으면 먼저 닫기
        if (inList) {
          result.push('<ul>');
          listItems.forEach(item => result.push(`<li>${item}</li>`));
          result.push('</ul>');
          listItems = [];
          inList = false;
        }

        const level = (trimmed.match(/^#+/) || [''])[0].length;
        const text = trimmed.substring(level).trim();
        result.push(`<h${level}>${text}</h${level}>`);
        continue;
      }

      // 리스트 항목 처리 (- ... 또는 * ...)
      if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
        const text = trimmed.substring(1).trim();
        listItems.push(text);
        inList = true;
        continue;
      }

      // 리스트가 열려있으면 닫기
      if (inList) {
        result.push('<ul>');
        listItems.forEach(item => result.push(`<li>${item}</li>`));
        result.push('</ul>');
        listItems = [];
        inList = false;
      }

      // 일반 텍스트 단락
      result.push(`<p>${trimmed}</p>`);
    }

    // 마지막에 열려있는 리스트 닫기
    if (inList && listItems.length > 0) {
      result.push('<ul>');
      listItems.forEach(item => result.push(`<li>${item}</li>`));
      result.push('</ul>');
    }

    // 마지막에 열려있는 테이블 닫기
    if (inTable && tableLines.length > 0) {
      result.push(convertMarkdownTableToHTML(tableLines));
    }

    const html = result.join('\n');
    console.log('[markdownToHTML] Output:', html);
    return html;
  }

  /**
   * 마크다운 테이블 라인들을 HTML 테이블로 변환
   * @param {string[]} tableLines - 마크다운 테이블 라인 배열
   * @returns {string} HTML 테이블 문자열
   */
  function convertMarkdownTableToHTML(tableLines) {
    if (tableLines.length < 2) return tableLines.join('\n');

    // 첫 번째 줄: 헤더
    const headerCells = tableLines[0].split('|').map(c => c.trim()).filter(c => c);

    // 두 번째 줄: 구분선 (| --- | --- |)
    const isSeparator = tableLines[1].includes('---') || tableLines[1].includes('—');

    if (!isSeparator) {
      // 구분선이 없으면 일반 텍스트로 반환
      return tableLines.join('\n');
    }

    // 나머지 줄: 데이터 행
    const dataRows = tableLines.slice(2).map(line => {
      return line.split('|').map(c => c.trim()).filter(c => c);
    });

    // HTML 테이블 생성
    let tableHTML = '<table style="border-collapse: collapse; width: 100%; margin: 10px 0; border: 1px solid #ddd;">\n';

    // 헤더 생성
    tableHTML += '  <thead>\n    <tr>';
    headerCells.forEach(header => {
      tableHTML += `<th style="border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2; text-align: left;">${header}</th>`;
    });
    tableHTML += '</tr>\n  </thead>\n';

    // 바디 생성
    if (dataRows.length > 0) {
      tableHTML += '  <tbody>\n';
      dataRows.forEach(row => {
        tableHTML += '    <tr>';
        row.forEach(cell => {
          tableHTML += `<td style="border: 1px solid #ddd; padding: 8px;">${cell}</td>`;
        });
        tableHTML += '</tr>\n';
      });
      tableHTML += '  </tbody>\n';
    }

    tableHTML += '</table>';

    console.log('[convertMarkdownTableToHTML] Generated:', tableHTML);
    return tableHTML;
  }

  // ============================================================
  // 전역 객체에 함수 노출
  // ============================================================

  // 네임스페이스 생성 (없으면 생성)
  global.MarkdownUtils = global.MarkdownUtils || {};

  // 함수 노출
  global.MarkdownUtils.convertMathMLToLaTeX = convertMathMLToLaTeX;
  global.MarkdownUtils.convertHtmlToFormattedText = convertHtmlToFormattedText;
  global.MarkdownUtils.convertHTMLTableToMarkdown = convertHTMLTableToMarkdown;
  global.MarkdownUtils.markdownToHTML = markdownToHTML;
  global.MarkdownUtils.convertMarkdownTableToHTML = convertMarkdownTableToHTML;

  // 하위 호환성을 위한 개별 전역 함수 노출
  global.convertMathMLToLaTeX = convertMathMLToLaTeX;
  global.convertHtmlToFormattedText = convertHtmlToFormattedText;
  global.convertHTMLTableToMarkdown = convertHTMLTableToMarkdown;
  global.markdownToHTML = markdownToHTML;
  global.convertMarkdownTableToHTML = convertMarkdownTableToHTML;

  console.log('[MarkdownUtils] Module loaded successfully');

})(typeof window !== 'undefined' ? window : this);
