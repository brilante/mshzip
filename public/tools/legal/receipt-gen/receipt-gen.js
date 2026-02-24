/**
 * 영수증 생성기 - ToolBase 기반
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var ReceiptGen = class ReceiptGen extends ToolBase {
  constructor() {
    super('ReceiptGen');
  }

  init() {
    this.initElements({
      storeName: 'storeName',
      bizNum: 'bizNum',
      transDate: 'transDate',
      payMethod: 'payMethod',
      items: 'items',
      preview: 'preview'
    });

    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    this.elements.transDate.value = now.toISOString().slice(0, 16);

    console.log('[ReceiptGen] 초기화 완료');
    return this;
  }

  generate() {
    const storeName = this.elements.storeName.value || '[상호명]';
    const bizNum = this.elements.bizNum.value || '000-00-00000';
    const transDate = this.elements.transDate.value;
    const payMethod = this.elements.payMethod.value;
    const itemsText = this.elements.items.value;

    const dateStr = transDate ? new Date(transDate).toLocaleString('ko-KR') : '[일시]';
    const receiptNo = String(Date.now()).slice(-8);

    let items = [];
    let total = 0;
    itemsText.split('\n').forEach(line => {
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

    let itemsHTML = items.map(item =>
      `<tr>
        <td style="padding: 4px 8px;">${item.name}</td>
        <td style="padding: 4px 8px; text-align: center;">${item.qty}</td>
        <td style="padding: 4px 8px; text-align: right;">${item.amount.toLocaleString()}</td>
      </tr>`
    ).join('');

    const html = `<div style="max-width: 300px; margin: 0 auto; font-family: monospace; font-size: 13px;">
<h1 style="text-align: center; font-size: 16px; margin-bottom: 8px;">${storeName}</h1>
<p style="text-align: center; font-size: 11px; color: #666; margin-bottom: 16px;">사업자번호: ${bizNum}</p>
<div style="border-top: 1px dashed #333; border-bottom: 1px dashed #333; padding: 8px 0; margin-bottom: 12px;">
  <p>거래일시: ${dateStr}</p>
  <p>영수증번호: ${receiptNo}</p>
</div>
<table style="width: 100%; border-collapse: collapse;">
  <thead>
    <tr style="border-bottom: 1px solid #333;">
      <th style="padding: 4px 8px; text-align: left;">품목</th>
      <th style="padding: 4px 8px; text-align: center;">수량</th>
      <th style="padding: 4px 8px; text-align: right;">금액</th>
    </tr>
  </thead>
  <tbody>${itemsHTML}</tbody>
</table>
<div style="border-top: 1px dashed #333; margin-top: 12px; padding-top: 12px;">
  <p style="font-size: 16px; font-weight: bold; text-align: right;">합계: ${total.toLocaleString()}원</p>
  <p style="text-align: right; color: #666;">결제방법: ${payMethod}</p>
</div>
<p style="text-align: center; margin-top: 20px; font-size: 11px; color: #999;">감사합니다</p>
</div>`;

    this.elements.preview.innerHTML = html;
    this.showToast('영수증이 생성되었습니다', 'success');
  }

  copyText() {
    const text = this.elements.preview.innerText;
    this.copyToClipboard(text);
  }

  print() {
    window.print();
  }
}

// 전역 인스턴스 생성
const receiptGen = new ReceiptGen();
window.ReceiptGen = receiptGen;

// 전역 함수 (HTML onclick 호환)
function generate() { receiptGen.generate(); }
function copyText() { receiptGen.copyText(); }
function print() { receiptGen.print(); }

document.addEventListener('DOMContentLoaded', () => receiptGen.init());
