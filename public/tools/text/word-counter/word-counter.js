/**
 * 글자수 세기 도구 - ToolBase 기반
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var WordCounter = class WordCounter extends ToolBase {
  constructor() {
    super('WordCounter');
  }

  init() {
    this.initElements({
      inputText: 'inputText',
      charCount: 'charCount',
      charNoSpace: 'charNoSpace',
      wordCount: 'wordCount',
      sentenceCount: 'sentenceCount',
      paragraphCount: 'paragraphCount',
      lineCount: 'lineCount',
      koreanCount: 'koreanCount',
      englishCount: 'englishCount',
      numberCount: 'numberCount',
      specialCount: 'specialCount',
      spaceCount: 'spaceCount',
      readTime: 'readTime'
    });

    console.log('[WordCounter] 초기화 완료');
    return this;
  }

  analyze() {
    const text = this.elements.inputText.value;

    // 기본 통계
    const charCount = text.length;
    const charNoSpace = text.replace(/\s/g, '').length;
    const words = text.trim().split(/\s+/).filter(w => w.length > 0);
    const wordCount = text.trim() ? words.length : 0;
    const sentences = text.split(/[.!?。？！]+/).filter(s => s.trim().length > 0);
    const sentenceCount = sentences.length;
    const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);
    const paragraphCount = text.trim() ? paragraphs.length : 0;
    const lines = text.split('\n');
    const lineCount = text ? lines.length : 0;

    // 상세 분석
    const korean = (text.match(/[가-힣]/g) || []).length;
    const english = (text.match(/[a-zA-Z]/g) || []).length;
    const numbers = (text.match(/[0-9]/g) || []).length;
    const spaces = (text.match(/\s/g) || []).length;
    const special = charCount - korean - english - numbers - spaces;

    // 읽기 시간 (분당 200단어)
    const readMinutes = wordCount / 200;
    let readTimeStr;
    if (readMinutes < 1) {
      readTimeStr = `${Math.ceil(readMinutes * 60)}초`;
    } else {
      const mins = Math.floor(readMinutes);
      const secs = Math.round((readMinutes - mins) * 60);
      readTimeStr = secs > 0 ? `${mins}분 ${secs}초` : `${mins}분`;
    }

    // UI 업데이트
    this.elements.charCount.textContent = this.formatNumber(charCount);
    this.elements.charNoSpace.textContent = this.formatNumber(charNoSpace);
    this.elements.wordCount.textContent = this.formatNumber(wordCount);
    this.elements.sentenceCount.textContent = this.formatNumber(sentenceCount);
    this.elements.paragraphCount.textContent = this.formatNumber(paragraphCount);
    this.elements.lineCount.textContent = this.formatNumber(lineCount);
    this.elements.koreanCount.textContent = this.formatNumber(korean);
    this.elements.englishCount.textContent = this.formatNumber(english);
    this.elements.numberCount.textContent = this.formatNumber(numbers);
    this.elements.specialCount.textContent = this.formatNumber(special);
    this.elements.spaceCount.textContent = this.formatNumber(spaces);
    this.elements.readTime.textContent = readTimeStr;
  }

  formatNumber(num) {
    return num.toLocaleString();
  }

  async paste() {
    try {
      const text = await navigator.clipboard.readText();
      this.elements.inputText.value = text;
      this.analyze();
      this.showSuccess('클립보드에서 붙여넣었습니다.');
    } catch (err) {
      this.showError('클립보드 접근 권한이 필요합니다.');
    }
  }

  clear() {
    this.elements.inputText.value = '';
    this.analyze();
    this.showToast('텍스트가 삭제되었습니다.', 'info');
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const wordCounter = new WordCounter();
window.WordCounter = wordCounter;

document.addEventListener('DOMContentLoaded', () => wordCounter.init());
