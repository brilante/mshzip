/**
 * 카오모지 라이브러리 - ToolBase 기반
 * 다양한 카오모지 모음 및 복사
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class KaomojiLibrary extends ToolBase {
  constructor() {
    super('KaomojiLibrary');
    this.currentCategory = '기쁨';

    this.categories = {
      '기쁨': [
        '(◕‿◕)', '(◠‿◠)', '(◕ᴗ◕)', '(◔◡◔)', '(◠‿◠)',
        '(｡◕‿◕｡)', '(◕‿◕)', '(◡‿◡)', '(｡‿｡)', '(◕‿-)',
        '( ´ ▽ ` )ﾉ', 'ヽ(>∀<)', '＼(◎o◎)／', '(▽)', '(*^▽^*)',
        '(ω)', '(◠‿◠)', '(◕‿◕)', '(*≧ω≦)', '(◕ᴗ◕)'
      ],
      '슬픔': [
        '(╥_╥)', '(T_T)', '(；_;)', '(ಥ_ಥ)', '(ノ_<。)',
        '(´;ω;`)', '(╯︵╰,)', '( ´_ゝ`)', '(っ˘̩╭╮˘̩)っ', '(｡•́︿•̀｡)',
        '(´°̥̥̥̥̥̥̥̥ω°̥̥̥̥̥̥̥̥`)', '(｡ŏ﹏ŏ)', '(╥﹏╥)', '(;´༎ຶД༎ຶ`)', '(っ- ‸ – ς)'
      ],
      '화남': [
        '(╬▔皿▔)╯', '(ﾒ` ﾛ ´)', '(╬ Ò﹏Ó)', 'ヽ(`Д´)ノ', '(╯°□°)╯︵ ┻━┻',
        '(￣︿￣)', '(>_<)', '(¬_¬")', '( ` ω ´ )', '(≧Д≦)',
        '(ノಠ益ಠ)ノ彡┻━┻', '(ᗒᗣᗕ)՞', '(눈_눈)', '(¬▂¬)', '(⋋▂⋌)'
      ],
      '놀람': [
        '(°o°)', '(O_O)', '(⊙_⊙)', '(O.O)', '∑(O_O;)',
        '(ʘᗩʘ\')', '(_)', 'Σ(゜゜)', '(@_@)', '(○_○)',
        '(゜ロ゜)', '(◎_◎)', '∑(°△°)', '(。︵ 。)', '(⊙.⊙)'
      ],
      '사랑': [
        '(ω)', '(´∀`)', '(◕‿◕)', '‿', '(◍•ᴗ•◍)',
        '(◕‿◕)', '(μ_μ)', '(*^3^)/~', '(๑•ᴗ•๑)', '(ӦᴗӦ)',
        '(灬ω灬)', '(°▽°)', '(◦\'ں\'◦)', '(ღ˘˘ღ)', '╰(*´︶`*)╯'
      ],
      '인사': [
        '(・ω・)ノ', '(*・ω・)ﾉ', '(^-^)/', '(｡･ω･)ﾉﾞ', '(*^▽^)/',
        'ヾ(・ω・*)ノ', '(^O^)/', '＼(^o^)／', '(*´▽`*)ノ', 'ヾ(＾∇＾)',
        '(。･∀･)ノ', '(●\'◡\'●)ﾉ', 'ヾ(°∇°*)', '(=^・^=)/', '(*≧▽≦)ﾉ'
      ],
      '동물': [
        '(=^･ω･^=)', '(=｀ω´=)', 'ฅ^•ﻌ•^ฅ', '(=ᆽ=)', '(=◕ᆽ◕=)',
        '(・ω・)', '( ͡° ͜ʖ ͡°)', '(◕ᴥ◕)', 'ʕ•ᴥ•ʔ', 'ʕ·ᴥ·ʔ',
        '(◠ᴥ◠ʋ)', '(ᵔᴥᵔ)', '( ˘ ³˘)', 'ฅ(•ㅅ•)ฅ', '(=^-ω-^=)'
      ],
      '음식': [
        '(っ˘ڡ˘ς)', '( ˘▽˘)っ', '(๑´ڡ`๑)', 'ლ(´ڡ`ლ)', '(｡・・)_且',
        '( ^-^)_旦""', '(*´з`)口', '(´・ω・`)', '(´ε｀ )', '( ・・)つ━'
      ],
      '춤': [
        '┏(・o･)┛', '┗(^0^)┓', '(┌・。・)┌', '〜(^∇^〜)', '(〜￣△￣)〜',
        '(o*゜∇゜)o～', '┌(o)┘', '└(^o^)┐', '(*^^)o∀*∀o(^^*)', '(ノ´ヮ`)ノ*: ・゚'
      ],
      '기타': [
        '¯\\_(ツ)_/¯', '(╯°□°）╯︵ ┻━┻', '┬─┬ ノ( ゜-゜ノ)', '(ง •_•)ง', '(ﾟヮﾟ)',
        '(͡° ͜ʖ ͡°)', '(ಠ_ಠ)', '( ͡~ ͜ʖ ͡°)', '(■_■)', '(•_•) ( •_•)>■-■',
        '(ᵔᴥᵔ)', '(´・ω・`)', '(⊙_⊙)', '(´・_・`)', '(｀・ω・´)'
      ]
    };
  }

  init() {
    this.initElements({
      categoryTabs: 'categoryTabs',
      kaomojiGrid: 'kaomojiGrid'
    });

    this.renderCategories();
    this.selectCategory('기쁨');

    console.log('[KaomojiLibrary] 초기화 완료');
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
    this.currentCategory = cat;
    document.querySelectorAll('.cat-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.cat === cat);
    });
    this.renderKaomojis(this.categories[cat]);
  }

  renderKaomojis(kaomojis) {
    this.elements.kaomojiGrid.innerHTML = kaomojis.map(k =>
      `<div class="kaomoji-item">${k}</div>`
    ).join('');

    this.elements.kaomojiGrid.querySelectorAll('.kaomoji-item').forEach(item => {
      item.addEventListener('click', () => this.copy(item.textContent));
    });
  }

  copy(kaomoji) {
    this.copyToClipboard(kaomoji);
    this.showToast(`${kaomoji} 복사됨!`, 'success');
  }
}

// 전역 인스턴스 생성
const kaomojiLibrary = new KaomojiLibrary();
window.KaomojiLibrary = kaomojiLibrary;

document.addEventListener('DOMContentLoaded', () => kaomojiLibrary.init());
