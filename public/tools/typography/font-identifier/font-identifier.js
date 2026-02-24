/**
 * 폰트 식별기 - ToolBase 기반
 * 이미지에서 폰트 특성 분석 및 추천
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class FontIdentifier extends ToolBase {
  constructor() {
    super('FontIdentifier');
  }

  init() {
    this.initElements({
      uploadArea: 'uploadArea',
      imageInput: 'imageInput',
      previewArea: 'previewArea',
      previewImage: 'previewImage',
      analysisSection: 'analysisSection',
      characteristics: 'characteristics',
      recommendations: 'recommendations'
    });

    this.bindEvents();

    console.log('[FontIdentifier] 초기화 완료');
    return this;
  }

  bindEvents() {
    const { uploadArea, imageInput } = this.elements;

    uploadArea.addEventListener('click', () => imageInput.click());

    uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadArea.style.borderColor = '#a8edea';
    });

    uploadArea.addEventListener('dragleave', () => {
      uploadArea.style.borderColor = '#ddd';
    });

    uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadArea.style.borderColor = '#ddd';
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) {
        this.handleImage(file);
      }
    });

    imageInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) this.handleImage(file);
    });
  }

  handleImage(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      this.elements.previewImage.src = e.target.result;
      this.elements.uploadArea.style.display = 'none';
      this.elements.previewArea.style.display = 'block';
      this.analyzeImage();
    };
    reader.readAsDataURL(file);
  }

  removeImage() {
    this.elements.previewImage.src = '';
    this.elements.uploadArea.style.display = 'block';
    this.elements.previewArea.style.display = 'none';
    this.elements.analysisSection.style.display = 'none';
    this.elements.imageInput.value = '';
  }

  analyzeImage() {
    // 시뮬레이션된 분석 결과 (실제로는 ML 모델이 필요)
    const characteristics = [
      { label: '세리프 타입', value: '산세리프 (Sans-serif)' },
      { label: '굵기', value: 'Regular ~ Bold' },
      { label: '스타일', value: '현대적, 기하학적' },
      { label: '용도 추천', value: '제목, 본문' }
    ];

    const recommendations = [
      { name: 'Roboto', category: 'Sans-serif', similarity: '95%' },
      { name: 'Open Sans', category: 'Sans-serif', similarity: '90%' },
      { name: 'Noto Sans KR', category: 'Sans-serif (한글)', similarity: '88%' },
      { name: 'Lato', category: 'Sans-serif', similarity: '85%' },
      { name: 'Montserrat', category: 'Sans-serif', similarity: '82%' }
    ];

    this.elements.characteristics.innerHTML = characteristics.map(char => `
      <div class="char-item">
        <label>${char.label}</label>
        <span>${char.value}</span>
      </div>
    `).join('');

    this.elements.recommendations.innerHTML = recommendations.map(rec => `
      <div class="rec-item">
        <div class="rec-info">
          <h5>${rec.name}</h5>
          <p>${rec.category} · 유사도 ${rec.similarity}</p>
        </div>
        <div class="rec-actions">
          <button onclick="window.open('https://fonts.google.com/specimen/${rec.name.replace(/ /g, '+')}', '_blank')">Google Fonts에서 보기</button>
        </div>
      </div>
    `).join('');

    this.elements.analysisSection.style.display = 'block';
  }
}

// 전역 인스턴스 생성
const fontIdentifier = new FontIdentifier();
window.FontIdentifier = fontIdentifier;

document.addEventListener('DOMContentLoaded', () => fontIdentifier.init());
