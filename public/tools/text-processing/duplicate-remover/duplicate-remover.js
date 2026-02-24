/**
 * 중복 제거 도구 - ToolBase 기반
 * 중복된 줄 찾기 및 제거
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var DuplicateRemover = class DuplicateRemover extends ToolBase {
  constructor() {
    super('DuplicateRemover');
    this.lastDuplicateInfo = null;
  }

  init() {
    this.initElements({
      textInput: 'textInput',
      textOutput: 'textOutput',
      outputMode: 'outputMode',
      ignoreCase: 'ignoreCase',
      trimLines: 'trimLines',
      removeEmpty: 'removeEmpty',
      sortResult: 'sortResult',
      statInputLines: 'statInputLines',
      statOutputLines: 'statOutputLines',
      statDuplicates: 'statDuplicates',
      statReduction: 'statReduction',
      duplicateDetails: 'duplicateDetails',
      duplicateList: 'duplicateList'
    });

    this.setupEventListeners();

    console.log('[DuplicateRemover] 초기화 완료');
    return this;
  }

  setupEventListeners() {
    ['outputMode', 'ignoreCase', 'trimLines', 'removeEmpty', 'sortResult'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('change', () => {
          if (this.elements.textInput.value.trim()) {
            this.process();
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
      this.process();
    };
    reader.readAsText(file);
  }

  liveProcess() {
    if (this._liveProcessTimer) clearTimeout(this._liveProcessTimer);
    this._liveProcessTimer = setTimeout(() => this.process(), 300);
  }

  process() {
    const input = this.elements.textInput.value;
    if (!input.trim()) {
      this.elements.textOutput.value = '';
      this.updateStats(0, 0, 0);
      return;
    }

    const outputMode = this.elements.outputMode.value;
    const ignoreCase = this.elements.ignoreCase.checked;
    const trimLines = this.elements.trimLines.checked;
    const removeEmpty = this.elements.removeEmpty.checked;
    const sortResult = this.elements.sortResult.checked;

    let lines = input.split('\n');
    const inputCount = lines.length;

    if (trimLines) {
      lines = lines.map(l => l.trim());
    }
    if (removeEmpty) {
      lines = lines.filter(l => l.length > 0);
    }

    const { unique, duplicates, duplicateInfo } = this.analyzeDuplicates(lines, ignoreCase);
    this.lastDuplicateInfo = duplicateInfo;

    let result;
    switch (outputMode) {
      case 'unique':
        result = unique;
        break;
      case 'duplicates':
        result = duplicates;
        break;
      case 'first':
        result = this.keepFirstOccurrence(lines, ignoreCase);
        break;
    }

    if (sortResult) {
      result.sort((a, b) => a.localeCompare(b, 'ko'));
    }

    this.elements.textOutput.value = result.join('\n');

    const duplicateCount = lines.length - unique.length;
    this.updateStats(inputCount, result.length, duplicateCount);
    this.showToast('처리 완료!', 'success');
  }

  analyzeDuplicates(lines, ignoreCase) {
    const seen = new Map();
    const duplicateInfo = new Map();

    lines.forEach((line, index) => {
      const key = ignoreCase ? line.toLowerCase() : line;
      if (seen.has(key)) {
        seen.get(key).push(index);
        if (!duplicateInfo.has(key)) {
          duplicateInfo.set(key, { original: line, count: 1 });
        }
        duplicateInfo.get(key).count++;
      } else {
        seen.set(key, [index]);
      }
    });

    const unique = [];
    const duplicates = [];

    for (const [key, indices] of seen) {
      const originalLine = lines[indices[0]];
      if (indices.length === 1) {
        unique.push(originalLine);
      } else {
        duplicates.push(originalLine);
      }
    }

    return { unique, duplicates, duplicateInfo };
  }

  keepFirstOccurrence(lines, ignoreCase) {
    const seen = new Set();
    const result = [];

    for (const line of lines) {
      const key = ignoreCase ? line.toLowerCase() : line;
      if (!seen.has(key)) {
        seen.add(key);
        result.push(line);
      }
    }

    return result;
  }

  updateStats(inputLines, outputLines, duplicates) {
    const reduction = inputLines > 0 ? Math.round((1 - outputLines / inputLines) * 100) : 0;

    this.elements.statInputLines.textContent = inputLines;
    this.elements.statOutputLines.textContent = outputLines;
    this.elements.statDuplicates.textContent = duplicates;
    this.elements.statDuplicates.style.color =
      duplicates > 0 ? 'var(--tools-warning)' : 'inherit';
    this.elements.statReduction.textContent = reduction + '%';
  }

  showDuplicateDetails() {
    const panel = this.elements.duplicateDetails;
    const list = this.elements.duplicateList;

    if (!this.lastDuplicateInfo || this.lastDuplicateInfo.size === 0) {
      list.innerHTML = '<p>중복된 항목이 없습니다.</p>';
      panel.style.display = 'block';
      return;
    }

    let html = '<table style="width: 100%; border-collapse: collapse;">';
    html += '<tr style="border-bottom: 1px solid var(--tools-border);">';
    html += '<th style="text-align: left; padding: 8px;">텍스트</th>';
    html += '<th style="text-align: center; padding: 8px; width: 80px;">횟수</th>';
    html += '</tr>';

    for (const [key, info] of this.lastDuplicateInfo) {
      const escapedText = this.escapeHtml(info.original);
      const truncated = escapedText.length > 50 ? escapedText.substring(0, 50) + '...' : escapedText;
      html += `<tr style="border-bottom: 1px solid var(--tools-border);">`;
      html += `<td style="padding: 8px;" title="${escapedText}">${truncated}</td>`;
      html += `<td style="text-align: center; padding: 8px; color: var(--tools-warning);">${info.count + 1}</td>`;
      html += '</tr>';
    }

    html += '</table>';
    list.innerHTML = html;
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
  }

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
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

    ToolsUtil.downloadFile(output, 'deduplicated.txt', 'text/plain');
    this.showToast('다운로드 시작!', 'success');
  }

  clear() {
    this.elements.textInput.value = '';
    this.elements.textOutput.value = '';
    this.elements.duplicateDetails.style.display = 'none';
    this.lastDuplicateInfo = null;
    this.updateStats(0, 0, 0);
  }
}

// 전역 인스턴스 생성
const duplicateRemover = new DuplicateRemover();
window.DuplicateRemover = duplicateRemover;

document.addEventListener('DOMContentLoaded', () => duplicateRemover.init());
