/**
 * JWT 디코더 도구 - ToolBase 기반
 * JSON Web Token 분석 및 디코딩
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var JwtDecoder = class JwtDecoder extends ToolBase {
  constructor() {
    super('JwtDecoder');
    this.decodedData = null;
  }

  init() {
    this.initElements({
      jwtInput: 'jwtInput',
      statusIndicator: 'statusIndicator',
      statusText: 'statusText',
      decodedSection: 'decodedSection',
      headerJson: 'headerJson',
      payloadJson: 'payloadJson',
      claimsInfo: 'claimsInfo',
      signatureRaw: 'signatureRaw'
    });

    console.log('[JwtDecoder] 초기화 완료');
    return this;
  }

  decode() {
    const input = this.elements.jwtInput.value.trim();

    if (!input) {
      this.elements.statusIndicator.className = 'status-indicator';
      this.elements.statusText.textContent = 'JWT를 입력하세요';
      this.elements.decodedSection.style.display = 'none';
      this.elements.jwtInput.classList.remove('error');
      this.decodedData = null;
      return;
    }

    try {
      const parts = input.split('.');
      if (parts.length !== 3) {
        throw new Error('JWT는 점(.)으로 구분된 3개의 파트로 구성되어야 합니다.');
      }

      const header = this.base64UrlDecode(parts[0]);
      const payload = this.base64UrlDecode(parts[1]);
      const signature = parts[2];

      this.decodedData = { header, payload, signature, raw: parts };

      // Header 표시
      this.elements.headerJson.innerHTML = this.formatJson(header);

      // Payload 표시
      this.elements.payloadJson.innerHTML = this.formatJson(payload);

      // 클레임 정보 표시
      this.displayClaims(payload);

      // Signature 표시
      this.elements.signatureRaw.textContent = signature;

      // 상태 업데이트
      const isExpired = payload.exp && payload.exp * 1000 < Date.now();
      if (isExpired) {
        this.elements.statusIndicator.className = 'status-indicator expired';
        this.elements.statusText.textContent = '유효한 JWT (만료됨)';
      } else {
        this.elements.statusIndicator.className = 'status-indicator valid';
        this.elements.statusText.textContent = '유효한 JWT 구조';
      }

      this.elements.jwtInput.classList.remove('error');
      this.elements.decodedSection.style.display = 'grid';

    } catch (error) {
      this.elements.statusIndicator.className = 'status-indicator invalid';
      this.elements.statusText.textContent = `오류: ${error.message}`;
      this.elements.jwtInput.classList.add('error');
      this.elements.decodedSection.style.display = 'none';
      this.decodedData = null;
    }
  }

  base64UrlDecode(str) {
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');

    while (base64.length % 4) {
      base64 += '=';
    }

    try {
      const decoded = atob(base64);
      return JSON.parse(decoded);
    } catch (e) {
      throw new Error('Base64 디코딩 실패');
    }
  }

  formatJson(obj) {
    const json = JSON.stringify(obj, null, 2);
    return json
      .replace(/"([^"]+)":/g, '<span class="json-key">"$1"</span>:')
      .replace(/: "([^"]*)"/g, ': <span class="json-string">"$1"</span>')
      .replace(/: (\d+)/g, ': <span class="json-number">$1</span>')
      .replace(/: (true|false)/g, ': <span class="json-boolean">$1</span>')
      .replace(/: (null)/g, ': <span class="json-null">$1</span>');
  }

  displayClaims(payload) {
    const knownClaims = {
      iss: '발급자 (Issuer)',
      sub: '주제 (Subject)',
      aud: '대상자 (Audience)',
      exp: '만료 시간 (Expiration)',
      nbf: '활성화 시간 (Not Before)',
      iat: '발급 시간 (Issued At)',
      jti: 'JWT ID'
    };

    let html = '';

    for (const [key, value] of Object.entries(payload)) {
      if (knownClaims[key]) {
        let displayValue = value;
        let className = '';

        if (['exp', 'nbf', 'iat'].includes(key) && typeof value === 'number') {
          const date = new Date(value * 1000);
          const isExpired = key === 'exp' && date < new Date();
          displayValue = date.toLocaleString('ko-KR');

          if (key === 'exp') {
            className = isExpired ? 'expired' : 'valid';
            displayValue += isExpired ? ' (만료됨)' : ' (유효)';
          }
        }

        html += `
          <div class="claim-item">
            <div class="claim-name">${knownClaims[key]}</div>
            <div class="claim-value ${className}">${displayValue}</div>
          </div>
        `;
      }
    }

    this.elements.claimsInfo.innerHTML = html;
  }

  copyPart(part) {
    if (!this.decodedData) {
      this.showToast('디코딩된 데이터가 없습니다.', 'warning');
      return;
    }

    let text;
    switch (part) {
      case 'header':
        text = JSON.stringify(this.decodedData.header, null, 2);
        break;
      case 'payload':
        text = JSON.stringify(this.decodedData.payload, null, 2);
        break;
      case 'signature':
        text = this.decodedData.signature;
        break;
      default:
        return;
    }

    navigator.clipboard.writeText(text).then(() => {
      this.showSuccess('클립보드에 복사되었습니다.');
    });
  }

  clear() {
    this.elements.jwtInput.value = '';
    this.decode();
    this.showToast('초기화되었습니다.', 'info');
  }

  async paste() {
    try {
      const text = await navigator.clipboard.readText();
      this.elements.jwtInput.value = text;
      this.decode();
    } catch (e) {
      this.showError('클립보드 접근이 거부되었습니다.');
    }
  }

  loadSample(type) {
    const samples = {
      basic: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkhvbmcgR2lsZG9uZyIsImlhdCI6MTcwNDA2NzIwMH0.qB-kNM-hW-LVr8F8_wFqj-kLHU-x_OzKmZ6z3Xq9J1Y',
      expired: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IlVzZXIiLCJleHAiOjE2MDQwNjcyMDAsImlhdCI6MTYwNDA2MzYwMH0.H9rE1BcFNYKLWL8G8q3C-e5VQ-qR2rqP9ZR_N-oJ1Ks',
      admin: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwibmFtZSI6IkFkbWluIiwicm9sZSI6ImFkbWluIiwiaXNzIjoiTXlNaW5kMyIsImlhdCI6MTcwNDA2NzIwMCwiZXhwIjoxODkzNDU2MDAwfQ.x9v7qY3h_kG3r8TjL2m9ZxN1o_Kp5YqW2Z4v6X8c9Jw'
    };

    if (samples[type]) {
      this.elements.jwtInput.value = samples[type];
      this.decode();
      this.showToast('샘플 JWT가 로드되었습니다.', 'info');
    }
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const jwtDecoder = new JwtDecoder();
window.JwtDecoder = jwtDecoder;

document.addEventListener('DOMContentLoaded', () => jwtDecoder.init());
