/**
 * 비행 시간 계산기 - ToolBase 기반
 * 출발지-도착지 예상 비행 시간
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var FlightCalc = class FlightCalc extends ToolBase {
  constructor() {
    super('FlightCalc');
    this.airports = {
      ICN: { name: '서울 인천', lat: 37.4602, lng: 126.4407, tz: 9 },
      GMP: { name: '서울 김포', lat: 37.5583, lng: 126.7906, tz: 9 },
      PUS: { name: '부산 김해', lat: 35.1796, lng: 128.9385, tz: 9 },
      CJU: { name: '제주', lat: 33.5104, lng: 126.4914, tz: 9 },
      NRT: { name: '도쿄 나리타', lat: 35.7720, lng: 140.3929, tz: 9 },
      HND: { name: '도쿄 하네다', lat: 35.5494, lng: 139.7798, tz: 9 },
      KIX: { name: '오사카 간사이', lat: 34.4347, lng: 135.2441, tz: 9 },
      PEK: { name: '베이징', lat: 40.0799, lng: 116.6031, tz: 8 },
      PVG: { name: '상하이', lat: 31.1443, lng: 121.8083, tz: 8 },
      HKG: { name: '홍콩', lat: 22.3080, lng: 113.9185, tz: 8 },
      BKK: { name: '방콕', lat: 13.6900, lng: 100.7501, tz: 7 },
      SIN: { name: '싱가포르', lat: 1.3644, lng: 103.9915, tz: 8 },
      SYD: { name: '시드니', lat: -33.9399, lng: 151.1753, tz: 10 },
      LAX: { name: '로스앤젤레스', lat: 33.9425, lng: -118.4081, tz: -8 },
      JFK: { name: '뉴욕', lat: 40.6413, lng: -73.7781, tz: -5 },
      LHR: { name: '런던', lat: 51.4700, lng: -0.4543, tz: 0 },
      CDG: { name: '파리', lat: 49.0097, lng: 2.5479, tz: 1 },
      FRA: { name: '프랑크푸르트', lat: 50.0379, lng: 8.5622, tz: 1 }
    };
  }

  init() {
    this.initElements({
      departure: 'departure',
      arrival: 'arrival',
      resultContainer: 'resultContainer'
    });

    console.log('[FlightCalc] 초기화 완료');
    return this;
  }

  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  calculateFlightTime(distance) {
    const avgSpeed = 850;
    const taxiTime = 0.5;
    return (distance / avgSpeed) + taxiTime;
  }

  swap() {
    const dep = this.elements.departure;
    const arr = this.elements.arrival;
    const temp = dep.value;
    dep.value = arr.value;
    arr.value = temp;
  }

  setRoute(from, to) {
    this.elements.departure.value = from;
    this.elements.arrival.value = to;
    this.calculate();
  }

  calculate() {
    const depCode = this.elements.departure.value;
    const arrCode = this.elements.arrival.value;

    if (depCode === arrCode) {
      this.showToast('출발지와 도착지가 같습니다', 'error');
      return;
    }

    const dep = this.airports[depCode];
    const arr = this.airports[arrCode];

    const distance = this.calculateDistance(dep.lat, dep.lng, arr.lat, arr.lng);
    const flightTime = this.calculateFlightTime(distance);
    const hours = Math.floor(flightTime);
    const minutes = Math.round((flightTime - hours) * 60);

    const timeDiff = arr.tz - dep.tz;
    const timeDiffStr = timeDiff >= 0 ? `+${timeDiff}시간` : `${timeDiff}시간`;

    this.elements.resultContainer.innerHTML = `
      <div class="result-card">
        <div class="result-label">예상 비행 시간</div>
        <div class="result-time">${hours}시간 ${minutes}분</div>
        <div class="flight-info">
          <div class="info-item">
            <div class="info-value">${Math.round(distance).toLocaleString()}km</div>
            <div class="info-label">비행 거리</div>
          </div>
          <div class="info-item">
            <div class="info-value">${timeDiffStr}</div>
            <div class="info-label">시차</div>
          </div>
          <div class="info-item">
            <div class="info-value">850km/h</div>
            <div class="info-label">평균 속도</div>
          </div>
        </div>
        <div style="margin-top: 1rem; font-size: 0.85rem; opacity: 0.9;">
          ${dep.name} → ${arr.name}
        </div>
      </div>
    `;
  }
}

// 전역 인스턴스 생성
const flightCalc = new FlightCalc();
window.FlightCalc = flightCalc;

document.addEventListener('DOMContentLoaded', () => flightCalc.init());
