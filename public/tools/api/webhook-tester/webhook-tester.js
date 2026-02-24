/**
 * Webhook 테스터 - ToolBase 기반
 * Webhook 전송 테스트 도구
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class WebhookTester extends ToolBase {
  constructor() {
    super('WebhookTester');
    this.templates = {
      github: {
        ref: "refs/heads/main",
        repository: {
          id: 123456,
          name: "my-project",
          full_name: "user/my-project"
        },
        pusher: {
          name: "username",
          email: "user@example.com"
        },
        commits: [{
          id: "abc123",
          message: "feat: add new feature",
          timestamp: new Date().toISOString()
        }]
      },
      stripe: {
        id: "evt_123",
        type: "payment_intent.succeeded",
        data: {
          object: {
            id: "pi_123",
            amount: 50000,
            currency: "krw",
            status: "succeeded",
            customer: "cus_123"
          }
        },
        created: Math.floor(Date.now() / 1000)
      },
      slack: {
        token: "verification-token",
        team_id: "T123",
        channel_id: "C123",
        user_id: "U123",
        user_name: "username",
        text: "Hello from webhook!",
        ts: Date.now() / 1000
      },
      custom: {
        event: "user.created",
        data: {
          id: 12345,
          name: "홍길동",
          email: "hong@example.com",
          created_at: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      }
    };
  }

  init() {
    this.initElements({
      webhookUrl: 'webhookUrl',
      method: 'method',
      contentType: 'contentType',
      payload: 'payload',
      customHeaders: 'customHeaders',
      responseSection: 'responseSection',
      responseInfo: 'responseInfo',
      responseBody: 'responseBody'
    });

    console.log('[WebhookTester] 초기화 완료');
    return this;
  }

  loadTemplate(name) {
    this.elements.payload.value = JSON.stringify(this.templates[name], null, 2);
    this.showToast(`${name} 템플릿이 로드되었습니다.`, 'success');
  }

  async sendWebhook() {
    const url = this.elements.webhookUrl.value;
    const method = this.elements.method.value;
    const contentType = this.elements.contentType.value;
    const payload = this.elements.payload.value;
    const customHeadersText = this.elements.customHeaders.value;

    if (!url) {
      this.showToast('Webhook URL을 입력하세요!', 'error');
      return;
    }

    let customHeaders = {};
    try {
      customHeaders = JSON.parse(customHeadersText);
    } catch (e) {}

    const headers = {
      'Content-Type': contentType,
      ...customHeaders
    };

    this.elements.responseSection.style.display = 'block';
    this.elements.responseInfo.innerHTML = '<span>전송 중...</span>';
    this.elements.responseBody.textContent = '';

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: payload
      });

      const statusClass = response.ok ? 'success' : 'error';
      this.elements.responseInfo.innerHTML = `<span class="status ${statusClass}">${response.status} ${response.statusText}</span>`;

      const text = await response.text();
      try {
        this.elements.responseBody.textContent = JSON.stringify(JSON.parse(text), null, 2);
      } catch {
        this.elements.responseBody.textContent = text || '(응답 본문 없음)';
      }

    } catch (error) {
      this.elements.responseInfo.innerHTML = '<span class="status error">전송 실패</span>';
      this.elements.responseBody.textContent = '오류: ' + error.message + '\n\nCORS 정책으로 인해 브라우저에서 직접 전송이 차단될 수 있습니다.';
    }
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const webhookTester = new WebhookTester();
window.WebhookTester = webhookTester;

document.addEventListener('DOMContentLoaded', () => webhookTester.init());
