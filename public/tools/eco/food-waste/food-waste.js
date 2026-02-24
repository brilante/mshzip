/**
 * 음식물 쓰레기 관리 - ToolBase 기반
 * 음식물 쓰레기 추적 및 줄이기
 * @created 2026-01-13
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var FoodWaste = class FoodWaste extends ToolBase {
  constructor() {
    super('FoodWaste');
    this.logs = [];
    this.selectedCategory = 'leftover';

    this.categories = {
      leftover: { name: '잔반', icon: '' },
      expired: { name: '유통기한', icon: '' },
      spoiled: { name: '상한 음식', icon: '' },
      prep: { name: '조리 중', icon: '' },
      peel: { name: '껍질/뼈', icon: '' },
      other: { name: '기타', icon: '' }
    };
  }

  init() {
    this.initElements({
      categorySelect: 'categorySelect',
      foodName: 'foodName',
      foodAmount: 'foodAmount',
      weekTotal: 'weekTotal',
      co2Impact: 'co2Impact',
      costWasted: 'costWasted',
      avgDaily: 'avgDaily',
      weeklyChart: 'weeklyChart',
      logList: 'logList'
    });

    this.loadData();
    this.renderCategories();
    this.render();

    console.log('[FoodWaste] 초기화 완료');
    return this;
  }

  loadData() {
    try {
      const saved = localStorage.getItem('foodWasteData');
      if (saved) {
        this.logs = JSON.parse(saved);
      }
    } catch (e) {}
  }

  saveData() {
    localStorage.setItem('foodWasteData', JSON.stringify(this.logs));
  }

  renderCategories() {
    this.elements.categorySelect.innerHTML = Object.entries(this.categories).map(([key, cat]) =>
      `<div class="category-btn ${key === this.selectedCategory ? 'selected' : ''}" onclick="foodWaste.selectCategory('${key}')">
        <span class="category-icon">${cat.icon}</span>${cat.name}
      </div>`
    ).join('');
  }

  selectCategory(category) {
    this.selectedCategory = category;
    this.renderCategories();
  }

  addLog() {
    const name = this.elements.foodName.value.trim();
    const amount = parseInt(this.elements.foodAmount.value);

    if (!name) {
      alert('음식명을 입력해주세요.');
      return;
    }
    if (!amount || amount <= 0) {
      alert('양(g)을 입력해주세요.');
      return;
    }

    this.logs.push({
      id: Date.now(),
      name,
      amount,
      category: this.selectedCategory,
      timestamp: new Date().toISOString()
    });

    this.saveData();
    this.render();

    this.elements.foodName.value = '';
    this.elements.foodAmount.value = '';

    this.showToast('기록되었습니다', 'success');
  }

  deleteLog(id) {
    this.logs = this.logs.filter(log => log.id !== id);
    this.saveData();
    this.render();
  }

  getWeekLogs() {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return this.logs.filter(log => new Date(log.timestamp) >= weekAgo);
  }

  render() {
    const weekLogs = this.getWeekLogs();
    const weekTotal = weekLogs.reduce((sum, log) => sum + log.amount, 0);
    const co2 = (weekTotal / 1000) * 2.5;
    const cost = Math.round(weekTotal * 5);

    const daysWithLogs = [...new Set(this.logs.map(l => new Date(l.timestamp).toDateString()))].length;
    const avgDaily = daysWithLogs > 0 ? Math.round(this.logs.reduce((sum, l) => sum + l.amount, 0) / daysWithLogs) : 0;

    this.elements.weekTotal.textContent = weekTotal.toLocaleString();
    this.elements.co2Impact.textContent = co2.toFixed(1);
    this.elements.costWasted.textContent = cost.toLocaleString();
    this.elements.avgDaily.textContent = avgDaily;

    this.renderChart();
    this.renderLogList();
  }

  renderChart() {
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    const data = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toDateString();
      const dayLogs = this.logs.filter(l => new Date(l.timestamp).toDateString() === dateStr);
      const total = dayLogs.reduce((sum, l) => sum + l.amount, 0);
      data.push({ day: days[date.getDay()], amount: total });
    }

    const maxAmount = Math.max(...data.map(d => d.amount), 1);

    this.elements.weeklyChart.innerHTML = data.map(d => {
      const height = (d.amount / maxAmount) * 100;
      return `<div class="chart-bar" style="height: ${Math.max(height, 4)}px;" title="${d.amount}g">
        <span class="chart-bar-label">${d.day}</span>
      </div>`;
    }).join('');
  }

  renderLogList() {
    const recentLogs = [...this.logs].reverse().slice(0, 10);

    if (recentLogs.length === 0) {
      this.elements.logList.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 1rem;">기록이 없습니다 </div>';
      return;
    }

    this.elements.logList.innerHTML = recentLogs.map(log => {
      const cat = this.categories[log.category];
      const time = new Date(log.timestamp);
      const dateStr = `${time.getMonth() + 1}/${time.getDate()}`;

      return `<div class="log-item">
        <div class="log-info">
          <span style="font-size: 1.25rem;">${cat.icon}</span>
          <div>
            <div class="log-name">${log.name}</div>
            <div class="log-meta">${log.amount}g · ${dateStr} · ${cat.name}</div>
          </div>
        </div>
        <button class="btn-delete" onclick="foodWaste.deleteLog(${log.id})">삭제</button>
      </div>`;
    }).join('');
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const foodWaste = new FoodWaste();
window.FoodWaste = foodWaste;

document.addEventListener('DOMContentLoaded', () => foodWaste.init());
