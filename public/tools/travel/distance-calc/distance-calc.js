/**
 * 거리 계산기 - ToolBase 기반
 * 두 지점 간의 거리 계산 (Haversine 공식)
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var DistanceCalc = class DistanceCalc extends ToolBase {
  constructor() {
    super('DistanceCalc');
    this.cities = {
      seoul: { lat: 37.5665, lng: 126.9780, name: '서울' },
      busan: { lat: 35.1796, lng: 129.0756, name: '부산' },
      tokyo: { lat: 35.6762, lng: 139.6503, name: '도쿄' },
      osaka: { lat: 34.6937, lng: 135.5023, name: '오사카' },
      beijing: { lat: 39.9042, lng: 116.4074, name: '베이징' },
      shanghai: { lat: 31.2304, lng: 121.4737, name: '상하이' },
      hongkong: { lat: 22.3193, lng: 114.1694, name: '홍콩' },
      singapore: { lat: 1.3521, lng: 103.8198, name: '싱가포르' },
      bangkok: { lat: 13.7563, lng: 100.5018, name: '방콕' },
      newyork: { lat: 40.7128, lng: -74.0060, name: '뉴욕' },
      losangeles: { lat: 34.0522, lng: -118.2437, name: '로스앤젤레스' },
      london: { lat: 51.5074, lng: -0.1278, name: '런던' },
      paris: { lat: 48.8566, lng: 2.3522, name: '파리' },
      sydney: { lat: -33.8688, lng: 151.2093, name: '시드니' }
    };
  }

  init() {
    this.initElements({
      fromCity: 'fromCity',
      toCity: 'toCity',
      fromLat: 'fromLat',
      fromLng: 'fromLng',
      toLat: 'toLat',
      toLng: 'toLng',
      resultKm: 'resultKm',
      resultMiles: 'resultMiles',
      resultNm: 'resultNm',
      resultFlightTime: 'resultFlightTime'
    });

    this.setPreset('seoul', 'tokyo');

    console.log('[DistanceCalc] 초기화 완료');
    return this;
  }

  setPreset(from, to) {
    this.elements.fromCity.value = from;
    this.elements.toCity.value = to;
    this.selectCity('from');
    this.selectCity('to');
  }

  selectCity(type) {
    const select = this.elements[`${type}City`];
    const city = this.cities[select.value];

    if (city) {
      this.elements[`${type}Lat`].value = city.lat;
      this.elements[`${type}Lng`].value = city.lng;
    }

    this.calculate();
  }

  swap() {
    const fromLat = this.elements.fromLat.value;
    const fromLng = this.elements.fromLng.value;
    const fromCity = this.elements.fromCity.value;

    this.elements.fromLat.value = this.elements.toLat.value;
    this.elements.fromLng.value = this.elements.toLng.value;
    this.elements.fromCity.value = this.elements.toCity.value;

    this.elements.toLat.value = fromLat;
    this.elements.toLng.value = fromLng;
    this.elements.toCity.value = fromCity;

    this.calculate();
  }

  haversine(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  toRad(deg) {
    return deg * (Math.PI / 180);
  }

  calculate() {
    const fromLat = parseFloat(this.elements.fromLat.value);
    const fromLng = parseFloat(this.elements.fromLng.value);
    const toLat = parseFloat(this.elements.toLat.value);
    const toLng = parseFloat(this.elements.toLng.value);

    if (isNaN(fromLat) || isNaN(fromLng) || isNaN(toLat) || isNaN(toLng)) {
      this.elements.resultKm.textContent = '-';
      this.elements.resultMiles.textContent = '-';
      this.elements.resultNm.textContent = '-';
      this.elements.resultFlightTime.textContent = '-';
      return;
    }

    const distanceKm = this.haversine(fromLat, fromLng, toLat, toLng);
    const distanceMiles = distanceKm * 0.621371;
    const distanceNm = distanceKm * 0.539957;

    const flightHours = distanceKm / 850;
    const hours = Math.floor(flightHours);
    const minutes = Math.round((flightHours - hours) * 60);

    this.elements.resultKm.textContent = Math.round(distanceKm).toLocaleString();
    this.elements.resultMiles.textContent = Math.round(distanceMiles).toLocaleString();
    this.elements.resultNm.textContent = Math.round(distanceNm).toLocaleString();
    this.elements.resultFlightTime.textContent = hours > 0 ? `${hours}시간 ${minutes}분` : `${minutes}분`;
  }

  copyResult() {
    const fromCity = this.elements.fromCity;
    const toCity = this.elements.toCity;
    const km = this.elements.resultKm.textContent;
    const miles = this.elements.resultMiles.textContent;
    const nm = this.elements.resultNm.textContent;
    const flightTime = this.elements.resultFlightTime.textContent;

    const fromName = fromCity.value ? this.cities[fromCity.value].name : '출발지';
    const toName = toCity.value ? this.cities[toCity.value].name : '도착지';

    const text = `거리 계산 결과
${fromName} → ${toName}

거리: ${km} km
마일: ${miles} miles
해리: ${nm} nm
예상 비행시간: ${flightTime}`;

    this.copyToClipboard(text);
  }
}

// 전역 인스턴스 생성
const distanceCalc = new DistanceCalc();
window.DistanceCalc = distanceCalc;

document.addEventListener('DOMContentLoaded', () => distanceCalc.init());
