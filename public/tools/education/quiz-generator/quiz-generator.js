/**
 * 퀴즈 생성기 - ToolBase 기반
 * 퀴즈 생성 및 풀이
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class QuizGenerator extends ToolBase {
  constructor() {
    super('QuizGenerator');
    this.quizzes = [];
    this.currentQuiz = 0;
    this.answers = [];
    this.results = [];
  }

  init() {
    this.initElements({
      quizType: 'quizType',
      optionsContainer: 'optionsContainer',
      shortAnswerContainer: 'shortAnswerContainer',
      question: 'question',
      shortAnswer: 'shortAnswer',
      addQuiz: 'addQuiz',
      quizCount: 'quizCount',
      quizListContainer: 'quizListContainer',
      currentQ: 'currentQ',
      totalQ: 'totalQ',
      quizQuestion: 'quizQuestion',
      quizOptions: 'quizOptions',
      submitAnswer: 'submitAnswer',
      retryQuiz: 'retryQuiz',
      scorePercent: 'scorePercent',
      correctCount: 'correctCount',
      wrongCount: 'wrongCount',
      resultDetails: 'resultDetails'
    });

    this.loadData();
    this.setupEvents();
    this.updateQuizList();

    console.log('[QuizGenerator] 초기화 완료');
    return this;
  }

  loadData() {
    try {
      const saved = localStorage.getItem('quizzes');
      if (saved) {
        this.quizzes = JSON.parse(saved);
      }
    } catch (e) {}
  }

  saveData() {
    localStorage.setItem('quizzes', JSON.stringify(this.quizzes));
  }

  setupEvents() {
    this.elements.quizType.addEventListener('change', () => this.onTypeChange());
    this.elements.addQuiz.addEventListener('click', () => this.addQuiz());
    this.elements.submitAnswer.addEventListener('click', () => this.submitAnswer());
    this.elements.retryQuiz.addEventListener('click', () => this.startQuiz());

    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(tab.dataset.tab).classList.add('active');

        if (tab.dataset.tab === 'solve') {
          this.startQuiz();
        }
      });
    });
  }

  onTypeChange() {
    const type = this.elements.quizType.value;
    if (type === 'multiple') {
      this.elements.optionsContainer.style.display = 'block';
      this.elements.shortAnswerContainer.style.display = 'none';
    } else if (type === 'truefalse') {
      this.elements.optionsContainer.innerHTML = `
        <div class="input-group">
          <label>정답</label>
          <div class="option-row">
            <input type="radio" name="correct" value="0" checked>
            <span>O (맞다)</span>
          </div>
          <div class="option-row">
            <input type="radio" name="correct" value="1">
            <span>X (틀리다)</span>
          </div>
        </div>
      `;
      this.elements.optionsContainer.style.display = 'block';
      this.elements.shortAnswerContainer.style.display = 'none';
    } else {
      this.elements.optionsContainer.style.display = 'none';
      this.elements.shortAnswerContainer.style.display = 'block';
    }
  }

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  addQuiz() {
    const type = this.elements.quizType.value;
    const question = this.elements.question.value.trim();

    if (!question) {
      alert('문제를 입력하세요');
      return;
    }

    let quiz = { type, question };

    if (type === 'multiple') {
      const options = Array.from(document.querySelectorAll('.option-input')).map(i => i.value.trim());
      const correct = document.querySelector('input[name="correct"]:checked').value;
      if (options.some(o => !o)) {
        alert('모든 보기를 입력하세요');
        return;
      }
      quiz.options = options;
      quiz.correct = parseInt(correct);
    } else if (type === 'truefalse') {
      const correct = document.querySelector('input[name="correct"]:checked').value;
      quiz.options = ['O', 'X'];
      quiz.correct = parseInt(correct);
    } else {
      const answer = this.elements.shortAnswer.value.trim();
      if (!answer) {
        alert('정답을 입력하세요');
        return;
      }
      quiz.answer = answer;
    }

    this.quizzes.push(quiz);
    this.saveData();
    this.updateQuizList();

    this.elements.question.value = '';
    document.querySelectorAll('.option-input').forEach(i => i.value = '');
    this.elements.shortAnswer.value = '';

    this.showToast('퀴즈가 추가되었습니다!', 'success');
  }

  updateQuizList() {
    this.elements.quizCount.textContent = this.quizzes.length;
    this.elements.quizListContainer.innerHTML = this.quizzes.map((q, i) => `
      <div class="quiz-item">
        <span>${i + 1}. ${this.escapeHtml(q.question.substring(0, 50))}...</span>
        <button onclick="quizGenerator.deleteQuiz(${i})">삭제</button>
      </div>
    `).join('');
  }

  deleteQuiz(idx) {
    this.quizzes.splice(idx, 1);
    this.saveData();
    this.updateQuizList();
  }

  startQuiz() {
    this.currentQuiz = 0;
    this.answers = [];
    this.results = [];
    this.showQuiz();
  }

  showQuiz() {
    if (this.quizzes.length === 0) {
      this.elements.quizQuestion.textContent = '퀴즈를 먼저 추가하세요';
      this.elements.quizOptions.innerHTML = '';
      return;
    }

    const quiz = this.quizzes[this.currentQuiz];
    this.elements.currentQ.textContent = this.currentQuiz + 1;
    this.elements.totalQ.textContent = this.quizzes.length;
    this.elements.quizQuestion.textContent = quiz.question;

    if (quiz.type === 'short') {
      this.elements.quizOptions.innerHTML = `
        <input type="text" id="userAnswer" class="option-input" placeholder="답을 입력하세요" style="width:100%; padding:12px;">
      `;
    } else {
      this.elements.quizOptions.innerHTML = quiz.options.map((opt, i) => `
        <div class="quiz-option" onclick="quizGenerator.selectOption(this, ${i})">${this.escapeHtml(opt)}</div>
      `).join('');
    }
  }

  selectOption(el, idx) {
    document.querySelectorAll('.quiz-option').forEach(o => o.classList.remove('selected'));
    el.classList.add('selected');
    this.answers[this.currentQuiz] = idx;
  }

  submitAnswer() {
    if (this.quizzes.length === 0) return;

    const quiz = this.quizzes[this.currentQuiz];
    let userAnswer;
    let isCorrect;

    if (quiz.type === 'short') {
      userAnswer = document.getElementById('userAnswer').value.trim();
      isCorrect = userAnswer.toLowerCase() === quiz.answer.toLowerCase();
    } else {
      userAnswer = this.answers[this.currentQuiz];
      if (userAnswer === undefined) {
        alert('답을 선택하세요');
        return;
      }
      isCorrect = userAnswer === quiz.correct;
    }

    this.results.push({ quiz, userAnswer, isCorrect });

    this.currentQuiz++;
    if (this.currentQuiz < this.quizzes.length) {
      this.showQuiz();
    } else {
      this.showResults();
    }
  }

  showResults() {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelector('[data-tab="results"]').classList.add('active');
    document.getElementById('results').classList.add('active');

    const correct = this.results.filter(r => r.isCorrect).length;
    const wrong = this.results.length - correct;
    const percent = Math.round((correct / this.results.length) * 100);

    this.elements.scorePercent.textContent = percent + '%';
    this.elements.correctCount.textContent = correct;
    this.elements.wrongCount.textContent = wrong;

    this.elements.resultDetails.innerHTML = this.results.map((r, i) => `
      <div class="result-item ${r.isCorrect ? 'correct' : 'wrong'}">
        <h4>${i + 1}. ${this.escapeHtml(r.quiz.question)}</h4>
        <p>내 답: ${r.quiz.type === 'short' ? this.escapeHtml(r.userAnswer) : this.escapeHtml(r.quiz.options[r.userAnswer])}</p>
        ${!r.isCorrect ? '<p>정답: ' + (r.quiz.type === 'short' ? this.escapeHtml(r.quiz.answer) : this.escapeHtml(r.quiz.options[r.quiz.correct])) + '</p>' : ''}
      </div>
    `).join('');

    this.showToast(`점수: ${percent}%`, percent >= 80 ? 'success' : 'info');
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const quizGenerator = new QuizGenerator();
window.QuizGenerator = quizGenerator;

document.addEventListener('DOMContentLoaded', () => quizGenerator.init());
