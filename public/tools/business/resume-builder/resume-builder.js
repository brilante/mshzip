/**
 * 이력서 빌더 - ToolBase 기반
 * 전문적인 이력서 생성
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var ResumeBuilder = class ResumeBuilder extends ToolBase {
  constructor() {
    super('ResumeBuilder');
    this.experiences = [];
    this.educations = [];
    this.skills = [];
    this.expId = 1;
    this.eduId = 1;
  }

  init() {
    this.initElements({
      fullName: 'fullName',
      jobTitle: 'jobTitle',
      email: 'email',
      phone: 'phone',
      location: 'location',
      summary: 'summary',
      skills: 'skills',
      experiencesList: 'experiencesList',
      educationsList: 'educationsList',
      resumePreview: 'resumePreview',
      previewName: 'previewName',
      previewTitle: 'previewTitle',
      previewEmail: 'previewEmail',
      previewPhone: 'previewPhone',
      previewLocation: 'previewLocation',
      previewSummary: 'previewSummary',
      previewSkills: 'previewSkills',
      previewExperience: 'previewExperience',
      previewEducation: 'previewEducation'
    });

    this.addExperience();
    this.addEducation();
    this.updatePreview();

    console.log('[ResumeBuilder] 초기화 완료');
    return this;
  }

  // Experience Management
  addExperience() {
    const id = this.expId++;
    this.experiences.push({ id, company: '', position: '', startDate: '', endDate: '', description: '' });
    this.renderExperiences();
  }

  removeExperience(id) {
    this.experiences = this.experiences.filter(e => e.id !== id);
    this.renderExperiences();
    this.updatePreview();
  }

  renderExperiences() {
    const html = this.experiences.map((exp, idx) => `
      <div class="entry-block" data-id="${exp.id}">
        <div class="entry-header">
          <span>경력 ${idx + 1}</span>
          <button class="remove-btn" onclick="resumeBuilder.removeExperience(${exp.id})">×</button>
        </div>
        <div class="row-2">
          <input type="text" class="tool-input" placeholder="회사명" value="${exp.company}"
            onchange="resumeBuilder.updateExp(${exp.id}, 'company', this.value)">
          <input type="text" class="tool-input" placeholder="직책" value="${exp.position}"
            onchange="resumeBuilder.updateExp(${exp.id}, 'position', this.value)">
        </div>
        <div class="row-2">
          <input type="month" class="tool-input" value="${exp.startDate}"
            onchange="resumeBuilder.updateExp(${exp.id}, 'startDate', this.value)">
          <input type="month" class="tool-input" value="${exp.endDate}" placeholder="현재 재직중이면 비워두세요"
            onchange="resumeBuilder.updateExp(${exp.id}, 'endDate', this.value)">
        </div>
        <textarea class="tool-input" rows="2" placeholder="업무 내용..."
          onchange="resumeBuilder.updateExp(${exp.id}, 'description', this.value)">${exp.description}</textarea>
      </div>
    `).join('');
    this.elements.experiencesList.innerHTML = html;
  }

  updateExp(id, field, value) {
    const exp = this.experiences.find(e => e.id === id);
    if (exp) {
      exp[field] = value;
      this.updatePreview();
    }
  }

  // Education Management
  addEducation() {
    const id = this.eduId++;
    this.educations.push({ id, school: '', degree: '', startDate: '', endDate: '' });
    this.renderEducations();
  }

  removeEducation(id) {
    this.educations = this.educations.filter(e => e.id !== id);
    this.renderEducations();
    this.updatePreview();
  }

  renderEducations() {
    const html = this.educations.map((edu, idx) => `
      <div class="entry-block" data-id="${edu.id}">
        <div class="entry-header">
          <span>학력 ${idx + 1}</span>
          <button class="remove-btn" onclick="resumeBuilder.removeEducation(${edu.id})">×</button>
        </div>
        <div class="row-2">
          <input type="text" class="tool-input" placeholder="학교명" value="${edu.school}"
            onchange="resumeBuilder.updateEdu(${edu.id}, 'school', this.value)">
          <input type="text" class="tool-input" placeholder="전공/학위" value="${edu.degree}"
            onchange="resumeBuilder.updateEdu(${edu.id}, 'degree', this.value)">
        </div>
        <div class="row-2">
          <input type="month" class="tool-input" value="${edu.startDate}"
            onchange="resumeBuilder.updateEdu(${edu.id}, 'startDate', this.value)">
          <input type="month" class="tool-input" value="${edu.endDate}"
            onchange="resumeBuilder.updateEdu(${edu.id}, 'endDate', this.value)">
        </div>
      </div>
    `).join('');
    this.elements.educationsList.innerHTML = html;
  }

  updateEdu(id, field, value) {
    const edu = this.educations.find(e => e.id === id);
    if (edu) {
      edu[field] = value;
      this.updatePreview();
    }
  }

  updatePreview() {
    // 기본 정보
    const name = this.elements.fullName.value || '홍길동';
    const title = this.elements.jobTitle.value || '직책';
    const email = this.elements.email.value || 'email@example.com';
    const phone = this.elements.phone.value || '010-1234-5678';
    const location = this.elements.location.value || '서울, 대한민국';
    const summary = this.elements.summary.value || '';
    const skills = this.elements.skills.value || '';

    this.elements.previewName.textContent = name;
    this.elements.previewTitle.textContent = title;
    this.elements.previewEmail.textContent = email;
    this.elements.previewPhone.textContent = phone;
    this.elements.previewLocation.textContent = location;
    this.elements.previewSummary.textContent = summary;

    // 스킬
    if (skills) {
      const skillsHtml = skills.split(',').map(s => `<span class="skill-tag">${s.trim()}</span>`).join('');
      this.elements.previewSkills.innerHTML = skillsHtml;
    } else {
      this.elements.previewSkills.innerHTML = '';
    }

    // 경력
    const expHtml = this.experiences.filter(e => e.company).map(exp => `
      <div class="resume-entry">
        <div class="entry-title">
          <strong>${exp.position}</strong> at ${exp.company}
        </div>
        <div class="entry-date">${this.formatDate(exp.startDate)} - ${exp.endDate ? this.formatDate(exp.endDate) : '현재'}</div>
        <p class="entry-desc">${exp.description}</p>
      </div>
    `).join('');
    this.elements.previewExperience.innerHTML = expHtml || '<p class="empty">경력을 추가하세요</p>';

    // 학력
    const eduHtml = this.educations.filter(e => e.school).map(edu => `
      <div class="resume-entry">
        <div class="entry-title"><strong>${edu.school}</strong></div>
        <div class="entry-date">${edu.degree} | ${this.formatDate(edu.startDate)} - ${this.formatDate(edu.endDate)}</div>
      </div>
    `).join('');
    this.elements.previewEducation.innerHTML = eduHtml || '<p class="empty">학력을 추가하세요</p>';
  }

  formatDate(dateStr) {
    if (!dateStr) return '';
    const [year, month] = dateStr.split('-');
    return `${year}.${month}`;
  }

  async printResume() {
    const previewEl = this.elements.resumePreview;
    const printWindow = window.open('', '_blank');
    printWindow.document.open();
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>이력서</title>
        <style>
          body { font-family: 'Noto Sans KR', -apple-system, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
          .resume-header { text-align: center; margin-bottom: 2rem; }
          .resume-name { font-size: 2rem; font-weight: 700; margin: 0; }
          .resume-jobtitle { color: #666; font-size: 1.1rem; margin: 0.25rem 0; }
          .resume-contact { font-size: 0.85rem; color: #888; }
          .resume-section { margin-bottom: 1.5rem; }
          .section-title { font-size: 1rem; font-weight: 600; border-bottom: 2px solid #333; padding-bottom: 0.5rem; margin-bottom: 1rem; }
          .resume-entry { margin-bottom: 1rem; }
          .entry-title { font-size: 0.95rem; }
          .entry-date { font-size: 0.8rem; color: #666; margin: 0.25rem 0; }
          .entry-desc { font-size: 0.85rem; margin: 0.5rem 0; }
          .skills-container { display: flex; flex-wrap: wrap; gap: 0.5rem; }
          .skill-tag { background: #f0f0f0; padding: 0.25rem 0.75rem; border-radius: 15px; font-size: 0.8rem; }
        </style>
      </head>
      <body>${previewEl.innerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const resumeBuilder = new ResumeBuilder();
window.ResumeBuilder = resumeBuilder;

document.addEventListener('DOMContentLoaded', () => resumeBuilder.init());
