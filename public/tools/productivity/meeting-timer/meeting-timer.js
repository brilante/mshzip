/**
 * 회의 타이머 - ToolBase 기반
 * 효율적인 회의 시간 관리
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var MeetingTimer = class MeetingTimer extends ToolBase {
  constructor() {
    super('MeetingTimer');
    this.agendas = [
      { title: '인사 및 출석 확인', minutes: 2, completed: false },
      { title: '지난 회의 검토', minutes: 5, completed: false },
      { title: '주요 안건 논의', minutes: 15, completed: false },
      { title: '액션 아이템 정리', minutes: 5, completed: false },
      { title: '마무리', minutes: 3, completed: false }
    ];
    this.currentIndex = 0;
    this.isRunning = false;
    this.totalSeconds = 0;
    this.agendaSeconds = 0;
    this.intervalId = null;
  }

  init() {
    this.initElements({
      agendaItems: 'agendaItems',
      newAgenda: 'newAgenda',
      newMinutes: 'newMinutes',
      startBtn: 'startBtn',
      timerLabel: 'timerLabel',
      timerDisplay: 'timerDisplay',
      progressBar: 'progressBar'
    });

    this.renderAgendas();

    console.log('[MeetingTimer] 초기화 완료');
    return this;
  }

  renderAgendas() {
    this.elements.agendaItems.innerHTML = this.agendas.map((agenda, idx) => `
      <div class="agenda-item ${idx === this.currentIndex ? 'active' : ''} ${agenda.completed ? 'completed' : ''}" data-index="${idx}">
        <span class="agenda-time">${agenda.minutes}분</span>
        <span class="agenda-title">${agenda.title}</span>
        <button onclick="meetingTimer.removeAgenda(${idx})" style="background: none; border: none; cursor: pointer; opacity: 0.5;"></button>
      </div>
    `).join('');
  }

  addAgenda() {
    const title = this.elements.newAgenda.value.trim();
    const minutes = parseInt(this.elements.newMinutes.value) || 5;

    if (!title) {
      this.showToast('안건 제목을 입력해주세요', 'error');
      return;
    }

    this.agendas.push({ title, minutes, completed: false });
    this.elements.newAgenda.value = '';
    this.renderAgendas();
    this.showToast('안건이 추가되었습니다', 'success');
  }

  removeAgenda(index) {
    this.agendas.splice(index, 1);
    if (this.currentIndex >= this.agendas.length) {
      this.currentIndex = Math.max(0, this.agendas.length - 1);
    }
    this.renderAgendas();
  }

  start() {
    if (this.isRunning) return;
    if (this.agendas.length === 0) {
      this.showToast('안건을 추가해주세요', 'error');
      return;
    }

    this.isRunning = true;
    this.elements.startBtn.textContent = '진행 중...';
    this.elements.timerLabel.textContent = this.agendas[this.currentIndex].title;

    this.intervalId = setInterval(() => this.tick(), 1000);
  }

  pause() {
    this.isRunning = false;
    this.elements.startBtn.textContent = '재개';
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  reset() {
    this.pause();
    this.totalSeconds = 0;
    this.agendaSeconds = 0;
    this.currentIndex = 0;
    this.agendas.forEach(a => a.completed = false);
    this.elements.startBtn.textContent = '시작';
    this.elements.timerLabel.textContent = '회의 시작 전';
    this.updateDisplay();
    this.renderAgendas();
  }

  tick() {
    this.totalSeconds++;
    this.agendaSeconds++;

    const currentAgenda = this.agendas[this.currentIndex];
    const agendaTotalSeconds = currentAgenda.minutes * 60;

    if (this.agendaSeconds >= agendaTotalSeconds) {
      this.playAlert();
    }

    this.updateDisplay();
    this.updateProgress();
  }

  updateDisplay() {
    const hours = Math.floor(this.totalSeconds / 3600);
    const minutes = Math.floor((this.totalSeconds % 3600) / 60);
    const seconds = this.totalSeconds % 60;

    this.elements.timerDisplay.textContent =
      `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  updateProgress() {
    const currentAgenda = this.agendas[this.currentIndex];
    const agendaTotalSeconds = currentAgenda.minutes * 60;
    const progress = Math.min(100, (this.agendaSeconds / agendaTotalSeconds) * 100);

    this.elements.progressBar.style.width = progress + '%';
    this.elements.progressBar.style.background = progress >= 100 ? '#ef4444' : 'var(--primary)';
  }

  nextAgenda() {
    if (this.currentIndex < this.agendas.length - 1) {
      this.agendas[this.currentIndex].completed = true;
      this.currentIndex++;
      this.agendaSeconds = 0;
      this.elements.timerLabel.textContent = this.agendas[this.currentIndex].title;
      this.renderAgendas();
      this.showToast('다음 안건으로 이동', 'success');
    } else {
      this.agendas[this.currentIndex].completed = true;
      this.pause();
      this.elements.timerLabel.textContent = '회의 종료!';
      this.renderAgendas();
      this.showToast('회의가 종료되었습니다', 'success');
    }
  }

  playAlert() {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.2);
    } catch (e) {
      // Audio not supported
    }
  }
}

// 전역 인스턴스 생성
const meetingTimer = new MeetingTimer();
window.MeetingTimer = meetingTimer;

// 전역 함수 (HTML onclick 호환)
function addAgenda() { meetingTimer.addAgenda(); }
function start() { meetingTimer.start(); }
function pause() { meetingTimer.pause(); }
function reset() { meetingTimer.reset(); }
function nextAgenda() { meetingTimer.nextAgenda(); }

document.addEventListener('DOMContentLoaded', () => meetingTimer.init());
