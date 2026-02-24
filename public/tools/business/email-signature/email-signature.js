/**
 * 이메일 서명 생성기 - ToolBase 기반
 * 전문적인 HTML 이메일 서명 생성
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var EmailSignature = class EmailSignature extends ToolBase {
  constructor() {
    super('EmailSignature');
    this.generatedHTML = '';
  }

  init() {
    this.initElements({
      sigName: 'sigName',
      sigTitle: 'sigTitle',
      sigCompany: 'sigCompany',
      sigEmail: 'sigEmail',
      sigPhone: 'sigPhone',
      sigWebsite: 'sigWebsite',
      sigAddress: 'sigAddress',
      sigPhoto: 'sigPhoto',
      sigLinkedin: 'sigLinkedin',
      sigTwitter: 'sigTwitter',
      sigInstagram: 'sigInstagram',
      sigTemplate: 'sigTemplate',
      primaryColor: 'primaryColor',
      signaturePreview: 'signaturePreview'
    });

    this.updatePreview();

    console.log('[EmailSignature] 초기화 완료');
    return this;
  }

  updatePreview() {
    const name = this.elements.sigName.value || '홍길동';
    const title = this.elements.sigTitle.value || '팀장';
    const company = this.elements.sigCompany.value || '회사명';
    const email = this.elements.sigEmail.value || 'email@company.com';
    const phone = this.elements.sigPhone.value || '010-1234-5678';
    const website = this.elements.sigWebsite.value || '';
    const address = this.elements.sigAddress.value || '';
    const photo = this.elements.sigPhoto.value || '';

    const linkedin = this.elements.sigLinkedin.value || '';
    const twitter = this.elements.sigTwitter.value || '';
    const instagram = this.elements.sigInstagram.value || '';

    const template = this.elements.sigTemplate.value;
    const primaryColor = this.elements.primaryColor.value;

    let html = this.generateSignature({
      name, title, company, email, phone, website, address, photo,
      linkedin, twitter, instagram, template, primaryColor
    });

    this.elements.signaturePreview.innerHTML = html;
    this.generatedHTML = this.wrapForCopy(html);
  }

  generateSignature(data) {
    const socialLinks = [];
    if (data.linkedin) socialLinks.push(`<a href="${data.linkedin}" style="color: ${data.primaryColor}; text-decoration: none; margin-right: 8px;">LinkedIn</a>`);
    if (data.twitter) socialLinks.push(`<a href="${data.twitter}" style="color: ${data.primaryColor}; text-decoration: none; margin-right: 8px;">Twitter</a>`);
    if (data.instagram) socialLinks.push(`<a href="${data.instagram}" style="color: ${data.primaryColor}; text-decoration: none; margin-right: 8px;">Instagram</a>`);

    const socialHTML = socialLinks.length > 0 ? `<div style="margin-top: 8px;">${socialLinks.join('')}</div>` : '';

    const photoHTML = data.photo ? `
      <td style="vertical-align: top; padding-right: 15px;">
        <img src="${data.photo}" alt="${data.name}" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover;">
      </td>` : '';

    switch (data.template) {
      case 'classic':
        return `
          <table cellpadding="0" cellspacing="0" style="font-family: Arial, sans-serif; font-size: 14px; color: #333;">
            <tr>
              ${photoHTML}
              <td style="vertical-align: top; border-left: 3px solid ${data.primaryColor}; padding-left: 15px;">
                <div style="font-size: 18px; font-weight: bold; color: ${data.primaryColor};">${data.name}</div>
                <div style="color: #666; margin: 4px 0;">${data.title} | ${data.company}</div>
                <div style="margin-top: 10px; font-size: 13px;">
                  <div><a href="mailto:${data.email}" style="color: #333; text-decoration: none;">${data.email}</a></div>
                  <div>${data.phone}</div>
                  ${data.website ? `<div><a href="${data.website}" style="color: #333; text-decoration: none;">${data.website}</a></div>` : ''}
                  ${data.address ? `<div>${data.address}</div>` : ''}
                </div>
                ${socialHTML}
              </td>
            </tr>
          </table>`;

      case 'modern':
        return `
          <table cellpadding="0" cellspacing="0" style="font-family: 'Segoe UI', Arial, sans-serif; font-size: 14px; color: #333;">
            <tr>
              ${photoHTML}
              <td style="vertical-align: top;">
                <div style="font-size: 20px; font-weight: 600;">${data.name}</div>
                <div style="color: ${data.primaryColor}; font-weight: 500; margin: 2px 0;">${data.title}</div>
                <div style="color: #888; font-size: 13px;">${data.company}</div>
                <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
                  ${data.email} • ${data.phone}
                  ${data.website ? ` • ${data.website}` : ''}
                </div>
                ${socialHTML}
              </td>
            </tr>
          </table>`;

      case 'minimal':
        return `
          <table cellpadding="0" cellspacing="0" style="font-family: Arial, sans-serif; font-size: 13px; color: #555;">
            <tr>
              <td>
                <div style="font-weight: bold;">${data.name}</div>
                <div style="color: #888;">${data.title}, ${data.company}</div>
                <div style="margin-top: 6px; font-size: 12px;">
                  ${data.email} | ${data.phone}
                </div>
              </td>
            </tr>
          </table>`;

      case 'banner':
        return `
          <table cellpadding="0" cellspacing="0" style="font-family: Arial, sans-serif; font-size: 14px; background: linear-gradient(135deg, ${data.primaryColor}22 0%, #fff 100%); border-radius: 8px; padding: 15px;">
            <tr>
              ${photoHTML}
              <td style="vertical-align: top;">
                <div style="font-size: 18px; font-weight: bold; color: ${data.primaryColor};">${data.name}</div>
                <div style="font-weight: 500; margin: 4px 0;">${data.title}</div>
                <div style="color: #666; font-size: 13px;">${data.company}</div>
                <div style="margin-top: 10px; font-size: 12px; color: #555;">
                  ${data.email}<br>
                  ${data.phone}
                  ${data.website ? `<br>${data.website}` : ''}
                </div>
                ${socialHTML}
              </td>
            </tr>
          </table>`;

      default:
        return '';
    }
  }

  wrapForCopy(html) {
    return `<table cellpadding="0" cellspacing="0" border="0" style="font-family: Arial, sans-serif;">
<tr><td>
${html}
</td></tr>
</table>`;
  }

  async copyHTML() {
    if (!this.generatedHTML) {
      this.showToast('먼저 서명을 생성하세요.', 'warning');
      return;
    }

    // HTML을 클립보드에 복사 (리치 텍스트)
    try {
      const blob = new Blob([this.generatedHTML], { type: 'text/html' });
      await navigator.clipboard.write([
        new ClipboardItem({ 'text/html': blob, 'text/plain': new Blob([this.generatedHTML], { type: 'text/plain' }) })
      ]);
      this.showToast('서명이 복사되었습니다!', 'success');
    } catch (e) {
      // 폴백
      try {
        await navigator.clipboard.writeText(this.generatedHTML);
        this.showToast('HTML 코드가 복사되었습니다!', 'success');
      } catch (err) {
        this.showToast('복사 실패', 'error');
      }
    }
  }

  async copyPlainText() {
    const preview = this.elements.signaturePreview;
    const text = preview.innerText;
    try {
      await navigator.clipboard.writeText(text);
      this.showToast('텍스트가 복사되었습니다!', 'success');
    } catch (e) {
      this.showToast('복사 실패', 'error');
    }
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const emailSignature = new EmailSignature();
window.EmailSignature = emailSignature;

document.addEventListener('DOMContentLoaded', () => emailSignature.init());
