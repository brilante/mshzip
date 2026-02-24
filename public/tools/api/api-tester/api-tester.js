/**
 * API 테스터 - ToolBase 기반
 * REST API 요청 테스트 도구
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class ApiTester extends ToolBase {
  constructor() {
    super('ApiTester');
  }

  init() {
    this.initElements({
      method: 'method',
      url: 'url',
      requestBody: 'requestBody',
      headersList: 'headersList',
      paramsList: 'paramsList',
      responseInfo: 'responseInfo',
      responseContent: 'responseContent',
      responseHeaders: 'responseHeaders',
      responseHeadersContent: 'responseHeadersContent',
      responseBody: 'responseBody'
    });

    console.log('[ApiTester] 초기화 완료');
    return this;
  }

  showTab(tab) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.request-section .tab').forEach(el => el.classList.remove('active'));
    document.getElementById('tab-' + tab).classList.remove('hidden');
    event.target.classList.add('active');
  }

  showResponseTab(tab) {
    this.elements.responseBody.classList.toggle('hidden', tab !== 'body');
    this.elements.responseHeaders.classList.toggle('hidden', tab !== 'headers');
    document.querySelectorAll('.response-tabs .tab').forEach((el, i) => {
      el.classList.toggle('active', (tab === 'body' && i === 0) || (tab === 'headers' && i === 1));
    });
  }

  addHeaderRow() {
    const row = document.createElement('div');
    row.className = 'key-value-row';
    row.innerHTML = '<input type="text" placeholder="Key"><input type="text" placeholder="Value"><button onclick="apiTester.removeRow(this)">×</button>';
    this.elements.headersList.appendChild(row);
  }

  addParamRow() {
    const row = document.createElement('div');
    row.className = 'key-value-row';
    row.innerHTML = '<input type="text" placeholder="Key"><input type="text" placeholder="Value"><button onclick="apiTester.removeRow(this)">×</button>';
    this.elements.paramsList.appendChild(row);
  }

  removeRow(btn) {
    btn.parentElement.remove();
  }

  getHeaders() {
    const headers = {};
    this.elements.headersList.querySelectorAll('.key-value-row').forEach(row => {
      const inputs = row.querySelectorAll('input');
      if (inputs[0].value && inputs[1].value) {
        headers[inputs[0].value] = inputs[1].value;
      }
    });
    return headers;
  }

  getParams() {
    const params = new URLSearchParams();
    this.elements.paramsList.querySelectorAll('.key-value-row').forEach(row => {
      const inputs = row.querySelectorAll('input');
      if (inputs[0].value && inputs[1].value) {
        params.append(inputs[0].value, inputs[1].value);
      }
    });
    return params.toString();
  }

  async sendRequest() {
    const method = this.elements.method.value;
    let url = this.elements.url.value;
    const headers = this.getHeaders();
    const body = this.elements.requestBody.value;
    const params = this.getParams();

    if (params) {
      url += (url.includes('?') ? '&' : '?') + params;
    }

    this.elements.responseInfo.innerHTML = '<span>요청 중...</span>';
    this.elements.responseContent.textContent = '// 로딩 중...';

    const startTime = performance.now();

    try {
      const options = { method, headers };
      if (method !== 'GET' && method !== 'HEAD' && body) {
        options.body = body;
      }

      const response = await fetch(url, options);
      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);

      const statusClass = response.ok ? 'success' : 'error';
      this.elements.responseInfo.innerHTML = `
        <span class="status ${statusClass}">${response.status} ${response.statusText}</span>
        <span style="margin-left: 10px; color: #666;">${duration}ms</span>
      `;

      // Response headers
      const respHeaders = {};
      response.headers.forEach((value, key) => {
        respHeaders[key] = value;
      });
      this.elements.responseHeadersContent.textContent = JSON.stringify(respHeaders, null, 2);

      // Response body
      const contentType = response.headers.get('content-type') || '';
      let responseText;
      if (contentType.includes('application/json')) {
        const json = await response.json();
        responseText = JSON.stringify(json, null, 2);
      } else {
        responseText = await response.text();
      }
      this.elements.responseContent.textContent = responseText;

    } catch (error) {
      this.elements.responseInfo.innerHTML = '<span class="status error">Error</span>';
      this.elements.responseContent.textContent = '// 오류: ' + error.message + '\n// CORS 정책으로 인해 일부 API는 브라우저에서 직접 호출할 수 없습니다.';
    }
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const apiTester = new ApiTester();
window.ApiTester = apiTester;

document.addEventListener('DOMContentLoaded', () => apiTester.init());
