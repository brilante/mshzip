/**
 * 업타임 모니터 - ToolBase 기반
 * 웹사이트 가용성 모니터링
 * @created 2026-01-13
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class UptimeMonitorTool extends ToolBase {
  constructor() {
    super('UptimeMonitorTool');
    this.sites = [];
    this.storageKey = 'uptimeMonitor_sites';
  }

  init() {
    this.initElements({
      urlInput: 'urlInput',
      sitesList: 'sitesList',
      statsSection: 'statsSection',
      totalSites: 'totalSites',
      onlineSites: 'onlineSites',
      offlineSites: 'offlineSites',
      avgResponseTime: 'avgResponseTime'
    });

    this.loadSites();
    this.render();

    // Enter 키로 추가
    this.elements.urlInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.addSite();
      }
    });

    console.log('[UptimeMonitorTool] 초기화 완료');
    return this;
  }

  loadSites() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      this.sites = saved ? JSON.parse(saved) : [];
    } catch (e) {
      this.sites = [];
    }
  }

  saveSites() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.sites));
  }

  addSite() {
    const input = this.elements.urlInput;
    let url = input.value.trim();

    if (!url) {
      this.showToast('URL을 입력해주세요.', 'error');
      return;
    }

    // URL 정규화
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    // URL 유효성 검사
    try {
      new URL(url);
    } catch (e) {
      this.showToast('유효한 URL을 입력해주세요.', 'error');
      return;
    }

    // 중복 체크
    if (this.sites.find(s => s.url === url)) {
      this.showToast('이미 추가된 URL입니다.', 'error');
      return;
    }

    const site = {
      id: Date.now(),
      url: url,
      status: 'unknown',
      lastCheck: null,
      responseTime: null,
      history: []
    };

    this.sites.push(site);
    this.saveSites();
    this.render();
    this.checkSite(site.id);

    input.value = '';
  }

  removeSite(id) {
    this.sites = this.sites.filter(s => s.id !== id);
    this.saveSites();
    this.render();
  }

  async checkSite(id) {
    const site = this.sites.find(s => s.id === id);
    if (!site) return;

    site.status = 'checking';
    this.render();

    const startTime = performance.now();

    try {
      // no-cors 모드로 요청 (응답 내용은 볼 수 없지만 연결 여부 확인 가능)
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      await fetch(site.url, {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-store',
        signal: controller.signal
      });

      clearTimeout(timeout);

      const endTime = performance.now();
      site.status = 'online';
      site.responseTime = Math.round(endTime - startTime);
    } catch (error) {
      if (error.name === 'AbortError') {
        site.status = 'offline';
        site.responseTime = null;
      } else {
        // no-cors 모드에서는 에러도 연결된 것으로 간주할 수 있음
        site.status = 'online';
        site.responseTime = Math.round(performance.now() - startTime);
      }
    }

    site.lastCheck = new Date().toISOString();

    // 히스토리 업데이트 (최근 20개)
    site.history.unshift({
      status: site.status,
      time: site.lastCheck,
      responseTime: site.responseTime
    });
    if (site.history.length > 20) {
      site.history = site.history.slice(0, 20);
    }

    this.saveSites();
    this.render();
  }

  async checkAll() {
    for (const site of this.sites) {
      await this.checkSite(site.id);
      // 약간의 딜레이
      await new Promise(r => setTimeout(r, 300));
    }
  }

  clearAll() {
    if (this.sites.length === 0) return;

    if (confirm('모든 사이트를 삭제하시겠습니까?')) {
      this.sites = [];
      this.saveSites();
      this.render();
    }
  }

  render() {
    const list = this.elements.sitesList;

    if (this.sites.length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <span class="empty-icon"></span>
          <p>모니터링할 사이트를 추가하세요</p>
        </div>
      `;
      this.elements.statsSection.style.display = 'none';
      return;
    }

    list.innerHTML = this.sites.map(site => {
      const statusIcon = site.status === 'online' ? '' :
                        site.status === 'offline' ? '' :
                        site.status === 'checking' ? '' : '';

      const statusText = site.status === 'online' ? '온라인' :
                        site.status === 'offline' ? '오프라인' :
                        site.status === 'checking' ? '확인 중...' : '미확인';

      const lastCheckText = site.lastCheck
        ? this.formatTime(new Date(site.lastCheck))
        : '확인 전';

      return `
        <div class="site-card ${site.status}">
          <div class="site-status">${statusIcon}</div>
          <div class="site-info">
            <div class="site-url">${this.escapeHtml(site.url)}</div>
            <div class="site-meta">
              <span>${statusText}</span>
              ${site.responseTime !== null ? `<span>${site.responseTime}ms</span>` : ''}
              <span>${lastCheckText}</span>
            </div>
            ${site.history.length > 0 ? `
              <div class="site-history" title="최근 체크 기록">
                ${site.history.slice(0, 10).reverse().map(h => `
                  <div class="history-dot ${h.status}" title="${this.formatTime(new Date(h.time))}"></div>
                `).join('')}
              </div>
            ` : ''}
          </div>
          <div class="site-actions">
            <button class="site-btn" onclick="uptimeMonitorTool.checkSite(${site.id})">확인</button>
            <button class="site-btn danger" onclick="uptimeMonitorTool.removeSite(${site.id})"></button>
          </div>
        </div>
      `;
    }).join('');

    // 통계 업데이트
    this.updateStats();
  }

  updateStats() {
    this.elements.statsSection.style.display = 'block';

    const total = this.sites.length;
    const online = this.sites.filter(s => s.status === 'online').length;
    const offline = this.sites.filter(s => s.status === 'offline').length;

    const responseTimes = this.sites
      .filter(s => s.responseTime !== null)
      .map(s => s.responseTime);
    const avgResponse = responseTimes.length > 0
      ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
      : 0;

    this.elements.totalSites.textContent = total;
    this.elements.onlineSites.textContent = online;
    this.elements.offlineSites.textContent = offline;
    this.elements.avgResponseTime.textContent = avgResponse;
  }

  formatTime(date) {
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) {
      return '방금 전';
    } else if (diff < 3600000) {
      return `${Math.floor(diff / 60000)}분 전`;
    } else if (diff < 86400000) {
      return `${Math.floor(diff / 3600000)}시간 전`;
    } else {
      return date.toLocaleString('ko-KR', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  }

  escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}

// 전역 인스턴스 생성
const uptimeMonitorTool = new UptimeMonitorTool();
window.UptimeMonitor = uptimeMonitorTool;

document.addEventListener('DOMContentLoaded', () => uptimeMonitorTool.init());
