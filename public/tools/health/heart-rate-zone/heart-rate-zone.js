/**
 * 심박수 존 계산기 - ToolBase 기반
 * 운동 강도별 목표 심박수 계산
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class HeartRateZoneCalculator extends ToolBase {
  constructor() {
    super('HeartRateZoneCalculator');
    this.zones = [
      { name: 'Zone 1 - 회복', range: [50, 60], desc: '가벼운 활동, 회복', class: 'zone1' },
      { name: 'Zone 2 - 지방 연소', range: [60, 70], desc: '지방 연소, 지구력 향상', class: 'zone2' },
      { name: 'Zone 3 - 유산소', range: [70, 80], desc: '유산소 능력 향상', class: 'zone3' },
      { name: 'Zone 4 - 역치', range: [80, 90], desc: '속도, 파워 향상', class: 'zone4' },
      { name: 'Zone 5 - 최대', range: [90, 100], desc: '최대 능력, 스프린트', class: 'zone5' }
    ];
  }

  init() {
    this.initElements({
      age: 'age',
      restingHR: 'restingHR',
      maxHR: 'maxHR',
      maxHRValue: 'maxHRValue',
      zones: 'zones'
    });

    console.log('[HeartRateZoneCalculator] 초기화 완료');
    return this;
  }

  calculate() {
    const age = parseInt(this.elements.age.value);
    const restingHR = parseInt(this.elements.restingHR.value) || 0;

    if (!age || age < 10 || age > 100) {
      this.showToast('올바른 나이를 입력하세요.', 'error');
      return;
    }

    // 최대 심박수 계산 (Tanaka 공식)
    const maxHR = Math.round(208 - (0.7 * age));

    this.elements.maxHR.style.display = 'block';
    this.elements.maxHRValue.textContent = maxHR;

    // Karvonen 공식 사용 (안정시 심박수가 있는 경우)
    const useKarvonen = restingHR > 0;
    const hrReserve = maxHR - restingHR;

    const zonesHtml = this.zones.map(zone => {
      let minBPM, maxBPM;

      if (useKarvonen) {
        minBPM = Math.round(restingHR + (hrReserve * zone.range[0] / 100));
        maxBPM = Math.round(restingHR + (hrReserve * zone.range[1] / 100));
      } else {
        minBPM = Math.round(maxHR * zone.range[0] / 100);
        maxBPM = Math.round(maxHR * zone.range[1] / 100);
      }

      return `
        <div class="zone-card ${zone.class}">
          <div class="zone-color"></div>
          <div class="zone-info">
            <div class="zone-name">${zone.name}</div>
            <div class="zone-desc">${zone.desc}</div>
          </div>
          <div class="zone-range">
            <div>${zone.range[0]}-${zone.range[1]}%</div>
            <div class="zone-bpm">${minBPM}-${maxBPM} bpm</div>
          </div>
        </div>
      `;
    }).join('');

    this.elements.zones.innerHTML = zonesHtml;
    this.showToast('심박수 존이 계산되었습니다!', 'success');
  }
}

// 전역 인스턴스 생성
const hrZone = new HeartRateZoneCalculator();
window.HeartRateZoneCalculator = hrZone;

document.addEventListener('DOMContentLoaded', () => hrZone.init());
