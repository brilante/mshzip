/**
 * 타자 연습 - ToolBase 기반
 * 타이핑 속도 측정
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var TypingTest = class TypingTest extends ToolBase {
  constructor() {
    super('TypingTest');
    this.texts = {
      ko: [
        '오늘 날씨가 정말 좋습니다. 하늘은 맑고 바람은 시원합니다.',
        '프로그래밍을 배우면 논리적 사고력이 향상됩니다.',
        '꾸준한 노력은 결국 좋은 결과로 이어집니다.',
        '책을 읽으면 새로운 세상을 경험할 수 있습니다.',
        '건강은 무엇보다 소중한 재산입니다. 운동을 꾸준히 해야 합니다.',
        '작은 것에 감사하면 행복이 찾아옵니다.',
        '실패는 성공의 어머니입니다. 포기하지 마세요.',
        '좋은 습관이 좋은 인생을 만듭니다.',
        '시간은 금이다. 시간을 소중히 여기자.',
        '꿈을 꾸는 사람은 언젠가 그 꿈을 이룹니다.'
      ],
      en: [
        'The quick brown fox jumps over the lazy dog.',
        'Practice makes perfect. Keep typing every day.',
        'Programming is the art of telling a computer what to do.',
        'Success is not final, failure is not fatal.',
        'The only way to do great work is to love what you do.',
        'In the middle of difficulty lies opportunity.',
        'Believe you can and you are halfway there.',
        'Every moment is a fresh beginning.',
        'Learning never exhausts the mind.',
        'Quality is not an act, it is a habit.'
      ]
    };

    this.currentText = '';
    this.startTime = null;
    this.endTime = null;
    this.totalTime = 60;
    this.remainingTime = 60;
    this.interval = null;
    this.isRunning = false;
    this.correctChars = 0;
    this.totalChars = 0;
    this.currentIndex = 0;
  }

  init() {
    this.initElements({
      langSelect: 'langSelect',
      timeSelect: 'timeSelect',
      textDisplay: 'textDisplay',
      typingInput: 'typingInput',
      startBtn: 'startBtn',
      timeValue: 'timeValue',
      timerProgress: 'timerProgress',
      wpmValue: 'wpmValue',
      cpmValue: 'cpmValue',
      accuracyValue: 'accuracyValue',
      resultPanel: 'resultPanel',
      finalWpm: 'finalWpm',
      finalAccuracy: 'finalAccuracy'
    });

    this.loadText();
    this.setupInput();

    console.log('[TypingTest] 초기화 완료');
    return this;
  }

  loadText() {
    const lang = this.elements.langSelect.value;
    const texts = this.texts[lang];
    // 2-3개의 문장 선택
    const shuffled = [...texts].sort(() => Math.random() - 0.5);
    this.currentText = shuffled.slice(0, 3).join(' ');
    this.renderText();
  }

  renderText() {
    this.elements.textDisplay.innerHTML = this.currentText.split('').map((char, i) => {
      let className = 'char';
      if (i === this.currentIndex && this.isRunning) className += ' current';
      return `<span class="${className}" data-index="${i}">${char}</span>`;
    }).join('');
  }

  setupInput() {
    this.elements.typingInput.addEventListener('input', (e) => this.handleInput(e));
    this.elements.typingInput.addEventListener('keydown', (e) => {
      if (!this.isRunning && e.key !== 'Tab') {
        e.preventDefault();
      }
    });

    this.elements.langSelect.addEventListener('change', () => {
      if (!this.isRunning) this.loadText();
    });

    this.elements.timeSelect.addEventListener('change', () => {
      if (!this.isRunning) {
        this.totalTime = parseInt(this.elements.timeSelect.value);
        this.remainingTime = this.totalTime;
        this.elements.timeValue.textContent = this.remainingTime;
      }
    });
  }

  start() {
    if (this.isRunning) return;

    this.isRunning = true;
    this.startTime = Date.now();
    this.totalTime = parseInt(this.elements.timeSelect.value);
    this.remainingTime = this.totalTime;
    this.currentIndex = 0;
    this.correctChars = 0;
    this.totalChars = 0;

    this.elements.typingInput.value = '';
    this.elements.typingInput.focus();
    this.elements.startBtn.textContent = '진행 중...';
    this.elements.startBtn.disabled = true;
    this.elements.resultPanel.style.display = 'none';

    this.loadText();
    this.interval = setInterval(() => this.tick(), 1000);
  }

  tick() {
    this.remainingTime--;
    this.elements.timeValue.textContent = this.remainingTime;
    this.elements.timerProgress.style.width =
      (this.remainingTime / this.totalTime * 100) + '%';

    if (this.remainingTime <= 0) {
      this.finish();
    }
  }

  handleInput(e) {
    if (!this.isRunning) return;

    const input = e.target.value;
    const chars = document.querySelectorAll('.char');

    this.currentIndex = input.length;
    this.correctChars = 0;
    this.totalChars = input.length;

    chars.forEach((charEl, i) => {
      charEl.classList.remove('correct', 'incorrect', 'current');

      if (i < input.length) {
        if (input[i] === this.currentText[i]) {
          charEl.classList.add('correct');
          this.correctChars++;
        } else {
          charEl.classList.add('incorrect');
        }
      } else if (i === input.length) {
        charEl.classList.add('current');
      }
    });

    this.updateStats();

    // 텍스트 완료 체크
    if (input.length >= this.currentText.length) {
      this.finish();
    }
  }

  updateStats() {
    const elapsed = (Date.now() - this.startTime) / 1000 / 60; // 분
    const wpm = elapsed > 0 ? Math.round((this.correctChars / 5) / elapsed) : 0;
    const cpm = elapsed > 0 ? Math.round(this.correctChars / elapsed) : 0;
    const accuracy = this.totalChars > 0
      ? Math.round((this.correctChars / this.totalChars) * 100)
      : 100;

    this.elements.wpmValue.textContent = wpm;
    this.elements.cpmValue.textContent = cpm;
    this.elements.accuracyValue.textContent = accuracy + '%';
  }

  finish() {
    this.isRunning = false;
    this.endTime = Date.now();
    clearInterval(this.interval);

    const elapsed = (this.endTime - this.startTime) / 1000 / 60;
    const finalWpm = Math.round((this.correctChars / 5) / elapsed);
    const finalAccuracy = this.totalChars > 0
      ? Math.round((this.correctChars / this.totalChars) * 100)
      : 100;

    this.elements.finalWpm.textContent = finalWpm;
    this.elements.finalAccuracy.textContent = finalAccuracy + '%';
    this.elements.resultPanel.style.display = 'block';
    this.elements.startBtn.textContent = '시작하기';
    this.elements.startBtn.disabled = false;
    this.elements.typingInput.blur();

    this.showToast(`완료! WPM: ${finalWpm}, 정확도: ${finalAccuracy}%`, 'success');
  }

  reset() {
    this.isRunning = false;
    clearInterval(this.interval);
    this.remainingTime = this.totalTime;
    this.currentIndex = 0;
    this.correctChars = 0;
    this.totalChars = 0;

    this.elements.typingInput.value = '';
    this.elements.timeValue.textContent = this.totalTime;
    this.elements.timerProgress.style.width = '100%';
    this.elements.wpmValue.textContent = '0';
    this.elements.cpmValue.textContent = '0';
    this.elements.accuracyValue.textContent = '100%';
    this.elements.resultPanel.style.display = 'none';
    this.elements.startBtn.textContent = '시작하기';
    this.elements.startBtn.disabled = false;

    this.loadText();
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const typingTest = new TypingTest();
window.TypingTest = typingTest;

document.addEventListener('DOMContentLoaded', () => typingTest.init());
