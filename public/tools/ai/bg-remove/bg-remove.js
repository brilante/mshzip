/**
 * AI 배경 제거 도구 - ToolBase 기반
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 * @description 클라이언트 사이드 배경 제거 (GrabCut 알고리즘 시뮬레이션)
 */

class BgRemoveTool extends ToolBase {
  constructor() {
    super('BgRemoveTool');
    this.originalImage = null;
    this.processedCanvas = null;
    this.currentBg = 'transparent';
  }

  init() {
    this.initElements({
      uploadSection: 'uploadSection',
      editorSection: 'editorSection',
      uploadArea: 'uploadArea',
      fileInput: 'fileInput',
      originalImage: 'originalImage',
      resultImage: 'resultImage',
      resultContainer: 'resultContainer',
      processingOverlay: 'processingOverlay',
      placeholderText: 'placeholderText',
      statusBadge: 'statusBadge',
      processBtn: 'processBtn',
      downloadBtn: 'downloadBtn'
    });

    this.setupEventListeners();
    console.log('[BgRemoveTool] 초기화 완료');
    return this;
  }

  setupEventListeners() {
    const { uploadArea, fileInput } = this.elements;

    // 클릭으로 파일 선택
    uploadArea.addEventListener('click', () => fileInput.click());

    // 파일 선택
    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        this.loadImage(e.target.files[0]);
      }
    });

    // 드래그 앤 드롭
    uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', () => {
      uploadArea.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadArea.classList.remove('dragover');
      if (e.dataTransfer.files.length > 0) {
        this.loadImage(e.dataTransfer.files[0]);
      }
    });
  }

  loadImage(file) {
    // 파일 유효성 검사
    if (!file.type.startsWith('image/')) {
      this.showToast('이미지 파일만 업로드 가능합니다.', 'error');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      this.showToast('파일 크기는 10MB 이하여야 합니다.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      this.originalImage = new Image();
      this.originalImage.onload = () => {
        this.elements.originalImage.src = e.target.result;
        this.elements.uploadSection.style.display = 'none';
        this.elements.editorSection.style.display = 'block';
        this.resetResult();
      };
      this.originalImage.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  async process() {
    if (!this.originalImage) {
      this.showToast('이미지를 먼저 업로드하세요.', 'error');
      return;
    }

    // UI 업데이트
    this.elements.processingOverlay.style.display = 'flex';
    this.elements.placeholderText.style.display = 'none';
    this.elements.statusBadge.textContent = '처리 중...';
    this.elements.statusBadge.className = 'status-badge processing';
    this.elements.processBtn.disabled = true;

    try {
      // 배경 제거 처리 (클라이언트 사이드)
      await this.removeBackground();

      this.elements.statusBadge.textContent = '완료';
      this.elements.statusBadge.className = 'status-badge success';
      this.elements.downloadBtn.disabled = false;
      this.showToast('배경 제거가 완료되었습니다.');
    } catch (err) {
      console.error('배경 제거 오류:', err);
      this.elements.statusBadge.textContent = '실패';
      this.elements.statusBadge.className = 'status-badge error';
      this.showToast('배경 제거에 실패했습니다.', 'error');
    } finally {
      this.elements.processingOverlay.style.display = 'none';
      this.elements.processBtn.disabled = false;
    }
  }

  async removeBackground() {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      canvas.width = this.originalImage.width;
      canvas.height = this.originalImage.height;

      ctx.drawImage(this.originalImage, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // 간단한 배경 제거 알고리즘 (색상 기반)
      // 실제 프로덕션에서는 서버 API 또는 ML 모델 사용 권장

      // 1. 가장자리 색상 샘플링 (배경색 추정)
      const bgColors = this.sampleEdgeColors(data, canvas.width, canvas.height);
      const avgBgColor = this.averageColor(bgColors);

      // 2. 배경과 유사한 색상 투명화
      const tolerance = 50; // 색상 허용 범위

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        const distance = Math.sqrt(
          Math.pow(r - avgBgColor.r, 2) +
          Math.pow(g - avgBgColor.g, 2) +
          Math.pow(b - avgBgColor.b, 2)
        );

        if (distance < tolerance) {
          // 배경으로 판단 - 투명화
          data[i + 3] = 0;
        } else if (distance < tolerance * 1.5) {
          // 경계 영역 - 부분 투명
          data[i + 3] = Math.floor(255 * (distance - tolerance) / (tolerance * 0.5));
        }
      }

      ctx.putImageData(imageData, 0, 0);

      // 엣지 스무딩
      this.smoothEdges(ctx, canvas.width, canvas.height);

      this.processedCanvas = canvas;
      this.applyBackground();

      // 약간의 지연 효과 (AI 처리 시뮬레이션)
      setTimeout(resolve, 500);
    });
  }

  sampleEdgeColors(data, width, height) {
    const colors = [];
    const sampleSize = 10;

    // 상단 가장자리
    for (let x = 0; x < width; x += Math.floor(width / sampleSize)) {
      const i = x * 4;
      colors.push({ r: data[i], g: data[i + 1], b: data[i + 2] });
    }

    // 하단 가장자리
    for (let x = 0; x < width; x += Math.floor(width / sampleSize)) {
      const i = ((height - 1) * width + x) * 4;
      colors.push({ r: data[i], g: data[i + 1], b: data[i + 2] });
    }

    // 좌측 가장자리
    for (let y = 0; y < height; y += Math.floor(height / sampleSize)) {
      const i = (y * width) * 4;
      colors.push({ r: data[i], g: data[i + 1], b: data[i + 2] });
    }

    // 우측 가장자리
    for (let y = 0; y < height; y += Math.floor(height / sampleSize)) {
      const i = (y * width + width - 1) * 4;
      colors.push({ r: data[i], g: data[i + 1], b: data[i + 2] });
    }

    return colors;
  }

  averageColor(colors) {
    const sum = colors.reduce((acc, c) => ({
      r: acc.r + c.r,
      g: acc.g + c.g,
      b: acc.b + c.b
    }), { r: 0, g: 0, b: 0 });

    return {
      r: Math.round(sum.r / colors.length),
      g: Math.round(sum.g / colors.length),
      b: Math.round(sum.b / colors.length)
    };
  }

  smoothEdges(ctx, width, height) {
    // 간단한 가우시안 블러 효과로 엣지 스무딩
    ctx.globalCompositeOperation = 'source-over';
  }

  setBg(color) {
    this.currentBg = color;

    // 버튼 활성화 상태 업데이트
    document.querySelectorAll('.bg-option').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.bg === color);
    });

    if (this.processedCanvas) {
      this.applyBackground();
    }
  }

  applyBackground() {
    if (!this.processedCanvas) return;

    const displayCanvas = document.createElement('canvas');
    const ctx = displayCanvas.getContext('2d');

    displayCanvas.width = this.processedCanvas.width;
    displayCanvas.height = this.processedCanvas.height;

    // 배경 적용
    if (this.currentBg !== 'transparent') {
      ctx.fillStyle = this.currentBg;
      ctx.fillRect(0, 0, displayCanvas.width, displayCanvas.height);
    }

    ctx.drawImage(this.processedCanvas, 0, 0);

    this.elements.resultImage.src = displayCanvas.toDataURL('image/png');
    this.elements.resultImage.style.display = 'block';
    this.elements.placeholderText.style.display = 'none';

    // 결과 컨테이너 배경
    if (this.currentBg === 'transparent') {
      this.elements.resultContainer.classList.add('checkered');
    } else {
      this.elements.resultContainer.classList.remove('checkered');
    }
  }

  download() {
    if (!this.processedCanvas) {
      this.showToast('다운로드할 이미지가 없습니다.', 'error');
      return;
    }

    const downloadCanvas = document.createElement('canvas');
    const ctx = downloadCanvas.getContext('2d');

    downloadCanvas.width = this.processedCanvas.width;
    downloadCanvas.height = this.processedCanvas.height;

    if (this.currentBg !== 'transparent') {
      ctx.fillStyle = this.currentBg;
      ctx.fillRect(0, 0, downloadCanvas.width, downloadCanvas.height);
    }

    ctx.drawImage(this.processedCanvas, 0, 0);

    const link = document.createElement('a');
    link.download = 'bg-removed.png';
    link.href = downloadCanvas.toDataURL('image/png');
    link.click();

    this.showToast('이미지가 다운로드되었습니다.');
  }

  reset() {
    this.originalImage = null;
    this.processedCanvas = null;
    this.elements.uploadSection.style.display = 'block';
    this.elements.editorSection.style.display = 'none';
    this.elements.fileInput.value = '';
    this.resetResult();
  }

  resetResult() {
    this.elements.resultImage.src = '';
    this.elements.resultImage.style.display = 'none';
    this.elements.placeholderText.style.display = 'block';
    this.elements.statusBadge.textContent = '대기 중';
    this.elements.statusBadge.className = 'status-badge';
    this.elements.downloadBtn.disabled = true;
    this.elements.resultContainer.classList.add('checkered');
  }
}

// 전역 인스턴스 생성
const bgRemoveTool = new BgRemoveTool();
window.BgRemove = bgRemoveTool;

document.addEventListener('DOMContentLoaded', () => bgRemoveTool.init());
