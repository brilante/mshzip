/**
 * 로렘 입숨 생성기 - ToolBase 기반
 * 다양한 언어의 더미 텍스트 생성
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class LoremIpsum extends ToolBase {
  constructor() {
    super('LoremIpsum');
    this.selectedLanguage = 'latin';
    this.selectedUnit = 'paragraphs';

    this.loremData = {
      latin: {
        words: ['lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit', 'sed', 'do', 'eiusmod', 'tempor', 'incididunt', 'ut', 'labore', 'et', 'dolore', 'magna', 'aliqua', 'enim', 'ad', 'minim', 'veniam', 'quis', 'nostrud', 'exercitation', 'ullamco', 'laboris', 'nisi', 'aliquip', 'ex', 'ea', 'commodo', 'consequat', 'duis', 'aute', 'irure', 'in', 'reprehenderit', 'voluptate', 'velit', 'esse', 'cillum', 'fugiat', 'nulla', 'pariatur', 'excepteur', 'sint', 'occaecat', 'cupidatat', 'non', 'proident', 'sunt', 'culpa', 'qui', 'officia', 'deserunt', 'mollit', 'anim', 'id', 'est', 'laborum', 'vivamus', 'lacinia', 'odio', 'vitae', 'vestibulum', 'donec', 'ultrices', 'tincidunt', 'arcu', 'pellentesque', 'placerat', 'dui', 'ultricies'],
        start: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.'
      },
      korean: {
        words: ['국민', '대한민국', '헌법', '법률', '정부', '국가', '자유', '권리', '의무', '평화', '민주', '사회', '문화', '경제', '발전', '국민', '행복', '안전', '복지', '교육', '환경', '기술', '과학', '예술', '역사', '전통', '미래', '희망', '사랑', '믿음', '정의', '평등', '인권', '존엄', '생명', '가치', '꿈', '열정', '도전', '성공', '노력', '인내', '지혜', '용기', '배려', '협력', '소통', '공감', '창의', '혁신'],
        start: '대한민국은 민주공화국이며 주권은 국민에게 있다.'
      },
      hipster: {
        words: ['artisan', 'sustainable', 'organic', 'vegan', 'craft', 'locally', 'sourced', 'authentic', 'vintage', 'handcrafted', 'small-batch', 'farm-to-table', 'aesthetic', 'minimalist', 'curated', 'bespoke', 'ethical', 'mindful', 'conscious', 'slow-living', 'wellness', 'holistic', 'eco-friendly', 'carbon-neutral', 'fair-trade', 'cold-brew', 'sourdough', 'avocado', 'kombucha', 'matcha', 'quinoa', 'kale', 'acai', 'turmeric', 'oat-milk', 'vinyl', 'polaroid', 'typewriter', 'fixie', 'beard', 'tattoo', 'flannel', 'mason-jar', 'terrarium', 'succulent'],
        start: 'Artisan sustainable organic vegan craft coffee awaits.'
      },
      office: {
        words: ['시너지', '프로젝트', '미팅', '브리핑', '리뷰', '피드백', '벤치마킹', '로드맵', '마일스톤', '딜리버리', '어젠다', '이니셔티브', '레버리지', '스케일업', '옵티마이즈', 'KPI', 'ROI', '태스크', '데드라인', '프라이오리티', '워크플로우', '파이프라인', '스테이크홀더', '컨센서스', '밸류', '비전', '미션', '전략', '실행', '성과', '목표', '달성', '협업', '커뮤니케이션', '리더십', '이노베이션', '트랜스포메이션', '디지털', '애자일', '린', '스크럼', '칸반', '스프린트'],
        start: '금번 프로젝트의 시너지를 극대화하기 위한 미팅입니다.'
      }
    };
  }

  init() {
    this.initElements({
      count: 'count',
      startWithLorem: 'startWithLorem',
      includeHtml: 'includeHtml',
      output: 'output',
      statParagraphs: 'statParagraphs',
      statSentences: 'statSentences',
      statWords: 'statWords',
      statChars: 'statChars'
    });

    this.setupEvents();
    this.generate();

    console.log('[LoremIpsum] 초기화 완료');
    return this;
  }

  setupEvents() {
    document.querySelectorAll('.toggle-group').forEach(group => {
      group.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          group.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');

          if (group.id === 'languageToggle') {
            this.selectedLanguage = btn.dataset.value;
          } else if (group.id === 'unitToggle') {
            this.selectedUnit = btn.dataset.value;
          }
        });
      });
    });
  }

  changeCount(delta) {
    const input = this.elements.count;
    const newValue = Math.max(1, Math.min(100, parseInt(input.value) + delta));
    input.value = newValue;
  }

  getRandomWord(lang) {
    const words = this.loremData[lang].words;
    return words[Math.floor(Math.random() * words.length)];
  }

  generateSentence(lang, minWords = 5, maxWords = 15) {
    const wordCount = Math.floor(Math.random() * (maxWords - minWords + 1)) + minWords;
    const words = [];

    for (let i = 0; i < wordCount; i++) {
      words.push(this.getRandomWord(lang));
    }

    words[0] = words[0].charAt(0).toUpperCase() + words[0].slice(1);
    const punctuation = Math.random() < 0.1 ? '?' : (Math.random() < 0.1 ? '!' : '.');

    return words.join(' ') + punctuation;
  }

  generateParagraph(lang, sentenceCount = null) {
    const count = sentenceCount || Math.floor(Math.random() * 4) + 4;
    const sentences = [];

    for (let i = 0; i < count; i++) {
      sentences.push(this.generateSentence(lang));
    }

    return sentences.join(' ');
  }

  escapeHtml(text) {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  generate() {
    const count = parseInt(this.elements.count.value) || 1;
    const startWithLorem = this.elements.startWithLorem.checked;
    const includeHtml = this.elements.includeHtml.checked;

    let result = [];
    const lang = this.selectedLanguage;

    if (this.selectedUnit === 'words') {
      const words = [];
      for (let i = 0; i < count; i++) {
        words.push(this.getRandomWord(lang));
      }
      if (startWithLorem && lang === 'latin') {
        words[0] = 'Lorem';
        if (count > 1) words[1] = 'ipsum';
      }
      result = [words.join(' ')];
    } else if (this.selectedUnit === 'sentences') {
      for (let i = 0; i < count; i++) {
        let sentence = this.generateSentence(lang);
        if (i === 0 && startWithLorem) {
          sentence = this.loremData[lang].start;
        }
        result.push(sentence);
      }
    } else {
      for (let i = 0; i < count; i++) {
        let para = this.generateParagraph(lang);
        if (i === 0 && startWithLorem) {
          para = this.loremData[lang].start + ' ' + para;
        }
        result.push(para);
      }
    }

    let output = '';
    if (includeHtml) {
      output = result.map(p => '<p>' + p + '</p>').join('\n');
    } else {
      output = result.join('\n\n');
    }

    this.elements.output.innerHTML = includeHtml
      ? '<pre style="white-space:pre-wrap">' + this.escapeHtml(output) + '</pre>'
      : result.map(p => '<p>' + p + '</p>').join('');

    const plainText = result.join(' ');
    const paragraphs = result.length;
    const sentences = plainText.split(/[.!?]+/).filter(s => s.trim()).length;
    const words = plainText.split(/\s+/).filter(w => w.trim()).length;
    const chars = plainText.length;

    this.elements.statParagraphs.textContent = paragraphs + ' 문단';
    this.elements.statSentences.textContent = sentences + ' 문장';
    this.elements.statWords.textContent = words + ' 단어';
    this.elements.statChars.textContent = chars + ' 글자';
  }

  copyText() {
    const text = this.elements.output.innerText || this.elements.output.textContent;
    this.copyToClipboard(text);
    this.showToast('복사되었습니다!', 'success');
  }

  downloadText() {
    const text = this.elements.output.innerText || this.elements.output.textContent;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lorem-ipsum.txt';
    a.click();
    URL.revokeObjectURL(url);
  }
}

// 전역 인스턴스 생성
const loremIpsum = new LoremIpsum();
window.LoremIpsum = loremIpsum;

// 전역 함수 (HTML onclick 호환)
function generate() { loremIpsum.generate(); }
function changeCount(delta) { loremIpsum.changeCount(delta); }
function copyText() { loremIpsum.copyText(); }
function downloadText() { loremIpsum.downloadText(); }

document.addEventListener('DOMContentLoaded', () => loremIpsum.init());
