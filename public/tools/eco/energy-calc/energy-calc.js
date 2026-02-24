/**
 * 에너지 계산기 - ToolBase 기반
 * 가전제품별 전력 소비량 계산
 * @created 2026-01-13
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var EnergyCalc = class EnergyCalc extends ToolBase {
  constructor() {
    super('EnergyCalc');
    this.appliances = [];
  }

  init() {
    this.initElements({
      newAppliance: 'newAppliance',
      newHours: 'newHours',
      newDays: 'newDays',
      applianceList: 'applianceList',
      totalKwh: 'totalKwh',
      dailyKwh: 'dailyKwh',
      co2Emission: 'co2Emission',
      monthlyCost: 'monthlyCost',
      yearCost: 'yearCost',
      usageLevel: 'usageLevel',
      usageBar: 'usageBar'
    });

    this.loadData();
    if (this.appliances.length === 0) {
      this.appliances = [
        { name: '냉장고', watts: 150, hours: 24, days: 30 },
        { name: 'TV', watts: 100, hours: 4, days: 30 },
        { name: '조명', watts: 60, hours: 6, days: 30 }
      ];
    }
    this.render();
    this.calculate();

    console.log('[EnergyCalc] 초기화 완료');
    return this;
  }

  loadData() {
    try {
      const saved = localStorage.getItem('energyCalcData');
      if (saved) {
        this.appliances = JSON.parse(saved);
      }
    } catch (e) {}
  }

  saveData() {
    localStorage.setItem('energyCalcData', JSON.stringify(this.appliances));
  }

  addAppliance() {
    const select = this.elements.newAppliance;
    const [name, watts] = select.value.split('|');
    const hours = parseFloat(this.elements.newHours.value) || 1;
    const days = parseInt(this.elements.newDays.value) || 30;

    this.appliances.push({
      id: Date.now(),
      name,
      watts: parseInt(watts),
      hours,
      days
    });

    this.saveData();
    this.render();
    this.calculate();

    this.showToast('가전제품이 추가되었습니다', 'success');
  }

  removeAppliance(id) {
    this.appliances = this.appliances.filter(a => a.id !== id);
    this.saveData();
    this.render();
    this.calculate();
  }

  updateAppliance(id, field, value) {
    const appliance = this.appliances.find(a => a.id === id);
    if (appliance) {
      appliance[field] = parseFloat(value) || 0;
      this.saveData();
      this.calculate();
    }
  }

  render() {
    if (this.appliances.length === 0) {
      this.elements.applianceList.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 1rem;">가전제품을 추가해주세요</div>';
      return;
    }

    this.elements.applianceList.innerHTML = this.appliances.map(a => `
      <div class="appliance-item">
        <span class="appliance-name">${a.name} (${a.watts}W)</span>
        <input type="number" class="tool-input appliance-input" value="${a.hours}" min="0" step="0.5"
               onchange="energyCalc.updateAppliance(${a.id}, 'hours', this.value)">
        <input type="number" class="tool-input appliance-input" value="${a.days}" min="1" max="31"
               onchange="energyCalc.updateAppliance(${a.id}, 'days', this.value)">
        <button class="btn-remove" onclick="energyCalc.removeAppliance(${a.id})"></button>
      </div>
    `).join('');
  }

  calculate() {
    let totalKwh = 0;

    this.appliances.forEach(a => {
      const kwh = (a.watts * a.hours * a.days) / 1000;
      totalKwh += kwh;
    });

    const dailyKwh = totalKwh / 30;
    const co2 = totalKwh * 0.424;
    const cost = this.calculateCost(totalKwh);
    const yearCost = cost * 12;

    this.elements.totalKwh.textContent = totalKwh.toFixed(1);
    this.elements.dailyKwh.textContent = dailyKwh.toFixed(1);
    this.elements.co2Emission.textContent = co2.toFixed(1);
    this.elements.monthlyCost.textContent = cost.toLocaleString();
    this.elements.yearCost.textContent = (yearCost / 10000).toFixed(1);

    this.updateUsageLevel(totalKwh);
  }

  calculateCost(kwh) {
    let cost = 0;
    const base = 910;

    if (kwh <= 200) {
      cost = base + kwh * 93.3;
    } else if (kwh <= 400) {
      cost = base + 200 * 93.3 + (kwh - 200) * 187.9;
    } else {
      cost = base + 200 * 93.3 + 200 * 187.9 + (kwh - 400) * 280.6;
    }

    return Math.round(cost);
  }

  updateUsageLevel(kwh) {
    let level, color;
    const percent = Math.min((kwh / 400) * 100, 100);

    if (kwh < 200) {
      level = '저사용 (1단계)';
      color = '#22c55e';
    } else if (kwh < 400) {
      level = '중간 사용 (2단계)';
      color = '#f97316';
    } else {
      level = '고사용 (3단계)';
      color = '#ef4444';
    }

    this.elements.usageLevel.textContent = level;
    this.elements.usageBar.style.width = `${percent}%`;
    this.elements.usageBar.style.background = color;
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const energyCalc = new EnergyCalc();
window.EnergyCalc = energyCalc;

document.addEventListener('DOMContentLoaded', () => energyCalc.init());
