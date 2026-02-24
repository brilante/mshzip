/**
 * 물 사용량 계산기 - ToolBase 기반
 * 일일 물 사용량 측정
 * @created 2026-01-13
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class WaterUsage extends ToolBase {
  constructor() {
    super('WaterUsage');
    this.factors = {
      shower: 12,
      toilet: 6,
      wash: 5,
      dishwashHand: 40,
      dishwasher: 15,
      laundry: 100
    };
  }

  init() {
    this.initElements({
      showerCount: 'showerCount',
      showerTime: 'showerTime',
      toiletCount: 'toiletCount',
      washCount: 'washCount',
      dishwashHand: 'dishwashHand',
      dishwasher: 'dishwasher',
      laundry: 'laundry',
      totalUsage: 'totalUsage',
      monthlyUsage: 'monthlyUsage',
      monthlyCost: 'monthlyCost',
      co2Impact: 'co2Impact',
      levelText: 'levelText'
    });

    this.calculate();

    console.log('[WaterUsage] 초기화 완료');
    return this;
  }

  calculate() {
    const showerCount = parseFloat(this.elements.showerCount.value) || 0;
    const showerTime = parseFloat(this.elements.showerTime.value) || 0;
    const toiletCount = parseFloat(this.elements.toiletCount.value) || 0;
    const washCount = parseFloat(this.elements.washCount.value) || 0;
    const dishwashHand = parseFloat(this.elements.dishwashHand.value) || 0;
    const dishwasher = parseFloat(this.elements.dishwasher.value) || 0;
    const laundry = parseFloat(this.elements.laundry.value) || 0;

    const showerUsage = showerCount * showerTime * this.factors.shower;
    const toiletUsage = toiletCount * this.factors.toilet;
    const washUsage = washCount * this.factors.wash;
    const dishHandUsage = dishwashHand * this.factors.dishwashHand;
    const dishMachineUsage = dishwasher * this.factors.dishwasher;
    const laundryUsage = laundry * this.factors.laundry;

    const totalDaily = showerUsage + toiletUsage + washUsage + dishHandUsage + dishMachineUsage + laundryUsage;
    const totalMonthly = totalDaily * 30 / 1000;
    const monthlyCost = this.calculateCost(totalMonthly);
    const co2 = totalMonthly * 0.419;

    this.elements.totalUsage.textContent = Math.round(totalDaily);
    this.elements.monthlyUsage.textContent = totalMonthly.toFixed(1);
    this.elements.monthlyCost.textContent = monthlyCost.toLocaleString();
    this.elements.co2Impact.textContent = co2.toFixed(1);

    this.updateLevel(totalDaily);
  }

  calculateCost(m3) {
    let cost = 0;
    if (m3 <= 30) {
      cost = m3 * 360;
    } else if (m3 <= 50) {
      cost = 30 * 360 + (m3 - 30) * 550;
    } else {
      cost = 30 * 360 + 20 * 550 + (m3 - 50) * 790;
    }
    return Math.round(cost);
  }

  updateLevel(daily) {
    let level, color;

    if (daily < 100) {
      level = '매우 절약적';
      color = '#22c55e';
    } else if (daily < 150) {
      level = '적정 수준';
      color = '#3b82f6';
    } else if (daily < 200) {
      level = '평균 수준';
      color = '#f97316';
    } else {
      level = '과다 사용';
      color = '#ef4444';
    }

    const avgKorea = 178;
    const diff = daily - avgKorea;
    const diffText = diff > 0 ? `한국 평균보다 ${Math.abs(Math.round(diff))}L 많음` : `한국 평균보다 ${Math.abs(Math.round(diff))}L 적음`;

    this.elements.levelText.textContent = `${level} (${diffText})`;
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const waterUsage = new WaterUsage();
window.WaterUsage = waterUsage;

document.addEventListener('DOMContentLoaded', () => waterUsage.init());
