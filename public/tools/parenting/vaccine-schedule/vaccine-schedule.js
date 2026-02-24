/**
 * 예방접종 스케줄 - ToolBase 기반
 * 아기 예방접종 일정 관리
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var VaccineSchedule = class VaccineSchedule extends ToolBase {
  constructor() {
    super('VaccineSchedule');
    this.filter = 'all';
    this.completed = {};
    this.birthDate = null;

    // 국가예방접종 일정 (개월 기준)
    this.vaccines = [
      { id: 'bcg', name: 'BCG (결핵)', month: 0, desc: '출생 후 4주 이내' },
      { id: 'hepb1', name: 'B형간염 1차', month: 0, desc: '출생 시' },
      { id: 'hepb2', name: 'B형간염 2차', month: 1, desc: '생후 1개월' },
      { id: 'dtap1', name: 'DTaP 1차', month: 2, desc: '디프테리아/파상풍/백일해' },
      { id: 'ipv1', name: 'IPV 1차', month: 2, desc: '폴리오' },
      { id: 'hib1', name: 'Hib 1차', month: 2, desc: '뇌수막염' },
      { id: 'pcv1', name: 'PCV 1차', month: 2, desc: '폐렴구균' },
      { id: 'dtap2', name: 'DTaP 2차', month: 4, desc: '디프테리아/파상풍/백일해' },
      { id: 'ipv2', name: 'IPV 2차', month: 4, desc: '폴리오' },
      { id: 'hib2', name: 'Hib 2차', month: 4, desc: '뇌수막염' },
      { id: 'pcv2', name: 'PCV 2차', month: 4, desc: '폐렴구균' },
      { id: 'dtap3', name: 'DTaP 3차', month: 6, desc: '디프테리아/파상풍/백일해' },
      { id: 'ipv3', name: 'IPV 3차', month: 6, desc: '폴리오' },
      { id: 'hib3', name: 'Hib 3차', month: 6, desc: '뇌수막염' },
      { id: 'pcv3', name: 'PCV 3차', month: 6, desc: '폐렴구균' },
      { id: 'hepb3', name: 'B형간염 3차', month: 6, desc: '생후 6개월' },
      { id: 'flu1', name: '인플루엔자 1차', month: 6, desc: '매년 접종' },
      { id: 'mmr1', name: 'MMR 1차', month: 12, desc: '홍역/볼거리/풍진' },
      { id: 'var1', name: '수두 1차', month: 12, desc: '생후 12-15개월' },
      { id: 'hepa1', name: 'A형간염 1차', month: 12, desc: '생후 12-23개월' },
      { id: 'pcv4', name: 'PCV 4차', month: 12, desc: '폐렴구균 추가' },
      { id: 'hib4', name: 'Hib 4차', month: 12, desc: '뇌수막염 추가' },
      { id: 'dtap4', name: 'DTaP 4차', month: 15, desc: '추가접종' },
      { id: 'hepa2', name: 'A형간염 2차', month: 18, desc: '1차 후 6개월' },
      { id: 'je1', name: '일본뇌염 1차', month: 12, desc: '사백신 기준' },
      { id: 'je2', name: '일본뇌염 2차', month: 13, desc: '1차 후 1개월' },
      { id: 'je3', name: '일본뇌염 3차', month: 24, desc: '2차 후 1년' },
      { id: 'dtap5', name: 'DTaP 5차', month: 48, desc: '만 4-6세' },
      { id: 'ipv4', name: 'IPV 4차', month: 48, desc: '만 4-6세' },
      { id: 'mmr2', name: 'MMR 2차', month: 48, desc: '만 4-6세' }
    ];
  }

  init() {
    this.initElements({
      birthDate: 'birthDate',
      vaccineList: 'vaccineList'
    });

    this.loadData();

    // 기본 생년월일 설정 (1년 전)
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    this.elements.birthDate.value = oneYearAgo.toISOString().split('T')[0];

    this.calculate();

    console.log('[VaccineSchedule] 초기화 완료');
    return this;
  }

  loadData() {
    const saved = localStorage.getItem('vaccineCompleted');
    if (saved) {
      this.completed = JSON.parse(saved);
    }
  }

  saveData() {
    localStorage.setItem('vaccineCompleted', JSON.stringify(this.completed));
  }

  setFilter(filter) {
    this.filter = filter;
    document.querySelectorAll('.filter-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.filter === filter);
    });
    this.render();
  }

  calculate() {
    const birthDate = this.elements.birthDate.value;
    if (!birthDate) return;

    this.birthDate = new Date(birthDate);
    this.render();
  }

  getStatus(vaccine) {
    if (this.completed[vaccine.id]) {
      return 'done';
    }

    const now = new Date();
    const dueDate = new Date(this.birthDate);
    dueDate.setMonth(dueDate.getMonth() + vaccine.month);

    const diffDays = Math.floor((now - dueDate) / (24 * 60 * 60 * 1000));

    if (diffDays < -30) return 'upcoming';
    if (diffDays <= 30) return 'due';
    return 'overdue';
  }

  getDueDate(vaccine) {
    const dueDate = new Date(this.birthDate);
    dueDate.setMonth(dueDate.getMonth() + vaccine.month);
    return dueDate;
  }

  toggleComplete(id) {
    if (this.completed[id]) {
      delete this.completed[id];
    } else {
      this.completed[id] = new Date().toISOString();
    }
    this.saveData();
    this.render();
  }

  render() {
    if (!this.birthDate) {
      this.elements.vaccineList.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 2rem;">아기 생년월일을 입력하세요</div>';
      return;
    }

    const statusText = { done: '완료', due: '접종 예정', upcoming: '예정', overdue: '미접종' };

    let filtered = this.vaccines;
    if (this.filter !== 'all') {
      filtered = this.vaccines.filter(v => this.getStatus(v) === this.filter);
    }

    if (filtered.length === 0) {
      this.elements.vaccineList.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 2rem;">해당 항목이 없습니다</div>';
      return;
    }

    this.elements.vaccineList.innerHTML = filtered.map(vaccine => {
      const status = this.getStatus(vaccine);
      const dueDate = this.getDueDate(vaccine);
      const dueDateStr = `${dueDate.getFullYear()}.${(dueDate.getMonth() + 1).toString().padStart(2, '0')}.${dueDate.getDate().toString().padStart(2, '0')}`;

      return `<div class="vaccine-item">
        <div class="vaccine-header">
          <div>
            <span class="vaccine-name">${vaccine.name}</span>
            <span class="age-badge">${vaccine.month}개월</span>
          </div>
          <span class="vaccine-status ${status}">${statusText[status]}</span>
        </div>
        <div class="vaccine-details">
          ${vaccine.desc}<br>
          접종일: ${dueDateStr}
          ${this.completed[vaccine.id] ? `<br>완료일: ${new Date(this.completed[vaccine.id]).toLocaleDateString()}` : ''}
        </div>
        <div class="vaccine-check">
          <span class="check-btn" onclick="vaccineSchedule.toggleComplete('${vaccine.id}')">
            ${this.completed[vaccine.id] ? '↩취소' : '완료'}
          </span>
        </div>
      </div>`;
    }).join('');
  }
}

// 전역 인스턴스 생성
const vaccineSchedule = new VaccineSchedule();
window.VaccineSchedule = vaccineSchedule;

// 전역 함수 (HTML onclick 호환)
function setFilter(filter) { vaccineSchedule.setFilter(filter); }
function calculate() { vaccineSchedule.calculate(); }

document.addEventListener('DOMContentLoaded', () => vaccineSchedule.init());
