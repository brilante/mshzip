/**
 * 면접 준비 도구 - ToolBase 기반
 * 예상 질문 및 연습
 * @created 2026-01-13
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var InterviewPrep = class InterviewPrep extends ToolBase {
  constructor() {
    super('InterviewPrep');
    this.category = 'all';
    this.timerInterval = null;
    this.seconds = 0;
    this.currentQuestion = '';
    this.savedAnswers = {};
    this.questions = [
      // 공통 질문
      { text: '자기소개를 해주세요.', category: 'common', tip: '1-2분 내로 경력 하이라이트와 지원 동기를 포함해 답변하세요.' },
      { text: '왜 우리 회사에 지원했나요?', category: 'common', tip: '회사에 대한 리서치를 기반으로 구체적인 이유를 말씀하세요.' },
      { text: '5년 후 자신의 모습은 어떨 것 같나요?', category: 'common', tip: '회사 내 성장과 연결지어 현실적인 목표를 제시하세요.' },
      { text: '자신의 강점과 약점은 무엇인가요?', category: 'common', tip: '약점은 개선 노력과 함께 언급하세요.' },
      { text: '이 직무에 왜 적합하다고 생각하나요?', category: 'common', tip: '직무 요구사항과 자신의 역량을 매칭해서 설명하세요.' },

      // 행동 기반 질문
      { text: '어려운 프로젝트를 성공적으로 완료한 경험을 말씀해주세요.', category: 'behavioral', tip: 'STAR 기법(Situation, Task, Action, Result)을 사용하세요.' },
      { text: '팀원과 갈등이 있었던 경험과 해결 방법을 설명해주세요.', category: 'behavioral', tip: '갈등 해결 과정과 배운 점을 강조하세요.' },
      { text: '실패한 경험과 그로부터 배운 점은?', category: 'behavioral', tip: '실패를 인정하되, 성장으로 연결하세요.' },
      { text: '리더십을 발휘한 경험이 있나요?', category: 'behavioral', tip: '공식적/비공식적 리더십 모두 가능합니다.' },
      { text: '촉박한 마감 기한을 맞춘 경험을 말씀해주세요.', category: 'behavioral', tip: '시간 관리와 우선순위 설정 능력을 보여주세요.' },

      // 상황 기반 질문
      { text: '상사와 의견이 다를 때 어떻게 하시겠습니까?', category: 'situational', tip: '존중하면서도 자신의 의견을 표현하는 방법을 말씀하세요.' },
      { text: '여러 프로젝트가 동시에 진행된다면 어떻게 우선순위를 정하시겠습니까?', category: 'situational', tip: '체계적인 접근 방식을 설명하세요.' },
      { text: '고객이 불만을 제기한다면 어떻게 대응하시겠습니까?', category: 'situational', tip: '경청, 공감, 해결의 단계를 설명하세요.' },
      { text: '모르는 기술을 사용해야 한다면?', category: 'situational', tip: '학습 능력과 적극성을 강조하세요.' },

      // 기술 질문
      { text: '최근 관심 있는 기술 트렌드가 있나요?', category: 'technical', tip: '실제로 학습하거나 적용한 경험과 연결하세요.' },
      { text: '이 기술을 선택한 이유는?', category: 'technical', tip: '장단점을 비교하며 논리적으로 설명하세요.' },
      { text: '코드 리뷰 시 중요하게 보는 점은?', category: 'technical', tip: '가독성, 성능, 보안 등 구체적 기준을 말씀하세요.' },
      { text: '가장 도전적이었던 기술적 문제와 해결 방법은?', category: 'technical', tip: '문제 해결 과정을 단계별로 설명하세요.' },

      // 마무리 질문
      { text: '궁금한 점이 있으신가요?', category: 'closing', tip: '회사 문화, 팀 구조, 성장 기회 등에 대해 질문하세요.' },
      { text: '연봉 희망 수준은?', category: 'closing', tip: '시장 조사를 기반으로 범위로 답변하세요.' },
      { text: '입사 가능 시기는 언제인가요?', category: 'closing', tip: '현실적인 시기를 말씀하세요.' }
    ];
  }

  init() {
    this.initElements({
      questionList: 'questionList',
      practiceQuestion: 'practiceQuestion',
      timerDisplay: 'timerDisplay',
      savedAnswers: 'savedAnswers'
    });

    this.loadSavedAnswers();
    this.renderQuestions();
    this.renderSavedAnswers();

    console.log('[InterviewPrep] 초기화 완료');
    return this;
  }

  loadSavedAnswers() {
    try {
      const saved = localStorage.getItem('interviewPrepAnswers');
      if (saved) {
        this.savedAnswers = JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load answers:', e);
    }
  }

  saveSavedAnswers() {
    try {
      localStorage.setItem('interviewPrepAnswers', JSON.stringify(this.savedAnswers));
    } catch (e) {
      console.error('Failed to save answers:', e);
    }
  }

  setCategory(category) {
    this.category = category;
    document.querySelectorAll('.category-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.cat === category);
    });
    this.renderQuestions();
  }

  shuffleQuestions() {
    this.questions.sort(() => Math.random() - 0.5);
    this.renderQuestions();
    this.showToast('질문이 섞였습니다.', 'info');
  }

  getFilteredQuestions() {
    if (this.category === 'all') return this.questions;
    return this.questions.filter(q => q.category === this.category);
  }

  renderQuestions() {
    const container = this.elements.questionList;
    const filtered = this.getFilteredQuestions();

    const categoryLabels = {
      common: '공통',
      behavioral: '행동',
      situational: '상황',
      technical: '기술',
      closing: '마무리'
    };

    container.innerHTML = filtered.map((q, index) => {
      const savedAnswer = this.savedAnswers[q.text] || '';
      return `
        <div class="question-card">
          <div class="question-header">
            <span class="question-text">${index + 1}. ${q.text}</span>
            <span class="question-category">${categoryLabels[q.category]}</span>
          </div>
          <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">
            <button class="tool-btn tool-btn-secondary" onclick="interviewPrep.toggleTips(${index})" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">팁</button>
            <button class="tool-btn tool-btn-secondary" onclick="interviewPrep.selectForPractice('${q.text.replace(/'/g, "\\'")}')" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">연습</button>
          </div>
          <div class="question-tips" id="tips-${index}">${q.tip}</div>
          <textarea class="tool-input answer-textarea" rows="2" placeholder="답변을 작성해보세요..." onchange="interviewPrep.saveAnswer('${q.text.replace(/'/g, "\\'")}', this.value)">${savedAnswer}</textarea>
        </div>
      `;
    }).join('');
  }

  toggleTips(index) {
    const tips = document.getElementById(`tips-${index}`);
    tips.classList.toggle('show');
  }

  selectForPractice(question) {
    this.currentQuestion = question;
    this.elements.practiceQuestion.textContent = question;
    this.resetTimer();
  }

  startTimer() {
    if (this.timerInterval) return;
    this.timerInterval = setInterval(() => {
      this.seconds++;
      this.updateTimerDisplay();
    }, 1000);
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  resetTimer() {
    this.stopTimer();
    this.seconds = 0;
    this.updateTimerDisplay();
  }

  updateTimerDisplay() {
    const mins = Math.floor(this.seconds / 60);
    const secs = this.seconds % 60;
    this.elements.timerDisplay.textContent =
      `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  saveAnswer(question, answer) {
    this.savedAnswers[question] = answer;
    this.saveSavedAnswers();
    this.renderSavedAnswers();
  }

  renderSavedAnswers() {
    const container = this.elements.savedAnswers;
    const answered = Object.entries(this.savedAnswers).filter(([_, v]) => v.trim());

    if (answered.length === 0) {
      container.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 1rem;">저장된 답변이 없습니다</div>';
      return;
    }

    container.innerHTML = answered.map(([q, a]) => `
      <div class="saved-answer" onclick="interviewPrep.selectForPractice('${q.replace(/'/g, "\\'")}')">
        <strong>${q.substring(0, 40)}...</strong>
        <div style="font-size: 0.75rem; color: var(--text-secondary);">${a.substring(0, 50)}...</div>
      </div>
    `).join('');
  }

  destroy() {
    this.stopTimer();
    super.destroy();
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const interviewPrep = new InterviewPrep();
window.InterviewPrep = interviewPrep;

document.addEventListener('DOMContentLoaded', () => interviewPrep.init());
