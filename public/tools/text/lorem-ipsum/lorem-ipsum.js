/**
 * Lorem Ipsum 생성기 - ToolBase 기반
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var LoremIpsum = class LoremIpsum extends ToolBase {
  constructor() {
    super('LoremIpsum');
    this.words = [
      'lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit',
      'sed', 'do', 'eiusmod', 'tempor', 'incididunt', 'ut', 'labore', 'et', 'dolore',
      'magna', 'aliqua', 'enim', 'ad', 'minim', 'veniam', 'quis', 'nostrud',
      'exercitation', 'ullamco', 'laboris', 'nisi', 'aliquip', 'ex', 'ea', 'commodo',
      'consequat', 'duis', 'aute', 'irure', 'in', 'reprehenderit', 'voluptate',
      'velit', 'esse', 'cillum', 'fugiat', 'nulla', 'pariatur', 'excepteur', 'sint',
      'occaecat', 'cupidatat', 'non', 'proident', 'sunt', 'culpa', 'qui', 'officia',
      'deserunt', 'mollit', 'anim', 'id', 'est', 'laborum', 'perspiciatis', 'unde',
      'omnis', 'iste', 'natus', 'error', 'voluptatem', 'accusantium', 'doloremque',
      'laudantium', 'totam', 'rem', 'aperiam', 'eaque', 'ipsa', 'quae', 'ab', 'illo',
      'inventore', 'veritatis', 'quasi', 'architecto', 'beatae', 'vitae', 'dicta',
      'explicabo', 'nemo', 'ipsam', 'quia', 'voluptas', 'aspernatur', 'aut', 'odit',
      'fugit', 'consequuntur', 'magni', 'dolores', 'eos', 'ratione', 'sequi', 'nesciunt'
    ];
    this.loremStart = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.';
  }

  init() {
    this.initElements({
      quantity: 'quantity',
      startLorem: 'startLorem',
      outputText: 'outputText'
    });

    console.log('[LoremIpsum] 초기화 완료');
    return this;
  }

  generate() {
    const unit = document.querySelector('input[name="unit"]:checked').value;
    const quantity = parseInt(this.elements.quantity.value) || 1;
    const startWithLorem = this.elements.startLorem.checked;

    let result;
    switch (unit) {
      case 'paragraphs':
        result = this.generateParagraphs(quantity, startWithLorem);
        break;
      case 'sentences':
        result = this.generateSentences(quantity, startWithLorem);
        break;
      case 'words':
        result = this.generateWords(quantity, startWithLorem);
        break;
    }

    this.elements.outputText.value = result;
    this.showSuccess('텍스트가 생성되었습니다.');
  }

  generateWords(count, startWithLorem) {
    const words = [];
    if (startWithLorem && count >= 2) {
      words.push('Lorem', 'ipsum');
      count -= 2;
    }
    for (let i = 0; i < count; i++) {
      words.push(this.randomWord());
    }
    return words.join(' ');
  }

  generateSentences(count, startWithLorem) {
    const sentences = [];
    for (let i = 0; i < count; i++) {
      if (i === 0 && startWithLorem) {
        sentences.push(this.loremStart);
      } else {
        sentences.push(this.randomSentence());
      }
    }
    return sentences.join(' ');
  }

  generateParagraphs(count, startWithLorem) {
    const paragraphs = [];
    for (let i = 0; i < count; i++) {
      const sentenceCount = this.random(4, 8);
      const sentences = [];
      for (let j = 0; j < sentenceCount; j++) {
        if (i === 0 && j === 0 && startWithLorem) {
          sentences.push(this.loremStart);
        } else {
          sentences.push(this.randomSentence());
        }
      }
      paragraphs.push(sentences.join(' '));
    }
    return paragraphs.join('\n\n');
  }

  randomSentence() {
    const wordCount = this.random(8, 15);
    const words = [];
    for (let i = 0; i < wordCount; i++) {
      words.push(this.randomWord());
    }
    words[0] = this.capitalize(words[0]);
    return words.join(' ') + '.';
  }

  randomWord() {
    return this.words[Math.floor(Math.random() * this.words.length)];
  }

  random(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  capitalize(word) {
    return word.charAt(0).toUpperCase() + word.slice(1);
  }

  async copy() {
    const text = this.elements.outputText.value;
    if (!text) {
      this.showError('복사할 텍스트가 없습니다.');
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      this.showSuccess('클립보드에 복사되었습니다.');
    } catch (err) {
      this.showError('복사에 실패했습니다.');
    }
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const loremIpsum = new LoremIpsum();
window.LoremIpsum = loremIpsum;

document.addEventListener('DOMContentLoaded', () => loremIpsum.init());
