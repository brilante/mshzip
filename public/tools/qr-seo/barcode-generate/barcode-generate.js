/**
 * 바코드 생성기 - ToolBase 기반
 * 다양한 형식의 바코드 생성
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var BarcodeGen = class BarcodeGen extends ToolBase {
  constructor() {
    super('BarcodeGen');
    this.formatInfo = {
      CODE128: '범용 바코드, 숫자와 문자 모두 지원',
      EAN13: '상품 바코드, 12자리 숫자 + 체크섬',
      EAN8: '소형 상품용, 7자리 숫자 + 체크섬',
      UPC: '미국 상품 바코드, 11자리 숫자 + 체크섬',
      CODE39: '산업용, 대문자와 숫자 지원',
      ITF14: '물류용, 13자리 숫자 + 체크섬',
      MSI: '재고관리용, 숫자만 지원',
      pharmacode: '제약용, 3~131070 범위 숫자'
    };
  }

  init() {
    this.initElements({
      barcodeFormat: 'barcodeFormat',
      barcodeData: 'barcodeData',
      lineColor: 'lineColor',
      bgColor: 'bgColor',
      barWidth: 'barWidth',
      barHeight: 'barHeight',
      showText: 'showText',
      formatInfo: 'formatInfo',
      barcodeCanvas: 'barcodeCanvas',
      errorMessage: 'errorMessage'
    });

    this.updateInfo();
    this.generate();
    console.log('[BarcodeGen] 초기화 완료');
    return this;
  }

  updateInfo() {
    const format = this.elements.barcodeFormat.value;
    this.elements.formatInfo.textContent = this.formatInfo[format] || '';
  }

  generate() {
    const format = this.elements.barcodeFormat.value;
    const data = this.elements.barcodeData.value;
    const lineColor = this.elements.lineColor.value;
    const bgColor = this.elements.bgColor.value;
    const width = parseInt(this.elements.barWidth.value);
    const height = parseInt(this.elements.barHeight.value);
    const showText = this.elements.showText.checked;

    const errorEl = this.elements.errorMessage;

    try {
      JsBarcode('#barcodeCanvas', data, {
        format: format,
        lineColor: lineColor,
        background: bgColor,
        width: width,
        height: height,
        displayValue: showText,
        font: 'monospace',
        fontSize: 16,
        margin: 10
      });
      errorEl.style.display = 'none';
    } catch (error) {
      console.error('[BarcodeGen] 오류:', error);
      errorEl.textContent = this.getErrorMessage(format, error);
      errorEl.style.display = 'block';
    }
  }

  getErrorMessage(format, error) {
    const messages = {
      EAN13: 'EAN-13: 12자리 숫자를 입력하세요',
      EAN8: 'EAN-8: 7자리 숫자를 입력하세요',
      UPC: 'UPC-A: 11자리 숫자를 입력하세요',
      ITF14: 'ITF-14: 13자리 숫자를 입력하세요 (짝수 자릿수)',
      pharmacode: 'Pharmacode: 3~131070 범위의 숫자를 입력하세요'
    };
    return messages[format] || '유효하지 않은 데이터입니다';
  }

  download(format) {
    const svg = this.elements.barcodeCanvas;
    const data = this.elements.barcodeData.value || 'barcode';
    const filename = `barcode-${data.substring(0, 20).replace(/[^a-z0-9]/gi, '_')}`;

    if (format === 'svg') {
      const svgData = new XMLSerializer().serializeToString(svg);
      const blob = new Blob([svgData], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `${filename}.svg`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
      this.showToast('SVG 다운로드 시작!');
    } else {
      // SVG to PNG 변환
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        canvas.width = img.width * 2;
        canvas.height = img.height * 2;
        ctx.scale(2, 2);
        ctx.drawImage(img, 0, 0);

        const link = document.createElement('a');
        link.download = `${filename}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        this.showToast('PNG 다운로드 시작!');
      };

      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    }
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const barcodeGen = new BarcodeGen();
window.BarcodeGen = barcodeGen;

document.addEventListener('DOMContentLoaded', () => barcodeGen.init());
