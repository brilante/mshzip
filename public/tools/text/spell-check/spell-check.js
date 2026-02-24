/**
 * 맞춤법 검사 - ToolBase 기반
 * 한글 맞춤법 및 띄어쓰기 검사
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var SpellCheck = class SpellCheck extends ToolBase {
  constructor() {
    super('SpellCheck');
    this.errors = [];

    // 자주 틀리는 맞춤법 사전
    this.dictionary = [
      { wrong: '되요', correct: '돼요', desc: '"되어요"의 준말' },
      { wrong: '됬', correct: '됐', desc: '"되었"의 준말' },
      { wrong: '안되', correct: '안 돼', desc: '"안"과 "되다" 띄어쓰기' },
      { wrong: '왠지', correct: '웬지', desc: '"웬일인지"의 준말 (이유 불명)' },
      { wrong: '어의없', correct: '어이없', desc: '"어이"가 맞는 표현' },
      { wrong: '몇일', correct: '며칠', desc: '"몇"+"일"이 아님' },
      { wrong: '금새', correct: '금세', desc: '"금시에"의 준말' },
      { wrong: '희안', correct: '희한', desc: '"稀罕"에서 유래' },
      { wrong: '오랫만', correct: '오랜만', desc: '"오래간만"의 준말' },
      { wrong: '어떻게 해', correct: '어떡해', desc: '"어떻게 해"의 준말' },
      { wrong: '문안하다', correct: '무난하다', desc: '"無難"에서 유래' },
      { wrong: '설겆이', correct: '설거지', desc: '표준어' },
      { wrong: '의존율', correct: '의존률', desc: '-률이 맞는 표기' },
      { wrong: '구지', correct: '굳이', desc: '"굳다"에서 파생' },
      { wrong: '담달', correct: '다음 달', desc: '띄어쓰기 필요' },
      { wrong: '낼모래', correct: '내일모레', desc: '띄어쓰기 불필요' },
      { wrong: '웬만하면', correct: '왠만하면', desc: '이유가 있으면 "왠"' },
      { wrong: '할께', correct: '할게', desc: 'ㄹ 뒤 "게"는 된소리 안 됨' },
      { wrong: '할꺼야', correct: '할 거야', desc: '띄어쓰기 및 표기' },
      { wrong: '뵈요', correct: '봬요', desc: '"뵈어요"의 준말' }
    ];
  }

  init() {
    this.initElements({
      textInput: 'textInput',
      errorBadge: 'errorBadge',
      errorList: 'errorList'
    });

    console.log('[SpellCheck] 초기화 완료');
    return this;
  }

  check() {
    const text = this.elements.textInput.value;

    if (!text.trim()) {
      this.showToast('검사할 텍스트를 입력하세요.', 'warning');
      return;
    }

    this.errors = [];

    // 사전 기반 검사
    this.dictionary.forEach(item => {
      let idx = 0;
      while ((idx = text.indexOf(item.wrong, idx)) !== -1) {
        const start = Math.max(0, idx - 10);
        const end = Math.min(text.length, idx + item.wrong.length + 10);
        const context = '...' + text.slice(start, end) + '...';

        this.errors.push({
          wrong: item.wrong,
          correct: item.correct,
          desc: item.desc,
          context: context,
          position: idx
        });
        idx += item.wrong.length;
      }
    });

    // 연속 공백 검사
    const spaceMatch = text.match(/\s{2,}/g);
    if (spaceMatch) {
      spaceMatch.forEach(match => {
        this.errors.push({
          wrong: '연속 공백',
          correct: '단일 공백',
          desc: '불필요한 공백 제거',
          context: '',
          position: text.indexOf(match)
        });
      });
    }

    this.displayResults();
  }

  displayResults() {
    const count = this.errors.length;

    this.elements.errorBadge.textContent = `오류 ${count}개`;
    this.elements.errorBadge.className = 'stat-badge ' + (count > 0 ? 'error' : 'success');

    if (count === 0) {
      this.elements.errorList.innerHTML = `
        <div style="color: var(--text-secondary); text-align: center; padding: 2rem;">
          맞춤법 오류가 없습니다!
        </div>
      `;
      return;
    }

    this.elements.errorList.innerHTML = this.errors.map((err, idx) => `
      <div class="error-item" onclick="spellCheck.applySingle(${idx})">
        <div>
          <span class="error-wrong">${err.wrong}</span>
          →
          <span class="error-correct">${err.correct}</span>
        </div>
        <div class="error-context">${err.desc}</div>
      </div>
    `).join('');
  }

  applySingle(idx) {
    const err = this.errors[idx];
    if (!err) return;

    let text = this.elements.textInput.value;

    if (err.wrong === '연속 공백') {
      text = text.replace(/\s{2,}/g, ' ');
    } else {
      text = text.replace(err.wrong, err.correct);
    }

    this.elements.textInput.value = text;
    this.check();
    this.showSuccess('수정됨!');
  }

  applyAll() {
    if (this.errors.length === 0) {
      this.showToast('수정할 오류가 없습니다.', 'info');
      return;
    }

    let text = this.elements.textInput.value;

    // 연속 공백 먼저 처리
    text = text.replace(/\s{2,}/g, ' ');

    // 사전 기반 수정
    this.dictionary.forEach(item => {
      text = text.split(item.wrong).join(item.correct);
    });

    this.elements.textInput.value = text;
    this.check();
    this.showSuccess('모든 오류 수정 완료!');
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const spellCheck = new SpellCheck();
window.SpellCheck = spellCheck;

document.addEventListener('DOMContentLoaded', () => spellCheck.init());
