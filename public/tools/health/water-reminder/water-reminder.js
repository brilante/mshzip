/**
 * 수분 섭취 알림 - ToolBase 기반
 * 수분 섭취량 기록 및 알림
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class WaterReminder extends ToolBase {
  constructor() {
    super('WaterReminder');
    this.today = new Date().toDateString();
    this.logs = JSON.parse(localStorage.getItem('waterLogs_' + this.today)) || [];
    this.goal = parseInt(localStorage.getItem('waterGoal')) || 2000;
    this.reminderInterval = parseInt(localStorage.getItem('reminderInterval')) || 60;
  }

  init() {
    this.initElements({
      currentIntake: 'currentIntake',
      goalIntake: 'goalIntake',
      waterFill: 'waterFill',
      waterGoal: 'waterGoal',
      reminderInterval: 'reminderInterval',
      enableReminder: 'enableReminder',
      customAmount: 'customAmount',
      historyList: 'historyList'
    });

    this.setupEvents();
    this.updateUI();

    console.log('[WaterReminder] 초기화 완료');
    return this;
  }

  setupEvents() {
    this.elements.waterGoal.addEventListener('change', (e) => {
      this.goal = parseInt(e.target.value) || 2000;
      localStorage.setItem('waterGoal', this.goal);
      this.updateUI();
    });

    this.elements.reminderInterval.addEventListener('change', (e) => {
      this.reminderInterval = parseInt(e.target.value) || 60;
      localStorage.setItem('reminderInterval', this.reminderInterval);
    });

    this.elements.enableReminder.addEventListener('change', (e) => {
      if (e.target.checked) {
        if ('Notification' in window) {
          Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
              this.startReminder();
              this.showToast('알림이 활성화되었습니다!', 'success');
            }
          });
        }
      }
    });
  }

  saveLogs() {
    localStorage.setItem('waterLogs_' + this.today, JSON.stringify(this.logs));
  }

  updateUI() {
    const total = this.logs.reduce((sum, l) => sum + l.amount, 0);
    const percent = Math.min((total / this.goal) * 100, 100);

    this.elements.currentIntake.textContent = total;
    this.elements.goalIntake.textContent = this.goal;
    this.elements.waterFill.style.height = percent + '%';
    this.elements.waterGoal.value = this.goal;
    this.elements.reminderInterval.value = this.reminderInterval;

    this.renderHistory();
  }

  renderHistory() {
    this.elements.historyList.innerHTML = this.logs.slice().reverse().map(log => {
      const time = new Date(log.time);
      return '<div class="history-item"><span>' + time.toLocaleTimeString() + '</span><span>' + log.amount + ' ml</span></div>';
    }).join('') || '<p style="color:#999;text-align:center">오늘 기록이 없습니다</p>';
  }

  addWater(amount) {
    this.logs.push({ amount, time: new Date().toISOString() });
    this.saveLogs();
    this.updateUI();
    this.showToast(`${amount}ml 추가됨`, 'success');
  }

  addCustom() {
    const amount = parseInt(this.elements.customAmount.value);
    if (!amount || amount <= 0) {
      this.showToast('올바른 양을 입력하세요', 'error');
      return;
    }
    this.addWater(amount);
    this.elements.customAmount.value = '';
  }

  startReminder() {
    setInterval(() => {
      if (this.elements.enableReminder.checked) {
        new Notification('물 마시기 알림', {
          body: '물 한 잔 마실 시간입니다! ',
          icon: ''
        });
      }
    }, this.reminderInterval * 60 * 1000);
  }
}

// 전역 인스턴스 생성
const waterReminder = new WaterReminder();
window.WaterReminder = waterReminder;

document.addEventListener('DOMContentLoaded', () => waterReminder.init());
