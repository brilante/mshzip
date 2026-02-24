/**
 * JSON 포매터 도구 - ToolBase 기반
 * JSON 포맷팅, 검증, 압축, 변환 기능
 * @created 2026-01-11
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var JsonFormatter = class JsonFormatter extends ToolBase {
  constructor() {
    super('JsonFormatter');
    this.parsedData = null;
    this._debounceTimer = null;
  }

  init() {
    this.initElements({
      input: 'jsonInput',
      output: 'jsonOutput',
      indentSize: 'indentSize',
      sortKeys: 'sortKeys',
      stats: 'jsonStats',
      errorPanel: 'errorPanel',
      errorMessage: 'errorMessage',
      errorPosition: 'errorPosition'
    });

    // 이벤트 바인딩
    this.on(this.elements.input, 'input', () => this.onInputChange());
    this.on(this.elements.input, 'paste', () => {
      setTimeout(() => {
        const input = this.elements.input.value.trim();
        if (input) this.format();
      }, 0);
    });

    // 키보드 단축키
    this.on(document, 'keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        this.format();
      }
    });

    console.log('[JsonFormatter] 초기화 완료');
    return this;
  }

  onInputChange() {
    const input = this.elements.input.value.trim();
    if (!input) {
      this.hideError();
      this.elements.output.textContent = '';
      this.elements.stats.style.display = 'none';
      return;
    }

    clearTimeout(this._debounceTimer);
    this._debounceTimer = setTimeout(() => {
      this.validate(true);
    }, 300);
  }

  parse(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      return { success: true, data: parsed };
    } catch (error) {
      const match = error.message.match(/position (\d+)/);
      const position = match ? parseInt(match[1]) : null;

      let line = 1;
      let column = 1;
      if (position !== null) {
        for (let i = 0; i < position && i < jsonString.length; i++) {
          if (jsonString[i] === '\n') {
            line++;
            column = 1;
          } else {
            column++;
          }
        }
      }

      return { success: false, error: error.message, position, line, column };
    }
  }

  format() {
    const input = this.elements.input.value.trim();
    if (!input) {
      this.showToast('JSON을 입력하세요.', 'warning');
      return;
    }

    const result = this.parse(input);
    if (!result.success) {
      this.showError(result);
      return;
    }

    this.hideError();
    this.parsedData = result.data;

    let indent = this.elements.indentSize.value;
    if (indent === '\\t') indent = '\t';
    else indent = parseInt(indent);

    const sortKeys = this.elements.sortKeys.checked;
    let data = result.data;

    if (sortKeys) {
      data = this.sortObjectKeys(data);
    }

    const formatted = JSON.stringify(data, null, indent);
    this.displayOutput(formatted);
    this.updateStats(data, formatted);

    this.showSuccess('포맷팅 완료');
  }

  minify() {
    const input = this.elements.input.value.trim();
    if (!input) {
      this.showToast('JSON을 입력하세요.', 'warning');
      return;
    }

    const result = this.parse(input);
    if (!result.success) {
      this.showError(result);
      return;
    }

    this.hideError();
    this.parsedData = result.data;

    const minified = JSON.stringify(result.data);
    this.displayOutput(minified);
    this.updateStats(result.data, minified);

    this.showSuccess('압축 완료');
  }

  validate(silent = false) {
    const input = this.elements.input.value.trim();
    if (!input) {
      if (!silent) this.showToast('JSON을 입력하세요.', 'warning');
      return false;
    }

    const result = this.parse(input);
    if (!result.success) {
      this.showError(result);
      if (!silent) this.showToast('유효하지 않은 JSON입니다.', 'error');
      return false;
    }

    this.hideError();
    this.parsedData = result.data;

    if (!silent) {
      this.showSuccess('유효한 JSON입니다!');
    }

    return true;
  }

  clear() {
    this.elements.input.value = '';
    this.elements.output.textContent = '';
    this.elements.stats.style.display = 'none';
    this.hideError();
    this.parsedData = null;
    this.elements.input.focus();
  }

  async copyOutput() {
    const output = this.elements.output.textContent;
    if (!output) {
      this.showToast('복사할 내용이 없습니다.', 'warning');
      return;
    }

    await this.copyToClipboard(output);
  }

  toXml() {
    if (!this.parsedData) {
      this.showToast('먼저 JSON을 파싱하세요.', 'warning');
      return;
    }

    const xml = this.jsonToXml(this.parsedData, 'root');
    const formatted = this.formatXml(xml);
    this.displayOutput(formatted);

    this.showSuccess('XML로 변환되었습니다.');
  }

  toCsv() {
    if (!this.parsedData) {
      this.showToast('먼저 JSON을 파싱하세요.', 'warning');
      return;
    }

    if (!Array.isArray(this.parsedData)) {
      this.showToast('CSV 변환은 배열 형태의 JSON만 지원합니다.', 'warning');
      return;
    }

    const csv = this.jsonToCsv(this.parsedData);
    this.displayOutput(csv);

    this.showSuccess('CSV로 변환되었습니다.');
  }

  download() {
    const output = this.elements.output.textContent;
    if (!output) {
      this.showToast('다운로드할 내용이 없습니다.', 'warning');
      return;
    }

    this.downloadFile(output, 'formatted.json', 'application/json');
  }

  displayOutput(text) {
    const highlighted = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"([^"]+)":/g, '<span class="json-key">"$1"</span>:')
      .replace(/: "([^"]*)"/g, ': <span class="json-string">"$1"</span>')
      .replace(/: (-?\d+\.?\d*)/g, ': <span class="json-number">$1</span>')
      .replace(/: (true|false|null)/g, ': <span class="json-boolean">$1</span>');

    this.elements.output.innerHTML = highlighted;
  }

  updateStats(data, formatted) {
    this.elements.stats.style.display = 'flex';

    const keyCount = this.countKeys(data);
    document.getElementById('statKeys').textContent = keyCount;

    const depth = this.getDepth(data);
    document.getElementById('statDepth').textContent = depth;

    const size = this.formatFileSize(new Blob([formatted]).size);
    document.getElementById('statSize').textContent = size;

    const type = Array.isArray(data) ? 'Array' : typeof data;
    document.getElementById('statType').textContent = type;
  }

  showError(result) {
    this.elements.errorPanel.style.display = 'block';
    this.elements.errorMessage.textContent = result.error;

    if (result.line && result.column) {
      this.elements.errorPosition.textContent = `줄 ${result.line}, 열 ${result.column}`;
    } else {
      this.elements.errorPosition.textContent = '';
    }

    this.elements.output.textContent = '';
    this.elements.stats.style.display = 'none';
  }

  hideError() {
    this.elements.errorPanel.style.display = 'none';
  }

  sortObjectKeys(obj) {
    if (Array.isArray(obj)) {
      return obj.map(item => this.sortObjectKeys(item));
    }
    if (obj !== null && typeof obj === 'object') {
      return Object.keys(obj)
        .sort()
        .reduce((sorted, key) => {
          sorted[key] = this.sortObjectKeys(obj[key]);
          return sorted;
        }, {});
    }
    return obj;
  }

  countKeys(obj, count = 0) {
    if (obj !== null && typeof obj === 'object') {
      for (const key in obj) {
        count++;
        count = this.countKeys(obj[key], count);
      }
    }
    return count;
  }

  getDepth(obj) {
    if (obj === null || typeof obj !== 'object') return 0;

    let maxDepth = 0;
    for (const key in obj) {
      const depth = this.getDepth(obj[key]);
      maxDepth = Math.max(maxDepth, depth);
    }
    return maxDepth + 1;
  }

  jsonToXml(obj, rootName = 'root') {
    const convert = (obj, name) => {
      if (obj === null) {
        return `<${name} xsi:nil="true"/>`;
      }
      if (Array.isArray(obj)) {
        return obj.map(item => convert(item, 'item')).join('');
      }
      if (typeof obj === 'object') {
        const children = Object.entries(obj)
          .map(([key, val]) => convert(val, key))
          .join('');
        return `<${name}>${children}</${name}>`;
      }
      const escaped = String(obj)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      return `<${name}>${escaped}</${name}>`;
    };

    return `<?xml version="1.0" encoding="UTF-8"?>\n${convert(obj, rootName)}`;
  }

  formatXml(xml) {
    let formatted = '';
    let indent = '';
    const tab = '  ';

    xml.split(/>\s*</).forEach(node => {
      if (node.match(/^\/\w/)) {
        indent = indent.substring(tab.length);
      }
      formatted += indent + '<' + node + '>\n';
      if (node.match(/^<?\w[^>]*[^/]$/) && !node.startsWith('?')) {
        indent += tab;
      }
    });

    return formatted.substring(1, formatted.length - 2);
  }

  jsonToCsv(arr) {
    if (!arr.length) return '';

    const headers = Object.keys(arr[0]);
    const csvRows = [];

    csvRows.push(headers.join(','));

    for (const row of arr) {
      const values = headers.map(header => {
        let val = row[header];
        if (val === null || val === undefined) val = '';
        if (typeof val === 'object') val = JSON.stringify(val);
        val = String(val).replace(/"/g, '""');
        if (val.includes(',') || val.includes('"') || val.includes('\n')) {
          val = `"${val}"`;
        }
        return val;
      });
      csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const jsonFormatter = new JsonFormatter();
window.JsonFormatter = jsonFormatter;

document.addEventListener('DOMContentLoaded', () => jsonFormatter.init());
