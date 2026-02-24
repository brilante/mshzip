/**
 * 뽀모도로 타이머 - ToolBase 기반
 * 집중 시간 관리
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class PomodoroTimer extends ToolBase {
  constructor() {
    super('PomodoroTimer');
    this.timeLeft = 25 * 60;
    this.totalTime = 25 * 60;
    this.isRunning = false;
    this.interval = null;
    this.currentMode = 'work';
    this.sessionCount = 0;
    this.totalFocusTime = 0;
    this.tasks = [];
    this.circumference = 2 * Math.PI * 90;
  }

  init() {
    this.initElements({
      minutes: 'minutes',
      seconds: 'seconds',
      startBtn: 'startBtn',
      resetBtn: 'resetBtn',
      progressCircle: '.progress-ring-circle',
      sessionCount: 'sessionCount',
      totalTime: 'totalTime',
      workTime: 'workTime',
      shortBreak: 'shortBreak',
      longBreak: 'longBreak',
      sessionsUntilLong: 'sessionsUntilLong',
      soundEnabled: 'soundEnabled',
      autoStart: 'autoStart',
      taskList: 'taskList',
      newTask: 'newTask',
      addTask: 'addTask'
    });

    // querySelector for progress circle
    this.progressCircle = document.querySelector('.progress-ring-circle');
    if (this.progressCircle) {
      this.progressCircle.style.strokeDasharray = this.circumference;
    }

    this.loadData();
    this.setupEvents();
    this.updateDisplay();
    this.renderTasks();

    console.log('[PomodoroTimer] 초기화 완료');
    return this;
  }

  loadData() {
    try {
      this.sessionCount = parseInt(localStorage.getItem('pomodoroSessions')) || 0;
      this.totalFocusTime = parseInt(localStorage.getItem('pomodoroFocusTime')) || 0;
      const savedTasks = localStorage.getItem('pomodoroTasks');
      if (savedTasks) {
        this.tasks = JSON.parse(savedTasks);
      }
    } catch (e) {}
  }

  saveData() {
    localStorage.setItem('pomodoroSessions', this.sessionCount);
    localStorage.setItem('pomodoroFocusTime', this.totalFocusTime);
    localStorage.setItem('pomodoroTasks', JSON.stringify(this.tasks));
  }

  setupEvents() {
    this.elements.startBtn.addEventListener('click', () => this.toggleTimer());
    this.elements.resetBtn.addEventListener('click', () => this.resetTimer());
    this.elements.addTask.addEventListener('click', () => this.addTask());
    this.elements.newTask.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.addTask();
    });

    document.querySelectorAll('.mode-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        if (!this.isRunning) {
          this.setMode(tab.dataset.mode);
        }
      });
    });
  }

  updateDisplay() {
    const mins = Math.floor(this.timeLeft / 60);
    const secs = this.timeLeft % 60;
    this.elements.minutes.textContent = mins.toString().padStart(2, '0');
    this.elements.seconds.textContent = secs.toString().padStart(2, '0');

    const progress = this.timeLeft / this.totalTime;
    if (this.progressCircle) {
      this.progressCircle.style.strokeDashoffset = this.circumference * (1 - progress);
    }

    this.elements.sessionCount.textContent = this.sessionCount;
    this.elements.totalTime.textContent = this.totalFocusTime + '분';
  }

  toggleTimer() {
    if (this.isRunning) {
      clearInterval(this.interval);
      this.elements.startBtn.textContent = '시작';
      this.isRunning = false;
    } else {
      this.interval = setInterval(() => this.tick(), 1000);
      this.elements.startBtn.textContent = '일시정지';
      this.isRunning = true;
    }
  }

  tick() {
    this.timeLeft--;
    this.updateDisplay();

    if (this.timeLeft <= 0) {
      clearInterval(this.interval);
      this.isRunning = false;
      this.elements.startBtn.textContent = '시작';

      if (this.currentMode === 'work') {
        this.sessionCount++;
        this.totalFocusTime += parseInt(this.elements.workTime.value);
        this.saveData();

        if (this.elements.soundEnabled.checked) {
          this.playSound();
        }

        const sessionsUntilLong = parseInt(this.elements.sessionsUntilLong.value);
        if (this.sessionCount % sessionsUntilLong === 0) {
          this.setMode('long');
        } else {
          this.setMode('short');
        }
      } else {
        if (this.elements.soundEnabled.checked) {
          this.playSound();
        }
        this.setMode('work');
      }

      if (this.elements.autoStart.checked) {
        setTimeout(() => this.toggleTimer(), 1000);
      }
    }
  }

  setMode(mode) {
    this.currentMode = mode;
    document.querySelectorAll('.mode-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.mode === mode);
    });

    let time;
    if (mode === 'work') {
      time = parseInt(this.elements.workTime.value);
    } else if (mode === 'short') {
      time = parseInt(this.elements.shortBreak.value);
    } else {
      time = parseInt(this.elements.longBreak.value);
    }

    this.timeLeft = time * 60;
    this.totalTime = time * 60;
    this.updateDisplay();
  }

  resetTimer() {
    clearInterval(this.interval);
    this.isRunning = false;
    this.elements.startBtn.textContent = '시작';
    this.setMode(this.currentMode);
  }

  playSound() {
    try {
      const audio = new AudioContext();
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.connect(gain);
      gain.connect(audio.destination);
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gain.gain.setValueAtTime(0.3, audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audio.currentTime + 0.5);
      oscillator.start(audio.currentTime);
      oscillator.stop(audio.currentTime + 0.5);
    } catch (e) {}
  }

  renderTasks() {
    this.elements.taskList.innerHTML = this.tasks.map((task, i) => `
      <div class="task-item ${task.completed ? 'completed' : ''}">
        <input type="checkbox" ${task.completed ? 'checked' : ''} onchange="pomodoroTimer.toggleTask(${i})">
        <span>${this.escapeHtml(task.text)}</span>
        <button onclick="pomodoroTimer.deleteTask(${i})">삭제</button>
      </div>
    `).join('');
  }

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  addTask() {
    const text = this.elements.newTask.value.trim();
    if (text) {
      this.tasks.push({ text, completed: false });
      this.saveData();
      this.elements.newTask.value = '';
      this.renderTasks();
    }
  }

  toggleTask(idx) {
    this.tasks[idx].completed = !this.tasks[idx].completed;
    this.saveData();
    this.renderTasks();
  }

  deleteTask(idx) {
    this.tasks.splice(idx, 1);
    this.saveData();
    this.renderTasks();
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const pomodoroTimer = new PomodoroTimer();
window.PomodoroTimer = pomodoroTimer;

document.addEventListener('DOMContentLoaded', () => pomodoroTimer.init());
