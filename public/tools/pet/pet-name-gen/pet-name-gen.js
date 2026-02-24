/**
 * 반려동물 이름 생성기 - ToolBase 기반
 * 테마별 이름 추천
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class PetNameGen extends ToolBase {
  constructor() {
    super('PetNameGen');
    this.currentTheme = 'cute';
    this.favorites = [];

    this.names = {
      cute: {
        male: [
          { name: '뽀삐', meaning: '통통 튀는 귀여움' },
          { name: '몽이', meaning: '몽글몽글 부드러운' },
          { name: '콩이', meaning: '작고 동그란' },
          { name: '뭉치', meaning: '뭉게구름 같은' },
          { name: '보리', meaning: '황금빛 보리' },
          { name: '호두', meaning: '단단한 매력' },
          { name: '밤이', meaning: '달콤한 밤처럼' },
          { name: '두부', meaning: '하얗고 부드러운' },
          { name: '모찌', meaning: '쫀득한 매력' },
          { name: '덕이', meaning: '복덕방에서 온' }
        ],
        female: [
          { name: '뽀미', meaning: '뽀송뽀송한' },
          { name: '솜이', meaning: '솜사탕 같은' },
          { name: '콩순이', meaning: '앙증맞은' },
          { name: '달이', meaning: '달빛처럼 고운' },
          { name: '별이', meaning: '반짝이는 별' },
          { name: '초코', meaning: '달콤한 초콜릿' },
          { name: '마루', meaning: '따뜻한 마루' },
          { name: '나비', meaning: '나풀나풀' },
          { name: '체리', meaning: '빨간 체리' },
          { name: '모모', meaning: '복숭아처럼' }
        ]
      },
      food: {
        male: [
          { name: '떡이', meaning: '쫄깃한 떡' },
          { name: '라면', meaning: '국민 음식' },
          { name: '김밥', meaning: '동그란 김밥' },
          { name: '만두', meaning: '통통한 만두' },
          { name: '짜장', meaning: '달짝지근' },
          { name: '카레', meaning: '매콤달콤' },
          { name: '오뎅', meaning: '길쭉한 오뎅' },
          { name: '고구마', meaning: '달달한 고구마' },
          { name: '순대', meaning: '쫄깃 순대' },
          { name: '치킨', meaning: '바삭한 치킨' }
        ],
        female: [
          { name: '딸기', meaning: '새콤달콤' },
          { name: '마카롱', meaning: '알록달록' },
          { name: '푸딩', meaning: '부들부들' },
          { name: '쿠키', meaning: '바삭달콤' },
          { name: '도넛', meaning: '동그란 도넛' },
          { name: '와플', meaning: '달콤한 와플' },
          { name: '머핀', meaning: '폭신한 머핀' },
          { name: '캐러멜', meaning: '달콤쌉싸름' },
          { name: '요거트', meaning: '상큼한' },
          { name: '버블티', meaning: '톡톡 튀는' }
        ]
      },
      nature: {
        male: [
          { name: '구름', meaning: '뭉게구름' },
          { name: '바람', meaning: '시원한 바람' },
          { name: '하늘', meaning: '드넓은 하늘' },
          { name: '숲이', meaning: '깊은 숲' },
          { name: '바다', meaning: '넓은 바다' },
          { name: '산이', meaning: '든든한 산' },
          { name: '솔이', meaning: '푸른 소나무' },
          { name: '강이', meaning: '유유히 흐르는' },
          { name: '돌이', meaning: '단단한 바위' },
          { name: '눈이', meaning: '하얀 눈' }
        ],
        female: [
          { name: '봄이', meaning: '따뜻한 봄' },
          { name: '여름', meaning: '활기찬 여름' },
          { name: '가을', meaning: '풍요로운 가을' },
          { name: '겨울', meaning: '순백의 겨울' },
          { name: '꽃이', meaning: '아름다운 꽃' },
          { name: '잎새', meaning: '초록 잎새' },
          { name: '이슬', meaning: '맑은 이슬' },
          { name: '무지개', meaning: '일곱빛깔' },
          { name: '달래', meaning: '달래꽃처럼' },
          { name: '민들레', meaning: '강인한 민들레' }
        ]
      },
      royal: {
        male: [
          { name: '레오', meaning: '사자왕' },
          { name: '맥스', meaning: '위대한' },
          { name: '루이', meaning: '명예로운 전사' },
          { name: '오스카', meaning: '신의 창' },
          { name: '해리', meaning: '군대의 지배자' },
          { name: '찰리', meaning: '자유인' },
          { name: '헨리', meaning: '가문의 통치자' },
          { name: '윌리엄', meaning: '굳센 보호자' },
          { name: '알렉스', meaning: '수호자' },
          { name: '올리버', meaning: '올리브나무' }
        ],
        female: [
          { name: '벨라', meaning: '아름다운' },
          { name: '루나', meaning: '달의 여신' },
          { name: '클로이', meaning: '풋풋한 초록' },
          { name: '소피', meaning: '지혜로운' },
          { name: '릴리', meaning: '순수한 백합' },
          { name: '스텔라', meaning: '별' },
          { name: '아리아', meaning: '공기의 정령' },
          { name: '로지', meaning: '장미' },
          { name: '다이아', meaning: '빛나는 다이아' },
          { name: '노아', meaning: '평화' }
        ]
      },
      unique: {
        male: [
          { name: '픽셀', meaning: '디지털 시대' },
          { name: '비트', meaning: '리듬감' },
          { name: '제로', meaning: '시작점' },
          { name: '코스모', meaning: '우주' },
          { name: '네오', meaning: '새로운' },
          { name: '에코', meaning: '메아리' },
          { name: '젠', meaning: '평온함' },
          { name: '노바', meaning: '신성' },
          { name: '아톰', meaning: '원자' },
          { name: '퀀텀', meaning: '양자' }
        ],
        female: [
          { name: '픽시', meaning: '요정' },
          { name: '니모', meaning: '찾는 자' },
          { name: '제니', meaning: '하얀 파도' },
          { name: '미라', meaning: '놀라운' },
          { name: '키라', meaning: '빛나는' },
          { name: '지지', meaning: '선물' },
          { name: '룰루', meaning: '진주' },
          { name: '코코', meaning: '코코넛' },
          { name: '피피', meaning: '가능성' },
          { name: '네비', meaning: '항해' }
        ]
      },
      korean: {
        male: [
          { name: '청솔', meaning: '푸른 소나무' },
          { name: '한별', meaning: '큰 별' },
          { name: '다온', meaning: '모든 것이 온다' },
          { name: '비온', meaning: '비가 온 뒤' },
          { name: '해온', meaning: '해가 온다' },
          { name: '건우', meaning: '하늘 견우' },
          { name: '한울', meaning: '큰 우주' },
          { name: '나래', meaning: '날개' },
          { name: '다솜', meaning: '사랑' },
          { name: '미르', meaning: '용' }
        ],
        female: [
          { name: '하늬', meaning: '서쪽 바람' },
          { name: '나린', meaning: '내리다' },
          { name: '수아', meaning: '빼어나게 아름다운' },
          { name: '은별', meaning: '은빛 별' },
          { name: '다흰', meaning: '모두 하얀' },
          { name: '라온', meaning: '즐거운' },
          { name: '비나', meaning: '비단' },
          { name: '소담', meaning: '탐스러운' },
          { name: '아련', meaning: '아름답고 고운' },
          { name: '초롱', meaning: '초롱초롱' }
        ]
      }
    };
  }

  init() {
    this.initElements({
      gender: 'gender',
      nameGrid: 'nameGrid',
      favoritesList: 'favoritesList'
    });

    this.loadFavorites();
    this.renderFavorites();

    console.log('[PetNameGen] 초기화 완료');
    return this;
  }

  setTheme(theme) {
    this.currentTheme = theme;
    document.querySelectorAll('.theme-btn').forEach(btn => {
      btn.classList.toggle('selected', btn.dataset.theme === theme);
    });
  }

  generate() {
    const gender = this.elements.gender.value;
    const themeNames = this.names[this.currentTheme];

    let pool = [];
    if (gender === 'any') {
      pool = [...themeNames.male, ...themeNames.female];
    } else {
      pool = themeNames[gender];
    }

    // 랜덤 셔플 후 6개 선택
    const shuffled = pool.sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, 6);

    this.elements.nameGrid.innerHTML = selected.map(item => {
      const isFavorite = this.favorites.includes(item.name);
      return `
        <div class="name-card ${isFavorite ? 'favorite' : ''}" onclick="petNameGen.toggleFavorite('${item.name}')">
          <button class="favorite-btn">${isFavorite ? '' : ''}</button>
          <div class="name-text">${item.name}</div>
          <div class="name-meaning">${item.meaning}</div>
        </div>
      `;
    }).join('');
  }

  toggleFavorite(name) {
    const idx = this.favorites.indexOf(name);
    if (idx >= 0) {
      this.favorites.splice(idx, 1);
    } else {
      this.favorites.push(name);
    }
    this.saveFavorites();
    this.renderFavorites();

    // 현재 그리드에서도 업데이트
    document.querySelectorAll('.name-card').forEach(card => {
      const nameText = card.querySelector('.name-text').textContent;
      const isFav = this.favorites.includes(nameText);
      card.classList.toggle('favorite', isFav);
      card.querySelector('.favorite-btn').textContent = isFav ? '' : '';
    });
  }

  loadFavorites() {
    try {
      const saved = localStorage.getItem('pet-name-favorites');
      if (saved) {
        this.favorites = JSON.parse(saved);
      }
    } catch (e) {}
  }

  saveFavorites() {
    localStorage.setItem('pet-name-favorites', JSON.stringify(this.favorites));
  }

  renderFavorites() {
    if (this.favorites.length === 0) {
      this.elements.favoritesList.innerHTML = '<span style="color: var(--text-secondary); font-size: 0.9rem;">저장된 이름이 없습니다</span>';
      return;
    }

    this.elements.favoritesList.innerHTML = this.favorites.map(name => `
      <div class="favorite-tag">
        <span>${name}</span>
        <button class="remove-fav" onclick="petNameGen.removeFavorite('${name}')"></button>
      </div>
    `).join('');
  }

  removeFavorite(name) {
    this.favorites = this.favorites.filter(n => n !== name);
    this.saveFavorites();
    this.renderFavorites();
  }
}

// 전역 인스턴스 생성
const petNameGen = new PetNameGen();
window.PetNameGen = petNameGen;

// 전역 함수 (HTML onclick 호환)
function setTheme(theme) { petNameGen.setTheme(theme); }
function generate() { petNameGen.generate(); }

document.addEventListener('DOMContentLoaded', () => petNameGen.init());
