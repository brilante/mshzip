/**
 * 예방접종 추적기 - ToolBase 기반
 * 반려동물 예방접종 관리
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class VaccinationTracker extends ToolBase {
  constructor() {
    super('VaccinationTracker');
    this.records = [];

    this.defaultVaccines = {
      dog: [
        { name: '종합백신(DHPPL)', interval: 365 },
        { name: '광견병', interval: 365 },
        { name: '코로나장염', interval: 365 },
        { name: '켄넬코프', interval: 365 },
        { name: '심장사상충 예방', interval: 30 }
      ],
      cat: [
        { name: '종합백신(FVRCP)', interval: 365 },
        { name: '광견병', interval: 365 },
        { name: '백혈병(FeLV)', interval: 365 },
        { name: '심장사상충 예방', interval: 30 }
      ]
    };
  }

  init() {
    this.initElements({
      petName: 'petName',
      petType: 'petType',
      newVaccine: 'newVaccine',
      newDate: 'newDate',
      newNextDate: 'newNextDate',
      vaccineList: 'vaccineList'
    });

    this.load();
    this.render();

    // 오늘 날짜 기본값
    this.elements.newDate.value = new Date().toISOString().split('T')[0];

    console.log('[VaccinationTracker] 초기화 완료');
    return this;
  }

  load() {
    try {
      const saved = localStorage.getItem('vaccine-tracker-data');
      if (saved) {
        const data = JSON.parse(saved);
        this.records = data.records || [];
        this.elements.petName.value = data.petName || '';
        this.elements.petType.value = data.petType || 'dog';
      }
    } catch (e) {}
  }

  save() {
    localStorage.setItem('vaccine-tracker-data', JSON.stringify({
      records: this.records,
      petName: this.elements.petName.value,
      petType: this.elements.petType.value
    }));
  }

  loadDefaults() {
    const petType = this.elements.petType.value;
    const defaults = this.defaultVaccines[petType];

    defaults.forEach(vaccine => {
      const exists = this.records.some(r => r.name === vaccine.name);
      if (!exists) {
        this.records.push({
          id: Date.now() + Math.random(),
          name: vaccine.name,
          lastDate: null,
          nextDate: null,
          interval: vaccine.interval
        });
      }
    });

    this.save();
    this.render();
    this.showToast('기본 접종 목록이 추가되었습니다', 'success');
  }

  addRecord() {
    const name = this.elements.newVaccine.value.trim();
    const lastDate = this.elements.newDate.value;
    const nextDate = this.elements.newNextDate.value;

    if (!name) {
      this.showToast('백신명을 입력하세요', 'error');
      return;
    }

    // 기존 레코드 업데이트 또는 새로 추가
    const existing = this.records.find(r => r.name === name);
    if (existing) {
      existing.lastDate = lastDate || existing.lastDate;
      existing.nextDate = nextDate || existing.nextDate;
    } else {
      this.records.push({
        id: Date.now(),
        name,
        lastDate: lastDate || null,
        nextDate: nextDate || null,
        interval: 365
      });
    }

    this.elements.newVaccine.value = '';
    this.elements.newNextDate.value = '';

    this.save();
    this.render();
    this.showToast('접종 기록이 추가되었습니다', 'success');
  }

  updateRecord(id, field, value) {
    const record = this.records.find(r => r.id === id);
    if (record) {
      record[field] = value;
      this.save();
      this.render();
    }
  }

  removeRecord(id) {
    this.records = this.records.filter(r => r.id !== id);
    this.save();
    this.render();
  }

  getStatus(record) {
    if (!record.nextDate) {
      return { status: 'unknown', text: '미정', class: '' };
    }

    const today = new Date();
    const nextDate = new Date(record.nextDate);
    const diffDays = Math.ceil((nextDate - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { status: 'due', text: `${Math.abs(diffDays)}일 지남`, class: 'status-due' };
    } else if (diffDays <= 14) {
      return { status: 'upcoming', text: `${diffDays}일 후`, class: 'status-upcoming' };
    } else {
      return { status: 'done', text: '완료', class: 'status-done' };
    }
  }

  formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
  }

  clearAll() {
    if (this.records.length === 0) return;
    if (!confirm('모든 기록을 삭제하시겠습니까?')) return;

    this.records = [];
    this.save();
    this.render();
    this.showToast('초기화되었습니다', 'success');
  }

  exportRecords() {
    const petName = this.elements.petName.value || '반려동물';

    let text = `${petName} 예방접종 기록\n`;
    text += '='.repeat(30) + '\n\n';

    this.records.forEach(record => {
      const status = this.getStatus(record);
      text += `[${record.name}]\n`;
      text += `  최근 접종: ${this.formatDate(record.lastDate)}\n`;
      text += `  다음 접종: ${this.formatDate(record.nextDate)} (${status.text})\n\n`;
    });

    this.copyToClipboard(text);
  }

  render() {
    if (this.records.length === 0) {
      this.elements.vaccineList.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 2rem;">접종 기록이 없습니다. 기본 목록을 불러오거나 직접 추가하세요.</div>';
      return;
    }

    // 상태별 정렬: 지남 > 임박 > 완료
    const sorted = [...this.records].sort((a, b) => {
      const statusA = this.getStatus(a);
      const statusB = this.getStatus(b);
      const order = { due: 0, upcoming: 1, done: 2, unknown: 3 };
      return order[statusA.status] - order[statusB.status];
    });

    this.elements.vaccineList.innerHTML = sorted.map(record => {
      const status = this.getStatus(record);

      return `
        <div class="vaccine-item">
          <div class="vaccine-header">
            <div class="vaccine-name">
              <span></span>
              <span>${record.name}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <span class="vaccine-status ${status.class}">${status.text}</span>
              <button onclick="vaccinationTracker.removeRecord(${record.id})" style="background: none; border: none; cursor: pointer; opacity: 0.5;"></button>
            </div>
          </div>
          <div class="vaccine-dates">
            <div class="vaccine-date">
              <div class="vaccine-date-label">최근 접종일</div>
              <input type="date" class="tool-input" value="${record.lastDate || ''}" onchange="vaccinationTracker.updateRecord(${record.id}, 'lastDate', this.value)" style="font-size: 0.9rem; padding: 0.5rem;">
            </div>
            <div class="vaccine-date">
              <div class="vaccine-date-label">다음 접종일</div>
              <input type="date" class="tool-input" value="${record.nextDate || ''}" onchange="vaccinationTracker.updateRecord(${record.id}, 'nextDate', this.value)" style="font-size: 0.9rem; padding: 0.5rem;">
            </div>
          </div>
        </div>
      `;
    }).join('');
  }
}

// 전역 인스턴스 생성
const vaccinationTracker = new VaccinationTracker();
window.VaccinationTracker = vaccinationTracker;

// 전역 함수 (HTML onclick 호환)
function loadDefaults() { vaccinationTracker.loadDefaults(); }
function addRecord() { vaccinationTracker.addRecord(); }
function exportRecords() { vaccinationTracker.exportRecords(); }
function clearAll() { vaccinationTracker.clearAll(); }

document.addEventListener('DOMContentLoaded', () => vaccinationTracker.init());
