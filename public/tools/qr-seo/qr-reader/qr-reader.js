/**
 * QR 코드 읽기 - ToolBase 기반
 * 이미지 또는 카메라로 QR 코드 스캔
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var QrReader = class QrReader extends ToolBase {
  constructor() {
    super('QrReader');
    this.cameraStream = null;
    this.scanning = false;
    this.lastResult = '';
  }

  init() {
    this.initElements({
      uploadZone: 'uploadZone',
      previewImage: 'previewImage',
      cameraVideo: 'cameraVideo',
      cameraCanvas: 'cameraCanvas',
      cameraBtn: 'cameraBtn',
      resultContent: 'resultContent',
      resultType: 'resultType',
      openUrlBtn: 'openUrlBtn'
    });

    this.setupDragDrop();
    console.log('[QrReader] 초기화 완료');
    return this;
  }

  setupDragDrop() {
    const zone = this.elements.uploadZone;
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(event => {
      this.on(zone, event, e => { e.preventDefault(); e.stopPropagation(); });
    });
    this.on(zone, 'dragenter', () => zone.classList.add('drag-over'));
    this.on(zone, 'dragleave', () => zone.classList.remove('drag-over'));
    this.on(zone, 'drop', e => {
      zone.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) this.processFile(file);
    });
  }

  handleFile(input) {
    const file = input.files[0];
    if (file) this.processFile(file);
  }

  processFile(file) {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => this.decodeImage(img);
      img.src = e.target.result;
      this.elements.previewImage.src = e.target.result;
      this.elements.previewImage.style.display = 'block';
    };
    reader.readAsDataURL(file);
  }

  decodeImage(img) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);

    if (code) {
      this.showResult(code.data);
      this.showToast('QR 코드 스캔 성공!');
    } else {
      this.showResult(null);
      this.showToast('QR 코드를 찾을 수 없습니다.', 'error');
    }
  }

  showResult(data) {
    const content = this.elements.resultContent;
    const typeEl = this.elements.resultType;
    const openBtn = this.elements.openUrlBtn;

    if (data) {
      this.lastResult = data;
      content.textContent = data;
      const type = this.detectType(data);
      typeEl.textContent = `유형: ${type}`;
      openBtn.style.display = type === 'URL' ? 'inline-flex' : 'none';
    } else {
      this.lastResult = '';
      content.textContent = 'QR 코드를 찾을 수 없습니다';
      typeEl.textContent = '-';
      openBtn.style.display = 'none';
    }
  }

  detectType(data) {
    if (/^https?:\/\//i.test(data)) return 'URL';
    if (/^mailto:/i.test(data)) return '이메일';
    if (/^tel:/i.test(data)) return '전화번호';
    if (/^WIFI:/i.test(data)) return 'WiFi';
    if (/^BEGIN:VCARD/i.test(data)) return 'vCard';
    if (/^BEGIN:VEVENT/i.test(data)) return '이벤트';
    if (/^SMSTO:/i.test(data)) return 'SMS';
    return '텍스트';
  }

  async toggleCamera() {
    if (this.scanning) {
      this.stopCamera();
    } else {
      await this.startCamera();
    }
  }

  async startCamera() {
    try {
      const video = this.elements.cameraVideo;
      const canvas = this.elements.cameraCanvas;
      const btn = this.elements.cameraBtn;

      this.cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });

      video.srcObject = this.cameraStream;
      video.style.display = 'block';
      btn.textContent = '카메라 중지';
      this.scanning = true;

      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;

      this.scanFrame(video, canvas);
    } catch (error) {
      console.error('[QrReader] 카메라 오류:', error);
      this.showToast('카메라 접근 실패', 'error');
    }
  }

  scanFrame(video, canvas) {
    if (!this.scanning) return;

    const ctx = canvas.getContext('2d');
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);

      if (code && code.data !== this.lastResult) {
        this.showResult(code.data);
        this.showToast('QR 코드 발견!');
      }
    }

    requestAnimationFrame(() => this.scanFrame(video, canvas));
  }

  stopCamera() {
    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach(track => track.stop());
      this.cameraStream = null;
    }
    this.elements.cameraVideo.style.display = 'none';
    this.elements.cameraBtn.textContent = '카메라 스캔';
    this.scanning = false;
  }

  async copyResult() {
    if (!this.lastResult) {
      this.showToast('복사할 결과가 없습니다.', 'warning');
      return;
    }
    try {
      await navigator.clipboard.writeText(this.lastResult);
      this.showToast('복사되었습니다!');
    } catch (err) {
      this.showToast('복사 실패', 'error');
    }
  }

  openUrl() {
    if (this.lastResult && /^https?:\/\//i.test(this.lastResult)) {
      window.open(this.lastResult, '_blank');
    }
  }

  clear() {
    this.lastResult = '';
    this.elements.resultContent.textContent = 'QR 코드를 스캔하세요';
    this.elements.resultType.textContent = '-';
    this.elements.openUrlBtn.style.display = 'none';
    this.elements.previewImage.style.display = 'none';
    this.stopCamera();
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const qrReader = new QrReader();
window.QrReader = qrReader;

document.addEventListener('DOMContentLoaded', () => qrReader.init());
