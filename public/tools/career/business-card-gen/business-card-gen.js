/**
 * 명함 생성기 - ToolBase 기반
 * 디지털 명함 디자인
 * @created 2026-01-13
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var BusinessCardGen = class BusinessCardGen extends ToolBase {
  constructor() {
    super('BusinessCardGen');
    this.template = 'classic';
    this.color = '#1f2937';
    this.colors = {
      '#1f2937': { bg: '#1f2937', text: '#ffffff' },
      '#3b82f6': { bg: '#3b82f6', text: '#ffffff' },
      '#10b981': { bg: '#10b981', text: '#ffffff' },
      '#8b5cf6': { bg: '#8b5cf6', text: '#ffffff' },
      '#ef4444': { bg: '#ef4444', text: '#ffffff' },
      '#f59e0b': { bg: '#f59e0b', text: '#1f2937' },
      'gradient1': { bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', text: '#ffffff' }
    };
  }

  init() {
    this.initElements({
      cardName: 'cardName',
      cardTitle: 'cardTitle',
      cardCompany: 'cardCompany',
      cardEmail: 'cardEmail',
      cardPhone: 'cardPhone',
      cardWebsite: 'cardWebsite',
      cardPreview: 'cardPreview'
    });

    this.loadData();
    this.updatePreview();

    console.log('[BusinessCardGen] 초기화 완료');
    return this;
  }

  loadData() {
    try {
      const saved = localStorage.getItem('businessCardData');
      if (saved) {
        const data = JSON.parse(saved);
        this.elements.cardName.value = data.name || '';
        this.elements.cardTitle.value = data.title || '';
        this.elements.cardCompany.value = data.company || '';
        this.elements.cardEmail.value = data.email || '';
        this.elements.cardPhone.value = data.phone || '';
        this.elements.cardWebsite.value = data.website || '';
        if (data.template) this.setTemplate(data.template);
        if (data.color) this.setColor(data.color);
      }
    } catch (e) {
      console.error('Failed to load business card data:', e);
    }
  }

  saveData() {
    try {
      const data = {
        name: this.elements.cardName.value,
        title: this.elements.cardTitle.value,
        company: this.elements.cardCompany.value,
        email: this.elements.cardEmail.value,
        phone: this.elements.cardPhone.value,
        website: this.elements.cardWebsite.value,
        template: this.template,
        color: this.color
      };
      localStorage.setItem('businessCardData', JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save business card data:', e);
    }
  }

  setTemplate(template) {
    this.template = template;
    document.querySelectorAll('.template-card').forEach(card => {
      card.classList.toggle('active', card.dataset.template === template);
    });
    this.updatePreview();
  }

  setColor(color) {
    this.color = color;
    document.querySelectorAll('.color-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.color === color);
    });
    this.updatePreview();
  }

  getData() {
    return {
      name: this.elements.cardName.value.trim() || '이름',
      title: this.elements.cardTitle.value.trim() || '직책',
      company: this.elements.cardCompany.value.trim(),
      email: this.elements.cardEmail.value.trim(),
      phone: this.elements.cardPhone.value.trim(),
      website: this.elements.cardWebsite.value.trim()
    };
  }

  updatePreview() {
    this.saveData();
    const data = this.getData();
    const colorScheme = this.colors[this.color];
    const card = this.elements.cardPreview;

    let contactHtml = '';
    if (data.email) contactHtml += `<div>${data.email}</div>`;
    if (data.phone) contactHtml += `<div>${data.phone}</div>`;
    if (data.website) contactHtml += `<div>${data.website}</div>`;

    let style = '';
    let cardHtml = '';

    if (this.template === 'classic') {
      style = `background: ${colorScheme.bg}; color: ${colorScheme.text};`;
      cardHtml = `
        <div class="card-name">${data.name}</div>
        <div class="card-title">${data.title}</div>
        <div class="card-contact">${contactHtml}</div>
        ${data.company ? `<div class="card-company">${data.company}</div>` : ''}
      `;
    } else if (this.template === 'modern') {
      style = `background: ${colorScheme.bg}; color: ${colorScheme.text}; display: flex; flex-direction: column; justify-content: space-between;`;
      cardHtml = `
        <div>
          <div style="font-size: 1.5rem; font-weight: bold;">${data.name}</div>
          <div style="opacity: 0.8;">${data.title}</div>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: flex-end;">
          <div style="font-size: 0.75rem; line-height: 1.5;">${contactHtml}</div>
          ${data.company ? `<div style="font-weight: 600; font-size: 0.9rem;">${data.company}</div>` : ''}
        </div>
      `;
    } else if (this.template === 'minimal') {
      style = `background: #ffffff; color: #1f2937; border: 2px solid ${this.color === 'gradient1' ? '#667eea' : this.color};`;
      cardHtml = `
        <div style="border-left: 3px solid ${this.color === 'gradient1' ? '#667eea' : this.color}; padding-left: 1rem;">
          <div style="font-size: 1.25rem; font-weight: bold; color: ${this.color === 'gradient1' ? '#667eea' : this.color};">${data.name}</div>
          <div style="font-size: 0.85rem; color: #6b7280; margin-bottom: 0.75rem;">${data.title}${data.company ? ` · ${data.company}` : ''}</div>
          <div style="font-size: 0.75rem; color: #4b5563; line-height: 1.6;">${contactHtml}</div>
        </div>
      `;
    }

    card.style.cssText = style + ' width: 350px; height: 200px; border-radius: 8px; padding: 1.5rem; box-shadow: 0 10px 25px rgba(0,0,0,0.15); position: relative; overflow: hidden;';
    card.innerHTML = cardHtml;
  }

  async copyAsText() {
    const data = this.getData();
    let text = `${data.name}\n${data.title}`;
    if (data.company) text += `\n${data.company}`;
    text += '\n';
    if (data.email) text += `\n${data.email}`;
    if (data.phone) text += `\n${data.phone}`;
    if (data.website) text += `\n${data.website}`;

    try {
      await navigator.clipboard.writeText(text);
      this.showToast('명함 정보가 클립보드에 복사되었습니다.', 'success');
    } catch (e) {
      this.showToast('복사 실패', 'error');
    }
  }

  download() {
    const data = this.getData();

    // HTML을 캔버스로 변환 (간단한 방식)
    const canvas = document.createElement('canvas');
    canvas.width = 700;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');

    // 배경
    const colorScheme = this.colors[this.color];
    if (this.color === 'gradient1') {
      const gradient = ctx.createLinearGradient(0, 0, 700, 400);
      gradient.addColorStop(0, '#667eea');
      gradient.addColorStop(1, '#764ba2');
      ctx.fillStyle = gradient;
    } else if (this.template === 'minimal') {
      ctx.fillStyle = '#ffffff';
    } else {
      ctx.fillStyle = colorScheme.bg;
    }

    // 둥근 사각형
    ctx.beginPath();
    ctx.roundRect(0, 0, 700, 400, 16);
    ctx.fill();

    // 테두리 (minimal)
    if (this.template === 'minimal') {
      ctx.strokeStyle = this.color === 'gradient1' ? '#667eea' : this.color;
      ctx.lineWidth = 4;
      ctx.stroke();
    }

    // 텍스트
    const textColor = this.template === 'minimal' ? '#1f2937' : colorScheme.text;
    const accentColor = this.color === 'gradient1' ? '#667eea' : this.color;

    ctx.fillStyle = this.template === 'minimal' ? accentColor : textColor;
    ctx.font = 'bold 48px Arial';
    ctx.fillText(data.name, 50, 80);

    ctx.fillStyle = this.template === 'minimal' ? '#6b7280' : textColor;
    ctx.globalAlpha = this.template === 'minimal' ? 1 : 0.8;
    ctx.font = '28px Arial';
    ctx.fillText(data.title, 50, 120);
    ctx.globalAlpha = 1;

    // 연락처
    ctx.font = '24px Arial';
    ctx.fillStyle = this.template === 'minimal' ? '#4b5563' : textColor;
    let y = 180;
    if (data.email) { ctx.fillText(`${data.email}`, 50, y); y += 36; }
    if (data.phone) { ctx.fillText(`${data.phone}`, 50, y); y += 36; }
    if (data.website) { ctx.fillText(`${data.website}`, 50, y); }

    // 회사
    if (data.company) {
      ctx.fillStyle = textColor;
      ctx.font = 'bold 28px Arial';
      ctx.textAlign = 'right';
      ctx.fillText(data.company, 650, 360);
    }

    // 다운로드
    const link = document.createElement('a');
    link.download = `${data.name}_명함.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    this.showToast('명함이 다운로드되었습니다!', 'success');
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const businessCardGen = new BusinessCardGen();
window.BusinessCardGen = businessCardGen;

document.addEventListener('DOMContentLoaded', () => businessCardGen.init());
