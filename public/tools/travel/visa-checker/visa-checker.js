/**
 * 비자 정보 확인 - ToolBase 기반
 * 국가별 비자 요건 확인
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class VisaChecker extends ToolBase {
  constructor() {
    super('VisaChecker');
    this.visaData = {
      KR: {
        JP: { type: 'free', days: 90, validity: '3개월 이상' },
        US: { type: 'eta', days: 90, validity: '6개월 이상', etaName: 'ESTA' },
        GB: { type: 'free', days: 180, validity: '6개월 이상' },
        FR: { type: 'free', days: 90, validity: '3개월 이상', note: '솅겐 지역 90일' },
        DE: { type: 'free', days: 90, validity: '3개월 이상', note: '솅겐 지역 90일' },
        TH: { type: 'free', days: 90, validity: '6개월 이상' },
        VN: { type: 'free', days: 45, validity: '6개월 이상', note: '2023년부터 45일로 연장' },
        SG: { type: 'free', days: 90, validity: '6개월 이상' },
        AU: { type: 'eta', days: 90, validity: '6개월 이상', etaName: 'ETA' },
        CA: { type: 'eta', days: 180, validity: '6개월 이상', etaName: 'eTA' },
        CN: { type: 'required', days: 30, validity: '6개월 이상' },
        BR: { type: 'free', days: 90, validity: '6개월 이상' },
        IN: { type: 'required', days: 30, validity: '6개월 이상', note: 'e-Visa 가능' },
        RU: { type: 'required', days: 16, validity: '6개월 이상', note: 'e-Visa 가능 (일부 지역)' }
      },
      JP: {
        KR: { type: 'free', days: 90, validity: '3개월 이상' },
        US: { type: 'eta', days: 90, validity: '6개월 이상', etaName: 'ESTA' }
      },
      CN: {
        JP: { type: 'required', days: 15, validity: '6개월 이상' },
        US: { type: 'required', days: 90, validity: '6개월 이상' },
        KR: { type: 'required', days: 30, validity: '3개월 이상' }
      },
      US: {
        JP: { type: 'free', days: 90, validity: '여행 기간' },
        KR: { type: 'free', days: 90, validity: '6개월 이상' },
        GB: { type: 'free', days: 180, validity: '6개월 이상' }
      },
      GB: {
        JP: { type: 'free', days: 90, validity: '여행 기간' },
        KR: { type: 'free', days: 90, validity: '6개월 이상' },
        US: { type: 'eta', days: 90, validity: '6개월 이상', etaName: 'ESTA' }
      }
    };

    this.countryNames = {
      KR: '대한민국', JP: '일본', CN: '중국', US: '미국', GB: '영국',
      FR: '프랑스', DE: '독일', TH: '태국', VN: '베트남', SG: '싱가포르',
      AU: '호주', CA: '캐나다', BR: '브라질', IN: '인도', RU: '러시아'
    };
  }

  init() {
    this.initElements({
      passportCountry: 'passportCountry',
      destCountry: 'destCountry',
      visaResult: 'visaResult',
      stayDuration: 'stayDuration',
      passportValidity: 'passportValidity',
      purpose: 'purpose',
      multiEntry: 'multiEntry',
      docList: 'docList',
      notes: 'notes'
    });

    this.check();

    console.log('[VisaChecker] 초기화 완료');
    return this;
  }

  check() {
    const passport = this.elements.passportCountry.value;
    const dest = this.elements.destCountry.value;

    if (passport === dest) {
      this.showSameCountry();
      return;
    }

    const data = this.visaData[passport]?.[dest];

    if (!data) {
      this.showUnknown();
      return;
    }

    this.showResult(data, dest);
  }

  showSameCountry() {
    const resultDiv = this.elements.visaResult;
    resultDiv.className = 'visa-result visa-free';
    resultDiv.innerHTML = `
      <div class="visa-status">자국 방문</div>
      <div class="visa-detail">비자가 필요하지 않습니다</div>
    `;

    this.elements.stayDuration.textContent = '제한 없음';
    this.elements.passportValidity.textContent = '-';
    this.elements.purpose.textContent = '-';
    this.elements.multiEntry.textContent = '-';
    this.elements.docList.innerHTML = '<li>유효한 여권 또는 신분증</li>';
    this.elements.notes.textContent = '자국민은 비자 없이 무제한 체류할 수 있습니다.';
  }

  showUnknown() {
    const resultDiv = this.elements.visaResult;
    resultDiv.className = 'visa-result visa-required';
    resultDiv.innerHTML = `
      <div class="visa-status">정보 없음</div>
      <div class="visa-detail">해당 국가 조합의 비자 정보가 없습니다</div>
    `;

    this.elements.stayDuration.textContent = '확인 필요';
    this.elements.passportValidity.textContent = '확인 필요';
    this.elements.purpose.textContent = '확인 필요';
    this.elements.multiEntry.textContent = '확인 필요';
    this.elements.docList.innerHTML = '<li>ℹ해당 국가 대사관에 문의하세요</li>';
    this.elements.notes.textContent = '정확한 비자 요건은 해당 국가 대사관 또는 외교부 홈페이지를 확인하세요.';
  }

  showResult(data, dest) {
    const resultDiv = this.elements.visaResult;
    let statusText, detailText, cssClass;

    if (data.type === 'free') {
      cssClass = 'visa-free';
      statusText = '무비자 입국';
      detailText = `${data.days}일까지 비자 없이 체류 가능`;
    } else if (data.type === 'eta') {
      cssClass = 'visa-eta';
      statusText = `전자여행허가 (${data.etaName})`;
      detailText = `${data.etaName} 사전 신청 필요, ${data.days}일 체류 가능`;
    } else {
      cssClass = 'visa-required';
      statusText = '비자 필요';
      detailText = `대사관에서 비자 신청 필요`;
    }

    resultDiv.className = `visa-result ${cssClass}`;
    resultDiv.innerHTML = `
      <div class="visa-status">${statusText}</div>
      <div class="visa-detail">${detailText}</div>
    `;

    this.elements.stayDuration.textContent = `${data.days}일`;
    this.elements.passportValidity.textContent = data.validity;
    this.elements.purpose.textContent = data.type === 'required' ? '관광 비자 기준' : '관광, 상용, 방문';
    this.elements.multiEntry.textContent = data.type === 'free' ? '가능' : '비자 종류에 따름';

    let docs = ['유효한 여권', '왕복 항공권 (또는 출국 증빙)', '숙소 예약 확인서', '체류 경비 증빙'];

    if (data.type === 'eta') {
      docs.unshift(`${data.etaName} 승인서 (온라인 신청)`);
    } else if (data.type === 'required') {
      docs = [
        '유효한 여권',
        '비자 신청서',
        '여권용 사진',
        '왕복 항공권 예약',
        '숙소 예약 확인서',
        '재정 증빙 서류',
        '재직증명서 또는 사업자등록증'
      ];
    }

    this.elements.docList.innerHTML = docs.map(doc => `<li>${doc}</li>`).join('');

    let notes = [];

    if (data.note) {
      notes.push(data.note);
    }

    if (data.type === 'free') {
      notes.push(`무비자 체류 기간(${data.days}일) 초과 시 비자가 필요합니다.`);
      notes.push('입국 시 출국 항공권과 숙소 예약을 확인할 수 있습니다.');
    } else if (data.type === 'eta') {
      notes.push(`${data.etaName}는 온라인으로 사전 신청해야 합니다.`);
      notes.push('승인까지 최소 72시간 이상 소요될 수 있습니다.');
      notes.push(`${data.etaName} 없이 입국 시 탑승이 거부될 수 있습니다.`);
    } else {
      notes.push('비자 발급에 수일~수주가 소요될 수 있습니다.');
      notes.push('대사관 방문 예약이 필요할 수 있습니다.');
      if (data.note?.includes('e-Visa')) {
        notes.push('전자비자(e-Visa)로 간편하게 신청할 수도 있습니다.');
      }
    }

    this.elements.notes.innerHTML = notes.map(note => `• ${note}`).join('<br>');
  }
}

// 전역 인스턴스 생성
const visaChecker = new VisaChecker();
window.VisaChecker = visaChecker;

document.addEventListener('DOMContentLoaded', () => visaChecker.init());
