/**
 * 반려동물 비용 계산기 - ToolBase 기반
 * 월간/연간 양육 비용 계산
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class PetExpenseCalc extends ToolBase {
  constructor() {
    super('PetExpenseCalc');
    this.fields = ['food', 'treats', 'checkup', 'vaccine', 'heartworm', 'grooming', 'hygiene', 'toys', 'insurance', 'other'];
  }

  init() {
    this.initElements({
      food: 'food',
      treats: 'treats',
      checkup: 'checkup',
      vaccine: 'vaccine',
      heartworm: 'heartworm',
      grooming: 'grooming',
      hygiene: 'hygiene',
      toys: 'toys',
      insurance: 'insurance',
      other: 'other',
      monthlyFixed: 'monthlyFixed',
      monthlyVariable: 'monthlyVariable',
      monthlyTotal: 'monthlyTotal',
      yearlyTotal: 'yearlyTotal',
      dailyAvg: 'dailyAvg'
    });

    this.loadData();
    this.calculate();

    console.log('[PetExpenseCalc] 초기화 완료');
    return this;
  }

  loadData() {
    try {
      const saved = localStorage.getItem('pet-expense-data');
      if (saved) {
        const data = JSON.parse(saved);
        Object.keys(data).forEach(key => {
          if (this.elements[key]) {
            this.elements[key].value = data[key];
          }
        });
      }
    } catch (e) {}
  }

  saveData() {
    const data = {};
    this.fields.forEach(field => {
      data[field] = this.elements[field].value;
    });
    localStorage.setItem('pet-expense-data', JSON.stringify(data));
    this.showToast('저장되었습니다', 'success');
  }

  calculate() {
    // 월간 비용
    const food = parseFloat(this.elements.food.value) || 0;
    const treats = parseFloat(this.elements.treats.value) || 0;
    const heartworm = parseFloat(this.elements.heartworm.value) || 0;
    const grooming = parseFloat(this.elements.grooming.value) || 0;
    const hygiene = parseFloat(this.elements.hygiene.value) || 0;
    const toys = parseFloat(this.elements.toys.value) || 0;
    const insurance = parseFloat(this.elements.insurance.value) || 0;
    const other = parseFloat(this.elements.other.value) || 0;

    // 연간 비용 (월로 환산)
    const checkup = (parseFloat(this.elements.checkup.value) || 0) / 12;
    const vaccine = (parseFloat(this.elements.vaccine.value) || 0) / 12;

    // 고정비 (사료, 보험, 심장사상충)
    const monthlyFixed = food + insurance + heartworm;

    // 변동비 (나머지)
    const monthlyVariable = treats + grooming + hygiene + toys + other + checkup + vaccine;

    const monthlyTotal = monthlyFixed + monthlyVariable;
    const yearlyTotal = monthlyTotal * 12;
    const dailyAvg = Math.round(monthlyTotal / 30);

    this.elements.monthlyFixed.textContent = this.formatNumber(Math.round(monthlyFixed));
    this.elements.monthlyVariable.textContent = this.formatNumber(Math.round(monthlyVariable));
    this.elements.monthlyTotal.textContent = this.formatNumber(Math.round(monthlyTotal));
    this.elements.yearlyTotal.textContent = this.formatNumber(Math.round(yearlyTotal));
    this.elements.dailyAvg.textContent = this.formatNumber(dailyAvg);
  }

  formatNumber(num) {
    return num.toLocaleString('ko-KR') + '원';
  }

  exportData() {
    const monthlyTotal = this.elements.monthlyTotal.textContent;
    const yearlyTotal = this.elements.yearlyTotal.textContent;

    let text = '반려동물 양육 비용\n';
    text += '='.repeat(25) + '\n\n';
    text += `월간 총 비용: ${monthlyTotal}\n`;
    text += `연간 총 비용: ${yearlyTotal}\n\n`;
    text += '[상세 내역]\n';

    const items = [
      { id: 'food', label: '사료비', type: 'monthly' },
      { id: 'treats', label: '간식비', type: 'monthly' },
      { id: 'checkup', label: '정기검진', type: 'yearly' },
      { id: 'vaccine', label: '예방접종', type: 'yearly' },
      { id: 'heartworm', label: '심장사상충', type: 'monthly' },
      { id: 'grooming', label: '미용비', type: 'monthly' },
      { id: 'hygiene', label: '위생용품', type: 'monthly' },
      { id: 'toys', label: '장난감/용품', type: 'monthly' },
      { id: 'insurance', label: '보험료', type: 'monthly' },
      { id: 'other', label: '기타', type: 'monthly' }
    ];

    items.forEach(item => {
      const value = parseFloat(this.elements[item.id].value) || 0;
      if (value > 0) {
        text += `- ${item.label}: ${value.toLocaleString()}원/${item.type === 'monthly' ? '월' : '년'}\n`;
      }
    });

    this.copyToClipboard(text);
  }

  clearAll() {
    if (!confirm('모든 데이터를 초기화하시겠습니까?')) return;

    this.fields.forEach(field => {
      this.elements[field].value = '';
    });

    localStorage.removeItem('pet-expense-data');
    this.calculate();
    this.showToast('초기화되었습니다', 'success');
  }
}

// 전역 인스턴스 생성
const petExpenseCalc = new PetExpenseCalc();
window.PetExpenseCalc = petExpenseCalc;

// 전역 함수 (HTML onclick 호환)
function calculate() { petExpenseCalc.calculate(); }
function saveData() { petExpenseCalc.saveData(); }
function exportData() { petExpenseCalc.exportData(); }
function clearAll() { petExpenseCalc.clearAll(); }

document.addEventListener('DOMContentLoaded', () => petExpenseCalc.init());
