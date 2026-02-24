/**
 * HTML 압축 도구 - ToolBase 기반
 * HTML 코드 압축 및 정리
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var HtmlMinify = class HtmlMinify extends ToolBase {
  constructor() {
    super('HtmlMinify');
  }

  init() {
    this.initElements({
      inputCode: 'inputCode',
      outputCode: 'outputCode',
      removeComments: 'removeComments',
      removeWhitespace: 'removeWhitespace',
      removeNewlines: 'removeNewlines',
      removeQuotes: 'removeQuotes',
      collapseAttributes: 'collapseAttributes',
      inputStats: 'inputStats',
      outputStats: 'outputStats',
      savingsInfo: 'savingsInfo'
    });

    console.log('[HtmlMinify] 초기화 완료');
    return this;
  }

  minify() {
    const input = this.elements.inputCode.value;
    if (!input.trim()) {
      this.showToast('HTML 코드를 입력하세요.', 'warning');
      return;
    }

    const removeComments = this.elements.removeComments.checked;
    const removeWhitespace = this.elements.removeWhitespace.checked;
    const removeNewlines = this.elements.removeNewlines.checked;
    const removeQuotes = this.elements.removeQuotes.checked;
    const collapseAttributes = this.elements.collapseAttributes.checked;

    let result = input;

    try {
      if (removeComments) {
        result = result.replace(/<!--[\s\S]*?-->/g, '');
      }

      if (removeNewlines) {
        result = result.replace(/\r?\n/g, ' ');
      }

      if (removeWhitespace) {
        result = result.replace(/>\s+</g, '><');
        result = result.replace(/\s{2,}/g, ' ');
        result = result.replace(/\s*=\s*/g, '=');
      }

      if (removeQuotes) {
        result = result.replace(/="([a-zA-Z0-9_-]+)"/g, '=$1');
      }

      if (collapseAttributes) {
        result = result.replace(/disabled="disabled"/gi, 'disabled');
        result = result.replace(/checked="checked"/gi, 'checked');
        result = result.replace(/selected="selected"/gi, 'selected');
        result = result.replace(/readonly="readonly"/gi, 'readonly');
        result = result.replace(/required="required"/gi, 'required');
        result = result.replace(/autofocus="autofocus"/gi, 'autofocus');
        result = result.replace(/autoplay="autoplay"/gi, 'autoplay');
        result = result.replace(/controls="controls"/gi, 'controls');
        result = result.replace(/loop="loop"/gi, 'loop');
        result = result.replace(/muted="muted"/gi, 'muted');
        result = result.replace(/hidden="hidden"/gi, 'hidden');
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
      this.showToast('HTML 코드를 입력하세요.', 'warning');
      return;
    }

    try {
      let result = input;
      let formatted = '';
      let indent = 0;
      const indentStr = '  ';

      const tags = result.match(/<[^>]+>|[^<]+/g) || [];

      for (let tag of tags) {
        tag = tag.trim();
        if (!tag) continue;

        if (tag.match(/^<\//)) {
          indent--;
          formatted += indentStr.repeat(Math.max(0, indent)) + tag + '\n';
        }
        else if (tag.match(/\/>$/) || tag.match(/^<(br|hr|img|input|meta|link|area|base|col|embed|param|source|track|wbr)/i)) {
          formatted += indentStr.repeat(indent) + tag + '\n';
        }
        else if (tag.match(/^<!/) || tag.match(/^<\?/)) {
          formatted += tag + '\n';
        }
        else if (tag.match(/^</)) {
          formatted += indentStr.repeat(indent) + tag + '\n';
          if (!tag.match(/^<(span|a|strong|em|b|i|u|small|big|sub|sup|code|abbr|cite)/i)) {
            indent++;
          }
        }
        else {
          formatted += indentStr.repeat(indent) + tag + '\n';
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
      this.elements.savingsInfo.innerHTML = `<span class="savings-badge negative">변화 없음</span>`;
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

    this.downloadFile(output, 'minified.html', 'text/html');
  }

  loadSample() {
    const sample = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>샘플 페이지</title>
  <!-- 이것은 주석입니다 -->
  <style>
    body { margin: 0; padding: 20px; }
  </style>
</head>
<body>
  <header>
    <h1>안녕하세요!</h1>
    <nav>
      <a href="#home">홈</a>
      <a href="#about">소개</a>
      <a href="#contact">연락처</a>
    </nav>
  </header>

  <main>
    <section id="home">
      <p>이것은   샘플   HTML   입니다.</p>
      <input type="text" disabled="disabled" />
      <button type="submit" autofocus="autofocus">전송</button>
    </section>
  </main>

  <footer>
    <p>&copy; 2026 MyMind3</p>
  </footer>
</body>
</html>`;

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
const htmlMinify = new HtmlMinify();
window.HtmlMinify = htmlMinify;

document.addEventListener('DOMContentLoaded', () => htmlMinify.init());
