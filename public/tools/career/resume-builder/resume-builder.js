/**
 * 이력서 빌더 - ToolBase 기반
 * ATS 최적화 이력서 생성
 * @created 2026-01-13
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var ResumeBuilder = class ResumeBuilder extends ToolBase {
  constructor() {
    super('ResumeBuilder');
    this.experiences = [];
    this.educations = [];
    this.template = 'classic';
  }

  init() {
    this.initElements({
      name: 'name',
      email: 'email',
      phone: 'phone',
      linkedin: 'linkedin',
      github: 'github',
      portfolio: 'portfolio',
      summary: 'summary',
      skills: 'skills',
      experienceList: 'experienceList',
      educationList: 'educationList',
      editPanel: 'editPanel',
      previewPanel: 'previewPanel',
      tabEdit: 'tabEdit',
      tabPreview: 'tabPreview',
      resumePreview: 'resumePreview'
    });

    this.loadData();
    this.renderExperiences();
    this.renderEducations();
    this.renderPreview();

    console.log('[ResumeBuilder] 초기화 완료');
    return this;
  }

  loadData() {
    try {
      const saved = localStorage.getItem('resumeBuilderData');
      if (saved) {
        const data = JSON.parse(saved);
        this.elements.name.value = data.name || '';
        this.elements.email.value = data.email || '';
        this.elements.phone.value = data.phone || '';
        this.elements.linkedin.value = data.linkedin || '';
        this.elements.github.value = data.github || '';
        this.elements.portfolio.value = data.portfolio || '';
        this.elements.summary.value = data.summary || '';
        this.elements.skills.value = data.skills || '';
        this.experiences = data.experiences || [];
        this.educations = data.educations || [];
      }
    } catch (e) {
      console.error('Failed to load resume data:', e);
    }
  }

  saveData() {
    try {
      const data = {
        name: this.elements.name.value,
        email: this.elements.email.value,
        phone: this.elements.phone.value,
        linkedin: this.elements.linkedin.value,
        github: this.elements.github.value,
        portfolio: this.elements.portfolio.value,
        summary: this.elements.summary.value,
        skills: this.elements.skills.value,
        experiences: this.experiences,
        educations: this.educations
      };
      localStorage.setItem('resumeBuilderData', JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save resume data:', e);
    }
  }

  showTab(tab) {
    this.elements.editPanel.style.display = tab === 'edit' ? 'block' : 'none';
    this.elements.previewPanel.style.display = tab === 'preview' ? 'block' : 'none';
    this.elements.tabEdit.classList.toggle('active', tab === 'edit');
    this.elements.tabPreview.classList.toggle('active', tab === 'preview');

    if (tab === 'preview') {
      this.saveData();
      this.renderPreview();
    }
  }

  setTemplate(template) {
    this.template = template;
    document.querySelectorAll('.template-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.template === template);
    });
    this.renderPreview();
  }

  addExperience() {
    this.experiences.push({
      company: '',
      title: '',
      location: '',
      startDate: '',
      endDate: '',
      current: false,
      bullets: ''
    });
    this.renderExperiences();
  }

  removeExperience(index) {
    this.experiences.splice(index, 1);
    this.renderExperiences();
  }

  updateExperience(index, field, value) {
    this.experiences[index][field] = value;
  }

  renderExperiences() {
    const container = this.elements.experienceList;
    if (this.experiences.length === 0) {
      container.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 1rem;">경력을 추가해주세요</div>';
      return;
    }

    container.innerHTML = this.experiences.map((exp, index) => `
      <div class="entry-card">
        <div class="entry-header">
          <strong>경력 ${index + 1}</strong>
          <button class="tool-btn tool-btn-secondary" onclick="resumeBuilder.removeExperience(${index})" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">삭제</button>
        </div>
        <div class="form-grid" style="margin-top: 0.5rem;">
          <input type="text" class="tool-input" placeholder="회사명" value="${exp.company}" onchange="resumeBuilder.updateExperience(${index}, 'company', this.value)">
          <input type="text" class="tool-input" placeholder="직책" value="${exp.title}" onchange="resumeBuilder.updateExperience(${index}, 'title', this.value)">
          <input type="text" class="tool-input" placeholder="시작일 (예: 2020.03)" value="${exp.startDate}" onchange="resumeBuilder.updateExperience(${index}, 'startDate', this.value)">
          <input type="text" class="tool-input" placeholder="종료일 (예: 2023.06 또는 현재)" value="${exp.endDate}" onchange="resumeBuilder.updateExperience(${index}, 'endDate', this.value)">
        </div>
        <textarea class="tool-input" rows="3" placeholder="주요 성과 (줄바꿈으로 구분)" style="margin-top: 0.5rem;" onchange="resumeBuilder.updateExperience(${index}, 'bullets', this.value)">${exp.bullets}</textarea>
      </div>
    `).join('');
  }

  addEducation() {
    this.educations.push({
      school: '',
      degree: '',
      field: '',
      startDate: '',
      endDate: ''
    });
    this.renderEducations();
  }

  removeEducation(index) {
    this.educations.splice(index, 1);
    this.renderEducations();
  }

  updateEducation(index, field, value) {
    this.educations[index][field] = value;
  }

  renderEducations() {
    const container = this.elements.educationList;
    if (this.educations.length === 0) {
      container.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 1rem;">학력을 추가해주세요</div>';
      return;
    }

    container.innerHTML = this.educations.map((edu, index) => `
      <div class="entry-card">
        <div class="entry-header">
          <strong>학력 ${index + 1}</strong>
          <button class="tool-btn tool-btn-secondary" onclick="resumeBuilder.removeEducation(${index})" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">삭제</button>
        </div>
        <div class="form-grid" style="margin-top: 0.5rem;">
          <input type="text" class="tool-input" placeholder="학교명" value="${edu.school}" onchange="resumeBuilder.updateEducation(${index}, 'school', this.value)">
          <input type="text" class="tool-input" placeholder="학위 (예: 학사, 석사)" value="${edu.degree}" onchange="resumeBuilder.updateEducation(${index}, 'degree', this.value)">
          <input type="text" class="tool-input" placeholder="전공" value="${edu.field}" onchange="resumeBuilder.updateEducation(${index}, 'field', this.value)">
          <input type="text" class="tool-input" placeholder="졸업년도" value="${edu.endDate}" onchange="resumeBuilder.updateEducation(${index}, 'endDate', this.value)">
        </div>
      </div>
    `).join('');
  }

  renderPreview() {
    const container = this.elements.resumePreview;
    const data = JSON.parse(localStorage.getItem('resumeBuilderData') || '{}');

    const contactParts = [];
    if (data.email) contactParts.push(data.email);
    if (data.phone) contactParts.push(data.phone);
    if (data.linkedin) contactParts.push(data.linkedin);
    if (data.github) contactParts.push(data.github);

    let html = `
      <div class="preview-header">
        <div class="preview-name">${data.name || '이름'}</div>
        <div class="preview-contact">${contactParts.join(' | ') || '연락처'}</div>
      </div>
    `;

    if (data.summary) {
      html += `
        <div class="preview-section">
          <div class="preview-section-title">SUMMARY</div>
          <p>${data.summary}</p>
        </div>
      `;
    }

    if (this.experiences.length > 0) {
      html += `<div class="preview-section"><div class="preview-section-title">EXPERIENCE</div>`;
      this.experiences.forEach(exp => {
        if (exp.company || exp.title) {
          const bullets = exp.bullets ? exp.bullets.split('\n').filter(b => b.trim()) : [];
          html += `
            <div class="preview-entry">
              <div class="preview-entry-header">
                <span class="preview-entry-title">${exp.title || '직책'}${exp.company ? `, ${exp.company}` : ''}</span>
                <span class="preview-entry-date">${exp.startDate || ''} - ${exp.endDate || '현재'}</span>
              </div>
              ${bullets.length > 0 ? `<ul class="preview-bullets">${bullets.map(b => `<li>${b}</li>`).join('')}</ul>` : ''}
            </div>
          `;
        }
      });
      html += `</div>`;
    }

    if (this.educations.length > 0) {
      html += `<div class="preview-section"><div class="preview-section-title">EDUCATION</div>`;
      this.educations.forEach(edu => {
        if (edu.school || edu.degree) {
          html += `
            <div class="preview-entry">
              <div class="preview-entry-header">
                <span class="preview-entry-title">${edu.school || '학교'}</span>
                <span class="preview-entry-date">${edu.endDate || ''}</span>
              </div>
              <div>${edu.degree || ''} ${edu.field ? `- ${edu.field}` : ''}</div>
            </div>
          `;
        }
      });
      html += `</div>`;
    }

    if (data.skills) {
      html += `
        <div class="preview-section">
          <div class="preview-section-title">SKILLS</div>
          <p>${data.skills}</p>
        </div>
      `;
    }

    container.innerHTML = html;
  }

  async copyText() {
    const preview = this.elements.resumePreview;
    try {
      await navigator.clipboard.writeText(preview.innerText);
      this.showToast('이력서 텍스트가 복사되었습니다.', 'success');
    } catch (e) {
      this.showToast('복사 실패', 'error');
    }
  }

  downloadHTML() {
    this.saveData();
    const data = JSON.parse(localStorage.getItem('resumeBuilderData') || '{}');
    const preview = this.elements.resumePreview.innerHTML;

    const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>${data.name || '이력서'} - Resume</title>
  <style>
    body { font-family: 'Times New Roman', serif; max-width: 800px; margin: 0 auto; padding: 2rem; line-height: 1.4; color: #333; }
    .preview-header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 1rem; margin-bottom: 1rem; }
    .preview-name { font-size: 1.5rem; font-weight: bold; margin-bottom: 0.25rem; }
    .preview-contact { font-size: 0.85rem; color: #666; }
    .preview-section { margin-bottom: 1rem; }
    .preview-section-title { font-weight: bold; border-bottom: 1px solid #ccc; margin-bottom: 0.5rem; font-size: 1rem; }
    .preview-entry { margin-bottom: 0.75rem; }
    .preview-entry-header { display: flex; justify-content: space-between; }
    .preview-entry-title { font-weight: bold; }
    .preview-entry-date { font-style: italic; color: #666; }
    .preview-bullets { padding-left: 1.5rem; margin: 0.25rem 0; }
    .preview-bullets li { margin-bottom: 0.15rem; }
  </style>
</head>
<body>${preview}</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `${data.name || 'resume'}_이력서.html`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
    this.showToast('이력서가 다운로드되었습니다!', 'success');
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const resumeBuilder = new ResumeBuilder();
window.ResumeBuilder = resumeBuilder;

document.addEventListener('DOMContentLoaded', () => resumeBuilder.init());
