/**
 * 사이즈 변환기 - ToolBase 기반
 * 국가별 의류/신발 사이즈 변환
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var SizeConvert = class SizeConvert extends ToolBase {
  constructor() {
    super('SizeConvert');
    this.type = 'clothes';

    // 여성 의류 사이즈
    this.womenClothes = [
      { kr: '44(XS)', us: 'XS (0-2)', uk: '4-6', eu: '32-34' },
      { kr: '55(S)', us: 'S (4-6)', uk: '8-10', eu: '36-38' },
      { kr: '66(M)', us: 'M (8-10)', uk: '12-14', eu: '40-42' },
      { kr: '77(L)', us: 'L (12-14)', uk: '16-18', eu: '44-46' },
      { kr: '88(XL)', us: 'XL (16-18)', uk: '20-22', eu: '48-50' }
    ];

    // 남성 의류 사이즈
    this.menClothes = [
      { kr: '90(S)', us: 'S (34-36)', uk: '34-36', eu: '44-46' },
      { kr: '95(M)', us: 'M (38-40)', uk: '38-40', eu: '48-50' },
      { kr: '100(L)', us: 'L (42-44)', uk: '42-44', eu: '52-54' },
      { kr: '105(XL)', us: 'XL (46-48)', uk: '46-48', eu: '56-58' },
      { kr: '110(XXL)', us: 'XXL (50-52)', uk: '50-52', eu: '60-62' }
    ];

    // 여성 신발 사이즈
    this.womenShoes = [
      { kr: '220', us: '5', uk: '2.5', eu: '35' },
      { kr: '225', us: '5.5', uk: '3', eu: '35.5' },
      { kr: '230', us: '6', uk: '3.5', eu: '36' },
      { kr: '235', us: '6.5', uk: '4', eu: '36.5' },
      { kr: '240', us: '7', uk: '4.5', eu: '37' },
      { kr: '245', us: '7.5', uk: '5', eu: '37.5' },
      { kr: '250', us: '8', uk: '5.5', eu: '38' },
      { kr: '255', us: '8.5', uk: '6', eu: '38.5' },
      { kr: '260', us: '9', uk: '6.5', eu: '39' }
    ];

    // 남성 신발 사이즈
    this.menShoes = [
      { kr: '250', us: '7', uk: '6', eu: '40' },
      { kr: '255', us: '7.5', uk: '6.5', eu: '40.5' },
      { kr: '260', us: '8', uk: '7', eu: '41' },
      { kr: '265', us: '8.5', uk: '7.5', eu: '41.5' },
      { kr: '270', us: '9', uk: '8', eu: '42' },
      { kr: '275', us: '9.5', uk: '8.5', eu: '42.5' },
      { kr: '280', us: '10', uk: '9', eu: '43' },
      { kr: '285', us: '10.5', uk: '9.5', eu: '43.5' },
      { kr: '290', us: '11', uk: '10', eu: '44' }
    ];

    // 반지 사이즈 (공용)
    this.rings = [
      { kr: '5', us: '3', uk: 'F', eu: '44' },
      { kr: '7', us: '4', uk: 'H', eu: '47' },
      { kr: '9', us: '5', uk: 'J', eu: '49' },
      { kr: '11', us: '6', uk: 'L', eu: '51' },
      { kr: '13', us: '7', uk: 'N', eu: '54' },
      { kr: '15', us: '8', uk: 'P', eu: '56' },
      { kr: '17', us: '9', uk: 'R', eu: '59' },
      { kr: '19', us: '10', uk: 'T', eu: '61' },
      { kr: '21', us: '11', uk: 'V', eu: '64' }
    ];
  }

  init() {
    this.initElements({
      gender: 'gender',
      fromCountry: 'fromCountry',
      sizeValue: 'sizeValue',
      resultBody: 'resultBody'
    });

    this.setType('clothes');

    console.log('[SizeConvert] 초기화 완료');
    return this;
  }

  setType(type) {
    this.type = type;
    document.querySelectorAll('.size-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.type === type);
    });

    // 반지는 성별 무관
    this.elements.gender.style.display = type === 'ring' ? 'none' : 'block';
    this.elements.gender.previousElementSibling.style.display = type === 'ring' ? 'none' : 'block';

    this.updateSizeOptions();
    this.convert();
  }

  getData() {
    const gender = this.elements.gender.value;
    if (this.type === 'clothes') {
      return gender === 'women' ? this.womenClothes : this.menClothes;
    } else if (this.type === 'shoes') {
      return gender === 'women' ? this.womenShoes : this.menShoes;
    } else {
      return this.rings;
    }
  }

  updateSizeOptions() {
    const data = this.getData();
    const fromCountry = this.elements.fromCountry.value;

    this.elements.sizeValue.innerHTML = data.map((item, i) =>
      `<option value="${i}">${item[fromCountry]}</option>`
    ).join('');
  }

  convert() {
    this.updateSizeOptions();

    const data = this.getData();
    const index = parseInt(this.elements.sizeValue.value) || 0;
    const fromCountry = this.elements.fromCountry.value;
    const item = data[index];

    if (!item) return;

    const countries = [
      { code: 'kr', name: '한국 (KR)', flag: '🇰🇷' },
      { code: 'us', name: '미국 (US)', flag: '🇺🇸' },
      { code: 'uk', name: '영국 (UK)', flag: '🇬🇧' },
      { code: 'eu', name: '유럽 (EU)', flag: '🇪🇺' }
    ];

    this.elements.resultBody.innerHTML = countries.map(c => `
      <tr class="${c.code === fromCountry ? 'highlight' : ''}">
        <td>${c.flag} ${c.name}</td>
        <td>${item[c.code]}</td>
      </tr>
    `).join('');
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const sizeConvert = new SizeConvert();
window.SizeConvert = sizeConvert;

document.addEventListener('DOMContentLoaded', () => sizeConvert.init());
