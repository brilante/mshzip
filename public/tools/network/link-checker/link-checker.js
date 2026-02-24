/**
 * 링크 체커 - ToolBase 기반
 * URL 유효성 일괄 검사
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var LinkChecker = class LinkChecker extends ToolBase {
  constructor() {
    super('LinkChecker');
    this.isRunning = false;
    this.results = [];
  }

  init() {
    this.initElements({
      urlsInput: 'urlsInput',
      checkBtn: 'checkBtn',
      resultPanel: 'resultPanel',
      progressBar: 'progressBar',
      progressFill: 'progressFill',
      resultBody: 'resultBody',
      statTotal: 'statTotal',
      statValid: 'statValid',
      statBroken: 'statBroken',
      statRedirect: 'statRedirect'
    });

    console.log('[LinkChecker] 초기화 완료');
    return this;
  }

  loadSample() {
    const sample = `https://google.com
https://github.com
https://www.example.com/page
https://www.nonexistent-domain-12345.com
https://httpstat.us/301
https://httpstat.us/404
https://httpstat.us/500`;

    this.elements.urlsInput.value = sample;
    this.showToast('샘플 URL 로드됨', 'info');
  }

  async start() {
    if (this.isRunning) return;

    const input = this.elements.urlsInput.value.trim();
    if (!input) {
      this.showToast('URL을 입력해주세요.', 'warning');
      return;
    }

    const urls = input.split('\n')
      .map(u => u.trim())
      .filter(u => u && this.isValidUrl(u));

    if (urls.length === 0) {
      this.showToast('유효한 URL이 없습니다.', 'error');
      return;
    }

    this.isRunning = true;
    this.results = [];

    this.elements.checkBtn.disabled = true;
    this.elements.resultPanel.style.display = 'block';
    this.elements.progressBar.style.display = 'block';
    this.elements.resultBody.innerHTML = '';

    let valid = 0, broken = 0, redirect = 0;

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const progress = ((i + 1) / urls.length) * 100;
      this.elements.progressFill.style.width = progress + '%';

      await this.delay(200);

      const result = this.simulateCheck(url);
      this.results.push(result);

      if (result.status >= 200 && result.status < 300) valid++;
      else if (result.status >= 300 && result.status < 400) redirect++;
      else broken++;

      this.addResultRow(result);
      this.updateStats(urls.length, valid, broken, redirect);
    }

    this.elements.progressBar.style.display = 'none';
    this.isRunning = false;
    this.elements.checkBtn.disabled = false;
    this.showToast('링크 검사 완료! (시뮬레이션)', 'success');
  }

  isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  simulateCheck(url) {
    // 시뮬레이션 로직
    let status, statusText;
    const responseTime = Math.floor(Math.random() * 500) + 50;

    if (url.includes('nonexistent') || url.includes('404')) {
      status = 404;
      statusText = 'Not Found';
    } else if (url.includes('500')) {
      status = 500;
      statusText = 'Server Error';
    } else if (url.includes('301')) {
      status = 301;
      statusText = 'Moved Permanently';
    } else if (url.includes('302')) {
      status = 302;
      statusText = 'Found';
    } else {
      const random = Math.random();
      if (random > 0.9) {
        status = 404;
        statusText = 'Not Found';
      } else if (random > 0.8) {
        status = 301;
        statusText = 'Moved Permanently';
      } else {
        status = 200;
        statusText = 'OK';
      }
    }

    return { url, status, statusText, responseTime };
  }

  addResultRow(result) {
    const statusClass = result.status >= 200 && result.status < 300 ? 'status-200'
                      : result.status >= 300 && result.status < 400 ? 'status-301'
                      : 'status-404';

    const row = document.createElement('tr');
    row.innerHTML = `
      <td style="max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${result.url}">${result.url}</td>
      <td><span class="status-badge ${statusClass}">${result.status}</span></td>
      <td>${result.responseTime}ms</td>
      <td>${result.statusText}</td>
    `;
    this.elements.resultBody.appendChild(row);
  }

  updateStats(total, valid, broken, redirect) {
    this.elements.statTotal.textContent = `전체: ${total}`;
    this.elements.statValid.textContent = `정상: ${valid}`;
    this.elements.statBroken.textContent = `깨짐: ${broken}`;
    this.elements.statRedirect.textContent = `리다이렉트: ${redirect}`;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 전역 인스턴스 생성
const linkChecker = new LinkChecker();
window.LinkChecker = linkChecker;

// 전역 함수 (HTML onclick 호환)
function loadSample() { linkChecker.loadSample(); }
function start() { linkChecker.start(); }

document.addEventListener('DOMContentLoaded', () => linkChecker.init());
