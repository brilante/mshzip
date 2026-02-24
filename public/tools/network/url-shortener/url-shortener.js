/**
 * URL 단축기 - ToolBase 기반
 * 긴 URL을 짧게 변환
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var UrlShortener = class UrlShortener extends ToolBase {
  constructor() {
    super('UrlShortener');
    this.history = [];
    this.currentShortUrl = '';
  }

  init() {
    this.initElements({
      urlInput: 'urlInput',
      shortUrl: 'shortUrl',
      resultBox: 'resultBox',
      historyItems: 'historyItems'
    });

    this.loadHistory();
    this.elements.urlInput.addEventListener('keypress', e => {
      if (e.key === 'Enter') this.shorten();
    });

    console.log('[UrlShortener] 초기화 완료');
    return this;
  }

  shorten() {
    const url = this.elements.urlInput.value.trim();

    if (!url) {
      this.showToast('URL을 입력해주세요.', 'warning');
      return;
    }

    if (!this.isValidUrl(url)) {
      this.showToast('올바른 URL 형식이 아닙니다.', 'error');
      return;
    }

    // 시뮬레이션: 짧은 URL 생성
    const shortCode = this.generateShortCode();
    this.currentShortUrl = `https://short.mm3/${shortCode}`;

    this.elements.shortUrl.textContent = this.currentShortUrl;
    this.elements.resultBox.style.display = 'block';

    // 히스토리에 추가
    this.addToHistory(url, this.currentShortUrl);

    this.showToast('URL 단축 완료! (시뮬레이션)', 'success');
  }

  isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  generateShortCode() {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  copy() {
    if (!this.currentShortUrl) return;
    this.copyToClipboard(this.currentShortUrl);
  }

  openQR() {
    if (!this.currentShortUrl) return;

    // QR 코드 API 사용 (시뮬레이션)
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(this.currentShortUrl)}`;
    window.open(qrUrl, '_blank');
  }

  addToHistory(original, short) {
    this.history.unshift({ original, short, date: new Date().toISOString() });
    if (this.history.length > 10) this.history.pop();
    this.saveHistory();
    this.renderHistory();
  }

  loadHistory() {
    try {
      const saved = localStorage.getItem('urlShortenerHistory');
      if (saved) {
        this.history = JSON.parse(saved);
        this.renderHistory();
      }
    } catch (e) {
      console.error('히스토리 로드 실패:', e);
    }
  }

  saveHistory() {
    try {
      localStorage.setItem('urlShortenerHistory', JSON.stringify(this.history));
    } catch (e) {
      console.error('히스토리 저장 실패:', e);
    }
  }

  renderHistory() {
    if (this.history.length === 0) {
      this.elements.historyItems.innerHTML = '<div style="color: var(--text-secondary); text-align: center; padding: 1rem;">단축된 URL이 없습니다</div>';
      return;
    }

    let html = '';
    this.history.forEach((item, index) => {
      html += `
        <div class="history-item">
          <div class="history-urls">
            <div class="history-original" title="${item.original}">${item.original}</div>
            <div class="history-short">${item.short}</div>
          </div>
          <button class="tool-btn tool-btn-secondary" style="padding: 0.4rem 0.8rem;" onclick="urlShortener.copyHistory(${index})">복사</button>
        </div>
      `;
    });

    this.elements.historyItems.innerHTML = html;
  }

  copyHistory(index) {
    const item = this.history[index];
    if (!item) return;
    this.copyToClipboard(item.short);
  }
}

// 전역 인스턴스 생성
const urlShortener = new UrlShortener();
window.UrlShortener = urlShortener;

// 전역 함수 (HTML onclick 호환)
function shorten() { urlShortener.shorten(); }
function copy() { urlShortener.copy(); }
function openQR() { urlShortener.openQR(); }

document.addEventListener('DOMContentLoaded', () => urlShortener.init());
