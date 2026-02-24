/**
 * 기술 스택 탐지기 - ToolBase 기반
 * 웹사이트 기술 분석
 * @created 2026-01-13
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class TechStackDetectorTool extends ToolBase {
  constructor() {
    super('TechStackDetectorTool');
    this.detectedTechs = [];

    // 기술 정의 데이터베이스
    this.technologies = {
      // JavaScript 프레임워크
      frameworks: [
        { name: 'React', icon: '', patterns: [/react(?:\.min)?\.js/i, /react-dom/i, /__REACT_DEVTOOLS/i, /data-reactroot/i, /data-reactid/i], category: 'framework', description: 'Facebook의 UI 라이브러리' },
        { name: 'Vue.js', icon: '', patterns: [/vue(?:\.min)?\.js/i, /v-if/i, /v-for/i, /v-model/i, /__VUE__/i, /data-v-[a-f0-9]/i], category: 'framework', description: '프로그레시브 프레임워크' },
        { name: 'Angular', icon: '🅰', patterns: [/angular(?:\.min)?\.js/i, /ng-app/i, /ng-controller/i, /ng-model/i, /@angular\/core/i], category: 'framework', description: 'Google의 TypeScript 프레임워크' },
        { name: 'Next.js', icon: '▲', patterns: [/_next\//i, /next\.config/i, /__NEXT_DATA__/i], category: 'framework', description: 'React 기반 풀스택 프레임워크' },
        { name: 'Nuxt.js', icon: '', patterns: [/_nuxt\//i, /__NUXT__/i], category: 'framework', description: 'Vue.js 기반 풀스택 프레임워크' },
        { name: 'Svelte', icon: '', patterns: [/svelte/i, /\.svelte/i], category: 'framework', description: '컴파일 기반 프레임워크' },
        { name: 'Ember.js', icon: '', patterns: [/ember(?:\.min)?\.js/i, /data-ember/i], category: 'framework', description: 'Convention over Configuration 프레임워크' },
        { name: 'Backbone.js', icon: '', patterns: [/backbone(?:\.min)?\.js/i], category: 'framework', description: 'MVC 프레임워크' },
      ],

      // JavaScript 라이브러리
      libraries: [
        { name: 'jQuery', icon: '', patterns: [/jquery(?:\.min)?\.js/i, /\$\(document\)/i, /\$\(function/i], category: 'library', description: 'DOM 조작 라이브러리' },
        { name: 'Lodash', icon: '', patterns: [/lodash(?:\.min)?\.js/i, /_\.map\(/i], category: 'library', description: '유틸리티 라이브러리' },
        { name: 'Moment.js', icon: '', patterns: [/moment(?:\.min)?\.js/i], category: 'library', description: '날짜 처리 라이브러리' },
        { name: 'Axios', icon: '', patterns: [/axios(?:\.min)?\.js/i], category: 'library', description: 'HTTP 클라이언트' },
        { name: 'Three.js', icon: '', patterns: [/three(?:\.min)?\.js/i], category: 'library', description: '3D 그래픽 라이브러리' },
        { name: 'D3.js', icon: '', patterns: [/d3(?:\.min)?\.js/i], category: 'library', description: '데이터 시각화 라이브러리' },
        { name: 'Chart.js', icon: '', patterns: [/chart(?:\.min)?\.js/i], category: 'library', description: '차트 라이브러리' },
        { name: 'GSAP', icon: '', patterns: [/gsap(?:\.min)?\.js/i, /TweenMax/i, /TweenLite/i], category: 'library', description: '애니메이션 라이브러리' },
        { name: 'Swiper', icon: '', patterns: [/swiper(?:\.min)?\.js/i, /swiper-container/i], category: 'library', description: '슬라이더 라이브러리' },
        { name: 'Slick', icon: '', patterns: [/slick(?:\.min)?\.js/i, /slick-slider/i], category: 'library', description: '캐러셀 라이브러리' },
      ],

      // CSS 프레임워크
      cssFrameworks: [
        { name: 'Bootstrap', icon: '🅱', patterns: [/bootstrap(?:\.min)?\.css/i, /bootstrap(?:\.min)?\.js/i, /class="[^"]*\bcontainer\b[^"]*"/i, /class="[^"]*\bcol-/i], category: 'css', description: 'CSS 프레임워크' },
        { name: 'Tailwind CSS', icon: '', patterns: [/tailwind(?:\.min)?\.css/i, /class="[^"]*\b(?:flex|grid|p-\d|m-\d|text-|bg-)\b/i], category: 'css', description: '유틸리티 우선 CSS' },
        { name: 'Material UI', icon: '', patterns: [/material-ui/i, /MuiButton/i, /MuiPaper/i], category: 'css', description: 'Google Material Design' },
        { name: 'Bulma', icon: '', patterns: [/bulma(?:\.min)?\.css/i], category: 'css', description: 'Flexbox CSS 프레임워크' },
        { name: 'Foundation', icon: '', patterns: [/foundation(?:\.min)?\.css/i], category: 'css', description: 'ZURB의 CSS 프레임워크' },
        { name: 'Semantic UI', icon: '', patterns: [/semantic(?:\.min)?\.css/i], category: 'css', description: 'UI 컴포넌트 프레임워크' },
      ],

      // CMS
      cms: [
        { name: 'WordPress', icon: '', patterns: [/wp-content/i, /wp-includes/i, /wordpress/i], category: 'cms', description: '블로그/CMS 플랫폼' },
        { name: 'Drupal', icon: '', patterns: [/drupal/i, /sites\/default/i], category: 'cms', description: '오픈소스 CMS' },
        { name: 'Joomla', icon: '', patterns: [/joomla/i, /\/media\/system/i], category: 'cms', description: '오픈소스 CMS' },
        { name: 'Shopify', icon: '', patterns: [/cdn\.shopify/i, /shopify/i], category: 'cms', description: '이커머스 플랫폼' },
        { name: 'Wix', icon: '', patterns: [/wix\.com/i, /wixstatic/i], category: 'cms', description: '웹사이트 빌더' },
        { name: 'Squarespace', icon: '', patterns: [/squarespace/i], category: 'cms', description: '웹사이트 빌더' },
        { name: 'Webflow', icon: '', patterns: [/webflow/i], category: 'cms', description: '노코드 웹사이트 빌더' },
        { name: 'Ghost', icon: '', patterns: [/ghost\.io/i, /ghost-url/i], category: 'cms', description: '블로깅 플랫폼' },
      ],

      // 분석/마케팅
      analytics: [
        { name: 'Google Analytics', icon: '', patterns: [/google-analytics/i, /googletagmanager/i, /gtag\(/i, /ga\('send'/i, /UA-\d+-\d+/i, /G-[A-Z0-9]+/i], category: 'analytics', description: '웹 분석 도구' },
        { name: 'Google Tag Manager', icon: '', patterns: [/googletagmanager\.com\/gtm/i, /GTM-[A-Z0-9]+/i], category: 'analytics', description: '태그 관리 시스템' },
        { name: 'Facebook Pixel', icon: '', patterns: [/fbevents\.js/i, /connect\.facebook\.net/i, /fbq\(/i], category: 'analytics', description: 'Facebook 광고 추적' },
        { name: 'Hotjar', icon: '', patterns: [/hotjar/i, /static\.hotjar\.com/i], category: 'analytics', description: '히트맵/세션 녹화' },
        { name: 'Mixpanel', icon: '', patterns: [/mixpanel/i], category: 'analytics', description: '제품 분석' },
        { name: 'Amplitude', icon: '', patterns: [/amplitude/i], category: 'analytics', description: '제품 분석' },
        { name: 'Heap', icon: '', patterns: [/heap-\d+\.js/i, /heapanalytics/i], category: 'analytics', description: '자동 이벤트 추적' },
      ],

      // 서버/백엔드 (헤더 기반)
      server: [
        { name: 'nginx', icon: '', headerPatterns: [/nginx/i], category: 'server', description: '웹 서버' },
        { name: 'Apache', icon: '', headerPatterns: [/apache/i], category: 'server', description: '웹 서버' },
        { name: 'Express', icon: '', headerPatterns: [/express/i], category: 'server', description: 'Node.js 웹 프레임워크' },
        { name: 'PHP', icon: '', headerPatterns: [/php/i], category: 'server', description: '서버 사이드 언어' },
        { name: 'ASP.NET', icon: '', headerPatterns: [/asp\.net/i], patterns: [/__VIEWSTATE/i, /aspnetForm/i], category: 'server', description: 'Microsoft 웹 프레임워크' },
        { name: 'Cloudflare', icon: '', headerPatterns: [/cloudflare/i], patterns: [/cloudflare/i, /cdnjs\.cloudflare/i], category: 'server', description: 'CDN/보안 서비스' },
      ],

      // 기타 도구
      tools: [
        { name: 'Font Awesome', icon: '', patterns: [/font-awesome/i, /fontawesome/i, /fa-[a-z]+/i], category: 'tool', description: '아이콘 라이브러리' },
        { name: 'Google Fonts', icon: '', patterns: [/fonts\.googleapis\.com/i, /fonts\.gstatic\.com/i], category: 'tool', description: '웹 폰트' },
        { name: 'reCAPTCHA', icon: '', patterns: [/recaptcha/i, /grecaptcha/i], category: 'tool', description: '봇 방지' },
        { name: 'Stripe', icon: '', patterns: [/stripe\.com/i, /js\.stripe/i], category: 'tool', description: '결제 서비스' },
        { name: 'PayPal', icon: '', patterns: [/paypal/i], category: 'tool', description: '결제 서비스' },
        { name: 'Sentry', icon: '', patterns: [/sentry\.io/i, /browser\.sentry-cdn/i], category: 'tool', description: '에러 모니터링' },
        { name: 'Intercom', icon: '', patterns: [/intercom/i, /intercomcdn/i], category: 'tool', description: '고객 메시징' },
        { name: 'Zendesk', icon: '', patterns: [/zendesk/i], category: 'tool', description: '고객 지원' },
        { name: 'Drift', icon: '', patterns: [/drift\.com/i], category: 'tool', description: '라이브 채팅' },
      ]
    };

    this.categoryNames = {
      'framework': '프레임워크',
      'library': '라이브러리',
      'css': 'CSS',
      'cms': 'CMS',
      'analytics': '분석',
      'server': '서버',
      'tool': '도구'
    };
  }

  init() {
    this.initElements({
      htmlInput: 'htmlInput',
      htmlHeadersInput: 'htmlHeadersInput',
      headersInput: 'headersInput',
      resultSection: 'resultSection',
      totalCount: 'totalCount',
      frameworkCount: 'frameworkCount',
      libraryCount: 'libraryCount',
      toolCount: 'toolCount',
      categoriesGrid: 'categoriesGrid',
      techList: 'techList'
    });

    console.log('[TechStackDetectorTool] 초기화 완료');
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

  analyze() {
    const activeTab = document.querySelector('.tab-content.active').id;
    let html = '';
    let headers = '';

    if (activeTab === 'htmlTab') {
      html = this.elements.htmlInput.value.trim();
    } else {
      html = this.elements.htmlHeadersInput.value.trim();
      headers = this.elements.headersInput.value.trim();
    }

    if (!html) {
      this.showToast('HTML 소스 코드를 입력해주세요.', 'error');
      return;
    }

    this.detectedTechs = [];
    this.detectFromHtml(html);
    if (headers) {
      this.detectFromHeaders(headers);
    }

    this.renderResults();
  }

  detectFromHtml(html) {
    const allCategories = [
      ...this.technologies.frameworks,
      ...this.technologies.libraries,
      ...this.technologies.cssFrameworks,
      ...this.technologies.cms,
      ...this.technologies.analytics,
      ...this.technologies.server,
      ...this.technologies.tools
    ];

    allCategories.forEach(tech => {
      if (!tech.patterns) return;

      let matches = 0;
      let totalPatterns = tech.patterns.length;

      tech.patterns.forEach(pattern => {
        if (pattern.test(html)) {
          matches++;
        }
      });

      if (matches > 0) {
        const confidence = Math.min(100, Math.round((matches / totalPatterns) * 100) + 30);

        // 중복 체크
        if (!this.detectedTechs.find(t => t.name === tech.name)) {
          this.detectedTechs.push({
            ...tech,
            confidence,
            matchCount: matches
          });
        }
      }
    });

    // 버전 감지 시도
    this.detectVersions(html);
  }

  detectFromHeaders(headers) {
    const headerLines = headers.split('\n');
    const headerMap = {};

    headerLines.forEach(line => {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const name = line.substring(0, colonIndex).trim().toLowerCase();
        const value = line.substring(colonIndex + 1).trim();
        headerMap[name] = value;
      }
    });

    const serverTechs = this.technologies.server;
    serverTechs.forEach(tech => {
      if (!tech.headerPatterns) return;

      // Server 헤더 체크
      const serverHeader = headerMap['server'] || '';
      const poweredBy = headerMap['x-powered-by'] || '';
      const combined = serverHeader + ' ' + poweredBy;

      tech.headerPatterns.forEach(pattern => {
        if (pattern.test(combined)) {
          if (!this.detectedTechs.find(t => t.name === tech.name)) {
            this.detectedTechs.push({
              ...tech,
              confidence: 90,
              matchCount: 1,
              source: 'header'
            });
          }
        }
      });
    });
  }

  detectVersions(html) {
    // jQuery 버전
    const jqueryMatch = html.match(/jquery[.-]?(\d+\.\d+(?:\.\d+)?)/i);
    if (jqueryMatch) {
      const tech = this.detectedTechs.find(t => t.name === 'jQuery');
      if (tech) tech.version = jqueryMatch[1];
    }

    // React 버전
    const reactMatch = html.match(/react[.-]?(\d+\.\d+(?:\.\d+)?)/i);
    if (reactMatch) {
      const tech = this.detectedTechs.find(t => t.name === 'React');
      if (tech) tech.version = reactMatch[1];
    }

    // Vue 버전
    const vueMatch = html.match(/vue[.-]?(\d+\.\d+(?:\.\d+)?)/i);
    if (vueMatch) {
      const tech = this.detectedTechs.find(t => t.name === 'Vue.js');
      if (tech) tech.version = vueMatch[1];
    }

    // Bootstrap 버전
    const bootstrapMatch = html.match(/bootstrap[.-]?(\d+\.\d+(?:\.\d+)?)/i);
    if (bootstrapMatch) {
      const tech = this.detectedTechs.find(t => t.name === 'Bootstrap');
      if (tech) tech.version = bootstrapMatch[1];
    }
  }

  renderResults() {
    this.elements.resultSection.style.display = 'block';

    // 통계 업데이트
    const frameworks = this.detectedTechs.filter(t => t.category === 'framework');
    const libraries = this.detectedTechs.filter(t => t.category === 'library' || t.category === 'css');
    const tools = this.detectedTechs.filter(t => !['framework', 'library', 'css'].includes(t.category));

    this.elements.totalCount.textContent = this.detectedTechs.length;
    this.elements.frameworkCount.textContent = frameworks.length;
    this.elements.libraryCount.textContent = libraries.length;
    this.elements.toolCount.textContent = tools.length;

    // 카테고리별 그룹화
    const categories = {
      'framework': { name: 'JavaScript 프레임워크', icon: '', items: [] },
      'library': { name: 'JavaScript 라이브러리', icon: '', items: [] },
      'css': { name: 'CSS 프레임워크', icon: '', items: [] },
      'cms': { name: 'CMS/플랫폼', icon: '', items: [] },
      'analytics': { name: '분석/마케팅', icon: '', items: [] },
      'server': { name: '서버/인프라', icon: '', items: [] },
      'tool': { name: '도구/서비스', icon: '', items: [] }
    };

    this.detectedTechs.forEach(tech => {
      if (categories[tech.category]) {
        categories[tech.category].items.push(tech);
      }
    });

    // 카테고리 카드 렌더링
    const grid = this.elements.categoriesGrid;
    grid.innerHTML = Object.entries(categories)
      .filter(([_, cat]) => cat.items.length > 0)
      .map(([_, cat]) => `
        <div class="category-card">
          <div class="category-header">
            <span class="category-icon">${cat.icon}</span>
            <span class="category-name">${cat.name}</span>
            <span class="category-count">${cat.items.length}</span>
          </div>
          <div class="category-items">
            ${cat.items.map(tech => `
              <span class="tech-tag">
                ${tech.icon} ${tech.name}
                ${tech.version ? `<span class="version">v${tech.version}</span>` : ''}
              </span>
            `).join('')}
          </div>
        </div>
      `).join('');

    // 상세 목록 렌더링
    const list = this.elements.techList;
    const sortedTechs = [...this.detectedTechs].sort((a, b) => b.confidence - a.confidence);

    list.innerHTML = sortedTechs.map(tech => `
      <div class="tech-item">
        <div class="tech-icon">${tech.icon}</div>
        <div class="tech-info">
          <div class="tech-name">${tech.name}${tech.version ? ` v${tech.version}` : ''}</div>
          <div class="tech-description">${tech.description}</div>
        </div>
        <div class="tech-category">${this.categoryNames[tech.category] || tech.category}</div>
        <div class="tech-confidence">
          <div class="confidence-bar">
            <div class="confidence-fill" style="width: ${tech.confidence}%"></div>
          </div>
          <span class="confidence-text">${tech.confidence}%</span>
        </div>
      </div>
    `).join('') || '<p style="text-align:center; color: var(--tools-text-secondary);">탐지된 기술이 없습니다.</p>';
  }
}

// 전역 인스턴스 생성
const techStackDetectorTool = new TechStackDetectorTool();
window.TechStackDetector = techStackDetectorTool;

document.addEventListener('DOMContentLoaded', () => techStackDetectorTool.init());
