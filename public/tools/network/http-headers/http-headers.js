/**
 * HTTP 헤더 체크 - ToolBase 기반
 * 웹사이트 HTTP 헤더 확인
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var HttpHeaders = class HttpHeaders extends ToolBase {
  constructor() {
    super('HttpHeaders');
  }

  init() {
    this.initElements({
      urlInput: 'urlInput',
      methodSelect: 'methodSelect',
      resultArea: 'resultArea'
    });

    this.elements.urlInput.addEventListener('keypress', e => {
      if (e.key === 'Enter') this.check();
    });

    console.log('[HttpHeaders] 초기화 완료');
    return this;
  }

  check() {
    let url = this.elements.urlInput.value.trim();

    if (!url) {
      this.showToast('URL을 입력해주세요.', 'warning');
      return;
    }

    // 프로토콜 추가
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    const method = this.elements.methodSelect.value;
    const headers = this.generateDemoHeaders(url, method);
    this.showResult(url, method, headers);
    this.showToast('헤더 확인 완료! (데모 모드)', 'success');
  }

  generateDemoHeaders(url, method) {
    const domain = new URL(url).hostname;
    const statusCodes = [200, 301, 302, 404];
    const statusCode = statusCodes[Math.floor(Math.random() * statusCodes.length)];

    const statusTexts = {
      200: 'OK',
      301: 'Moved Permanently',
      302: 'Found',
      404: 'Not Found'
    };

    return {
      statusCode,
      statusText: statusTexts[statusCode],
      responseTime: Math.floor(Math.random() * 500) + 50,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Length': Math.floor(Math.random() * 50000) + 1000,
        'Server': ['nginx', 'Apache', 'cloudflare'][Math.floor(Math.random() * 3)],
        'Date': new Date().toUTCString(),
        'Cache-Control': 'max-age=3600',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'SAMEORIGIN',
        'X-XSS-Protection': '1; mode=block',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        'Content-Encoding': 'gzip',
        'Vary': 'Accept-Encoding',
        'Connection': 'keep-alive'
      }
    };
  }

  showResult(url, method, data) {
    const statusClass = data.statusCode >= 200 && data.statusCode < 300 ? 'status-2xx'
                      : data.statusCode >= 300 && data.statusCode < 400 ? 'status-3xx'
                      : data.statusCode >= 400 && data.statusCode < 500 ? 'status-4xx'
                      : 'status-5xx';

    let html = `
      <div class="response-info">
        <div class="info-item">
          <div class="info-label">상태</div>
          <div class="info-value">
            <span class="status-badge ${statusClass}">${data.statusCode} ${data.statusText}</span>
          </div>
        </div>
        <div class="info-item">
          <div class="info-label">요청 방식</div>
          <div class="info-value">${method}</div>
        </div>
        <div class="info-item">
          <div class="info-label">응답 시간</div>
          <div class="info-value">${data.responseTime}ms</div>
        </div>
      </div>

      <p style="margin-bottom: 1rem; color: var(--text-secondary); font-size: 0.9rem;">
        ${url} (데모)
      </p>

      <table class="header-table">
        <thead>
          <tr>
            <th>헤더</th>
            <th>값</th>
          </tr>
        </thead>
        <tbody>
    `;

    for (const [key, value] of Object.entries(data.headers)) {
      html += `
        <tr>
          <td><strong>${key}</strong></td>
          <td>${value}</td>
        </tr>
      `;
    }

    html += '</tbody></table>';
    this.elements.resultArea.innerHTML = html;
  }
}

// 전역 인스턴스 생성
const httpHeaders = new HttpHeaders();
window.HttpHeaders = httpHeaders;

// 전역 함수 (HTML onclick 호환)
function check() { httpHeaders.check(); }

document.addEventListener('DOMContentLoaded', () => httpHeaders.init());
