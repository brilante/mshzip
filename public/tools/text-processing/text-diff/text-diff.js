/**
 * 텍스트 비교 도구 - ToolBase 기반
 * 두 텍스트의 차이점을 비교
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var TextDiff = class TextDiff extends ToolBase {
  constructor() {
    super('TextDiff');
  }

  init() {
    this.initElements({
      textOriginal: 'textOriginal',
      textModified: 'textModified',
      diffMode: 'diffMode',
      ignoreCase: 'ignoreCase',
      ignoreWhitespace: 'ignoreWhitespace',
      trimLines: 'trimLines',
      diffResult: 'diffResult',
      statAdded: 'statAdded',
      statRemoved: 'statRemoved',
      statUnchanged: 'statUnchanged',
      statSimilarity: 'statSimilarity'
    });

    console.log('[TextDiff] 초기화 완료');
    return this;
  }

  loadFile(input, targetId) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      document.getElementById(targetId).value = e.target.result;
    };
    reader.readAsText(file);
  }

  async paste(targetId) {
    try {
      const text = await navigator.clipboard.readText();
      document.getElementById(targetId).value = text;
      this.showToast('붙여넣기 완료!', 'success');
    } catch (error) {
      this.showToast('클립보드 접근 권한이 필요합니다.', 'error');
    }
  }

  swap() {
    const original = this.elements.textOriginal;
    const modified = this.elements.textModified;
    const temp = original.value;
    original.value = modified.value;
    modified.value = temp;
    this.showToast('텍스트가 교환되었습니다.', 'success');
  }

  compare() {
    let original = this.elements.textOriginal.value;
    let modified = this.elements.textModified.value;

    if (!original && !modified) {
      this.showToast('비교할 텍스트를 입력하세요.', 'warning');
      return;
    }

    const mode = this.elements.diffMode.value;
    const ignoreCase = this.elements.ignoreCase.checked;
    const ignoreWhitespace = this.elements.ignoreWhitespace.checked;
    const trimLines = this.elements.trimLines.checked;

    if (ignoreCase) {
      original = original.toLowerCase();
      modified = modified.toLowerCase();
    }

    if (trimLines) {
      original = original.split('\n').map(l => l.trimEnd()).join('\n');
      modified = modified.split('\n').map(l => l.trimEnd()).join('\n');
    }

    let result;
    switch (mode) {
      case 'line':
        result = this.diffLines(original, modified, ignoreWhitespace);
        break;
      case 'word':
        result = this.diffWords(original, modified, ignoreWhitespace);
        break;
      case 'char':
        result = this.diffChars(original, modified, ignoreWhitespace);
        break;
    }

    this.renderResult(result, mode);
    this.updateStats(result);
  }

  diffLines(original, modified, ignoreWhitespace) {
    let lines1 = original.split('\n');
    let lines2 = modified.split('\n');

    if (ignoreWhitespace) {
      lines1 = lines1.map(l => l.replace(/\s+/g, ' ').trim());
      lines2 = lines2.map(l => l.replace(/\s+/g, ' ').trim());
    }

    return this.computeDiff(lines1, lines2);
  }

  diffWords(original, modified, ignoreWhitespace) {
    let words1 = original.split(/(\s+)/);
    let words2 = modified.split(/(\s+)/);

    if (ignoreWhitespace) {
      words1 = original.split(/\s+/).filter(w => w);
      words2 = modified.split(/\s+/).filter(w => w);
    }

    return this.computeDiff(words1, words2);
  }

  diffChars(original, modified, ignoreWhitespace) {
    let chars1 = original.split('');
    let chars2 = modified.split('');

    if (ignoreWhitespace) {
      chars1 = original.replace(/\s/g, '').split('');
      chars2 = modified.replace(/\s/g, '').split('');
    }

    return this.computeDiff(chars1, chars2);
  }

  computeDiff(arr1, arr2) {
    const m = arr1.length;
    const n = arr2.length;

    const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (arr1[i - 1] === arr2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }

    const result = [];
    let i = m, j = n;

    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && arr1[i - 1] === arr2[j - 1]) {
        result.unshift({ type: 'unchanged', value: arr1[i - 1] });
        i--;
        j--;
      } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
        result.unshift({ type: 'added', value: arr2[j - 1] });
        j--;
      } else {
        result.unshift({ type: 'removed', value: arr1[i - 1] });
        i--;
      }
    }

    return result;
  }

  renderResult(diff, mode) {
    const container = this.elements.diffResult;

    if (mode === 'line') {
      container.innerHTML = diff.map(item => {
        const escapedValue = this.escapeHtml(item.value);
        const prefix = item.type === 'added' ? '+' : item.type === 'removed' ? '-' : ' ';
        return `<span class="diff-line diff-${item.type}">${prefix} ${escapedValue}</span>`;
      }).join('');
    } else {
      container.innerHTML = diff.map(item => {
        const escapedValue = this.escapeHtml(item.value);
        if (item.type === 'unchanged') {
          return escapedValue;
        }
        return `<span class="inline-${item.type}">${escapedValue}</span>`;
      }).join('');
    }
  }

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  updateStats(diff) {
    const added = diff.filter(d => d.type === 'added').length;
    const removed = diff.filter(d => d.type === 'removed').length;
    const unchanged = diff.filter(d => d.type === 'unchanged').length;
    const total = diff.length;
    const similarity = total > 0 ? Math.round((unchanged / total) * 100) : 100;

    this.elements.statAdded.textContent = added;
    this.elements.statAdded.style.color = added > 0 ? 'var(--tools-success)' : 'inherit';

    this.elements.statRemoved.textContent = removed;
    this.elements.statRemoved.style.color = removed > 0 ? 'var(--tools-error)' : 'inherit';

    this.elements.statUnchanged.textContent = unchanged;
    this.elements.statSimilarity.textContent = similarity + '%';
  }

  clear() {
    this.elements.textOriginal.value = '';
    this.elements.textModified.value = '';
    this.elements.diffResult.innerHTML =
      '<span style="color: var(--tools-text-secondary);">두 텍스트를 입력하고 비교하기 버튼을 클릭하세요.</span>';
    this.elements.statAdded.textContent = '0';
    this.elements.statRemoved.textContent = '0';
    this.elements.statUnchanged.textContent = '0';
    this.elements.statSimilarity.textContent = '-';
  }
}

// 전역 인스턴스 생성
const textDiff = new TextDiff();
window.TextDiff = textDiff;

document.addEventListener('DOMContentLoaded', () => textDiff.init());
