/**
 * 재활용 가이드 - ToolBase 기반
 * 올바른 분리배출 방법
 * @created 2026-01-13
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var RecycleGuide = class RecycleGuide extends ToolBase {
  constructor() {
    super('RecycleGuide');
    this.category = 'all';
    this.searchQuery = '';

    this.items = [
      { name: '페트병', category: 'plastic', type: 'recyclable', method: '라벨 제거 후 압축하여 배출',
        steps: ['내용물 비우고 물로 헹구기', '라벨 제거하기', '납작하게 압축하기', '뚜껑 닫아서 배출'],
        tips: ['색깔 있는 페트병도 재활용 가능', '투명 페트병 별도 분리 권장'] },
      { name: 'PP/PE 용기', category: 'plastic', type: 'recyclable', method: '씻어서 재활용으로 배출',
        steps: ['내용물 비우기', '물로 헹구기', '플라스틱으로 배출'],
        tips: ['용기 바닥의 재활용 마크 확인'] },
      { name: '스티로폼', category: 'plastic', type: 'recyclable', method: '이물질 제거 후 배출',
        steps: ['테이프, 스티커 제거', '음식물 묻었으면 씻기', '스티로폼으로 배출'],
        tips: ['색깔 스티로폼은 일반쓰레기', '건어물 포장재는 일반쓰레기'] },
      { name: '비닐봉지', category: 'vinyl', type: 'recyclable', method: '이물질 제거 후 배출',
        steps: ['내용물 비우기', '이물질 털어내기', '비닐류로 배출'],
        tips: ['음식물 오염 심하면 일반쓰레기'] },
      { name: '종이박스', category: 'paper', type: 'recyclable', method: '테이프 제거 후 접어서 배출',
        steps: ['테이프, 송장 제거', '납작하게 접기', '종이류로 배출'],
        tips: ['젖은 종이는 일반쓰레기'] },
      { name: '신문지/책', category: 'paper', type: 'recyclable', method: '묶어서 배출',
        steps: ['끈으로 묶기', '종이류로 배출'],
        tips: ['스프링 제본은 분리해서 배출'] },
      { name: '종이컵', category: 'paper', type: 'recyclable', method: '헹구어 말린 후 배출',
        steps: ['내용물 비우기', '물로 헹구기', '말려서 배출'],
        tips: ['코팅 종이컵도 재활용 가능', '빨대는 별도 분리'] },
      { name: '우유팩', category: 'paper', type: 'recyclable', method: '씻어 말린 후 별도 배출',
        steps: ['내용물 비우기', '물로 헹구기', '펼쳐서 말리기', '우유팩으로 별도 배출'],
        tips: ['종이팩 전용 수거함 이용'] },
      { name: '유리병', category: 'glass', type: 'recyclable', method: '내용물 비우고 배출',
        steps: ['내용물 비우기', '뚜껑 분리', '유리류로 배출'],
        tips: ['깨진 유리는 신문지에 싸서 일반쓰레기'] },
      { name: '맥주/소주병', category: 'glass', type: 'recyclable', method: '빈병 보증금 환불 또는 재활용',
        steps: ['내용물 비우기', '빈병 수거함에 배출'],
        tips: ['보증금 돌려받기 가능'] },
      { name: '알루미늄 캔', category: 'metal', type: 'recyclable', method: '압축하여 배출',
        steps: ['내용물 비우기', '물로 헹구기', '압축하기', '캔류로 배출'],
        tips: ['캔 따개는 붙인 채로 배출'] },
      { name: '철캔', category: 'metal', type: 'recyclable', method: '씻어서 배출',
        steps: ['내용물 비우기', '물로 헹구기', '캔류로 배출'],
        tips: ['자석에 붙으면 철캔'] },
      { name: '형광등', category: 'special', type: 'special', method: '주민센터/마트 수거함 배출',
        steps: ['깨지지 않게 보관', '전용 수거함에 배출'],
        tips: ['깨진 형광등은 별도 포장', '수은 함유로 특수폐기물'] },
      { name: '건전지', category: 'special', type: 'special', method: '전용 수거함 배출',
        steps: ['절연테이프로 양극 감싸기', '전용 수거함에 배출'],
        tips: ['아파트/마트/주민센터 수거함 이용'] },
      { name: '의약품', category: 'special', type: 'hazardous', method: '약국 수거함 배출',
        steps: ['약국 폐의약품 수거함에 배출'],
        tips: ['절대 변기나 싱크대에 버리지 않기'] },
      { name: '음식물 쓰레기', category: 'food', type: 'recyclable', method: '물기 제거 후 배출',
        steps: ['이물질 제거', '물기 최대한 빼기', '음식물 봉투에 배출'],
        tips: ['동물뼈, 조개껍데기는 일반쓰레기'] },
      { name: '과일 껍질', category: 'food', type: 'recyclable', method: '음식물로 배출',
        steps: ['음식물 봉투에 배출'],
        tips: ['파인애플 껍질, 코코넛은 일반쓰레기'] },
      { name: '영수증', category: 'paper', type: 'general', method: '일반쓰레기로 배출',
        steps: ['일반쓰레기로 배출'],
        tips: ['감열지는 재활용 불가'] },
      { name: '치킨 박스', category: 'paper', type: 'general', method: '일반쓰레기로 배출',
        steps: ['음식물 묻은 부분은 일반쓰레기', '깨끗한 부분만 종이류'],
        tips: ['기름 오염 심하면 전체 일반쓰레기'] }
    ];
  }

  init() {
    this.initElements({
      itemList: 'itemList',
      detailModal: 'detailModal',
      modalTitle: 'modalTitle',
      modalBody: 'modalBody'
    });

    this.render();

    console.log('[RecycleGuide] 초기화 완료');
    return this;
  }

  setCategory(category) {
    this.category = category;

    document.querySelectorAll('.category-btn').forEach(btn => {
      const categories = { all: '전체', plastic: '플라스틱', paper: '종이', glass: '유리', metal: '금속', vinyl: '비닐', food: '음식물', special: '특수' };
      btn.classList.toggle('active', btn.textContent.includes(categories[category]));
    });

    this.render();
  }

  search(query) {
    this.searchQuery = query.toLowerCase();
    this.render();
  }

  getFilteredItems() {
    let filtered = this.items;

    if (this.category !== 'all') {
      filtered = filtered.filter(item => item.category === this.category);
    }

    if (this.searchQuery) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(this.searchQuery) ||
        item.method.toLowerCase().includes(this.searchQuery)
      );
    }

    return filtered;
  }

  render() {
    const filtered = this.getFilteredItems();

    if (filtered.length === 0) {
      this.elements.itemList.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-secondary);">검색 결과가 없습니다</div>';
      return;
    }

    const typeLabels = {
      recyclable: '재활용',
      general: '일반쓰레기',
      special: '특수폐기물',
      hazardous: '유해폐기물'
    };

    this.elements.itemList.innerHTML = filtered.map((item, idx) => `
      <div class="item-card" onclick="recycleGuide.showDetail(${idx})">
        <div class="item-header">
          <span class="item-name">${item.name}</span>
          <span class="item-category ${item.type}">${typeLabels[item.type]}</span>
        </div>
        <div class="item-method">${item.method}</div>
      </div>
    `).join('');
  }

  showDetail(idx) {
    const filtered = this.getFilteredItems();
    const item = filtered[idx];
    if (!item) return;

    this.elements.modalTitle.textContent = item.name;

    const typeLabels = {
      recyclable: '재활용 가능',
      general: '일반쓰레기',
      special: '특수폐기물',
      hazardous: '유해폐기물'
    };

    this.elements.modalBody.innerHTML = `
      <div class="detail-section">
        <div class="detail-section-title">분류</div>
        <p>${typeLabels[item.type]}</p>
      </div>
      <div class="detail-section">
        <div class="detail-section-title">배출 방법</div>
        <ol class="detail-list">
          ${item.steps.map(step => `<li>${step}</li>`).join('')}
        </ol>
      </div>
      <div class="detail-section">
        <div class="detail-section-title">주의사항</div>
        <ul class="detail-list">
          ${item.tips.map(tip => `<li>${tip}</li>`).join('')}
        </ul>
      </div>
    `;

    this.elements.detailModal.classList.add('show');
  }

  closeModal(e) {
    if (!e || e.target.id === 'detailModal') {
      this.elements.detailModal.classList.remove('show');
    }
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const recycleGuide = new RecycleGuide();
window.RecycleGuide = recycleGuide;

document.addEventListener('DOMContentLoaded', () => recycleGuide.init());
