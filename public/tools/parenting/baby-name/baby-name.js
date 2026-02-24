/**
 * 아기 이름 생성기 - ToolBase 기반
 * 한글 이름 추천
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var BabyName = class BabyName extends ToolBase {
  constructor() {
    super('BabyName');
    this.gender = 'male';
    this.favorites = [];

    this.maleNames = [
      { name: '준서', hanja: '俊瑞', meaning: '뛰어나고 상서로운' },
      { name: '민준', hanja: '敏俊', meaning: '민첩하고 뛰어난' },
      { name: '서준', hanja: '瑞俊', meaning: '상서롭고 준수한' },
      { name: '도윤', hanja: '道允', meaning: '도리를 알고 윤택한' },
      { name: '시우', hanja: '時雨', meaning: '때를 아는 비처럼' },
      { name: '주원', hanja: '周元', meaning: '두루 으뜸인' },
      { name: '지호', hanja: '智浩', meaning: '지혜롭고 넓은' },
      { name: '지훈', hanja: '智勳', meaning: '지혜롭고 공훈이 있는' },
      { name: '현우', hanja: '賢宇', meaning: '어질고 넓은 집' },
      { name: '건우', hanja: '健宇', meaning: '건강하고 넓은' },
      { name: '우진', hanja: '宇鎭', meaning: '넓은 세상을 진정시키는' },
      { name: '예준', hanja: '睿俊', meaning: '슬기롭고 준수한' },
      { name: '승현', hanja: '承賢', meaning: '어진 것을 이어받는' },
      { name: '태민', hanja: '泰民', meaning: '평안하고 백성을 아끼는' },
      { name: '윤호', hanja: '允浩', meaning: '허락하고 넓은' },
      { name: '정우', hanja: '正宇', meaning: '바르고 넓은' },
      { name: '승민', hanja: '承民', meaning: '백성을 이어받는' },
      { name: '재원', hanja: '才源', meaning: '재주의 근원' },
      { name: '하준', hanja: '夏俊', meaning: '여름처럼 활기차고 준수한' },
      { name: '성민', hanja: '成民', meaning: '성취하는 백성' }
    ];

    this.femaleNames = [
      { name: '서연', hanja: '瑞姸', meaning: '상서롭고 아리따운' },
      { name: '서윤', hanja: '瑞允', meaning: '상서롭고 윤택한' },
      { name: '지우', hanja: '智優', meaning: '지혜롭고 넉넉한' },
      { name: '서현', hanja: '瑞賢', meaning: '상서롭고 어진' },
      { name: '민서', hanja: '敏瑞', meaning: '민첩하고 상서로운' },
      { name: '하은', hanja: '夏恩', meaning: '여름처럼 은혜로운' },
      { name: '수빈', hanja: '秀彬', meaning: '빼어나고 빛나는' },
      { name: '지민', hanja: '智敏', meaning: '지혜롭고 민첩한' },
      { name: '예은', hanja: '睿恩', meaning: '슬기롭고 은혜로운' },
      { name: '수아', hanja: '秀雅', meaning: '빼어나고 우아한' },
      { name: '유나', hanja: '有娜', meaning: '있음직하고 아리따운' },
      { name: '채원', hanja: '采源', meaning: '빛깔의 근원' },
      { name: '지유', hanja: '智柔', meaning: '지혜롭고 부드러운' },
      { name: '다은', hanja: '多恩', meaning: '은혜가 많은' },
      { name: '하윤', hanja: '夏允', meaning: '여름처럼 윤택한' },
      { name: '소율', hanja: '昭律', meaning: '밝고 법도있는' },
      { name: '예린', hanja: '睿麟', meaning: '슬기로운 기린' },
      { name: '아린', hanja: '雅麟', meaning: '우아한 기린' },
      { name: '시은', hanja: '時恩', meaning: '때를 아는 은혜' },
      { name: '유진', hanja: '有眞', meaning: '참됨이 있는' }
    ];
  }

  init() {
    this.initElements({
      familyName: 'familyName',
      nameResults: 'nameResults',
      favoritesList: 'favoritesList'
    });

    this.loadFavorites();
    this.renderFavorites();

    console.log('[BabyName] 초기화 완료');
    return this;
  }

  setGender(gender) {
    this.gender = gender;
    document.querySelectorAll('.gender-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.gender === gender);
    });
  }

  generate() {
    const familyName = this.elements.familyName.value.trim();
    const names = this.gender === 'male' ? this.maleNames : this.femaleNames;

    // 랜덤으로 5개 선택
    const shuffled = [...names].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, 5);

    this.elements.nameResults.innerHTML = selected.map(item => {
      const fullName = familyName ? familyName + item.name : item.name;
      const isFav = this.favorites.includes(fullName);

      return `<div class="name-card ${isFav ? 'favorite' : ''}" data-name="${fullName}">
        <div>
          <span class="name-korean">${fullName}</span>
          <span class="name-hanja">${item.hanja}</span>
        </div>
        <div class="name-meaning">${item.meaning}</div>
        <div class="name-actions">
          <span class="action-btn" onclick="babyName.toggleFavorite('${fullName}', event)">${isFav ? '저장됨' : '저장'}</span>
          <span class="action-btn" onclick="babyName.copy('${fullName}', event)">복사</span>
        </div>
      </div>`;
    }).join('');
  }

  toggleFavorite(name, event) {
    event.stopPropagation();
    const index = this.favorites.indexOf(name);

    if (index > -1) {
      this.favorites.splice(index, 1);
    } else {
      this.favorites.push(name);
    }

    this.saveFavorites();
    this.renderFavorites();
    this.generate(); // 다시 렌더링
  }

  copy(name, event) {
    event.stopPropagation();
    this.copyToClipboard(name);
  }

  loadFavorites() {
    const saved = localStorage.getItem('babyNameFavorites');
    if (saved) {
      this.favorites = JSON.parse(saved);
    }
  }

  saveFavorites() {
    localStorage.setItem('babyNameFavorites', JSON.stringify(this.favorites));
  }

  renderFavorites() {
    if (this.favorites.length === 0) {
      this.elements.favoritesList.innerHTML = '<span style="color: var(--text-secondary); font-size: 0.9rem;">하트를 눌러 관심 이름을 저장하세요</span>';
      return;
    }

    this.elements.favoritesList.innerHTML = this.favorites.map(name =>
      `<span class="favorite-tag">${name} <span onclick="babyName.removeFavorite('${name}')" style="cursor: pointer;"></span></span>`
    ).join('');
  }

  removeFavorite(name) {
    const index = this.favorites.indexOf(name);
    if (index > -1) {
      this.favorites.splice(index, 1);
      this.saveFavorites();
      this.renderFavorites();
    }
  }
}

// 전역 인스턴스 생성
const babyName = new BabyName();
window.BabyName = babyName;

// 전역 함수 (HTML onclick 호환)
function setGender(gender) { babyName.setGender(gender); }
function generate() { babyName.generate(); }

document.addEventListener('DOMContentLoaded', () => babyName.init());
