/**
 * 전자책 제작기 - ToolBase 기반
 * EPUB 생성 도구
 * @created 2026-01-13
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var EbookCreator = class EbookCreator extends ToolBase {
  constructor() {
    super('EbookCreator');
    this.chapters = [];
  }

  init() {
    this.initElements({
      bookTitle: 'bookTitle',
      bookAuthor: 'bookAuthor',
      bookLanguage: 'bookLanguage',
      bookDate: 'bookDate',
      bookDescription: 'bookDescription',
      chapterList: 'chapterList',
      chapterModal: 'chapterModal',
      chapterTitle: 'chapterTitle',
      chapterContent: 'chapterContent',
      editingIndex: 'editingIndex',
      preview: 'preview'
    });

    this.loadData();
    this.setDefaultDate();
    this.renderChapterList();
    this.renderPreview();

    console.log('[EbookCreator] 초기화 완료');
    return this;
  }

  setDefaultDate() {
    const today = new Date().toISOString().split('T')[0];
    this.elements.bookDate.value = today;
  }

  loadData() {
    try {
      const saved = localStorage.getItem('ebookCreatorData');
      if (saved) {
        const data = JSON.parse(saved);
        this.chapters = data.chapters || [];
        if (data.meta) {
          this.elements.bookTitle.value = data.meta.title || '';
          this.elements.bookAuthor.value = data.meta.author || '';
          this.elements.bookLanguage.value = data.meta.language || 'ko';
          this.elements.bookDate.value = data.meta.date || '';
          this.elements.bookDescription.value = data.meta.description || '';
        }
      }
    } catch (e) {}
  }

  saveData() {
    const data = {
      meta: this.getMetadata(),
      chapters: this.chapters
    };
    localStorage.setItem('ebookCreatorData', JSON.stringify(data));
  }

  getMetadata() {
    return {
      title: this.elements.bookTitle.value.trim(),
      author: this.elements.bookAuthor.value.trim(),
      language: this.elements.bookLanguage.value,
      date: this.elements.bookDate.value,
      description: this.elements.bookDescription.value.trim()
    };
  }

  openChapterModal(index = -1) {
    this.elements.editingIndex.value = index;

    if (index >= 0 && this.chapters[index]) {
      this.elements.chapterTitle.value = this.chapters[index].title;
      this.elements.chapterContent.value = this.chapters[index].content;
    } else {
      this.elements.chapterTitle.value = '';
      this.elements.chapterContent.value = '';
    }

    this.elements.chapterModal.classList.add('active');
  }

  closeChapterModal() {
    this.elements.chapterModal.classList.remove('active');
  }

  saveChapter() {
    const title = this.elements.chapterTitle.value.trim();
    const content = this.elements.chapterContent.value.trim();
    const index = parseInt(this.elements.editingIndex.value);

    if (!title || !content) {
      alert('제목과 내용을 모두 입력해주세요.');
      return;
    }

    if (index >= 0) {
      this.chapters[index] = { title, content };
    } else {
      this.chapters.push({ title, content });
    }

    this.saveData();
    this.renderChapterList();
    this.renderPreview();
    this.closeChapterModal();
  }

  deleteChapter(index) {
    if (!confirm('이 챕터를 삭제하시겠습니까?')) return;
    this.chapters.splice(index, 1);
    this.saveData();
    this.renderChapterList();
    this.renderPreview();
  }

  moveChapter(index, direction) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= this.chapters.length) return;

    const temp = this.chapters[index];
    this.chapters[index] = this.chapters[newIndex];
    this.chapters[newIndex] = temp;

    this.saveData();
    this.renderChapterList();
    this.renderPreview();
  }

  renderChapterList() {
    if (this.chapters.length === 0) {
      this.elements.chapterList.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 1rem;">챕터를 추가해주세요</div>';
      return;
    }

    this.elements.chapterList.innerHTML = this.chapters.map((chapter, index) => `
      <div class="chapter-item">
        <div class="chapter-item-info">
          <div class="chapter-num">${index + 1}</div>
          <div>
            <div style="font-weight: 500;">${chapter.title}</div>
            <div style="font-size: 0.75rem; color: var(--text-secondary);">${chapter.content.length}자</div>
          </div>
        </div>
        <div class="chapter-actions">
          <button onclick="ebookCreator.moveChapter(${index}, -1)" ${index === 0 ? 'disabled' : ''}>↑</button>
          <button onclick="ebookCreator.moveChapter(${index}, 1)" ${index === this.chapters.length - 1 ? 'disabled' : ''}>↓</button>
          <button class="btn-edit" onclick="ebookCreator.openChapterModal(${index})">편집</button>
          <button class="btn-delete" onclick="ebookCreator.deleteChapter(${index})">삭제</button>
        </div>
      </div>
    `).join('');
  }

  renderPreview() {
    const meta = this.getMetadata();

    if (!meta.title && this.chapters.length === 0) {
      this.elements.preview.innerHTML = '<div style="text-align: center; color: var(--text-secondary);">책 정보와 챕터를 입력하면 미리보기가 표시됩니다</div>';
      return;
    }

    let html = `
      <div class="preview-cover">
        <h1>${meta.title || '제목 없음'}</h1>
        <p style="color: #6b7280;">${meta.author || '저자 미상'}</p>
        ${meta.description ? `<p style="font-size: 0.9rem; margin-top: 1rem; color: #374151;">${meta.description}</p>` : ''}
      </div>
    `;

    this.chapters.forEach((chapter, index) => {
      const paragraphs = chapter.content.split('\n').filter(p => p.trim());
      html += `
        <div class="preview-chapter">
          <h2>${chapter.title}</h2>
          ${paragraphs.map(p => `<p>${p}</p>`).join('')}
        </div>
      `;
    });

    this.elements.preview.innerHTML = html;
  }

  clearAll() {
    if (!confirm('모든 내용을 초기화하시겠습니까?')) return;
    this.chapters = [];
    this.elements.bookTitle.value = '나의 첫 번째 전자책';
    this.elements.bookAuthor.value = '';
    this.elements.bookDescription.value = '';
    this.setDefaultDate();
    this.saveData();
    this.renderChapterList();
    this.renderPreview();
  }

  exportHTML() {
    const meta = this.getMetadata();
    if (!meta.title || this.chapters.length === 0) {
      alert('제목과 최소 1개의 챕터가 필요합니다.');
      return;
    }

    let html = `<!DOCTYPE html>
<html lang="${meta.language}">
<head>
  <meta charset="UTF-8">
  <title>${meta.title}</title>
  <style>
    body { font-family: Georgia, serif; max-width: 800px; margin: 0 auto; padding: 2rem; line-height: 1.8; }
    .cover { text-align: center; padding: 3rem 0; border-bottom: 2px solid #e5e7eb; margin-bottom: 2rem; }
    .cover h1 { font-size: 2.5rem; margin-bottom: 1rem; }
    .cover .author { font-size: 1.25rem; color: #6b7280; }
    .chapter { margin-bottom: 3rem; }
    .chapter h2 { font-size: 1.5rem; color: #374151; margin-bottom: 1rem; }
    .chapter p { margin-bottom: 1rem; text-align: justify; }
  </style>
</head>
<body>
  <div class="cover">
    <h1>${meta.title}</h1>
    <p class="author">${meta.author || ''}</p>
    ${meta.description ? `<p>${meta.description}</p>` : ''}
  </div>
`;

    this.chapters.forEach(chapter => {
      const paragraphs = chapter.content.split('\n').filter(p => p.trim());
      html += `  <div class="chapter">
    <h2>${chapter.title}</h2>
    ${paragraphs.map(p => `    <p>${p}</p>`).join('\n')}
  </div>\n`;
    });

    html += `</body>\n</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `${meta.title}.html`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  }

  exportEPUB() {
    alert('EPUB 내보내기를 위해서는 JSZip 라이브러리가 필요합니다.\nHTML 다운로드를 사용하거나 온라인 변환 도구를 이용해주세요.');
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const ebookCreator = new EbookCreator();
window.EbookCreator = ebookCreator;

document.addEventListener('DOMContentLoaded', () => ebookCreator.init());
