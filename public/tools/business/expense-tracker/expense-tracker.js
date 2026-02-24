/**
 * 경비 추적기 - ToolBase 기반
 * 비즈니스 경비 관리
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var ExpenseTracker = class ExpenseTracker extends ToolBase {
  constructor() {
    super('ExpenseTracker');
    this.expenses = [];
    this.nextId = 1;
    this.categories = {
      transport: { name: '교통비', icon: '' },
      meal: { name: '식비', icon: '' },
      supplies: { name: '사무용품', icon: '' },
      software: { name: '소프트웨어', icon: '' },
      accommodation: { name: '숙박비', icon: '' },
      entertainment: { name: '접대비', icon: '' },
      communication: { name: '통신비', icon: '' },
      other: { name: '기타', icon: '' }
    };
  }

  init() {
    this.initElements({
      expenseDesc: 'expenseDesc',
      expenseAmount: 'expenseAmount',
      expenseCategory: 'expenseCategory',
      expenseDate: 'expenseDate',
      expenseNote: 'expenseNote',
      filterCategory: 'filterCategory',
      filterMonth: 'filterMonth',
      expensesList: 'expensesList',
      monthlyTotal: 'monthlyTotal',
      totalExpenses: 'totalExpenses',
      expenseCount: 'expenseCount',
      categoryChart: 'categoryChart'
    });

    this.loadFromStorage();
    this.setDefaultDate();
    this.renderExpenses();
    this.updateStats();

    console.log('[ExpenseTracker] 초기화 완료');
    return this;
  }

  loadFromStorage() {
    try {
      const saved = localStorage.getItem('mymind3_expenses');
      if (saved) {
        this.expenses = JSON.parse(saved);
        this.nextId = Math.max(...this.expenses.map(e => e.id), 0) + 1;
      }
    } catch (e) {
      console.error('Failed to load expenses:', e);
    }
  }

  saveToStorage() {
    try {
      localStorage.setItem('mymind3_expenses', JSON.stringify(this.expenses));
    } catch (e) {
      console.error('Failed to save expenses:', e);
    }
  }

  setDefaultDate() {
    this.elements.expenseDate.value = new Date().toISOString().split('T')[0];
  }

  addExpense() {
    const description = this.elements.expenseDesc.value.trim();
    const amount = parseFloat(this.elements.expenseAmount.value);
    const category = this.elements.expenseCategory.value;
    const date = this.elements.expenseDate.value;
    const note = this.elements.expenseNote.value.trim();

    if (!description || !amount || !date) {
      this.showToast('설명, 금액, 날짜는 필수입니다.', 'warning');
      return;
    }

    const expense = {
      id: this.nextId++,
      description,
      amount,
      category,
      date,
      note,
      created: new Date().toISOString()
    };

    this.expenses.push(expense);
    this.expenses.sort((a, b) => new Date(b.date) - new Date(a.date));
    this.saveToStorage();
    this.renderExpenses();
    this.updateStats();
    this.clearForm();
    this.showToast('경비가 추가되었습니다!', 'success');
  }

  deleteExpense(id) {
    this.expenses = this.expenses.filter(e => e.id !== id);
    this.saveToStorage();
    this.renderExpenses();
    this.updateStats();
  }

  clearForm() {
    this.elements.expenseDesc.value = '';
    this.elements.expenseAmount.value = '';
    this.elements.expenseNote.value = '';
    this.setDefaultDate();
  }

  renderExpenses() {
    const container = this.elements.expensesList;
    const filter = this.elements.filterCategory.value;
    const month = this.elements.filterMonth.value;

    let filtered = this.expenses;

    if (filter !== 'all') {
      filtered = filtered.filter(e => e.category === filter);
    }

    if (month) {
      filtered = filtered.filter(e => e.date.startsWith(month));
    }

    if (filtered.length === 0) {
      container.innerHTML = '<div class="empty-state">경비 내역이 없습니다.</div>';
      return;
    }

    const html = filtered.map(expense => {
      const cat = this.categories[expense.category];
      const dateObj = new Date(expense.date);
      const dateStr = dateObj.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });

      return `
        <div class="expense-row">
          <div class="expense-icon">${cat.icon}</div>
          <div class="expense-info">
            <div class="expense-desc">${expense.description}</div>
            <div class="expense-meta">
              <span class="expense-category">${cat.name}</span>
              <span class="expense-date">${dateStr}</span>
            </div>
            ${expense.note ? `<div class="expense-note">${expense.note}</div>` : ''}
          </div>
          <div class="expense-amount">${this.formatCurrency(expense.amount)}</div>
          <button class="delete-btn" onclick="expenseTracker.deleteExpense(${expense.id})">×</button>
        </div>
      `;
    }).join('');

    container.innerHTML = html;
  }

  updateStats() {
    const now = new Date();
    const thisMonth = now.toISOString().slice(0, 7);

    // 이번 달 총액
    const monthlyTotal = this.expenses
      .filter(e => e.date.startsWith(thisMonth))
      .reduce((sum, e) => sum + e.amount, 0);

    // 전체 총액
    const total = this.expenses.reduce((sum, e) => sum + e.amount, 0);

    // 카테고리별 통계
    const byCategory = {};
    this.expenses.filter(e => e.date.startsWith(thisMonth)).forEach(e => {
      byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
    });

    this.elements.monthlyTotal.textContent = this.formatCurrency(monthlyTotal);
    this.elements.totalExpenses.textContent = this.formatCurrency(total);
    this.elements.expenseCount.textContent = this.expenses.filter(e => e.date.startsWith(thisMonth)).length + '건';

    // 카테고리 차트
    const chartHtml = Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, amount]) => {
        const catInfo = this.categories[cat];
        const percentage = monthlyTotal > 0 ? (amount / monthlyTotal * 100).toFixed(1) : 0;
        return `
          <div class="chart-row">
            <div class="chart-label">${catInfo.icon} ${catInfo.name}</div>
            <div class="chart-bar-bg">
              <div class="chart-bar" style="width: ${percentage}%"></div>
            </div>
            <div class="chart-value">${this.formatCurrency(amount)} (${percentage}%)</div>
          </div>
        `;
      }).join('');

    this.elements.categoryChart.innerHTML = chartHtml || '<div class="empty-state">이번 달 데이터가 없습니다.</div>';
  }

  formatCurrency(amount) {
    return '₩' + Math.round(amount).toLocaleString();
  }

  exportCSV() {
    if (this.expenses.length === 0) {
      this.showToast('내보낼 데이터가 없습니다.', 'warning');
      return;
    }

    let csv = 'Date,Description,Category,Amount,Note\n';
    this.expenses.forEach(e => {
      const cat = this.categories[e.category].name;
      csv += `${e.date},"${e.description}","${cat}",${e.amount},"${e.note || ''}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'expenses.csv';
    a.click();
    URL.revokeObjectURL(url);
    this.showToast('CSV 파일이 다운로드되었습니다!', 'success');
  }

  clearAll() {
    if (confirm('모든 경비 데이터를 삭제하시겠습니까?')) {
      this.expenses = [];
      this.saveToStorage();
      this.renderExpenses();
      this.updateStats();
      this.showToast('모든 데이터가 삭제되었습니다.', 'success');
    }
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const expenseTracker = new ExpenseTracker();
window.ExpenseTracker = expenseTracker;

document.addEventListener('DOMContentLoaded', () => expenseTracker.init());
