/**
 * 엔진오일 교환 주기 - ToolBase 기반
 * 오일 교환 시기 관리
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var OilChange = class OilChange extends ToolBase {
  constructor() {
    super('OilChange');
    this.data = {
      intervalKm: 10000,
      lastChangeDate: '',
      lastChangeKm: 0,
      currentKm: 0,
      history: []
    };
  }

  init() {
    this.initElements({
      intervalKm: 'intervalKm',
      lastChangeDate: 'lastChangeDate',
      lastChangeKm: 'lastChangeKm',
      currentKm: 'currentKm',
      statusDisplay: 'statusDisplay',
      statusText: 'statusText',
      statusSub: 'statusSub',
      progressFill: 'progressFill',
      usedKm: 'usedKm',
      remainKm: 'remainKm',
      historyList: 'historyList'
    });

    this.loadData();
    this.populateInputs();
    this.update();
    this.renderHistory();

    console.log('[OilChange] 초기화 완료');
    return this;
  }

  loadData() {
    const saved = localStorage.getItem('oilChangeData');
    if (saved) {
      this.data = JSON.parse(saved);
    }
  }

  saveData() {
    localStorage.setItem('oilChangeData', JSON.stringify(this.data));
  }

  populateInputs() {
    this.elements.intervalKm.value = this.data.intervalKm;
    this.elements.lastChangeDate.value = this.data.lastChangeDate || '';
    this.elements.lastChangeKm.value = this.data.lastChangeKm || '';
    this.elements.currentKm.value = this.data.currentKm || '';
  }

  save() {
    this.data.intervalKm = parseInt(this.elements.intervalKm.value) || 10000;
    this.data.lastChangeDate = this.elements.lastChangeDate.value;
    this.data.lastChangeKm = parseInt(this.elements.lastChangeKm.value) || 0;
    this.data.currentKm = parseInt(this.elements.currentKm.value) || 0;

    this.saveData();
    this.update();
    this.showToast('저장되었습니다', 'success');
  }

  update() {
    const { intervalKm, lastChangeKm, currentKm } = this.data;
    const usedKm = currentKm - lastChangeKm;
    const remainKm = Math.max(0, intervalKm - usedKm);
    const progress = Math.min(100, (usedKm / intervalKm) * 100);

    let status, icon, color;

    if (remainKm <= 0) {
      status = '교환 필요';
      icon = '';
      color = '#ef4444';
      this.elements.statusDisplay.className = 'status-display danger';
      this.elements.statusSub.textContent = `${Math.abs(remainKm).toLocaleString()}km 초과됨`;
    } else if (remainKm <= intervalKm * 0.2) {
      status = '교환 임박';
      icon = '';
      color = '#f59e0b';
      this.elements.statusDisplay.className = 'status-display warning';
      this.elements.statusSub.textContent = `교환까지 ${remainKm.toLocaleString()}km 남음`;
    } else {
      status = '양호';
      icon = '';
      color = '#22c55e';
      this.elements.statusDisplay.className = 'status-display good';
      this.elements.statusSub.textContent = `교환까지 ${remainKm.toLocaleString()}km 남음`;
    }

    document.querySelector('.status-icon').textContent = icon;
    this.elements.statusText.textContent = status;

    this.elements.progressFill.style.width = progress + '%';
    this.elements.progressFill.style.background = color;

    this.elements.usedKm.textContent = `${usedKm.toLocaleString()}km 사용`;
    this.elements.remainKm.textContent = remainKm > 0 ? `${remainKm.toLocaleString()}km 남음` : '교환 필요';
  }

  recordChange() {
    const currentKm = parseInt(this.elements.currentKm.value) || 0;

    if (currentKm <= 0) {
      this.showToast('현재 주행거리를 입력하세요', 'error');
      return;
    }

    const today = new Date().toISOString().split('T')[0];

    // 이력에 추가
    this.data.history.unshift({
      date: today,
      km: currentKm
    });

    // 최대 20개 유지
    if (this.data.history.length > 20) {
      this.data.history = this.data.history.slice(0, 20);
    }

    // 마지막 교환 정보 업데이트
    this.data.lastChangeDate = today;
    this.data.lastChangeKm = currentKm;

    this.elements.lastChangeDate.value = today;
    this.elements.lastChangeKm.value = currentKm;

    this.saveData();
    this.update();
    this.renderHistory();

    this.showToast('교환 기록이 저장되었습니다', 'success');
  }

  renderHistory() {
    if (this.data.history.length === 0) {
      this.elements.historyList.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 1rem;">기록이 없습니다</div>';
      return;
    }

    this.elements.historyList.innerHTML = this.data.history.map((item, i) => {
      const dateObj = new Date(item.date);
      const dateStr = `${dateObj.getFullYear()}.${(dateObj.getMonth() + 1).toString().padStart(2, '0')}.${dateObj.getDate().toString().padStart(2, '0')}`;

      return `<div class="history-item">
        <span>${dateStr}</span>
        <span>${item.km.toLocaleString()}km</span>
      </div>`;
    }).join('');
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const oilChange = new OilChange();
window.OilChange = oilChange;

document.addEventListener('DOMContentLoaded', () => oilChange.init());
