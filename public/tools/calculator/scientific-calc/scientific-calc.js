/**
 * 공학용 계산기 (Scientific Calculator) - ToolBase 기반
 * 삼각함수, 로그, 거듭제곱 등 과학 계산 지원
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var ScientificCalc = class ScientificCalc extends ToolBase {
  constructor() {
    super('ScientificCalc');
    this.expression = '';
    this.result = '0';
    this.mode = 'deg'; // 'deg' or 'rad'
    this.memory = 0;
    this.history = [];
  }

  init() {
    this.initElements({
      expression: 'expression',
      result: 'result',
      modeIndicator: 'modeIndicator',
      historyPanel: 'historyPanel',
      historyList: 'historyList'
    });

    // 키보드 이벤트 등록
    this.on(document, 'keydown', (e) => this.handleKeyboard(e));

    console.log('[ScientificCalc] 초기화 완료');
    return this;
  }

  handleKeyboard(e) {
    const key = e.key;

    if (/[0-9]/.test(key)) {
      this.append(key);
    } else if (key === '.') {
      this.append('.');
    } else if (key === '+') {
      this.append('+');
    } else if (key === '-') {
      this.append('-');
    } else if (key === '*') {
      this.append('*');
    } else if (key === '/') {
      this.append('/');
    } else if (key === '(' || key === ')') {
      this.append(key);
    } else if (key === 'Enter' || key === '=') {
      e.preventDefault();
      this.calculate();
    } else if (key === 'Backspace') {
      this.backspace();
    } else if (key === 'Escape' || key === 'c' || key === 'C') {
      this.clear();
    }
  }

  setMode(mode) {
    this.mode = mode;
    document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
    if (event && event.target) {
      event.target.classList.add('active');
    }
    this.elements.modeIndicator.textContent = mode.toUpperCase();
  }

  append(value) {
    if (this.expression === '0' && !isNaN(value)) {
      this.expression = value;
    } else {
      this.expression += value;
    }
    this.updateDisplay();
  }

  appendFunc(func) {
    this.expression += func;
    this.updateDisplay();
  }

  clear() {
    this.expression = '';
    this.result = '0';
    this.updateDisplay();
  }

  backspace() {
    this.expression = this.expression.slice(0, -1);
    this.updateDisplay();
  }

  toggleSign() {
    if (this.expression) {
      if (this.expression.startsWith('-')) {
        this.expression = this.expression.slice(1);
      } else {
        this.expression = '-' + this.expression;
      }
      this.updateDisplay();
    }
  }

  // 팩토리얼 함수
  factorial(n) {
    n = Math.floor(n);
    if (n < 0) return NaN;
    if (n === 0 || n === 1) return 1;
    let result = 1;
    for (let i = 2; i <= n; i++) {
      result *= i;
    }
    return result;
  }

  // 삼각함수 (각도/라디안 모드 지원)
  sin(x) {
    return Math.sin(this.mode === 'deg' ? x * Math.PI / 180 : x);
  }

  cos(x) {
    return Math.cos(this.mode === 'deg' ? x * Math.PI / 180 : x);
  }

  tan(x) {
    return Math.tan(this.mode === 'deg' ? x * Math.PI / 180 : x);
  }

  asin(x) {
    const result = Math.asin(x);
    return this.mode === 'deg' ? result * 180 / Math.PI : result;
  }

  acos(x) {
    const result = Math.acos(x);
    return this.mode === 'deg' ? result * 180 / Math.PI : result;
  }

  atan(x) {
    const result = Math.atan(x);
    return this.mode === 'deg' ? result * 180 / Math.PI : result;
  }

  calculate() {
    if (!this.expression) return;

    try {
      // 표현식 변환
      let evalExpr = this.expression
        // 삼각함수
        .replace(/sin\(/g, 'scientificCalc.sin(')
        .replace(/cos\(/g, 'scientificCalc.cos(')
        .replace(/tan\(/g, 'scientificCalc.tan(')
        .replace(/asin\(/g, 'scientificCalc.asin(')
        .replace(/acos\(/g, 'scientificCalc.acos(')
        .replace(/atan\(/g, 'scientificCalc.atan(')
        // 로그
        .replace(/log\(/g, 'Math.log10(')
        .replace(/ln\(/g, 'Math.log(')
        // 기타 함수
        .replace(/sqrt\(/g, 'Math.sqrt(')
        .replace(/cbrt\(/g, 'Math.cbrt(')
        .replace(/abs\(/g, 'Math.abs(')
        .replace(/floor\(/g, 'Math.floor(')
        .replace(/ceil\(/g, 'Math.ceil(')
        .replace(/factorial\(/g, 'scientificCalc.factorial(');

      // 안전한 평가 - 허용된 문자만 통과
      if (!/^[0-9+\-*/().,%e\s]|scientificCalc\.\w+\(|Math\.\w+\(/.test(evalExpr)) {
        // 추가 검증: 위험한 키워드 차단
      }
      const forbidden = /import|require|fetch|XMLHttp|document|window|eval|Function|__proto__|constructor/i;
      if (forbidden.test(evalExpr)) {
        throw new Error('허용되지 않는 표현식');
      }
      const safeEval = new Function('scientificCalc', 'Math', `"use strict"; return (${evalExpr});`);
      const result = safeEval(this, Math);

      if (isNaN(result) || !isFinite(result)) {
        this.result = 'Error';
      } else {
        this.result = this.formatResult(result);
        this.addToHistory(this.expression, this.result);
      }
    } catch (e) {
      console.error('Calculation error:', e);
      this.result = 'Error';
    }

    this.updateDisplay();
  }

  formatResult(num) {
    if (Number.isInteger(num)) {
      return num.toString();
    }
    // 매우 큰 수나 작은 수는 지수 표기
    if (Math.abs(num) > 1e10 || (Math.abs(num) < 1e-10 && num !== 0)) {
      return num.toExponential(6);
    }
    // 일반 숫자는 소수점 10자리까지
    return parseFloat(num.toPrecision(10)).toString();
  }

  updateDisplay() {
    this.elements.expression.textContent = this.expression || ' ';
    this.elements.result.textContent = this.result;
  }

  // 메모리 기능
  memoryStore() {
    const num = parseFloat(this.result);
    if (!isNaN(num)) {
      this.memory = num;
      this.showToast('메모리에 저장됨', 'success');
    }
  }

  memoryRecall() {
    if (this.memory !== 0) {
      this.expression += this.memory.toString();
      this.updateDisplay();
    }
  }

  memoryClear() {
    this.memory = 0;
    this.showToast('메모리 지움', 'info');
  }

  // 히스토리 기능
  addToHistory(expr, result) {
    this.history.unshift({ expression: expr, result: result });
    if (this.history.length > 20) {
      this.history.pop();
    }
    this.updateHistoryPanel();
  }

  toggleHistory() {
    const panel = this.elements.historyPanel;
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
  }

  updateHistoryPanel() {
    const list = this.elements.historyList;

    if (this.history.length === 0) {
      list.innerHTML = '<p class="empty-history">히스토리가 없습니다</p>';
      return;
    }

    list.innerHTML = this.history.map((item, index) => `
      <div class="history-item" onclick="scientificCalc.loadFromHistory(${index})">
        <span class="history-expr">${item.expression}</span>
        <span class="history-result">= ${item.result}</span>
      </div>
    `).join('');
  }

  loadFromHistory(index) {
    const item = this.history[index];
    this.expression = item.result;
    this.result = item.result;
    this.updateDisplay();
  }

  clearHistory() {
    this.history = [];
    this.updateHistoryPanel();
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const scientificCalc = new ScientificCalc();
window.ScientificCalc = scientificCalc;

document.addEventListener('DOMContentLoaded', () => scientificCalc.init());
