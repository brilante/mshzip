/**
 * 스토리 템플릿 - ToolBase 기반
 * Instagram/TikTok 스토리 템플릿
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var StoryTemplate = class StoryTemplate extends ToolBase {
  constructor() {
    super('StoryTemplate');
    this.currentCategory = 'all';
    this.currentTemplate = null;

    this.templates = [
      {
        id: 'gradient-purple',
        name: '퍼플 그라디언트',
        category: 'quote',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        textColor: '#ffffff'
      },
      {
        id: 'gradient-sunset',
        name: '선셋',
        category: 'quote',
        background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        textColor: '#ffffff'
      },
      {
        id: 'gradient-ocean',
        name: '오션',
        category: 'quote',
        background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        textColor: '#ffffff'
      },
      {
        id: 'gradient-mint',
        name: '민트',
        category: 'quote',
        background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
        textColor: '#1a1a2e'
      },
      {
        id: 'promo-red',
        name: '세일 레드',
        category: 'promo',
        background: 'linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%)',
        textColor: '#ffffff'
      },
      {
        id: 'promo-gold',
        name: '프리미엄 골드',
        category: 'promo',
        background: 'linear-gradient(135deg, #f7971e 0%, #ffd200 100%)',
        textColor: '#1a1a2e'
      },
      {
        id: 'promo-black',
        name: '블랙 프라이데이',
        category: 'promo',
        background: 'linear-gradient(135deg, #232526 0%, #414345 100%)',
        textColor: '#ffffff'
      },
      {
        id: 'announce-blue',
        name: '공지 블루',
        category: 'announcement',
        background: 'linear-gradient(135deg, #0052d4 0%, #4364f7 50%, #6fb1fc 100%)',
        textColor: '#ffffff'
      },
      {
        id: 'announce-dark',
        name: '다크 모드',
        category: 'announcement',
        background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
        textColor: '#ffffff'
      },
      {
        id: 'qna-pink',
        name: 'Q&A 핑크',
        category: 'qna',
        background: 'linear-gradient(135deg, #ee9ca7 0%, #ffdde1 100%)',
        textColor: '#1a1a2e'
      },
      {
        id: 'qna-green',
        name: 'Q&A 그린',
        category: 'qna',
        background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
        textColor: '#ffffff'
      },
      {
        id: 'countdown-neon',
        name: '네온 카운트다운',
        category: 'countdown',
        background: 'linear-gradient(135deg, #fc00ff 0%, #00dbde 100%)',
        textColor: '#ffffff'
      },
      {
        id: 'countdown-fire',
        name: '파이어',
        category: 'countdown',
        background: 'linear-gradient(135deg, #f12711 0%, #f5af19 100%)',
        textColor: '#ffffff'
      },
      {
        id: 'minimal-white',
        name: '미니멀 화이트',
        category: 'quote',
        background: '#ffffff',
        textColor: '#1a1a2e'
      },
      {
        id: 'minimal-black',
        name: '미니멀 블랙',
        category: 'quote',
        background: '#1a1a2e',
        textColor: '#ffffff'
      },
      {
        id: 'pastel-lavender',
        name: '파스텔 라벤더',
        category: 'quote',
        background: 'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)',
        textColor: '#1a1a2e'
      }
    ];
  }

  init() {
    this.initElements({
      templatesGrid: 'templatesGrid',
      storyPreview: 'storyPreview',
      mainText: 'mainText',
      subText: 'subText',
      previewTitle: 'previewTitle',
      previewSubtitle: 'previewSubtitle'
    });

    this.renderTemplates();
    this.selectTemplate(this.templates[0]);

    console.log('[StoryTemplate] 초기화 완료');
    return this;
  }

  selectCategory(category) {
    this.currentCategory = category;
    document.querySelectorAll('.category-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.category === category);
    });
    this.renderTemplates();
  }

  renderTemplates() {
    const filtered = this.currentCategory === 'all'
      ? this.templates
      : this.templates.filter(t => t.category === this.currentCategory);

    this.elements.templatesGrid.innerHTML = filtered.map(template => `
      <div class="template-card ${this.currentTemplate?.id === template.id ? 'active' : ''}"
           onclick="storyTemplate.selectTemplate(storyTemplate.templates.find(t => t.id === '${template.id}'))">
        <div class="template-preview" style="background: ${template.background}; color: ${template.textColor};">
          <span style="font-size: 0.8rem; font-weight: 600;">Aa</span>
        </div>
        <div class="template-name">${template.name}</div>
      </div>
    `).join('');
  }

  selectTemplate(template) {
    this.currentTemplate = template;

    document.querySelectorAll('.template-card').forEach(card => {
      card.classList.remove('active');
    });

    const preview = this.elements.storyPreview;
    preview.style.background = template.background;
    preview.style.color = template.textColor;

    this.renderTemplates();
    this.updatePreview();
  }

  updatePreview() {
    const mainText = this.elements.mainText.value || '오늘의 한마디';
    const subText = this.elements.subText.value;

    this.elements.previewTitle.textContent = mainText;
    this.elements.previewSubtitle.textContent = subText;
  }

  download() {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d');

    const template = this.currentTemplate;
    if (template.background.includes('gradient')) {
      const colors = template.background.match(/#[a-fA-F0-9]{6}/g);
      if (colors && colors.length >= 2) {
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, colors[0]);
        gradient.addColorStop(1, colors[colors.length - 1]);
        ctx.fillStyle = gradient;
      }
    } else {
      ctx.fillStyle = template.background;
    }
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const mainText = this.elements.mainText.value || '오늘의 한마디';
    const subText = this.elements.subText.value;

    ctx.fillStyle = template.textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.font = 'bold 72px "Noto Sans KR", Arial, sans-serif';
    ctx.fillText(mainText, canvas.width / 2, canvas.height / 2 - (subText ? 50 : 0));

    if (subText) {
      ctx.font = '48px "Noto Sans KR", Arial, sans-serif';
      ctx.globalAlpha = 0.8;
      ctx.fillText(subText, canvas.width / 2, canvas.height / 2 + 80);
    }

    const link = document.createElement('a');
    link.download = `story-${template.id}-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();

    this.showToast('스토리 이미지가 다운로드되었습니다!', 'success');
  }

  copyCSS() {
    const template = this.currentTemplate;
    const css = `.story-template {
  width: 100%;
  height: 100%;
  background: ${template.background};
  color: ${template.textColor};
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 2rem;
}`;

    navigator.clipboard.writeText(css);
    this.showToast('CSS 코드가 복사되었습니다!', 'success');
  }
}

// 전역 인스턴스 생성
const storyTemplate = new StoryTemplate();
window.StoryTemplate = storyTemplate;

document.addEventListener('DOMContentLoaded', () => storyTemplate.init());
