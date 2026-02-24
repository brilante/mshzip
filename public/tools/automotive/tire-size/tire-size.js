/**
 * 타이어 사이즈 계산기 - ToolBase 기반
 * 타이어 규격 비교
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var TireSize = class TireSize extends ToolBase {
  constructor() {
    super('TireSize');
  }

  init() {
    this.initElements({
      width1: 'width1',
      ratio1: 'ratio1',
      rim1: 'rim1',
      width2: 'width2',
      ratio2: 'ratio2',
      rim2: 'rim2',
      sidewall1: 'sidewall1',
      diameter1: 'diameter1',
      circum1: 'circum1',
      rev1: 'rev1',
      sidewall2: 'sidewall2',
      diameter2: 'diameter2',
      circum2: 'circum2',
      rev2: 'rev2',
      diffValue: 'diffValue',
      speedDiff: 'speedDiff',
      tireVisual1: 'tireVisual1',
      tireVisual2: 'tireVisual2'
    });

    this.calculate();

    // 입력 변경 시 자동 계산
    document.querySelectorAll('input').forEach(input => {
      this.on(input, 'input', () => this.calculate());
    });

    console.log('[TireSize] 초기화 완료');
    return this;
  }

  calculate() {
    // 타이어 1
    const width1 = parseFloat(this.elements.width1.value) || 205;
    const ratio1 = parseFloat(this.elements.ratio1.value) || 55;
    const rim1 = parseFloat(this.elements.rim1.value) || 16;

    // 타이어 2
    const width2 = parseFloat(this.elements.width2.value) || 215;
    const ratio2 = parseFloat(this.elements.ratio2.value) || 50;
    const rim2 = parseFloat(this.elements.rim2.value) || 17;

    // 계산
    const tire1 = this.calcTire(width1, ratio1, rim1);
    const tire2 = this.calcTire(width2, ratio2, rim2);

    // 결과 표시
    this.displayTire(1, tire1, width1, ratio1, rim1);
    this.displayTire(2, tire2, width2, ratio2, rim2);

    // 차이 계산
    const diffPercent = ((tire2.diameter - tire1.diameter) / tire1.diameter) * 100;
    const actualSpeed = 100 * (tire2.diameter / tire1.diameter);

    this.elements.diffValue.textContent =
      (diffPercent >= 0 ? '+' : '') + diffPercent.toFixed(1) + '%';
    this.elements.diffValue.className =
      'diff-value ' + (diffPercent >= 0 ? 'positive' : 'negative');

    this.elements.speedDiff.textContent =
      `속도계 100km/h → 실제 ${actualSpeed.toFixed(1)}km/h`;
  }

  calcTire(width, ratio, rim) {
    const rimMm = rim * 25.4; // 인치 → mm
    const sidewall = width * (ratio / 100);
    const diameter = rimMm + (sidewall * 2);
    const circum = diameter * Math.PI;
    const revPerKm = 1000000 / circum;

    return { sidewall, diameter, circum, revPerKm };
  }

  displayTire(num, tire, width, ratio, rim) {
    this.elements[`sidewall${num}`].textContent = tire.sidewall.toFixed(0) + 'mm';
    this.elements[`diameter${num}`].textContent = tire.diameter.toFixed(0) + 'mm';
    this.elements[`circum${num}`].textContent = tire.circum.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + 'mm';
    this.elements[`rev${num}`].textContent = tire.revPerKm.toFixed(0) + '회';

    // 시각적 표시
    const visual = this.elements[`tireVisual${num}`];
    const size = Math.min(150, Math.max(80, tire.diameter / 5));
    visual.style.width = size + 'px';
    visual.style.height = size + 'px';
    visual.innerHTML = `<span>${width}/${ratio}R${rim}</span>`;
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const tireSize = new TireSize();
window.TireSize = tireSize;

document.addEventListener('DOMContentLoaded', () => tireSize.init());
