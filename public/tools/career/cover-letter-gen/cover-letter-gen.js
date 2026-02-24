/**
 * 커버레터 생성기 - ToolBase 기반
 * 맞춤형 자기소개서 작성
 * @created 2026-01-13
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var CoverLetterGen = class CoverLetterGen extends ToolBase {
  constructor() {
    super('CoverLetterGen');
    this.tone = 'professional';
    this.templates = {
      professional: {
        opening: (data) => `${data.hiringManager ? `${data.hiringManager}님께,` : '인사 담당자님께,'}\n\n${data.companyName}의 ${data.jobTitle} 직책에 지원하게 되어 기쁘게 생각합니다.`,
        body: (data) => {
          let text = '';
          if (data.yearsExp) {
            text += `저는 ${data.yearsExp}간의 경력을 보유한 ${data.currentRole || '전문가'}로서, `;
          }
          if (data.keySkills) {
            text += `${data.keySkills} 분야에서 전문성을 쌓아왔습니다.`;
          }
          if (data.achievements) {
            text += `\n\n특히, ${data.achievements}와 같은 성과를 통해 조직에 실질적인 가치를 제공해왔습니다.`;
          }
          if (data.motivation) {
            text += `\n\n${data.motivation}`;
          }
          return text;
        },
        closing: (data) => `\n\n${data.companyName}에서 저의 역량을 발휘할 수 있는 기회를 주시면 감사하겠습니다. 면접 기회를 통해 더 자세히 말씀드리고 싶습니다.\n\n감사합니다.\n\n${data.applicantName} 드림`
      },
      enthusiastic: {
        opening: (data) => `${data.hiringManager ? `${data.hiringManager}님께,` : '안녕하세요!'}\n\n${data.companyName}의 ${data.jobTitle} 포지션을 발견하고 정말 설레는 마음으로 지원합니다!`,
        body: (data) => {
          let text = '';
          if (data.currentRole) {
            text += `현재 ${data.currentRole}로 활동하며 `;
          }
          if (data.keySkills) {
            text += `${data.keySkills} 등의 기술을 익히고 실무에 적용해왔습니다.`;
          }
          if (data.achievements) {
            text += `\n\n가장 자랑스러운 성과는 ${data.achievements}입니다. 이러한 경험이 ${data.companyName}에서도 빛을 발할 수 있다고 확신합니다!`;
          }
          if (data.motivation) {
            text += `\n\n${data.motivation} 이러한 이유로 ${data.companyName}에서 일하고 싶습니다.`;
          }
          return text;
        },
        closing: (data) => `\n\n${data.companyName} 팀의 일원이 되어 함께 성장하고 싶습니다. 면접에서 저의 열정을 직접 보여드릴 기회를 주세요!\n\n감사합니다.\n\n${data.applicantName} 드림`
      },
      confident: {
        opening: (data) => `${data.hiringManager ? `${data.hiringManager}님께,` : '인사 담당자님께,'}\n\n${data.companyName}의 ${data.jobTitle} 직책에 제가 적합한 인재라고 확신하여 지원합니다.`,
        body: (data) => {
          let text = '';
          if (data.yearsExp) {
            text += `${data.yearsExp}의 실무 경험을 통해 `;
          }
          if (data.keySkills) {
            text += `${data.keySkills} 분야에서 검증된 역량을 갖추고 있습니다.`;
          }
          if (data.achievements) {
            text += `\n\n${data.achievements} - 이러한 구체적인 성과가 저의 역량을 증명합니다.`;
          }
          if (data.motivation) {
            text += `\n\n${data.motivation}`;
          }
          return text;
        },
        closing: (data) => `\n\n저는 ${data.companyName}에 즉시 기여할 준비가 되어 있습니다. 면접에서 더 자세히 논의할 기회를 기대합니다.\n\n${data.applicantName} 드림`
      },
      friendly: {
        opening: (data) => `${data.hiringManager ? `${data.hiringManager}님,` : '안녕하세요,'}\n\n${data.companyName}의 ${data.jobTitle} 채용 공고를 보고 연락드립니다.`,
        body: (data) => {
          let text = '';
          if (data.currentRole) {
            text += `저는 ${data.currentRole}로 일하면서 `;
          }
          if (data.keySkills) {
            text += `${data.keySkills} 등 다양한 기술을 배우고 적용해왔어요.`;
          }
          if (data.achievements) {
            text += `\n\n${data.achievements}와 같은 결과를 만들어낸 경험이 있습니다.`;
          }
          if (data.motivation) {
            text += `\n\n${data.motivation}`;
          }
          return text;
        },
        closing: (data) => `\n\n${data.companyName}에서 좋은 인연이 되면 좋겠습니다. 편하게 연락 주세요!\n\n감사합니다.\n${data.applicantName} 드림`
      }
    };
  }

  init() {
    this.initElements({
      applicantName: 'applicantName',
      applicantEmail: 'applicantEmail',
      applicantPhone: 'applicantPhone',
      currentRole: 'currentRole',
      companyName: 'companyName',
      jobTitle: 'jobTitle',
      hiringManager: 'hiringManager',
      yearsExp: 'yearsExp',
      keySkills: 'keySkills',
      motivation: 'motivation',
      achievements: 'achievements',
      letterPreview: 'letterPreview',
      resultPanel: 'resultPanel',
      wordCount: 'wordCount'
    });

    this.loadData();

    console.log('[CoverLetterGen] 초기화 완료');
    return this;
  }

  loadData() {
    try {
      const saved = localStorage.getItem('coverLetterData');
      if (saved) {
        const data = JSON.parse(saved);
        Object.keys(data).forEach(key => {
          if (this.elements[key]) {
            this.elements[key].value = data[key];
          }
        });
      }
    } catch (e) {
      console.error('Failed to load cover letter data:', e);
    }
  }

  saveData() {
    try {
      const fields = ['applicantName', 'applicantEmail', 'applicantPhone', 'currentRole',
                      'companyName', 'jobTitle', 'hiringManager', 'yearsExp',
                      'keySkills', 'motivation', 'achievements'];
      const data = {};
      fields.forEach(field => {
        if (this.elements[field]) {
          data[field] = this.elements[field].value;
        }
      });
      localStorage.setItem('coverLetterData', JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save cover letter data:', e);
    }
  }

  setTone(tone) {
    this.tone = tone;
    document.querySelectorAll('.tone-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tone === tone);
    });
  }

  getData() {
    return {
      applicantName: this.elements.applicantName.value.trim() || '지원자',
      applicantEmail: this.elements.applicantEmail.value.trim(),
      applicantPhone: this.elements.applicantPhone.value.trim(),
      currentRole: this.elements.currentRole.value.trim(),
      companyName: this.elements.companyName.value.trim() || '귀사',
      jobTitle: this.elements.jobTitle.value.trim() || '해당 직책',
      hiringManager: this.elements.hiringManager.value.trim(),
      yearsExp: this.elements.yearsExp.value.trim(),
      keySkills: this.elements.keySkills.value.trim(),
      motivation: this.elements.motivation.value.trim(),
      achievements: this.elements.achievements.value.trim()
    };
  }

  generate() {
    const data = this.getData();

    if (!data.applicantName || data.applicantName === '지원자') {
      this.showToast('이름을 입력해주세요.', 'warning');
      return;
    }

    this.saveData();

    const template = this.templates[this.tone];
    const letter = template.opening(data) + '\n\n' + template.body(data) + template.closing(data);

    this.elements.letterPreview.textContent = letter;
    this.elements.resultPanel.style.display = 'block';
    this.elements.wordCount.textContent = `${letter.length}자`;
  }

  async copy() {
    const preview = this.elements.letterPreview;
    try {
      await navigator.clipboard.writeText(preview.textContent);
      this.showToast('커버레터가 클립보드에 복사되었습니다.', 'success');
    } catch (e) {
      this.showToast('복사 실패', 'error');
    }
  }

  download() {
    const preview = this.elements.letterPreview;
    const data = this.getData();
    const blob = new Blob([preview.textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `${data.applicantName}_${data.companyName}_커버레터.txt`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
    this.showToast('커버레터가 다운로드되었습니다!', 'success');
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const coverLetterGen = new CoverLetterGen();
window.CoverLetterGen = coverLetterGen;

document.addEventListener('DOMContentLoaded', () => coverLetterGen.init());
