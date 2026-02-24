/**
 * 체중 추적기 - ToolBase 기반
 * 반려동물 체중 관리
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class PetWeightTracker extends ToolBase {
  constructor() {
    super('PetWeightTracker');
    this.records = [];
  }

  init() {
    this.initElements({
      petName: 'petName',
      targetWeight: 'targetWeight',
      newDate: 'newDate',
      newWeight: 'newWeight',
      currentWeight: 'currentWeight',
      weightChange: 'weightChange',
      toGoal: 'toGoal',
      chartContainer: 'chartContainer',
      recordList: 'recordList'
    });

    this.load();
    this.elements.newDate.value = new Date().toISOString().split('T')[0];
    this.render();

    console.log('[PetWeightTracker] 초기화 완료');
    return this;
  }

  load() {
    try {
      const saved = localStorage.getItem('pet-weight-tracker');
      if (saved) {
        const data = JSON.parse(saved);
        this.records = data.records || [];
        this.elements.petName.value = data.petName || '';
        this.elements.targetWeight.value = data.targetWeight || '';
      }
    } catch (e) {}
  }

  save() {
    localStorage.setItem('pet-weight-tracker', JSON.stringify({
      records: this.records,
      petName: this.elements.petName.value,
      targetWeight: this.elements.targetWeight.value
    }));
  }

  addRecord() {
    const date = this.elements.newDate.value;
    const weight = parseFloat(this.elements.newWeight.value);

    if (!date || isNaN(weight) || weight <= 0) {
      this.showToast('날짜와 체중을 입력하세요', 'error');
      return;
    }

    // 같은 날짜 기록이 있으면 업데이트
    const existing = this.records.findIndex(r => r.date === date);
    if (existing >= 0) {
      this.records[existing].weight = weight;
    } else {
      this.records.push({ date, weight });
    }

    // 날짜순 정렬
    this.records.sort((a, b) => new Date(a.date) - new Date(b.date));

    this.elements.newWeight.value = '';
    this.save();
    this.render();
    this.showToast('기록이 추가되었습니다', 'success');
  }

  removeRecord(date) {
    this.records = this.records.filter(r => r.date !== date);
    this.save();
    this.render();
  }

  clearAll() {
    if (this.records.length === 0) return;
    if (!confirm('모든 기록을 삭제하시겠습니까?')) return;

    this.records = [];
    this.save();
    this.render();
    this.showToast('초기화되었습니다', 'success');
  }

  exportData() {
    const petName = this.elements.petName.value || '반려동물';

    let text = `${petName} 체중 기록\n`;
    text += '='.repeat(30) + '\n\n';

    this.records.forEach(record => {
      text += `${record.date}: ${record.weight} kg\n`;
    });

    if (this.records.length > 0) {
      const first = this.records[0].weight;
      const last = this.records[this.records.length - 1].weight;
      const diff = last - first;
      text += `\n총 변화: ${diff > 0 ? '+' : ''}${diff.toFixed(1)} kg\n`;
    }

    this.copyToClipboard(text);
  }

  formatDate(dateStr) {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  }

  render() {
    this.updateStats();
    this.renderChart();
    this.renderList();
  }

  updateStats() {
    const target = parseFloat(this.elements.targetWeight.value) || 0;

    if (this.records.length === 0) {
      this.elements.currentWeight.textContent = '-';
      this.elements.weightChange.textContent = '-';
      this.elements.toGoal.textContent = '-';
      return;
    }

    const current = this.records[this.records.length - 1].weight;
    const first = this.records[0].weight;
    const change = current - first;

    this.elements.currentWeight.textContent = `${current} kg`;
    this.elements.weightChange.textContent = `${change > 0 ? '+' : ''}${change.toFixed(1)} kg`;
    this.elements.weightChange.style.color = change > 0 ? '#ef4444' : change < 0 ? '#22c55e' : 'var(--primary)';

    if (target > 0) {
      const toGoal = current - target;
      this.elements.toGoal.textContent = `${toGoal > 0 ? '+' : ''}${toGoal.toFixed(1)} kg`;
      this.elements.toGoal.style.color = Math.abs(toGoal) < 0.5 ? '#22c55e' : 'var(--primary)';
    } else {
      this.elements.toGoal.textContent = '-';
    }
  }

  renderChart() {
    if (this.records.length < 2) {
      this.elements.chartContainer.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding-top: 80px;">2개 이상의 기록이 필요합니다</div>';
      return;
    }

    const displayRecords = this.records.slice(-10); // 최근 10개
    const weights = displayRecords.map(r => r.weight);
    const minWeight = Math.min(...weights) * 0.95;
    const maxWeight = Math.max(...weights) * 1.05;
    const range = maxWeight - minWeight || 1;

    const containerWidth = this.elements.chartContainer.offsetWidth - 40;
    const barWidth = Math.min(40, containerWidth / displayRecords.length - 10);
    const gap = (containerWidth - barWidth * displayRecords.length) / (displayRecords.length + 1);

    let html = '';
    displayRecords.forEach((record, idx) => {
      const height = ((record.weight - minWeight) / range) * 120 + 20;
      const left = gap + idx * (barWidth + gap);

      html += `
        <div class="chart-bar" style="left: ${left}px; height: ${height}px; width: ${barWidth}px;">
          <div class="chart-value" style="left: ${barWidth / 2}px;">${record.weight}</div>
        </div>
        <div class="chart-label" style="left: ${left + barWidth / 2}px;">${this.formatDate(record.date)}</div>
      `;
    });

    this.elements.chartContainer.innerHTML = html;
  }

  renderList() {
    if (this.records.length === 0) {
      this.elements.recordList.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 1rem;">기록이 없습니다</div>';
      return;
    }

    // 최신순 표시
    const reversed = [...this.records].reverse();

    this.elements.recordList.innerHTML = reversed.map((record, idx) => {
      let change = '';
      if (idx < reversed.length - 1) {
        const diff = record.weight - reversed[idx + 1].weight;
        if (diff !== 0) {
          change = `<span style="color: ${diff > 0 ? '#ef4444' : '#22c55e'}; font-size: 0.8rem;">${diff > 0 ? '▲' : '▼'} ${Math.abs(diff).toFixed(1)}</span>`;
        }
      }

      return `
        <div class="record-item">
          <div>
            <span style="font-weight: 500;">${record.date}</span>
            ${change}
          </div>
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <span style="font-weight: 600;">${record.weight} kg</span>
            <button onclick="petWeightTracker.removeRecord('${record.date}')" style="background: none; border: none; cursor: pointer; opacity: 0.5;"></button>
          </div>
        </div>
      `;
    }).join('');
  }
}

// 전역 인스턴스 생성
const petWeightTracker = new PetWeightTracker();
window.PetWeightTracker = petWeightTracker;

// 전역 함수 (HTML onclick 호환)
function addRecord() { petWeightTracker.addRecord(); }
function exportData() { petWeightTracker.exportData(); }
function clearAll() { petWeightTracker.clearAll(); }

document.addEventListener('DOMContentLoaded', () => petWeightTracker.init());
