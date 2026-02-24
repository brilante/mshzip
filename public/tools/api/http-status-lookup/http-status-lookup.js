/**
 * HTTP 상태 코드 조회 - ToolBase 기반
 * HTTP 상태 코드 레퍼런스 도구
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class HttpStatusLookup extends ToolBase {
  constructor() {
    super('HttpStatusLookup');
    this.currentCategory = 'all';
    this.httpCodes = [
      // 1xx Informational
      { code: 100, name: 'Continue', desc: '클라이언트가 요청을 계속해도 됩니다.', category: '1xx' },
      { code: 101, name: 'Switching Protocols', desc: '서버가 프로토콜 전환을 수락했습니다.', category: '1xx' },
      { code: 102, name: 'Processing', desc: '서버가 요청을 처리 중입니다 (WebDAV).', category: '1xx' },
      { code: 103, name: 'Early Hints', desc: '최종 응답 전에 일부 응답 헤더를 반환합니다.', category: '1xx' },

      // 2xx Success
      { code: 200, name: 'OK', desc: '요청이 성공적으로 처리되었습니다.', category: '2xx' },
      { code: 201, name: 'Created', desc: '요청이 성공하여 새 리소스가 생성되었습니다.', category: '2xx' },
      { code: 202, name: 'Accepted', desc: '요청이 접수되었으나 아직 처리되지 않았습니다.', category: '2xx' },
      { code: 203, name: 'Non-Authoritative Information', desc: '반환된 메타정보가 원본 서버와 다릅니다.', category: '2xx' },
      { code: 204, name: 'No Content', desc: '요청은 성공했으나 반환할 콘텐츠가 없습니다.', category: '2xx' },
      { code: 205, name: 'Reset Content', desc: '요청 처리 후 문서 뷰를 리셋해야 합니다.', category: '2xx' },
      { code: 206, name: 'Partial Content', desc: '요청한 범위의 일부 콘텐츠만 반환합니다.', category: '2xx' },

      // 3xx Redirection
      { code: 300, name: 'Multiple Choices', desc: '여러 리소스 중 하나를 선택할 수 있습니다.', category: '3xx' },
      { code: 301, name: 'Moved Permanently', desc: '리소스가 영구적으로 이동했습니다.', category: '3xx' },
      { code: 302, name: 'Found', desc: '리소스가 임시로 다른 URI에 있습니다.', category: '3xx' },
      { code: 303, name: 'See Other', desc: '다른 URI에서 GET으로 리소스를 얻어야 합니다.', category: '3xx' },
      { code: 304, name: 'Not Modified', desc: '리소스가 수정되지 않았습니다 (캐시 사용).', category: '3xx' },
      { code: 307, name: 'Temporary Redirect', desc: '동일한 메서드로 다른 URI로 리다이렉트합니다.', category: '3xx' },
      { code: 308, name: 'Permanent Redirect', desc: '영구적으로 다른 URI로 리다이렉트합니다.', category: '3xx' },

      // 4xx Client Error
      { code: 400, name: 'Bad Request', desc: '잘못된 요청 구문입니다.', category: '4xx' },
      { code: 401, name: 'Unauthorized', desc: '인증이 필요합니다.', category: '4xx' },
      { code: 402, name: 'Payment Required', desc: '결제가 필요합니다 (미래를 위해 예약됨).', category: '4xx' },
      { code: 403, name: 'Forbidden', desc: '접근 권한이 없습니다.', category: '4xx' },
      { code: 404, name: 'Not Found', desc: '요청한 리소스를 찾을 수 없습니다.', category: '4xx' },
      { code: 405, name: 'Method Not Allowed', desc: '허용되지 않은 HTTP 메서드입니다.', category: '4xx' },
      { code: 406, name: 'Not Acceptable', desc: '요청한 콘텐츠 타입을 제공할 수 없습니다.', category: '4xx' },
      { code: 407, name: 'Proxy Authentication Required', desc: '프록시 인증이 필요합니다.', category: '4xx' },
      { code: 408, name: 'Request Timeout', desc: '요청 시간이 초과되었습니다.', category: '4xx' },
      { code: 409, name: 'Conflict', desc: '리소스 충돌이 발생했습니다.', category: '4xx' },
      { code: 410, name: 'Gone', desc: '리소스가 영구적으로 삭제되었습니다.', category: '4xx' },
      { code: 411, name: 'Length Required', desc: 'Content-Length 헤더가 필요합니다.', category: '4xx' },
      { code: 412, name: 'Precondition Failed', desc: '전제 조건이 충족되지 않았습니다.', category: '4xx' },
      { code: 413, name: 'Payload Too Large', desc: '요청 본문이 너무 큽니다.', category: '4xx' },
      { code: 414, name: 'URI Too Long', desc: '요청 URI가 너무 깁니다.', category: '4xx' },
      { code: 415, name: 'Unsupported Media Type', desc: '지원하지 않는 미디어 타입입니다.', category: '4xx' },
      { code: 416, name: 'Range Not Satisfiable', desc: '요청한 범위를 제공할 수 없습니다.', category: '4xx' },
      { code: 417, name: 'Expectation Failed', desc: 'Expect 헤더 조건을 충족할 수 없습니다.', category: '4xx' },
      { code: 418, name: "I'm a teapot", desc: '나는 찻주전자입니다 (이스터 에그).', category: '4xx' },
      { code: 422, name: 'Unprocessable Entity', desc: '요청은 올바르나 처리할 수 없습니다 (WebDAV).', category: '4xx' },
      { code: 429, name: 'Too Many Requests', desc: '너무 많은 요청을 보냈습니다 (Rate Limiting).', category: '4xx' },
      { code: 451, name: 'Unavailable For Legal Reasons', desc: '법적인 이유로 이용할 수 없습니다.', category: '4xx' },

      // 5xx Server Error
      { code: 500, name: 'Internal Server Error', desc: '서버 내부 오류가 발생했습니다.', category: '5xx' },
      { code: 501, name: 'Not Implemented', desc: '서버가 요청 메서드를 지원하지 않습니다.', category: '5xx' },
      { code: 502, name: 'Bad Gateway', desc: '게이트웨이가 잘못된 응답을 받았습니다.', category: '5xx' },
      { code: 503, name: 'Service Unavailable', desc: '서버가 일시적으로 사용 불가합니다.', category: '5xx' },
      { code: 504, name: 'Gateway Timeout', desc: '게이트웨이 응답 시간이 초과되었습니다.', category: '5xx' },
      { code: 505, name: 'HTTP Version Not Supported', desc: '요청한 HTTP 버전을 지원하지 않습니다.', category: '5xx' },
      { code: 507, name: 'Insufficient Storage', desc: '저장 공간이 부족합니다 (WebDAV).', category: '5xx' },
      { code: 508, name: 'Loop Detected', desc: '무한 루프가 감지되었습니다 (WebDAV).', category: '5xx' },
      { code: 511, name: 'Network Authentication Required', desc: '네트워크 인증이 필요합니다.', category: '5xx' }
    ];
  }

  init() {
    this.initElements({
      codesList: 'codesList',
      searchInput: 'searchInput'
    });

    this.renderCodes(this.httpCodes);

    console.log('[HttpStatusLookup] 초기화 완료');
    return this;
  }

  renderCodes(codes) {
    this.elements.codesList.innerHTML = codes.map(c => `
      <div class="code-item cat-${c.category}">
        <div class="code-number">${c.code}</div>
        <div class="code-info">
          <div class="code-name">${c.name}</div>
          <div class="code-desc">${c.desc}</div>
        </div>
      </div>
    `).join('');
  }

  filterCodes() {
    const search = this.elements.searchInput.value.toLowerCase();
    let filtered = this.httpCodes;

    if (this.currentCategory !== 'all') {
      filtered = filtered.filter(c => c.category === this.currentCategory);
    }

    if (search) {
      filtered = filtered.filter(c =>
        c.code.toString().includes(search) ||
        c.name.toLowerCase().includes(search) ||
        c.desc.toLowerCase().includes(search)
      );
    }

    this.renderCodes(filtered);
  }

  filterByCategory(category) {
    this.currentCategory = category;
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.category === category);
    });
    this.filterCodes();
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const httpStatusLookup = new HttpStatusLookup();
window.HttpStatusLookup = httpStatusLookup;

document.addEventListener('DOMContentLoaded', () => httpStatusLookup.init());
