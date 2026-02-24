/**
 * 이모지 피커 - ToolBase 기반
 * 이모지 검색 및 복사
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class EmojiPicker extends ToolBase {
  constructor() {
    super('EmojiPicker');
    this.currentEmoji = '';
    this.recentEmojis = JSON.parse(localStorage.getItem('recentEmojis') || '[]');

    this.emojiData = {
      smileys: {
        name: '표정',
        emojis: ['','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','']
      },
      people: {
        name: '사람',
        emojis: ['','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','']
      },
      animals: {
        name: '동물',
        emojis: ['','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','']
      },
      food: {
        name: '음식',
        emojis: ['','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','']
      },
      activities: {
        name: '활동',
        emojis: ['','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','']
      },
      travel: {
        name: '여행',
        emojis: ['','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','']
      },
      objects: {
        name: '사물',
        emojis: ['','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','']
      },
      symbols: {
        name: '기호',
        emojis: ['','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','🆔','','🉑','','','','','🈶','🈚','🈸','🈺','🈷','','🆚','','🉐','','','🈴','🈵','🈹','🈲','🅰','🅱','🆎','🆑','🅾','🆘','','','','','','','','','','','','','','','','','','','','','‼','⁉','','','','','','','','','','','🈯','','','','','','','Ⓜ','','','','','','🅿','','🈳','🈂','','','','','','','','','','','','','🈁','','ℹ','','','','🆖','🆗','🆙','🆒','🆕','🆓','0','1','2','3','4','5','6','7','8','9','','','#','*','','','','','','','','','','','','','','','','','','','','↗','↘','↙','↖','↕','↔','↪','↩','','','','','','','','','','','','','','','','','','™','©','®','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','🃏','','🀄','','','','','','','','','','','','','','','','','','','','','','','','']
      },
      flags: {
        name: '국기',
        emojis: ['','','','','','','🇺🇳','🇦🇫','🇦🇽','🇦🇱','🇩🇿','🇦🇸','🇦🇩','🇦🇴','🇦🇮','🇦🇶','🇦🇬','🇦🇷','🇦🇲','🇦🇼','🇦🇺','🇦🇹','🇦🇿','🇧🇸','🇧🇭','🇧🇩','🇧🇧','🇧🇾','🇧🇪','🇧🇿','🇧🇯','🇧🇲','🇧🇹','🇧🇴','🇧🇦','🇧🇼','🇧🇷','🇮🇴','🇻🇬','🇧🇳','🇧🇬','🇧🇫','🇧🇮','🇰🇭','🇨🇲','🇨🇦','🇮🇨','🇨🇻','🇧🇶','🇰🇾','🇨🇫','🇹🇩','🇨🇱','🇨🇳','🇨🇽','🇨🇨','🇨🇴','🇰🇲','🇨🇬','🇨🇩','🇨🇰','🇨🇷','🇨🇮','🇭🇷','🇨🇺','🇨🇼','🇨🇾','🇨🇿','🇩🇰','🇩🇯','🇩🇲','🇩🇴','🇪🇨','🇪🇬','🇸🇻','🇬🇶','🇪🇷','🇪🇪','🇸🇿','🇪🇹','🇪🇺','🇫🇰','🇫🇴','🇫🇯','🇫🇮','🇫🇷','🇬🇫','🇵🇫','🇹🇫','🇬🇦','🇬🇲','🇬🇪','🇩🇪','🇬🇭','🇬🇮','🇬🇷','🇬🇱','🇬🇩','🇬🇵','🇬🇺','🇬🇹','🇬🇬','🇬🇳','🇬🇼','🇬🇾','🇭🇹','🇭🇳','🇭🇰','🇭🇺','🇮🇸','🇮🇳','🇮🇩','🇮🇷','🇮🇶','🇮🇪','🇮🇲','🇮🇱','🇮🇹','🇯🇲','🇯🇵','','🇯🇪','🇯🇴','🇰🇿','🇰🇪','🇰🇮','🇽🇰','🇰🇼','🇰🇬','🇱🇦','🇱🇻','🇱🇧','🇱🇸','🇱🇷','🇱🇾','🇱🇮','🇱🇹','🇱🇺','🇲🇴','🇲🇬','🇲🇼','🇲🇾','🇲🇻','🇲🇱','🇲🇹','🇲🇭','🇲🇶','🇲🇷','🇲🇺','🇾🇹','🇲🇽','🇫🇲','🇲🇩','🇲🇨','🇲🇳','🇲🇪','🇲🇸','🇲🇦','🇲🇿','🇲🇲','🇳🇦','🇳🇷','🇳🇵','🇳🇱','🇳🇨','🇳🇿','🇳🇮','🇳🇪','🇳🇬','🇳🇺','🇳🇫','🇰🇵','🇲🇰','🇲🇵','🇳🇴','🇴🇲','🇵🇰','🇵🇼','🇵🇸','🇵🇦','🇵🇬','🇵🇾','🇵🇪','🇵🇭','🇵🇳','🇵🇱','🇵🇹','🇵🇷','🇶🇦','🇷🇪','🇷🇴','🇷🇺','🇷🇼','🇼🇸','🇸🇲','🇸🇹','🇸🇦','🇸🇳','🇷🇸','🇸🇨','🇸🇱','🇸🇬','🇸🇽','🇸🇰','🇸🇮','🇬🇸','🇸🇧','🇸🇴','🇿🇦','🇰🇷','🇸🇸','🇪🇸','🇱🇰','🇧🇱','🇸🇭','🇰🇳','🇱🇨','🇵🇲','🇻🇨','🇸🇩','🇸🇷','🇸🇪','🇨🇭','🇸🇾','🇹🇼','🇹🇯','🇹🇿','🇹🇭','🇹🇱','🇹🇬','🇹🇰','🇹🇴','🇹🇹','🇹🇳','🇹🇷','🇹🇲','🇹🇨','🇹🇻','🇻🇮','🇺🇬','🇺🇦','🇦🇪','🇬🇧','','','','🇺🇸','🇺🇾','🇺🇿','🇻🇺','🇻🇦','🇻🇪','🇻🇳','🇼🇫','🇪🇭','🇾🇪','🇿🇲','🇿🇼']
      }
    };

    this.emojiKeywords = {
      '': ['웃음', '기쁨', '행복', 'smile', 'happy'],
      '': ['웃음', '눈물', '재미', 'laugh', 'tears'],
      '': ['사랑', '하트', 'love', 'heart'],
      '': ['좋아요', '최고', '엄지', 'thumbs', 'good'],
      '': ['불', '핫', '인기', 'fire', 'hot'],
      '': ['반짝', '별', '빛', 'sparkle', 'star'],
      '': ['축하', '파티', '경축', 'party', 'celebrate'],
      '': ['힘', '강함', '근육', 'muscle', 'strong'],
      '': ['기도', '부탁', '감사', 'pray', 'please'],
      '': ['인사', '손', '바이', 'wave', 'hi', 'bye']
    };
  }

  init() {
    this.initElements({
      emojiGrid: 'emojiGrid',
      previewEmoji: 'previewEmoji',
      previewName: 'previewName',
      previewCodes: 'previewCodes',
      recentEmojis: 'recentEmojis',
      searchInput: 'searchInput'
    });

    this.setupEvents();
    this.renderEmojis('all');
    this.renderRecent();

    console.log('[EmojiPicker] 초기화 완료');
    return this;
  }

  setupEvents() {
    document.querySelectorAll('.cat-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.renderEmojis(btn.dataset.category);
      });
    });

    this.elements.searchInput.addEventListener('input', () => this.searchEmojis());
  }

  renderEmojis(category = 'all') {
    let emojis = [];

    if (category === 'all') {
      Object.values(this.emojiData).forEach(cat => {
        emojis = emojis.concat(cat.emojis);
      });
    } else if (this.emojiData[category]) {
      emojis = this.emojiData[category].emojis;
    }

    this.elements.emojiGrid.innerHTML = emojis.map(e =>
      `<div class="emoji-item" data-emoji="${e}">${e}</div>`
    ).join('');

    this.elements.emojiGrid.querySelectorAll('.emoji-item').forEach(item => {
      item.addEventListener('click', () => this.selectEmoji(item.dataset.emoji));
    });
  }

  selectEmoji(emoji) {
    this.currentEmoji = emoji;
    this.elements.previewEmoji.textContent = emoji;
    this.elements.previewName.textContent = this.getEmojiName(emoji);
    this.elements.previewCodes.textContent = 'U+' + emoji.codePointAt(0).toString(16).toUpperCase();

    this.recentEmojis = this.recentEmojis.filter(e => e !== emoji);
    this.recentEmojis.unshift(emoji);
    this.recentEmojis = this.recentEmojis.slice(0, 10);
    localStorage.setItem('recentEmojis', JSON.stringify(this.recentEmojis));
    this.renderRecent();
  }

  getEmojiName(emoji) {
    for (const [e, keywords] of Object.entries(this.emojiKeywords)) {
      if (e === emoji) return keywords[0];
    }
    return 'Emoji';
  }

  copyPreview() {
    this.copyToClipboard(this.currentEmoji);
    this.showToast('복사되었습니다: ' + this.currentEmoji, 'success');
  }

  renderRecent() {
    this.elements.recentEmojis.innerHTML = this.recentEmojis.map(e =>
      `<span data-emoji="${e}">${e}</span>`
    ).join('');

    this.elements.recentEmojis.querySelectorAll('span').forEach(span => {
      span.addEventListener('click', () => this.selectEmoji(span.dataset.emoji));
    });
  }

  searchEmojis() {
    const query = this.elements.searchInput.value.toLowerCase();

    if (!query) {
      this.renderEmojis('all');
      return;
    }

    let results = [];

    for (const [emoji, keywords] of Object.entries(this.emojiKeywords)) {
      if (keywords.some(k => k.includes(query))) {
        results.push(emoji);
      }
    }

    Object.values(this.emojiData).forEach(cat => {
      cat.emojis.forEach(emoji => {
        if (!results.includes(emoji)) {
          results.push(emoji);
        }
      });
    });

    this.elements.emojiGrid.innerHTML = results.slice(0, 100).map(e =>
      `<div class="emoji-item" data-emoji="${e}">${e}</div>`
    ).join('');

    this.elements.emojiGrid.querySelectorAll('.emoji-item').forEach(item => {
      item.addEventListener('click', () => this.selectEmoji(item.dataset.emoji));
    });
  }
}

// 전역 인스턴스 생성
const emojiPicker = new EmojiPicker();
window.EmojiPicker = emojiPicker;

// 전역 함수 (HTML onclick 호환)
function copyPreview() { emojiPicker.copyPreview(); }

document.addEventListener('DOMContentLoaded', () => emojiPicker.init());
