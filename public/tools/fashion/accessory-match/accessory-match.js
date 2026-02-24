/**
 * 액세서리 매칭 - ToolBase 기반
 * 의상에 맞는 액세서리 추천
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var AccessoryMatch = class AccessoryMatch extends ToolBase {
  constructor() {
    super('AccessoryMatch');
    this.selectedOutfit = null;
    this.occasion = 'daily';

    this.outfits = [
      { id: 'casual', icon: '', name: '캐주얼' },
      { id: 'formal', icon: '', name: '포멀' },
      { id: 'sporty', icon: '', name: '스포티' },
      { id: 'romantic', icon: '', name: '로맨틱' },
      { id: 'street', icon: '', name: '스트릿' },
      { id: 'minimal', icon: '', name: '미니멀' }
    ];

    this.accessories = {
      casual: {
        daily: [
          { icon: '', name: '캐주얼 시계', desc: '가죽밴드 또는 나토밴드', level: 'perfect' },
          { icon: '', name: '백팩/토트백', desc: '실용적인 캔버스 소재', level: 'perfect' },
          { icon: '', name: '볼캡/비니', desc: '포인트 컬러로 활용', level: 'good' },
          { icon: '', name: '흰색 스니커즈', desc: '클린한 캐주얼 필수템', level: 'perfect' }
        ],
        office: [
          { icon: '', name: '클래식 시계', desc: '메탈 또는 가죽밴드', level: 'perfect' },
          { icon: '', name: '심플 토트백', desc: '블랙 또는 브라운', level: 'perfect' },
          { icon: '', name: '미니멀 목걸이', desc: '작은 펜던트', level: 'good' },
          { icon: '', name: '로퍼', desc: '클린한 가죽 로퍼', level: 'good' }
        ],
        date: [
          { icon: '', name: '레이어드 목걸이', desc: '골드 또는 실버', level: 'perfect' },
          { icon: '', name: '크로스백', desc: '작은 사이즈 포인트', level: 'perfect' },
          { icon: '', name: '선글라스', desc: '세련된 프레임', level: 'good' },
          { icon: '', name: '깔끔한 시계', desc: '슬림 케이스', level: 'good' }
        ],
        party: [
          { icon: '', name: '스테이트먼트 이어링', desc: '화려한 드롭 이어링', level: 'perfect' },
          { icon: '', name: '클러치백', desc: '메탈릭 또는 새틴', level: 'perfect' },
          { icon: '', name: '레이어드 체인', desc: '다양한 길이 믹스', level: 'good' },
          { icon: '', name: '힐', desc: '적당한 높이', level: 'good' }
        ]
      },
      formal: {
        daily: [
          { icon: '', name: '드레스 워치', desc: '슬림한 케이스', level: 'perfect' },
          { icon: '', name: '서류가방', desc: '가죽 브리프케이스', level: 'good' },
          { icon: '', name: '타이/스카프', desc: '포인트 액세서리', level: 'good' },
          { icon: '', name: '옥스포드/로퍼', desc: '광택 가죽', level: 'perfect' }
        ],
        office: [
          { icon: '', name: '클래식 워치', desc: '골드/실버 메탈', level: 'perfect' },
          { icon: '', name: '명함지갑', desc: '가죽 소재', level: 'perfect' },
          { icon: '', name: '커프스 버튼', desc: '은색 또는 금색', level: 'good' },
          { icon: '', name: '심플 넥타이핀', desc: '세련된 디자인', level: 'good' }
        ],
        date: [
          { icon: '', name: '세련된 시계', desc: '고급스러운 디자인', level: 'perfect' },
          { icon: '', name: '심플 주얼리', desc: '적절한 포인트', level: 'perfect' },
          { icon: '', name: '실크 스카프', desc: '포켓치프로 활용', level: 'good' },
          { icon: '', name: '더비/몽크스트랩', desc: '유광 가죽', level: 'good' }
        ],
        party: [
          { icon: '', name: '럭셔리 시계', desc: '골드 또는 다이아', level: 'perfect' },
          { icon: '', name: '커프스 버튼', desc: '스톤 장식', level: 'perfect' },
          { icon: '', name: '이브닝 클러치', desc: '새틴/벨벳', level: 'good' },
          { icon: '', name: '스터드 이어링', desc: '다이아몬드 스타일', level: 'good' }
        ]
      },
      sporty: {
        daily: [
          { icon: '', name: '스포츠 워치', desc: '디지털/스마트 워치', level: 'perfect' },
          { icon: '', name: '스포츠 백팩', desc: '기능성 소재', level: 'perfect' },
          { icon: '', name: '볼캡', desc: '브랜드 로고', level: 'perfect' },
          { icon: '', name: '러닝화/트레이너', desc: '편안한 쿠션', level: 'perfect' }
        ],
        office: [
          { icon: '', name: '스마트워치', desc: '깔끔한 밴드', level: 'perfect' },
          { icon: '', name: '비즈니스 백팩', desc: '노트북 수납', level: 'perfect' },
          { icon: '', name: '클린 스니커즈', desc: '화이트/블랙', level: 'good' },
          { icon: '', name: '심플 스카프', desc: '무채색 톤', level: 'good' }
        ],
        date: [
          { icon: '', name: '캐주얼 시계', desc: '나토 스트랩', level: 'perfect' },
          { icon: '', name: '미니 백팩', desc: '가벼운 소재', level: 'good' },
          { icon: '', name: '스포츠 선글라스', desc: '세련된 디자인', level: 'good' },
          { icon: '', name: '캡', desc: '심플 디자인', level: 'good' }
        ],
        party: [
          { icon: '', name: '메탈 워치', desc: '스포티한 디자인', level: 'good' },
          { icon: '', name: '심플 체인', desc: '골드/실버', level: 'good' },
          { icon: '', name: '하이탑 스니커즈', desc: '클린한 디자인', level: 'good' },
          { icon: '', name: '슬링백', desc: '컴팩트 사이즈', level: 'good' }
        ]
      },
      romantic: {
        daily: [
          { icon: '', name: '진주 목걸이', desc: '싱글 또는 레이어드', level: 'perfect' },
          { icon: '', name: '미니 숄더백', desc: '파스텔 또는 플로럴', level: 'perfect' },
          { icon: '', name: '반지 세트', desc: '얇은 골드/실버', level: 'good' },
          { icon: '', name: '헤어 액세서리', desc: '리본/핀', level: 'good' }
        ],
        office: [
          { icon: '', name: '펄 주얼리', desc: '우아한 이어링', level: 'perfect' },
          { icon: '', name: '레이디백', desc: '구조적 핸드백', level: 'perfect' },
          { icon: '', name: '로즈골드 시계', desc: '여성스러운 디자인', level: 'good' },
          { icon: '', name: '실크 스카프', desc: '목에 가볍게', level: 'good' }
        ],
        date: [
          { icon: '', name: '드롭 이어링', desc: '흔들리는 디자인', level: 'perfect' },
          { icon: '', name: '체인 미니백', desc: '골드 체인', level: 'perfect' },
          { icon: '', name: '펜던트 목걸이', desc: '하트/플라워', level: 'perfect' },
          { icon: '', name: '스택 반지', desc: '여러 개 레이어링', level: 'good' }
        ],
        party: [
          { icon: '', name: '샹들리에 이어링', desc: '화려한 크리스탈', level: 'perfect' },
          { icon: '', name: '새틴 클러치', desc: '핑크/골드', level: 'perfect' },
          { icon: '', name: '초커 목걸이', desc: '벨벳/진주', level: 'good' },
          { icon: '', name: '스트랩 힐', desc: '앵클 스트랩', level: 'good' }
        ]
      },
      street: {
        daily: [
          { icon: '', name: '비니/볼캡', desc: '로고 또는 무지', level: 'perfect' },
          { icon: '', name: '크로스 바디백', desc: '나일론/캔버스', level: 'perfect' },
          { icon: '', name: '체인 목걸이', desc: '두꺼운 체인', level: 'good' },
          { icon: '', name: '하이탑/덩크', desc: '컬러 포인트', level: 'perfect' }
        ],
        office: [
          { icon: '', name: '캐주얼 시계', desc: '나토 스트랩', level: 'good' },
          { icon: '', name: '미니멀 백팩', desc: '블랙 가죽', level: 'perfect' },
          { icon: '', name: '클린 스니커즈', desc: '올블랙/올화이트', level: 'perfect' },
          { icon: '', name: '심플 스카프', desc: '무채색', level: 'good' }
        ],
        date: [
          { icon: '', name: '빈티지 선글라스', desc: '유니크한 프레임', level: 'perfect' },
          { icon: '', name: '레이어드 체인', desc: '믹스 메탈', level: 'perfect' },
          { icon: '', name: '숄더백', desc: '빈티지 느낌', level: 'good' },
          { icon: '', name: '버킷햇', desc: '패턴/컬러', level: 'good' }
        ],
        party: [
          { icon: '', name: '청키 체인', desc: '과감한 디자인', level: 'perfect' },
          { icon: '', name: '미니 체인백', desc: '메탈릭', level: 'perfect' },
          { icon: '', name: '컬러 선글라스', desc: '틴티드 렌즈', level: 'good' },
          { icon: '', name: '시그넷 링', desc: '볼드한 디자인', level: 'good' }
        ]
      },
      minimal: {
        daily: [
          { icon: '', name: '심플 시계', desc: '얇은 가죽밴드', level: 'perfect' },
          { icon: '', name: '토트백', desc: '무지 가죽', level: 'perfect' },
          { icon: '', name: '바 목걸이', desc: '얇은 골드/실버', level: 'good' },
          { icon: '', name: '미니멀 스니커즈', desc: '화이트/블랙', level: 'perfect' }
        ],
        office: [
          { icon: '', name: '드레스 워치', desc: '메탈 밴드', level: 'perfect' },
          { icon: '', name: '구조적 백', desc: '블랙/네이비', level: 'perfect' },
          { icon: '', name: '스터드 이어링', desc: '작은 골드/실버', level: 'good' },
          { icon: '', name: '포인티드 로퍼', desc: '무광 가죽', level: 'good' }
        ],
        date: [
          { icon: '', name: '펜던트 목걸이', desc: '심플한 도형', level: 'perfect' },
          { icon: '', name: '미니백', desc: '클린한 디자인', level: 'perfect' },
          { icon: '', name: '메쉬 밴드 시계', desc: '골드/실버', level: 'good' },
          { icon: '', name: '밴드 링', desc: '얇은 골드', level: 'good' }
        ],
        party: [
          { icon: '', name: '심플 드롭 이어링', desc: '기하학 디자인', level: 'perfect' },
          { icon: '', name: '미니멀 클러치', desc: '무광 가죽', level: 'perfect' },
          { icon: '', name: 'Y 목걸이', desc: '얇은 체인', level: 'good' },
          { icon: '', name: '스태킹 반지', desc: '심플 밴드', level: 'good' }
        ]
      }
    };

    this.tips = {
      casual: '캐주얼 룩에는 하나의 포인트 액세서리로 충분합니다. 과하지 않게!',
      formal: '포멀 룩은 품질 좋은 클래식 아이템으로 완성하세요.',
      sporty: '스포티 룩에는 기능성과 편안함을 우선으로 선택하세요.',
      romantic: '로맨틱 룩에는 레이어링과 섬세한 디테일이 포인트입니다.',
      street: '스트릿 룩에는 과감한 믹스매치가 개성을 더합니다.',
      minimal: '미니멀 룩은 절제미가 핵심입니다. 하나만 선택하세요.'
    };
  }

  init() {
    this.initElements({
      outfitSelector: 'outfitSelector',
      recommendSection: 'recommendSection',
      accessoryGrid: 'accessoryGrid',
      stylingTip: 'stylingTip'
    });

    this.renderOutfitSelector();

    console.log('[AccessoryMatch] 초기화 완료');
    return this;
  }

  renderOutfitSelector() {
    this.elements.outfitSelector.innerHTML = this.outfits.map(o => `
      <div class="outfit-option" data-outfit="${o.id}" onclick="accessoryMatch.selectOutfit('${o.id}')">
        <div class="outfit-icon">${o.icon}</div>
        <div class="outfit-name">${o.name}</div>
      </div>
    `).join('');
  }

  selectOutfit(outfit) {
    this.selectedOutfit = outfit;

    document.querySelectorAll('.outfit-option').forEach(opt => {
      opt.classList.toggle('selected', opt.dataset.outfit === outfit);
    });

    this.showRecommendations();
  }

  setOccasion(occasion) {
    this.occasion = occasion;

    document.querySelectorAll('.occasion-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.occasion === occasion);
    });

    if (this.selectedOutfit) {
      this.showRecommendations();
    }
  }

  showRecommendations() {
    if (!this.selectedOutfit) return;

    const items = this.accessories[this.selectedOutfit]?.[this.occasion] || [];

    this.elements.accessoryGrid.innerHTML = items.map(item => `
      <div class="accessory-card">
        <div class="accessory-icon">${item.icon}</div>
        <div class="accessory-name">${item.name}</div>
        <div class="accessory-desc">${item.desc}</div>
        <span class="match-level ${item.level === 'perfect' ? 'match-perfect' : 'match-good'}">
          ${item.level === 'perfect' ? '완벽한 매치' : '좋은 매치'}
        </span>
      </div>
    `).join('');

    this.elements.stylingTip.textContent = this.tips[this.selectedOutfit];
    this.elements.recommendSection.classList.add('show');
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const accessoryMatch = new AccessoryMatch();
window.AccessoryMatch = accessoryMatch;

document.addEventListener('DOMContentLoaded', () => accessoryMatch.init());
