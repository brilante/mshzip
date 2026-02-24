/**
 * 지출 추적기 - ToolBase 기반
 * 수입/지출 기록 관리
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var ExpenseTracker = class ExpenseTracker extends ToolBase {
  constructor() {
    super('ExpenseTracker');
    this.transactions = [];
    this.currentType = 'expense';
    this.categories = {
      food: { name: '식비', icon: '' },
      transport: { name: '교통', icon: '' },
      shopping: { name: '쇼핑', icon: '' },
      entertainment: { name: '여가', icon: '' },
      bills: { name: '공과금', icon: '' },
      salary: { name: '급여', icon: '' },
      other: { name: '기타', icon: '' }
    };
  }

  init() {
    this.initElements({
      description: 'description',
      amount: 'amount',
      category: 'category',
      totalIncome: 'totalIncome',
      totalExpense: 'totalExpense',
      balance: 'balance',
      transactionList: 'transactionList'
    });

    this.load();
    if (this.transactions.length === 0) {
      this.transactions = [
        { id: 1, type: 'income', description: '월급', amount: 3000000, category: 'salary', date: new Date().toISOString() },
        { id: 2, type: 'expense', description: '점심 식사', amount: 12000, category: 'food', date: new Date().toISOString() },
        { id: 3, type: 'expense', description: '지하철 충전', amount: 50000, category: 'transport', date: new Date().toISOString() }
      ];
    }
    this.render();

    console.log('[ExpenseTracker] 초기화 완료');
    return this;
  }

  load() {
    try {
      const saved = localStorage.getItem('expense-tracker-data');
      if (saved) {
        this.transactions = JSON.parse(saved);
      }
    } catch (e) {}
  }

  save() {
    localStorage.setItem('expense-tracker-data', JSON.stringify(this.transactions));
  }

  setType(type) {
    this.currentType = type;
    document.querySelectorAll('.category-pill').forEach(pill => {
      pill.classList.toggle('active', pill.dataset.type === type);
    });
  }

  add() {
    const description = this.elements.description.value.trim();
    const amount = parseFloat(this.elements.amount.value);
    const category = this.elements.category.value;

    if (!description) {
      this.showToast('내용을 입력해주세요', 'error');
      return;
    }

    if (!amount || amount <= 0) {
      this.showToast('유효한 금액을 입력해주세요', 'error');
      return;
    }

    this.transactions.unshift({
      id: Date.now(),
      type: this.currentType,
      description,
      amount,
      category,
      date: new Date().toISOString()
    });

    this.elements.description.value = '';
    this.elements.amount.value = '';

    this.save();
    this.render();
    this.showToast(`${this.currentType === 'expense' ? '지출' : '수입'}이 기록되었습니다`, 'success');
  }

  remove(id) {
    this.transactions = this.transactions.filter(t => t.id !== id);
    this.save();
    this.render();
  }

  calculateSummary() {
    let totalIncome = 0;
    let totalExpense = 0;

    this.transactions.forEach(t => {
      if (t.type === 'income') {
        totalIncome += t.amount;
      } else {
        totalExpense += t.amount;
      }
    });

    return {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense
    };
  }

  formatAmount(amount) {
    return '₩' + amount.toLocaleString();
  }

  formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  }

  render() {
    const summary = this.calculateSummary();

    this.elements.totalIncome.textContent = this.formatAmount(summary.totalIncome);
    this.elements.totalExpense.textContent = this.formatAmount(summary.totalExpense);
    this.elements.balance.textContent = this.formatAmount(summary.balance);

    this.elements.balance.style.color = summary.balance >= 0 ? '#22c55e' : '#ef4444';

    if (this.transactions.length === 0) {
      this.elements.transactionList.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
          거래 내역이 없습니다
        </div>
      `;
      return;
    }

    this.elements.transactionList.innerHTML = this.transactions.map(t => {
      const cat = this.categories[t.category];
      const isExpense = t.type === 'expense';

      return `
        <div class="transaction-item">
          <div class="transaction-info">
            <div class="transaction-icon ${isExpense ? 'transaction-expense' : 'transaction-income'}">
              ${cat.icon}
            </div>
            <div>
              <div style="font-weight: 500;">${t.description}</div>
              <div style="font-size: 0.8rem; color: var(--text-secondary);">
                ${cat.name} · ${this.formatDate(t.date)}
              </div>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <span class="transaction-amount ${isExpense ? 'amount-expense' : 'amount-income'}">
              ${isExpense ? '-' : '+'}${this.formatAmount(t.amount)}
            </span>
            <button onclick="expenseTracker.remove(${t.id})" style="background: none; border: none; cursor: pointer; opacity: 0.5;"></button>
          </div>
        </div>
      `;
    }).join('');
  }
}

// 전역 인스턴스 생성
const expenseTracker = new ExpenseTracker();
window.ExpenseTracker = expenseTracker;

// 전역 함수 (HTML onclick 호환)
function setType(type) { expenseTracker.setType(type); }
function add() { expenseTracker.add(); }

document.addEventListener('DOMContentLoaded', () => expenseTracker.init());
