/**
 * 단어 빈도 분석기 - ToolBase 기반
 * 텍스트 내 단어 빈도 분석 및 시각화
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class WordFrequency extends ToolBase {
  constructor() {
    super('WordFrequency');

    this.stopwords = {
      ko: ['이', '그', '저', '것', '수', '등', '및', '더', '좀', '잘', '못', '안', '또', '꼭', '왜', '뭐', '어디', '언제', '어떻게', '누가', '누구', '무엇', '어느', '그래서', '그러나', '그리고', '하지만', '때문에'],
      en: ['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'and', 'but', 'if', 'or', 'because', 'until', 'while', 'this', 'that', 'these', 'those', 'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', 'your', 'yours', 'yourself', 'yourselves', 'he', 'him', 'his', 'himself', 'she', 'her', 'hers', 'herself', 'it', 'its', 'itself', 'they', 'them', 'their', 'theirs', 'themselves', 'what', 'which', 'who', 'whom']
    };
  }

  init() {
    this.initElements({
      inputText: 'inputText',
      ignoreCase: 'ignoreCase',
      ignoreNumbers: 'ignoreNumbers',
      ignoreStopwords: 'ignoreStopwords',
      minLength: 'minLength',
      totalWords: 'totalWords',
      uniqueWords: 'uniqueWords',
      avgLength: 'avgLength',
      lexicalDensity: 'lexicalDensity',
      wordList: 'wordList',
      barChart: 'barChart',
      wordCloud: 'wordCloud'
    });

    this.analyze();

    console.log('[WordFrequency] 초기화 완료');
    return this;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  analyze() {
    const text = this.elements.inputText.value;
    const ignoreCase = this.elements.ignoreCase.checked;
    const ignoreNumbers = this.elements.ignoreNumbers.checked;
    const ignoreStopwords = this.elements.ignoreStopwords.checked;
    const minLength = parseInt(this.elements.minLength.value) || 1;

    let words = text.match(/[\w\u3131-\u318E\uAC00-\uD7A3]+/g) || [];

    if (ignoreCase) {
      words = words.map(w => w.toLowerCase());
    }

    if (ignoreNumbers) {
      words = words.filter(w => !/^\d+$/.test(w));
    }

    words = words.filter(w => w.length >= minLength);

    if (ignoreStopwords) {
      const allStopwords = [...this.stopwords.ko, ...this.stopwords.en];
      words = words.filter(w => !allStopwords.includes(w.toLowerCase()));
    }

    const frequency = {};
    words.forEach(word => {
      frequency[word] = (frequency[word] || 0) + 1;
    });

    const sorted = Object.entries(frequency).sort((a, b) => b[1] - a[1]);

    const totalWords = words.length;
    const uniqueWords = sorted.length;
    const avgLength = totalWords > 0 ? (words.reduce((sum, w) => sum + w.length, 0) / totalWords).toFixed(1) : 0;
    const lexicalDensity = totalWords > 0 ? ((uniqueWords / totalWords) * 100).toFixed(1) : 0;

    this.elements.totalWords.textContent = totalWords.toLocaleString();
    this.elements.uniqueWords.textContent = uniqueWords.toLocaleString();
    this.elements.avgLength.textContent = avgLength;
    this.elements.lexicalDensity.textContent = lexicalDensity + '%';

    const maxCount = sorted.length > 0 ? sorted[0][1] : 1;
    const wordListHtml = sorted.slice(0, 50).map(([word, count], i) => {
      const percent = (count / maxCount) * 100;
      return '<div class="word-item">' +
        '<span class="word-rank">' + (i + 1) + '</span>' +
        '<span class="word-text">' + this.escapeHtml(word) + '</span>' +
        '<span class="word-count">' + count + '</span>' +
        '<div class="word-bar"><div class="word-bar-fill" style="width:' + percent + '%"></div></div>' +
        '</div>';
    }).join('');
    this.elements.wordList.innerHTML = wordListHtml || '<div style="color:#888;text-align:center;padding:20px">분석할 단어가 없습니다</div>';

    this.drawChart(sorted.slice(0, 20));
    this.generateWordCloud(sorted.slice(0, 50));
  }

  drawChart(data) {
    const canvas = this.elements.barChart;
    const ctx = canvas.getContext('2d');

    canvas.width = canvas.offsetWidth * 2;
    canvas.height = 600;
    ctx.scale(2, 2);

    const width = canvas.offsetWidth;
    const height = 300;
    const padding = { top: 20, right: 20, bottom: 80, left: 50 };

    ctx.clearRect(0, 0, width, height);

    if (data.length === 0) return;

    const maxCount = data[0][1];
    const barWidth = (width - padding.left - padding.right) / data.length - 5;
    const chartHeight = height - padding.top - padding.bottom;

    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (chartHeight / 5) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      ctx.fillStyle = '#888';
      ctx.font = '10px Noto Sans KR';
      ctx.textAlign = 'right';
      ctx.fillText(Math.round(maxCount * (5 - i) / 5), padding.left - 5, y + 3);
    }

    const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
    gradient.addColorStop(0, '#667eea');
    gradient.addColorStop(1, '#764ba2');

    data.forEach(([word, count], i) => {
      const barHeight = (count / maxCount) * chartHeight;
      const x = padding.left + i * (barWidth + 5);
      const y = height - padding.bottom - barHeight;

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, 3);
      ctx.fill();

      ctx.save();
      ctx.translate(x + barWidth / 2, height - padding.bottom + 10);
      ctx.rotate(-Math.PI / 4);
      ctx.fillStyle = '#333';
      ctx.font = '10px Noto Sans KR';
      ctx.textAlign = 'right';
      ctx.fillText(word.length > 8 ? word.substring(0, 8) + '...' : word, 0, 0);
      ctx.restore();
    });
  }

  generateWordCloud(data) {
    const container = this.elements.wordCloud;

    if (data.length === 0) {
      container.innerHTML = '<div style="color:#888;text-align:center;width:100%">분석할 단어가 없습니다</div>';
      return;
    }

    const maxCount = data[0][1];
    const colors = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe', '#43e97b', '#38f9d7'];

    const html = data.map(([word, count]) => {
      const size = 14 + (count / maxCount) * 36;
      const color = colors[Math.floor(Math.random() * colors.length)];
      const opacity = 0.6 + (count / maxCount) * 0.4;
      return '<span class="cloud-word" style="font-size:' + size + 'px;color:' + color + ';opacity:' + opacity + '">' + this.escapeHtml(word) + '</span>';
    }).join('');

    container.innerHTML = html;
  }
}

// 전역 인스턴스 생성
const wordFrequency = new WordFrequency();
window.WordFrequency = wordFrequency;

// 전역 함수 (HTML onclick 호환)
function analyze() {
  wordFrequency.analyze();
}

document.addEventListener('DOMContentLoaded', () => wordFrequency.init());
