/**
 * 깨진 링크 검사 - ToolBase 기반
 * 웹페이지의 404 링크 탐지
 * @created 2026-01-13
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class BrokenLinkCheckerTool extends ToolBase {
  constructor() {
    super('BrokenLinkCheckerTool');
    this.links = [];
    this.currentFilter = 'all';
  }

  init() {
    this.initElements({
      htmlInput: 'htmlInput',
      urlListInput: 'urlListInput',
      progressSection: 'progressSection',
      progressCount: 'progressCount',
      progressFill: 'progressFill',
      progressText: 'progressText',
      resultSection: 'resultSection',
      totalLinks: 'totalLinks',
      validLinks: 'validLinks',
      brokenLinks: 'brokenLinks',
      redirectLinks: 'redirectLinks',
      linksList: 'linksList'
    });

    console.log('[BrokenLinkCheckerTool] 초기화 완료');
    return this;
  }

  switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.toggle('active', content.id === tab + 'Tab');
    });
  }

  analyzeHtml() {
    const html = this.elements.htmlInput.value.trim();
    if (!html) {
      this.showToast('HTML 코드를 입력해주세요.', 'error');
      return;
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const urls = new Set();

    // a 태그에서 링크 추출
    doc.querySelectorAll('a[href]').forEach(a => {
      const href = a.getAttribute('href');
      if (this.isValidUrl(href)) {
        urls.add(href);
      }
    });

    // img 태그에서 링크 추출
    doc.querySelectorAll('img[src]').forEach(img => {
      const src = img.getAttribute('src');
      if (this.isValidUrl(src)) {
        urls.add(src);
      }
    });

    // script, link 태그
    doc.querySelectorAll('script[src], link[href]').forEach(el => {
      const url = el.getAttribute('src') || el.getAttribute('href');
      if (this.isValidUrl(url)) {
        urls.add(url);
      }
    });

    if (urls.size === 0) {
      this.showToast('유효한 링크를 찾을 수 없습니다.', 'error');
      return;
    }

    this.checkLinks([...urls]);
  }

  checkUrls() {
    const text = this.elements.urlListInput.value.trim();
    if (!text) {
      this.showToast('URL 목록을 입력해주세요.', 'error');
      return;
    }

    const urls = text.split('\n')
      .map(url => url.trim())
      .filter(url => this.isValidUrl(url));

    if (urls.length === 0) {
      this.showToast('유효한 URL을 찾을 수 없습니다.', 'error');
      return;
    }

    this.checkLinks(urls);
  }

  isValidUrl(url) {
    if (!url) return false;
    // 상대 경로, 앵커, javascript: 등 제외
    if (url.startsWith('#') || url.startsWith('javascript:') || url.startsWith('mailto:') || url.startsWith('tel:')) {
      return false;
    }
    // http/https 링크만
    return url.startsWith('http://') || url.startsWith('https://');
  }

  async checkLinks(urls) {
    this.links = urls.map(url => ({
      url,
      status: 'checking',
      statusCode: null,
      responseTime: null,
      type: 'unknown'
    }));

    this.elements.progressSection.style.display = 'block';
    this.elements.resultSection.style.display = 'none';

    let completed = 0;
    const total = urls.length;

    for (let i = 0; i < this.links.length; i++) {
      await this.checkSingleLink(this.links[i]);
      completed++;

      this.elements.progressCount.textContent = `${completed} / ${total}`;
      this.elements.progressFill.style.width = `${(completed / total) * 100}%`;
      this.elements.progressText.textContent = `검사 중: ${this.links[i].url.substring(0, 50)}...`;
    }

    this.elements.progressSection.style.display = 'none';
    this.renderResults();
  }

  async checkSingleLink(link) {
    const startTime = Date.now();

    try {
      // HEAD 요청으로 빠르게 확인
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(link.url, {
        method: 'HEAD',
        mode: 'no-cors', // CORS 우회
        signal: controller.signal
      });

      clearTimeout(timeout);

      link.responseTime = Date.now() - startTime;

      // no-cors 모드에서는 status를 알 수 없음
      // opaque response가 반환됨
      if (response.type === 'opaque') {
        // 응답이 있으면 일단 접근 가능으로 간주
        link.status = 'valid';
        link.statusCode = 'CORS';
        link.type = 'valid';
      } else {
        link.statusCode = response.status;

        if (response.status >= 200 && response.status < 300) {
          link.status = 'valid';
          link.type = 'valid';
        } else if (response.status >= 300 && response.status < 400) {
          link.status = 'redirect';
          link.type = 'redirect';
        } else if (response.status >= 400) {
          link.status = 'broken';
          link.type = 'broken';
        }
      }
    } catch (error) {
      link.responseTime = Date.now() - startTime;

      if (error.name === 'AbortError') {
        link.status = 'timeout';
        link.statusCode = 'Timeout';
        link.type = 'broken';
      } else {
        // CORS 에러 또는 네트워크 에러
        // 실제로는 접근 가능할 수 있음
        link.status = 'unknown';
        link.statusCode = 'N/A';
        link.type = 'unknown';
      }
    }
  }

  renderResults() {
    this.elements.resultSection.style.display = 'block';

    const total = this.links.length;
    const valid = this.links.filter(l => l.type === 'valid').length;
    const broken = this.links.filter(l => l.type === 'broken').length;
    const redirect = this.links.filter(l => l.type === 'redirect').length;

    this.elements.totalLinks.textContent = total;
    this.elements.validLinks.textContent = valid;
    this.elements.brokenLinks.textContent = broken;
    this.elements.redirectLinks.textContent = redirect;

    this.renderLinksList();
  }

  renderLinksList() {
    const list = this.elements.linksList;

    list.innerHTML = this.links.map((link, index) => {
      const statusClass = link.type;
      const statusText = {
        valid: '정상',
        broken: '깨짐',
        redirect: '리다이렉트',
        unknown: '알 수 없음'
      }[link.type] || '확인 중';

      return `
        <div class="link-item" data-type="${link.type}" data-index="${index}">
          <div class="link-status">
            <span class="status-badge ${statusClass}">${statusText}</span>
          </div>
          <div class="link-content">
            <div class="link-url">
              <a href="${this.escapeHtml(link.url)}" target="_blank" rel="noopener">${this.escapeHtml(link.url)}</a>
            </div>
            <div class="link-meta">
              <span class="link-code">상태: ${link.statusCode || '-'}</span>
              <span>응답: ${link.responseTime ? link.responseTime + 'ms' : '-'}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  filter(type) {
    this.currentFilter = type;

    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.filter === type);
    });

    document.querySelectorAll('.link-item').forEach(item => {
      const itemType = item.dataset.type;
      let show = false;

      if (type === 'all') show = true;
      else if (type === 'broken' && itemType === 'broken') show = true;
      else if (type === 'redirect' && itemType === 'redirect') show = true;
      else if (type === 'valid' && itemType === 'valid') show = true;

      item.classList.toggle('hidden', !show);
    });
  }

  exportCSV() {
    const headers = ['URL', '상태', '상태 코드', '응답 시간(ms)'];
    const rows = this.links.map(link => [
      link.url,
      link.type,
      link.statusCode || '',
      link.responseTime || ''
    ]);

    let csv = headers.join(',') + '\n';
    rows.forEach(row => {
      csv += row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',') + '\n';
    });

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'link_check_result.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  copyBrokenLinks() {
    const brokenLinks = this.links
      .filter(l => l.type === 'broken')
      .map(l => l.url)
      .join('\n');

    if (!brokenLinks) {
      this.showToast('깨진 링크가 없습니다.', 'info');
      return;
    }

    this.copyToClipboard(brokenLinks);
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}

// 전역 인스턴스 생성
const brokenLinkCheckerTool = new BrokenLinkCheckerTool();
window.BrokenLinkChecker = brokenLinkCheckerTool;

document.addEventListener('DOMContentLoaded', () => brokenLinkCheckerTool.init());
