/**
 * OAuth 토큰 생성기 - ToolBase 기반
 * JWT 토큰 생성/디코딩 도구
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class OauthTokenGen extends ToolBase {
  constructor() {
    super('OauthTokenGen');
  }

  init() {
    this.initElements({
      jwtHeader: 'jwtHeader',
      jwtPayload: 'jwtPayload',
      secretKey: 'secretKey',
      jwtOutput: 'jwtOutput',
      decodeInput: 'decodeInput',
      decodedHeader: 'decodedHeader',
      decodedPayload: 'decodedPayload',
      tokenInfo: 'tokenInfo'
    });

    console.log('[OauthTokenGen] 초기화 완료');
    return this;
  }

  showTab(tab) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.tab').forEach(el => el.classList.remove('active'));
    document.getElementById('tab-' + tab).classList.remove('hidden');
    event.target.classList.add('active');
  }

  base64UrlEncode(str) {
    return btoa(str)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  base64UrlDecode(str) {
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    while (str.length % 4) str += '=';
    return atob(str);
  }

  generateJWT() {
    try {
      const header = JSON.parse(this.elements.jwtHeader.value);
      const payload = JSON.parse(this.elements.jwtPayload.value);
      const secret = this.elements.secretKey.value;

      const headerEncoded = this.base64UrlEncode(JSON.stringify(header));
      const payloadEncoded = this.base64UrlEncode(JSON.stringify(payload));

      // Note: This is a simplified signature (not cryptographically secure)
      // In production, use a proper JWT library
      const signatureInput = headerEncoded + '.' + payloadEncoded + '.' + secret;
      const signature = this.base64UrlEncode(btoa(signatureInput).substring(0, 43));

      const jwt = headerEncoded + '.' + payloadEncoded + '.' + signature;

      this.elements.jwtOutput.innerHTML = `<span class="jwt-header">${headerEncoded}</span>.<span class="jwt-payload">${payloadEncoded}</span>.<span class="jwt-signature">${signature}</span>`;
      this.showToast('JWT가 생성되었습니다!', 'success');

    } catch (e) {
      this.showToast('JSON 형식 오류: ' + e.message, 'error');
    }
  }

  async copyJWT() {
    const output = this.elements.jwtOutput.textContent;
    try {
      await navigator.clipboard.writeText(output);
      this.showToast('JWT가 클립보드에 복사되었습니다!', 'success');
    } catch (e) {
      this.showToast('복사 실패', 'error');
    }
  }

  decodeJWT() {
    const token = this.elements.decodeInput.value.trim();

    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('잘못된 JWT 형식입니다');
      }

      const header = JSON.parse(this.base64UrlDecode(parts[0]));
      const payload = JSON.parse(this.base64UrlDecode(parts[1]));

      this.elements.decodedHeader.textContent = JSON.stringify(header, null, 2);
      this.elements.decodedPayload.textContent = JSON.stringify(payload, null, 2);

      // Token info
      let info = '';
      if (payload.iat) {
        const issuedAt = new Date(payload.iat * 1000);
        info += `<p><strong>발급 시간 (iat):</strong> ${issuedAt.toLocaleString()}</p>`;
      }
      if (payload.exp) {
        const expiry = new Date(payload.exp * 1000);
        const isExpired = expiry < new Date();
        info += `<p><strong>만료 시간 (exp):</strong> <span class="${isExpired ? 'expired' : 'valid'}">${expiry.toLocaleString()} ${isExpired ? '(만료됨)' : '(유효)'}</span></p>`;
      }
      if (payload.sub) {
        info += `<p><strong>Subject (sub):</strong> ${payload.sub}</p>`;
      }

      this.elements.tokenInfo.innerHTML = info || '<p>추가 정보 없음</p>';
      this.showToast('JWT가 디코딩되었습니다!', 'success');

    } catch (e) {
      this.elements.decodedHeader.textContent = '오류: ' + e.message;
      this.elements.decodedPayload.textContent = '';
      this.elements.tokenInfo.innerHTML = '';
      this.showToast('디코딩 실패: ' + e.message, 'error');
    }
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const oauthTokenGen = new OauthTokenGen();
window.OauthTokenGen = oauthTokenGen;

document.addEventListener('DOMContentLoaded', () => oauthTokenGen.init());
