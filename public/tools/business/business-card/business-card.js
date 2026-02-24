/**
 * 명함 생성기 - ToolBase 기반
 * 디지털 명함 디자인 및 생성
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var BusinessCard = class BusinessCard extends ToolBase {
  constructor() {
    super('BusinessCard');
  }

  init() {
    this.initElements({
      cardName: 'cardName',
      cardTitle: 'cardTitle',
      cardCompany: 'cardCompany',
      cardEmail: 'cardEmail',
      cardPhone: 'cardPhone',
      cardWebsite: 'cardWebsite',
      cardAddress: 'cardAddress',
      cardLogo: 'cardLogo',
      cardColor: 'cardColor',
      cardSecondaryColor: 'cardSecondaryColor',
      cardFront: 'cardFront',
      cardBack: 'cardBack'
    });

    this.updatePreview();

    console.log('[BusinessCard] 초기화 완료');
    return this;
  }

  updatePreview() {
    const name = this.elements.cardName.value || '홍길동';
    const title = this.elements.cardTitle.value || '대표이사';
    const company = this.elements.cardCompany.value || '회사명';
    const email = this.elements.cardEmail.value || 'email@company.com';
    const phone = this.elements.cardPhone.value || '010-1234-5678';
    const website = this.elements.cardWebsite.value || '';
    const address = this.elements.cardAddress.value || '';
    const logo = this.elements.cardLogo.value || '';

    const template = document.querySelector('input[name="cardTemplate"]:checked').value;
    const primaryColor = this.elements.cardColor.value;
    const secondaryColor = this.elements.cardSecondaryColor.value;

    this.renderCard({
      name, title, company, email, phone, website, address, logo,
      template, primaryColor, secondaryColor
    });
  }

  renderCard(data) {
    const frontEl = this.elements.cardFront;
    const backEl = this.elements.cardBack;

    const logoHTML = data.logo ? `<img src="${data.logo}" alt="Logo" style="height: 40px; object-fit: contain;">` : '';

    switch (data.template) {
      case 'classic':
        frontEl.innerHTML = `
          <div style="height: 100%; display: flex; flex-direction: column; justify-content: center; padding: 20px; background: linear-gradient(135deg, ${data.primaryColor} 0%, ${data.secondaryColor} 100%); color: white; border-radius: 12px;">
            ${logoHTML ? `<div style="margin-bottom: auto;">${logoHTML}</div>` : ''}
            <div style="font-size: 22px; font-weight: 700;">${data.name}</div>
            <div style="font-size: 14px; opacity: 0.9; margin-top: 4px;">${data.title}</div>
            <div style="font-size: 16px; font-weight: 500; margin-top: 8px;">${data.company}</div>
          </div>`;
        backEl.innerHTML = `
          <div style="height: 100%; display: flex; flex-direction: column; justify-content: center; padding: 20px; background: white; border: 2px solid ${data.primaryColor}; border-radius: 12px; font-size: 13px; color: #333;">
            <div style="margin-bottom: 8px;">${data.email}</div>
            <div style="margin-bottom: 8px;">${data.phone}</div>
            ${data.website ? `<div style="margin-bottom: 8px;">${data.website}</div>` : ''}
            ${data.address ? `<div>${data.address}</div>` : ''}
          </div>`;
        break;

      case 'modern':
        frontEl.innerHTML = `
          <div style="height: 100%; display: flex; padding: 20px; background: white; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
            <div style="width: 6px; background: ${data.primaryColor}; border-radius: 3px; margin-right: 20px;"></div>
            <div style="display: flex; flex-direction: column; justify-content: center;">
              ${logoHTML ? `<div style="margin-bottom: 12px;">${logoHTML}</div>` : ''}
              <div style="font-size: 20px; font-weight: 700; color: #333;">${data.name}</div>
              <div style="font-size: 13px; color: ${data.primaryColor}; margin-top: 4px;">${data.title}</div>
              <div style="font-size: 14px; color: #666; margin-top: 4px;">${data.company}</div>
            </div>
          </div>`;
        backEl.innerHTML = `
          <div style="height: 100%; display: flex; flex-direction: column; justify-content: center; padding: 20px; background: #f8f9fa; border-radius: 12px; font-size: 12px; color: #555;">
            <div style="margin-bottom: 10px;"><strong style="color: ${data.primaryColor};">Email</strong><br>${data.email}</div>
            <div style="margin-bottom: 10px;"><strong style="color: ${data.primaryColor};">Phone</strong><br>${data.phone}</div>
            ${data.website ? `<div style="margin-bottom: 10px;"><strong style="color: ${data.primaryColor};">Web</strong><br>${data.website}</div>` : ''}
            ${data.address ? `<div><strong style="color: ${data.primaryColor};">Address</strong><br>${data.address}</div>` : ''}
          </div>`;
        break;

      case 'minimal':
        frontEl.innerHTML = `
          <div style="height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 20px; background: white; border-radius: 12px; text-align: center;">
            <div style="font-size: 24px; font-weight: 300; letter-spacing: 2px; color: #333;">${data.name}</div>
            <div style="width: 40px; height: 2px; background: ${data.primaryColor}; margin: 12px 0;"></div>
            <div style="font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 1px;">${data.title}</div>
          </div>`;
        backEl.innerHTML = `
          <div style="height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 20px; background: white; border-radius: 12px; text-align: center; font-size: 11px; color: #666;">
            <div>${data.email}</div>
            <div style="margin: 4px 0;">${data.phone}</div>
            ${data.website ? `<div>${data.website}</div>` : ''}
          </div>`;
        break;

      case 'bold':
        frontEl.innerHTML = `
          <div style="height: 100%; display: flex; flex-direction: column; justify-content: flex-end; padding: 20px; background: ${data.primaryColor}; border-radius: 12px; color: white;">
            <div style="font-size: 28px; font-weight: 900; line-height: 1.1;">${data.name}</div>
            <div style="font-size: 14px; margin-top: 8px; opacity: 0.8;">${data.title} @ ${data.company}</div>
          </div>`;
        backEl.innerHTML = `
          <div style="height: 100%; display: flex; flex-direction: column; justify-content: center; padding: 20px; background: #1a1a1a; border-radius: 12px; color: white; font-size: 13px;">
            <div style="margin-bottom: 8px; color: ${data.primaryColor};">${data.email}</div>
            <div style="margin-bottom: 8px;">${data.phone}</div>
            ${data.website ? `<div style="margin-bottom: 8px;">${data.website}</div>` : ''}
            ${data.address ? `<div style="font-size: 11px; color: #888;">${data.address}</div>` : ''}
          </div>`;
        break;
    }
  }

  flipCard() {
    document.querySelector('.card-flipper').classList.toggle('flipped');
  }

  async downloadCard() {
    this.showToast('명함 이미지 다운로드는 스크린샷 기능을 사용해 주세요.', 'info');
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const businessCard = new BusinessCard();
window.BusinessCard = businessCard;

document.addEventListener('DOMContentLoaded', () => businessCard.init());
