/**
 * 영수증 생성기 - ToolBase 기반
 * 간단한 영수증 생성
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var ReceiptMaker = class ReceiptMaker extends ToolBase {
  constructor() {
    super('ReceiptMaker');
    this.items = [
      { name: '아메리카노', qty: 2, price: 4500 },
      { name: '카페라떼', qty: 1, price: 5000 }
    ];
  }

  init() {
    this.initElements({
      storeName: 'storeName',
      storePhone: 'storePhone',
      receiptDate: 'receiptDate',
      receiptNo: 'receiptNo',
      itemsList: 'itemsList',
      previewContainer: 'previewContainer'
    });

    this.elements.receiptDate.valueAsDate = new Date();
    this.renderItems();

    console.log('[ReceiptMaker] 초기화 완료');
    return this;
  }

  renderItems() {
    this.elements.itemsList.innerHTML = this.items.map((item, idx) => `
      <div class="item-row">
        <input type="text" class="tool-input" value="${item.name}" placeholder="품명" onchange="receiptMaker.updateItem(${idx}, 'name', this.value)" style="flex: 2;">
        <input type="number" class="tool-input" value="${item.qty}" min="1" placeholder="수량" onchange="receiptMaker.updateItem(${idx}, 'qty', this.value)" style="width: 70px;">
        <input type="number" class="tool-input" value="${item.price}" placeholder="단가" onchange="receiptMaker.updateItem(${idx}, 'price', this.value)" style="width: 100px;">
        <button onclick="receiptMaker.removeItem(${idx})" style="background: none; border: none; cursor: pointer;"></button>
      </div>
    `).join('');
  }

  addItem() {
    this.items.push({ name: '', qty: 1, price: 0 });
    this.renderItems();
  }

  removeItem(idx) {
    this.items.splice(idx, 1);
    this.renderItems();
  }

  updateItem(idx, field, value) {
    if (field === 'qty' || field === 'price') {
      this.items[idx][field] = parseFloat(value) || 0;
    } else {
      this.items[idx][field] = value;
    }
  }

  calculateTotal() {
    return this.items.reduce((sum, item) => sum + (item.qty * item.price), 0);
  }

  preview() {
    const storeName = this.elements.storeName.value;
    const storePhone = this.elements.storePhone.value;
    const receiptDate = this.elements.receiptDate.value;
    const receiptNo = this.elements.receiptNo.value;

    const total = this.calculateTotal();
    const vat = Math.round(total / 11);
    const netAmount = total - vat;

    const formattedDate = receiptDate ? new Date(receiptDate).toLocaleDateString('ko-KR') : '';
    const formattedTime = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

    this.elements.previewContainer.innerHTML = `
      <div class="receipt-preview" id="receiptPreview">
        <div class="receipt-header">
          <div class="receipt-title">${storeName}</div>
          ${storePhone ? `<div>${storePhone}</div>` : ''}
          <div style="margin-top: 0.5rem; font-size: 0.8rem;">
            ${formattedDate} ${formattedTime}
          </div>
          <div style="font-size: 0.8rem;">No. ${receiptNo}</div>
        </div>

        <div style="margin-bottom: 0.5rem; font-size: 0.8rem;">
          품명　　　　수량　　단가　　금액
        </div>
        <div class="receipt-divider"></div>

        ${this.items.map(item => `
          <div style="font-size: 0.85rem;">
            <div>${item.name}</div>
            <div class="receipt-row">
              <span>　　　　　　${item.qty}　　${item.price.toLocaleString()}</span>
              <span>${(item.qty * item.price).toLocaleString()}</span>
            </div>
          </div>
        `).join('')}

        <div class="receipt-divider"></div>

        <div class="receipt-row">
          <span>합계</span>
          <span class="receipt-total">₩${total.toLocaleString()}</span>
        </div>
        <div class="receipt-row" style="font-size: 0.8rem; color: #666;">
          <span>공급가액</span>
          <span>₩${netAmount.toLocaleString()}</span>
        </div>
        <div class="receipt-row" style="font-size: 0.8rem; color: #666;">
          <span>부가세</span>
          <span>₩${vat.toLocaleString()}</span>
        </div>

        <div class="receipt-footer">
          감사합니다<br>
          또 방문해 주세요!
        </div>
      </div>
    `;
  }

  print() {
    this.preview();
    setTimeout(() => {
      const content = document.getElementById('receiptPreview').outerHTML;
      const printWindow = window.open('', '_blank');
      printWindow.document.open();
      printWindow.document.write(`
        <html>
          <head>
            <title>영수증</title>
            <style>
              body { font-family: monospace; padding: 10px; }
              .receipt-preview { max-width: 280px; margin: 0 auto; }
              .receipt-header { text-align: center; border-bottom: 1px dashed #333; padding-bottom: 10px; margin-bottom: 10px; }
              .receipt-title { font-size: 18px; font-weight: bold; }
              .receipt-row { display: flex; justify-content: space-between; padding: 3px 0; }
              .receipt-divider { border-top: 1px dashed #333; margin: 10px 0; }
              .receipt-total { font-weight: bold; }
              .receipt-footer { text-align: center; font-size: 12px; color: #666; margin-top: 10px; padding-top: 10px; border-top: 1px dashed #333; }
            </style>
          </head>
          <body>${content}</body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }, 100);
  }
}

// 전역 인스턴스 생성
const receiptMaker = new ReceiptMaker();
window.ReceiptMaker = receiptMaker;

// 전역 함수 (HTML onclick 호환)
function addItem() { receiptMaker.addItem(); }
function preview() { receiptMaker.preview(); }
function printReceipt() { receiptMaker.print(); }

document.addEventListener('DOMContentLoaded', () => receiptMaker.init());
