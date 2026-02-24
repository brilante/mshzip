/**
 * 워드 클라우드 생성기 - ToolBase 기반
 * 텍스트 빈도 기반 워드 클라우드
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class WordCloudTool extends ToolBase {
  constructor() {
    super('WordCloudTool');
    this.words = [];
    this.colorThemes = {
      rainbow: ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#43e97b', '#fa709a', '#fee140'],
      blue: ['#1e3a8a', '#1e40af', '#1d4ed8', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd'],
      green: ['#14532d', '#166534', '#15803d', '#16a34a', '#22c55e', '#4ade80', '#86efac'],
      warm: ['#7c2d12', '#9a3412', '#c2410c', '#ea580c', '#f97316', '#fb923c', '#fdba74'],
      cool: ['#0c4a6e', '#075985', '#0369a1', '#0284c7', '#0ea5e9', '#38bdf8', '#7dd3fc']
    };
    this.presets = {
      tech: {
        words: [
          { text: 'AI', weight: 100 }, { text: '머신러닝', weight: 95 },
          { text: '클라우드', weight: 90 }, { text: '빅데이터', weight: 85 },
          { text: 'API', weight: 80 }, { text: '블록체인', weight: 75 },
          { text: 'DevOps', weight: 70 }, { text: 'IoT', weight: 65 },
          { text: '컨테이너', weight: 60 }, { text: '마이크로서비스', weight: 55 },
          { text: 'Kubernetes', weight: 50 }, { text: '서버리스', weight: 45 }
        ]
      },
      marketing: {
        words: [
          { text: '브랜딩', weight: 100 }, { text: 'ROI', weight: 95 },
          { text: 'SEO', weight: 90 }, { text: '컨텐츠', weight: 85 },
          { text: '타겟팅', weight: 80 }, { text: '전환율', weight: 75 },
          { text: '캠페인', weight: 70 }, { text: '인플루언서', weight: 65 },
          { text: '바이럴', weight: 60 }, { text: '리텐션', weight: 55 },
          { text: 'CRM', weight: 50 }, { text: '퍼널', weight: 45 }
        ]
      },
      emotions: {
        words: [
          { text: '행복', weight: 100 }, { text: '감사', weight: 90 },
          { text: '사랑', weight: 85 }, { text: '기쁨', weight: 80 },
          { text: '희망', weight: 75 }, { text: '평화', weight: 70 },
          { text: '설렘', weight: 65 }, { text: '열정', weight: 60 },
          { text: '위로', weight: 55 }, { text: '용기', weight: 50 },
          { text: '성취', weight: 45 }, { text: '자신감', weight: 40 }
        ]
      }
    };
    this.stopWords = new Set(['의', '가', '이', '은', '는', '을', '를', '에', '와', '과', '도', '로', '으로', '에서', '까지', '부터', '만', '만큼', '처럼', '같이', '보다', '라고', '하고', '이고', '인', '한', '할', '하는', '된', '되는', 'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'under', 'again', 'further', 'then', 'once', 'and', 'but', 'or', 'nor', 'so', 'yet', 'both', 'either', 'neither', 'not', 'only', 'own', 'same', 'than', 'too', 'very', 'just']);
  }

  init() {
    this.initElements({
      textInput: 'textInput',
      wordList: 'wordList',
      colorTheme: 'colorTheme',
      minFontSize: 'minFontSize',
      maxFontSize: 'maxFontSize',
      maxWords: 'maxWords',
      wordCloud: 'wordCloud'
    });

    this.loadDefaultWords();
    this.renderWordList();
    this.render();

    console.log('[WordCloudTool] 초기화 완료');
    return this;
  }

  loadDefaultWords() {
    this.words = [
      { text: '데이터', weight: 100 },
      { text: '분석', weight: 85 },
      { text: '시각화', weight: 80 },
      { text: '차트', weight: 75 },
      { text: '인사이트', weight: 70 },
      { text: '통계', weight: 65 },
      { text: '패턴', weight: 60 },
      { text: '트렌드', weight: 55 },
      { text: '대시보드', weight: 50 },
      { text: '리포트', weight: 45 },
      { text: '그래프', weight: 40 },
      { text: '메트릭', weight: 35 }
    ];
  }

  renderWordList() {
    const container = this.elements.wordList;
    container.innerHTML = this.words.map((word, idx) =>
      `<div class="word-item">
        <input type="text" value="${this.escapeHtml(word.text)}" onchange="wordCloudTool.updateWord(${idx}, 'text', this.value)" placeholder="단어">
        <input type="number" value="${word.weight}" min="1" max="100" onchange="wordCloudTool.updateWord(${idx}, 'weight', this.value)" placeholder="빈도">
        <button class="delete-word-btn" onclick="wordCloudTool.removeWord(${idx})"></button>
      </div>`
    ).join('');
  }

  addWord() {
    this.words.push({ text: `단어${this.words.length + 1}`, weight: 50 });
    this.renderWordList();
    this.render();
  }

  removeWord(index) {
    if (this.words.length <= 1) {
      this.showToast('최소 1개의 단어가 필요합니다.', 'error');
      return;
    }
    this.words.splice(index, 1);
    this.renderWordList();
    this.render();
  }

  updateWord(index, field, value) {
    if (field === 'weight') {
      value = Math.max(1, Math.min(100, parseInt(value) || 1));
    }
    this.words[index][field] = value;
    this.render();
  }

  analyzeText() {
    const text = this.elements.textInput.value;
    if (!text.trim()) {
      this.showToast('분석할 텍스트를 입력해주세요.', 'error');
      return;
    }

    const words = text.toLowerCase()
      .replace(/[^a-zA-Z가-힣0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 1 && !this.stopWords.has(w));

    const wordCount = {};
    words.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });

    const maxCount = Math.max(...Object.values(wordCount));
    const sorted = Object.entries(wordCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, parseInt(this.elements.maxWords.value) || 50);

    this.words = sorted.map(([text, count]) => ({
      text,
      weight: Math.round((count / maxCount) * 100)
    }));

    this.renderWordList();
    this.render();
  }

  clearInput() {
    this.elements.textInput.value = '';
    this.loadDefaultWords();
    this.renderWordList();
    this.render();
  }

  render() {
    const container = this.elements.wordCloud;
    const theme = this.elements.colorTheme.value;
    const minFont = parseInt(this.elements.minFontSize.value) || 12;
    const maxFont = parseInt(this.elements.maxFontSize.value) || 60;
    const maxWords = parseInt(this.elements.maxWords.value) || 50;

    const colors = this.colorThemes[theme] || this.colorThemes.rainbow;

    if (this.words.length === 0) {
      container.innerHTML = '<div class="wordcloud-empty">텍스트를 입력하거나 단어를 추가해주세요</div>';
      return;
    }

    const sorted = [...this.words].sort((a, b) => b.weight - a.weight).slice(0, maxWords);
    const maxWeight = Math.max(...sorted.map(w => w.weight));
    const minWeight = Math.min(...sorted.map(w => w.weight));
    const weightRange = maxWeight - minWeight || 1;

    const shuffled = sorted.sort(() => Math.random() - 0.5);

    container.innerHTML = shuffled.map(word => {
      const normalizedWeight = (word.weight - minWeight) / weightRange;
      const fontSize = Math.round(minFont + normalizedWeight * (maxFont - minFont));
      const color = colors[Math.floor(Math.random() * colors.length)];
      const rotation = Math.random() > 0.7 ? (Math.random() > 0.5 ? 90 : -90) : 0;

      return `<span class="wordcloud-word" style="font-size:${fontSize}px;color:${color};transform:rotate(${rotation}deg);" title="${this.escapeHtml(word.text)}: ${word.weight}">${this.escapeHtml(word.text)}</span>`;
    }).join('');
  }

  exportImage(format) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 800;
    canvas.height = 500;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const theme = this.elements.colorTheme.value;
    const colors = this.colorThemes[theme] || this.colorThemes.rainbow;
    const minFont = parseInt(this.elements.minFontSize.value) || 12;
    const maxFont = parseInt(this.elements.maxFontSize.value) || 60;

    const sorted = [...this.words].sort((a, b) => b.weight - a.weight);
    const maxWeight = Math.max(...sorted.map(w => w.weight));
    const minWeight = Math.min(...sorted.map(w => w.weight));
    const weightRange = maxWeight - minWeight || 1;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const positions = [];
    sorted.forEach(word => {
      const normalizedWeight = (word.weight - minWeight) / weightRange;
      const fontSize = Math.round(minFont + normalizedWeight * (maxFont - minFont));
      const color = colors[Math.floor(Math.random() * colors.length)];

      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.fillStyle = color;

      let x, y, attempts = 0;
      do {
        x = 100 + Math.random() * (canvas.width - 200);
        y = 80 + Math.random() * (canvas.height - 160);
        attempts++;
      } while (attempts < 50 && positions.some(p => Math.abs(p.x - x) < 80 && Math.abs(p.y - y) < fontSize));

      positions.push({ x, y });
      ctx.fillText(word.text, x, y);
    });

    const link = document.createElement('a');
    link.href = canvas.toDataURL(format === 'jpg' ? 'image/jpeg' : 'image/png', 0.9);
    link.download = `word-cloud.${format}`;
    link.click();
  }

  exportData() {
    const obj = {
      words: this.words,
      settings: {
        maxWords: this.elements.maxWords.value,
        colorTheme: this.elements.colorTheme.value,
        minFontSize: this.elements.minFontSize.value,
        maxFontSize: this.elements.maxFontSize.value
      }
    };
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'word-cloud-data.json';
    link.click();
  }

  loadPreset(type) {
    const preset = this.presets[type];
    if (preset) {
      this.words = preset.words;
      this.elements.textInput.value = '';
      this.renderWordList();
      this.render();
    }
  }

  escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}

// 전역 인스턴스 생성
const wordCloudTool = new WordCloudTool();
window.WordCloud = wordCloudTool;

document.addEventListener('DOMContentLoaded', () => wordCloudTool.init());
