/**
 * AI 이미지 생성 - ToolBase 기반
 * 텍스트 프롬프트로 이미지 생성
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class AiImageGenTool extends ToolBase {
  constructor() {
    super('AiImageGenTool');
    this.selectedModel = 'dall-e-3';
    this.selectedStyle = 'photorealistic';
    this.generatedImages = [];
    this.lastPrompt = '';

    this.modelNames = {
      'dall-e-3': 'DALL·E 3',
      'stable-diffusion': 'Stable Diffusion XL',
      'midjourney': 'Midjourney',
      'imagen-3': 'Imagen 3'
    };

    // 데모용 샘플 이미지 (placeholder)
    this.sampleImages = [
      'https://picsum.photos/seed/ai1/512/512',
      'https://picsum.photos/seed/ai2/512/512',
      'https://picsum.photos/seed/ai3/512/512',
      'https://picsum.photos/seed/ai4/512/512',
      'https://picsum.photos/seed/ai5/512/512',
      'https://picsum.photos/seed/ai6/512/512',
      'https://picsum.photos/seed/ai7/512/512',
      'https://picsum.photos/seed/ai8/512/512'
    ];
  }

  init() {
    this.initElements({
      promptInput: 'promptInput',
      countSelect: 'countSelect',
      outputArea: 'outputArea',
      loadingOverlay: 'loadingOverlay',
      progressFill: 'progressFill'
    });

    console.log('[AiImageGenTool] 초기화 완료');
    return this;
  }

  selectModel(model) {
    this.selectedModel = model;
    document.querySelectorAll('.model-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.model === model);
    });
  }

  selectStyle(style) {
    this.selectedStyle = style;
    document.querySelectorAll('.style-chip').forEach(chip => {
      chip.classList.toggle('active', chip.dataset.style === style);
    });
  }

  async generate() {
    const prompt = this.elements.promptInput.value.trim();

    if (!prompt) {
      this.showToast('이미지를 설명하는 프롬프트를 입력하세요.', 'error');
      return;
    }

    this.lastPrompt = prompt;
    const count = parseInt(this.elements.countSelect.value);

    // 로딩 표시
    const outputArea = this.elements.outputArea;
    const loadingOverlay = document.getElementById('loadingOverlay');
    const progressFill = document.getElementById('progressFill');
    outputArea.querySelector('.output-placeholder')?.remove();
    loadingOverlay.classList.add('active');

    // 프로그레스 애니메이션
    let progress = 0;
    const progressInterval = setInterval(() => {
      progress += Math.random() * 15;
      if (progress > 90) progress = 90;
      progressFill.style.width = progress + '%';
    }, 300);

    // 시뮬레이션 딜레이
    await this.delay(2000 + Math.random() * 2000);

    clearInterval(progressInterval);
    progressFill.style.width = '100%';

    await this.delay(300);

    // 이미지 생성 (데모)
    this.generatedImages = this.generateDemoImages(count);

    // 결과 표시
    loadingOverlay.classList.remove('active');
    this.renderImages();

    this.showToast(`${this.modelNames[this.selectedModel]}로 ${count}장 생성 완료!`);
  }

  generateDemoImages(count) {
    const images = [];
    const timestamp = Date.now();
    for (let i = 0; i < count; i++) {
      // 랜덤 시드로 다양한 이미지 생성
      const seed = timestamp + i + Math.floor(Math.random() * 1000);
      images.push(`https://picsum.photos/seed/${seed}/512/512`);
    }
    return images;
  }

  renderImages() {
    const outputArea = this.elements.outputArea;

    if (this.generatedImages.length === 1) {
      outputArea.innerHTML = `
        <img src="${this.generatedImages[0]}" class="generated-image" alt="Generated Image" onclick="aiImageGenTool.viewImage(0)">
        <div class="loading-overlay" id="loadingOverlay">
          <div class="loading-spinner"></div>
          <div>이미지 생성 중...</div>
          <div class="progress-bar"><div class="progress-fill" id="progressFill"></div></div>
        </div>
      `;
    } else {
      const imagesHtml = this.generatedImages.map((img, i) =>
        `<img src="${img}" alt="Generated Image ${i + 1}" onclick="aiImageGenTool.viewImage(${i})">`
      ).join('');

      outputArea.innerHTML = `
        <div class="image-grid">${imagesHtml}</div>
        <div class="loading-overlay" id="loadingOverlay">
          <div class="loading-spinner"></div>
          <div>이미지 생성 중...</div>
          <div class="progress-bar"><div class="progress-fill" id="progressFill"></div></div>
        </div>
      `;
    }
  }

  viewImage(index) {
    const img = this.generatedImages[index];
    // 새 탭에서 이미지 열기
    window.open(img, '_blank');
  }

  regenerate() {
    if (!this.lastPrompt) {
      this.showToast('먼저 이미지를 생성해주세요.', 'error');
      return;
    }
    this.generate();
  }

  async downloadAll() {
    if (this.generatedImages.length === 0) {
      this.showToast('다운로드할 이미지가 없습니다.', 'error');
      return;
    }

    // 데모에서는 링크 제공
    this.showToast('데모 모드: 이미지를 클릭하여 개별 다운로드하세요.', 'info');
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 전역 인스턴스 생성
const aiImageGenTool = new AiImageGenTool();
window.AIImageGen = aiImageGenTool;

document.addEventListener('DOMContentLoaded', () => aiImageGenTool.init());
console.log('[AiImageGenTool] 모듈 로드 완료');
