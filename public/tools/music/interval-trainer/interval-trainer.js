/**
 * 음정 트레이너 - ToolBase 기반
 * 음정 청음 연습
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var IntervalTrainer = class IntervalTrainer extends ToolBase {
  constructor() {
    super('IntervalTrainer');
    this.audioContext = null;
    this.currentInterval = null;
    this.baseNote = null;
    this.correct = 0;
    this.total = 0;
    this.answered = false;

    this.intervals = {
      m2: { name: '단2도', semitones: 1 },
      M2: { name: '장2도', semitones: 2 },
      m3: { name: '단3도', semitones: 3 },
      M3: { name: '장3도', semitones: 4 },
      P4: { name: '완전4도', semitones: 5 },
      TT: { name: '증4도/감5도', semitones: 6 },
      P5: { name: '완전5도', semitones: 7 },
      m6: { name: '단6도', semitones: 8 },
      M6: { name: '장6도', semitones: 9 },
      m7: { name: '단7도', semitones: 10 },
      M7: { name: '장7도', semitones: 11 },
      P8: { name: '완전8도', semitones: 12 }
    };

    this.difficulties = {
      easy: ['M3', 'P5', 'P8'],
      medium: ['M2', 'm3', 'M3', 'P4', 'P5', 'M6'],
      hard: ['m2', 'M2', 'm3', 'M3', 'P4', 'TT', 'P5', 'm6', 'M6', 'm7', 'M7', 'P8']
    };

    this.activeIntervals = [];
  }

  init() {
    this.initElements({
      difficulty: 'difficulty',
      playMode: 'playMode',
      answerGrid: 'answerGrid',
      hintText: 'hintText',
      correctCount: 'correctCount',
      totalCount: 'totalCount',
      accuracy: 'accuracy'
    });

    this.setDifficulty();
    this.renderAnswerButtons();

    console.log('[IntervalTrainer] 초기화 완료');
    return this;
  }

  setDifficulty() {
    const difficulty = this.elements.difficulty.value;
    this.activeIntervals = this.difficulties[difficulty];
    this.renderAnswerButtons();
  }

  renderAnswerButtons() {
    this.elements.answerGrid.innerHTML = this.activeIntervals.map(key => {
      const interval = this.intervals[key];
      return `<div class="answer-btn" data-interval="${key}" onclick="intervalTrainer.answer('${key}')">${interval.name}</div>`;
    }).join('');
  }

  play() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    const randomIndex = Math.floor(Math.random() * this.activeIntervals.length);
    this.currentInterval = this.activeIntervals[randomIndex];
    this.baseNote = 261.63 + Math.random() * 100;
    this.answered = false;

    document.querySelectorAll('.answer-btn').forEach(btn => {
      btn.classList.remove('correct', 'wrong');
    });

    this.elements.hintText.textContent = '어떤 음정일까요?';

    const semitones = this.intervals[this.currentInterval].semitones;
    const secondNote = this.baseNote * Math.pow(2, semitones / 12);
    const mode = this.elements.playMode.value;

    if (mode === 'harmonic') {
      this.playNote(this.baseNote, 0);
      this.playNote(secondNote, 0);
    } else if (mode === 'melodic-up') {
      this.playNote(this.baseNote, 0);
      this.playNote(secondNote, 0.5);
    } else {
      this.playNote(secondNote, 0);
      this.playNote(this.baseNote, 0.5);
    }
  }

  playNote(freq, delay) {
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.connect(gain);
    gain.connect(this.audioContext.destination);

    osc.frequency.value = freq;
    osc.type = 'sine';

    const startTime = this.audioContext.currentTime + delay;
    gain.gain.setValueAtTime(0.3, startTime);
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + 1);

    osc.start(startTime);
    osc.stop(startTime + 1);
  }

  answer(intervalKey) {
    if (this.answered || !this.currentInterval) return;
    this.answered = true;
    this.total++;

    const isCorrect = intervalKey === this.currentInterval;
    const btn = document.querySelector(`[data-interval="${intervalKey}"]`);

    if (isCorrect) {
      this.correct++;
      btn.classList.add('correct');
      this.elements.hintText.textContent = '정답입니다! ';
    } else {
      btn.classList.add('wrong');
      const correctBtn = document.querySelector(`[data-interval="${this.currentInterval}"]`);
      correctBtn.classList.add('correct');
      this.elements.hintText.textContent =
        `오답! 정답은 ${this.intervals[this.currentInterval].name}입니다.`;
    }

    this.updateScore();

    setTimeout(() => {
      if (this.answered) {
        this.play();
      }
    }, 1500);
  }

  updateScore() {
    this.elements.correctCount.textContent = this.correct;
    this.elements.totalCount.textContent = this.total;

    const accuracy = this.total > 0 ? Math.round((this.correct / this.total) * 100) : 0;
    this.elements.accuracy.textContent = accuracy + '%';
  }

  reset() {
    this.correct = 0;
    this.total = 0;
    this.currentInterval = null;
    this.answered = false;
    this.updateScore();

    document.querySelectorAll('.answer-btn').forEach(btn => {
      btn.classList.remove('correct', 'wrong');
    });
    this.elements.hintText.textContent = '버튼을 눌러 음정을 들어보세요';
    this.showToast('점수가 리셋되었습니다', 'success');
  }
}

// 전역 인스턴스 생성
const intervalTrainer = new IntervalTrainer();
window.IntervalTrainer = intervalTrainer;

// 전역 함수 (HTML onclick 호환)
function setDifficulty() { intervalTrainer.setDifficulty(); }
function play() { intervalTrainer.play(); }
function reset() { intervalTrainer.reset(); }

document.addEventListener('DOMContentLoaded', () => intervalTrainer.init());
