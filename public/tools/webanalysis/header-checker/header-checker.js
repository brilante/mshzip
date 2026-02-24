/**
 * HTTP 헤더 분석기 - ToolBase 기반
 * 보안 및 성능 헤더 점검
 * @created 2026-01-13
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class HeaderCheckerTool extends ToolBase {
  constructor() {
    super('HeaderCheckerTool');
    this.headers = {};

    // 보안 헤더 정의
    this.securityHeaders = [
      {
        name: 'strict-transport-security',
        displayName: 'Strict-Transport-Security (HSTS)',
        description: 'HTTPS 연결을 강제하여 중간자 공격을 방지합니다',
        importance: 'high',
        check: (value) => {
          if (!value) return { pass: false, message: '헤더가 없습니다' };
          const hasMaxAge = value.includes('max-age=');
          const maxAgeMatch = value.match(/max-age=(\d+)/);
          const maxAge = maxAgeMatch ? parseInt(maxAgeMatch[1]) : 0;
          if (maxAge >= 31536000) {
            return { pass: true, message: '올바르게 설정됨 (1년 이상)' };
          } else if (maxAge > 0) {
            return { pass: 'warning', message: `max-age가 짧습니다 (${maxAge}초). 31536000(1년) 이상 권장` };
          }
          return { pass: false, message: 'max-age 값이 필요합니다' };
        }
      },
      {
        name: 'content-security-policy',
        displayName: 'Content-Security-Policy (CSP)',
        description: 'XSS 및 데이터 인젝션 공격을 방지합니다',
        importance: 'high',
        check: (value) => {
          if (!value) return { pass: false, message: '헤더가 없습니다' };
          if (value.includes('unsafe-inline') || value.includes('unsafe-eval')) {
            return { pass: 'warning', message: '설정됨 (unsafe 지시어 포함)' };
          }
          return { pass: true, message: '설정됨' };
        }
      },
      {
        name: 'x-frame-options',
        displayName: 'X-Frame-Options',
        description: '클릭재킹 공격을 방지합니다',
        importance: 'high',
        check: (value) => {
          if (!value) return { pass: false, message: '헤더가 없습니다' };
          const valid = ['DENY', 'SAMEORIGIN'];
          if (valid.includes(value.toUpperCase())) {
            return { pass: true, message: `설정됨 (${value})` };
          }
          return { pass: 'warning', message: 'DENY 또는 SAMEORIGIN 권장' };
        }
      },
      {
        name: 'x-content-type-options',
        displayName: 'X-Content-Type-Options',
        description: 'MIME 스니핑 공격을 방지합니다',
        importance: 'medium',
        check: (value) => {
          if (!value) return { pass: false, message: '헤더가 없습니다' };
          if (value.toLowerCase() === 'nosniff') {
            return { pass: true, message: '설정됨 (nosniff)' };
          }
          return { pass: false, message: 'nosniff 값이 필요합니다' };
        }
      },
      {
        name: 'x-xss-protection',
        displayName: 'X-XSS-Protection',
        description: '브라우저의 XSS 필터를 활성화합니다',
        importance: 'medium',
        check: (value) => {
          if (!value) return { pass: 'warning', message: '헤더가 없습니다 (최신 브라우저는 CSP 사용)' };
          if (value.includes('1') && value.includes('block')) {
            return { pass: true, message: '설정됨 (차단 모드)' };
          } else if (value.includes('1')) {
            return { pass: true, message: '설정됨' };
          }
          return { pass: false, message: '활성화되지 않음' };
        }
      },
      {
        name: 'referrer-policy',
        displayName: 'Referrer-Policy',
        description: 'Referrer 정보 노출을 제어합니다',
        importance: 'medium',
        check: (value) => {
          if (!value) return { pass: 'warning', message: '헤더가 없습니다' };
          const secure = ['no-referrer', 'same-origin', 'strict-origin', 'strict-origin-when-cross-origin'];
          if (secure.some(s => value.toLowerCase().includes(s))) {
            return { pass: true, message: `설정됨 (${value})` };
          }
          return { pass: 'warning', message: '더 제한적인 정책 권장' };
        }
      },
      {
        name: 'permissions-policy',
        displayName: 'Permissions-Policy',
        description: '브라우저 기능 사용을 제어합니다',
        importance: 'low',
        check: (value) => {
          if (!value) return { pass: 'warning', message: '헤더가 없습니다 (선택사항)' };
          return { pass: true, message: '설정됨' };
        }
      }
    ];

    // 성능 헤더 정의
    this.performanceHeaders = [
      {
        name: 'cache-control',
        displayName: 'Cache-Control',
        description: '브라우저 캐싱을 제어합니다',
        importance: 'high',
        check: (value) => {
          if (!value) return { pass: false, message: '헤더가 없습니다' };
          if (value.includes('no-store')) {
            return { pass: 'warning', message: '캐싱 비활성화됨' };
          }
          if (value.includes('max-age') || value.includes('public') || value.includes('private')) {
            return { pass: true, message: `설정됨 (${value.substring(0, 50)})` };
          }
          return { pass: 'warning', message: '캐싱 정책 확인 필요' };
        }
      },
      {
        name: 'content-encoding',
        displayName: 'Content-Encoding',
        description: '응답 압축 설정입니다',
        importance: 'high',
        check: (value) => {
          if (!value) return { pass: 'warning', message: '압축이 적용되지 않았습니다' };
          if (value.includes('gzip') || value.includes('br') || value.includes('deflate')) {
            return { pass: true, message: `압축됨 (${value})` };
          }
          return { pass: 'warning', message: '알 수 없는 인코딩' };
        }
      },
      {
        name: 'etag',
        displayName: 'ETag',
        description: '캐시 유효성 검사에 사용됩니다',
        importance: 'medium',
        check: (value) => {
          if (!value) return { pass: 'warning', message: '헤더가 없습니다' };
          return { pass: true, message: '설정됨' };
        }
      },
      {
        name: 'vary',
        displayName: 'Vary',
        description: '캐시 키 변형을 정의합니다',
        importance: 'low',
        check: (value) => {
          if (!value) return { pass: 'warning', message: '헤더가 없습니다' };
          return { pass: true, message: `설정됨 (${value})` };
        }
      },
      {
        name: 'connection',
        displayName: 'Connection',
        description: '연결 재사용 설정입니다',
        importance: 'low',
        check: (value) => {
          if (!value) return { pass: 'warning', message: '헤더가 없습니다' };
          if (value.toLowerCase() === 'keep-alive') {
            return { pass: true, message: 'Keep-Alive 활성화됨' };
          }
          return { pass: true, message: value };
        }
      }
    ];
  }

  init() {
    this.initElements({
      headersInput: 'headersInput',
      resultSection: 'resultSection',
      securityScore: 'securityScore',
      performanceScore: 'performanceScore',
      overallScore: 'overallScore',
      securityChecklist: 'securityChecklist',
      performanceChecklist: 'performanceChecklist',
      headersList: 'headersList',
      headerCount: 'headerCount'
    });

    console.log('[HeaderCheckerTool] 초기화 완료');
    return this;
  }

  analyze() {
    const input = this.elements.headersInput.value.trim();
    if (!input) {
      this.showToast('HTTP 헤더를 입력해주세요.', 'error');
      return;
    }

    this.headers = this.parseHeaders(input);

    if (Object.keys(this.headers).length === 0) {
      this.showToast('유효한 헤더를 찾을 수 없습니다.', 'error');
      return;
    }

    this.renderResults();
  }

  parseHeaders(text) {
    const headers = {};
    const lines = text.split('\n');

    lines.forEach(line => {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const name = line.substring(0, colonIndex).trim().toLowerCase();
        const value = line.substring(colonIndex + 1).trim();
        headers[name] = value;
      }
    });

    return headers;
  }

  renderResults() {
    this.elements.resultSection.style.display = 'block';

    // 보안 점수 계산
    let securityPoints = 0;
    let securityTotal = 0;
    const securityResults = this.securityHeaders.map(header => {
      const value = this.headers[header.name];
      const result = header.check(value);
      const weight = header.importance === 'high' ? 3 : header.importance === 'medium' ? 2 : 1;
      securityTotal += weight;
      if (result.pass === true) securityPoints += weight;
      else if (result.pass === 'warning') securityPoints += weight * 0.5;
      return { ...header, value, result };
    });

    // 성능 점수 계산
    let perfPoints = 0;
    let perfTotal = 0;
    const perfResults = this.performanceHeaders.map(header => {
      const value = this.headers[header.name];
      const result = header.check(value);
      const weight = header.importance === 'high' ? 3 : header.importance === 'medium' ? 2 : 1;
      perfTotal += weight;
      if (result.pass === true) perfPoints += weight;
      else if (result.pass === 'warning') perfPoints += weight * 0.5;
      return { ...header, value, result };
    });

    const securityScore = Math.round((securityPoints / securityTotal) * 100);
    const perfScore = Math.round((perfPoints / perfTotal) * 100);
    const overallScore = Math.round((securityScore + perfScore) / 2);

    this.elements.securityScore.textContent = securityScore;
    this.elements.performanceScore.textContent = perfScore;
    this.elements.overallScore.textContent = overallScore;

    // 체크리스트 렌더링
    this.renderChecklist('securityChecklist', securityResults);
    this.renderChecklist('performanceChecklist', perfResults);

    // 전체 헤더 목록
    this.renderHeadersList();
  }

  renderChecklist(containerId, results) {
    const container = document.getElementById(containerId);
    container.innerHTML = results.map(item => {
      const statusClass = item.result.pass === true ? 'pass' : item.result.pass === 'warning' ? 'warning' : 'fail';
      const statusIcon = item.result.pass === true ? '' : item.result.pass === 'warning' ? '!' : '';

      return `
        <div class="check-item">
          <div class="check-status ${statusClass}">${statusIcon}</div>
          <div class="check-content">
            <div class="check-name">${item.displayName}</div>
            <div class="check-description">${item.description}</div>
            <div class="check-value">${item.result.message}${item.value ? ` | 값: ${item.value.substring(0, 100)}` : ''}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  renderHeadersList() {
    const list = this.elements.headersList;
    const entries = Object.entries(this.headers);

    this.elements.headerCount.textContent = entries.length;

    list.innerHTML = entries.map(([name, value]) => `
      <div class="header-item">
        <div class="header-name">${this.escapeHtml(name)}</div>
        <div class="header-value">${this.escapeHtml(value)}</div>
      </div>
    `).join('');
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
const headerCheckerTool = new HeaderCheckerTool();
window.HeaderChecker = headerCheckerTool;

document.addEventListener('DOMContentLoaded', () => headerCheckerTool.init());
