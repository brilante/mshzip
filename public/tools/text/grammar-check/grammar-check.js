/**
 * 문법 검사 - ToolBase 기반
 * AI 기반 문법 및 맞춤법 검사 (프리미엄)
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var GrammarCheck = class GrammarCheck extends ToolBase {
  constructor() {
    super('GrammarCheck');
    this.issues = [];
  }

  init() {
    this.initElements({
      textInput: 'textInput',
      errorCount: 'errorCount',
      warningCount: 'warningCount',
      suggestionCount: 'suggestionCount',
      issueList: 'issueList'
    });

    console.log('[GrammarCheck] 초기화 완료');
    return this;
  }

  async check() {
    const text = this.elements.textInput.value.trim();

    if (!text) {
      this.showToast('검사할 텍스트를 입력하세요.', 'warning');
      return;
    }

    // 프리미엄 기능 - 데모용 로컬 검사
    this.issues = this.localCheck(text);
    this.displayResults();
  }

  // 데모용 로컬 기본 검사
  localCheck(text) {
    const issues = [];
    const sentences = text.split(/[.!?]+/).filter(s => s.trim());

    // 1. 중복 단어 검사
    const duplicatePattern = /\b(\w+)\s+\1\b/gi;
    let match;
    while ((match = duplicatePattern.exec(text)) !== null) {
      issues.push({
        type: 'error',
        text: `중복 단어: "${match[1]} ${match[1]}"`,
        suggestion: `"${match[1]}"로 수정하세요.`
      });
    }

    // 2. 띄어쓰기 오류 (한글)
    const spacingPatterns = [
      { pattern: /([가-힣])([0-9])/g, msg: '숫자 앞 띄어쓰기' },
      { pattern: /([0-9])([가-힣])/g, msg: '숫자 뒤 띄어쓰기' }
    ];
    spacingPatterns.forEach(({ pattern, msg }) => {
      if (pattern.test(text)) {
        issues.push({
          type: 'warning',
          text: msg,
          suggestion: '숫자와 한글 사이에 띄어쓰기를 추가하세요.'
        });
      }
    });

    // 3. 문장 시작 대문자 (영어)
    sentences.forEach((sentence, idx) => {
      const trimmed = sentence.trim();
      if (trimmed && /^[a-z]/.test(trimmed)) {
        issues.push({
          type: 'warning',
          text: `문장 ${idx + 1}: 소문자로 시작`,
          suggestion: '문장은 대문자로 시작하세요.'
        });
      }
    });

    // 4. 연속 공백
    if (/\s{3,}/.test(text)) {
      issues.push({
        type: 'suggestion',
        text: '연속된 공백이 있습니다.',
        suggestion: '불필요한 공백을 제거하세요.'
      });
    }

    // 5. 마침표 누락
    const lastChar = text.trim().slice(-1);
    if (lastChar && !/[.!?]/.test(lastChar) && text.length > 20) {
      issues.push({
        type: 'suggestion',
        text: '문장 끝에 마침표가 없습니다.',
        suggestion: '마침표, 물음표 또는 느낌표로 문장을 마무리하세요.'
      });
    }

    // 6. 자주 틀리는 맞춤법 (한글)
    const commonErrors = [
      { wrong: '되요', correct: '돼요' },
      { wrong: '됬', correct: '됐' },
      { wrong: '안되', correct: '안 돼' },
      { wrong: '왠지', correct: '왠지/웬지 확인 필요' },
      { wrong: '어의없', correct: '어이없' },
      { wrong: '몇일', correct: '며칠' }
    ];
    commonErrors.forEach(({ wrong, correct }) => {
      if (text.includes(wrong)) {
        issues.push({
          type: 'error',
          text: `맞춤법 오류: "${wrong}"`,
          suggestion: `"${correct}"(으)로 수정하세요.`
        });
      }
    });

    return issues;
  }

  displayResults() {
    const errors = this.issues.filter(i => i.type === 'error').length;
    const warnings = this.issues.filter(i => i.type === 'warning').length;
    const suggestions = this.issues.filter(i => i.type === 'suggestion').length;

    this.elements.errorCount.textContent = errors;
    this.elements.warningCount.textContent = warnings;
    this.elements.suggestionCount.textContent = suggestions;

    if (this.issues.length === 0) {
      this.elements.issueList.innerHTML = `
        <div style="color: var(--text-secondary); text-align: center; padding: 2rem;">
          문제가 발견되지 않았습니다!
        </div>
      `;
      return;
    }

    this.elements.issueList.innerHTML = this.issues.map(issue => `
      <div class="issue-item ${issue.type}">
        <div class="issue-type" style="color: ${this.getTypeColor(issue.type)}">${this.getTypeLabel(issue.type)}</div>
        <div class="issue-text">${issue.text}</div>
        <div class="issue-suggestion">${issue.suggestion}</div>
      </div>
    `).join('');
  }

  getTypeColor(type) {
    return { error: '#ef4444', warning: '#f59e0b', suggestion: '#3b82f6' }[type];
  }

  getTypeLabel(type) {
    return { error: '오류', warning: '경고', suggestion: '제안' }[type];
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const grammarCheck = new GrammarCheck();
window.GrammarCheck = grammarCheck;

document.addEventListener('DOMContentLoaded', () => grammarCheck.init());
