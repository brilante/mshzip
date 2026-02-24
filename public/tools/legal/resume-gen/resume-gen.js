/**
 * 이력서 생성기 - ToolBase 기반
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class ResumeGen extends ToolBase {
  constructor() {
    super('ResumeGen');
  }

  init() {
    this.initElements({
      name: 'name',
      phone: 'phone',
      email: 'email',
      address: 'address',
      education: 'education',
      experience: 'experience',
      skills: 'skills',
      preview: 'preview'
    });

    console.log('[ResumeGen] 초기화 완료');
    return this;
  }

  generate() {
    const name = this.elements.name.value || '[이름]';
    const phone = this.elements.phone.value || '[연락처]';
    const email = this.elements.email.value || '[이메일]';
    const address = this.elements.address.value || '[주소]';
    const educationText = this.elements.education.value;
    const experienceText = this.elements.experience.value;
    const skillsText = this.elements.skills.value;

    let educationHTML = '';
    educationText.split('\n').forEach(line => {
      const parts = line.split(':');
      if (parts.length >= 3) {
        educationHTML += `<p>• ${parts[0]} - ${parts[1]} (${parts[2]})</p>`;
      }
    });

    let experienceHTML = '';
    experienceText.split('\n').forEach(line => {
      const parts = line.split(':');
      if (parts.length >= 4) {
        experienceHTML += `<div style="margin-bottom: 12px;">
          <p><strong>${parts[0]}</strong> | ${parts[1]} | ${parts[2]}</p>
          <p style="color: #64748b; margin-left: 12px;">${parts[3]}</p>
        </div>`;
      }
    });

    const skillsHTML = skillsText.split(',').map(s =>
      `<span style="display: inline-block; background: #e0e7ff; color: #3730a3; padding: 4px 12px; border-radius: 20px; margin: 4px; font-size: 13px;">${s.trim()}</span>`
    ).join('');

    const html = `<h1 style="text-align: center; margin-bottom: 10px;">${name}</h1>
<p style="text-align: center; color: #64748b; margin-bottom: 30px;">
  ${phone} | ${email} | ${address}
</p>

<h2 style="border-bottom: 2px solid #667eea; padding-bottom: 8px;">학력</h2>
${educationHTML || '<p>정보 없음</p>'}

<h2 style="border-bottom: 2px solid #667eea; padding-bottom: 8px; margin-top: 24px;">경력</h2>
${experienceHTML || '<p>정보 없음</p>'}

<h2 style="border-bottom: 2px solid #667eea; padding-bottom: 8px; margin-top: 24px;">기술 스택</h2>
<div style="margin-top: 12px;">${skillsHTML || '<p>정보 없음</p>'}</div>

<div style="text-align: center; margin-top: 40px; color: #94a3b8; font-size: 12px;">
  <p>위의 내용은 사실과 다름없음을 확인합니다.</p>
  <p style="margin-top: 20px;">${new Date().toLocaleDateString('ko-KR')}</p>
  <p style="margin-top: 10px;"><strong>${name}</strong> (인)</p>
</div>`;

    this.elements.preview.innerHTML = html;
    this.showToast('이력서가 생성되었습니다', 'success');
  }

  copyText() {
    const text = this.elements.preview.innerText;
    this.copyToClipboard(text);
  }

  downloadTxt() {
    const text = this.elements.preview.innerText;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = '이력서.txt';
    link.click();
    URL.revokeObjectURL(link.href);
    this.showToast('파일이 다운로드되었습니다', 'success');
  }

  print() {
    window.print();
  }
}

// 전역 인스턴스 생성
const resumeGen = new ResumeGen();
window.ResumeGen = resumeGen;

// 전역 함수 (HTML onclick 호환)
function generate() { resumeGen.generate(); }
function copyText() { resumeGen.copyText(); }
function downloadTxt() { resumeGen.downloadTxt(); }
function print() { resumeGen.print(); }

document.addEventListener('DOMContentLoaded', () => resumeGen.init());
