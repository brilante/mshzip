/**
 * 감사 이메일 생성기 - ToolBase 기반
 * 면접 후 감사 이메일 작성
 * @created 2026-01-13
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var ThankYouEmail = class ThankYouEmail extends ToolBase {
  constructor() {
    super('ThankYouEmail');
    this.type = 'interview';
    this.generatedSubject = '';
    this.generatedBody = '';
    this.templates = {
      interview: {
        subject: (data) => `[감사 인사] ${data.jobTitle} 면접 - ${data.senderName}`,
        body: (data) => {
          let email = `${data.recipientName}님께,\n\n`;
          email += `안녕하세요, ${data.senderName}입니다.\n\n`;

          if (data.interviewDate) {
            const date = new Date(data.interviewDate);
            const dateStr = `${date.getMonth() + 1}월 ${date.getDate()}일`;
            email += `${dateStr}에 ${data.companyName}의 ${data.jobTitle} 면접 기회를 주셔서 감사합니다.\n\n`;
          } else {
            email += `${data.companyName}의 ${data.jobTitle} 면접 기회를 주셔서 감사합니다.\n\n`;
          }

          if (data.highlights) {
            email += `면접 중 ${data.highlights}에 대해 들을 수 있어서 특히 인상적이었습니다. `;
          }

          email += `${data.companyName}의 비전과 팀 문화에 대해 더 깊이 알 수 있는 시간이었고, 함께 일하고 싶다는 생각이 더욱 강해졌습니다.\n\n`;

          email += `저의 경험과 역량이 ${data.companyName}에 기여할 수 있을 것이라 확신하며, 긍정적인 결과를 기대하고 있습니다.\n\n`;

          email += `추가로 필요한 정보가 있으시면 언제든지 연락 주세요.\n\n`;

          email += `다시 한번 시간 내주셔서 감사드립니다.\n\n`;
          email += `감사합니다.\n${data.senderName} 드림`;

          return email;
        }
      },

      offer: {
        subject: (data) => `[오퍼 수락] ${data.jobTitle} - ${data.senderName}`,
        body: (data) => {
          let email = `${data.recipientName}님께,\n\n`;
          email += `안녕하세요, ${data.senderName}입니다.\n\n`;

          email += `${data.companyName}의 ${data.jobTitle} 포지션 오퍼를 감사히 받아들이며, 정식으로 수락의사를 전달드립니다.\n\n`;

          email += `${data.companyName}에서 새로운 여정을 시작하게 되어 매우 기쁘게 생각합니다. `;

          if (data.highlights) {
            email += `특히 ${data.highlights}에 대해 기대하고 있습니다.\n\n`;
          } else {
            email += `팀의 일원으로서 최선을 다하겠습니다.\n\n`;
          }

          email += `입사 관련 서류나 추가로 필요한 절차가 있다면 말씀해 주세요. 빠르게 준비하도록 하겠습니다.\n\n`;

          email += `좋은 기회를 주셔서 다시 한번 감사드립니다.\n\n`;
          email += `감사합니다.\n${data.senderName} 드림`;

          return email;
        }
      },

      rejection: {
        subject: (data) => `[감사 인사] ${data.jobTitle} 면접 관련 - ${data.senderName}`,
        body: (data) => {
          let email = `${data.recipientName}님께,\n\n`;
          email += `안녕하세요, ${data.senderName}입니다.\n\n`;

          email += `${data.companyName}의 ${data.jobTitle} 포지션에 대한 결과를 알려주셔서 감사합니다.\n\n`;

          email += `비록 이번에는 좋은 결과를 얻지 못했지만, 면접 과정에서 ${data.companyName}에 대해 많이 배울 수 있었습니다. `;

          if (data.highlights) {
            email += `특히 ${data.highlights}에 대한 이야기는 매우 인상적이었습니다.\n\n`;
          } else {
            email += `좋은 경험이었습니다.\n\n`;
          }

          email += `향후 ${data.companyName}에서 적합한 포지션이 생기면 다시 지원할 기회가 있으면 좋겠습니다. `;
          email += `저의 연락처 정보를 보관해 주시면 감사하겠습니다.\n\n`;

          email += `시간 내어 면접 기회를 주신 것에 다시 한번 감사드리며, ${data.companyName}의 앞날에 좋은 일만 가득하시길 바랍니다.\n\n`;

          email += `감사합니다.\n${data.senderName} 드림`;

          return email;
        }
      }
    };
  }

  init() {
    this.initElements({
      recipientName: 'recipientName',
      companyName: 'companyName',
      jobTitle: 'jobTitle',
      interviewDate: 'interviewDate',
      highlights: 'highlights',
      senderName: 'senderName',
      emailSubject: 'emailSubject',
      emailBody: 'emailBody',
      resultPanel: 'resultPanel'
    });

    this.elements.interviewDate.valueAsDate = new Date();

    console.log('[ThankYouEmail] 초기화 완료');
    return this;
  }

  setType(type) {
    this.type = type;
    document.querySelectorAll('.type-card').forEach(card => {
      card.classList.toggle('active', card.dataset.type === type);
    });
  }

  getData() {
    return {
      recipientName: this.elements.recipientName.value.trim() || '담당자',
      companyName: this.elements.companyName.value.trim() || '귀사',
      jobTitle: this.elements.jobTitle.value.trim() || '해당 직책',
      interviewDate: this.elements.interviewDate.value,
      highlights: this.elements.highlights.value.trim(),
      senderName: this.elements.senderName.value.trim() || '지원자'
    };
  }

  generate() {
    const data = this.getData();

    if (!this.elements.recipientName.value.trim()) {
      this.showToast('받는 사람 이름을 입력해주세요.', 'warning');
      return;
    }

    if (!this.elements.senderName.value.trim()) {
      this.showToast('본인 이름을 입력해주세요.', 'warning');
      return;
    }

    const template = this.templates[this.type];
    this.generatedSubject = template.subject(data);
    this.generatedBody = template.body(data);

    this.elements.emailSubject.textContent = this.generatedSubject;
    this.elements.emailBody.textContent = this.generatedBody;
    this.elements.resultPanel.style.display = 'block';
    this.showToast('이메일이 생성되었습니다!', 'success');
  }

  async copySubject() {
    try {
      await navigator.clipboard.writeText(this.generatedSubject);
      this.showToast('제목이 클립보드에 복사되었습니다.', 'success');
    } catch (e) {
      this.showToast('복사 실패', 'error');
    }
  }

  async copyBody() {
    const body = this.elements.emailBody.textContent;
    try {
      await navigator.clipboard.writeText(body);
      this.showToast('본문이 클립보드에 복사되었습니다.', 'success');
    } catch (e) {
      this.showToast('복사 실패', 'error');
    }
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const thankYouEmail = new ThankYouEmail();
window.ThankYouEmail = thankYouEmail;

document.addEventListener('DOMContentLoaded', () => thankYouEmail.init());
