/**
 * 엑셀 함수 도우미 - ToolBase 기반
 * 엑셀 함수 검색 및 사용법 안내
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var ExcelFormula = class ExcelFormula extends ToolBase {
  constructor() {
    super('ExcelFormula');
    this.currentCategory = 'all';
    this.currentFormula = null;
    this.popularFormulas = ['SUM', 'VLOOKUP', 'IF', 'COUNTIF', 'AVERAGE', 'INDEX', 'MATCH', 'LEFT'];
    this.formulas = this.initFormulas();
  }

  initFormulas() {
    return [
      // 수학/통계 함수
      { name: 'SUM', category: 'math', categoryName: '수학/통계', description: '숫자의 합계를 구합니다.', syntax: 'SUM(number1, [number2], ...)', args: [{ name: 'number1', desc: '합계를 구할 첫 번째 숫자 또는 범위', required: true }, { name: 'number2', desc: '추가로 합계를 구할 숫자 또는 범위 (최대 255개)', required: false }], examples: [{ formula: '=SUM(A1:A10)', result: 'A1부터 A10까지의 합계' }, { formula: '=SUM(1, 2, 3)', result: '결과: 6' }], related: ['SUMIF', 'SUMIFS', 'AVERAGE'], keywords: ['합계', '더하기', '총합'] },
      { name: 'AVERAGE', category: 'math', categoryName: '수학/통계', description: '숫자의 평균을 구합니다.', syntax: 'AVERAGE(number1, [number2], ...)', args: [{ name: 'number1', desc: '평균을 구할 첫 번째 숫자 또는 범위', required: true }], examples: [{ formula: '=AVERAGE(A1:A10)', result: 'A1부터 A10까지의 평균' }], related: ['AVERAGEIF', 'AVERAGEIFS', 'MEDIAN'], keywords: ['평균', '평균값'] },
      { name: 'COUNT', category: 'math', categoryName: '수학/통계', description: '숫자가 포함된 셀의 개수를 셉니다.', syntax: 'COUNT(value1, [value2], ...)', args: [{ name: 'value1', desc: '개수를 셀 첫 번째 값 또는 범위', required: true }], examples: [{ formula: '=COUNT(A1:A10)', result: 'A1:A10에서 숫자가 있는 셀의 개수' }], related: ['COUNTA', 'COUNTIF', 'COUNTBLANK'], keywords: ['개수', '카운트', '세기'] },
      { name: 'COUNTIF', category: 'math', categoryName: '수학/통계', description: '조건에 맞는 셀의 개수를 셉니다.', syntax: 'COUNTIF(range, criteria)', args: [{ name: 'range', desc: '개수를 셀 범위', required: true }, { name: 'criteria', desc: '개수를 셀 조건', required: true }], examples: [{ formula: '=COUNTIF(A1:A10, ">5")', result: '5보다 큰 값의 개수' }], related: ['COUNTIFS', 'COUNT', 'SUMIF'], keywords: ['조건부 개수', '조건 카운트'] },
      { name: 'SUMIF', category: 'math', categoryName: '수학/통계', description: '조건에 맞는 셀의 합계를 구합니다.', syntax: 'SUMIF(range, criteria, [sum_range])', args: [{ name: 'range', desc: '조건을 적용할 범위', required: true }, { name: 'criteria', desc: '합계를 구할 조건', required: true }], examples: [{ formula: '=SUMIF(A1:A10, ">100")', result: '100보다 큰 값의 합계' }], related: ['SUMIFS', 'SUM', 'COUNTIF'], keywords: ['조건부 합계', '조건 합'] },
      { name: 'MAX', category: 'math', categoryName: '수학/통계', description: '최대값을 구합니다.', syntax: 'MAX(number1, [number2], ...)', args: [{ name: 'number1', desc: '최대값을 구할 첫 번째 숫자 또는 범위', required: true }], examples: [{ formula: '=MAX(A1:A10)', result: 'A1:A10 중 최대값' }], related: ['MIN', 'LARGE', 'MAXIFS'], keywords: ['최대', '최댓값', '가장 큰'] },
      { name: 'MIN', category: 'math', categoryName: '수학/통계', description: '최소값을 구합니다.', syntax: 'MIN(number1, [number2], ...)', args: [{ name: 'number1', desc: '최소값을 구할 첫 번째 숫자 또는 범위', required: true }], examples: [{ formula: '=MIN(A1:A10)', result: 'A1:A10 중 최소값' }], related: ['MAX', 'SMALL', 'MINIFS'], keywords: ['최소', '최솟값', '가장 작은'] },
      { name: 'ROUND', category: 'math', categoryName: '수학/통계', description: '숫자를 지정한 자릿수로 반올림합니다.', syntax: 'ROUND(number, num_digits)', args: [{ name: 'number', desc: '반올림할 숫자', required: true }, { name: 'num_digits', desc: '반올림할 자릿수', required: true }], examples: [{ formula: '=ROUND(3.14159, 2)', result: '결과: 3.14' }], related: ['ROUNDUP', 'ROUNDDOWN', 'TRUNC'], keywords: ['반올림', '자릿수'] },
      // 텍스트 함수
      { name: 'CONCATENATE', category: 'text', categoryName: '텍스트', description: '여러 텍스트를 하나로 연결합니다.', syntax: 'CONCATENATE(text1, [text2], ...)', args: [{ name: 'text1', desc: '연결할 첫 번째 텍스트', required: true }], examples: [{ formula: '=CONCATENATE("Hello", " ", "World")', result: '결과: "Hello World"' }], related: ['CONCAT', 'TEXTJOIN'], keywords: ['연결', '합치기', '붙이기'] },
      { name: 'LEFT', category: 'text', categoryName: '텍스트', description: '텍스트의 왼쪽에서 지정한 수만큼 문자를 추출합니다.', syntax: 'LEFT(text, [num_chars])', args: [{ name: 'text', desc: '추출할 텍스트', required: true }], examples: [{ formula: '=LEFT("Hello", 2)', result: '결과: "He"' }], related: ['RIGHT', 'MID', 'LEN'], keywords: ['왼쪽', '추출', '문자'] },
      { name: 'RIGHT', category: 'text', categoryName: '텍스트', description: '텍스트의 오른쪽에서 지정한 수만큼 문자를 추출합니다.', syntax: 'RIGHT(text, [num_chars])', args: [{ name: 'text', desc: '추출할 텍스트', required: true }], examples: [{ formula: '=RIGHT("Hello", 2)', result: '결과: "lo"' }], related: ['LEFT', 'MID', 'LEN'], keywords: ['오른쪽', '추출', '문자'] },
      { name: 'MID', category: 'text', categoryName: '텍스트', description: '텍스트의 중간에서 지정한 위치부터 문자를 추출합니다.', syntax: 'MID(text, start_num, num_chars)', args: [{ name: 'text', desc: '추출할 텍스트', required: true }, { name: 'start_num', desc: '시작 위치', required: true }, { name: 'num_chars', desc: '추출할 문자 수', required: true }], examples: [{ formula: '=MID("Hello World", 7, 5)', result: '결과: "World"' }], related: ['LEFT', 'RIGHT', 'LEN'], keywords: ['중간', '추출', '문자'] },
      { name: 'LEN', category: 'text', categoryName: '텍스트', description: '텍스트의 문자 수를 반환합니다.', syntax: 'LEN(text)', args: [{ name: 'text', desc: '길이를 구할 텍스트', required: true }], examples: [{ formula: '=LEN("Hello")', result: '결과: 5' }], related: ['LEFT', 'RIGHT', 'MID'], keywords: ['길이', '문자 수'] },
      { name: 'TRIM', category: 'text', categoryName: '텍스트', description: '텍스트에서 불필요한 공백을 제거합니다.', syntax: 'TRIM(text)', args: [{ name: 'text', desc: '공백을 제거할 텍스트', required: true }], examples: [{ formula: '=TRIM("  Hello  World  ")', result: '결과: "Hello World"' }], related: ['CLEAN', 'SUBSTITUTE'], keywords: ['공백 제거', '트림'] },
      // 날짜/시간 함수
      { name: 'TODAY', category: 'date', categoryName: '날짜/시간', description: '오늘 날짜를 반환합니다.', syntax: 'TODAY()', args: [], examples: [{ formula: '=TODAY()', result: '오늘 날짜 반환' }], related: ['NOW', 'DATE', 'YEAR'], keywords: ['오늘', '현재 날짜'] },
      { name: 'NOW', category: 'date', categoryName: '날짜/시간', description: '현재 날짜와 시간을 반환합니다.', syntax: 'NOW()', args: [], examples: [{ formula: '=NOW()', result: '현재 날짜와 시간 반환' }], related: ['TODAY', 'DATE', 'TIME'], keywords: ['현재', '지금', '시간'] },
      { name: 'DATE', category: 'date', categoryName: '날짜/시간', description: '년, 월, 일을 조합하여 날짜를 만듭니다.', syntax: 'DATE(year, month, day)', args: [{ name: 'year', desc: '연도', required: true }, { name: 'month', desc: '월', required: true }, { name: 'day', desc: '일', required: true }], examples: [{ formula: '=DATE(2024, 12, 25)', result: '2024년 12월 25일' }], related: ['YEAR', 'MONTH', 'DAY'], keywords: ['날짜 만들기'] },
      // 찾기/참조 함수
      { name: 'VLOOKUP', category: 'lookup', categoryName: '찾기/참조', description: '테이블의 첫 번째 열에서 값을 찾고 같은 행의 다른 열 값을 반환합니다.', syntax: 'VLOOKUP(lookup_value, table_array, col_index_num, [range_lookup])', args: [{ name: 'lookup_value', desc: '찾을 값', required: true }, { name: 'table_array', desc: '검색할 테이블 범위', required: true }, { name: 'col_index_num', desc: '반환할 열 번호', required: true }], examples: [{ formula: '=VLOOKUP("사과", A1:C10, 3, FALSE)', result: '"사과" 행의 3번째 열 값' }], related: ['HLOOKUP', 'INDEX', 'MATCH', 'XLOOKUP'], keywords: ['찾기', '검색', '참조', '브이룩업'] },
      { name: 'INDEX', category: 'lookup', categoryName: '찾기/참조', description: '범위에서 특정 행과 열의 값을 반환합니다.', syntax: 'INDEX(array, row_num, [column_num])', args: [{ name: 'array', desc: '셀 범위', required: true }, { name: 'row_num', desc: '행 번호', required: true }], examples: [{ formula: '=INDEX(A1:C10, 5, 2)', result: '5행 2열의 값' }], related: ['MATCH', 'VLOOKUP', 'INDIRECT'], keywords: ['인덱스', '위치', '참조'] },
      { name: 'MATCH', category: 'lookup', categoryName: '찾기/참조', description: '범위에서 값의 상대적 위치를 반환합니다.', syntax: 'MATCH(lookup_value, lookup_array, [match_type])', args: [{ name: 'lookup_value', desc: '찾을 값', required: true }, { name: 'lookup_array', desc: '검색할 범위', required: true }], examples: [{ formula: '=MATCH("사과", A1:A10, 0)', result: '"사과"의 위치 반환' }], related: ['INDEX', 'VLOOKUP', 'SEARCH'], keywords: ['매치', '위치 찾기'] },
      // 논리 함수
      { name: 'IF', category: 'logical', categoryName: '논리', description: '조건에 따라 다른 값을 반환합니다.', syntax: 'IF(logical_test, value_if_true, [value_if_false])', args: [{ name: 'logical_test', desc: '평가할 조건', required: true }, { name: 'value_if_true', desc: '조건이 참일 때 반환할 값', required: true }], examples: [{ formula: '=IF(A1>10, "크다", "작다")', result: 'A1이 10보다 크면 "크다"' }], related: ['IFS', 'IFERROR', 'AND', 'OR'], keywords: ['조건', '만약', '분기'] },
      { name: 'AND', category: 'logical', categoryName: '논리', description: '모든 조건이 참인지 확인합니다.', syntax: 'AND(logical1, [logical2], ...)', args: [{ name: 'logical1', desc: '첫 번째 조건', required: true }], examples: [{ formula: '=AND(A1>0, A1<100)', result: 'A1이 0보다 크고 100보다 작으면 TRUE' }], related: ['OR', 'NOT', 'IF'], keywords: ['그리고', '모두', '논리곱'] },
      { name: 'OR', category: 'logical', categoryName: '논리', description: '하나 이상의 조건이 참인지 확인합니다.', syntax: 'OR(logical1, [logical2], ...)', args: [{ name: 'logical1', desc: '첫 번째 조건', required: true }], examples: [{ formula: '=OR(A1="사과", A1="배")', result: 'A1이 사과 또는 배면 TRUE' }], related: ['AND', 'NOT', 'IF'], keywords: ['또는', '하나라도', '논리합'] },
      { name: 'IFERROR', category: 'logical', categoryName: '논리', description: '수식에서 오류가 발생하면 지정한 값을 반환합니다.', syntax: 'IFERROR(value, value_if_error)', args: [{ name: 'value', desc: '오류를 확인할 수식', required: true }, { name: 'value_if_error', desc: '오류 시 반환할 값', required: true }], examples: [{ formula: '=IFERROR(A1/B1, 0)', result: '나눗셈 오류 시 0 반환' }], related: ['IF', 'ISERROR', 'IFNA'], keywords: ['오류 처리', '에러'] }
    ];
  }

  init() {
    this.initElements({
      searchInput: 'searchInput',
      popularFunctions: 'popularFunctions',
      functionList: 'functionList',
      resultsSection: 'resultsSection',
      resultCount: 'resultCount',
      formulaModal: 'formulaModal',
      modalTitle: 'modalTitle',
      modalBody: 'modalBody'
    });

    this.renderPopular();
    this.bindEvents();

    console.log('[ExcelFormula] 초기화 완료');
    return this;
  }

  bindEvents() {
    this.elements.searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.search();
      }
    });

    this.elements.searchInput.addEventListener('input', (e) => {
      if (e.target.value === '') {
        this.elements.resultsSection.style.display = 'none';
      }
    });

    this.elements.formulaModal.addEventListener('click', (e) => {
      if (e.target.id === 'formulaModal') {
        this.closeModal();
      }
    });
  }

  renderPopular() {
    this.elements.popularFunctions.innerHTML = this.popularFormulas.map(name => {
      const formula = this.formulas.find(f => f.name === name);
      if (!formula) return '';
      return `
        <div class="popular-item" onclick="excelFormula.showDetail('${formula.name}')">
          <div class="popular-name">${formula.name}</div>
          <div class="popular-desc">${formula.description}</div>
        </div>
      `;
    }).join('');
  }

  search() {
    const query = this.elements.searchInput.value.trim().toLowerCase();
    if (!query) return;

    let results = this.formulas.filter(f => {
      const matchName = f.name.toLowerCase().includes(query);
      const matchDesc = f.description.toLowerCase().includes(query);
      const matchKeywords = f.keywords.some(k => k.toLowerCase().includes(query));
      const matchCategory = this.currentCategory === 'all' || f.category === this.currentCategory;

      return matchCategory && (matchName || matchDesc || matchKeywords);
    });

    this.renderResults(results);
  }

  filterCategory(category) {
    this.currentCategory = category;

    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.category === category);
    });

    const query = this.elements.searchInput.value.trim();
    if (query) {
      this.search();
    } else {
      let results = this.formulas.filter(f =>
        category === 'all' || f.category === category
      );
      this.renderResults(results);
    }
  }

  renderResults(results) {
    this.elements.resultCount.textContent = results.length;

    if (results.length === 0) {
      this.elements.functionList.innerHTML = '<div class="no-results">검색 결과가 없습니다.</div>';
    } else {
      this.elements.functionList.innerHTML = results.map(f => `
        <div class="function-item" onclick="excelFormula.showDetail('${f.name}')">
          <span class="function-name">${f.name}</span>
          <span class="function-syntax">${f.syntax}</span>
          <span class="function-category">${f.categoryName}</span>
        </div>
      `).join('');
    }

    this.elements.resultsSection.style.display = 'block';
  }

  showDetail(name) {
    const formula = this.formulas.find(f => f.name === name);
    if (!formula) return;

    this.currentFormula = formula;
    this.elements.modalTitle.textContent = formula.name;

    const argsHtml = formula.args.length > 0
      ? formula.args.map(arg => `
          <li>
            <span class="arg-name">${arg.name}</span>
            ${arg.required ? '<span class="arg-required">필수</span>' : '<span class="arg-optional">선택</span>'}
            <div style="margin-top: 4px; color: var(--tools-text-secondary);">${arg.desc}</div>
          </li>
        `).join('')
      : '<li>인수 없음</li>';

    const examplesHtml = formula.examples.map(ex => `
      <div class="example-item">
        <div class="example-formula">${this.escapeHtml(ex.formula)}</div>
        <div class="example-result">→ ${ex.result}</div>
      </div>
    `).join('');

    const relatedHtml = formula.related.map(r => `
      <span class="related-tag" onclick="excelFormula.showDetail('${r}')">${r}</span>
    `).join('');

    this.elements.modalBody.innerHTML = `
      <div class="formula-detail">
        <div class="formula-section">
          <div class="formula-section-title">설명</div>
          <div class="formula-description">${formula.description}</div>
        </div>
        <div class="formula-section">
          <div class="formula-section-title">구문</div>
          <div class="formula-syntax-box">${formula.syntax}</div>
        </div>
        <div class="formula-section">
          <div class="formula-section-title">인수</div>
          <ul class="formula-args">${argsHtml}</ul>
        </div>
        <div class="formula-section">
          <div class="formula-section-title">예제</div>
          <div class="example-list">${examplesHtml}</div>
        </div>
        <div class="formula-section">
          <div class="formula-section-title">관련 함수</div>
          <div class="related-functions">${relatedHtml}</div>
        </div>
      </div>
    `;

    this.elements.formulaModal.style.display = 'flex';
  }

  closeModal() {
    this.elements.formulaModal.style.display = 'none';
  }

  copyFormula() {
    if (!this.currentFormula) return;
    this.copyToClipboard(this.currentFormula.syntax);
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}

// 전역 인스턴스 생성
const excelFormula = new ExcelFormula();
window.ExcelFormula = excelFormula;

// 전역 함수 (HTML onclick 호환)
function search() { excelFormula.search(); }
function filterCategory(category) { excelFormula.filterCategory(category); }
function closeModal() { excelFormula.closeModal(); }
function copyFormula() { excelFormula.copyFormula(); }

document.addEventListener('DOMContentLoaded', () => excelFormula.init());
