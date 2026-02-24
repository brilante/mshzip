/**
 * 소셜 이미지 리사이저 - ToolBase 기반
 * 플랫폼별 최적 크기로 이미지 변환
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var SocialResizer = class SocialResizer extends ToolBase {
  constructor() {
    super('SocialResizer');
    this.originalImage = null;
    this.selectedPlatform = null;

    this.platforms = [
      { id: 'ig-post', name: 'Instagram 포스트', icon: '', width: 1080, height: 1080 },
      { id: 'ig-story', name: 'Instagram 스토리', icon: '', width: 1080, height: 1920 },
      { id: 'fb-post', name: 'Facebook 포스트', icon: '', width: 1200, height: 630 },
      { id: 'fb-cover', name: 'Facebook 커버', icon: '', width: 820, height: 312 },
      { id: 'twitter', name: 'Twitter 포스트', icon: '', width: 1200, height: 675 },
      { id: 'linkedin', name: 'LinkedIn 포스트', icon: '', width: 1200, height: 627 },
      { id: 'youtube', name: 'YouTube 썸네일', icon: '', width: 1280, height: 720 },
      { id: 'pinterest', name: 'Pinterest 핀', icon: '', width: 1000, height: 1500 }
    ];
  }

  init() {
    this.initElements({
      platformGrid: 'platformGrid',
      dropZone: 'dropZone',
      previewCanvas: 'previewCanvas',
      previewSection: 'previewSection'
    });

    this.renderPlatforms();
    this.setupDropZone();

    console.log('[SocialResizer] 초기화 완료');
    return this;
  }

  renderPlatforms() {
    this.elements.platformGrid.innerHTML = this.platforms.map(p => `
      <div class="platform-card" data-id="${p.id}" onclick="socialResizer.selectPlatform('${p.id}')">
        <div class="platform-icon">${p.icon}</div>
        <div class="platform-name">${p.name}</div>
        <div class="platform-size">${p.width}×${p.height}</div>
      </div>
    `).join('');
  }

  setupDropZone() {
    const dropZone = this.elements.dropZone;

    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
      if (e.dataTransfer.files.length) {
        this.handleFile(e.dataTransfer.files[0]);
      }
    });
  }

  handleFile(file) {
    if (!file || !file.type.startsWith('image/')) {
      this.showToast('이미지 파일을 선택해주세요', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.originalImage = img;
        this.showToast('이미지 로드 완료! 플랫폼을 선택하세요', 'success');
        if (this.selectedPlatform) {
          this.resize();
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  selectPlatform(id) {
    this.selectedPlatform = this.platforms.find(p => p.id === id);

    document.querySelectorAll('.platform-card').forEach(card => {
      card.classList.toggle('selected', card.dataset.id === id);
    });

    if (this.originalImage) {
      this.resize();
    }
  }

  resize() {
    if (!this.originalImage || !this.selectedPlatform) return;

    const canvas = this.elements.previewCanvas;
    const ctx = canvas.getContext('2d');
    const { width, height } = this.selectedPlatform;

    canvas.width = width;
    canvas.height = height;

    const imgRatio = this.originalImage.width / this.originalImage.height;
    const canvasRatio = width / height;

    let srcX = 0, srcY = 0, srcW = this.originalImage.width, srcH = this.originalImage.height;

    if (imgRatio > canvasRatio) {
      srcW = this.originalImage.height * canvasRatio;
      srcX = (this.originalImage.width - srcW) / 2;
    } else {
      srcH = this.originalImage.width / canvasRatio;
      srcY = (this.originalImage.height - srcH) / 2;
    }

    ctx.drawImage(this.originalImage, srcX, srcY, srcW, srcH, 0, 0, width, height);

    this.elements.previewSection.style.display = 'block';
  }

  download() {
    if (!this.selectedPlatform) return;

    const canvas = this.elements.previewCanvas;
    const link = document.createElement('a');
    link.download = `${this.selectedPlatform.id}_${this.selectedPlatform.width}x${this.selectedPlatform.height}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();

    this.showToast('이미지 다운로드 완료!', 'success');
  }
}

// 전역 인스턴스 생성
const socialResizer = new SocialResizer();
window.SocialResizer = socialResizer;

document.addEventListener('DOMContentLoaded', () => socialResizer.init());
