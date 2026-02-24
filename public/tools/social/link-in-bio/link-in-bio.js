/**
 * 링크인바이오 생성기 - ToolBase 기반
 * 소셜 미디어용 링크 페이지 생성
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var LinkInBio = class LinkInBio extends ToolBase {
  constructor() {
    super('LinkInBio');
    this.links = [
      { title: 'My Website', url: 'https://example.com' },
      { title: 'Instagram', url: 'https://instagram.com' },
      { title: 'YouTube', url: 'https://youtube.com' }
    ];
  }

  init() {
    this.initElements({
      linkList: 'linkList',
      profileName: 'profileName',
      profileBio: 'profileBio',
      previewName: 'previewName',
      previewBio: 'previewBio',
      previewAvatar: 'previewAvatar',
      previewLinks: 'previewLinks'
    });

    this.renderLinks();
    this.updatePreview();

    console.log('[LinkInBio] 초기화 완료');
    return this;
  }

  renderLinks() {
    this.elements.linkList.innerHTML = this.links.map((link, i) => `
      <div class="link-item">
        <input type="text" placeholder="제목" value="${this.escapeHtml(link.title)}" oninput="linkInBio.updateLink(${i}, 'title', this.value)">
        <input type="text" placeholder="URL" value="${this.escapeHtml(link.url)}" oninput="linkInBio.updateLink(${i}, 'url', this.value)">
        <button onclick="linkInBio.removeLink(${i})"></button>
      </div>
    `).join('');
  }

  addLink() {
    this.links.push({ title: '', url: '' });
    this.renderLinks();
    this.updatePreview();
  }

  removeLink(index) {
    this.links.splice(index, 1);
    this.renderLinks();
    this.updatePreview();
  }

  updateLink(index, field, value) {
    this.links[index][field] = value;
    this.updatePreview();
  }

  updatePreview() {
    const name = this.elements.profileName.value || 'My Profile';
    const bio = this.elements.profileBio.value || '';

    this.elements.previewName.textContent = name;
    this.elements.previewBio.textContent = bio;
    this.elements.previewAvatar.textContent = name.charAt(0).toUpperCase();

    const linksHtml = this.links
      .filter(l => l.title || l.url)
      .map(l => `<a href="${this.escapeHtml(l.url)}" class="preview-link" target="_blank">${this.escapeHtml(l.title || l.url)}</a>`)
      .join('');

    this.elements.previewLinks.innerHTML = linksHtml;
  }

  escapeHtml(text) {
    return (text || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  exportHTML() {
    const name = this.elements.profileName.value || 'My Profile';
    const bio = this.elements.profileBio.value || '';

    const linksHtml = this.links
      .filter(l => l.title && l.url)
      .map(l => `    <a href="${this.escapeHtml(l.url)}" class="link">${this.escapeHtml(l.title)}</a>`)
      .join('\n');

    const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHtml(name)} - Links</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { min-height: 100vh; background: linear-gradient(180deg, #667eea 0%, #764ba2 100%); font-family: -apple-system, BlinkMacSystemFont, sans-serif; display: flex; justify-content: center; padding: 2rem; }
    .container { max-width: 400px; width: 100%; text-align: center; color: white; }
    .avatar { width: 100px; height: 100px; background: rgba(255,255,255,0.2); border-radius: 50%; margin: 0 auto 1rem; display: flex; align-items: center; justify-content: center; font-size: 2.5rem; }
    .name { font-size: 1.5rem; font-weight: 700; margin-bottom: 0.5rem; }
    .bio { opacity: 0.9; margin-bottom: 2rem; }
    .link { display: block; background: white; color: #333; padding: 1rem; border-radius: 8px; margin-bottom: 0.75rem; text-decoration: none; font-weight: 500; transition: transform 0.2s; }
    .link:hover { transform: scale(1.02); }
  </style>
</head>
<body>
  <div class="container">
    <div class="avatar">${name.charAt(0).toUpperCase()}</div>
    <div class="name">${this.escapeHtml(name)}</div>
    <div class="bio">${this.escapeHtml(bio)}</div>
${linksHtml}
  </div>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'linkinbio.html';
    a.click();
    URL.revokeObjectURL(url);

    this.showToast('HTML 파일이 다운로드됩니다!', 'success');
  }
}

// 전역 인스턴스 생성
const linkInBio = new LinkInBio();
window.LinkInBio = linkInBio;

document.addEventListener('DOMContentLoaded', () => linkInBio.init());
