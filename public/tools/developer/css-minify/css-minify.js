/**
 * CSS 압축 도구 - ToolBase 기반
 * CSS 코드 압축 및 정리
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var CssMinify = class CssMinify extends ToolBase {
  constructor() {
    super('CssMinify');
  }

  init() {
    this.initElements({
      inputCode: 'inputCode',
      outputCode: 'outputCode',
      removeComments: 'removeComments',
      removeWhitespace: 'removeWhitespace',
      removeLastSemicolon: 'removeLastSemicolon',
      shortenColors: 'shortenColors',
      removeZeroUnits: 'removeZeroUnits',
      inputStats: 'inputStats',
      outputStats: 'outputStats',
      savingsInfo: 'savingsInfo'
    });

    console.log('[CssMinify] 초기화 완료');
    return this;
  }

  minify() {
    const input = this.elements.inputCode.value;
    if (!input.trim()) {
      this.showToast('CSS 코드를 입력하세요.', 'warning');
      return;
    }

    const removeComments = this.elements.removeComments.checked;
    const removeWhitespace = this.elements.removeWhitespace.checked;
    const removeLastSemicolon = this.elements.removeLastSemicolon.checked;
    const shortenColors = this.elements.shortenColors.checked;
    const removeZeroUnits = this.elements.removeZeroUnits.checked;

    let result = input;

    try {
      // 주석 제거
      if (removeComments) {
        result = result.replace(/\/\*[\s\S]*?\*\//g, '');
      }

      // 불필요한 공백 제거
      if (removeWhitespace) {
        result = result.replace(/\r?\n/g, '');
        result = result.replace(/\s{2,}/g, ' ');
        result = result.replace(/\s*{\s*/g, '{');
        result = result.replace(/\s*}\s*/g, '}');
        result = result.replace(/\s*:\s*/g, ':');
        result = result.replace(/\s*;\s*/g, ';');
        result = result.replace(/\s*,\s*/g, ',');
      }

      // 마지막 세미콜론 제거
      if (removeLastSemicolon) {
        result = result.replace(/;}/g, '}');
      }

      // 색상 코드 축약
      if (shortenColors) {
        result = result.replace(/#([0-9a-fA-F])\1([0-9a-fA-F])\2([0-9a-fA-F])\3/gi, '#$1$2$3');
      }

      // 0 단위 제거
      if (removeZeroUnits) {
        result = result.replace(/\b0(px|em|rem|%|pt|cm|mm|in|pc|ex|ch|vw|vh|vmin|vmax)\b/gi, '0');
      }

      result = result.trim();

      this.elements.outputCode.value = result;
      this.updateStats();
      this.showSavings(input.length, result.length);
      this.showSuccess('압축 완료!');

    } catch (error) {
      this.showError('압축 오류: ' + error.message);
    }
  }

  beautify() {
    const input = this.elements.inputCode.value;
    if (!input.trim()) {
      this.showToast('CSS 코드를 입력하세요.', 'warning');
      return;
    }

    try {
      let result = input;

      // 기본 정리
      result = result.replace(/\s+/g, ' ');
      result = result.replace(/\{\s*/g, ' {\n  ');
      result = result.replace(/;\s*/g, ';\n  ');
      result = result.replace(/\s*}\s*/g, '\n}\n\n');

      // 미디어 쿼리 내부 들여쓰기
      const lines = result.split('\n');
      let formatted = '';
      let indent = 0;

      for (let line of lines) {
        line = line.trim();
        if (!line) continue;

        if (line === '}') {
          indent = Math.max(0, indent - 1);
          formatted += '  '.repeat(indent) + line + '\n';
          if (indent === 0) formatted += '\n';
        } else if (line.includes('{')) {
          formatted += '  '.repeat(indent) + line + '\n';
          indent++;
        } else {
          formatted += '  '.repeat(indent) + line + '\n';
        }
      }

      this.elements.outputCode.value = formatted.trim();
      this.updateStats();
      this.showSuccess('정리 완료!');

    } catch (error) {
      this.showError('정리 오류: ' + error.message);
    }
  }

  showSavings(originalSize, minifiedSize) {
    const savings = originalSize - minifiedSize;
    const percent = ((savings / originalSize) * 100).toFixed(1);

    if (savings > 0) {
      this.elements.savingsInfo.innerHTML = `<span class="savings-badge">${percent}% 절약 (${savings} bytes)</span>`;
    } else {
      this.elements.savingsInfo.innerHTML = '';
    }
  }

  copy() {
    const output = this.elements.outputCode.value;
    if (!output) {
      this.showToast('복사할 내용이 없습니다.', 'warning');
      return;
    }

    navigator.clipboard.writeText(output).then(() => {
      this.showSuccess('클립보드에 복사되었습니다.');
    });
  }

  async paste() {
    try {
      const text = await navigator.clipboard.readText();
      this.elements.inputCode.value = text;
      this.updateStats();
    } catch (e) {
      this.showError('클립보드 접근이 거부되었습니다.');
    }
  }

  download() {
    const output = this.elements.outputCode.value;
    if (!output) {
      this.showToast('다운로드할 내용이 없습니다.', 'warning');
      return;
    }

    this.downloadFile(output, 'styles.min.css', 'text/css');
  }

  loadSample() {
    const sample = `/* 기본 스타일 */
body {
  margin: 0px;
  padding: 0px;
  font-family: Arial, sans-serif;
  background-color: #ffffff;
  color: #333333;
}

/* 헤더 스타일 */
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  background-color: #3366ff;
}

.header h1 {
  margin: 0px;
  font-size: 24px;
  color: #ffffff;
}

/* 네비게이션 */
.nav {
  display: flex;
  gap: 15px;
}

.nav a {
  color: #ffffff;
  text-decoration: none;
  padding: 10px 15px;
  border-radius: 5px;
  transition: background-color 0.3s ease;
}

.nav a:hover {
  background-color: rgba(255, 255, 255, 0.2);
}

/* 미디어 쿼리 */
@media (max-width: 768px) {
  .header {
    flex-direction: column;
    gap: 10px;
  }

  .nav {
    flex-wrap: wrap;
    justify-content: center;
  }
}`;

    this.elements.inputCode.value = sample;
    this.updateStats();
    this.showToast('샘플 코드가 로드되었습니다.', 'info');
  }

  updateStats() {
    const input = this.elements.inputCode.value;
    const output = this.elements.outputCode.value;

    this.elements.inputStats.textContent =
      `${input.length}자 / ${new Blob([input]).size} bytes`;
    this.elements.outputStats.textContent =
      `${output.length}자 / ${new Blob([output]).size} bytes`;
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const cssMinify = new CssMinify();
window.CssMinify = cssMinify;

document.addEventListener('DOMContentLoaded', () => cssMinify.init());
