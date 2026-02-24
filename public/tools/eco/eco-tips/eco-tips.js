/**
 * 친환경 팁 - ToolBase 기반
 * 일상 속 환경 보호 실천법
 * @created 2026-01-13
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var EcoTips = class EcoTips extends ToolBase {
  constructor() {
    super('EcoTips');
    this.category = 'all';
    this.userStatus = {};

    this.tips = [
      { id: 1, icon: '', title: '대기전력 차단하기', category: 'energy', difficulty: 'easy',
        description: '사용하지 않는 전자기기의 플러그를 뽑거나 멀티탭 전원을 끄세요. 대기전력만 차단해도 가정 전력의 10%를 절약할 수 있습니다.',
        co2Save: 100, moneySave: 30000 },
      { id: 2, icon: '', title: '냉난방 온도 1도 조절', category: 'energy', difficulty: 'easy',
        description: '여름엔 26도 이상, 겨울엔 20도 이하로 유지하세요. 1도 조절로 에너지 7%를 절약합니다.',
        co2Save: 80, moneySave: 25000 },
      { id: 3, icon: '', title: '샤워 시간 줄이기', category: 'water', difficulty: 'easy',
        description: '샤워 시간을 1분 줄이면 하루 12리터의 물을 절약합니다. 연간 4,380리터 절약 가능!',
        co2Save: 22, moneySave: 5000 },
      { id: 4, icon: '', title: '절수형 샤워헤드 사용', category: 'water', difficulty: 'medium',
        description: '절수형 샤워헤드로 교체하면 물 사용량을 40%까지 줄일 수 있습니다.',
        co2Save: 50, moneySave: 15000 },
      { id: 5, icon: '', title: '올바른 분리배출', category: 'waste', difficulty: 'easy',
        description: '라벨 제거, 헹구기, 압축하기의 3원칙을 지키면 재활용률이 크게 높아집니다.',
        co2Save: 30, moneySave: 0 },
      { id: 6, icon: '', title: '장바구니 사용하기', category: 'waste', difficulty: 'easy',
        description: '비닐봉지 대신 장바구니를 사용하면 연간 약 300개의 비닐봉지를 줄일 수 있습니다.',
        co2Save: 5, moneySave: 3000 },
      { id: 7, icon: '', title: '주 1회 채식하기', category: 'food', difficulty: 'medium',
        description: '일주일에 하루만 채식을 해도 연간 340kg의 CO₂를 줄일 수 있습니다.',
        co2Save: 340, moneySave: 0 },
      { id: 8, icon: '', title: '음식물 쓰레기 줄이기', category: 'food', difficulty: 'medium',
        description: '필요한 만큼만 구매하고 유통기한을 확인하세요. 음식물 쓰레기 1kg당 2.5kg CO₂가 발생합니다.',
        co2Save: 200, moneySave: 100000 },
      { id: 9, icon: '', title: '대중교통 이용하기', category: 'transport', difficulty: 'easy',
        description: '자가용 대신 대중교통을 이용하면 CO₂ 배출량을 80% 줄일 수 있습니다.',
        co2Save: 500, moneySave: 50000 },
      { id: 10, icon: '', title: '자전거 출퇴근', category: 'transport', difficulty: 'hard',
        description: '5km 이내 출퇴근은 자전거로! 건강도 챙기고 탄소도 줄이는 일석이조입니다.',
        co2Save: 600, moneySave: 80000 },
      { id: 11, icon: '', title: '자연 채광 활용', category: 'energy', difficulty: 'easy',
        description: '낮에는 커튼을 열어 자연 채광을 최대한 활용하세요.',
        co2Save: 40, moneySave: 10000 },
      { id: 12, icon: '', title: '리필 제품 사용', category: 'waste', difficulty: 'easy',
        description: '세제, 샴푸 등 리필 제품을 사용하면 플라스틱 용기를 80% 줄일 수 있습니다.',
        co2Save: 10, moneySave: 5000 }
    ];
  }

  init() {
    this.initElements({
      dailyTip: 'dailyTip',
      tipList: 'tipList',
      totalTips: 'totalTips',
      completedTips: 'completedTips',
      bookmarkedTips: 'bookmarkedTips'
    });

    this.loadStatus();
    this.showDailyTip();
    this.render();
    this.updateStats();

    console.log('[EcoTips] 초기화 완료');
    return this;
  }

  loadStatus() {
    try {
      const saved = localStorage.getItem('ecoTipsStatus');
      if (saved) {
        this.userStatus = JSON.parse(saved);
      }
    } catch (e) {}
  }

  saveStatus() {
    localStorage.setItem('ecoTipsStatus', JSON.stringify(this.userStatus));
  }

  showDailyTip() {
    const today = new Date().toDateString();
    const seed = today.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const idx = seed % this.tips.length;
    this.elements.dailyTip.textContent = this.tips[idx].title + ' - ' + this.tips[idx].description.substring(0, 50) + '...';
  }

  setCategory(category) {
    this.category = category;
    document.querySelectorAll('.category-tab').forEach(tab => {
      const categories = { all: '전체', energy: '에너지', water: '물', waste: '쓰레기', food: '음식', transport: '교통', bookmarked: '북마크' };
      tab.classList.toggle('active', tab.textContent.includes(categories[category]));
    });
    this.render();
  }

  getFilteredTips() {
    if (this.category === 'all') return this.tips;
    if (this.category === 'bookmarked') {
      return this.tips.filter(t => this.userStatus[t.id]?.bookmarked);
    }
    return this.tips.filter(t => t.category === this.category);
  }

  toggleBookmark(id) {
    if (!this.userStatus[id]) this.userStatus[id] = {};
    this.userStatus[id].bookmarked = !this.userStatus[id].bookmarked;
    this.saveStatus();
    this.render();
    this.updateStats();
  }

  toggleDone(id) {
    if (!this.userStatus[id]) this.userStatus[id] = {};
    this.userStatus[id].done = !this.userStatus[id].done;
    this.saveStatus();
    this.render();
    this.updateStats();

    if (this.userStatus[id].done) {
      this.showToast('실천 완료! ', 'success');
    }
  }

  updateStats() {
    const completed = Object.values(this.userStatus).filter(s => s.done).length;
    const bookmarked = Object.values(this.userStatus).filter(s => s.bookmarked).length;

    this.elements.totalTips.textContent = this.tips.length;
    this.elements.completedTips.textContent = completed;
    this.elements.bookmarkedTips.textContent = bookmarked;
  }

  render() {
    const filtered = this.getFilteredTips();

    if (filtered.length === 0) {
      this.elements.tipList.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-secondary);">팁이 없습니다</div>';
      return;
    }

    const diffLabels = { easy: '쉬움', medium: '보통', hard: '어려움' };

    this.elements.tipList.innerHTML = filtered.map(tip => {
      const status = this.userStatus[tip.id] || {};

      return `<div class="tip-card">
        <div class="tip-header">
          <span class="tip-icon">${tip.icon}</span>
          <span class="tip-difficulty ${tip.difficulty}">${diffLabels[tip.difficulty]}</span>
        </div>
        <div class="tip-title">${tip.title}</div>
        <div class="tip-description">${tip.description}</div>
        <div class="tip-impact">
          <div class="impact-item"><span>연 ${tip.co2Save}kg CO₂ 절감</span></div>
          ${tip.moneySave > 0 ? `<div class="impact-item"><span>연 ${tip.moneySave.toLocaleString()}원 절약</span></div>` : ''}
        </div>
        <div class="tip-actions">
          <button class="btn-action btn-bookmark ${status.bookmarked ? 'active' : ''}" onclick="ecoTips.toggleBookmark(${tip.id})">
            ${status.bookmarked ? '북마크됨' : '북마크'}
          </button>
          <button class="btn-action btn-done ${status.done ? 'active' : ''}" onclick="ecoTips.toggleDone(${tip.id})">
            ${status.done ? '실천 완료' : '○ 실천하기'}
          </button>
        </div>
      </div>`;
    }).join('');
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const ecoTips = new EcoTips();
window.EcoTips = ecoTips;

document.addEventListener('DOMContentLoaded', () => ecoTips.init());
