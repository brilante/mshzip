/**
 * 재료 대체 검색 - ToolBase 기반
 * 없는 재료의 대체품 찾기
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var SubstitutionFinder = class SubstitutionFinder extends ToolBase {
  constructor() {
    super('SubstitutionFinder');
    this.currentCategory = 'all';
    this.substitutes = [
      {
        name: '버터',
        category: 'dairy',
        alternatives: [
          { icon: '', name: '아보카도', ratio: '1:1', desc: '베이킹에 적합, 부드러운 질감' },
          { icon: '', name: '코코넛 오일', ratio: '1:1', desc: '고체 상태로 사용, 풍미 추가' },
          { icon: '', name: '올리브 오일', ratio: '3/4 비율', desc: '액체류에 적합' },
          { icon: '', name: '바나나 퓨레', ratio: '1/2 비율', desc: '단맛 추가, 수분 조절 필요' }
        ]
      },
      {
        name: '우유',
        category: 'dairy',
        alternatives: [
          { icon: '', name: '두유', ratio: '1:1', desc: '가장 일반적인 대체품' },
          { icon: '', name: '코코넛 밀크', ratio: '1:1', desc: '크리미한 질감, 풍미 있음' },
          { icon: '', name: '귀리 우유', ratio: '1:1', desc: '부드러운 맛' },
          { icon: '', name: '아몬드 밀크', ratio: '1:1', desc: '가벼운 맛, 칼로리 낮음' }
        ]
      },
      {
        name: '달걀',
        category: 'eggs',
        alternatives: [
          { icon: '', name: '바나나', ratio: '1개 = 바나나 1/2개', desc: '단맛 추가됨, 머핀에 적합' },
          { icon: '', name: '아쿠아파바', ratio: '1개 = 3큰술', desc: '병아리콩 물, 머랭에 적합' },
          { icon: '', name: '아마씨 + 물', ratio: '1개 = 1큰술+3큰술', desc: '결착력 우수' },
          { icon: '', name: '요거트', ratio: '1개 = 1/4컵', desc: '촉촉함 유지' }
        ]
      },
      {
        name: '생크림',
        category: 'dairy',
        alternatives: [
          { icon: '', name: '코코넛 크림', ratio: '1:1', desc: '비건 대체품, 휘핑 가능' },
          { icon: '', name: '두부 크림', ratio: '1:1', desc: '연두부 블렌딩' },
          { icon: '', name: '캐슈넛 크림', ratio: '1:1', desc: '불린 캐슈 블렌딩' }
        ]
      },
      {
        name: '밀가루',
        category: 'flour',
        alternatives: [
          { icon: '', name: '쌀가루', ratio: '1:1', desc: '글루텐 프리, 질감 가벼움' },
          { icon: '', name: '아몬드 가루', ratio: '1:1', desc: '저탄수, 고단백' },
          { icon: '', name: '코코넛 가루', ratio: '1/4 비율', desc: '흡수력 높음, 물 추가 필요' },
          { icon: '', name: '귀리 가루', ratio: '1:1', desc: '통곡물, 식이섬유 풍부' }
        ]
      },
      {
        name: '설탕',
        category: 'sweetener',
        alternatives: [
          { icon: '', name: '꿀', ratio: '3/4 비율', desc: '액체 줄이기 필요' },
          { icon: '', name: '메이플 시럽', ratio: '3/4 비율', desc: '풍미 있는 단맛' },
          { icon: '', name: '코코넛 슈가', ratio: '1:1', desc: '낮은 혈당 지수' },
          { icon: '', name: '대추 시럽', ratio: '2/3 비율', desc: '천연 감미료' }
        ]
      },
      {
        name: '베이킹 파우더',
        category: 'flour',
        alternatives: [
          { icon: '', name: '베이킹소다 + 식초', ratio: '1tsp = 1/4tsp + 1/2tsp', desc: '즉시 사용' },
          { icon: '', name: '베이킹소다 + 요거트', ratio: '1tsp = 1/4tsp + 1/2컵', desc: '유제품 포함' },
          { icon: '', name: '베이킹소다 + 레몬즙', ratio: '1tsp = 1/4tsp + 1tsp', desc: '신맛 추가' }
        ]
      },
      {
        name: '올리브 오일',
        category: 'oil',
        alternatives: [
          { icon: '', name: '아보카도 오일', ratio: '1:1', desc: '고온 조리 적합' },
          { icon: '', name: '코코넛 오일', ratio: '1:1', desc: '은은한 코코넛 향' },
          { icon: '', name: '해바라기 오일', ratio: '1:1', desc: '중립적인 맛' },
          { icon: '', name: '포도씨 오일', ratio: '1:1', desc: '가벼운 맛' }
        ]
      },
      {
        name: '간장',
        category: 'oil',
        alternatives: [
          { icon: '', name: '코코넛 아미노', ratio: '1:1', desc: '글루텐/대두 프리' },
          { icon: '', name: '우스터 소스', ratio: '1:1', desc: '비슷한 감칠맛' },
          { icon: '', name: '표고버섯 소스', ratio: '1:1', desc: '깊은 감칠맛' }
        ]
      }
    ];
  }

  init() {
    this.initElements({
      searchInput: 'searchInput',
      resultsList: 'resultsList'
    });

    this.render();

    console.log('[SubstitutionFinder] 초기화 완료');
    return this;
  }

  search() {
    this.render();
  }

  filterCategory(category) {
    this.currentCategory = category;

    document.querySelectorAll('.category-tab').forEach(tab => {
      tab.classList.remove('active');
    });
    event.target.classList.add('active');

    this.render();
  }

  render() {
    const container = this.elements.resultsList;
    const query = this.elements.searchInput.value.toLowerCase().trim();

    let results = this.substitutes;

    if (this.currentCategory !== 'all') {
      results = results.filter(s => s.category === this.currentCategory);
    }

    if (query) {
      results = results.filter(s =>
        s.name.toLowerCase().includes(query) ||
        s.alternatives.some(a => a.name.toLowerCase().includes(query))
      );
    }

    if (results.length === 0) {
      container.innerHTML = `
        <div class="no-result">
          <div style="font-size: 3rem; margin-bottom: 1rem;"></div>
          <div>검색 결과가 없습니다</div>
        </div>
      `;
      return;
    }

    container.innerHTML = results.map(item => `
      <div class="substitute-card">
        <div class="substitute-header">
          <div class="substitute-name">${item.name}</div>
          <div class="substitute-category">${this.getCategoryName(item.category)}</div>
        </div>
        <div class="substitute-list">
          ${item.alternatives.map(alt => `
            <div class="substitute-item">
              <div class="substitute-icon">${alt.icon}</div>
              <div class="substitute-info">
                <h4>${alt.name}</h4>
                <p>${alt.desc}</p>
                <div class="substitute-ratio">비율: ${alt.ratio}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');
  }

  getCategoryName(category) {
    const names = {
      dairy: '유제품',
      eggs: '달걀',
      flour: '밀가루/베이킹',
      sweetener: '감미료',
      oil: '오일/소스'
    };
    return names[category] || category;
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const substitutionFinder = new SubstitutionFinder();
window.SubstitutionFinder = substitutionFinder;

document.addEventListener('DOMContentLoaded', () => substitutionFinder.init());
