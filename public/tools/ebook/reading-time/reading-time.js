/**
 * 읽기 시간 계산기 - ToolBase 기반
 * 텍스트 읽기 시간 추정
 * @created 2026-01-13
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var ReadingTime = class ReadingTime extends ToolBase {
  constructor() {
    super('ReadingTime');
    this.speed = 250; // 분당 글자 수
  }

  init() {
    this.initElements({
      textInput: 'textInput',
      customSpeed: 'customSpeed',
      readingTime: 'readingTime',
      charCount: 'charCount',
      wordCount: 'wordCount',
      pageCount: 'pageCount',
      sentenceCount: 'sentenceCount',
      paragraphCount: 'paragraphCount',
      avgSentenceLength: 'avgSentenceLength',
      koreanRatio: 'koreanRatio',
      englishRatio: 'englishRatio',
      slowBar: 'slowBar',
      normalBar: 'normalBar',
      fastBar: 'fastBar',
      speedBar: 'speedBar'
    });

    this.calculate();

    console.log('[ReadingTime] 초기화 완료');
    return this;
  }

  setSpeed(speed) {
    this.speed = speed;
    document.querySelectorAll('.speed-btn').forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.speed) === speed);
    });
    this.elements.customSpeed.value = '';
    this.calculate();
  }

  setCustomSpeed() {
    const custom = parseInt(this.elements.customSpeed.value);
    if (custom && custom > 0) {
      this.speed = custom;
      document.querySelectorAll('.speed-btn').forEach(btn => btn.classList.remove('active'));
      this.calculate();
    }
  }

  calculate() {
    const text = this.elements.textInput.value;

    // 기본 통계
    const charCount = text.replace(/\s/g, '').length;
    const charCountWithSpaces = text.length;

    // 단어 수 (한글 + 영문)
    const koreanWords = (text.match(/[가-힣]+/g) || []).length;
    const englishWords = (text.match(/[a-zA-Z]+/g) || []).length;
    const wordCount = koreanWords + englishWords;

    // 문장 수
    const sentences = text.split(/[.!?。]+/).filter(s => s.trim().length > 0);
    const sentenceCount = sentences.length;

    // 문단 수
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    const paragraphCount = Math.max(paragraphs.length, 1);

    // 평균 문장 길이
    const avgSentenceLength = sentenceCount > 0 ? Math.round(charCount / sentenceCount) : 0;

    // 한글/영문 비율
    const koreanChars = (text.match(/[가-힣]/g) || []).length;
    const englishChars = (text.match(/[a-zA-Z]/g) || []).length;
    const totalChars = koreanChars + englishChars;
    const koreanRatio = totalChars > 0 ? Math.round((koreanChars / totalChars) * 100) : 0;
    const englishRatio = totalChars > 0 ? Math.round((englishChars / totalChars) * 100) : 0;

    // 읽기 시간 계산
    const readingMinutes = charCount / this.speed;
    const readingTimeStr = this.formatTime(readingMinutes);

    // 페이지 수 (A4 기준 약 1800자)
    const pageCount = Math.ceil(charCountWithSpaces / 1800);

    // UI 업데이트
    this.elements.readingTime.textContent = readingTimeStr;
    this.elements.charCount.textContent = charCount.toLocaleString();
    this.elements.wordCount.textContent = wordCount.toLocaleString();
    this.elements.pageCount.textContent = pageCount;

    this.elements.sentenceCount.textContent = `${sentenceCount}개`;
    this.elements.paragraphCount.textContent = `${paragraphCount}개`;
    this.elements.avgSentenceLength.textContent = `${avgSentenceLength}자`;
    this.elements.koreanRatio.textContent = `${koreanRatio}%`;
    this.elements.englishRatio.textContent = `${englishRatio}%`;

    // 속도별 비교
    this.updateComparison(charCount);
  }

  formatTime(minutes) {
    if (minutes < 1) {
      return `${Math.round(minutes * 60)}초`;
    } else if (minutes < 60) {
      const mins = Math.floor(minutes);
      const secs = Math.round((minutes - mins) * 60);
      return secs > 0 ? `${mins}분 ${secs}초` : `${mins}분`;
    } else {
      const hours = Math.floor(minutes / 60);
      const mins = Math.round(minutes % 60);
      return mins > 0 ? `${hours}시간 ${mins}분` : `${hours}시간`;
    }
  }

  updateComparison(charCount) {
    const speeds = {
      slow: { speed: 150, element: 'slowBar' },
      normal: { speed: 250, element: 'normalBar' },
      fast: { speed: 400, element: 'fastBar' },
      speed: { speed: 600, element: 'speedBar' }
    };

    // 가장 느린 속도 기준으로 100%
    const maxMinutes = charCount / 150;
    const maxWidth = 250; // px

    Object.values(speeds).forEach(({ speed, element }) => {
      const minutes = charCount / speed;
      const width = maxMinutes > 0 ? (minutes / maxMinutes) * maxWidth : 0;
      const bar = this.elements[element];
      bar.style.width = `${width}px`;
      bar.textContent = this.formatTime(minutes);
    });
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const readingTime = new ReadingTime();
window.ReadingTime = readingTime;

document.addEventListener('DOMContentLoaded', () => readingTime.init());
