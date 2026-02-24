/**
 * 성장 차트 - ToolBase 기반
 * 아이 성장 백분위 확인
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var GrowthChart = class GrowthChart extends ToolBase {
  constructor() {
    super('GrowthChart');
    this.gender = 'male';
    this.history = [];

    // WHO 성장 기준 (간소화된 참조 데이터)
    this.maleHeight = {
      0: { p3: 46.1, p50: 49.9, p97: 53.7 },
      12: { p3: 71.0, p50: 75.7, p97: 80.5 },
      24: { p3: 81.7, p50: 87.1, p97: 92.9 },
      36: { p3: 88.7, p50: 94.9, p97: 101.7 },
      48: { p3: 94.9, p50: 102.3, p97: 109.9 },
      60: { p3: 100.7, p50: 109.4, p97: 118.2 }
    };

    this.femaleHeight = {
      0: { p3: 45.4, p50: 49.1, p97: 52.9 },
      12: { p3: 68.9, p50: 74.0, p97: 79.2 },
      24: { p3: 80.0, p50: 85.7, p97: 91.7 },
      36: { p3: 87.4, p50: 93.9, p97: 100.9 },
      48: { p3: 94.1, p50: 101.6, p97: 109.4 },
      60: { p3: 100.4, p50: 108.9, p97: 117.7 }
    };

    this.maleWeight = {
      0: { p3: 2.5, p50: 3.3, p97: 4.4 },
      12: { p3: 7.7, p50: 9.6, p97: 12.0 },
      24: { p3: 9.7, p50: 12.2, p97: 15.3 },
      36: { p3: 11.3, p50: 14.3, p97: 18.3 },
      48: { p3: 12.7, p50: 16.3, p97: 21.2 },
      60: { p3: 14.1, p50: 18.3, p97: 24.2 }
    };

    this.femaleWeight = {
      0: { p3: 2.4, p50: 3.2, p97: 4.2 },
      12: { p3: 7.0, p50: 8.9, p97: 11.5 },
      24: { p3: 9.0, p50: 11.5, p97: 14.8 },
      36: { p3: 10.8, p50: 13.9, p97: 18.1 },
      48: { p3: 12.3, p50: 16.1, p97: 21.5 },
      60: { p3: 13.7, p50: 18.2, p97: 24.9 }
    };
  }

  init() {
    this.initElements({
      ageYears: 'ageYears',
      ageMonths: 'ageMonths',
      height: 'height',
      weight: 'weight',
      heightPercentile: 'heightPercentile',
      heightBar: 'heightBar',
      weightPercentile: 'weightPercentile',
      weightBar: 'weightBar',
      bmiValue: 'bmiValue',
      growthStatus: 'growthStatus',
      historyList: 'historyList'
    });

    this.loadHistory();
    this.calculate();
    this.renderHistory();

    console.log('[GrowthChart] 초기화 완료');
    return this;
  }

  setGender(gender) {
    this.gender = gender;
    document.querySelectorAll('.gender-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.gender === gender);
    });
    this.calculate();
  }

  calculate() {
    const years = parseInt(this.elements.ageYears.value) || 0;
    const months = parseInt(this.elements.ageMonths.value) || 0;
    const height = parseFloat(this.elements.height.value) || 0;
    const weight = parseFloat(this.elements.weight.value) || 0;

    const totalMonths = years * 12 + months;

    // 백분위 계산
    const heightData = this.gender === 'male' ? this.maleHeight : this.femaleHeight;
    const weightData = this.gender === 'male' ? this.maleWeight : this.femaleWeight;

    const heightPercentile = this.calculatePercentile(height, totalMonths, heightData);
    const weightPercentile = this.calculatePercentile(weight, totalMonths, weightData);

    // BMI 계산
    const heightM = height / 100;
    const bmi = heightM > 0 ? (weight / (heightM * heightM)).toFixed(1) : 0;

    // 결과 표시
    this.elements.heightPercentile.textContent = heightPercentile + '%';
    this.elements.heightBar.style.width = heightPercentile + '%';

    this.elements.weightPercentile.textContent = weightPercentile + '%';
    this.elements.weightBar.style.width = weightPercentile + '%';

    this.elements.bmiValue.textContent = bmi;

    // 성장 상태 판정
    let status = '정상';
    if (heightPercentile < 3 || weightPercentile < 3) {
      status = '성장 부진 의심';
    } else if (heightPercentile > 97 || weightPercentile > 97) {
      status = '과성장 의심';
    } else if (heightPercentile >= 25 && heightPercentile <= 75) {
      status = '정상 범위';
    }
    this.elements.growthStatus.textContent = status;
  }

  calculatePercentile(value, months, data) {
    // 가장 가까운 월령 찾기
    const ages = Object.keys(data).map(Number).sort((a, b) => a - b);
    let closestAge = ages[0];

    for (const age of ages) {
      if (Math.abs(age - months) < Math.abs(closestAge - months)) {
        closestAge = age;
      }
    }

    const ref = data[closestAge];

    if (value <= ref.p3) return 3;
    if (value >= ref.p97) return 97;

    // 선형 보간
    if (value <= ref.p50) {
      return Math.round(3 + ((value - ref.p3) / (ref.p50 - ref.p3)) * 47);
    } else {
      return Math.round(50 + ((value - ref.p50) / (ref.p97 - ref.p50)) * 47);
    }
  }

  saveRecord() {
    const years = parseInt(this.elements.ageYears.value) || 0;
    const months = parseInt(this.elements.ageMonths.value) || 0;
    const height = parseFloat(this.elements.height.value) || 0;
    const weight = parseFloat(this.elements.weight.value) || 0;

    this.history.unshift({
      date: new Date().toISOString(),
      age: `${years}년 ${months}개월`,
      height,
      weight,
      gender: this.gender
    });

    if (this.history.length > 20) {
      this.history = this.history.slice(0, 20);
    }

    this.saveHistory();
    this.renderHistory();
    this.showToast('기록이 저장되었습니다', 'success');
  }

  loadHistory() {
    const saved = localStorage.getItem('growthHistory');
    if (saved) {
      this.history = JSON.parse(saved);
    }
  }

  saveHistory() {
    localStorage.setItem('growthHistory', JSON.stringify(this.history));
  }

  renderHistory() {
    if (this.history.length === 0) {
      this.elements.historyList.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 1rem;">기록이 없습니다</div>';
      return;
    }

    this.elements.historyList.innerHTML = this.history.map(item => {
      const date = new Date(item.date);
      const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;
      return `<div class="history-item">
        <span>${dateStr} (${item.age})</span>
        <span>${item.height}cm / ${item.weight}kg</span>
      </div>`;
    }).join('');
  }

  clearHistory() {
    if (confirm('모든 기록을 삭제하시겠습니까?')) {
      this.history = [];
      this.saveHistory();
      this.renderHistory();
      this.showToast('기록이 초기화되었습니다', 'success');
    }
  }
}

// 전역 인스턴스 생성
const growthChart = new GrowthChart();
window.GrowthChart = growthChart;

// 전역 함수 (HTML onclick 호환)
function setGender(gender) { growthChart.setGender(gender); }
function calculate() { growthChart.calculate(); }
function saveRecord() { growthChart.saveRecord(); }
function clearHistory() { growthChart.clearHistory(); }

document.addEventListener('DOMContentLoaded', () => growthChart.init());
