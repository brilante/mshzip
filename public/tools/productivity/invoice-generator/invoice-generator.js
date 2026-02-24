/**
 * 인보이스 생성기 - ToolBase 기반
 * 전문적인 청구서 생성
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var InvoiceGenerator = class InvoiceGenerator extends ToolBase {
  constructor() {
    super('InvoiceGenerator');
    this.items = [
      { description: '웹 개발 서비스', quantity: 1, price: 1000000 },
      { description: '호스팅 비용 (월)', quantity: 3, price: 50000 }
    ];
  }

  init() {
    this.initElements({
      invoiceDate: 'invoiceDate',
      invoiceNo: 'invoiceNo',
      fromName: 'fromName',
      fromAddress: 'fromAddress',
      fromEmail: 'fromEmail',
      toName: 'toName',
      toAddress: 'toAddress',
      toEmail: 'toEmail',
      itemsBody: 'itemsBody',
      previewContainer: 'previewContainer'
    });

    this.elements.invoiceDate.valueAsDate = new Date();
    this.renderItems();

    console.log('[InvoiceGenerator] 초기화 완료');
    return this;
  }

  renderItems() {
    this.elements.itemsBody.innerHTML = this.items.map((item, idx) => `
      <tr>
        <td><input type="text" class="tool-input" value="${item.description}" onchange="invoiceGenerator.updateItem(${idx}, 'description', this.value)"></td>
        <td><input type="number" class="tool-input" value="${item.quantity}" min="1" onchange="invoiceGenerator.updateItem(${idx}, 'quantity', this.value)"></td>
        <td><input type="number" class="tool-input" value="${item.price}" onchange="invoiceGenerator.updateItem(${idx}, 'price', this.value)"></td>
        <td style="font-weight: 600;">₩${(item.quantity * item.price).toLocaleString()}</td>
        <td><button onclick="invoiceGenerator.removeItem(${idx})" style="background: none; border: none; cursor: pointer;"></button></td>
      </tr>
    `).join('');
  }

  addItem() {
    this.items.push({ description: '', quantity: 1, price: 0 });
    this.renderItems();
  }

  removeItem(idx) {
    this.items.splice(idx, 1);
    this.renderItems();
  }

  updateItem(idx, field, value) {
    if (field === 'quantity' || field === 'price') {
      this.items[idx][field] = parseFloat(value) || 0;
    } else {
      this.items[idx][field] = value;
    }
    this.renderItems();
  }

  calculateTotal() {
    return this.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  }

  preview() {
    const fromName = this.elements.fromName.value;
    const fromAddress = this.elements.fromAddress.value;
    const fromEmail = this.elements.fromEmail.value;
    const toName = this.elements.toName.value;
    const toAddress = this.elements.toAddress.value;
    const toEmail = this.elements.toEmail.value;
    const invoiceNo = this.elements.invoiceNo.value;
    const invoiceDate = this.elements.invoiceDate.value;

    const subtotal = this.calculateTotal();
    const vat = Math.round(subtotal * 0.1);
    const total = subtotal + vat;

    const formattedDate = invoiceDate ? new Date(invoiceDate).toLocaleDateString('ko-KR') : '';

    this.elements.previewContainer.innerHTML = `
      <div class="invoice-preview" id="invoicePreview">
        <div class="invoice-header">
          <div>
            <div class="invoice-title">청구서</div>
            <div style="color: #666;">INVOICE</div>
          </div>
          <div class="invoice-info">
            <div><strong>인보이스 번호:</strong> ${invoiceNo}</div>
            <div><strong>발행일:</strong> ${formattedDate}</div>
          </div>
        </div>

        <div class="parties">
          <div class="party-section">
            <h3>발신</h3>
            <div style="font-weight: 600;">${fromName}</div>
            <div>${fromAddress}</div>
            <div>${fromEmail}</div>
          </div>
          <div class="party-section">
            <h3>수신</h3>
            <div style="font-weight: 600;">${toName}</div>
            <div>${toAddress}</div>
            <div>${toEmail}</div>
          </div>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-top: 1rem;">
          <thead>
            <tr style="background: #f3f4f6;">
              <th style="padding: 0.75rem; text-align: left; border-bottom: 2px solid #333;">설명</th>
              <th style="padding: 0.75rem; text-align: right; border-bottom: 2px solid #333;">수량</th>
              <th style="padding: 0.75rem; text-align: right; border-bottom: 2px solid #333;">단가</th>
              <th style="padding: 0.75rem; text-align: right; border-bottom: 2px solid #333;">금액</th>
            </tr>
          </thead>
          <tbody>
            ${this.items.map(item => `
              <tr>
                <td style="padding: 0.75rem; border-bottom: 1px solid #ddd;">${item.description}</td>
                <td style="padding: 0.75rem; text-align: right; border-bottom: 1px solid #ddd;">${item.quantity}</td>
                <td style="padding: 0.75rem; text-align: right; border-bottom: 1px solid #ddd;">₩${item.price.toLocaleString()}</td>
                <td style="padding: 0.75rem; text-align: right; border-bottom: 1px solid #ddd;">₩${(item.quantity * item.price).toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="total-section">
          <div class="total-row">
            <span>소계:</span>
            <span>₩${subtotal.toLocaleString()}</span>
          </div>
          <div class="total-row">
            <span>부가세 (10%):</span>
            <span>₩${vat.toLocaleString()}</span>
          </div>
          <div class="total-row grand-total">
            <span>합계:</span>
            <span>₩${total.toLocaleString()}</span>
          </div>
        </div>

        <div style="margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #ddd; font-size: 0.85rem; color: #666;">
          <p>결제 기한: 발행일로부터 30일 이내</p>
          <p>계좌 정보: 우리은행 1234-567-890123 (예금주: ${fromName})</p>
        </div>
      </div>
    `;
  }

  print() {
    this.preview();
    setTimeout(() => {
      const content = document.getElementById('invoicePreview').innerHTML;
      const printWindow = window.open('', '_blank');
      printWindow.document.open();
      printWindow.document.write(`
        <html>
          <head>
            <title>인보이스</title>
            <style>
              body { font-family: 'Malgun Gothic', sans-serif; padding: 20px; }
              table { width: 100%; border-collapse: collapse; }
              th, td { padding: 10px; text-align: left; }
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
const invoiceGenerator = new InvoiceGenerator();
window.InvoiceGenerator = invoiceGenerator;

// 전역 함수 (HTML onclick 호환)
function addItem() { invoiceGenerator.addItem(); }
function preview() { invoiceGenerator.preview(); }
function printInvoice() { invoiceGenerator.print(); }

document.addEventListener('DOMContentLoaded', () => invoiceGenerator.init());
