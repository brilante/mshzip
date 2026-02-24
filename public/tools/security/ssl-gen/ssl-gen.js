/**
 * SSL 인증서 생성 가이드 - ToolBase 기반
 * SSL/TLS 인증서 발급 방법 안내
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class SslGen extends ToolBase {
  constructor() {
    super('SslGen');
  }

  init() {
    this.setupEventListeners();
    console.log('[SslGen] 초기화 완료');
    return this;
  }

  setupEventListeners() {
    // 탭 전환
    const methodBtns = document.querySelectorAll('.method-btn');
    const methodContents = document.querySelectorAll('.method-content');

    methodBtns.forEach(btn => {
      this.on(btn, 'click', () => {
        const method = btn.dataset.method;

        methodBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        methodContents.forEach(content => {
          content.classList.remove('active');
          if (content.id === method) {
            content.classList.add('active');
          }
        });
      });
    });

    // 코드 복사
    const copyBtns = document.querySelectorAll('.copy-btn');
    copyBtns.forEach(btn => {
      this.on(btn, 'click', () => this.copyCode(btn));
    });
  }

  copyCode(btn) {
    const codeBlock = btn.parentElement.querySelector('code');
    const code = codeBlock.textContent;

    navigator.clipboard.writeText(code).then(() => {
      const originalText = btn.textContent;
      btn.textContent = '복사됨!';
      btn.style.color = '#10b981';

      setTimeout(() => {
        btn.textContent = originalText;
        btn.style.color = '';
      }, 2000);
    });
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const sslGen = new SslGen();
window.SslGen = sslGen;

document.addEventListener('DOMContentLoaded', () => sslGen.init());
