/**
 * 코드 비교 도구 - ToolBase 기반
 * 두 텍스트/코드 간 차이점 비교
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var DiffChecker = class DiffChecker extends ToolBase {
  constructor() {
    super('DiffChecker');
  }

  init() {
    this.initElements({
      originalInput: 'originalInput',
      modifiedInput: 'modifiedInput',
      ignoreWhitespace: 'ignoreWhitespace',
      ignoreCase: 'ignoreCase',
      diffMode: 'diffMode',
      diffResult: 'diffResult',
      addedCount: 'addedCount',
      removedCount: 'removedCount',
      unchangedCount: 'unchangedCount'
    });

    console.log('[DiffChecker] 초기화 완료');
    return this;
  }

  loadFile(input, target) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const targetId = target === 'original' ? 'originalInput' : 'modifiedInput';
      document.getElementById(targetId).value = e.target.result;
    };
    reader.readAsText(file);
  }

  async paste(target) {
    try {
      const text = await navigator.clipboard.readText();
      const targetId = target === 'original' ? 'originalInput' : 'modifiedInput';
      document.getElementById(targetId).value = text;
      this.showSuccess('붙여넣기 완료!');
    } catch (error) {
      this.showError('클립보드 접근 실패');
    }
  }

  swap() {
    const original = this.elements.originalInput.value;
    const modified = this.elements.modifiedInput.value;
    this.elements.originalInput.value = modified;
    this.elements.modifiedInput.value = original;
    this.showSuccess('입력이 교체되었습니다.');
  }

  compare() {
    const original = this.elements.originalInput.value;
    const modified = this.elements.modifiedInput.value;

    if (!original && !modified) {
      this.showToast('비교할 텍스트를 입력하세요.', 'warning');
      return;
    }

    const ignoreWhitespace = this.elements.ignoreWhitespace.checked;
    const ignoreCase = this.elements.ignoreCase.checked;
    const mode = this.elements.diffMode.value;

    let originalText = original;
    let modifiedText = modified;

    if (ignoreWhitespace) {
      originalText = originalText.replace(/\s+/g, ' ').trim();
      modifiedText = modifiedText.replace(/\s+/g, ' ').trim();
    }

    if (ignoreCase) {
      originalText = originalText.toLowerCase();
      modifiedText = modifiedText.toLowerCase();
    }

    let result;
    switch (mode) {
      case 'word':
        result = this.diffWords(originalText, modifiedText);
        break;
      case 'char':
        result = this.diffChars(originalText, modifiedText);
        break;
      default:
        result = this.diffLines(original, modified, ignoreWhitespace, ignoreCase);
    }

    this.renderResult(result, mode);
    this.showSuccess('비교 완료!');
  }

  diffLines(original, modified, ignoreWhitespace, ignoreCase) {
    const originalLines = original.split('\n');
    const modifiedLines = modified.split('\n');

    const normalize = (line) => {
      let l = line;
      if (ignoreWhitespace) l = l.replace(/\s+/g, ' ').trim();
      if (ignoreCase) l = l.toLowerCase();
      return l;
    };

    const lcs = this.computeLCS(
      originalLines.map(normalize),
      modifiedLines.map(normalize)
    );

    const result = [];
    let i = 0, j = 0, k = 0;

    while (i < originalLines.length || j < modifiedLines.length) {
      if (k < lcs.length && i < originalLines.length && j < modifiedLines.length &&
          normalize(originalLines[i]) === lcs[k] && normalize(modifiedLines[j]) === lcs[k]) {
        result.push({ type: 'unchanged', content: originalLines[i], lineNum: i + 1 });
        i++; j++; k++;
      } else if (j < modifiedLines.length &&
                (k >= lcs.length || normalize(modifiedLines[j]) !== lcs[k])) {
        result.push({ type: 'added', content: modifiedLines[j], lineNum: j + 1 });
        j++;
      } else if (i < originalLines.length &&
                (k >= lcs.length || normalize(originalLines[i]) !== lcs[k])) {
        result.push({ type: 'removed', content: originalLines[i], lineNum: i + 1 });
        i++;
      }
    }

    return result;
  }

  computeLCS(arr1, arr2) {
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

    const lcs = [];
    let i = m, j = n;
    while (i > 0 && j > 0) {
      if (arr1[i - 1] === arr2[j - 1]) {
        lcs.unshift(arr1[i - 1]);
        i--; j--;
      } else if (dp[i - 1][j] > dp[i][j - 1]) {
        i--;
      } else {
        j--;
      }
    }

    return lcs;
  }

  diffWords(original, modified) {
    const originalWords = original.split(/\s+/).filter(w => w);
    const modifiedWords = modified.split(/\s+/).filter(w => w);

    const lcs = this.computeLCS(originalWords, modifiedWords);
    const result = [];

    let i = 0, j = 0, k = 0;

    while (i < originalWords.length || j < modifiedWords.length) {
      if (k < lcs.length && i < originalWords.length && j < modifiedWords.length &&
          originalWords[i] === lcs[k] && modifiedWords[j] === lcs[k]) {
        result.push({ type: 'unchanged', content: originalWords[i] });
        i++; j++; k++;
      } else if (j < modifiedWords.length &&
                (k >= lcs.length || modifiedWords[j] !== lcs[k])) {
        result.push({ type: 'added', content: modifiedWords[j] });
        j++;
      } else if (i < originalWords.length &&
                (k >= lcs.length || originalWords[i] !== lcs[k])) {
        result.push({ type: 'removed', content: originalWords[i] });
        i++;
      }
    }

    return result;
  }

  diffChars(original, modified) {
    const originalChars = original.split('');
    const modifiedChars = modified.split('');

    const lcs = this.computeLCS(originalChars, modifiedChars);
    const result = [];

    let i = 0, j = 0, k = 0;

    while (i < originalChars.length || j < modifiedChars.length) {
      if (k < lcs.length && i < originalChars.length && j < modifiedChars.length &&
          originalChars[i] === lcs[k] && modifiedChars[j] === lcs[k]) {
        result.push({ type: 'unchanged', content: originalChars[i] });
        i++; j++; k++;
      } else if (j < modifiedChars.length &&
                (k >= lcs.length || modifiedChars[j] !== lcs[k])) {
        result.push({ type: 'added', content: modifiedChars[j] });
        j++;
      } else if (i < originalChars.length &&
                (k >= lcs.length || originalChars[i] !== lcs[k])) {
        result.push({ type: 'removed', content: originalChars[i] });
        i++;
      }
    }

    return result;
  }

  renderResult(result, mode) {
    const container = this.elements.diffResult;
    let added = 0, removed = 0, unchanged = 0;

    if (mode === 'line') {
      container.innerHTML = result.map(item => {
        if (item.type === 'added') added++;
        else if (item.type === 'removed') removed++;
        else unchanged++;

        const prefix = item.type === 'added' ? '+' : (item.type === 'removed' ? '-' : ' ');
        const prefixClass = item.type;

        return `<div class="diff-line ${item.type}">` +
          `<span class="diff-line-number">${item.lineNum || ''}</span>` +
          `<span class="diff-prefix ${prefixClass}">${prefix}</span>` +
          `${this.escapeHtml(item.content)}` +
          `</div>`;
      }).join('');
    } else {
      let html = '<div class="diff-inline">';
      result.forEach(item => {
        if (item.type === 'added') added++;
        else if (item.type === 'removed') removed++;
        else unchanged++;

        if (item.type === 'unchanged') {
          html += this.escapeHtml(item.content);
        } else {
          html += `<span class="diff-word ${item.type}">${this.escapeHtml(item.content)}</span>`;
        }

        if (mode === 'word') html += ' ';
      });
      html += '</div>';
      container.innerHTML = html;
    }

    this.elements.addedCount.textContent = added;
    this.elements.removedCount.textContent = removed;
    this.elements.unchangedCount.textContent = unchanged;
  }

  escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  async copyResult() {
    const result = this.elements.diffResult.innerText;
    if (!result) {
      this.showToast('복사할 결과가 없습니다.', 'warning');
      return;
    }

    await navigator.clipboard.writeText(result);
    this.showSuccess('결과가 복사되었습니다!');
  }

  clear() {
    this.elements.originalInput.value = '';
    this.elements.modifiedInput.value = '';
    this.elements.diffResult.innerHTML = '';
    this.elements.addedCount.textContent = '0';
    this.elements.removedCount.textContent = '0';
    this.elements.unchangedCount.textContent = '0';
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const diffChecker = new DiffChecker();
window.DiffChecker = diffChecker;

document.addEventListener('DOMContentLoaded', () => diffChecker.init());
