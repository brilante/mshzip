/**
 * Markdown → HTML 변환기 - ToolBase 기반
 * Markdown을 HTML로 변환
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var MarkdownToHtml = class MarkdownToHtml extends ToolBase {
  constructor() {
    super('MarkdownToHtml');
    this.currentTab = 'preview';
    this.convertedHtml = '';
  }

  init() {
    this.initElements({
      markdownInput: 'markdownInput',
      previewPanel: 'previewPanel',
      htmlOutput: 'htmlOutput',
      tabPreview: 'tabPreview',
      tabHtml: 'tabHtml',
      gfm: 'gfm',
      breaks: 'breaks',
      sanitize: 'sanitize',
      statChars: 'statChars',
      statWords: 'statWords',
      statLines: 'statLines'
    });

    // marked 옵션 설정
    marked.setOptions({
      gfm: true,
      breaks: false
    });

    console.log('[MarkdownToHtml] 초기화 완료');
    return this;
  }

  loadFile(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      this.elements.markdownInput.value = e.target.result;
      this.convert();
    };
    reader.readAsText(file);
  }

  liveConvert() {
    // 디바운스 처리
    if (this._debounceTimer) {
      clearTimeout(this._debounceTimer);
    }
    this._debounceTimer = setTimeout(() => {
      this.convert();
    }, 300);
  }

  convert() {
    const markdown = this.elements.markdownInput.value;

    // 옵션 설정
    const gfm = this.elements.gfm.checked;
    const breaks = this.elements.breaks.checked;
    const sanitize = this.elements.sanitize.checked;

    marked.setOptions({
      gfm: gfm,
      breaks: breaks
    });

    try {
      let html = marked.parse(markdown);

      // XSS 방지
      if (sanitize && typeof DOMPurify !== 'undefined') {
        html = DOMPurify.sanitize(html);
      }

      this.convertedHtml = html;

      // 출력 업데이트
      this.elements.previewPanel.innerHTML = html;
      this.elements.htmlOutput.value = html;

      // 통계 업데이트
      this.updateStats(markdown);

    } catch (error) {
      console.error('[MarkdownToHtml] 변환 오류:', error);
      this.showToast('변환 오류: ' + error.message, 'error');
    }
  }

  showTab(tab) {
    this.currentTab = tab;

    this.elements.tabPreview.classList.toggle('active', tab === 'preview');
    this.elements.tabHtml.classList.toggle('active', tab === 'html');

    this.elements.previewPanel.style.display = tab === 'preview' ? 'block' : 'none';
    this.elements.htmlOutput.style.display = tab === 'html' ? 'block' : 'none';
  }

  updateStats(text) {
    const chars = text.length;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const lines = text ? text.split('\n').length : 0;

    this.elements.statChars.textContent = chars.toLocaleString();
    this.elements.statWords.textContent = words.toLocaleString();
    this.elements.statLines.textContent = lines.toLocaleString();
  }

  async copyOutput() {
    const output = this.currentTab === 'preview'
      ? this.elements.previewPanel.innerText
      : this.elements.htmlOutput.value;

    if (!output) {
      this.showToast('복사할 내용이 없습니다.', 'warning');
      return;
    }

    try {
      await navigator.clipboard.writeText(
        this.currentTab === 'preview' ? output : this.convertedHtml
      );
      this.showToast('클립보드에 복사되었습니다!', 'success');
    } catch (e) {
      this.showToast('복사 실패', 'error');
    }
  }

  download() {
    if (!this.convertedHtml) {
      this.showToast('다운로드할 내용이 없습니다.', 'warning');
      return;
    }

    this.downloadFile(this.convertedHtml, 'content.html', 'text/html');
    this.showToast('다운로드 시작!', 'success');
  }

  downloadFull() {
    if (!this.convertedHtml) {
      this.showToast('다운로드할 내용이 없습니다.', 'warning');
      return;
    }

    const fullHtml = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Markdown Document</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      color: #333;
    }
    h1, h2, h3, h4, h5, h6 { margin-top: 1.5em; margin-bottom: 0.5em; }
    h1 { font-size: 2em; border-bottom: 1px solid #eee; padding-bottom: 0.3em; }
    h2 { font-size: 1.5em; }
    code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; font-family: 'Consolas', monospace; }
    pre { background: #f4f4f4; padding: 16px; border-radius: 6px; overflow-x: auto; }
    pre code { background: none; padding: 0; }
    blockquote { border-left: 4px solid #ddd; margin: 1em 0; padding: 0.5em 1em; color: #666; }
    table { border-collapse: collapse; width: 100%; margin: 1em 0; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background: #f5f5f5; }
    img { max-width: 100%; }
    a { color: #0066cc; }
  </style>
</head>
<body>
${this.convertedHtml}
</body>
</html>`;

    this.downloadFile(fullHtml, 'document.html', 'text/html');
    this.showToast('전체 HTML 다운로드 시작!', 'success');
  }

  clear() {
    this.elements.markdownInput.value = '';
    this.elements.previewPanel.innerHTML = '';
    this.elements.htmlOutput.value = '';
    this.convertedHtml = '';
    this.elements.statChars.textContent = '0';
    this.elements.statWords.textContent = '0';
    this.elements.statLines.textContent = '0';
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const markdownToHtml = new MarkdownToHtml();
window.MarkdownToHtml = markdownToHtml;

document.addEventListener('DOMContentLoaded', () => markdownToHtml.init());
