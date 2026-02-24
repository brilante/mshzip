/**
 * 섬유 관리 가이드 - ToolBase 기반
 * 소재별 세탁 및 관리법
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class FabricCare extends ToolBase {
  constructor() {
    super('FabricCare');
    this.selectedFabric = null;

    this.fabrics = {
      cotton: {
        icon: '',
        name: '면 (Cotton)',
        subtitle: '천연 섬유, 통기성 우수',
        care: [
          { icon: '', title: '세탁 온도', desc: '40-60°C 세탁 가능' },
          { icon: '', title: '건조', desc: '자연 건조 또는 낮은 온도 건조' },
          { icon: '', title: '다림질', desc: '고온 다림질 가능' },
          { icon: '', title: '세제', desc: '일반 세제 사용 가능' }
        ],
        symbols: [
          { icon: '', text: '물세탁 가능 (30-60°C)' },
          { icon: '', text: '표백 가능 (흰색)' },
          { icon: '', text: '건조기 사용 가능 (낮은 온도)' }
        ],
        warning: '첫 세탁 시 수축될 수 있으니 찬물로 세탁하거나 세탁 전 미리 수축시키세요.',
        tip: '세탁 후 바로 건조대에 널어 주름을 방지하세요. 흰색 면은 시간이 지나면 누렇게 변할 수 있으니 베이킹소다를 활용해보세요.'
      },
      linen: {
        icon: '',
        name: '린넨 (Linen)',
        subtitle: '천연 섬유, 여름용 소재',
        care: [
          { icon: '', title: '세탁 온도', desc: '30-40°C 미지근한 물' },
          { icon: '', title: '건조', desc: '자연 건조 권장' },
          { icon: '', title: '다림질', desc: '살짝 축축할 때 고온' },
          { icon: '', title: '세제', desc: '중성 세제 권장' }
        ],
        symbols: [
          { icon: '', text: '손세탁 또는 약한 세탁' },
          { icon: '', text: '비틀어 짜기 금지' },
          { icon: '', text: '탈수 최소화' }
        ],
        warning: '비틀어 짜면 구김이 심해지고 섬유가 손상됩니다. 물기를 꾹꾹 눌러 제거하세요.',
        tip: '린넨은 자연스러운 구김이 매력입니다. 완전히 구김을 펴려고 하기보다 자연스럽게 입는 것을 추천합니다.'
      },
      wool: {
        icon: '',
        name: '울 (Wool)',
        subtitle: '천연 섬유, 보온성 우수',
        care: [
          { icon: '', title: '세탁 온도', desc: '30°C 이하 찬물' },
          { icon: '', title: '건조', desc: '평평하게 펴서 건조' },
          { icon: '', title: '다림질', desc: '스팀 다림질 권장' },
          { icon: '', title: '세제', desc: '울 전용 세제 필수' }
        ],
        symbols: [
          { icon: '', text: '손세탁 또는 드라이클리닝' },
          { icon: '', text: '건조기 사용 금지' },
          { icon: '', text: '비틀어 짜기 금지' }
        ],
        warning: '고온 세탁이나 건조기 사용 시 심하게 줄어듭니다. 반드시 찬물에 손세탁하세요.',
        tip: '보관 시 방충제를 넣고 통기성 있는 커버에 보관하세요. 접어서 보관하면 어깨 부분 변형을 방지할 수 있습니다.'
      },
      silk: {
        icon: '',
        name: '실크 (Silk)',
        subtitle: '천연 섬유, 고급 소재',
        care: [
          { icon: '', title: '세탁 온도', desc: '30°C 이하 찬물' },
          { icon: '', title: '건조', desc: '그늘에서 자연 건조' },
          { icon: '', title: '다림질', desc: '저온, 천 위에서' },
          { icon: '', title: '세제', desc: '실크 전용 세제' }
        ],
        symbols: [
          { icon: '', text: '손세탁 또는 드라이클리닝' },
          { icon: '', text: '직사광선 금지' },
          { icon: '', text: '표백제 금지' }
        ],
        warning: '물에 젖으면 쉽게 손상됩니다. 드라이클리닝을 권장하며, 집에서 세탁할 경우 극도로 조심하세요.',
        tip: '향수나 데오드란트가 직접 닿지 않게 하세요. 실크가 변색될 수 있습니다.'
      },
      polyester: {
        icon: '',
        name: '폴리에스터',
        subtitle: '합성 섬유, 관리 용이',
        care: [
          { icon: '', title: '세탁 온도', desc: '30-40°C 미온수' },
          { icon: '', title: '건조', desc: '건조기 가능 (저온)' },
          { icon: '', title: '다림질', desc: '저온 다림질' },
          { icon: '', title: '세제', desc: '일반 세제 가능' }
        ],
        symbols: [
          { icon: '', text: '세탁기 사용 가능' },
          { icon: '', text: '정전기 발생 주의' },
          { icon: '', text: '고온 주의 (녹을 수 있음)' }
        ],
        warning: '고온에 약해 다림질 시 녹거나 변형될 수 있습니다. 저온으로 다리거나 스팀을 사용하세요.',
        tip: '섬유유연제를 사용하면 정전기를 줄일 수 있습니다. 세탁 시 뒤집어 세탁하면 보풀 발생을 줄일 수 있습니다.'
      },
      denim: {
        icon: '',
        name: '데님 (Denim)',
        subtitle: '면 능직, 캐주얼 필수템',
        care: [
          { icon: '', title: '세탁 온도', desc: '찬물 세탁 권장' },
          { icon: '', title: '건조', desc: '자연 건조' },
          { icon: '', title: '다림질', desc: '중온 다림질' },
          { icon: '', title: '세제', desc: '중성 세제' }
        ],
        symbols: [
          { icon: '', text: '뒤집어서 세탁' },
          { icon: '', text: '표백제 사용 금지' },
          { icon: '', text: '어두운 곳에서 건조' }
        ],
        warning: '첫 몇 회 세탁 시 물빠짐이 심합니다. 단독 세탁하거나 같은 색상과 함께 세탁하세요.',
        tip: '데님은 자주 세탁하지 않는 것이 좋습니다. 냉동실에 하룻밤 넣어두면 냄새 제거에 효과적입니다.'
      }
    };
  }

  init() {
    this.initElements({
      fabricGrid: 'fabricGrid',
      careSection: 'careSection',
      careIcon: 'careIcon',
      careTitle: 'careTitle',
      careSubtitle: 'careSubtitle',
      careGrid: 'careGrid',
      symbolsSection: 'symbolsSection',
      warningBox: 'warningBox',
      careTip: 'careTip'
    });

    this.renderFabricGrid();

    console.log('[FabricCare] 초기화 완료');
    return this;
  }

  renderFabricGrid() {
    this.elements.fabricGrid.innerHTML = Object.entries(this.fabrics).map(([key, fab]) => `
      <div class="fabric-btn" data-fabric="${key}" onclick="fabricCare.selectFabric('${key}')">
        <div class="fabric-icon">${fab.icon}</div>
        <div>${fab.name.split('(')[0].trim()}</div>
      </div>
    `).join('');
  }

  selectFabric(fabric) {
    this.selectedFabric = fabric;

    document.querySelectorAll('.fabric-btn').forEach(btn => {
      btn.classList.toggle('selected', btn.dataset.fabric === fabric);
    });

    this.showCareInfo(fabric);
  }

  showCareInfo(fabric) {
    const data = this.fabrics[fabric];

    this.elements.careIcon.textContent = data.icon;
    this.elements.careTitle.textContent = data.name;
    this.elements.careSubtitle.textContent = data.subtitle;

    this.elements.careGrid.innerHTML = data.care.map(c => `
      <div class="care-card">
        <div class="care-card-icon">${c.icon}</div>
        <div class="care-card-title">${c.title}</div>
        <div class="care-card-desc">${c.desc}</div>
      </div>
    `).join('');

    this.elements.symbolsSection.innerHTML = data.symbols.map(s => `
      <div class="symbol-row">
        <div class="symbol-icon">${s.icon}</div>
        <div class="symbol-text">${s.text}</div>
      </div>
    `).join('');

    this.elements.warningBox.innerHTML = `<strong>주의사항</strong><br>${data.warning}`;
    this.elements.careTip.textContent = data.tip;

    this.elements.careSection.classList.add('show');
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const fabricCare = new FabricCare();
window.FabricCare = fabricCare;

document.addEventListener('DOMContentLoaded', () => fabricCare.init());
