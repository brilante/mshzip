/**
 * 탄소 발자국 계산기 - ToolBase 기반
 * 일상 활동의 CO₂ 배출량 측정
 * @created 2026-01-13
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var CarbonFootprint = class CarbonFootprint extends ToolBase {
  constructor() {
    super('CarbonFootprint');
    this.category = 'transport';

    this.factors = {
      transport: {
        car: 0.21,
        bus: 0.089,
        subway: 0.041,
        train: 0.041,
        plane: 0.255,
        bike: 0,
        walk: 0
      },
      home: {
        electricity: 0.424,
        gas: 2.0,
        water: 0.419
      },
      food: {
        beef: 27,
        pork: 12,
        chicken: 6.9,
        fish: 5,
        vegetables: 2,
        dairy: 3.2
      },
      shopping: {
        clothes: 10,
        electronics: 50,
        furniture: 30
      }
    };

    this.tips = {
      transport: [
        { icon: '', text: '짧은 거리는 걷거나 자전거 이용하기' },
        { icon: '', text: '대중교통 이용으로 배출량 80% 절감' },
        { icon: '', text: '카풀하면 1인당 배출량 50% 감소' },
        { icon: '', text: '국내선 대신 KTX 이용 시 CO₂ 84% 절감' }
      ],
      home: [
        { icon: '', text: 'LED 조명으로 교체 시 75% 절전' },
        { icon: '', text: '냉난방 1℃ 조절로 에너지 7% 절약' },
        { icon: '', text: '대기전력 차단으로 연간 10% 절전' },
        { icon: '', text: '샤워 시간 1분 줄이면 연간 54kg CO₂ 감소' }
      ],
      food: [
        { icon: '', text: '주 1회 채식으로 연간 340kg CO₂ 감소' },
        { icon: '', text: '지역 농산물 구매로 운송 탄소 절감' },
        { icon: '', text: '음식물 쓰레기 줄이기' },
        { icon: '', text: '소고기 대신 닭고기로 CO₂ 75% 감소' }
      ],
      shopping: [
        { icon: '', text: '중고 의류 구매로 배출량 82% 감소' },
        { icon: '', text: '전자기기 오래 사용하기' },
        { icon: '', text: '일회용 대신 다회용 제품 사용' },
        { icon: '', text: '재활용 가능 제품 선택하기' }
      ]
    };
  }

  init() {
    this.initElements({
      inputPanel: 'inputPanel',
      tipsList: 'tipsList',
      co2Value: 'co2Value',
      periodLabel: 'periodLabel',
      treesNeeded: 'treesNeeded',
      lightHours: 'lightHours'
    });

    this.setCategory('transport');

    console.log('[CarbonFootprint] 초기화 완료');
    return this;
  }

  setCategory(category) {
    this.category = category;

    document.querySelectorAll('.category-tab').forEach(tab => {
      const categories = { transport: '교통', home: '가정', food: '식품', shopping: '소비' };
      tab.classList.toggle('active', tab.textContent.includes(categories[category]));
    });

    this.renderInputs();
    this.renderTips();
    this.calculate();
  }

  renderInputs() {
    const inputs = {
      transport: `
        <h3 style="font-weight: 600; margin-bottom: 0.75rem;">월간 이동 거리</h3>
        <div class="input-group">
          <label class="input-label">승용차 (km/월)</label>
          <input type="number" id="carKm" class="tool-input" value="500" oninput="carbonFootprint.calculate()">
        </div>
        <div class="input-group">
          <label class="input-label">버스 (km/월)</label>
          <input type="number" id="busKm" class="tool-input" value="100" oninput="carbonFootprint.calculate()">
        </div>
        <div class="input-group">
          <label class="input-label">지하철 (km/월)</label>
          <input type="number" id="subwayKm" class="tool-input" value="200" oninput="carbonFootprint.calculate()">
        </div>
        <div class="input-group">
          <label class="input-label">항공 (km/년)</label>
          <input type="number" id="planeKm" class="tool-input" value="0" oninput="carbonFootprint.calculate()">
          <div class="input-hint">서울-제주 약 450km</div>
        </div>
      `,
      home: `
        <h3 style="font-weight: 600; margin-bottom: 0.75rem;">월간 에너지 사용</h3>
        <div class="input-group">
          <label class="input-label">전기 사용량 (kWh/월)</label>
          <input type="number" id="electricity" class="tool-input" value="300" oninput="carbonFootprint.calculate()">
          <div class="input-hint">1인 평균 약 150kWh, 4인 평균 약 350kWh</div>
        </div>
        <div class="input-group">
          <label class="input-label">가스 사용량 (m³/월)</label>
          <input type="number" id="gas" class="tool-input" value="20" oninput="carbonFootprint.calculate()">
        </div>
        <div class="input-group">
          <label class="input-label">수도 사용량 (m³/월)</label>
          <input type="number" id="water" class="tool-input" value="10" oninput="carbonFootprint.calculate()">
        </div>
      `,
      food: `
        <h3 style="font-weight: 600; margin-bottom: 0.75rem;">주간 식품 소비</h3>
        <div class="input-group">
          <label class="input-label">소고기 (g/주)</label>
          <input type="number" id="beef" class="tool-input" value="200" oninput="carbonFootprint.calculate()">
        </div>
        <div class="input-group">
          <label class="input-label">돼지고기 (g/주)</label>
          <input type="number" id="pork" class="tool-input" value="300" oninput="carbonFootprint.calculate()">
        </div>
        <div class="input-group">
          <label class="input-label">닭고기 (g/주)</label>
          <input type="number" id="chicken" class="tool-input" value="400" oninput="carbonFootprint.calculate()">
        </div>
        <div class="input-group">
          <label class="input-label">유제품 (g/주)</label>
          <input type="number" id="dairy" class="tool-input" value="500" oninput="carbonFootprint.calculate()">
        </div>
      `,
      shopping: `
        <h3 style="font-weight: 600; margin-bottom: 0.75rem;">월간 소비</h3>
        <div class="input-group">
          <label class="input-label">의류 구매 (개/월)</label>
          <input type="number" id="clothes" class="tool-input" value="2" oninput="carbonFootprint.calculate()">
        </div>
        <div class="input-group">
          <label class="input-label">전자기기 구매 (개/월)</label>
          <input type="number" id="electronics" class="tool-input" value="0" oninput="carbonFootprint.calculate()">
        </div>
        <div class="input-group">
          <label class="input-label">가구 구매 (개/월)</label>
          <input type="number" id="furniture" class="tool-input" value="0" oninput="carbonFootprint.calculate()">
        </div>
      `
    };

    this.elements.inputPanel.innerHTML = inputs[this.category];
  }

  renderTips() {
    const tips = this.tips[this.category];

    this.elements.tipsList.innerHTML = tips.map(tip =>
      `<div class="tip-item">
        <span class="tip-icon">${tip.icon}</span>
        <span class="tip-text">${tip.text}</span>
      </div>`
    ).join('');
  }

  calculate() {
    let co2 = 0;
    let period = '월간';

    switch (this.category) {
      case 'transport':
        const carKm = parseFloat(document.getElementById('carKm')?.value) || 0;
        const busKm = parseFloat(document.getElementById('busKm')?.value) || 0;
        const subwayKm = parseFloat(document.getElementById('subwayKm')?.value) || 0;
        const planeKm = parseFloat(document.getElementById('planeKm')?.value) || 0;

        co2 = (carKm * this.factors.transport.car) +
              (busKm * this.factors.transport.bus) +
              (subwayKm * this.factors.transport.subway) +
              (planeKm * this.factors.transport.plane / 12);
        break;

      case 'home':
        const electricity = parseFloat(document.getElementById('electricity')?.value) || 0;
        const gas = parseFloat(document.getElementById('gas')?.value) || 0;
        const water = parseFloat(document.getElementById('water')?.value) || 0;

        co2 = (electricity * this.factors.home.electricity) +
              (gas * this.factors.home.gas) +
              (water * this.factors.home.water);
        break;

      case 'food':
        const beef = parseFloat(document.getElementById('beef')?.value) || 0;
        const pork = parseFloat(document.getElementById('pork')?.value) || 0;
        const chicken = parseFloat(document.getElementById('chicken')?.value) || 0;
        const dairy = parseFloat(document.getElementById('dairy')?.value) || 0;

        co2 = ((beef / 1000 * this.factors.food.beef) +
               (pork / 1000 * this.factors.food.pork) +
               (chicken / 1000 * this.factors.food.chicken) +
               (dairy / 1000 * this.factors.food.dairy)) * 4.33;
        break;

      case 'shopping':
        const clothes = parseFloat(document.getElementById('clothes')?.value) || 0;
        const electronics = parseFloat(document.getElementById('electronics')?.value) || 0;
        const furniture = parseFloat(document.getElementById('furniture')?.value) || 0;

        co2 = (clothes * this.factors.shopping.clothes) +
              (electronics * this.factors.shopping.electronics) +
              (furniture * this.factors.shopping.furniture);
        break;
    }

    this.elements.co2Value.textContent = co2.toFixed(1);
    this.elements.periodLabel.textContent = `${period} 기준`;

    this.elements.treesNeeded.textContent = (co2 / 21.77).toFixed(1);
    document.getElementById('carKm').textContent = Math.round(co2 / 0.21);
    this.elements.lightHours.textContent = Math.round(co2 / 0.06);
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const carbonFootprint = new CarbonFootprint();
window.CarbonFootprint = carbonFootprint;

document.addEventListener('DOMContentLoaded', () => carbonFootprint.init());
