/**
 * 행 번호 추가 도구 - ToolBase 기반
 * 각 줄에 번호 추가/제거
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var LineNumber = class LineNumber extends ToolBase {
  constructor() {
    super('LineNumber');
  }

  init() {
    this.initElements({
      textInput: 'textInput',
      textOutput: 'textOutput',
      mode: 'mode',
      separator: 'separator',
      customSeparator: 'customSeparator',
      customSeparatorContainer: 'customSeparatorContainer',
      startNumber: 'startNumber',
      padNumbers: 'padNumbers',
      skipEmpty: 'skipEmpty',
      formatPreview: 'formatPreview',
      statLines: 'statLines',
      statNumbered: 'statNumbered',
      statSkipped: 'statSkipped'
    });

    this.updatePreview();
    this.setupEventListeners();

    console.log('[LineNumber] 초기화 완료');
    return this;
  }

  setupEventListeners() {
    const separatorEl = document.getElementById('separator');
    if (separatorEl) {
      separatorEl.addEventListener('change', (e) => {
        const customContainer = this.elements.customSeparatorContainer;
        customContainer.style.display = e.target.value === 'custom' ? 'block' : 'none';
        this.updatePreview();
        if (this.elements.textInput.value.trim()) {
          this.process();
        }
      });
    }

    ['mode', 'startNumber', 'padNumbers', 'skipEmpty', 'customSeparator'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('change', () => {
          this.updatePreview();
          if (this.elements.textInput.value.trim()) {
            this.process();
          }
        });
      }
    });

    const startNumberEl = document.getElementById('startNumber');
    if (startNumberEl) {
      startNumberEl.addEventListener('input', () => {
        this.updatePreview();
      });
    }

    const customSeparatorEl = document.getElementById('customSeparator');
    if (customSeparatorEl) {
      customSeparatorEl.addEventListener('input', () => {
        this.updatePreview();
      });
    }
  }

  loadFile(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      this.elements.textInput.value = e.target.result;
      this.process();
    };
    reader.readAsText(file);
  }

  liveProcess() {
    if (this._liveProcessTimer) clearTimeout(this._liveProcessTimer);
    this._liveProcessTimer = setTimeout(() => this.process(), 300);
  }

  getSeparator() {
    const separatorSelect = this.elements.separator.value;
    if (separatorSelect === 'custom') {
      return this.elements.customSeparator.value || '. ';
    }
    return separatorSelect;
  }

  process() {
    const input = this.elements.textInput.value;
    if (!input) {
      this.elements.textOutput.value = '';
      this.updateStats(0, 0, 0);
      return;
    }

    const mode = this.elements.mode.value;

    let result;
    if (mode === 'add') {
      result = this.addLineNumbers(input);
    } else {
      result = this.removeLineNumbers(input);
    }

    this.elements.textOutput.value = result;
    this.showToast('처리 완료!', 'success');
  }

  addLineNumbers(input) {
    const lines = input.split('\n');
    const startNumber = parseInt(this.elements.startNumber.value) || 1;
    const separator = this.getSeparator();
    const padNumbers = this.elements.padNumbers.checked;
    const skipEmpty = this.elements.skipEmpty.checked;

    const totalLines = lines.length;
    const maxDigits = String(startNumber + totalLines - 1).length;

    let currentNumber = startNumber;
    let numberedCount = 0;
    let skippedCount = 0;

    const result = lines.map(line => {
      if (skipEmpty && line.trim() === '') {
        skippedCount++;
        return line;
      }

      let numStr = String(currentNumber);
      if (padNumbers) {
        numStr = numStr.padStart(maxDigits, '0');
      }

      numberedCount++;
      currentNumber++;
      return numStr + separator + line;
    });

    this.updateStats(totalLines, numberedCount, skippedCount);
    return result.join('\n');
  }

  removeLineNumbers(input) {
    const lines = input.split('\n');

    const patterns = [
      /^\d+\.\s*/,
      /^\d+:\s*/,
      /^\d+\)\s*/,
      /^\d+\t/,
      /^\d+\s{2,}/,
      /^\[\d+\]\s*/,
      /^#\d+\s*/,
      /^\d+\s/
    ];

    let removedCount = 0;

    const result = lines.map(line => {
      for (const pattern of patterns) {
        if (pattern.test(line)) {
          removedCount++;
          return line.replace(pattern, '');
        }
      }
      return line;
    });

    this.updateStats(lines.length, 0, lines.length - removedCount);
    this.elements.statNumbered.textContent = removedCount;
    this.elements.statNumbered.parentElement.querySelector('.tool-stat-label').textContent = '번호 제거됨';

    return result.join('\n');
  }

  updateStats(totalLines, numbered, skipped) {
    this.elements.statLines.textContent = totalLines;
    this.elements.statNumbered.textContent = numbered;
    this.elements.statNumbered.parentElement.querySelector('.tool-stat-label').textContent = '번호 부여됨';
    this.elements.statSkipped.textContent = skipped;
  }

  updatePreview() {
    const startNumber = parseInt(this.elements.startNumber.value) || 1;
    const separator = this.getSeparator();
    const padNumbers = this.elements.padNumbers.checked;

    const maxDigits = String(startNumber + 2).length;
    const lines = ['첫 번째 줄', '두 번째 줄', '세 번째 줄'];

    const preview = lines.map((line, i) => {
      let numStr = String(startNumber + i);
      if (padNumbers) {
        numStr = numStr.padStart(maxDigits, '0');
      }
      return numStr + separator + line;
    }).join('<br>');

    this.elements.formatPreview.innerHTML = preview;
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

    ToolsUtil.downloadFile(output, 'numbered.txt', 'text/plain');
    this.showToast('다운로드 시작!', 'success');
  }

  clear() {
    this.elements.textInput.value = '';
    this.elements.textOutput.value = '';
    this.updateStats(0, 0, 0);
  }
}

// 전역 인스턴스 생성
const lineNumber = new LineNumber();
window.LineNumber = lineNumber;

document.addEventListener('DOMContentLoaded', () => lineNumber.init());
