/**
 * 투약 알림 - ToolBase 기반
 * 반려동물 약 복용 관리
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class MedicationReminder extends ToolBase {
  constructor() {
    super('MedicationReminder');
    this.medications = [];
    this.currentFreq = 'daily';
  }

  init() {
    this.initElements({
      petName: 'petName',
      medName: 'medName',
      medDosage: 'medDosage',
      medStartDate: 'medStartDate',
      medEndDate: 'medEndDate',
      customFreqInput: 'customFreqInput',
      customDays: 'customDays',
      alertBanner: 'alertBanner',
      alertText: 'alertText',
      medList: 'medList'
    });

    this.load();
    this.elements.medStartDate.value = new Date().toISOString().split('T')[0];
    this.render();

    console.log('[MedicationReminder] 초기화 완료');
    return this;
  }

  load() {
    try {
      const saved = localStorage.getItem('med-reminder-data');
      if (saved) {
        const data = JSON.parse(saved);
        this.medications = data.medications || [];
        this.elements.petName.value = data.petName || '';
      }
    } catch (e) {}
  }

  save() {
    localStorage.setItem('med-reminder-data', JSON.stringify({
      medications: this.medications,
      petName: this.elements.petName.value
    }));
  }

  setFreq(freq) {
    this.currentFreq = freq;
    document.querySelectorAll('.freq-btn').forEach(btn => {
      btn.classList.toggle('selected', btn.dataset.freq === freq);
    });
    this.elements.customFreqInput.style.display = freq === 'custom' ? 'block' : 'none';
  }

  addMed() {
    const name = this.elements.medName.value.trim();
    const dosage = this.elements.medDosage.value.trim();
    const startDate = this.elements.medStartDate.value;
    const endDate = this.elements.medEndDate.value;

    if (!name || !startDate) {
      this.showToast('약 이름과 시작일을 입력하세요', 'error');
      return;
    }

    let intervalDays = 1;
    switch (this.currentFreq) {
      case 'daily': intervalDays = 1; break;
      case 'weekly': intervalDays = 7; break;
      case 'monthly': intervalDays = 30; break;
      case 'custom':
        intervalDays = parseInt(this.elements.customDays.value) || 1;
        break;
    }

    this.medications.push({
      id: Date.now(),
      name,
      dosage,
      startDate,
      endDate: endDate || null,
      intervalDays,
      frequency: this.currentFreq,
      lastTaken: null,
      history: []
    });

    // 폼 초기화
    this.elements.medName.value = '';
    this.elements.medDosage.value = '';
    this.elements.medEndDate.value = '';

    this.save();
    this.render();
    this.showToast('약이 추가되었습니다', 'success');
  }

  removeMed(id) {
    if (!confirm('이 약을 삭제하시겠습니까?')) return;
    this.medications = this.medications.filter(m => m.id !== id);
    this.save();
    this.render();
  }

  takeMed(id) {
    const med = this.medications.find(m => m.id === id);
    if (!med) return;

    const today = new Date().toISOString().split('T')[0];
    med.lastTaken = today;
    med.history.push(today);

    this.save();
    this.render();
    this.showToast('투약 완료!', 'success');
  }

  getStatus(med) {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // 종료일이 지났으면
    if (med.endDate && new Date(med.endDate) < today) {
      return { status: 'ended', text: '종료됨', class: '' };
    }

    // 마지막 투약일 기준 다음 투약일 계산
    let nextDueDate;
    if (med.lastTaken) {
      const lastDate = new Date(med.lastTaken);
      nextDueDate = new Date(lastDate.getTime() + med.intervalDays * 24 * 60 * 60 * 1000);
    } else {
      nextDueDate = new Date(med.startDate);
    }

    const nextDueDateStr = nextDueDate.toISOString().split('T')[0];
    const diffDays = Math.ceil((nextDueDate - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { status: 'due', text: `${Math.abs(diffDays)}일 지남`, class: 'status-due', nextDate: nextDueDateStr };
    } else if (diffDays === 0) {
      return { status: 'today', text: '오늘', class: 'status-today', nextDate: nextDueDateStr };
    } else {
      return { status: 'done', text: `${diffDays}일 후`, class: 'status-done', nextDate: nextDueDateStr };
    }
  }

  getFreqText(med) {
    switch (med.frequency) {
      case 'daily': return '매일';
      case 'weekly': return '매주';
      case 'monthly': return '매월';
      default: return `${med.intervalDays}일마다`;
    }
  }

  formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  }

  render() {
    this.checkAlerts();
    this.renderMedList();
  }

  checkAlerts() {
    const dueCount = this.medications.filter(med => {
      const status = this.getStatus(med);
      return status.status === 'due' || status.status === 'today';
    }).length;

    if (dueCount > 0) {
      this.elements.alertBanner.classList.add('show');
      this.elements.alertText.textContent = `오늘 투약해야 할 약이 ${dueCount}개 있습니다.`;
    } else {
      this.elements.alertBanner.classList.remove('show');
    }
  }

  renderMedList() {
    if (this.medications.length === 0) {
      this.elements.medList.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 2rem;">등록된 약이 없습니다</div>';
      return;
    }

    // 상태별 정렬
    const sorted = [...this.medications].sort((a, b) => {
      const statusA = this.getStatus(a);
      const statusB = this.getStatus(b);
      const order = { due: 0, today: 1, done: 2, ended: 3 };
      return order[statusA.status] - order[statusB.status];
    });

    this.elements.medList.innerHTML = sorted.map(med => {
      const status = this.getStatus(med);
      const isActive = status.status !== 'ended';

      return `
        <div class="med-item" style="${!isActive ? 'opacity: 0.6;' : ''}">
          <div class="med-header">
            <div class="med-name">
              <span></span>
              <span>${med.name}</span>
            </div>
            <span class="med-status ${status.class}">${status.text}</span>
          </div>
          <div class="med-details">
            <div class="med-detail">용량: <span>${med.dosage || '-'}</span></div>
            <div class="med-detail">주기: <span>${this.getFreqText(med)}</span></div>
            <div class="med-detail">다음: <span>${status.nextDate ? this.formatDate(status.nextDate) : '-'}</span></div>
          </div>
          ${isActive ? `
            <div class="med-actions">
              <button class="tool-btn tool-btn-primary" onclick="medicationReminder.takeMed(${med.id})" style="flex: 1; padding: 0.5rem;">투약 완료</button>
              <button class="tool-btn tool-btn-secondary" onclick="medicationReminder.removeMed(${med.id})" style="padding: 0.5rem;">삭제</button>
            </div>
          ` : `
            <div class="med-actions">
              <button class="tool-btn tool-btn-secondary" onclick="medicationReminder.removeMed(${med.id})" style="width: 100%; padding: 0.5rem;">삭제</button>
            </div>
          `}
        </div>
      `;
    }).join('');
  }

  exportData() {
    const petName = this.elements.petName.value || '반려동물';

    let text = `${petName} 투약 기록\n`;
    text += '='.repeat(25) + '\n\n';

    this.medications.forEach(med => {
      const status = this.getStatus(med);
      text += `[${med.name}]\n`;
      text += `  용량: ${med.dosage || '-'}\n`;
      text += `  주기: ${this.getFreqText(med)}\n`;
      text += `  상태: ${status.text}\n`;
      if (med.lastTaken) {
        text += `  마지막 투약: ${med.lastTaken}\n`;
      }
      text += '\n';
    });

    this.copyToClipboard(text);
  }

  clearAll() {
    if (this.medications.length === 0) return;
    if (!confirm('모든 약 정보를 삭제하시겠습니까?')) return;

    this.medications = [];
    this.save();
    this.render();
    this.showToast('초기화되었습니다', 'success');
  }
}

// 전역 인스턴스 생성
const medicationReminder = new MedicationReminder();
window.MedicationReminder = medicationReminder;

// 전역 함수 (HTML onclick 호환)
function setFreq(freq) { medicationReminder.setFreq(freq); }
function addMed() { medicationReminder.addMed(); }
function exportData() { medicationReminder.exportData(); }
function clearAll() { medicationReminder.clearAll(); }

document.addEventListener('DOMContentLoaded', () => medicationReminder.init());
