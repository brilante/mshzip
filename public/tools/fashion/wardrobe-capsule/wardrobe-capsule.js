/**
 * 캡슐 옷장 - ToolBase 기반
 * 미니멀 옷장 체크리스트
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var Capsule = class Capsule extends ToolBase {
  constructor() {
    super('Capsule');
    this.season = 'spring';
    this.checked = {};

    this.capsuleData = {
      spring: {
        tops: [
          { name: '흰색 셔츠', essential: true },
          { name: '스트라이프 셔츠', essential: false },
          { name: '베이지 니트', essential: true },
          { name: '데님 셔츠', essential: false },
          { name: '흰색 티셔츠', essential: true }
        ],
        bottoms: [
          { name: '스트레이트 청바지', essential: true },
          { name: '베이지 치노 팬츠', essential: true },
          { name: '화이트 팬츠', essential: false },
          { name: 'A라인 스커트', essential: false }
        ],
        outer: [
          { name: '트렌치 코트', essential: true },
          { name: '데님 재킷', essential: true },
          { name: '가디건', essential: false }
        ],
        shoes: [
          { name: '흰색 스니커즈', essential: true },
          { name: '로퍼', essential: true },
          { name: '앵클 부츠', essential: false }
        ],
        accessories: [
          { name: '캔버스 백', essential: true },
          { name: '실크 스카프', essential: false },
          { name: '선글라스', essential: false }
        ]
      },
      summer: {
        tops: [
          { name: '흰색 티셔츠', essential: true },
          { name: '린넨 셔츠', essential: true },
          { name: '스트라이프 티', essential: false },
          { name: '민소매 블라우스', essential: false }
        ],
        bottoms: [
          { name: '데님 쇼츠', essential: true },
          { name: '린넨 팬츠', essential: true },
          { name: '미디 스커트', essential: false },
          { name: '와이드 팬츠', essential: false }
        ],
        outer: [
          { name: '얇은 가디건', essential: true },
          { name: '린넨 재킷', essential: false }
        ],
        shoes: [
          { name: '흰색 스니커즈', essential: true },
          { name: '샌들', essential: true },
          { name: '에스파드리유', essential: false }
        ],
        accessories: [
          { name: '라피아 백', essential: false },
          { name: '밀짚 모자', essential: false },
          { name: '선글라스', essential: true }
        ]
      },
      autumn: {
        tops: [
          { name: '터틀넥 니트', essential: true },
          { name: '체크 셔츠', essential: false },
          { name: '카멜 니트', essential: true },
          { name: '흰색 셔츠', essential: true }
        ],
        bottoms: [
          { name: '다크 데님', essential: true },
          { name: '코듀로이 팬츠', essential: false },
          { name: '울 팬츠', essential: true },
          { name: '플리츠 스커트', essential: false }
        ],
        outer: [
          { name: '레더 재킷', essential: true },
          { name: '울 코트', essential: true },
          { name: '블레이저', essential: false }
        ],
        shoes: [
          { name: '첼시 부츠', essential: true },
          { name: '로퍼', essential: true },
          { name: '운동화', essential: false }
        ],
        accessories: [
          { name: '레더 백', essential: true },
          { name: '울 스카프', essential: false },
          { name: '베레모', essential: false }
        ]
      },
      winter: {
        tops: [
          { name: '캐시미어 니트', essential: true },
          { name: '터틀넥', essential: true },
          { name: '후드티', essential: false },
          { name: '플란넬 셔츠', essential: false }
        ],
        bottoms: [
          { name: '울 팬츠', essential: true },
          { name: '다크 데님', essential: true },
          { name: '기모 레깅스', essential: false }
        ],
        outer: [
          { name: '롱 패딩', essential: true },
          { name: '울 코트', essential: true },
          { name: '숏 패딩', essential: false },
          { name: '무스탕', essential: false }
        ],
        shoes: [
          { name: '워커 부츠', essential: true },
          { name: '방한 부츠', essential: true },
          { name: '어그 부츠', essential: false }
        ],
        accessories: [
          { name: '머플러', essential: true },
          { name: '장갑', essential: true },
          { name: '비니', essential: false },
          { name: '핸드백', essential: true }
        ]
      }
    };

    this.categoryNames = {
      tops: '상의',
      bottoms: '하의',
      outer: '아우터',
      shoes: '신발',
      accessories: '액세서리'
    };
  }

  init() {
    this.initElements({
      categoryList: 'categoryList',
      totalItems: 'totalItems',
      ownedItems: 'ownedItems',
      neededItems: 'neededItems',
      progressText: 'progressText',
      progressRing: 'progressRing'
    });

    this.loadData();
    this.render();

    console.log('[Capsule] 초기화 완료');
    return this;
  }

  loadData() {
    try {
      const saved = localStorage.getItem('capsuleChecked');
      if (saved) {
        this.checked = JSON.parse(saved);
      }
    } catch (e) {}
  }

  saveData() {
    localStorage.setItem('capsuleChecked', JSON.stringify(this.checked));
  }

  setSeason(season) {
    this.season = season;
    document.querySelectorAll('.season-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.season === season);
    });
    this.render();
  }

  getKey(category, index) {
    return `${this.season}_${category}_${index}`;
  }

  toggle(category, index) {
    const key = this.getKey(category, index);
    this.checked[key] = !this.checked[key];
    this.saveData();
    this.render();
  }

  render() {
    const data = this.capsuleData[this.season];

    let totalCount = 0;
    let checkedCount = 0;

    let html = '';
    for (const [cat, items] of Object.entries(data)) {
      const catChecked = items.filter((_, i) => this.checked[this.getKey(cat, i)]).length;
      totalCount += items.length;
      checkedCount += catChecked;

      html += `<div class="category-section">
        <div class="category-header">
          <span class="category-name">${this.categoryNames[cat]}</span>
          <span class="category-count">${catChecked}/${items.length}</span>
        </div>
        <div class="item-list">
          ${items.map((item, i) => {
            const key = this.getKey(cat, i);
            const isChecked = this.checked[key];
            return `<div class="item-row">
              <div class="item-check ${isChecked ? 'checked' : ''}" onclick="capsule.toggle('${cat}', ${i})">
                ${isChecked ? '' : ''}
              </div>
              <span class="item-name">${item.name}</span>
              ${item.essential ? '<span class="item-essential">필수</span>' : ''}
            </div>`;
          }).join('')}
        </div>
      </div>`;
    }

    this.elements.categoryList.innerHTML = html;

    // 통계 업데이트
    const percent = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;
    this.elements.totalItems.textContent = totalCount;
    this.elements.ownedItems.textContent = checkedCount;
    this.elements.neededItems.textContent = totalCount - checkedCount;
    this.elements.progressText.textContent = percent + '%';

    // 프로그레스 링 업데이트
    const circumference = 2 * Math.PI * 45;
    const offset = circumference - (percent / 100) * circumference;
    this.elements.progressRing.style.strokeDashoffset = offset;
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const capsule = new Capsule();
window.Capsule = capsule;

document.addEventListener('DOMContentLoaded', () => capsule.init());
