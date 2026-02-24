/**
 * 포트폴리오 생성기 - ToolBase 기반
 * 간편한 포트폴리오 웹페이지 생성
 * @created 2026-01-13
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var PortfolioGen = class PortfolioGen extends ToolBase {
  constructor() {
    super('PortfolioGen');
    this.projects = [];
    this.template = 'minimal';
    this.generatedHtml = '';
  }

  init() {
    this.initElements({
      name: 'name',
      title: 'title',
      email: 'email',
      github: 'github',
      bio: 'bio',
      skills: 'skills',
      projectList: 'projectList',
      editPanel: 'editPanel',
      previewPanel: 'previewPanel',
      tabEdit: 'tabEdit',
      tabPreview: 'tabPreview',
      portfolioPreview: 'portfolioPreview'
    });

    this.loadData();
    this.renderProjects();

    console.log('[PortfolioGen] 초기화 완료');
    return this;
  }

  loadData() {
    try {
      const saved = localStorage.getItem('portfolioGenData');
      if (saved) {
        const data = JSON.parse(saved);
        this.elements.name.value = data.name || '';
        this.elements.title.value = data.title || '';
        this.elements.email.value = data.email || '';
        this.elements.github.value = data.github || '';
        this.elements.bio.value = data.bio || '';
        this.elements.skills.value = data.skills || '';
        this.projects = data.projects || [];
      }
    } catch (e) {
      console.error('Failed to load portfolio data:', e);
    }
  }

  saveData() {
    try {
      const data = {
        name: this.elements.name.value,
        title: this.elements.title.value,
        email: this.elements.email.value,
        github: this.elements.github.value,
        bio: this.elements.bio.value,
        skills: this.elements.skills.value,
        projects: this.projects
      };
      localStorage.setItem('portfolioGenData', JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save portfolio data:', e);
    }
  }

  showTab(tab) {
    this.elements.editPanel.style.display = tab === 'edit' ? 'block' : 'none';
    this.elements.previewPanel.style.display = tab === 'preview' ? 'block' : 'none';
    this.elements.tabEdit.classList.toggle('active', tab === 'edit');
    this.elements.tabPreview.classList.toggle('active', tab === 'preview');
  }

  setTemplate(template) {
    this.template = template;
    document.querySelectorAll('.template-card').forEach(card => {
      card.classList.toggle('active', card.dataset.template === template);
    });
  }

  addProject() {
    this.projects.push({
      name: '',
      description: '',
      tech: '',
      link: ''
    });
    this.renderProjects();
  }

  removeProject(index) {
    this.projects.splice(index, 1);
    this.renderProjects();
  }

  updateProject(index, field, value) {
    this.projects[index][field] = value;
  }

  renderProjects() {
    const container = this.elements.projectList;
    if (this.projects.length === 0) {
      container.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 1rem;">프로젝트를 추가해주세요</div>';
      return;
    }

    container.innerHTML = this.projects.map((project, index) => `
      <div class="project-card">
        <div class="project-header">
          <strong>프로젝트 ${index + 1}</strong>
          <button class="tool-btn tool-btn-secondary" onclick="portfolioGen.removeProject(${index})" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">삭제</button>
        </div>
        <div class="form-grid">
          <input type="text" class="tool-input" placeholder="프로젝트명" value="${project.name}" onchange="portfolioGen.updateProject(${index}, 'name', this.value)">
          <input type="text" class="tool-input" placeholder="기술 스택" value="${project.tech}" onchange="portfolioGen.updateProject(${index}, 'tech', this.value)">
        </div>
        <textarea class="tool-input" rows="2" placeholder="프로젝트 설명" style="margin-top: 0.5rem;" onchange="portfolioGen.updateProject(${index}, 'description', this.value)">${project.description}</textarea>
        <input type="text" class="tool-input" placeholder="링크 (선택)" value="${project.link}" style="margin-top: 0.5rem;" onchange="portfolioGen.updateProject(${index}, 'link', this.value)">
      </div>
    `).join('');
  }

  getData() {
    return {
      name: this.elements.name.value.trim() || '이름',
      title: this.elements.title.value.trim() || '역할',
      email: this.elements.email.value.trim(),
      github: this.elements.github.value.trim(),
      bio: this.elements.bio.value.trim(),
      skills: this.elements.skills.value.trim().split(',').map(s => s.trim()).filter(s => s)
    };
  }

  getTemplateStyles() {
    const styles = {
      minimal: {
        bg: '#ffffff',
        text: '#333333',
        accent: '#000000',
        cardBg: '#f9fafb',
        font: "'Inter', sans-serif"
      },
      modern: {
        bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        text: '#ffffff',
        accent: '#fbbf24',
        cardBg: 'rgba(255,255,255,0.1)',
        font: "'Poppins', sans-serif"
      },
      creative: {
        bg: '#0f172a',
        text: '#e2e8f0',
        accent: '#38bdf8',
        cardBg: '#1e293b',
        font: "'Space Grotesk', sans-serif"
      }
    };
    return styles[this.template];
  }

  generate() {
    this.saveData();
    const data = this.getData();
    const style = this.getTemplateStyles();

    const projectsHtml = this.projects.filter(p => p.name).map(p => `
      <div style="background: ${style.cardBg}; border-radius: 12px; padding: 1.5rem; margin-bottom: 1rem;">
        <h3 style="font-size: 1.25rem; margin-bottom: 0.5rem; color: ${style.accent};">${p.name}</h3>
        <p style="margin-bottom: 0.75rem; opacity: 0.9;">${p.description}</p>
        ${p.tech ? `<p style="font-size: 0.875rem; opacity: 0.7;">${p.tech}</p>` : ''}
        ${p.link ? `<a href="${p.link}" target="_blank" style="color: ${style.accent}; text-decoration: none;">프로젝트 보기 →</a>` : ''}
      </div>
    `).join('');

    const skillsHtml = data.skills.map(skill =>
      `<span style="display: inline-block; padding: 0.5rem 1rem; background: ${style.cardBg}; border-radius: 20px; margin: 0.25rem; font-size: 0.875rem;">${skill}</span>`
    ).join('');

    this.generatedHtml = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.name} - Portfolio</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Poppins:wght@400;600;700&family=Space+Grotesk:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: ${style.font};
      background: ${style.bg};
      color: ${style.text};
      min-height: 100vh;
      line-height: 1.6;
    }
    .container { max-width: 800px; margin: 0 auto; padding: 3rem 1.5rem; }
    .header { text-align: center; margin-bottom: 3rem; }
    .name { font-size: 2.5rem; font-weight: 700; margin-bottom: 0.5rem; }
    .title { font-size: 1.25rem; opacity: 0.8; margin-bottom: 1rem; }
    .bio { max-width: 600px; margin: 0 auto 1.5rem; opacity: 0.9; }
    .contacts { display: flex; justify-content: center; gap: 1.5rem; flex-wrap: wrap; }
    .contacts a { color: ${style.accent}; text-decoration: none; }
    .section { margin-bottom: 2.5rem; }
    .section-title { font-size: 1.5rem; font-weight: 600; margin-bottom: 1rem; color: ${style.accent}; }
    .skills { display: flex; flex-wrap: wrap; gap: 0.5rem; }
  </style>
</head>
<body>
  <div class="container">
    <header class="header">
      <h1 class="name">${data.name}</h1>
      <p class="title">${data.title}</p>
      ${data.bio ? `<p class="bio">${data.bio}</p>` : ''}
      <div class="contacts">
        ${data.email ? `<a href="mailto:${data.email}">${data.email}</a>` : ''}
        ${data.github ? `<a href="https://${data.github}" target="_blank">GitHub</a>` : ''}
      </div>
    </header>

    ${data.skills.length > 0 ? `
    <section class="section">
      <h2 class="section-title">Skills</h2>
      <div class="skills">${skillsHtml}</div>
    </section>
    ` : ''}

    ${this.projects.filter(p => p.name).length > 0 ? `
    <section class="section">
      <h2 class="section-title">Projects</h2>
      ${projectsHtml}
    </section>
    ` : ''}
  </div>
</body>
</html>`;

    // Shadow DOM으로 포트폴리오 미리보기 (iframe 사용 금지)
    this.elements.portfolioPreview.innerHTML = '';
    const previewContainer = document.createElement('div');
    previewContainer.style.cssText = 'width: 100%; height: 500px; border: none; border-radius: 8px; overflow: auto; background: white;';
    const shadow = previewContainer.attachShadow({ mode: 'open' });
    shadow.innerHTML = this.generatedHtml;
    this.elements.portfolioPreview.appendChild(previewContainer);
    this.showTab('preview');
  }

  async copyCode() {
    try {
      await navigator.clipboard.writeText(this.generatedHtml);
      this.showToast('HTML 코드가 클립보드에 복사되었습니다.', 'success');
    } catch (e) {
      this.showToast('복사 실패', 'error');
    }
  }

  download() {
    const data = this.getData();
    const blob = new Blob([this.generatedHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `${data.name}_portfolio.html`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
    this.showToast('포트폴리오가 다운로드되었습니다!', 'success');
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const portfolioGen = new PortfolioGen();
window.PortfolioGen = portfolioGen;

document.addEventListener('DOMContentLoaded', () => portfolioGen.init());
