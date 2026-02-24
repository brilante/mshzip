/**
 * 텍스트 정렬 도구 - ToolBase 기반
 * 줄 단위로 텍스트 정렬
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var TextSort = class TextSort extends ToolBase {
  constructor() {
    super('TextSort');
  }

  init() {
    this.initElements({
      textInput: 'textInput',
      textOutput: 'textOutput',
      sortOrder: 'sortOrder',
      sortType: 'sortType',
      ignoreCase: 'ignoreCase',
      trimLines: 'trimLines',
      removeEmpty: 'removeEmpty',
      statInputLines: 'statInputLines',
      statOutputLines: 'statOutputLines',
      statRemoved: 'statRemoved'
    });

    this.setupEventListeners();

    console.log('[TextSort] 초기화 완료');
    return this;
  }

  setupEventListeners() {
    ['sortOrder', 'sortType', 'ignoreCase', 'trimLines', 'removeEmpty'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('change', () => {
          if (this.elements.textInput.value.trim()) {
            this.sort();
          }
        });
      }
    });
  }

  loadFile(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      this.elements.textInput.value = e.target.result;
      this.sort();
    };
    reader.readAsText(file);
  }

  liveSort() {
    if (this._liveSortTimer) clearTimeout(this._liveSortTimer);
    this._liveSortTimer = setTimeout(() => this.sort(), 300);
  }

  sort() {
    const input = this.elements.textInput.value;
    if (!input.trim()) {
      this.elements.textOutput.value = '';
      this.updateStats(0, 0);
      return;
    }

    const sortOrder = this.elements.sortOrder.value;
    const sortType = this.elements.sortType.value;
    const ignoreCase = this.elements.ignoreCase.checked;
    const trimLines = this.elements.trimLines.checked;
    const removeEmpty = this.elements.removeEmpty.checked;

    let lines = input.split('\n');
    const inputCount = lines.length;

    if (trimLines) {
      lines = lines.map(l => l.trim());
    }
    if (removeEmpty) {
      lines = lines.filter(l => l.length > 0);
    }

    lines = this.sortLines(lines, sortType, sortOrder, ignoreCase);

    const result = lines.join('\n');
    this.elements.textOutput.value = result;

    this.updateStats(inputCount, lines.length);
    this.showToast('정렬 완료!', 'success');
  }

  sortLines(lines, sortType, sortOrder, ignoreCase) {
    const compare = this.getCompareFunction(sortType, ignoreCase);

    if (sortType === 'random') {
      for (let i = lines.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [lines[i], lines[j]] = [lines[j], lines[i]];
      }
      return lines;
    }

    lines.sort(compare);

    if (sortOrder === 'desc') {
      lines.reverse();
    }

    return lines;
  }

  getCompareFunction(sortType, ignoreCase) {
    switch (sortType) {
      case 'alpha':
        return (a, b) => {
          const strA = ignoreCase ? a.toLowerCase() : a;
          const strB = ignoreCase ? b.toLowerCase() : b;
          return strA.localeCompare(strB, 'ko');
        };

      case 'natural':
        return (a, b) => {
          const strA = ignoreCase ? a.toLowerCase() : a;
          const strB = ignoreCase ? b.toLowerCase() : b;
          return strA.localeCompare(strB, 'ko', { numeric: true, sensitivity: 'base' });
        };

      case 'length':
        return (a, b) => a.length - b.length;

      default:
        return (a, b) => a.localeCompare(b, 'ko');
    }
  }

  reverse() {
    const output = this.elements.textOutput.value;
    if (!output) {
      this.showToast('역순할 내용이 없습니다.', 'warning');
      return;
    }

    const lines = output.split('\n').reverse();
    this.elements.textOutput.value = lines.join('\n');
    this.showToast('역순 완료!', 'success');
  }

  updateStats(inputLines, outputLines) {
    this.elements.statInputLines.textContent = inputLines;
    this.elements.statOutputLines.textContent = outputLines;
    this.elements.statRemoved.textContent = inputLines - outputLines;
  }

  async copyOutput() {
    const output = this.elements.textOutput.value;
    if (!output) {
      this.showToast('복사할 내용이 없습니다.', 'warning');
      return;
    }

    const success = await this.copyToClipboard(output);
    if (success) {
      this.showToast('클립보드에 복사되었습니다!', 'success');
    } else {
      this.showToast('복사 실패', 'error');
    }
  }

  download() {
    const output = this.elements.textOutput.value;
    if (!output) {
      this.showToast('다운로드할 내용이 없습니다.', 'warning');
      return;
    }

    ToolsUtil.downloadFile(output, 'sorted.txt', 'text/plain');
    this.showToast('다운로드 시작!', 'success');
  }

  clear() {
    this.elements.textInput.value = '';
    this.elements.textOutput.value = '';
    this.updateStats(0, 0);
  }
}

// 전역 인스턴스 생성
const textSort = new TextSort();
window.TextSort = textSort;

document.addEventListener('DOMContentLoaded', () => textSort.init());
