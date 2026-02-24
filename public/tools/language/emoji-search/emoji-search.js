/**
 * 이모지 검색기 - ToolBase 기반
 * 이모지 검색 및 복사
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var EmojiSearch = class EmojiSearch extends ToolBase {
  constructor() {
    super('EmojiSearch');
    this.selectedEmoji = null;

    this.categories = {
      '스마일': ['','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','',''],
      '손': ['','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','',''],
      '하트': ['','','','','','','','','','','','','','','','','','','',''],
      '동물': ['','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','',''],
      '음식': ['','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','',''],
      '자연': ['','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','',''],
      '물건': ['','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','',''],
      '기호': ['','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','©','®','™','#','*','0','1','2','3','4','5','6','7','8','9','','','','','','','','','','','','','','','','','','','','','','↗','↘','↙','↖','↕','↔','↩','↪','','','','','','','','','','','','','','','','‼','⁉','','','','','','','','','','','','','🈯','','','','','','','Ⓜ','','','','','','🅿','','🈳','🈂','','','','','','','','','','','','','🈁','','ℹ','','','','🆖','🆗','🆙','🆒','🆕','🆓','0','1','2','3','4','5','6','7','8','9','','','','','','','','','','','','','','','','','','','','','','','↗','↘','↙','↖','↕','↔','','↩','↪','','','#','*','ℹ','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','']
    };

    this.emojiNames = {
      '': '기쁜 얼굴', '': '큰 눈의 기쁜 얼굴', '': '웃는 눈의 기쁜 얼굴', '': '활짝 웃는 얼굴',
      '': '눈 감고 웃는 얼굴', '': '식은땀 흘리는 얼굴', '': '바닥 구르며 웃는 얼굴', '': '기쁨의 눈물',
      '': '빨간 하트', '': '노란 하트', '': '초록 하트', '': '파란 하트',
      '': '엄지 척', '': '엄지 다운', '': '흔드는 손', '': '손바닥',
      '': '불', '': '물방울', '': '별', '': '반짝이는 별'
    };
  }

  init() {
    this.initElements({
      searchInput: 'searchInput',
      categoryTabs: 'categoryTabs',
      emojiGrid: 'emojiGrid',
      selectedEmoji: 'selectedEmoji',
      selectedEmojiChar: 'selectedEmojiChar',
      selectedEmojiName: 'selectedEmojiName'
    });

    this.renderCategories();
    this.selectCategory('스마일');
    this.elements.searchInput.addEventListener('input', () => this.search());

    console.log('[EmojiSearch] 초기화 완료');
    return this;
  }

  renderCategories() {
    this.elements.categoryTabs.innerHTML = Object.keys(this.categories).map(cat =>
      `<button class="cat-tab" data-cat="${cat}">${cat}</button>`
    ).join('');

    this.elements.categoryTabs.querySelectorAll('.cat-tab').forEach(tab => {
      tab.addEventListener('click', () => this.selectCategory(tab.dataset.cat));
    });
  }

  selectCategory(cat) {
    document.querySelectorAll('.cat-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.cat === cat);
    });
    this.renderEmojis(this.categories[cat]);
  }

  search() {
    const query = this.elements.searchInput.value.toLowerCase();
    if (!query) {
      this.selectCategory('스마일');
      return;
    }

    const results = [];
    for (const emojis of Object.values(this.categories)) {
      for (const emoji of emojis) {
        const name = this.emojiNames[emoji] || '';
        if (name.includes(query) || emoji.includes(query)) {
          results.push(emoji);
        }
      }
    }
    this.renderEmojis(results.length ? results : ['검색 결과가 없습니다']);
  }

  renderEmojis(emojis) {
    this.elements.emojiGrid.innerHTML = emojis.map(e =>
      e.length > 5 ? `<div style="grid-column: 1/-1; text-align: center; color: var(--text-secondary);">${e}</div>` :
      `<div class="emoji-item">${e}</div>`
    ).join('');

    this.elements.emojiGrid.querySelectorAll('.emoji-item').forEach(item => {
      item.addEventListener('click', () => this.select(item.textContent));
    });
  }

  select(emoji) {
    this.selectedEmoji = emoji;
    this.elements.selectedEmoji.style.display = 'block';
    this.elements.selectedEmojiChar.textContent = emoji;
    this.elements.selectedEmojiName.textContent = this.emojiNames[emoji] || '';
  }

  copy() {
    if (this.selectedEmoji) {
      this.copyToClipboard(this.selectedEmoji);
      this.showToast(`${this.selectedEmoji} 복사됨!`, 'success');
    }
  }
}

// 전역 인스턴스 생성
const emojiSearch = new EmojiSearch();
window.EmojiSearch = emojiSearch;

document.addEventListener('DOMContentLoaded', () => emojiSearch.init());
