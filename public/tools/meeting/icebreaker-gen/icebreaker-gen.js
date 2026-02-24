/**
 * 아이스브레이커 생성기 - ToolBase 기반
 * 회의 시작 활동 제안
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var IcebreakerGen = class IcebreakerGen extends ToolBase {
  constructor() {
    super('IcebreakerGen');
    this.currentCategory = 'all';
    this.current = null;
    this.history = [];
    this.favorites = [];
    this.customs = [];
    this.storageKey = 'icebreakerGen_data';

    this.categories = {
      question: { name: '질문', emoji: '' },
      wouldyou: { name: '이러면?', emoji: '' },
      activity: { name: '활동', emoji: '' },
      team: { name: '팀빌딩', emoji: '' },
      creative: { name: '창의적', emoji: '' }
    };

    this.icebreakers = {
      question: [
        '요즘 가장 빠져있는 취미는 무엇인가요?',
        '최근에 본 영화/드라마 중 추천하고 싶은 것은?',
        '만약 내일 휴가라면 무엇을 하고 싶나요?',
        '어렸을 때 꿈꿨던 직업은 무엇인가요?',
        '올해 꼭 해보고 싶은 것 하나는?',
        '가장 좋아하는 계절과 그 이유는?',
        '요즘 듣고 있는 음악은 무엇인가요?',
        '인생에서 가장 기억에 남는 여행지는?',
        '주말에 주로 무엇을 하며 시간을 보내나요?',
        '본인을 동물에 비유한다면 무엇인가요?',
        '가장 자신있는 요리는 무엇인가요?',
        '최근에 새로 배우고 있는 것이 있나요?',
        '스트레스 해소법이 있다면 무엇인가요?',
        '좋아하는 책이나 작가가 있나요?',
        '아침형 인간인가요, 저녁형 인간인가요?'
      ],
      wouldyou: [
        '100만원이 생긴다면 무엇에 쓰시겠어요?',
        '과거로 돌아갈 수 있다면 언제로 가고 싶나요?',
        '초능력 하나를 가질 수 있다면 무엇을 선택하시겠어요?',
        '무인도에 한 가지만 가져갈 수 있다면?',
        '유명인 한 명과 점심을 먹을 수 있다면 누구와?',
        '다른 나라에서 1년 살 수 있다면 어디로 가시겠어요?',
        '다시 대학생이 된다면 무엇을 전공하고 싶나요?',
        '타임머신이 있다면 과거와 미래 중 어디로?',
        '로또에 당첨된다면 가장 먼저 무엇을 하시겠어요?',
        '하루 동안 다른 사람이 될 수 있다면 누가 되고 싶나요?'
      ],
      activity: [
        '2분 안에 공통점 5개 찾기: 옆 사람과 공통점을 찾아보세요!',
        '짧은 스토리텔링: 세 단어로 오늘 기분을 표현해보세요',
        '빠른 퀴즈: 팀원 중 가장 먼저 일어나는 사람은 누구일까요?',
        '손가락 게임: 동시에 손가락을 펴서 합이 10이면 성공!',
        '연상 게임: "회의"하면 떠오르는 단어를 돌아가며 말해보세요',
        '찬/반 토론: "재택근무 vs 사무실 출근" 선호도를 밝혀보세요',
        '가위바위보 토너먼트: 우승자는 점심 메뉴 결정권!',
        '몸으로 말해요: 오늘 기분을 몸짓으로 표현해보세요',
        '숫자 맞추기: 1부터 차례로 말하되 같은 숫자 나오면 다시!'
      ],
      team: [
        '서로의 장점 한 가지씩 말해주기',
        '팀원 중 모르는 사람과 1분 대화하기',
        '함께 달성하고 싶은 이번 분기 목표 공유하기',
        '최근 팀원에게 고마웠던 순간 나누기',
        '서로의 업무 중 가장 어려운 부분 공유하기',
        '팀을 한 단어로 표현한다면?',
        '팀원들에게 추천하고 싶은 업무 팁 공유하기',
        '입사 첫날의 기억을 나눠보세요',
        '가장 자랑스러운 팀 성과는 무엇인가요?'
      ],
      creative: [
        '우리 팀을 영화 제목으로 표현한다면?',
        '지금 기분을 날씨로 표현해보세요',
        '본인의 테마송은 무엇인가요?',
        '우리 회사를 이모지로 표현한다면?',
        '나를 색깔로 표현한다면 무슨 색인가요?',
        '올해를 한 단어로 정의한다면?',
        '우리 팀의 슬로건을 만들어보세요',
        '본인의 인생 영화 OST는 무엇인가요?',
        '지금 마음 상태를 음식으로 표현한다면?',
        '우리 팀을 동물 무리에 비유한다면?'
      ]
    };
  }

  init() {
    this.initElements({
      cardCategory: 'cardCategory',
      cardContent: 'cardContent',
      currentCard: 'currentCard',
      historyList: 'historyList',
      favoritesList: 'favoritesList',
      customList: 'customList',
      customCategory: 'customCategory',
      customContent: 'customContent'
    });

    this.loadFromStorage();
    this.render();

    console.log('[IcebreakerGen] 초기화 완료');
    return this;
  }

  setCategory(category) {
    this.currentCategory = category;

    document.querySelectorAll('.category-btn').forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.category === category) btn.classList.add('active');
    });
  }

  generate() {
    const pool = this.getPool();
    if (pool.length === 0) {
      this.showToast('해당 카테고리에 아이스브레이커가 없습니다.', 'error');
      return;
    }

    const randomIndex = Math.floor(Math.random() * pool.length);
    this.current = pool[randomIndex];

    // 카드 업데이트
    const catInfo = this.categories[this.current.category];
    this.elements.cardCategory.textContent = `${catInfo.emoji} ${catInfo.name}`;
    this.elements.cardContent.textContent = this.current.text;

    // 히스토리에 추가
    this.history.unshift({
      ...this.current,
      timestamp: new Date().toISOString()
    });

    // 최대 50개 유지
    if (this.history.length > 50) {
      this.history = this.history.slice(0, 50);
    }

    this.saveToStorage();
    this.renderHistory();

    // 애니메이션
    this.elements.currentCard.style.transform = 'scale(0.95)';
    setTimeout(() => {
      this.elements.currentCard.style.transform = 'scale(1)';
    }, 100);
  }

  getPool() {
    let pool = [];

    if (this.currentCategory === 'all') {
      Object.entries(this.icebreakers).forEach(([cat, items]) => {
        items.forEach(text => {
          pool.push({ category: cat, text, isCustom: false });
        });
      });
      this.customs.forEach(item => {
        pool.push({ ...item, isCustom: true });
      });
    } else {
      const items = this.icebreakers[this.currentCategory] || [];
      items.forEach(text => {
        pool.push({ category: this.currentCategory, text, isCustom: false });
      });
      this.customs.filter(c => c.category === this.currentCategory).forEach(item => {
        pool.push({ ...item, isCustom: true });
      });
    }

    return pool;
  }

  copyCard() {
    if (!this.current) {
      this.showToast('먼저 아이스브레이커를 생성해주세요.', 'error');
      return;
    }

    const catInfo = this.categories[this.current.category];
    const text = `${catInfo.emoji} ${catInfo.name}\n${this.current.text}`;

    this.copyToClipboard(text);
  }

  addToFavorites() {
    if (!this.current) {
      this.showToast('먼저 아이스브레이커를 생성해주세요.', 'error');
      return;
    }

    const exists = this.favorites.some(f =>
      f.text === this.current.text && f.category === this.current.category
    );

    if (exists) {
      this.showToast('이미 즐겨찾기에 추가되어 있습니다.', 'error');
      return;
    }

    this.favorites.push({
      ...this.current,
      addedAt: new Date().toISOString()
    });

    this.saveToStorage();
    this.renderFavorites();
    this.showToast('즐겨찾기에 추가되었습니다!', 'success');
  }

  share() {
    if (!this.current) {
      this.showToast('먼저 아이스브레이커를 생성해주세요.', 'error');
      return;
    }

    const catInfo = this.categories[this.current.category];
    const text = `오늘의 아이스브레이커!\n\n${catInfo.emoji} ${catInfo.name}\n${this.current.text}\n\n- MyMind3 아이스브레이커 생성기`;

    if (navigator.share) {
      navigator.share({ text }).catch(() => {});
    } else {
      this.copyToClipboard(text);
    }
  }

  switchTab(tabId) {
    document.querySelectorAll('.tabs-nav .tab-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    event.target.classList.add('active');

    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });
    document.getElementById(`${tabId}Tab`).classList.add('active');
  }

  renderHistory() {
    if (this.history.length === 0) {
      this.elements.historyList.innerHTML = '<div class="empty-list">아직 생성된 아이스브레이커가 없습니다</div>';
      return;
    }

    this.elements.historyList.innerHTML = this.history.map((item, index) => {
      const catInfo = this.categories[item.category];
      return `
        <div class="list-item" onclick="icebreakerGen.useSaved(${index}, 'history')">
          <span class="item-category">${catInfo.emoji}</span>
          <span class="item-text">${this.escapeHtml(item.text)}</span>
        </div>
      `;
    }).join('');
  }

  renderFavorites() {
    if (this.favorites.length === 0) {
      this.elements.favoritesList.innerHTML = '<div class="empty-list">즐겨찾기에 추가된 항목이 없습니다</div>';
      return;
    }

    this.elements.favoritesList.innerHTML = this.favorites.map((item, index) => {
      const catInfo = this.categories[item.category];
      return `
        <div class="list-item">
          <span class="item-category">${catInfo.emoji}</span>
          <span class="item-text" onclick="icebreakerGen.useSaved(${index}, 'favorites')">${this.escapeHtml(item.text)}</span>
          <div class="item-actions">
            <button class="item-btn delete" onclick="event.stopPropagation();icebreakerGen.removeFavorite(${index})">삭제</button>
          </div>
        </div>
      `;
    }).join('');
  }

  renderCustoms() {
    if (this.customs.length === 0) {
      this.elements.customList.innerHTML = '';
      return;
    }

    this.elements.customList.innerHTML = this.customs.map((item, index) => {
      const catInfo = this.categories[item.category];
      return `
        <div class="list-item">
          <span class="item-category">${catInfo.emoji}</span>
          <span class="item-text">${this.escapeHtml(item.text)}</span>
          <div class="item-actions">
            <button class="item-btn delete" onclick="icebreakerGen.removeCustom(${index})">삭제</button>
          </div>
        </div>
      `;
    }).join('');
  }

  useSaved(index, type) {
    const item = type === 'history' ? this.history[index] : this.favorites[index];
    if (!item) return;

    this.current = { category: item.category, text: item.text };

    const catInfo = this.categories[item.category];
    this.elements.cardCategory.textContent = `${catInfo.emoji} ${catInfo.name}`;
    this.elements.cardContent.textContent = item.text;

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  removeFavorite(index) {
    this.favorites.splice(index, 1);
    this.saveToStorage();
    this.renderFavorites();
  }

  addCustom() {
    const category = this.elements.customCategory.value;
    const text = this.elements.customContent.value.trim();

    if (!text) {
      this.showToast('내용을 입력해주세요.', 'error');
      return;
    }

    this.customs.push({ category, text });
    this.elements.customContent.value = '';

    this.saveToStorage();
    this.renderCustoms();
    this.showToast('추가되었습니다!', 'success');
  }

  removeCustom(index) {
    this.customs.splice(index, 1);
    this.saveToStorage();
    this.renderCustoms();
  }

  render() {
    this.renderHistory();
    this.renderFavorites();
    this.renderCustoms();
  }

  saveToStorage() {
    const data = {
      history: this.history,
      favorites: this.favorites,
      customs: this.customs
    };
    localStorage.setItem(this.storageKey, JSON.stringify(data));
  }

  loadFromStorage() {
    const saved = localStorage.getItem(this.storageKey);
    if (saved) {
      const data = JSON.parse(saved);
      this.history = data.history || [];
      this.favorites = data.favorites || [];
      this.customs = data.customs || [];
    }
  }

  escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}

// 전역 인스턴스 생성
const icebreakerGen = new IcebreakerGen();
window.IcebreakerGen = icebreakerGen;

// 전역 함수 (HTML onclick 호환)
function setCategory(category) { icebreakerGen.setCategory(category); }
function generate() { icebreakerGen.generate(); }
function copyToClipboard() { icebreakerGen.copyCard(); }
function addToFavorites() { icebreakerGen.addToFavorites(); }
function share() { icebreakerGen.share(); }
function switchTab(tabId) { icebreakerGen.switchTab(tabId); }
function addCustom() { icebreakerGen.addCustom(); }

document.addEventListener('DOMContentLoaded', () => icebreakerGen.init());
