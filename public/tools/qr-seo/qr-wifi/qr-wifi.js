/**
 * WiFi QR 코드 생성기 - ToolBase 기반
 * WiFi 접속 정보를 QR 코드로 생성
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var QRWifi = class QRWifi extends ToolBase {
  constructor() {
    super('QRWifi');
    this.security = 'WPA';
  }

  init() {
    this.initElements({
      ssid: 'ssid',
      password: 'password',
      passwordField: 'passwordField',
      hidden: 'hidden',
      qrCanvas: 'qrCanvas',
      qrSize: 'qrSize',
      errorLevel: 'errorLevel',
      fgColor: 'fgColor',
      bgColor: 'bgColor',
      wifiInfo: 'wifiInfo',
      secWPA: 'secWPA',
      secWEP: 'secWEP',
      secNone: 'secNone'
    });

    this.generate();
    console.log('[QRWifi] 초기화 완료');
    return this;
  }

  setSecurity(type) {
    this.security = type;

    this.elements.secWPA.classList.toggle('active', type === 'WPA');
    this.elements.secWEP.classList.toggle('active', type === 'WEP');
    this.elements.secNone.classList.toggle('active', type === 'nopass');

    // 비밀번호 필드 표시/숨김
    this.elements.passwordField.style.display = type === 'nopass' ? 'none' : 'block';

    this.generate();
  }

  togglePassword() {
    const input = this.elements.password;
    input.type = input.type === 'password' ? 'text' : 'password';
  }

  buildWifiString() {
    const ssid = this.elements.ssid.value;
    const password = this.elements.password.value;
    const hidden = this.elements.hidden.checked;

    if (!ssid) {
      return null;
    }

    // WiFi 특수 문자 이스케이프
    const escapeValue = (str) => {
      return str.replace(/([\\;,:"])/g, '\\$1');
    };

    let wifiString = 'WIFI:';
    wifiString += `T:${this.security};`;
    wifiString += `S:${escapeValue(ssid)};`;

    if (this.security !== 'nopass' && password) {
      wifiString += `P:${escapeValue(password)};`;
    }

    if (hidden) {
      wifiString += 'H:true;';
    }

    wifiString += ';';

    return wifiString;
  }

  generate() {
    const wifiString = this.buildWifiString();
    const canvas = this.elements.qrCanvas;
    const size = parseInt(this.elements.qrSize.value);
    const errorLevel = this.elements.errorLevel.value;
    const fgColor = this.elements.fgColor.value;
    const bgColor = this.elements.bgColor.value;

    // WiFi 정보 표시 업데이트
    const ssid = this.elements.ssid.value || 'WiFi 이름';
    const securityLabel = {
      'WPA': 'WPA/WPA2 보안',
      'WEP': 'WEP 보안',
      'nopass': '개방형 (보안 없음)'
    };

    this.elements.wifiInfo.innerHTML = `
      <div class="ssid">${this.escapeHtml(ssid)}</div>
      <div class="security">${securityLabel[this.security]}</div>
    `;

    if (!wifiString) {
      // 빈 QR 코드
      const ctx = canvas.getContext('2d');
      canvas.width = size;
      canvas.height = size;
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = '#ccc';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SSID를 입력하세요', size / 2, size / 2);
      return;
    }

    // QR 코드 생성
    QRCode.toCanvas(canvas, wifiString, {
      width: size,
      margin: 2,
      errorCorrectionLevel: errorLevel,
      color: {
        dark: fgColor,
        light: bgColor
      }
    }, (error) => {
      if (error) {
        console.error('[QRWifi] QR 생성 오류:', error);
        this.showToast('QR 코드 생성 실패', 'error');
      }
    });
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  download() {
    const ssid = this.elements.ssid.value;
    if (!ssid) {
      this.showToast('SSID를 입력하세요.', 'warning');
      return;
    }

    const canvas = this.elements.qrCanvas;
    const link = document.createElement('a');
    link.download = `wifi-${ssid.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();

    this.showToast('QR 코드 다운로드 완료!');
  }

  async copy() {
    const ssid = this.elements.ssid.value;
    if (!ssid) {
      this.showToast('SSID를 입력하세요.', 'warning');
      return;
    }

    const canvas = this.elements.qrCanvas;

    try {
      // Canvas를 Blob으로 변환
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));

      // 클립보드에 이미지 복사
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);

      this.showToast('QR 코드 이미지가 복사되었습니다!');
    } catch (error) {
      console.error('[QRWifi] 복사 오류:', error);

      // 대안: WiFi 문자열 복사
      const wifiString = this.buildWifiString();
      try {
        await navigator.clipboard.writeText(wifiString);
        this.showToast('WiFi 연결 문자열이 복사되었습니다.');
      } catch (err) {
        this.showToast('복사 실패', 'error');
      }
    }
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const qrWifi = new QRWifi();
window.QRWifi = qrWifi;

document.addEventListener('DOMContentLoaded', () => qrWifi.init());
