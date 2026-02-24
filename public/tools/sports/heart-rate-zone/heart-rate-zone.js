/**
 * 심박수 존 계산기 - ToolBase 기반
 * 운동 강도별 목표 심박수
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class HeartRateZone extends ToolBase {
  constructor() {
    super('HeartRateZone');
    this.zones = [
      { num: 1, name: '회복', desc: '가벼운 활동, 워밍업', min: 50, max: 60 },
      { num: 2, name: '지방연소', desc: '유산소 기초, 지방 연소', min: 60, max: 70 },
      { num: 3, name: '유산소', desc: '심폐 지구력 향상', min: 70, max: 80 },
      { num: 4, name: '역치', desc: '젖산 역치, 속도 향상', min: 80, max: 90 },
      { num: 5, name: '최대', desc: '최대 능력, 스프린트', min: 90, max: 100 }
    ];
  }

  init() {
    this.initElements({
      age: 'age',
      restingHR: 'restingHR',
      method: 'method',
      maxHR: 'maxHR',
      zoneList: 'zoneList'
    });

    this.calculate();

    console.log('[HeartRateZone] 초기화 완료');
    return this;
  }

  calculate() {
    const age = parseInt(this.elements.age.value);
    const restingHR = parseInt(this.elements.restingHR.value) || 0;
    const method = this.elements.method.value;

    if (!age || age <= 0 || age > 120) {
      this.renderEmpty();
      return;
    }

    // 최대 심박수 계산 (220 - 나이 공식)
    const maxHR = 220 - age;
    this.elements.maxHR.textContent = maxHR;

    this.renderZones(maxHR, restingHR, method);
  }

  renderEmpty() {
    this.elements.maxHR.textContent = '-';
    this.elements.zoneList.innerHTML = `
      <div class="util-panel" style="text-align: center; color: var(--text-secondary);">
        나이를 입력하면 심박수 존이 계산됩니다
      </div>
    `;
  }

  renderZones(maxHR, restingHR, method) {
    this.elements.zoneList.innerHTML = this.zones.map(zone => {
      let minBPM, maxBPM;

      if (method === 'karvonen' && restingHR > 0) {
        // 카르보넨 공식: 목표HR = ((최대HR - 안정HR) × 강도%) + 안정HR
        const hrr = maxHR - restingHR;
        minBPM = Math.round((hrr * zone.min / 100) + restingHR);
        maxBPM = Math.round((hrr * zone.max / 100) + restingHR);
      } else {
        // 단순 최대 심박수 비율
        minBPM = Math.round(maxHR * zone.min / 100);
        maxBPM = Math.round(maxHR * zone.max / 100);
      }

      return `
        <div class="zone-item zone-${zone.num}">
          <div class="zone-indicator"></div>
          <div class="zone-info">
            <div class="zone-name">Zone ${zone.num}: ${zone.name}</div>
            <div class="zone-desc">${zone.desc}</div>
          </div>
          <div class="zone-range">
            <div class="zone-bpm">${minBPM} - ${maxBPM}</div>
            <div class="zone-percent">${zone.min}% - ${zone.max}%</div>
          </div>
        </div>
      `;
    }).join('');
  }
}

// 전역 인스턴스 생성
const heartRateZone = new HeartRateZone();
window.HeartRateZone = heartRateZone;

document.addEventListener('DOMContentLoaded', () => heartRateZone.init());
