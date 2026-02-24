/**
 * 체형 분석기 - ToolBase 기반
 * 체형별 스타일링 가이드
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class BodyType extends ToolBase {
  constructor() {
    super('BodyType');
    this.selectedType = null;

    this.types = {
      hourglass: {
        icon: '',
        name: '모래시계형',
        desc: '어깨와 엉덩이가 비슷하고 허리가 잘록한 체형',
        recommend: [
          '허리를 강조하는 벨트 스타일',
          '바디컨 드레스, 랩 원피스',
          'A라인 스커트',
          '하이웨이스트 팬츠',
          '크롭 재킷'
        ],
        avoid: [
          '박시한 오버사이즈 의류',
          '허리를 숨기는 스타일',
          '너무 루즈한 핏'
        ],
        tip: '타고난 곡선미를 살리는 것이 포인트입니다. 허리라인을 강조하고 몸에 맞는 핏을 선택하세요.'
      },
      pear: {
        icon: '',
        name: '배형 (삼각형)',
        desc: '어깨보다 엉덩이가 넓은 체형',
        recommend: [
          '어깨를 강조하는 보트넥, 오프숄더',
          '밝은 색상의 상의',
          '어두운 색상의 하의',
          'A라인 스커트',
          '와이드 팬츠'
        ],
        avoid: [
          '엉덩이에 포켓이 많은 바지',
          '스키니 진 단독 착용',
          '밝은 색상의 하의'
        ],
        tip: '상체에 볼륨을 더하고 하체는 심플하게 연출하면 균형 잡힌 실루엣을 만들 수 있습니다.'
      },
      apple: {
        icon: '',
        name: '사과형 (역삼각형)',
        desc: '가슴과 복부에 볼륨이 있는 체형',
        recommend: [
          'V넥, 딥넥 상의',
          '엠파이어 라인 원피스',
          '스트레이트 팬츠',
          '롱 카디건, 롱 재킷',
          '세로 줄무늬 패턴'
        ],
        avoid: [
          '복부를 강조하는 꽉 끼는 상의',
          '크롭 탑',
          '배에 주름이 잡히는 스타일'
        ],
        tip: '세로 라인을 강조하고 시선을 분산시키는 것이 포인트입니다. 길어 보이는 아이템을 활용하세요.'
      },
      rectangle: {
        icon: '',
        name: '직사각형 (일자형)',
        desc: '어깨, 허리, 엉덩이가 비슷한 체형',
        recommend: [
          '레이어드 스타일',
          '페플럼 탑',
          '벨티드 아우터',
          '러플, 프릴 디테일',
          '컬러 블로킹'
        ],
        avoid: [
          '박시한 일자 실루엣',
          '너무 단순한 디자인',
          '몸에 딱 붙는 민무늬 의류'
        ],
        tip: '허리라인을 만들어주고 곡선을 더하는 디테일을 활용하면 여성스러운 실루엣을 연출할 수 있습니다.'
      },
      inverted: {
        icon: '',
        name: '역삼각형',
        desc: '어깨가 넓고 하체가 슬림한 체형',
        recommend: [
          '심플한 상의',
          '볼륨감 있는 하의',
          '와이드 팬츠, 플레어 스커트',
          '보트컷 진',
          '밝은 색상의 하의'
        ],
        avoid: [
          '어깨 패드가 있는 옷',
          '퍼프 소매',
          '가로 줄무늬 상의'
        ],
        tip: '상체는 심플하게, 하체에 볼륨을 더해 균형을 맞추세요. V넥으로 어깨를 좁아 보이게 할 수 있습니다.'
      }
    };
  }

  init() {
    this.initElements({
      bodyShapes: 'bodyShapes',
      shoulder: 'shoulder',
      bust: 'bust',
      waist: 'waist',
      hip: 'hip',
      resultPanel: 'resultPanel',
      resultIcon: 'resultIcon',
      resultType: 'resultType',
      resultDesc: 'resultDesc',
      recommendStyle: 'recommendStyle',
      avoidStyle: 'avoidStyle',
      styleTip: 'styleTip',
      styleGuide: 'styleGuide'
    });

    this.renderBodyShapes();

    console.log('[BodyType] 초기화 완료');
    return this;
  }

  renderBodyShapes() {
    this.elements.bodyShapes.innerHTML = Object.entries(this.types).map(([key, type]) => `
      <div class="body-shape" data-type="${key}" onclick="bodyType.selectType('${key}')">
        <div class="body-shape-icon">${type.icon}</div>
        <div class="body-shape-name">${type.name}</div>
      </div>
    `).join('');
  }

  calculate() {
    const shoulder = parseFloat(this.elements.shoulder.value);
    const bust = parseFloat(this.elements.bust.value);
    const waist = parseFloat(this.elements.waist.value);
    const hip = parseFloat(this.elements.hip.value);

    if (!shoulder || !bust || !waist || !hip) return;

    // 체형 분석 로직
    const bustHipRatio = bust / hip;
    const waistHipRatio = waist / hip;
    const shoulderHipRatio = shoulder * 2.5 / hip; // 어깨 추정

    let type;

    if (waistHipRatio <= 0.75 && Math.abs(bustHipRatio - 1) < 0.1) {
      type = 'hourglass';
    } else if (shoulderHipRatio < 0.9) {
      type = 'pear';
    } else if (waistHipRatio > 0.85) {
      type = 'apple';
    } else if (shoulderHipRatio > 1.1) {
      type = 'inverted';
    } else {
      type = 'rectangle';
    }

    this.selectType(type);
  }

  selectType(type) {
    this.selectedType = type;

    // UI 업데이트
    document.querySelectorAll('.body-shape').forEach(el => {
      el.classList.toggle('selected', el.dataset.type === type);
    });

    this.showResult(type);
  }

  showResult(type) {
    const data = this.types[type];

    this.elements.resultPanel.classList.add('show');

    this.elements.resultIcon.textContent = data.icon;
    this.elements.resultType.textContent = data.name;
    this.elements.resultDesc.textContent = data.desc;

    // 추천 스타일
    this.elements.recommendStyle.innerHTML = data.recommend.map(item =>
      `<li><span style="color: #22c55e;"></span> ${item}</li>`
    ).join('');

    // 피해야 할 스타일
    this.elements.avoidStyle.innerHTML = data.avoid.map(item =>
      `<li><span style="color: #ef4444;"></span> ${item}</li>`
    ).join('');

    this.elements.styleTip.textContent = data.tip;
    this.elements.styleGuide.style.display = 'block';
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const bodyType = new BodyType();
window.BodyType = bodyType;

document.addEventListener('DOMContentLoaded', () => bodyType.init());
