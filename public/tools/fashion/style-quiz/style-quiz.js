/**
 * 스타일 퀴즈 - ToolBase 기반
 * 나의 패션 스타일 찾기
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var StyleQuiz = class StyleQuiz extends ToolBase {
  constructor() {
    super('StyleQuiz');
    this.currentQuestion = 0;
    this.answers = [];

    this.questions = [
      {
        text: '주말에 선호하는 활동은?',
        options: [
          { icon: '', label: '집에서 편하게', desc: '넷플릭스, 독서, 휴식', style: 'casual' },
          { icon: '', label: '문화 활동', desc: '전시회, 공연, 카페 투어', style: 'classic' },
          { icon: '', label: '액티비티', desc: '운동, 야외 활동, 여행', style: 'sporty' },
          { icon: '', label: '파티/모임', desc: '친구 만남, 네트워킹', style: 'trendy' }
        ]
      },
      {
        text: '옷장에 가장 많은 색상은?',
        options: [
          { icon: '', label: '블랙 & 네이비', desc: '무난하고 세련된', style: 'minimal' },
          { icon: '', label: '베이지 & 브라운', desc: '자연스럽고 따뜻한', style: 'classic' },
          { icon: '', label: '다양한 컬러', desc: '밝고 생동감 있는', style: 'trendy' },
          { icon: '', label: '화이트 & 그레이', desc: '깔끔하고 모던한', style: 'minimal' }
        ]
      },
      {
        text: '쇼핑할 때 가장 중요하게 보는 것은?',
        options: [
          { icon: '', label: '품질과 소재', desc: '오래 입을 수 있는 좋은 옷', style: 'classic' },
          { icon: '', label: '트렌드', desc: '요즘 유행하는 스타일', style: 'trendy' },
          { icon: '', label: '가성비', desc: '합리적인 가격', style: 'casual' },
          { icon: '', label: '실용성', desc: '활동하기 편한 옷', style: 'sporty' }
        ]
      },
      {
        text: '선호하는 악세사리 스타일은?',
        options: [
          { icon: '', label: '심플한 주얼리', desc: '작고 섬세한 디자인', style: 'minimal' },
          { icon: '', label: '클래식 아이템', desc: '시간이 지나도 변치 않는', style: 'classic' },
          { icon: '', label: '스포티 아이템', desc: '모자, 스니커즈, 백팩', style: 'sporty' },
          { icon: '', label: '트렌디 아이템', desc: '과감하고 눈에 띄는', style: 'trendy' }
        ]
      },
      {
        text: '가장 좋아하는 상의 스타일은?',
        options: [
          { icon: '', label: '티셔츠 & 맨투맨', desc: '캐주얼하고 편안한', style: 'casual' },
          { icon: '', label: '셔츠 & 블라우스', desc: '단정하고 깔끔한', style: 'classic' },
          { icon: '', label: '후드티 & 집업', desc: '활동적이고 편안한', style: 'sporty' },
          { icon: '', label: '크롭탑 & 오버사이즈', desc: '개성있고 트렌디한', style: 'trendy' }
        ]
      },
      {
        text: '중요한 약속에 입을 옷을 고른다면?',
        options: [
          { icon: '', label: '깔끔한 셋업', desc: '블레이저 + 슬랙스', style: 'classic' },
          { icon: '', label: '심플한 원피스', desc: '단정하지만 세련된', style: 'minimal' },
          { icon: '', label: '스타일리시 캐주얼', desc: '데님 + 니트', style: 'casual' },
          { icon: '', label: '트렌디 룩', desc: '화제의 아이템 포인트', style: 'trendy' }
        ]
      }
    ];

    this.styles = {
      classic: {
        name: '클래식 스타일',
        gradient: 'linear-gradient(135deg, #1e3a5f, #0c4a6e)',
        desc: '시대를 초월하는 우아함과 품격을 추구합니다',
        traits: [
          { icon: '', text: '단정하고 세련된 핏을 선호' },
          { icon: '', text: '베이지, 네이비, 화이트 등 뉴트럴 컬러' },
          { icon: '', text: '품질 좋은 소재와 디테일 중시' }
        ],
        brands: ['마시모두띠', '랄프로렌', '자라', 'COS', '마르디 메크르디'],
        tip: '기본 아이템에 투자하고, 액세서리로 포인트를 주세요. 과하지 않은 우아함이 키포인트입니다.'
      },
      minimal: {
        name: '미니멀 스타일',
        gradient: 'linear-gradient(135deg, #374151, #1f2937)',
        desc: '단순함 속에서 완벽한 균형을 찾습니다',
        traits: [
          { icon: '', text: '블랙, 화이트, 그레이 베이스' },
          { icon: '', text: '깔끔한 실루엣과 라인' },
          { icon: '', text: '장식 없는 심플한 디자인' }
        ],
        brands: ['COS', '유니클로', '무인양품', '노앙', '드파운드'],
        tip: '컬러는 모노톤으로 통일하고, 소재와 핏으로 차별화하세요. 하나의 포인트 아이템이면 충분합니다.'
      },
      casual: {
        name: '캐주얼 스타일',
        gradient: 'linear-gradient(135deg, #059669, #047857)',
        desc: '편안함과 자연스러움을 최우선으로 생각합니다',
        traits: [
          { icon: '', text: '편안한 티셔츠와 데님' },
          { icon: '', text: '실용적인 아이템 선호' },
          { icon: '', text: '꾸미지 않은 자연스러운 매력' }
        ],
        brands: ['갭', '유니클로', 'H&M', '에잇세컨즈', '스파오'],
        tip: '기본 아이템을 잘 활용하세요. 깔끔한 스니커즈와 잘 맞는 데님이 핵심입니다.'
      },
      sporty: {
        name: '스포티 스타일',
        gradient: 'linear-gradient(135deg, #dc2626, #b91c1c)',
        desc: '활동적이고 에너지 넘치는 스타일을 추구합니다',
        traits: [
          { icon: '', text: '기능성과 편안함 중시' },
          { icon: '', text: '스니커즈와 스포츠웨어' },
          { icon: '', text: '건강하고 활기찬 이미지' }
        ],
        brands: ['나이키', '아디다스', '뉴발란스', 'MLB', '휠라'],
        tip: '스포츠 브랜드를 일상복으로 믹스하세요. 오버사이즈 후드티와 조거팬츠 조합이 정석입니다.'
      },
      trendy: {
        name: '트렌디 스타일',
        gradient: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
        desc: '최신 트렌드를 빠르게 캐치하고 소화합니다',
        traits: [
          { icon: '', text: '시즌 핫 아이템 적극 활용' },
          { icon: '', text: 'SNS 인플루언서 스타일' },
          { icon: '', text: '과감한 컬러와 프린트' }
        ],
        brands: ['자라', '망고', '에이치앤엠', '앤아더스토리즈', '톱샵'],
        tip: '트렌드 아이템은 저가로, 기본템은 투자하세요. 유행이 지나도 활용할 수 있는지 생각해보세요.'
      }
    };
  }

  init() {
    this.initElements({
      quizProgress: 'quizProgress',
      questionNum: 'questionNum',
      questionText: 'questionText',
      answerOptions: 'answerOptions',
      quizSection: 'quizSection',
      resultPanel: 'resultPanel',
      resultHeader: 'resultHeader',
      resultStyle: 'resultStyle',
      resultDesc: 'resultDesc',
      styleTraits: 'styleTraits',
      brandList: 'brandList',
      styleTip: 'styleTip'
    });

    this.renderQuestion();

    console.log('[StyleQuiz] 초기화 완료');
    return this;
  }

  renderProgress() {
    this.elements.quizProgress.innerHTML = this.questions.map((_, i) => {
      let cls = 'quiz-step';
      if (i < this.currentQuestion) cls += ' done';
      else if (i === this.currentQuestion) cls += ' current';
      return `<div class="${cls}"></div>`;
    }).join('');
  }

  renderQuestion() {
    this.renderProgress();

    const q = this.questions[this.currentQuestion];
    this.elements.questionNum.textContent = `Q${this.currentQuestion + 1} / ${this.questions.length}`;
    this.elements.questionText.textContent = q.text;

    this.elements.answerOptions.innerHTML = q.options.map((opt, i) => `
      <div class="answer-option" onclick="styleQuiz.selectAnswer(${i})">
        <div class="answer-icon">${opt.icon}</div>
        <div class="answer-text">
          <div class="answer-label">${opt.label}</div>
          <div class="answer-desc">${opt.desc}</div>
        </div>
      </div>
    `).join('');
  }

  selectAnswer(index) {
    const q = this.questions[this.currentQuestion];
    this.answers.push(q.options[index].style);

    if (this.currentQuestion < this.questions.length - 1) {
      this.currentQuestion++;
      this.renderQuestion();
    } else {
      this.showResult();
    }
  }

  showResult() {
    // 가장 많이 나온 스타일 계산
    const counts = {};
    this.answers.forEach(s => counts[s] = (counts[s] || 0) + 1);
    const topStyle = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];

    const data = this.styles[topStyle];

    this.elements.quizSection.style.display = 'none';
    this.elements.resultPanel.classList.add('show');

    this.elements.resultHeader.style.background = data.gradient;
    this.elements.resultStyle.textContent = data.name;
    this.elements.resultDesc.textContent = data.desc;

    this.elements.styleTraits.innerHTML = data.traits.map(t =>
      `<div class="style-trait"><div class="trait-icon">${t.icon}</div><div class="trait-text">${t.text}</div></div>`
    ).join('');

    this.elements.brandList.innerHTML = data.brands.map(b =>
      `<span class="brand-tag">${b}</span>`
    ).join('');

    this.elements.styleTip.textContent = data.tip;
  }

  restart() {
    this.currentQuestion = 0;
    this.answers = [];
    this.elements.quizSection.style.display = 'block';
    this.elements.resultPanel.classList.remove('show');
    this.renderQuestion();
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const styleQuiz = new StyleQuiz();
window.StyleQuiz = styleQuiz;

document.addEventListener('DOMContentLoaded', () => styleQuiz.init());
