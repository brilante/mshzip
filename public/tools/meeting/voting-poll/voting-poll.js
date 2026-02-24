/**
 * 투표/설문 도구 - ToolBase 기반
 * 실시간 의견 수렴
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var VotingPoll = class VotingPoll extends ToolBase {
  constructor() {
    super('VotingPoll');
    this.poll = null;
    this.showResults = false;
    this.selectedOptions = new Set();

    this.templates = {
      yesno: {
        question: '동의하십니까?',
        options: ['예', '아니오']
      },
      satisfaction: {
        question: '만족도를 선택해주세요',
        options: ['매우 만족', '만족', '보통', '불만족', '매우 불만족']
      },
      priority: {
        question: '우선순위를 선택해주세요',
        options: ['상 (높음)', '중 (보통)', '하 (낮음)']
      },
      agreement: {
        question: '동의 수준을 선택해주세요',
        options: ['강력히 동의', '동의', '중립', '반대', '강력히 반대']
      },
      time: {
        question: '선호하는 시간을 선택해주세요',
        options: ['오전 9-10시', '오전 10-11시', '오후 2-3시', '오후 3-4시', '오후 4-5시']
      }
    };
  }

  init() {
    this.initElements({
      pollQuestion: 'pollQuestion',
      optionsList: 'optionsList',
      multipleChoice: 'multipleChoice',
      anonymousVote: 'anonymousVote',
      createSection: 'createSection',
      pollSection: 'pollSection',
      pollQuestionDisplay: 'pollQuestionDisplay',
      pollOptions: 'pollOptions',
      voteCount: 'voteCount'
    });

    this.updateRemoveButtons();

    console.log('[VotingPoll] 초기화 완료');
    return this;
  }

  addOption() {
    const count = this.elements.optionsList.children.length + 1;

    const div = document.createElement('div');
    div.className = 'option-input';
    div.innerHTML = `
      <input type="text" class="form-input option-field" placeholder="선택지 ${count}">
      <button class="remove-btn" onclick="votingPoll.removeOption(this)"></button>
    `;
    this.elements.optionsList.appendChild(div);
    this.updateRemoveButtons();
  }

  removeOption(btn) {
    btn.parentElement.remove();
    this.updateRemoveButtons();
  }

  updateRemoveButtons() {
    const inputs = document.querySelectorAll('.option-input');
    inputs.forEach((input, i) => {
      const btn = input.querySelector('.remove-btn');
      btn.style.display = inputs.length > 2 ? 'block' : 'none';
      input.querySelector('.option-field').placeholder = `선택지 ${i + 1}`;
    });
  }

  useTemplate(templateId) {
    const template = this.templates[templateId];
    if (!template) return;

    this.elements.pollQuestion.value = template.question;

    this.elements.optionsList.innerHTML = '';

    template.options.forEach((opt, i) => {
      const div = document.createElement('div');
      div.className = 'option-input';
      div.innerHTML = `
        <input type="text" class="form-input option-field" value="${opt}" placeholder="선택지 ${i + 1}">
        <button class="remove-btn" onclick="votingPoll.removeOption(this)" style="display:${template.options.length > 2 ? 'block' : 'none'}"></button>
      `;
      this.elements.optionsList.appendChild(div);
    });
  }

  createPoll() {
    const question = this.elements.pollQuestion.value.trim();
    if (!question) {
      this.showToast('질문을 입력해주세요.', 'error');
      return;
    }

    const optionInputs = document.querySelectorAll('.option-field');
    const options = [];

    optionInputs.forEach(input => {
      const text = input.value.trim();
      if (text) {
        options.push({
          text,
          votes: 0
        });
      }
    });

    if (options.length < 2) {
      this.showToast('최소 2개의 선택지가 필요합니다.', 'error');
      return;
    }

    this.poll = {
      question,
      options,
      multipleChoice: this.elements.multipleChoice.checked,
      anonymous: this.elements.anonymousVote.checked,
      createdAt: new Date().toISOString(),
      totalVotes: 0
    };

    this.selectedOptions.clear();
    this.showResults = false;

    this.elements.createSection.style.display = 'none';
    this.elements.pollSection.style.display = 'block';

    this.renderPoll();
  }

  renderPoll() {
    this.elements.pollQuestionDisplay.textContent = this.poll.question;
    this.elements.voteCount.textContent = this.poll.totalVotes;

    this.elements.pollOptions.className = `poll-options ${this.showResults ? 'show-results' : ''}`;

    this.elements.pollOptions.innerHTML = this.poll.options.map((opt, i) => {
      const percent = this.poll.totalVotes > 0
        ? Math.round((opt.votes / this.poll.totalVotes) * 100)
        : 0;
      const isSelected = this.selectedOptions.has(i);

      return `
        <div class="poll-option ${isSelected ? 'selected' : ''}" onclick="votingPoll.vote(${i})">
          <div class="option-bar" style="width: ${this.showResults ? percent : 0}%"></div>
          <div class="option-content">
            <span class="option-text">
              <span class="option-check"></span>
              ${this.escapeHtml(opt.text)}
            </span>
            <div class="option-stats">
              <span class="option-percent">${percent}%</span>
              <span class="option-votes">(${opt.votes}표)</span>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  vote(index) {
    if (!this.poll.multipleChoice) {
      // 단일 선택
      if (this.selectedOptions.has(index)) {
        // 선택 해제
        this.poll.options[index].votes--;
        this.poll.totalVotes--;
        this.selectedOptions.delete(index);
      } else {
        // 기존 선택 해제
        this.selectedOptions.forEach(i => {
          this.poll.options[i].votes--;
          this.poll.totalVotes--;
        });
        this.selectedOptions.clear();

        // 새로운 선택
        this.poll.options[index].votes++;
        this.poll.totalVotes++;
        this.selectedOptions.add(index);
      }
    } else {
      // 복수 선택
      if (this.selectedOptions.has(index)) {
        this.poll.options[index].votes--;
        this.poll.totalVotes--;
        this.selectedOptions.delete(index);
      } else {
        this.poll.options[index].votes++;
        this.poll.totalVotes++;
        this.selectedOptions.add(index);
      }
    }

    this.renderPoll();
  }

  toggleResults() {
    this.showResults = !this.showResults;
    this.renderPoll();
  }

  resetPoll() {
    if (!confirm('모든 투표를 초기화하시겠습니까?')) return;

    this.poll.options.forEach(opt => {
      opt.votes = 0;
    });
    this.poll.totalVotes = 0;
    this.selectedOptions.clear();
    this.renderPoll();
  }

  newPoll() {
    this.elements.createSection.style.display = 'block';
    this.elements.pollSection.style.display = 'none';

    // 입력 초기화
    this.elements.pollQuestion.value = '';
    this.elements.optionsList.innerHTML = `
      <div class="option-input">
        <input type="text" class="form-input option-field" placeholder="선택지 1">
        <button class="remove-btn" onclick="votingPoll.removeOption(this)" style="display:none"></button>
      </div>
      <div class="option-input">
        <input type="text" class="form-input option-field" placeholder="선택지 2">
        <button class="remove-btn" onclick="votingPoll.removeOption(this)" style="display:none"></button>
      </div>
    `;
  }

  escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}

// 전역 인스턴스 생성
const votingPoll = new VotingPoll();
window.VotingPoll = votingPoll;

// 전역 함수 (HTML onclick 호환)
function addOption() { votingPoll.addOption(); }
function useTemplate(templateId) { votingPoll.useTemplate(templateId); }
function createPoll() { votingPoll.createPoll(); }
function toggleResults() { votingPoll.toggleResults(); }
function resetPoll() { votingPoll.resetPoll(); }
function newPoll() { votingPoll.newPoll(); }

document.addEventListener('DOMContentLoaded', () => votingPoll.init());
