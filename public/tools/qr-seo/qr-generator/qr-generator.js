/**
 * QR 코드 생성기 - ToolBase 기반
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var QRGenerator = class QRGenerator extends ToolBase {
  constructor() {
    super('QRGenerator');
    this.currentType = 'text';
    this.qrInstance = null;
  }

  init() {
    this.initElements({
      qrPreview: 'qrPreview',
      textContent: 'textContent',
      qrSize: 'qrSize',
      qrFgColor: 'qrFgColor',
      qrBgColor: 'qrBgColor'
    });

    console.log('[QRGenerator] 초기화 완료');
    return this;
  }

  setType(type) {
    this.currentType = type;

    // 탭 활성화
    document.querySelectorAll('.type-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.type === type);
    });

    // 입력 폼 전환
    document.querySelectorAll('.input-form').forEach(form => {
      form.style.display = 'none';
    });
    document.getElementById(`${type}Input`).style.display = 'block';

    // QR 코드 재생성
    this.generate();
  }

  getContent() {
    switch (this.currentType) {
      case 'text':
        return document.getElementById('textContent').value;

      case 'wifi':
        const ssid = document.getElementById('wifiSsid').value;
        const password = document.getElementById('wifiPassword').value;
        const encryption = document.getElementById('wifiEncryption').value;
        if (!ssid) return '';
        return `WIFI:T:${encryption};S:${ssid};P:${password};;`;

      case 'vcard':
        const name = document.getElementById('vcardName').value;
        const phone = document.getElementById('vcardPhone').value;
        const email = document.getElementById('vcardEmail').value;
        const org = document.getElementById('vcardOrg').value;
        if (!name && !phone) return '';
        let vcard = 'BEGIN:VCARD\nVERSION:3.0\n';
        if (name) vcard += `FN:${name}\n`;
        if (phone) vcard += `TEL:${phone}\n`;
        if (email) vcard += `EMAIL:${email}\n`;
        if (org) vcard += `ORG:${org}\n`;
        vcard += 'END:VCARD';
        return vcard;

      case 'email':
        const to = document.getElementById('emailTo').value;
        const subject = document.getElementById('emailSubject').value;
        const body = document.getElementById('emailBody').value;
        if (!to) return '';
        let mailto = `mailto:${to}`;
        const params = [];
        if (subject) params.push(`subject=${encodeURIComponent(subject)}`);
        if (body) params.push(`body=${encodeURIComponent(body)}`);
        if (params.length) mailto += '?' + params.join('&');
        return mailto;

      default:
        return '';
    }
  }

  generate() {
    const content = this.getContent();
    const preview = this.elements.qrPreview;

    if (!content) {
      preview.innerHTML = `
        <div class="qr-placeholder">
          <span></span>
          <p>텍스트를 입력하면<br>QR 코드가 생성됩니다</p>
        </div>
      `;
      return;
    }

    const size = parseInt(this.elements.qrSize.value);
    const fgColor = this.elements.qrFgColor.value;
    const bgColor = this.elements.qrBgColor.value;

    // 기존 QR 코드 제거
    preview.innerHTML = '';

    // 새 QR 코드 생성
    try {
      this.qrInstance = new QRCode(preview, {
        text: content,
        width: size,
        height: size,
        colorDark: fgColor,
        colorLight: bgColor,
        correctLevel: QRCode.CorrectLevel.M
      });
    } catch (err) {
      console.error('QR 생성 오류:', err);
      preview.innerHTML = `
        <div class="qr-placeholder error">
          <span></span>
          <p>QR 코드 생성 실패</p>
        </div>
      `;
    }
  }

  download(format) {
    const content = this.getContent();
    if (!content) {
      this.showToast('QR 코드가 생성되지 않았습니다.', 'error');
      return;
    }

    const canvas = this.elements.qrPreview.querySelector('canvas');
    if (!canvas) {
      this.showToast('다운로드할 QR 코드가 없습니다.', 'error');
      return;
    }

    if (format === 'png') {
      const link = document.createElement('a');
      link.download = 'qrcode.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
      this.showToast('PNG 파일이 다운로드되었습니다.');
    } else if (format === 'svg') {
      // Canvas to SVG 변환
      const size = parseInt(this.elements.qrSize.value);
      const fgColor = this.elements.qrFgColor.value;
      const bgColor = this.elements.qrBgColor.value;

      // 간단한 SVG 생성 (캔버스 데이터 기반)
      const imgData = canvas.toDataURL('image/png');
      const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${size}" height="${size}">
  <rect width="100%" height="100%" fill="${bgColor}"/>
  <image xlink:href="${imgData}" width="${size}" height="${size}"/>
</svg>`;

      const blob = new Blob([svg], { type: 'image/svg+xml' });
      const link = document.createElement('a');
      link.download = 'qrcode.svg';
      link.href = URL.createObjectURL(blob);
      link.click();
      URL.revokeObjectURL(link.href);
      this.showToast('SVG 파일이 다운로드되었습니다.');
    }
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const qrGenerator = new QRGenerator();
window.QRGenerator = qrGenerator;

document.addEventListener('DOMContentLoaded', () => qrGenerator.init());
