/**
 * 맞춤형 QR 코드 - ToolBase 기반
 * 로고와 색상을 적용한 커스텀 QR 코드
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var QrCustom = class QrCustom extends ToolBase {
  constructor() {
    super('QrCustom');
    this.logoImage = null;
  }

  init() {
    this.initElements({
      qrData: 'qrData',
      qrSize: 'qrSize',
      fgColor: 'fgColor',
      bgColor: 'bgColor',
      errorLevel: 'errorLevel',
      logoSize: 'logoSize',
      logoInput: 'logoInput',
      logoPreview: 'logoPreview',
      qrCanvas: 'qrCanvas'
    });

    // QRCode 라이브러리 로드 확인
    if (typeof QRCode === 'undefined') {
      console.error('[QrCustom] QRCode 라이브러리가 로드되지 않았습니다.');
      // 라이브러리 동적 로드 시도
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js';
      script.onload = () => {
        console.log('[QrCustom] QRCode 라이브러리 동적 로드 완료');
        this.generate();
      };
      script.onerror = () => {
        console.error('[QrCustom] QRCode 라이브러리 로드 실패');
        this.showToast('QR 라이브러리 로드 실패', 'error');
      };
      document.head.appendChild(script);
      return this;
    }

    this.generate();
    console.log('[QrCustom] 초기화 완료');
    return this;
  }

  async generate() {
    const data = this.elements.qrData.value || 'https://example.com';
    const size = parseInt(this.elements.qrSize.value);
    const fgColor = this.elements.fgColor.value;
    const bgColor = this.elements.bgColor.value;
    const errorLevel = this.elements.errorLevel.value;

    const canvas = this.elements.qrCanvas;

    try {
      await QRCode.toCanvas(canvas, data, {
        width: size,
        margin: 2,
        color: { dark: fgColor, light: bgColor },
        errorCorrectionLevel: errorLevel
      });

      if (this.logoImage) {
        this.addLogo(canvas, size);
      }
    } catch (error) {
      console.error('[QrCustom] QR 생성 오류:', error);
    }
  }

  addLogo(canvas, size) {
    const ctx = canvas.getContext('2d');
    const logoSizePercent = parseInt(this.elements.logoSize.value) / 100;
    const logoSize = size * logoSizePercent;
    const x = (size - logoSize) / 2;
    const y = (size - logoSize) / 2;

    // 흰색 배경 (로고 영역)
    const padding = 5;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x - padding, y - padding, logoSize + padding * 2, logoSize + padding * 2);

    // 로고 그리기
    ctx.drawImage(this.logoImage, x, y, logoSize, logoSize);
  }

  loadLogo(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        this.logoImage = img;
        this.elements.logoPreview.src = e.target.result;
        this.elements.logoPreview.style.display = 'block';
        this.elements.errorLevel.value = 'H'; // 로고용 오류 수정
        this.generate();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  removeLogo() {
    this.logoImage = null;
    this.elements.logoPreview.style.display = 'none';
    this.elements.logoInput.value = '';
    this.generate();
  }

  download(format) {
    const canvas = this.elements.qrCanvas;
    const data = this.elements.qrData.value || 'qrcode';
    const filename = `qr-${data.substring(0, 20).replace(/[^a-z0-9]/gi, '_')}`;

    if (format === 'png') {
      const link = document.createElement('a');
      link.download = `${filename}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      this.showToast('PNG 다운로드 시작!');
    } else if (format === 'svg') {
      const qrData = this.elements.qrData.value || 'https://example.com';
      const size = parseInt(this.elements.qrSize.value);
      const fgColor = this.elements.fgColor.value;
      const bgColor = this.elements.bgColor.value;
      const errorLevel = this.elements.errorLevel.value;

      QRCode.toString(qrData, {
        type: 'svg',
        width: size,
        margin: 2,
        color: { dark: fgColor, light: bgColor },
        errorCorrectionLevel: errorLevel
      }, (err, svg) => {
        if (err) {
          this.showToast('SVG 생성 실패', 'error');
          return;
        }
        const blob = new Blob([svg], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `${filename}.svg`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
        this.showToast('SVG 다운로드 시작!');
      });
    }
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const qrCustom = new QrCustom();
window.QrCustom = qrCustom;

document.addEventListener('DOMContentLoaded', () => qrCustom.init());
