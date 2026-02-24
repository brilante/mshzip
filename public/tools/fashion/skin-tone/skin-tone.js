/**
 * 퍼스널 컬러 - ToolBase 기반
 * 피부톤 분석 및 컬러 추천
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var SkinTone = class SkinTone extends ToolBase {
  constructor() {
    super('SkinTone');
    this.answers = {};

    this.questions = [
      {
        id: 'vein',
        title: '손목 혈관 색깔은?',
        options: [
          { value: 'blue', label: '파란색/보라색' },
          { value: 'green', label: '초록색' },
          { value: 'both', label: '둘 다 보임' }
        ]
      },
      {
        id: 'jewelry',
        title: '더 잘 어울리는 금속은?',
        options: [
          { value: 'silver', label: '실버/화이트골드' },
          { value: 'gold', label: '골드/로즈골드' },
          { value: 'both', label: '둘 다 잘 어울림' }
        ]
      },
      {
        id: 'white',
        title: '더 잘 어울리는 흰색은?',
        options: [
          { value: 'pure', label: '순백색' },
          { value: 'ivory', label: '아이보리/크림색' },
          { value: 'both', label: '둘 다 잘 어울림' }
        ]
      },
      {
        id: 'tan',
        title: '햇볕에 노출되면?',
        options: [
          { value: 'burn', label: '빨갛게 타고 금방 벗겨짐' },
          { value: 'tan', label: '잘 타고 오래 유지됨' },
          { value: 'middle', label: '약간 타지만 금방 돌아옴' }
        ]
      },
      {
        id: 'eye',
        title: '눈동자 색깔은?',
        options: [
          { value: 'dark', label: '진한 갈색/검은색' },
          { value: 'light', label: '연한 갈색/밤색' },
          { value: 'hazel', label: '밝은 갈색/헤이즐' }
        ]
      },
      {
        id: 'contrast',
        title: '눈동자, 머리카락, 피부 대비는?',
        options: [
          { value: 'high', label: '대비가 강함 (선명함)' },
          { value: 'low', label: '대비가 약함 (부드러움)' },
          { value: 'medium', label: '중간 정도' }
        ]
      }
    ];

    this.seasons = {
      spring: {
        name: '봄 웜톤',
        gradient: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
        colors: ['#FFD700', '#FFA500', '#FF6347', '#FF7F50', '#FFDAB9', '#98FB98', '#00CED1', '#F0E68C'],
        avoid: ['#000000', '#808080', '#4B0082', '#800020'],
        celebrities: '수지, 아이유, 윤아, 박보검',
        makeup: '복숭아빛 블러셔, 코랄 립스틱, 골드 아이섀도우가 잘 어울립니다. 브라운 계열 마스카라도 추천합니다.'
      },
      summer: {
        name: '여름 쿨톤',
        gradient: 'linear-gradient(135deg, #ec4899, #a855f7)',
        colors: ['#E6E6FA', '#DDA0DD', '#DB7093', '#C71585', '#87CEEB', '#B0C4DE', '#778899', '#FFFAFA'],
        avoid: ['#FF4500', '#FF6347', '#FFA500', '#8B4513'],
        celebrities: '블랙핑크 제니, 송혜교, 한가인',
        makeup: '로즈 핑크 블러셔, 베리 톤 립스틱, 라벤더 아이섀도우가 잘 어울립니다. 실버 하이라이터도 추천합니다.'
      },
      autumn: {
        name: '가을 웜톤',
        gradient: 'linear-gradient(135deg, #ea580c, #dc2626)',
        colors: ['#8B4513', '#A0522D', '#CD853F', '#DEB887', '#556B2F', '#6B8E23', '#B8860B', '#D2691E'],
        avoid: ['#FF1493', '#FF69B4', '#00BFFF', '#E6E6FA'],
        celebrities: '김태희, 한소희, 공유',
        makeup: '테라코타 블러셔, 브릭 레드 립스틱, 브론즈 아이섀도우가 잘 어울립니다. 무광 피니쉬를 추천합니다.'
      },
      winter: {
        name: '겨울 쿨톤',
        gradient: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
        colors: ['#FFFFFF', '#000000', '#FF0000', '#0000FF', '#FF00FF', '#00FFFF', '#C0C0C0', '#4169E1'],
        avoid: ['#F5DEB3', '#DEB887', '#D2B48C', '#BC8F8F'],
        celebrities: '전지현, 김연아, 송중기',
        makeup: '푸시아 핑크 블러셔, 체리 레드 립스틱, 스모키 아이가 잘 어울립니다. 강렬한 컬러가 잘 받습니다.'
      }
    };
  }

  init() {
    this.initElements({
      questionsContainer: 'questionsContainer',
      progressFill: 'progressFill',
      analyzeBtn: 'analyzeBtn',
      resultPanel: 'resultPanel',
      resultSeason: 'resultSeason',
      resultType: 'resultType',
      recommendColors: 'recommendColors',
      avoidColors: 'avoidColors',
      celebrities: 'celebrities',
      makeupTip: 'makeupTip',
      resultDetails: 'resultDetails'
    });

    this.renderQuestions();

    console.log('[SkinTone] 초기화 완료');
    return this;
  }

  renderQuestions() {
    this.elements.questionsContainer.innerHTML = this.questions.map((q, i) => `
      <div class="util-panel question-card">
        <div class="question-title">${i + 1}. ${q.title}</div>
        <div class="question-options">
          ${q.options.map(opt => `
            <div class="question-option" data-q="${q.id}" data-v="${opt.value}" onclick="skinTone.selectOption('${q.id}', '${opt.value}', this)">
              ${opt.label}
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');
  }

  selectOption(questionId, value, el) {
    this.answers[questionId] = value;

    // UI 업데이트
    document.querySelectorAll(`[data-q="${questionId}"]`).forEach(opt => {
      opt.classList.remove('selected');
    });
    el.classList.add('selected');

    // 진행률 업데이트
    const answered = Object.keys(this.answers).length;
    const total = this.questions.length;
    this.elements.progressFill.style.width = `${(answered / total) * 100}%`;

    // 분석 버튼 활성화
    this.elements.analyzeBtn.disabled = answered < total;
  }

  analyze() {
    let warmScore = 0;
    let coolScore = 0;
    let brightScore = 0;
    let mutedScore = 0;

    // 점수 계산
    if (this.answers.vein === 'green') warmScore += 2;
    else if (this.answers.vein === 'blue') coolScore += 2;

    if (this.answers.jewelry === 'gold') warmScore += 2;
    else if (this.answers.jewelry === 'silver') coolScore += 2;

    if (this.answers.white === 'ivory') warmScore += 1;
    else if (this.answers.white === 'pure') coolScore += 1;

    if (this.answers.tan === 'tan') warmScore += 1;
    else if (this.answers.tan === 'burn') coolScore += 1;

    if (this.answers.eye === 'light' || this.answers.eye === 'hazel') warmScore += 1;
    else if (this.answers.eye === 'dark') coolScore += 1;

    if (this.answers.contrast === 'high') brightScore += 2;
    else if (this.answers.contrast === 'low') mutedScore += 2;

    // 시즌 결정
    let season;
    if (warmScore > coolScore) {
      season = brightScore > mutedScore ? 'spring' : 'autumn';
    } else {
      season = brightScore > mutedScore ? 'winter' : 'summer';
    }

    this.showResult(season);
  }

  showResult(season) {
    const data = this.seasons[season];

    this.elements.resultPanel.style.background = data.gradient;
    this.elements.resultPanel.classList.add('show');

    this.elements.resultSeason.textContent = data.name;
    this.elements.resultType.textContent = season === 'spring' || season === 'autumn' ? '웜톤 (Warm Tone)' : '쿨톤 (Cool Tone)';

    // 추천 컬러
    this.elements.recommendColors.innerHTML = data.colors.map(c =>
      `<div class="palette-color" style="background: ${c};" onclick="skinTone.copyColor('${c}')"></div>`
    ).join('');

    // 피해야 할 컬러
    this.elements.avoidColors.innerHTML = data.avoid.map(c =>
      `<div class="palette-color" style="background: ${c}; opacity: 0.7;"></div>`
    ).join('');

    this.elements.celebrities.textContent = data.celebrities;
    this.elements.makeupTip.textContent = data.makeup;

    this.elements.resultDetails.style.display = 'block';
  }

  copyColor(color) {
    navigator.clipboard.writeText(color).then(() => {
      this.showToast(`${color} 복사됨`, 'success');
    });
  }

  reset() {
    this.answers = {};
    document.querySelectorAll('.question-option').forEach(opt => opt.classList.remove('selected'));
    this.elements.progressFill.style.width = '0%';
    this.elements.analyzeBtn.disabled = true;
    this.elements.resultPanel.classList.remove('show');
    this.elements.resultDetails.style.display = 'none';
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const skinTone = new SkinTone();
window.SkinTone = skinTone;

document.addEventListener('DOMContentLoaded', () => skinTone.init());
