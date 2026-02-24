/**
 * 청구서/인보이스 생성기 - ToolBase 기반
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class InvoiceGen extends ToolBase {
  constructor() {
    super('InvoiceGen');
  }

  init() {
    this.initElements({
      seller: 'seller',
      sellerBizNum: 'sellerBizNum',
      buyer: 'buyer',
      invoiceDate: 'invoiceDate',
      items: 'items',
      preview: 'preview'
    });

    this.elements.invoiceDate.value = new Date().toISOString().split('T')[0];

    console.log('[InvoiceGen] 초기화 완료');
    return this;
  }

  generate() {
    const seller = this.elements.seller.value || '[공급자]';
    const sellerBizNum = this.elements.sellerBizNum.value || '000-00-00000';
    const buyer = this.elements.buyer.value || '[구매자]';
    const invoiceDate = this.elements.invoiceDate.value;
    const itemsText = this.elements.items.value;

    const dateStr = invoiceDate ? new Date(invoiceDate).toLocaleDateString('ko-KR') : '[날짜]';
    const invoiceNum = 'INV-' + new Date().getFullYear() + '-' + String(Math.floor(Math.random() * 10000)).padStart(4, '0');

    let items = [];
    let total = 0;
    itemsText.split('\n').forEach((line, idx) => {
      const parts = line.split(':');
      if (parts.length >= 3) {
        const name = parts[0].trim();
        const qty = parseInt(parts[1]) || 1;
        const price = parseInt(parts[2]) || 0;
        const amount = qty * price;
        total += amount;
        items.push({ name, qty, price, amount });
      }
    });

    const vat = Math.round(total * 0.1);
    const grandTotal = total + vat;

    let itemsHTML = items.map((item, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${item.name}</td>
        <td>${item.qty}</td>
        <td>${item.price.toLocaleString()}원</td>
        <td>${item.amount.toLocaleString()}원</td>
      </tr>`).join('');

    const html = `<h1>청 구 서</h1>
<div style="text-align: right; margin-bottom: 20px;">
  <p>청구서 번호: ${invoiceNum}</p>
  <p>발행일: ${dateStr}</p>
</div>

<table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
  <tr>
    <td style="width: 15%; padding: 8px; background: #f1f5f9; border: 1px solid #e2e8f0;">공급자</td>
    <td style="width: 35%; padding: 8px; border: 1px solid #e2e8f0;">${seller}</td>
    <td style="width: 15%; padding: 8px; background: #f1f5f9; border: 1px solid #e2e8f0;">구매자</td>
    <td style="width: 35%; padding: 8px; border: 1px solid #e2e8f0;">${buyer}</td>
  </tr>
  <tr>
    <td style="padding: 8px; background: #f1f5f9; border: 1px solid #e2e8f0;">사업자번호</td>
    <td style="padding: 8px; border: 1px solid #e2e8f0;">${sellerBizNum}</td>
    <td style="padding: 8px; background: #f1f5f9; border: 1px solid #e2e8f0;"></td>
    <td style="padding: 8px; border: 1px solid #e2e8f0;"></td>
  </tr>
</table>

<table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
  <thead>
    <tr style="background: #f1f5f9;">
      <th style="padding: 10px; border: 1px solid #e2e8f0; width: 10%;">No</th>
      <th style="padding: 10px; border: 1px solid #e2e8f0;">품목</th>
      <th style="padding: 10px; border: 1px solid #e2e8f0; width: 10%;">수량</th>
      <th style="padding: 10px; border: 1px solid #e2e8f0; width: 20%;">단가</th>
      <th style="padding: 10px; border: 1px solid #e2e8f0; width: 20%;">금액</th>
    </tr>
  </thead>
  <tbody>${itemsHTML}</tbody>
</table>

<table style="width: 300px; margin-left: auto; border-collapse: collapse;">
  <tr>
    <td style="padding: 8px; background: #f1f5f9; border: 1px solid #e2e8f0;">공급가액</td>
    <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right;">${total.toLocaleString()}원</td>
  </tr>
  <tr>
    <td style="padding: 8px; background: #f1f5f9; border: 1px solid #e2e8f0;">부가세 (10%)</td>
    <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right;">${vat.toLocaleString()}원</td>
  </tr>
  <tr style="font-weight: bold;">
    <td style="padding: 8px; background: #667eea; color: white; border: 1px solid #e2e8f0;">합계</td>
    <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right;">${grandTotal.toLocaleString()}원</td>
  </tr>
</table>

<div style="margin-top: 40px; text-align: center;">
  <p>위와 같이 청구합니다.</p>
  <p style="margin-top: 20px;">${seller}</p>
</div>`;

    this.elements.preview.innerHTML = html;
    this.showToast('청구서가 생성되었습니다', 'success');
  }

  copyText() {
    const text = this.elements.preview.innerText;
    this.copyToClipboard(text);
  }

  downloadTxt() {
    const text = this.elements.preview.innerText;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = '청구서.txt';
    link.click();
    URL.revokeObjectURL(link.href);
    this.showToast('파일이 다운로드되었습니다', 'success');
  }

  print() {
    window.print();
  }
}

// 전역 인스턴스 생성
const invoiceGen = new InvoiceGen();
window.InvoiceGen = invoiceGen;

// 전역 함수 (HTML onclick 호환)
function generate() { invoiceGen.generate(); }
function copyText() { invoiceGen.copyText(); }
function downloadTxt() { invoiceGen.downloadTxt(); }
function print() { invoiceGen.print(); }

document.addEventListener('DOMContentLoaded', () => invoiceGen.init());
