/**
 * 수분 섭취 트래커 - ToolBase 기반
 * 하루 물 섭취량 관리
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var WaterIntake = class WaterIntake extends ToolBase {
  constructor() {
    super('WaterIntake');
    this.current = 0;
    this.goal = 2000;
    this.history = [];
  }

  init() {
    this.initElements({
      goalInput: 'goalInput',
      currentAmount: 'currentAmount',
      goalAmount: 'goalAmount',
      progressFill: 'progressFill',
      progressText: 'progressText',
      cupsDisplay: 'cupsDisplay',
      historyList: 'historyList'
    });

    this.load();
    this.updateDisplay();

    console.log('[WaterIntake] 초기화 완료');
    return this;
  }

  load() {
    try {
      const saved = localStorage.getItem('water-intake-data');
      if (saved) {
        const data = JSON.parse(saved);

        // 오늘 날짜가 아니면 리셋
        const today = new Date().toDateString();
        if (data.date === today) {
          this.current = data.current || 0;
          this.history = data.history || [];
        }

        this.goal = data.goal || 2000;
      }
    } catch (e) {}

    this.elements.goalInput.value = this.goal;
  }

  save() {
    const data = {
      current: this.current,
      goal: this.goal,
      history: this.history,
      date: new Date().toDateString()
    };
    localStorage.setItem('water-intake-data', JSON.stringify(data));
  }

  add(amount) {
    this.current += amount;
    this.history.push({
      amount: amount,
      time: new Date().toISOString()
    });
    this.save();
    this.updateDisplay();

    // 목표 달성 시 축하
    if (this.current >= this.goal && this.current - amount < this.goal) {
      this.showToast('오늘의 목표 달성!', 'success');
    }
  }

  addCustom() {
    const amount = prompt('섭취량 입력 (ml)');
    if (amount && !isNaN(amount) && parseInt(amount) > 0) {
      this.add(parseInt(amount));
    }
  }

  setGoal() {
    const goal = parseInt(this.elements.goalInput.value);
    if (!goal || goal < 500 || goal > 5000) {
      this.showToast('500~5000ml 사이로 설정하세요', 'error');
      return;
    }
    this.goal = goal;
    this.save();
    this.updateDisplay();
    this.showToast('목표가 설정되었습니다', 'success');
  }

  reset() {
    this.current = 0;
    this.history = [];
    this.save();
    this.updateDisplay();
    this.showToast('기록이 리셋되었습니다', 'success');
  }

  updateDisplay() {
    this.elements.currentAmount.textContent = this.current;
    this.elements.goalAmount.textContent = this.goal;

    // 진행률
    const progress = Math.min((this.current / this.goal) * 100, 100);
    this.elements.progressFill.style.width = progress + '%';
    this.elements.progressText.textContent = Math.round(progress) + '%';

    // 색상 변경
    const fill = this.elements.progressFill;
    if (progress >= 100) {
      fill.style.background = 'linear-gradient(90deg, #22c55e, #16a34a)';
    } else {
      fill.style.background = 'linear-gradient(90deg, #3b82f6, #0ea5e9)';
    }

    // 컵 아이콘 표시 (200ml = 1컵)
    const cups = Math.floor(this.current / 200);
    const maxCups = Math.ceil(this.goal / 200);
    this.elements.cupsDisplay.innerHTML = Array(Math.min(maxCups, 10)).fill(0).map((_, i) =>
      `<span class="cup-icon ${i < cups ? 'filled' : ''}"></span>`
    ).join('');

    // 기록 표시
    this.renderHistory();
  }

  renderHistory() {
    const list = this.elements.historyList;

    if (this.history.length === 0) {
      list.innerHTML = '<div style="text-align: center; color: var(--text-secondary);">기록이 없습니다</div>';
      return;
    }

    list.innerHTML = this.history.slice().reverse().map(item => {
      const time = new Date(item.time);
      const timeStr = time.toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit'
      });
      return `
        <div class="history-item">
          <span>${item.amount}ml</span>
          <span>${timeStr}</span>
        </div>
      `;
    }).join('');
  }
}

// 전역 인스턴스 생성
const waterIntake = new WaterIntake();
window.WaterIntake = waterIntake;

document.addEventListener('DOMContentLoaded', () => waterIntake.init());
