/**
 * 로렘 입숨 생성기 - ToolBase 기반
 * 더미 텍스트 생성
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class LoremIpsum extends ToolBase {
  constructor() {
    super('LoremIpsum');
    this.wordLists = {
      lorem: ['lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit', 'sed', 'do', 'eiusmod', 'tempor', 'incididunt', 'ut', 'labore', 'et', 'dolore', 'magna', 'aliqua', 'enim', 'ad', 'minim', 'veniam', 'quis', 'nostrud', 'exercitation', 'ullamco', 'laboris', 'nisi', 'aliquip', 'ex', 'ea', 'commodo', 'consequat', 'duis', 'aute', 'irure', 'in', 'reprehenderit', 'voluptate', 'velit', 'esse', 'cillum', 'fugiat', 'nulla', 'pariatur', 'excepteur', 'sint', 'occaecat', 'cupidatat', 'non', 'proident', 'sunt', 'culpa', 'qui', 'officia', 'deserunt', 'mollit', 'anim', 'id', 'est', 'laborum'],
      korean: ['안녕하세요', '반갑습니다', '감사합니다', '사랑합니다', '행복하세요', '좋은', '하루', '되세요', '오늘도', '파이팅', '언제나', '건강하세요', '웃음', '가득한', '날이', '되길', '바랍니다', '새로운', '시작', '함께', '노력', '최선을', '다하겠습니다', '믿음', '희망', '사랑', '열정', '도전', '성공', '꿈을', '향해', '나아가요'],
      hipster: ['artisan', 'cold-pressed', 'craft', 'vinyl', 'brooklyn', 'authentic', 'sustainable', 'organic', 'vegan', 'gluten-free', 'local', 'farm-to-table', 'handcrafted', 'ethical', 'vintage', 'retro', 'minimal', 'aesthetic', 'curated', 'bespoke', 'artisanal', 'small-batch', 'single-origin', 'raw', 'natural']
    };
  }

  init() {
    this.initElements({
      textType: 'textType',
      count: 'count',
      language: 'language',
      startLorem: 'startLorem',
      htmlTags: 'htmlTags',
      output: 'output',
      wordCount: 'wordCount',
      charCount: 'charCount',
      generateBtn: 'generateBtn',
      copyBtn: 'copyBtn'
    });

    this.bindEvents();
    this.generate();

    console.log('[LoremIpsum] 초기화 완료');
    return this;
  }

  bindEvents() {
    this.elements.generateBtn.addEventListener('click', () => this.generate());
    this.elements.copyBtn.addEventListener('click', () => this.copy());
  }

  getRandomWords(wordList, count) {
    const words = [];
    for (let i = 0; i < count; i++) {
      words.push(wordList[Math.floor(Math.random() * wordList.length)]);
    }
    return words;
  }

  generateSentence(wordList, wordCount = null) {
    const count = wordCount || Math.floor(Math.random() * 10) + 5;
    const words = this.getRandomWords(wordList, count);
    words[0] = words[0].charAt(0).toUpperCase() + words[0].slice(1);
    return words.join(' ') + '.';
  }

  generateParagraph(wordList, sentenceCount = null) {
    const count = sentenceCount || Math.floor(Math.random() * 4) + 3;
    const sentences = [];
    for (let i = 0; i < count; i++) {
      sentences.push(this.generateSentence(wordList));
    }
    return sentences.join(' ');
  }

  generate() {
    const type = this.elements.textType.value;
    const count = parseInt(this.elements.count.value);
    const language = this.elements.language.value;
    const startLorem = this.elements.startLorem.checked;
    const htmlTags = this.elements.htmlTags.checked;

    const wordList = this.wordLists[language];
    let result = [];

    if (type === 'paragraphs') {
      for (let i = 0; i < count; i++) {
        let para = this.generateParagraph(wordList);
        if (i === 0 && startLorem && language === 'lorem') {
          para = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. ' + para;
        }
        result.push(htmlTags ? '<p>' + para + '</p>' : para);
      }
    } else if (type === 'sentences') {
      for (let i = 0; i < count; i++) {
        let sentence = this.generateSentence(wordList);
        if (i === 0 && startLorem && language === 'lorem') {
          sentence = 'Lorem ipsum dolor sit amet.';
        }
        result.push(sentence);
      }
    } else {
      let words = this.getRandomWords(wordList, count);
      if (startLorem && language === 'lorem') {
        words[0] = 'Lorem';
        if (count > 1) words[1] = 'ipsum';
      }
      result = words;
    }

    const output = type === 'words' ? result.join(' ') : result.join(htmlTags ? '\n' : '\n\n');
    this.elements.output.textContent = output;

    const wordCountVal = output.split(/\s+/).filter(w => w).length;
    this.elements.wordCount.textContent = wordCountVal + ' 단어';
    this.elements.charCount.textContent = output.length + ' 자';
  }

  copy() {
    const text = this.elements.output.textContent;
    this.copyToClipboard(text);
  }
}

// 전역 인스턴스 생성
const loremIpsum = new LoremIpsum();
window.LoremIpsum = loremIpsum;

document.addEventListener('DOMContentLoaded', () => loremIpsum.init());
