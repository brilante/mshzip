/**
 * 주행 기록장 - ToolBase 기반
 * 주행 거리 및 주유 기록
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var MileageLog = class MileageLog extends ToolBase {
  constructor() {
    super('MileageLog');
    this.logs = [];
  }

  init() {
    this.initElements({
      logDate: 'logDate',
      logDistance: 'logDistance',
      logFuel: 'logFuel',
      logCost: 'logCost',
      logMemo: 'logMemo',
      logList: 'logList',
      totalDistance: 'totalDistance',
      avgMileage: 'avgMileage',
      totalCost: 'totalCost'
    });

    this.loadLogs();
    this.setDefaultDate();
    this.render();
    this.updateStats();

    console.log('[MileageLog] 초기화 완료');
    return this;
  }

  loadLogs() {
    const saved = localStorage.getItem('mileageLogs');
    if (saved) {
      this.logs = JSON.parse(saved);
    }
  }

  saveLogs() {
    localStorage.setItem('mileageLogs', JSON.stringify(this.logs));
  }

  setDefaultDate() {
    const today = new Date().toISOString().split('T')[0];
    this.elements.logDate.value = today;
  }

  addLog() {
    const date = this.elements.logDate.value;
    const distance = parseFloat(this.elements.logDistance.value) || 0;
    const fuel = parseFloat(this.elements.logFuel.value) || 0;
    const cost = parseFloat(this.elements.logCost.value) || 0;
    const memo = this.elements.logMemo.value.trim();

    if (!date || distance <= 0) {
      this.showToast('날짜와 주행거리를 입력하세요', 'error');
      return;
    }

    const mileage = fuel > 0 ? (distance / fuel).toFixed(1) : 0;

    this.logs.unshift({
      id: Date.now(),
      date,
      distance,
      fuel,
      cost,
      mileage,
      memo
    });

    this.saveLogs();
    this.render();
    this.updateStats();
    this.clearInputs();

    this.showToast('기록이 추가되었습니다', 'success');
  }

  deleteLog(id) {
    this.logs = this.logs.filter(log => log.id !== id);
    this.saveLogs();
    this.render();
    this.updateStats();
    this.showToast('기록이 삭제되었습니다', 'success');
  }

  clearAll() {
    if (confirm('모든 기록을 삭제하시겠습니까?')) {
      this.logs = [];
      this.saveLogs();
      this.render();
      this.updateStats();
      this.showToast('모든 기록이 삭제되었습니다', 'success');
    }
  }

  clearInputs() {
    this.elements.logDistance.value = '';
    this.elements.logFuel.value = '';
    this.elements.logCost.value = '';
    this.elements.logMemo.value = '';
  }

  updateStats() {
    const totalDistance = this.logs.reduce((sum, log) => sum + log.distance, 0);
    const totalFuel = this.logs.reduce((sum, log) => sum + log.fuel, 0);
    const totalCost = this.logs.reduce((sum, log) => sum + log.cost, 0);
    const avgMileage = totalFuel > 0 ? (totalDistance / totalFuel).toFixed(1) : 0;

    this.elements.totalDistance.textContent = totalDistance.toLocaleString();
    this.elements.avgMileage.textContent = avgMileage;
    this.elements.totalCost.textContent = (totalCost / 10000).toFixed(1);
  }

  render() {
    if (this.logs.length === 0) {
      this.elements.logList.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 2rem;">기록이 없습니다</div>';
      return;
    }

    this.elements.logList.innerHTML = this.logs.map(log => {
      const dateObj = new Date(log.date);
      const dateStr = `${dateObj.getFullYear()}.${(dateObj.getMonth() + 1).toString().padStart(2, '0')}.${dateObj.getDate().toString().padStart(2, '0')}`;

      return `<div class="log-item">
        <div class="log-header">
          <span class="log-date">${dateStr}</span>
          <span class="log-delete" onclick="mileageLog.deleteLog(${log.id})">삭제</span>
        </div>
        <div class="log-details">
          <div>${log.distance.toLocaleString()}km</div>
          <div>${log.fuel}L</div>
          <div>${log.mileage}km/L</div>
        </div>
        ${log.cost > 0 ? `<div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 0.5rem;">${log.cost.toLocaleString()}원</div>` : ''}
        ${log.memo ? `<div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 0.25rem;">${log.memo}</div>` : ''}
      </div>`;
    }).join('');
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const mileageLog = new MileageLog();
window.MileageLog = mileageLog;

document.addEventListener('DOMContentLoaded', () => mileageLog.init());
