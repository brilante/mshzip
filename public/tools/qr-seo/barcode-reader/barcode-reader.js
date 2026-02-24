/**
 * 바코드 읽기 - ToolBase 기반
 * 이미지 또는 카메라로 바코드 스캔
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var BarcodeReader = class BarcodeReader extends ToolBase {
  constructor() {
    super('BarcodeReader');
    this.scanning = false;
    this.lastResult = '';
    this.history = [];
  }

  init() {
    this.initElements({
      previewImage: 'previewImage',
      cameraContainer: 'cameraContainer',
      cameraBtn: 'cameraBtn',
      resultContent: 'resultContent',
      resultFormat: 'resultFormat',
      historyList: 'historyList'
    });

    console.log('[BarcodeReader] 초기화 완료');
    return this;
  }

  handleFile(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = e => {
      this.elements.previewImage.src = e.target.result;
      this.elements.previewImage.style.display = 'block';
      this.decodeImage(e.target.result);
    };
    reader.readAsDataURL(file);
  }

  decodeImage(src) {
    Quagga.decodeSingle({
      src: src,
      numOfWorkers: 0,
      decoder: {
        readers: [
          'code_128_reader',
          'ean_reader',
          'ean_8_reader',
          'code_39_reader',
          'code_39_vin_reader',
          'codabar_reader',
          'upc_reader',
          'upc_e_reader',
          'i2of5_reader'
        ]
      },
      locate: true
    }, result => {
      if (result && result.codeResult) {
        this.showResult(result.codeResult.code, result.codeResult.format);
        this.showToast('바코드 스캔 성공!');
      } else {
        this.showResult(null);
        this.showToast('바코드를 찾을 수 없습니다.', 'error');
      }
    });
  }

  showResult(data, format = '-') {
    const content = this.elements.resultContent;
    const formatEl = this.elements.resultFormat;

    if (data) {
      this.lastResult = data;
      content.textContent = data;
      formatEl.textContent = `형식: ${this.formatName(format)}`;
      this.addToHistory(data, format);
    } else {
      content.textContent = '바코드를 찾을 수 없습니다';
      formatEl.textContent = '형식: -';
    }
  }

  formatName(format) {
    const names = {
      'code_128': 'CODE128',
      'ean_13': 'EAN-13',
      'ean_8': 'EAN-8',
      'code_39': 'CODE39',
      'upc_a': 'UPC-A',
      'upc_e': 'UPC-E',
      'i2of5': 'ITF',
      'codabar': 'Codabar'
    };
    return names[format] || format || '-';
  }

  addToHistory(data, format) {
    this.history.unshift({ data, format, time: new Date().toLocaleTimeString() });
    if (this.history.length > 10) this.history.pop();
    this.renderHistory();
  }

  renderHistory() {
    const list = this.elements.historyList;
    list.innerHTML = this.history.map(item => `
      <div class="history-item">
        <span>${item.data}</span>
        <span>${item.time}</span>
      </div>
    `).join('');
  }

  async toggleCamera() {
    if (this.scanning) {
      this.stopCamera();
    } else {
      await this.startCamera();
    }
  }

  async startCamera() {
    const container = this.elements.cameraContainer;
    const btn = this.elements.cameraBtn;

    try {
      container.style.display = 'block';
      btn.textContent = '카메라 중지';
      this.scanning = true;

      Quagga.init({
        inputStream: {
          name: 'Live',
          type: 'LiveStream',
          target: container,
          constraints: {
            facingMode: 'environment'
          }
        },
        decoder: {
          readers: [
            'code_128_reader',
            'ean_reader',
            'ean_8_reader',
            'code_39_reader',
            'upc_reader',
            'upc_e_reader'
          ]
        },
        locate: true
      }, err => {
        if (err) {
          console.error('[BarcodeReader] 카메라 오류:', err);
          this.showToast('카메라 접근 실패', 'error');
          this.stopCamera();
          return;
        }
        Quagga.start();
      });

      Quagga.onDetected(result => {
        if (result && result.codeResult && result.codeResult.code !== this.lastResult) {
          this.showResult(result.codeResult.code, result.codeResult.format);
          this.showToast('바코드 발견!');
        }
      });
    } catch (error) {
      console.error('[BarcodeReader] 오류:', error);
      this.showToast('카메라 시작 실패', 'error');
      this.stopCamera();
    }
  }

  stopCamera() {
    try {
      Quagga.stop();
    } catch (e) {}
    this.elements.cameraContainer.style.display = 'none';
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

  clear() {
    this.lastResult = '';
    this.elements.resultContent.textContent = '바코드를 스캔하세요';
    this.elements.resultFormat.textContent = '형식: -';
    this.elements.previewImage.style.display = 'none';
    this.stopCamera();
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const barcodeReader = new BarcodeReader();
window.BarcodeReader = barcodeReader;

document.addEventListener('DOMContentLoaded', () => barcodeReader.init());
