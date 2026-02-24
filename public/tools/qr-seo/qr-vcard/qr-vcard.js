/**
 * 명함 QR 코드 생성기 - ToolBase 기반
 * vCard 형식의 명함 QR 코드 생성
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var QRVCard = class QRVCard extends ToolBase {
  constructor() {
    super('QRVCard');
  }

  init() {
    this.initElements({
      firstName: 'firstName',
      lastName: 'lastName',
      company: 'company',
      title: 'title',
      mobile: 'mobile',
      workPhone: 'workPhone',
      email: 'email',
      website: 'website',
      address: 'address',
      postalCode: 'postalCode',
      country: 'country',
      note: 'note',
      qrCanvas: 'qrCanvas',
      qrSize: 'qrSize',
      errorLevel: 'errorLevel',
      fgColor: 'fgColor',
      bgColor: 'bgColor',
      vcardInfo: 'vcardInfo'
    });

    this.generate();
    console.log('[QRVCard] 초기화 완료');
    return this;
  }

  buildVCardString() {
    const firstName = this.elements.firstName.value.trim();
    const lastName = this.elements.lastName.value.trim();
    const company = this.elements.company.value.trim();
    const title = this.elements.title.value.trim();
    const mobile = this.elements.mobile.value.trim();
    const workPhone = this.elements.workPhone.value.trim();
    const email = this.elements.email.value.trim();
    const website = this.elements.website.value.trim();
    const address = this.elements.address.value.trim();
    const postalCode = this.elements.postalCode.value.trim();
    const country = this.elements.country.value.trim();
    const note = this.elements.note.value.trim();

    if (!firstName && !lastName) {
      return null;
    }

    const fullName = `${lastName}${firstName}`.trim();

    // vCard 3.0 형식
    let vcard = 'BEGIN:VCARD\n';
    vcard += 'VERSION:3.0\n';
    vcard += `N:${lastName};${firstName};;;\n`;
    vcard += `FN:${fullName}\n`;

    if (company) {
      vcard += `ORG:${company}\n`;
    }

    if (title) {
      vcard += `TITLE:${title}\n`;
    }

    if (mobile) {
      vcard += `TEL;TYPE=CELL:${this.formatPhone(mobile)}\n`;
    }

    if (workPhone) {
      vcard += `TEL;TYPE=WORK:${this.formatPhone(workPhone)}\n`;
    }

    if (email) {
      vcard += `EMAIL:${email}\n`;
    }

    if (website) {
      vcard += `URL:${website}\n`;
    }

    if (address || postalCode || country) {
      // ADR: PO Box;Extended;Street;City;Region;Postal;Country
      vcard += `ADR;TYPE=WORK:;;${address};;;${postalCode};${country}\n`;
    }

    if (note) {
      vcard += `NOTE:${note.replace(/\n/g, '\\n')}\n`;
    }

    vcard += 'END:VCARD';

    return vcard;
  }

  formatPhone(phone) {
    // 한국 전화번호 형식 처리
    return phone.replace(/[^0-9+]/g, '');
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  generate() {
    const vcardString = this.buildVCardString();
    const canvas = this.elements.qrCanvas;
    const size = parseInt(this.elements.qrSize.value);
    const errorLevel = this.elements.errorLevel.value;
    const fgColor = this.elements.fgColor.value;
    const bgColor = this.elements.bgColor.value;

    // 명함 정보 표시 업데이트
    const firstName = this.elements.firstName.value || '';
    const lastName = this.elements.lastName.value || '';
    const title = this.elements.title.value || '';
    const company = this.elements.company.value || '';

    const displayName = `${lastName}${firstName}`.trim() || '이름';
    const displayTitle = [title, company].filter(Boolean).join(' @ ') || '직함 / 회사';

    this.elements.vcardInfo.innerHTML = `
      <div class="name">${this.escapeHtml(displayName)}</div>
      <div class="title">${this.escapeHtml(displayTitle)}</div>
    `;

    if (!vcardString) {
      // 빈 QR 코드
      const ctx = canvas.getContext('2d');
      canvas.width = size;
      canvas.height = size;
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = '#ccc';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('이름을 입력하세요', size / 2, size / 2);
      return;
    }

    // QR 코드 생성
    QRCode.toCanvas(canvas, vcardString, {
      width: size,
      margin: 2,
      errorCorrectionLevel: errorLevel,
      color: {
        dark: fgColor,
        light: bgColor
      }
    }, (error) => {
      if (error) {
        console.error('[QRVCard] QR 생성 오류:', error);
        this.showToast('QR 코드 생성 실패', 'error');
      }
    });
  }

  download() {
    const firstName = this.elements.firstName.value;
    const lastName = this.elements.lastName.value;

    if (!firstName && !lastName) {
      this.showToast('이름을 입력하세요.', 'warning');
      return;
    }

    const fullName = `${lastName}${firstName}`.trim();
    const canvas = this.elements.qrCanvas;
    const link = document.createElement('a');
    link.download = `vcard-${fullName.replace(/[^a-zA-Z0-9가-힣]/g, '_')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();

    this.showToast('QR 코드 다운로드 완료!');
  }

  downloadVCard() {
    const vcardString = this.buildVCardString();

    if (!vcardString) {
      this.showToast('이름을 입력하세요.', 'warning');
      return;
    }

    const firstName = this.elements.firstName.value;
    const lastName = this.elements.lastName.value;
    const fullName = `${lastName}${firstName}`.trim();

    // vCard 파일 생성
    const blob = new Blob([vcardString], { type: 'text/vcard;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.download = `${fullName.replace(/[^a-zA-Z0-9가-힣]/g, '_')}.vcf`;
    link.href = url;
    link.click();

    URL.revokeObjectURL(url);

    this.showToast('vCard 파일 다운로드 완료!');
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const qrVCard = new QRVCard();
window.QRVCard = qrVCard;

document.addEventListener('DOMContentLoaded', () => qrVCard.init());
