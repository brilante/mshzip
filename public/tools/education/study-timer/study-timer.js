/**
 * 스터디 타이머 - ToolBase 기반
 * 과목별 공부 시간 기록
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var StudyTimer = class StudyTimer extends ToolBase {
  constructor() {
    super('StudyTimer');
    this.currentSubject = '';
    this.elapsedSeconds = 0;
    this.interval = null;
    this.isRunning = false;
    this.subjects = {};
    this.startTime = 0;
  }

  init() {
    this.initElements({
      subjectInput: 'subjectInput',
      currentSubject: 'currentSubject',
      subjectName: 'subjectName',
      timeDisplay: 'timeDisplay',
      startBtn: 'startBtn',
      subjectList: 'subjectList',
      totalTime: 'totalTime'
    });

    this.loadData();
    this.updateSubjectList();

    console.log('[StudyTimer] 초기화 완료');
    return this;
  }

  setSubject() {
    const subject = this.elements.subjectInput.value.trim();

    if (!subject) {
      this.showToast('과목명을 입력하세요.', 'error');
      return;
    }

    if (this.isRunning) {
      this.saveCurrentSession();
    }

    this.currentSubject = subject;
    this.elapsedSeconds = 0;
    this.elements.subjectInput.value = '';

    this.elements.currentSubject.style.display = 'block';
    this.elements.subjectName.textContent = subject;
    this.updateDisplay();

    this.showToast(`'${subject}' 과목이 설정되었습니다.`, 'success');
  }

  toggle() {
    if (!this.currentSubject) {
      this.showToast('먼저 과목을 설정하세요.', 'error');
      return;
    }

    if (this.isRunning) {
      this.pause();
    } else {
      this.start();
    }
  }

  start() {
    this.isRunning = true;
    this.startTime = Date.now() - (this.elapsedSeconds * 1000);

    this.elements.startBtn.textContent = '일시정지';
    this.elements.startBtn.className = 'control-btn pause-btn';
    this.elements.timeDisplay.classList.add('running');

    this.interval = setInterval(() => this.tick(), 1000);
  }

  pause() {
    this.isRunning = false;
    clearInterval(this.interval);

    this.elements.startBtn.textContent = '계속';
    this.elements.startBtn.className = 'control-btn start-btn';
  }

  tick() {
    this.elapsedSeconds = Math.floor((Date.now() - this.startTime) / 1000);
    this.updateDisplay();
  }

  updateDisplay() {
    const hours = Math.floor(this.elapsedSeconds / 3600);
    const minutes = Math.floor((this.elapsedSeconds % 3600) / 60);
    const seconds = this.elapsedSeconds % 60;

    this.elements.timeDisplay.textContent =
      `${this.pad(hours)}:${this.pad(minutes)}:${this.pad(seconds)}`;
  }

  saveAndReset() {
    if (!this.currentSubject || this.elapsedSeconds === 0) {
      this.showToast('저장할 기록이 없습니다.', 'error');
      return;
    }

    this.saveCurrentSession();

    // 초기화
    this.currentSubject = '';
    this.elapsedSeconds = 0;
    this.isRunning = false;
    clearInterval(this.interval);

    this.elements.currentSubject.style.display = 'none';
    this.elements.timeDisplay.textContent = '00:00:00';
    this.elements.timeDisplay.classList.remove('running');
    this.elements.startBtn.textContent = '시작';
    this.elements.startBtn.className = 'control-btn start-btn';

    this.showToast('기록이 저장되었습니다!', 'success');
  }

  saveCurrentSession() {
    if (!this.currentSubject || this.elapsedSeconds === 0) return;

    if (!this.subjects[this.currentSubject]) {
      this.subjects[this.currentSubject] = 0;
    }
    this.subjects[this.currentSubject] += this.elapsedSeconds;

    this.saveData();
    this.updateSubjectList();
  }

  updateSubjectList() {
    const entries = Object.entries(this.subjects);

    if (entries.length === 0) {
      this.elements.subjectList.innerHTML = '<div style="color: var(--text-secondary); font-size: 0.85rem; text-align: center;">아직 기록이 없습니다.</div>';
    } else {
      this.elements.subjectList.innerHTML = entries.map(([subject, seconds]) =>
        `<div class="subject-item">
          <span class="subject-name">${subject}</span>
          <span class="subject-time">${this.formatTime(seconds)}</span>
        </div>`
      ).join('');
    }

    // 총 시간 계산
    const totalSeconds = entries.reduce((sum, [, s]) => sum + s, 0);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    this.elements.totalTime.textContent = `${hours}시간 ${minutes}분`;
  }

  formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;

    if (h > 0) {
      return `${h}시간 ${m}분`;
    }
    return `${m}분 ${s}초`;
  }

  clearToday() {
    if (confirm('오늘의 모든 기록을 삭제하시겠습니까?')) {
      this.subjects = {};
      this.currentSubject = '';
      this.elapsedSeconds = 0;
      this.isRunning = false;
      clearInterval(this.interval);

      this.elements.currentSubject.style.display = 'none';
      this.elements.timeDisplay.textContent = '00:00:00';
      this.elements.startBtn.textContent = '시작';

      this.saveData();
      this.updateSubjectList();
      this.showToast('기록이 초기화되었습니다.', 'info');
    }
  }

  pad(num) {
    return num.toString().padStart(2, '0');
  }

  saveData() {
    const today = new Date().toDateString();
    localStorage.setItem('studyTimerData', JSON.stringify({
      date: today,
      subjects: this.subjects
    }));
  }

  loadData() {
    try {
      const saved = localStorage.getItem('studyTimerData');
      if (saved) {
        const data = JSON.parse(saved);
        const today = new Date().toDateString();
        if (data.date === today) {
          this.subjects = data.subjects || {};
        }
      }
    } catch (e) {
      console.error('[StudyTimer] 데이터 로드 실패:', e);
    }
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const studyTimer = new StudyTimer();
window.StudyTimer = studyTimer;

document.addEventListener('DOMContentLoaded', () => studyTimer.init());
