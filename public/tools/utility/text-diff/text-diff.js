/**
 * 텍스트 비교 - ToolBase 기반
 * 두 텍스트 간 차이점 비교
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class TextDiff extends ToolBase {
  constructor() {
    super('TextDiff');
  }

  init() {
    this.initElements({
      compareBtn: 'compareBtn',
      clearBtn: 'clearBtn',
      text1: 'text1',
      text2: 'text2',
      result1: 'result1',
      result2: 'result2',
      stats: 'stats',
      ignoreCase: 'ignoreCase',
      ignoreWhitespace: 'ignoreWhitespace'
    });

    this.bindEvents();

    console.log('[TextDiff] 초기화 완료');
    return this;
  }

  bindEvents() {
    this.elements.compareBtn.addEventListener('click', () => this.compare());
    this.elements.clearBtn.addEventListener('click', () => this.clear());
  }

  clear() {
    this.elements.text1.value = '';
    this.elements.text2.value = '';
    this.elements.result1.innerHTML = '';
    this.elements.result2.innerHTML = '';
    this.elements.stats.innerHTML = '';
  }

  compare() {
    let text1 = this.elements.text1.value;
    let text2 = this.elements.text2.value;

    const ignoreCase = this.elements.ignoreCase.checked;
    const ignoreWhitespace = this.elements.ignoreWhitespace.checked;

    if (ignoreCase) {
      text1 = text1.toLowerCase();
      text2 = text2.toLowerCase();
    }

    if (ignoreWhitespace) {
      text1 = text1.replace(/\s+/g, ' ').trim();
      text2 = text2.replace(/\s+/g, ' ').trim();
    }

    const lines1 = text1.split('\n');
    const lines2 = text2.split('\n');

    const maxLines = Math.max(lines1.length, lines2.length);
    let result1Html = '';
    let result2Html = '';
    let addedCount = 0;
    let removedCount = 0;
    let changedCount = 0;

    for (let i = 0; i < maxLines; i++) {
      const line1 = lines1[i] || '';
      const line2 = lines2[i] || '';

      if (line1 === line2) {
        result1Html += this.escapeHtml(line1) + '\n';
        result2Html += this.escapeHtml(line2) + '\n';
      } else if (!line1 && line2) {
        result1Html += '\n';
        result2Html += '<span class="added">' + this.escapeHtml(line2) + '</span>\n';
        addedCount++;
      } else if (line1 && !line2) {
        result1Html += '<span class="removed">' + this.escapeHtml(line1) + '</span>\n';
        result2Html += '\n';
        removedCount++;
      } else {
        result1Html += '<span class="changed">' + this.escapeHtml(line1) + '</span>\n';
        result2Html += '<span class="changed">' + this.escapeHtml(line2) + '</span>\n';
        changedCount++;
      }
    }

    this.elements.result1.innerHTML = result1Html;
    this.elements.result2.innerHTML = result2Html;
    this.elements.stats.innerHTML = `
      <span>총 줄: <strong>${maxLines}</strong></span>
      <span>추가됨: <strong style="color: #2e7d32">${addedCount}</strong></span>
      <span>삭제됨: <strong style="color: #c62828">${removedCount}</strong></span>
      <span>변경됨: <strong style="color: #f57f17">${changedCount}</strong></span>
    `;
  }

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}

// 전역 인스턴스 생성
const textDiff = new TextDiff();
window.TextDiff = textDiff;

document.addEventListener('DOMContentLoaded', () => textDiff.init());
