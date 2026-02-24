/**
 * URL 인코더/디코더 - ToolBase 기반
 * URL 인코딩 및 디코딩 변환 도구
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var UrlEncoder = class UrlEncoder extends ToolBase {
  constructor() {
    super('UrlEncoder');
  }

  init() {
    this.initElements({
      input: 'urlInput',
      output: 'urlOutput',
      mode: 'encodeMode',
      autoConvert: 'autoConvert',
      urlAnalysis: 'urlAnalysis',
      statOriginal: 'statOriginal',
      statEncoded: 'statEncoded',
      statDiff: 'statDiff'
    });

    // 자동 변환 리스너 (debounce 적용)
    let debounceTimer = null;
    this.on(this.elements.input, 'input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (this.elements.autoConvert.checked) {
          this.autoDetectAndConvert();
        }
        this.analyzeUrl();
      }, 300);
    });

    // 초기 분석
    this.analyzeUrl();

    console.log('[UrlEncoder] 초기화 완료');
    return this;
  }

  encode() {
    const input = this.elements.input.value;
    if (!input.trim()) {
      this.showToast('텍스트를 입력하세요.', 'warning');
      return;
    }

    try {
      const mode = this.elements.mode.value;
      let encoded;

      switch (mode) {
        case 'component':
          encoded = encodeURIComponent(input);
          break;
        case 'uri':
          encoded = encodeURI(input);
          break;
        case 'escape':
          encoded = escape(input);
          break;
        default:
          encoded = encodeURIComponent(input);
      }

      this.elements.output.value = encoded;
      this.updateStats(input, encoded);
      this.showSuccess('인코딩 완료!');
    } catch (error) {
      this.showError('인코딩 오류: ' + error.message);
    }
  }

  decode() {
    const input = this.elements.input.value;
    if (!input.trim()) {
      this.showToast('텍스트를 입력하세요.', 'warning');
      return;
    }

    try {
      const mode = this.elements.mode.value;
      let decoded;

      switch (mode) {
        case 'component':
          decoded = decodeURIComponent(input);
          break;
        case 'uri':
          decoded = decodeURI(input);
          break;
        case 'escape':
          decoded = unescape(input);
          break;
        default:
          decoded = decodeURIComponent(input);
      }

      this.elements.output.value = decoded;
      this.updateStats(input, decoded);
      this.showSuccess('디코딩 완료!');
    } catch (error) {
      this.showError('디코딩 오류: ' + error.message);
    }
  }

  autoDetectAndConvert() {
    const input = this.elements.input.value;
    if (!input.trim()) return;

    const hasEncodedChars = /%[0-9A-Fa-f]{2}/.test(input);

    if (hasEncodedChars) {
      try {
        this.elements.output.value = decodeURIComponent(input);
      } catch {
        try {
          this.elements.output.value = decodeURI(input);
        } catch {
          this.elements.output.value = unescape(input);
        }
      }
    } else {
      this.elements.output.value = encodeURIComponent(input);
    }

    this.updateStats(input, this.elements.output.value);
  }

  analyzeUrl() {
    const input = this.elements.input.value;
    const analysisEl = this.elements.urlAnalysis;

    if (!input.trim()) {
      analysisEl.innerHTML = '<span style="color: var(--tools-text-secondary);">URL을 입력하면 파라미터가 분석됩니다.</span>';
      return;
    }

    try {
      let url;
      try {
        url = new URL(input);
      } catch {
        if (input.includes('=')) {
          url = new URL('http://dummy.com/?' + input.replace(/^\?/, ''));
        } else {
          analysisEl.innerHTML = '<span style="color: var(--tools-text-secondary);">유효한 URL 또는 쿼리 스트링이 아닙니다.</span>';
          return;
        }
      }

      let html = '';

      if (url.protocol && url.host) {
        html += `<div style="margin-bottom: 12px;">
          <strong style="color: var(--tools-primary);">URL 구조:</strong><br>
          <span style="color: #e74c3c;">Protocol:</span> ${url.protocol}<br>
          <span style="color: #3498db;">Host:</span> ${url.host}<br>
          <span style="color: #27ae60;">Pathname:</span> ${url.pathname || '/'}<br>
          ${url.hash ? `<span style="color: #9b59b6;">Hash:</span> ${url.hash}<br>` : ''}
        </div>`;
      }

      const params = url.searchParams;
      if (params.toString()) {
        html += '<strong style="color: var(--tools-primary);">쿼리 파라미터:</strong><br>';
        html += '<table style="width: 100%; border-collapse: collapse; margin-top: 8px;">';
        html += '<tr style="background: var(--tools-bg-secondary);"><th style="text-align: left; padding: 6px; border: 1px solid var(--tools-border);">키</th><th style="text-align: left; padding: 6px; border: 1px solid var(--tools-border);">값</th></tr>';

        params.forEach((value, key) => {
          html += `<tr>
            <td style="padding: 6px; border: 1px solid var(--tools-border); color: #e67e22;">${this.escapeHtml(key)}</td>
            <td style="padding: 6px; border: 1px solid var(--tools-border);">${this.escapeHtml(value)}</td>
          </tr>`;
        });

        html += '</table>';
      } else {
        html += '<span style="color: var(--tools-text-secondary);">쿼리 파라미터가 없습니다.</span>';
      }

      analysisEl.innerHTML = html;
    } catch (error) {
      analysisEl.innerHTML = `<span style="color: var(--tools-error);">분석 오류: ${error.message}</span>`;
    }
  }

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  updateStats(original, encoded) {
    this.elements.statOriginal.textContent = original.length.toLocaleString();
    this.elements.statEncoded.textContent = encoded.length.toLocaleString();

    const diff = ((encoded.length - original.length) / original.length * 100).toFixed(1);
    this.elements.statDiff.textContent = (diff > 0 ? '+' : '') + diff + '%';
    this.elements.statDiff.style.color = diff > 0 ? 'var(--tools-warning)' : 'var(--tools-success)';
  }

  swap() {
    const temp = this.elements.input.value;
    this.elements.input.value = this.elements.output.value;
    this.elements.output.value = temp;
    this.analyzeUrl();
  }

  async copyOutput() {
    const output = this.elements.output.value;
    if (!output) {
      this.showToast('복사할 내용이 없습니다.', 'warning');
      return;
    }

    await navigator.clipboard.writeText(output);
    this.showSuccess('클립보드에 복사되었습니다!');
  }

  download() {
    const output = this.elements.output.value;
    if (!output) {
      this.showToast('다운로드할 내용이 없습니다.', 'warning');
      return;
    }

    this.downloadFile(output, 'url-encoded.txt', 'text/plain');
  }

  clear() {
    this.elements.input.value = '';
    this.elements.output.value = '';
    this.analyzeUrl();
    this.elements.statOriginal.textContent = '0';
    this.elements.statEncoded.textContent = '0';
    this.elements.statDiff.textContent = '0%';
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const urlEncoder = new UrlEncoder();
window.UrlEncoder = urlEncoder;

document.addEventListener('DOMContentLoaded', () => urlEncoder.init());
