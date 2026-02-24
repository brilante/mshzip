/**
 * 더치페이 계산기 - ToolBase 기반
 * N분의 1 정산 계산
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var SplitBill = class SplitBill extends ToolBase {
  constructor() {
    super('SplitBill');
    this.people = [];
  }

  init() {
    this.initElements({
      personName: 'personName',
      peopleGrid: 'peopleGrid',
      totalAmount: 'totalAmount',
      peopleCount: 'peopleCount',
      resultPanel: 'resultPanel',
      resultTotal: 'resultTotal',
      resultPeople: 'resultPeople',
      resultAmount: 'resultAmount',
      resultNote: 'resultNote'
    });

    this.load();
    this.renderPeople();
    this.calculate();

    console.log('[SplitBill] 초기화 완료');
    return this;
  }

  load() {
    try {
      const saved = localStorage.getItem('split-bill-people');
      if (saved) {
        this.people = JSON.parse(saved);
      }
    } catch (e) {}
  }

  save() {
    localStorage.setItem('split-bill-people', JSON.stringify(this.people));
  }

  addPerson() {
    const input = this.elements.personName;
    const name = input.value.trim();

    if (!name) return;

    if (this.people.includes(name)) {
      this.showToast('이미 추가된 이름입니다', 'error');
      return;
    }

    this.people.push(name);
    this.save();
    this.renderPeople();

    this.elements.peopleCount.value = this.people.length;
    this.calculate();

    input.value = '';
  }

  removePerson(name) {
    this.people = this.people.filter(p => p !== name);
    this.save();
    this.renderPeople();

    if (this.people.length > 0) {
      this.elements.peopleCount.value = this.people.length;
    }
    this.calculate();
  }

  renderPeople() {
    const grid = this.elements.peopleGrid;

    if (this.people.length === 0) {
      grid.innerHTML = '';
      return;
    }

    grid.innerHTML = this.people.map(name => `
      <div class="person-badge">
        <span>${this.escapeHtml(name)}</span>
        <span class="person-remove" onclick="splitBill.removePerson('${this.escapeHtml(name)}')"></span>
      </div>
    `).join('');
  }

  calculate() {
    const total = parseFloat(this.elements.totalAmount.value) || 0;
    const count = parseInt(this.elements.peopleCount.value) || 0;

    const resultPanel = this.elements.resultPanel;

    if (total <= 0 || count <= 0) {
      resultPanel.style.display = 'none';
      return;
    }

    const perPerson = total / count;
    const rounded = Math.ceil(perPerson / 100) * 100;
    const remainder = total - (rounded * count);

    this.elements.resultTotal.textContent = this.formatNumber(total);
    this.elements.resultPeople.textContent = count;
    this.elements.resultAmount.textContent = this.formatNumber(rounded);

    let note = '';
    if (remainder !== 0) {
      if (remainder < 0) {
        note = `1인당 ${this.formatNumber(rounded)}원씩 받으면 ${this.formatNumber(Math.abs(remainder))}원이 남습니다`;
      } else {
        note = `정확히 나누면 1인당 ${this.formatNumber(Math.floor(perPerson))}원입니다`;
      }
    }
    this.elements.resultNote.textContent = note;

    resultPanel.style.display = 'block';
  }

  formatNumber(num) {
    return new Intl.NumberFormat('ko-KR').format(num);
  }

  copyResult() {
    const total = parseFloat(this.elements.totalAmount.value) || 0;
    const count = parseInt(this.elements.peopleCount.value) || 0;

    if (total <= 0 || count <= 0) {
      this.showToast('금액과 인원을 입력하세요', 'error');
      return;
    }

    const perPerson = Math.ceil(total / count / 100) * 100;

    let text = `[더치페이 정산]\n`;
    text += `총 금액: ${this.formatNumber(total)}원\n`;
    text += `인원: ${count}명\n`;
    text += `1인당: ${this.formatNumber(perPerson)}원\n`;

    if (this.people.length > 0) {
      text += `\n참여자: ${this.people.join(', ')}`;
    }

    this.copyToClipboard(text);
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// 전역 인스턴스 생성
const splitBill = new SplitBill();
window.SplitBill = splitBill;

document.addEventListener('DOMContentLoaded', () => splitBill.init());
