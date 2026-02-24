/**
 * 음표 읽기 - ToolBase 기반
 * 오선 독보 연습
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var NoteReader = class NoteReader extends ToolBase {
  constructor() {
    super('NoteReader');
    this.clef = 'treble';
    this.currentNote = null;
    this.correct = 0;
    this.total = 0;
    this.streak = 0;
    this.answered = false;

    this.trebleNotes = {
      'F5': -10,
      'E5': 0,
      'D5': 10,
      'C5': 20,
      'B4': 30,
      'A4': 40,
      'G4': 50,
      'F4': 60,
      'E4': 70,
      'D4': 80,
      'C4': 90,
      'B3': 100,
      'A3': 110,
      'G3': 120
    };

    this.bassNotes = {
      'A3': -10,
      'G3': 0,
      'F3': 10,
      'E3': 20,
      'D3': 30,
      'C3': 40,
      'B2': 50,
      'A2': 60,
      'G2': 70,
      'F2': 80,
      'E2': 90,
      'D2': 100,
      'C2': 110
    };

    this.noteNames = {
      'C': '도', 'D': '레', 'E': '미', 'F': '파', 'G': '솔', 'A': '라', 'B': '시'
    };
  }

  init() {
    this.initElements({
      clefSymbol: 'clefSymbol',
      staff: 'staff',
      noteHead: 'noteHead',
      noteStem: 'noteStem',
      correctCount: 'correctCount',
      totalCount: 'totalCount',
      streakCount: 'streakCount'
    });

    this.nextNote();

    console.log('[NoteReader] 초기화 완료');
    return this;
  }

  setClef(clef) {
    this.clef = clef;
    document.querySelectorAll('.clef-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.clef === clef);
    });

    this.elements.clefSymbol.textContent = clef === 'treble' ? '𝄞' : '𝄢';
    this.nextNote();
  }

  nextNote() {
    const notes = this.clef === 'treble' ? this.trebleNotes : this.bassNotes;
    const noteKeys = Object.keys(notes);

    const usableNotes = noteKeys.slice(2, -2);
    const randomIndex = Math.floor(Math.random() * usableNotes.length);
    this.currentNote = usableNotes[randomIndex];
    this.answered = false;

    document.querySelectorAll('.answer-btn').forEach(btn => {
      btn.classList.remove('correct', 'wrong');
    });

    this.renderNote();
  }

  renderNote() {
    const notes = this.clef === 'treble' ? this.trebleNotes : this.bassNotes;
    const position = notes[this.currentNote];

    this.elements.noteHead.style.top = position + 'px';

    if (position < 60) {
      this.elements.noteStem.style.top = position + 'px';
      this.elements.noteStem.style.left = 'calc(50% + 11px)';
      this.elements.noteStem.style.height = '50px';
    } else {
      this.elements.noteStem.style.top = (position - 50) + 'px';
      this.elements.noteStem.style.left = 'calc(50% - 13px)';
      this.elements.noteStem.style.height = '50px';
    }

    document.querySelectorAll('.ledger-line').forEach(l => l.remove());

    if (position < 20) {
      const ledger = document.createElement('div');
      ledger.className = 'ledger-line';
      ledger.style.cssText = `position: absolute; left: 45%; width: 35px; height: 2px; background: #333; top: 0px;`;
      this.elements.staff.appendChild(ledger);
    }
    if (position > 100) {
      const ledger = document.createElement('div');
      ledger.className = 'ledger-line';
      ledger.style.cssText = `position: absolute; left: 45%; width: 35px; height: 2px; background: #333; top: 120px;`;
      this.elements.staff.appendChild(ledger);
    }
  }

  answer(noteLetter) {
    if (this.answered) return;
    this.answered = true;
    this.total++;

    const correctLetter = this.currentNote[0];
    const isCorrect = noteLetter === correctLetter;

    const buttons = document.querySelectorAll('.answer-btn');
    buttons.forEach(btn => {
      if (btn.textContent === this.noteNames[noteLetter]) {
        btn.classList.add(isCorrect ? 'correct' : 'wrong');
      }
      if (!isCorrect && btn.textContent === this.noteNames[correctLetter]) {
        btn.classList.add('correct');
      }
    });

    if (isCorrect) {
      this.correct++;
      this.streak++;
    } else {
      this.streak = 0;
    }

    this.updateScore();

    setTimeout(() => this.nextNote(), 1000);
  }

  updateScore() {
    this.elements.correctCount.textContent = this.correct;
    this.elements.totalCount.textContent = this.total;
    this.elements.streakCount.textContent = this.streak;
  }

  reset() {
    this.correct = 0;
    this.total = 0;
    this.streak = 0;
    this.updateScore();
    this.nextNote();
    this.showToast('점수가 리셋되었습니다', 'success');
  }
}

// 전역 인스턴스 생성
const noteReader = new NoteReader();
window.NoteReader = noteReader;

// 전역 함수 (HTML onclick 호환)
function setClef(clef) { noteReader.setClef(clef); }
function answer(noteLetter) { noteReader.answer(noteLetter); }
function reset() { noteReader.reset(); }

document.addEventListener('DOMContentLoaded', () => noteReader.init());
