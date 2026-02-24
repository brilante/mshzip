/**
 * CORS 테스터 - ToolBase 기반
 * CORS 헤더 테스트 도구
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class CorsTester extends ToolBase {
  constructor() {
    super('CorsTester');
    this.corsHeaders = [
      'Access-Control-Allow-Origin',
      'Access-Control-Allow-Methods',
      'Access-Control-Allow-Headers',
      'Access-Control-Allow-Credentials',
      'Access-Control-Expose-Headers',
      'Access-Control-Max-Age'
    ];
  }

  init() {
    this.initElements({
      testUrl: 'testUrl',
      testMethod: 'testMethod',
      resultIcon: 'resultIcon',
      resultStatus: 'resultStatus',
      resultDetails: 'resultDetails',
      headersList: 'headersList'
    });

    console.log('[CorsTester] 초기화 완료');
    return this;
  }

  async testCORS() {
    const url = this.elements.testUrl.value;
    const method = this.elements.testMethod.value;

    this.elements.resultIcon.textContent = '';
    this.elements.resultStatus.textContent = '테스트 중...';
    this.elements.resultStatus.className = 'result-status';
    this.elements.resultDetails.textContent = '';
    this.elements.headersList.innerHTML = '';

    try {
      const response = await fetch(url, {
        method: method,
        mode: 'cors',
        headers: {
          'Origin': window.location.origin
        }
      });

      // Success
      this.elements.resultIcon.textContent = '';
      this.elements.resultStatus.textContent = 'CORS 허용됨';
      this.elements.resultStatus.className = 'result-status success';
      this.elements.resultDetails.textContent = `상태: ${response.status} ${response.statusText}\n요청 메서드: ${method}\nURL: ${url}`;

      // Display CORS headers
      this.corsHeaders.forEach(headerName => {
        const value = response.headers.get(headerName);
        const item = document.createElement('div');
        item.className = 'header-item ' + (value ? 'present' : 'missing');
        item.innerHTML = `
          <span class="header-name">${headerName}</span>
          <span class="header-value">${value || '(없음)'}</span>
        `;
        this.elements.headersList.appendChild(item);
      });

    } catch (error) {
      this.elements.resultIcon.textContent = '';
      this.elements.resultStatus.textContent = 'CORS 차단됨';
      this.elements.resultStatus.className = 'result-status error';
      this.elements.resultDetails.textContent = `오류: ${error.message}\n\n이 URL은 현재 출처(${window.location.origin})에서의 접근을 허용하지 않습니다.\n\n서버에서 CORS 헤더를 설정해야 합니다.`;

      // Show expected headers
      this.corsHeaders.forEach(headerName => {
        const item = document.createElement('div');
        item.className = 'header-item missing';
        item.innerHTML = `
          <span class="header-name">${headerName}</span>
          <span class="header-value">(확인 불가)</span>
        `;
        this.elements.headersList.appendChild(item);
      });
    }
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const corsTester = new CorsTester();
window.CorsTester = corsTester;

document.addEventListener('DOMContentLoaded', () => corsTester.init());
