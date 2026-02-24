/**
 * 챕터 분리기 - ToolBase 기반
 * 텍스트 챕터 자동 분할
 * @created 2026-01-13
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var ChapterSplitter = class ChapterSplitter extends ToolBase {
  constructor() {
    super('ChapterSplitter');
    this.chapters = [];
    this.patterns = {
      chapter: /^(Chapter\s*\d+|제\s*\d+\s*장|CHAPTER\s*\d+)/im,
      part: /^(Part\s*\d+|제\s*\d+\s*부|PART\s*\d+)/im,
      section: /^(Section\s*\d+|\d+\s*절|SECTION\s*\d+)/im,
      heading: /^#{1,3}\s+.+/m,
      number: /^\d+\.\s+/m
    };
  }

  init() {
    this.initElements({
      textInput: 'textInput',
      splitMethod: 'splitMethod',
      patternOptions: 'patternOptions',
      lineOptions: 'lineOptions',
      charOptions: 'charOptions',
      customOptions: 'customOptions',
      splitPattern: 'splitPattern',
      lineCount: 'lineCount',
      charCount: 'charCount',
      customDelimiter: 'customDelimiter',
      resultPanel: 'resultPanel',
      chapterCount: 'chapterCount',
      chapterPreview: 'chapterPreview'
    });

    this.updatePatternVisibility();

    console.log('[ChapterSplitter] 초기화 완료');
    return this;
  }

  updatePatternVisibility() {
    const method = this.elements.splitMethod.value;
    this.elements.patternOptions.style.display = method === 'pattern' ? 'block' : 'none';
    this.elements.lineOptions.style.display = method === 'lines' ? 'block' : 'none';
    this.elements.charOptions.style.display = method === 'chars' ? 'block' : 'none';
    this.elements.customOptions.style.display = method === 'custom' ? 'block' : 'none';
  }

  setCustomPattern(pattern) {
    this.elements.splitMethod.value = 'custom';
    this.updatePatternVisibility();
    this.elements.customDelimiter.value = pattern === '\\n\\n\\n' ? '\n\n\n' : pattern;
  }

  split() {
    const text = this.elements.textInput.value.trim();
    if (!text) {
      alert('분리할 텍스트를 입력해주세요.');
      return;
    }

    const method = this.elements.splitMethod.value;

    switch (method) {
      case 'pattern':
        this.splitByPattern(text);
        break;
      case 'lines':
        this.splitByLines(text);
        break;
      case 'chars':
        this.splitByChars(text);
        break;
      case 'custom':
        this.splitByCustom(text);
        break;
    }

    this.renderResult();
  }

  splitByPattern(text) {
    const patternKey = this.elements.splitPattern.value;
    const pattern = this.patterns[patternKey];

    const lines = text.split('\n');
    const splitPoints = [0];

    lines.forEach((line, index) => {
      if (pattern.test(line) && index > 0) {
        splitPoints.push(index);
      }
    });

    this.chapters = [];
    for (let i = 0; i < splitPoints.length; i++) {
      const start = splitPoints[i];
      const end = splitPoints[i + 1] || lines.length;
      const chapterLines = lines.slice(start, end);

      if (chapterLines.length > 0) {
        const title = this.extractTitle(chapterLines[0], patternKey);
        this.chapters.push({
          title: title || `챕터 ${i + 1}`,
          content: chapterLines.join('\n').trim()
        });
      }
    }
  }

  extractTitle(line, patternKey) {
    const trimmed = line.trim();
    if (patternKey === 'heading') {
      return trimmed.replace(/^#+\s*/, '');
    }
    return trimmed.substring(0, 50);
  }

  splitByLines(text) {
    const lineCount = parseInt(this.elements.lineCount.value) || 50;
    const lines = text.split('\n');

    this.chapters = [];
    for (let i = 0; i < lines.length; i += lineCount) {
      const chapterLines = lines.slice(i, i + lineCount);
      const chapterNum = Math.floor(i / lineCount) + 1;
      this.chapters.push({
        title: `파트 ${chapterNum}`,
        content: chapterLines.join('\n').trim()
      });
    }
  }

  splitByChars(text) {
    const charCount = parseInt(this.elements.charCount.value) || 3000;

    this.chapters = [];
    let remaining = text;
    let chapterNum = 1;

    while (remaining.length > 0) {
      let splitPoint = charCount;

      if (splitPoint < remaining.length) {
        const nearEnd = remaining.substring(splitPoint - 100, splitPoint + 100);
        const sentenceEnd = nearEnd.search(/[.!?。]\s/);
        if (sentenceEnd >= 0) {
          splitPoint = splitPoint - 100 + sentenceEnd + 2;
        }
      }

      const content = remaining.substring(0, splitPoint).trim();
      remaining = remaining.substring(splitPoint).trim();

      this.chapters.push({
        title: `파트 ${chapterNum}`,
        content
      });
      chapterNum++;
    }
  }

  splitByCustom(text) {
    const delimiter = this.elements.customDelimiter.value;
    if (!delimiter) {
      alert('구분자를 입력해주세요.');
      return;
    }

    const parts = text.split(delimiter);

    this.chapters = parts
      .map((content, index) => content.trim())
      .filter(content => content.length > 0)
      .map((content, index) => ({
        title: `파트 ${index + 1}`,
        content
      }));
  }

  renderResult() {
    if (this.chapters.length === 0) {
      alert('분리된 챕터가 없습니다. 다른 분리 방식을 시도해보세요.');
      return;
    }

    this.elements.resultPanel.style.display = 'block';
    this.elements.chapterCount.textContent = this.chapters.length;

    this.elements.chapterPreview.innerHTML = this.chapters.map((chapter, index) => `
      <div class="chapter-card">
        <div class="chapter-card-header">
          <span class="chapter-card-title">${chapter.title}</span>
          <button class="tool-btn tool-btn-secondary" onclick="chapterSplitter.downloadChapter(${index})" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;">다운로드</button>
        </div>
        <div class="chapter-card-meta">
          ${chapter.content.length.toLocaleString()}자 · ${chapter.content.split('\n').length}줄
        </div>
        <div class="chapter-card-preview">${this.escapeHtml(chapter.content.substring(0, 200))}...</div>
      </div>
    `).join('');
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  downloadChapter(index) {
    const chapter = this.chapters[index];
    const blob = new Blob([chapter.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `${chapter.title.replace(/[/\\?%*:|"<>]/g, '_')}.txt`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  }

  downloadAll() {
    const combined = this.chapters.map((chapter, index) => {
      return `${'='.repeat(50)}\n${chapter.title}\n${'='.repeat(50)}\n\n${chapter.content}`;
    }).join('\n\n\n');

    const blob = new Blob([combined], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = 'chapters_combined.txt';
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const chapterSplitter = new ChapterSplitter();
window.ChapterSplitter = chapterSplitter;

document.addEventListener('DOMContentLoaded', () => chapterSplitter.init());
