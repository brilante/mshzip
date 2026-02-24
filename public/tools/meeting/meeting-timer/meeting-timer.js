/**
 * 회의 타이머 - ToolBase 기반
 * 안건별 시간 관리
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var MeetingTimer = class MeetingTimer extends ToolBase {
  constructor() {
    super('MeetingTimer');
    this.agendas = [];
    this.completed = [];
    this.currentIndex = -1;
    this.remainingSeconds = 0;
    this.totalSeconds = 0;
    this.intervalId = null;
    this.isPaused = false;
  }

  init() {
    this.initElements({
      agendaTitle: 'agendaTitle',
      agendaMinutes: 'agendaMinutes',
      agendaSeconds: 'agendaSeconds',
      agendaList: 'agendaList',
      totalTime: 'totalTime',
      currentAgenda: 'currentAgenda',
      timerClock: 'timerClock',
      progressBar: 'progressBar',
      timerStatus: 'timerStatus',
      startBtn: 'startBtn',
      pauseBtn: 'pauseBtn',
      resumeBtn: 'resumeBtn',
      completedSection: 'completedSection',
      completedList: 'completedList',
      warningAlert: 'warningAlert',
      soundAlert: 'soundAlert',
      autoNext: 'autoNext'
    });

    // Enter 키 이벤트
    this.elements.agendaTitle.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.addAgenda();
    });

    this.updateDisplay();

    console.log('[MeetingTimer] 초기화 완료');
    return this;
  }

  setQuickTime(minutes) {
    this.elements.agendaMinutes.value = minutes;
    this.elements.agendaSeconds.value = 0;
  }

  addAgenda() {
    const title = this.elements.agendaTitle.value.trim();
    const minutes = parseInt(this.elements.agendaMinutes.value) || 0;
    const seconds = parseInt(this.elements.agendaSeconds.value) || 0;
    const totalSec = minutes * 60 + seconds;

    if (!title) {
      this.showToast('안건 제목을 입력해주세요.', 'error');
      return;
    }

    if (totalSec <= 0) {
      this.showToast('시간을 설정해주세요.', 'error');
      return;
    }

    this.agendas.push({
      title,
      duration: totalSec,
      actualTime: 0
    });

    this.elements.agendaTitle.value = '';
    this.elements.agendaMinutes.value = '5';
    this.elements.agendaSeconds.value = '0';

    this.renderAgendas();
    this.updateTotalTime();
  }

  removeAgenda(index) {
    if (this.currentIndex >= 0) {
      this.showToast('타이머 실행 중에는 삭제할 수 없습니다.', 'error');
      return;
    }
    this.agendas.splice(index, 1);
    this.renderAgendas();
    this.updateTotalTime();
  }

  renderAgendas() {
    if (this.agendas.length === 0) {
      this.elements.agendaList.innerHTML = '<div class="empty-state">안건을 추가해주세요</div>';
      return;
    }

    this.elements.agendaList.innerHTML = this.agendas.map((agenda, i) => `
      <div class="agenda-item ${i === this.currentIndex ? 'current' : ''}" data-index="${i}">
        <span class="agenda-number">${i + 1}</span>
        <div class="agenda-info">
          <div class="agenda-title">${this.escapeHtml(agenda.title)}</div>
        </div>
        <span class="agenda-time">${this.formatTime(agenda.duration)}</span>
        <button class="agenda-delete" onclick="meetingTimer.removeAgenda(${i})"></button>
      </div>
    `).join('');
  }

  updateTotalTime() {
    const total = this.agendas.reduce((sum, a) => sum + a.duration, 0);
    this.elements.totalTime.textContent = this.formatTime(total);
  }

  start() {
    if (this.agendas.length === 0) {
      this.showToast('안건을 먼저 추가해주세요.', 'error');
      return;
    }

    this.currentIndex = 0;
    this.startCurrentAgenda();

    this.elements.startBtn.style.display = 'none';
    this.elements.pauseBtn.style.display = 'inline-block';
  }

  startCurrentAgenda() {
    if (this.currentIndex >= this.agendas.length) {
      this.finish();
      return;
    }

    const agenda = this.agendas[this.currentIndex];
    this.totalSeconds = agenda.duration;
    this.remainingSeconds = agenda.duration;
    this.isPaused = false;

    this.elements.currentAgenda.textContent = agenda.title;
    this.renderAgendas();
    this.updateDisplay();
    this.tick();

    if (this.intervalId) clearInterval(this.intervalId);
    this.intervalId = setInterval(() => this.tick(), 1000);
  }

  tick() {
    if (this.isPaused) return;

    const agenda = this.agendas[this.currentIndex];
    agenda.actualTime++;

    if (this.remainingSeconds > 0) {
      this.remainingSeconds--;
    }

    this.updateDisplay();

    // 1분 전 경고
    if (this.remainingSeconds === 60 && this.elements.warningAlert.checked) {
      this.playSound('warning');
      this.elements.timerStatus.textContent = '1분 남았습니다!';
      this.elements.timerStatus.className = 'timer-status warning';
    }

    // 시간 초과
    if (this.remainingSeconds === 0 && agenda.actualTime === agenda.duration) {
      if (this.elements.soundAlert.checked) {
        this.playSound('end');
      }

      if (this.elements.autoNext.checked) {
        setTimeout(() => this.skip(), 2000);
      }
    }

    // 초과 시간 표시
    if (this.remainingSeconds <= 0) {
      const overtime = agenda.actualTime - agenda.duration;
      this.elements.timerStatus.textContent = `${this.formatTime(overtime)} 초과`;
      this.elements.timerStatus.className = 'timer-status overtime';
    }
  }

  updateDisplay() {
    const displaySeconds = Math.abs(this.remainingSeconds);
    this.elements.timerClock.textContent = this.formatTime(displaySeconds);

    // 진행률 바
    if (this.totalSeconds > 0) {
      const progress = (this.remainingSeconds / this.totalSeconds) * 100;
      this.elements.progressBar.style.width = Math.max(0, progress) + '%';
    }

    if (this.currentIndex < 0) {
      this.elements.timerStatus.textContent = '대기 중';
      this.elements.timerStatus.className = 'timer-status';
    }
  }

  pause() {
    this.isPaused = true;
    this.elements.pauseBtn.style.display = 'none';
    this.elements.resumeBtn.style.display = 'inline-block';
    this.elements.timerStatus.textContent = '일시정지';
  }

  resume() {
    this.isPaused = false;
    this.elements.resumeBtn.style.display = 'none';
    this.elements.pauseBtn.style.display = 'inline-block';
    this.elements.timerStatus.textContent = '진행 중';
    this.elements.timerStatus.className = 'timer-status';
  }

  skip() {
    if (this.currentIndex < 0) return;

    const agenda = this.agendas[this.currentIndex];
    this.completed.push({
      title: agenda.title,
      planned: agenda.duration,
      actual: agenda.actualTime
    });

    this.agendas.splice(this.currentIndex, 1);
    this.renderCompleted();
    this.renderAgendas();
    this.updateTotalTime();

    if (this.agendas.length > 0) {
      this.startCurrentAgenda();
    } else {
      this.finish();
    }
  }

  reset() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.currentIndex = -1;
    this.remainingSeconds = 0;
    this.totalSeconds = 0;
    this.isPaused = false;

    this.elements.startBtn.style.display = 'inline-block';
    this.elements.pauseBtn.style.display = 'none';
    this.elements.resumeBtn.style.display = 'none';
    this.elements.currentAgenda.textContent = '안건을 추가해주세요';
    this.elements.timerClock.textContent = '00:00';
    this.elements.progressBar.style.width = '100%';
    this.elements.timerStatus.textContent = '대기 중';
    this.elements.timerStatus.className = 'timer-status';

    this.renderAgendas();
  }

  finish() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.currentIndex = -1;
    this.elements.currentAgenda.textContent = '모든 안건 완료!';
    this.elements.timerClock.textContent = '00:00';
    this.elements.timerStatus.textContent = '회의 종료';
    this.elements.timerStatus.className = 'timer-status';

    this.elements.startBtn.style.display = 'inline-block';
    this.elements.pauseBtn.style.display = 'none';
    this.elements.resumeBtn.style.display = 'none';

    if (this.elements.soundAlert.checked) {
      this.playSound('complete');
    }
  }

  renderCompleted() {
    if (this.completed.length === 0) {
      this.elements.completedSection.style.display = 'none';
      return;
    }

    this.elements.completedSection.style.display = 'block';
    this.elements.completedList.innerHTML = this.completed.map(item => {
      const diff = item.actual - item.planned;
      const diffClass = diff > 0 ? 'overtime' : '';
      const diffText = diff > 0 ? `+${this.formatTime(diff)}` : this.formatTime(Math.abs(diff));

      return `
        <div class="completed-item">
          <span class="title">${this.escapeHtml(item.title)}</span>
          <span class="time">계획: ${this.formatTime(item.planned)}</span>
          <span class="actual ${diffClass}">실제: ${this.formatTime(item.actual)} (${diff > 0 ? '+' : '-'}${this.formatTime(Math.abs(diff))})</span>
        </div>
      `;
    }).join('');
  }

  formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  playSound(type) {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    if (type === 'warning') {
      oscillator.frequency.value = 440;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.3;
      oscillator.start();
      setTimeout(() => oscillator.stop(), 200);
    } else if (type === 'end') {
      oscillator.frequency.value = 880;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.3;
      oscillator.start();
      setTimeout(() => {
        oscillator.frequency.value = 660;
        setTimeout(() => oscillator.stop(), 200);
      }, 200);
    } else if (type === 'complete') {
      oscillator.frequency.value = 523;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.3;
      oscillator.start();
      setTimeout(() => {
        oscillator.frequency.value = 659;
        setTimeout(() => {
          oscillator.frequency.value = 784;
          setTimeout(() => oscillator.stop(), 200);
        }, 150);
      }, 150);
    }
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
const meetingTimer = new MeetingTimer();
window.MeetingTimer = meetingTimer;

// 전역 함수 (HTML onclick 호환)
function setQuickTime(minutes) { meetingTimer.setQuickTime(minutes); }
function addAgenda() { meetingTimer.addAgenda(); }
function start() { meetingTimer.start(); }
function pause() { meetingTimer.pause(); }
function resume() { meetingTimer.resume(); }
function skip() { meetingTimer.skip(); }
function reset() { meetingTimer.reset(); }

document.addEventListener('DOMContentLoaded', () => meetingTimer.init());
