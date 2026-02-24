/**
 * 비즈니스 편지 생성기 - ToolBase 기반
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class BusinessLetter extends ToolBase {
  constructor() {
    super('BusinessLetter');
  }

  init() {
    this.initElements({
      sender: 'sender',
      senderTitle: 'senderTitle',
      recipient: 'recipient',
      recipientTitle: 'recipientTitle',
      letterType: 'letterType',
      letterDate: 'letterDate',
      subject: 'subject',
      content: 'content',
      preview: 'preview'
    });

    this.elements.letterDate.value = new Date().toISOString().split('T')[0];

    console.log('[BusinessLetter] 초기화 완료');
    return this;
  }

  getGreeting(type) {
    const greetings = {
      thanks: '귀사의 무궁한 발전을 기원합니다.',
      inquiry: '항상 변함없는 성원에 감사드립니다.',
      proposal: '귀사의 번영을 기원하며 인사드립니다.',
      apology: '평소 귀사의 후의에 감사드립니다.',
      invitation: '귀사의 무궁한 발전을 기원합니다.'
    };
    return greetings[type] || greetings.thanks;
  }

  getClosing(type) {
    const closings = {
      thanks: '다시 한번 감사의 말씀을 드리며, 귀사의 무궁한 발전을 기원합니다.',
      inquiry: '바쁘시겠지만 검토 후 회신 부탁드립니다.',
      proposal: '긍정적인 검토를 부탁드리며, 상호 발전적인 협력을 기대합니다.',
      apology: '다시 한번 깊이 사과드리며, 재발 방지에 최선을 다하겠습니다.',
      invitation: '바쁘시더라도 참석해 주시면 감사하겠습니다.'
    };
    return closings[type] || closings.thanks;
  }

  generate() {
    const sender = this.elements.sender.value || '[발신자]';
    const senderTitle = this.elements.senderTitle.value || '';
    const recipient = this.elements.recipient.value || '[수신자]';
    const recipientTitle = this.elements.recipientTitle.value || '님';
    const letterType = this.elements.letterType.value;
    const letterDate = this.elements.letterDate.value;
    const subject = this.elements.subject.value || '[제목]';
    const content = this.elements.content.value || '[본문 내용]';

    const dateStr = letterDate ? new Date(letterDate).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }) : '[날짜]';
    const greeting = this.getGreeting(letterType);
    const closing = this.getClosing(letterType);

    const html = `<div style="text-align: right; margin-bottom: 30px;">
  <p>${dateStr}</p>
</div>

<div style="margin-bottom: 30px;">
  <p><strong>${recipient} ${recipientTitle}</strong> 귀하</p>
</div>

<div style="margin-bottom: 20px;">
  <p style="font-size: 18px; font-weight: bold; text-align: center; margin: 30px 0;">제목: ${subject}</p>
</div>

<div style="margin-bottom: 20px;">
  <p>${greeting}</p>
</div>

<div style="margin-bottom: 30px; white-space: pre-wrap;">${content}</div>

<div style="margin-bottom: 40px;">
  <p>${closing}</p>
</div>

<div style="text-align: right;">
  <p style="margin-bottom: 30px;">감사합니다.</p>
  <p><strong>${sender}</strong></p>
  ${senderTitle ? `<p>${senderTitle}</p>` : ''}
</div>`;

    this.elements.preview.innerHTML = html;
    this.showToast('편지가 생성되었습니다', 'success');
  }

  copyText() {
    const text = this.elements.preview.innerText;
    this.copyToClipboard(text);
  }

  print() {
    window.print();
  }
}

// 전역 인스턴스 생성
const businessLetter = new BusinessLetter();
window.BusinessLetter = businessLetter;

// 전역 함수 (HTML onclick 호환)
function generate() { businessLetter.generate(); }
function copyText() { businessLetter.copyText(); }
function print() { businessLetter.print(); }

document.addEventListener('DOMContentLoaded', () => businessLetter.init());
