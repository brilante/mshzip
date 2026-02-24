/**
 * 공식 시트 - ToolBase 기반
 * 수학/과학 공식 모음
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class FormulaSheet extends ToolBase {
  constructor() {
    super('FormulaSheet');
    this.currentCategory = 'all';
    this.searchQuery = '';

    this.formulas = [
      // Math
      { name: '이차방정식의 근의 공식', formula: '$$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$', desc: 'ax² + bx + c = 0의 해', category: 'math' },
      { name: '피타고라스 정리', formula: '$$a^2 + b^2 = c^2$$', desc: '직각삼각형에서 빗변의 제곱은 다른 두 변의 제곱의 합', category: 'math' },
      { name: '로그의 성질', formula: '$$\\log_a(xy) = \\log_a x + \\log_a y$$', desc: '로그의 곱셈 법칙', category: 'math' },
      { name: '미분 공식 (다항함수)', formula: '$$\\frac{d}{dx}x^n = nx^{n-1}$$', desc: 'x^n의 도함수', category: 'math' },
      { name: '적분 공식 (다항함수)', formula: '$$\\int x^n dx = \\frac{x^{n+1}}{n+1} + C$$', desc: 'n ≠ -1일 때', category: 'math' },
      { name: '등차수열의 합', formula: '$$S_n = \\frac{n(a_1 + a_n)}{2}$$', desc: '첫째항 a₁, 끝항 aₙ, 항의 개수 n', category: 'math' },
      { name: '등비수열의 합', formula: '$$S_n = \\frac{a_1(1-r^n)}{1-r}$$', desc: '공비 r ≠ 1일 때', category: 'math' },

      // Physics
      { name: '뉴턴의 제2법칙', formula: '$$F = ma$$', desc: '힘 = 질량 × 가속도', category: 'physics' },
      { name: '운동에너지', formula: '$$E_k = \\frac{1}{2}mv^2$$', desc: '물체의 운동에 의한 에너지', category: 'physics' },
      { name: '위치에너지', formula: '$$E_p = mgh$$', desc: '중력에 의한 위치에너지', category: 'physics' },
      { name: '속도 공식', formula: '$$v = v_0 + at$$', desc: '등가속도 운동에서의 속도', category: 'physics' },
      { name: '변위 공식', formula: '$$s = v_0t + \\frac{1}{2}at^2$$', desc: '등가속도 운동에서의 변위', category: 'physics' },
      { name: '만유인력 법칙', formula: '$$F = G\\frac{m_1m_2}{r^2}$$', desc: '두 물체 사이의 중력', category: 'physics' },
      { name: '옴의 법칙', formula: '$$V = IR$$', desc: '전압 = 전류 × 저항', category: 'physics' },
      { name: '쿨롱의 법칙', formula: '$$F = k\\frac{q_1q_2}{r^2}$$', desc: '두 전하 사이의 전기력', category: 'physics' },

      // Chemistry
      { name: '이상기체 방정식', formula: '$$PV = nRT$$', desc: 'P: 압력, V: 부피, n: 몰 수, R: 기체상수, T: 온도', category: 'chemistry' },
      { name: '아보가드로 수', formula: '$$N_A = 6.022 \\times 10^{23}$$', desc: '1몰에 포함된 입자 수', category: 'chemistry' },
      { name: '농도 (몰농도)', formula: '$$M = \\frac{n}{V}$$', desc: '용액 1L당 용질의 몰 수', category: 'chemistry' },
      { name: 'pH 정의', formula: '$$pH = -\\log[H^+]$$', desc: '수소 이온 농도의 음의 로그', category: 'chemistry' },
      { name: '반응속도 상수', formula: '$$k = Ae^{-E_a/RT}$$', desc: '아레니우스 방정식', category: 'chemistry' },

      // Geometry
      { name: '원의 넓이', formula: '$$A = \\pi r^2$$', desc: '반지름이 r인 원의 넓이', category: 'geometry' },
      { name: '원의 둘레', formula: '$$C = 2\\pi r$$', desc: '반지름이 r인 원의 둘레', category: 'geometry' },
      { name: '구의 부피', formula: '$$V = \\frac{4}{3}\\pi r^3$$', desc: '반지름이 r인 구의 부피', category: 'geometry' },
      { name: '구의 겉넓이', formula: '$$S = 4\\pi r^2$$', desc: '반지름이 r인 구의 겉넓이', category: 'geometry' },
      { name: '삼각형의 넓이', formula: '$$A = \\frac{1}{2}bh$$', desc: '밑변 b, 높이 h인 삼각형', category: 'geometry' },
      { name: '사인 법칙', formula: '$$\\frac{a}{\\sin A} = \\frac{b}{\\sin B} = \\frac{c}{\\sin C}$$', desc: '삼각형의 변과 각의 관계', category: 'geometry' },
      { name: '코사인 법칙', formula: '$$c^2 = a^2 + b^2 - 2ab\\cos C$$', desc: '삼각형의 세 변과 한 각의 관계', category: 'geometry' }
    ];
  }

  init() {
    this.initElements({
      formulaGrid: 'formulaGrid',
      searchFormula: 'searchFormula'
    });

    this.setupEvents();
    this.renderFormulas();

    console.log('[FormulaSheet] 초기화 완료');
    return this;
  }

  setupEvents() {
    document.querySelectorAll('.cat-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.cat-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.currentCategory = tab.dataset.category;
        this.renderFormulas();
      });
    });

    this.elements.searchFormula.addEventListener('input', (e) => {
      this.searchQuery = e.target.value;
      this.renderFormulas();
    });
  }

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  getCategoryName(cat) {
    const names = { math: '수학', physics: '물리', chemistry: '화학', geometry: '기하' };
    return names[cat] || cat;
  }

  renderFormulas() {
    const filtered = this.formulas.filter(f => {
      const matchCategory = this.currentCategory === 'all' || f.category === this.currentCategory;
      const matchSearch = f.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                        f.desc.toLowerCase().includes(this.searchQuery.toLowerCase());
      return matchCategory && matchSearch;
    });

    this.elements.formulaGrid.innerHTML = filtered.map(f => `
      <div class="formula-card">
        <h3>${this.escapeHtml(f.name)}</h3>
        <div class="formula">${f.formula}</div>
        <div class="description">${this.escapeHtml(f.desc)}</div>
        <span class="category-tag">${this.getCategoryName(f.category)}</span>
      </div>
    `).join('');

    if (typeof MathJax !== 'undefined') {
      MathJax.typesetPromise();
    }
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const formulaSheet = new FormulaSheet();
window.FormulaSheet = formulaSheet;

document.addEventListener('DOMContentLoaded', () => formulaSheet.init());
