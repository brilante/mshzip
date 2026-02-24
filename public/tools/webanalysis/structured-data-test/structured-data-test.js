/**
 * 구조화 데이터 테스트 - ToolBase 기반
 * Schema.org JSON-LD 검증
 * @created 2026-01-13
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class StructuredDataTestTool extends ToolBase {
  constructor() {
    super('StructuredDataTestTool');
    this.schemas = [];
    this.validations = [];

    this.templates = {
      organization: {
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": "회사명",
        "url": "https://example.com",
        "logo": "https://example.com/logo.png",
        "sameAs": [
          "https://facebook.com/example",
          "https://twitter.com/example"
        ],
        "contactPoint": {
          "@type": "ContactPoint",
          "telephone": "+82-10-1234-5678",
          "contactType": "customer service"
        }
      },
      product: {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": "제품명",
        "description": "제품 설명",
        "image": "https://example.com/product.jpg",
        "brand": {
          "@type": "Brand",
          "name": "브랜드명"
        },
        "offers": {
          "@type": "Offer",
          "price": "29900",
          "priceCurrency": "KRW",
          "availability": "https://schema.org/InStock"
        }
      },
      article: {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": "기사 제목",
        "description": "기사 설명",
        "image": "https://example.com/article.jpg",
        "author": {
          "@type": "Person",
          "name": "작성자"
        },
        "publisher": {
          "@type": "Organization",
          "name": "발행자",
          "logo": {
            "@type": "ImageObject",
            "url": "https://example.com/logo.png"
          }
        },
        "datePublished": "2024-01-01",
        "dateModified": "2024-01-02"
      },
      faq: {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "질문 1?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "답변 1"
            }
          },
          {
            "@type": "Question",
            "name": "질문 2?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "답변 2"
            }
          }
        ]
      },
      breadcrumb: {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "홈",
            "item": "https://example.com"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "카테고리",
            "item": "https://example.com/category"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "현재 페이지"
          }
        ]
      },
      localbusiness: {
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        "name": "매장명",
        "description": "매장 설명",
        "image": "https://example.com/store.jpg",
        "telephone": "+82-2-1234-5678",
        "address": {
          "@type": "PostalAddress",
          "streetAddress": "서울시 강남구 테헤란로 123",
          "addressLocality": "서울",
          "addressRegion": "서울특별시",
          "postalCode": "06123",
          "addressCountry": "KR"
        },
        "openingHoursSpecification": [
          {
            "@type": "OpeningHoursSpecification",
            "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
            "opens": "09:00",
            "closes": "18:00"
          }
        ]
      }
    };

    this.requiredProperties = {
      'Organization': ['name'],
      'Product': ['name'],
      'Article': ['headline', 'author', 'datePublished'],
      'LocalBusiness': ['name', 'address'],
      'FAQPage': ['mainEntity'],
      'BreadcrumbList': ['itemListElement'],
      'Person': ['name'],
      'Event': ['name', 'startDate', 'location']
    };
  }

  init() {
    this.initElements({
      jsonldInput: 'jsonldInput',
      htmlInput: 'htmlInput',
      resultSection: 'resultSection',
      summaryStatus: 'summaryStatus',
      schemaCount: 'schemaCount',
      errorCount: 'errorCount',
      warningCount: 'warningCount',
      schemasList: 'schemasList',
      validationSection: 'validationSection',
      validationList: 'validationList',
      jsonViewer: 'jsonViewer'
    });

    console.log('[StructuredDataTestTool] 초기화 완료');
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

  useTemplate(type) {
    const template = this.templates[type];
    if (template) {
      this.elements.jsonldInput.value = JSON.stringify(template, null, 2);
      this.switchTab('jsonld');
    }
  }

  analyze() {
    let jsonData;
    const activeTab = document.querySelector('.tab-content.active').id;

    if (activeTab === 'jsonldTab') {
      const input = this.elements.jsonldInput.value.trim();
      if (!input) {
        this.showToast('JSON-LD 데이터를 입력해주세요.', 'error');
        return;
      }
      try {
        jsonData = JSON.parse(input);
      } catch (e) {
        this.showError('JSON 파싱 오류: ' + e.message);
        return;
      }
    } else {
      const html = this.elements.htmlInput.value.trim();
      if (!html) {
        this.showToast('HTML 코드를 입력해주세요.', 'error');
        return;
      }
      jsonData = this.extractJsonLd(html);
      if (!jsonData) {
        this.showError('HTML에서 JSON-LD 스크립트를 찾을 수 없습니다.');
        return;
      }
    }

    this.validateData(jsonData);
  }

  extractJsonLd(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const scripts = doc.querySelectorAll('script[type="application/ld+json"]');

    if (scripts.length === 0) return null;

    const schemas = [];
    scripts.forEach(script => {
      try {
        const data = JSON.parse(script.textContent);
        if (Array.isArray(data)) {
          schemas.push(...data);
        } else {
          schemas.push(data);
        }
      } catch (e) {
        console.error('JSON-LD 파싱 오류:', e);
      }
    });

    return schemas.length === 1 ? schemas[0] : schemas;
  }

  validateData(data) {
    this.schemas = [];
    this.validations = [];

    // 배열인 경우 각각 검증
    const items = Array.isArray(data) ? data : [data];

    items.forEach(item => {
      this.validateSchema(item);
    });

    this.renderResults(data);
  }

  validateSchema(schema, path = '') {
    // @context 검증
    if (!schema['@context']) {
      this.validations.push({
        type: 'error',
        message: '@context가 없습니다',
        detail: 'Schema.org context가 필요합니다'
      });
    } else if (!schema['@context'].includes('schema.org')) {
      this.validations.push({
        type: 'warning',
        message: '비표준 @context',
        detail: 'schema.org context 사용 권장'
      });
    }

    // @type 검증
    if (!schema['@type']) {
      this.validations.push({
        type: 'error',
        message: '@type이 없습니다',
        detail: '스키마 유형을 지정해야 합니다'
      });
    } else {
      const schemaInfo = {
        type: schema['@type'],
        properties: Object.keys(schema).filter(k => !k.startsWith('@'))
      };
      this.schemas.push(schemaInfo);

      // 타입별 필수 속성 검증
      this.validateRequiredProperties(schema);
    }

    // 중첩된 객체 검증
    Object.entries(schema).forEach(([key, value]) => {
      if (value && typeof value === 'object' && !Array.isArray(value) && value['@type']) {
        this.validateSchema(value, `${path}.${key}`);
      }
      if (Array.isArray(value)) {
        value.forEach((item, i) => {
          if (item && typeof item === 'object' && item['@type']) {
            this.validateSchema(item, `${path}.${key}[${i}]`);
          }
        });
      }
    });
  }

  validateRequiredProperties(schema) {
    const type = schema['@type'];
    const required = this.requiredProperties;

    if (required[type]) {
      required[type].forEach(prop => {
        if (!schema[prop]) {
          this.validations.push({
            type: 'warning',
            message: `${type}에 권장 속성 '${prop}'이 없습니다`,
            detail: '검색 결과 표시에 영향을 줄 수 있습니다'
          });
        }
      });
    }

    // 이미지 권장
    const typesNeedingImage = ['Product', 'Article', 'Organization', 'LocalBusiness'];
    if (typesNeedingImage.includes(type) && !schema.image) {
      this.validations.push({
        type: 'warning',
        message: `${type}에 'image' 속성 권장`,
        detail: '이미지가 있으면 검색 결과에 더 잘 표시됩니다'
      });
    }
  }

  showError(message) {
    this.elements.resultSection.style.display = 'block';
    this.elements.summaryStatus.className = 'summary-status error';
    this.elements.summaryStatus.innerHTML = `
      <span class="status-icon"></span>
      <span class="status-text">${message}</span>
    `;
    this.elements.schemaCount.textContent = '0';
    this.elements.errorCount.textContent = '1';
    this.elements.warningCount.textContent = '0';
    this.elements.schemasList.innerHTML = '';
    this.elements.validationList.innerHTML = '';
    this.elements.jsonViewer.textContent = '';
  }

  renderResults(data) {
    this.elements.resultSection.style.display = 'block';

    const errors = this.validations.filter(v => v.type === 'error').length;
    const warnings = this.validations.filter(v => v.type === 'warning').length;

    // 요약
    const summaryEl = this.elements.summaryStatus;
    if (errors > 0) {
      summaryEl.className = 'summary-status error';
      summaryEl.innerHTML = `<span class="status-icon"></span><span class="status-text">오류가 발견되었습니다</span>`;
    } else if (warnings > 0) {
      summaryEl.className = 'summary-status';
      summaryEl.innerHTML = `<span class="status-icon"></span><span class="status-text">경고가 있습니다</span>`;
    } else {
      summaryEl.className = 'summary-status success';
      summaryEl.innerHTML = `<span class="status-icon"></span><span class="status-text">유효한 구조화 데이터</span>`;
    }

    this.elements.schemaCount.textContent = this.schemas.length;
    this.elements.errorCount.textContent = errors;
    this.elements.warningCount.textContent = warnings;

    // 스키마 목록
    this.elements.schemasList.innerHTML = this.schemas.map(s => `
      <div class="schema-card">
        <div class="schema-type">${s.type}</div>
        <div class="schema-properties">
          ${s.properties.map(p => `<span class="property-tag">${p}</span>`).join('')}
        </div>
      </div>
    `).join('') || '<p>발견된 스키마가 없습니다.</p>';

    // 검증 결과
    if (this.validations.length > 0) {
      this.elements.validationSection.style.display = 'block';
      this.elements.validationList.innerHTML = this.validations.map(v => `
        <div class="validation-item">
          <div class="validation-icon ${v.type}">${v.type === 'error' ? '' : '!'}</div>
          <div class="validation-content">
            <div class="validation-message">${v.message}</div>
            <div class="validation-detail">${v.detail}</div>
          </div>
        </div>
      `).join('');
    } else {
      this.elements.validationSection.style.display = 'none';
    }

    // JSON 뷰어
    this.elements.jsonViewer.textContent = JSON.stringify(data, null, 2);
  }
}

// 전역 인스턴스 생성
const structuredDataTestTool = new StructuredDataTestTool();
window.StructuredDataTest = structuredDataTestTool;

document.addEventListener('DOMContentLoaded', () => structuredDataTestTool.init());
