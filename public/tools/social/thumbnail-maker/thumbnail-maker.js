/**
 * 썸네일 메이커 - ToolBase 기반
 * YouTube, Instagram용 썸네일 제작
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var ThumbnailMaker = class ThumbnailMaker extends ToolBase {
  constructor() {
    super('ThumbnailMaker');
    this.canvas = null;
    this.ctx = null;
    this.currentSize = 'youtube';
    this.bgColor = '#1a1a2e';
    this.bgGradient = null;
    this.textColor = '#ffffff';

    this.sizes = {
      'youtube': { width: 1280, height: 720 },
      'instagram-post': { width: 1080, height: 1080 },
      'instagram-story': { width: 1080, height: 1920 },
      'twitter': { width: 1200, height: 675 },
      'facebook': { width: 1200, height: 630 },
      'tiktok': { width: 1080, height: 1920 }
    };
  }

  init() {
    this.initElements({
      thumbnailCanvas: 'thumbnailCanvas',
      currentSize: 'currentSize',
      titleText: 'titleText',
      subtitleText: 'subtitleText',
      fontSize: 'fontSize'
    });

    this.canvas = this.elements.thumbnailCanvas;
    this.ctx = this.canvas.getContext('2d');
    this.updateCanvas();

    console.log('[ThumbnailMaker] 초기화 완료');
    return this;
  }

  selectSize(size) {
    this.currentSize = size;
    const dim = this.sizes[size];
    this.canvas.width = dim.width;
    this.canvas.height = dim.height;

    document.querySelectorAll('.size-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.size === size);
    });

    this.elements.currentSize.textContent = `${dim.width} × ${dim.height}`;
    this.updateCanvas();
  }

  selectColor(color) {
    this.bgColor = color;
    this.bgGradient = null;

    document.querySelectorAll('.color-preset[data-color]').forEach(el => {
      el.classList.toggle('active', el.dataset.color === color);
    });
    document.querySelectorAll('.gradient-preset').forEach(el => {
      el.classList.remove('active');
    });

    this.updateCanvas();
  }

  selectGradient(gradient) {
    this.bgGradient = gradient;

    document.querySelectorAll('.color-preset[data-color]').forEach(el => {
      el.classList.remove('active');
    });
    document.querySelectorAll('.gradient-preset').forEach(el => {
      el.classList.toggle('active', el.style.background === gradient);
    });

    this.updateCanvas();
  }

  selectTextColor(color) {
    this.textColor = color;

    document.querySelectorAll('.color-preset[data-textcolor]').forEach(el => {
      el.classList.toggle('active', el.dataset.textcolor === color);
    });

    this.updateCanvas();
  }

  updateCanvas() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    if (this.bgGradient) {
      const colors = this.bgGradient.match(/#[a-fA-F0-9]{6}/g);
      if (colors && colors.length >= 2) {
        const gradient = ctx.createLinearGradient(0, 0, w, h);
        gradient.addColorStop(0, colors[0]);
        gradient.addColorStop(1, colors[1]);
        ctx.fillStyle = gradient;
      }
    } else {
      ctx.fillStyle = this.bgColor;
    }
    ctx.fillRect(0, 0, w, h);

    const title = this.elements.titleText.value || '썸네일 제목';
    const subtitle = this.elements.subtitleText.value;
    const fontSize = parseInt(this.elements.fontSize.value);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.font = `bold ${fontSize}px "Noto Sans KR", Arial, sans-serif`;
    ctx.fillStyle = this.textColor;

    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 3;

    const titleY = subtitle ? h * 0.45 : h * 0.5;
    this.wrapText(ctx, title, w / 2, titleY, w * 0.8, fontSize * 1.2);

    if (subtitle) {
      ctx.font = `${fontSize * 0.5}px "Noto Sans KR", Arial, sans-serif`;
      ctx.fillStyle = this.textColor;
      ctx.globalAlpha = 0.8;
      ctx.fillText(subtitle, w / 2, h * 0.65);
      ctx.globalAlpha = 1;
    }

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }

  wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split('');
    let line = '';
    let lines = [];

    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i];
      const metrics = ctx.measureText(testLine);

      if (metrics.width > maxWidth && line.length > 0) {
        lines.push(line);
        line = words[i];
      } else {
        line = testLine;
      }
    }
    lines.push(line);

    const startY = y - (lines.length - 1) * lineHeight / 2;
    lines.forEach((l, i) => {
      ctx.fillText(l, x, startY + i * lineHeight);
    });
  }

  download() {
    const link = document.createElement('a');
    link.download = `thumbnail-${this.currentSize}-${Date.now()}.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();

    this.showToast('썸네일이 다운로드되었습니다!', 'success');
  }

  reset() {
    this.selectSize('youtube');
    this.selectColor('#1a1a2e');
    this.selectTextColor('#ffffff');
    this.elements.titleText.value = '썸네일 제목';
    this.elements.subtitleText.value = '';
    this.elements.fontSize.value = 64;
    this.updateCanvas();

    this.showToast('초기화되었습니다.', 'success');
  }
}

// 전역 인스턴스 생성
const thumbnailMaker = new ThumbnailMaker();
window.ThumbnailMaker = thumbnailMaker;

document.addEventListener('DOMContentLoaded', () => thumbnailMaker.init());
