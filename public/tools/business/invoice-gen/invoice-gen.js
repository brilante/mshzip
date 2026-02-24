/**
 * 송장 생성기 - ToolBase 기반
 * 간단한 비즈니스 송장/인보이스 생성
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var InvoiceGen = class InvoiceGen extends ToolBase {
  constructor() {
    super('InvoiceGen');
    this.items = [];
    this.nextId = 1;
  }

  init() {
    this.initElements({
      companyName: 'companyName',
      companyAddress: 'companyAddress',
      companyContact: 'companyContact',
      clientName: 'clientName',
      clientAddress: 'clientAddress',
      clientContact: 'clientContact',
      invoiceNumber: 'invoiceNumber',
      invoiceDate: 'invoiceDate',
      dueDate: 'dueDate',
      currency: 'currency',
      taxRate: 'taxRate',
      invoiceNotes: 'invoiceNotes',
      itemsList: 'itemsList',
      invoicePreview: 'invoicePreview',
      previewCompany: 'previewCompany',
      previewCompanyAddress: 'previewCompanyAddress',
      previewCompanyContact: 'previewCompanyContact',
      previewClient: 'previewClient',
      previewClientAddress: 'previewClientAddress',
      previewClientContact: 'previewClientContact',
      previewInvoiceNo: 'previewInvoiceNo',
      previewInvoiceDate: 'previewInvoiceDate',
      previewDueDate: 'previewDueDate',
      previewItems: 'previewItems',
      previewSubtotal: 'previewSubtotal',
      previewTax: 'previewTax',
      previewTaxLabel: 'previewTaxLabel',
      previewTotal: 'previewTotal',
      previewNotes: 'previewNotes'
    });

    this.setDefaultDates();
    this.addItem();

    console.log('[InvoiceGen] 초기화 완료');
    return this;
  }

  setDefaultDates() {
    const today = new Date().toISOString().split('T')[0];
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    this.elements.invoiceDate.value = today;
    this.elements.dueDate.value = dueDate.toISOString().split('T')[0];
  }

  addItem() {
    const id = this.nextId++;
    this.items.push({ id, description: '', quantity: 1, price: 0 });
    this.renderItems();
    this.updatePreview();
  }

  removeItem(id) {
    this.items = this.items.filter(item => item.id !== id);
    if (this.items.length === 0) this.addItem();
    else {
      this.renderItems();
      this.updatePreview();
    }
  }

  renderItems() {
    const html = this.items.map((item, idx) => `
      <div class="item-row" data-id="${item.id}">
        <input type="text" class="tool-input item-desc" placeholder="품목 설명" value="${item.description}"
          onchange="invoiceGen.updateItem(${item.id}, 'description', this.value)">
        <input type="number" class="tool-input item-qty" min="1" value="${item.quantity}"
          onchange="invoiceGen.updateItem(${item.id}, 'quantity', this.value)">
        <input type="number" class="tool-input item-price" min="0" value="${item.price}"
          onchange="invoiceGen.updateItem(${item.id}, 'price', this.value)">
        <span class="item-total">${this.formatCurrency(item.quantity * item.price)}</span>
        <button class="remove-item" onclick="invoiceGen.removeItem(${item.id})">×</button>
      </div>
    `).join('');
    this.elements.itemsList.innerHTML = html;
  }

  updateItem(id, field, value) {
    const item = this.items.find(i => i.id === id);
    if (item) {
      item[field] = field === 'description' ? value : parseFloat(value) || 0;
      this.renderItems();
      this.updatePreview();
    }
  }

  updatePreview() {
    // 회사 정보
    this.elements.previewCompany.textContent = this.elements.companyName.value || '회사명';
    this.elements.previewCompanyAddress.textContent = this.elements.companyAddress.value || '회사 주소';
    this.elements.previewCompanyContact.textContent = this.elements.companyContact.value || '연락처';

    // 고객 정보
    this.elements.previewClient.textContent = this.elements.clientName.value || '고객명';
    this.elements.previewClientAddress.textContent = this.elements.clientAddress.value || '고객 주소';
    this.elements.previewClientContact.textContent = this.elements.clientContact.value || '고객 연락처';

    // 송장 정보
    this.elements.previewInvoiceNo.textContent = this.elements.invoiceNumber.value || 'INV-0001';
    this.elements.previewInvoiceDate.textContent = this.elements.invoiceDate.value;
    this.elements.previewDueDate.textContent = this.elements.dueDate.value;

    // 품목
    const itemsHtml = this.items.map(item => `
      <tr>
        <td>${item.description || '-'}</td>
        <td class="text-right">${item.quantity}</td>
        <td class="text-right">${this.formatCurrency(item.price)}</td>
        <td class="text-right">${this.formatCurrency(item.quantity * item.price)}</td>
      </tr>
    `).join('');
    this.elements.previewItems.innerHTML = itemsHtml;

    // 합계
    const subtotal = this.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    const taxRate = parseFloat(this.elements.taxRate.value) || 0;
    const tax = subtotal * (taxRate / 100);
    const total = subtotal + tax;

    this.elements.previewSubtotal.textContent = this.formatCurrency(subtotal);
    this.elements.previewTax.textContent = this.formatCurrency(tax);
    this.elements.previewTaxLabel.textContent = `세금 (${taxRate}%)`;
    this.elements.previewTotal.textContent = this.formatCurrency(total);

    // 메모
    this.elements.previewNotes.textContent = this.elements.invoiceNotes.value || '';
  }

  formatCurrency(amount) {
    const currency = this.elements.currency.value;
    const symbols = { KRW: '₩', USD: '$', EUR: '€', JPY: '¥' };
    const symbol = symbols[currency] || '₩';

    if (currency === 'KRW' || currency === 'JPY') {
      return symbol + Math.round(amount).toLocaleString();
    }
    return symbol + amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  async printInvoice() {
    const previewEl = this.elements.invoicePreview;
    const printWindow = window.open('', '_blank');
    printWindow.document.open();
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>송장 출력</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 20px; }
          .invoice-preview { max-width: 800px; margin: 0 auto; }
          .invoice-header { display: flex; justify-content: space-between; margin-bottom: 2rem; }
          .company-info h2 { margin: 0 0 0.5rem; }
          .invoice-meta { text-align: right; }
          .parties { display: flex; justify-content: space-between; margin-bottom: 2rem; }
          .party h3 { margin: 0 0 0.5rem; font-size: 0.9rem; color: #666; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 1.5rem; }
          th, td { padding: 0.75rem; text-align: left; border-bottom: 1px solid #ddd; }
          th { background: #f5f5f5; }
          .text-right { text-align: right; }
          .totals { margin-left: auto; width: 250px; }
          .total-row { display: flex; justify-content: space-between; padding: 0.5rem 0; }
          .total-row.grand { font-weight: bold; font-size: 1.25rem; border-top: 2px solid #333; margin-top: 0.5rem; padding-top: 0.75rem; }
          .notes { margin-top: 2rem; padding: 1rem; background: #f9f9f9; border-radius: 4px; }
        </style>
      </head>
      <body>
        ${previewEl.innerHTML}
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const invoiceGen = new InvoiceGen();
window.InvoiceGen = invoiceGen;

document.addEventListener('DOMContentLoaded', () => invoiceGen.init());
