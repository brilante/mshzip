/**
 * 인용 생성기 - ToolBase 기반
 * APA, MLA, Chicago 등 형식으로 인용 생성
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var CitationGen = class CitationGen extends ToolBase {
  constructor() {
    super('CitationGen');
    this.format = 'apa';
    this.type = 'book';
  }

  init() {
    this.initElements({
      author: 'author',
      title: 'title',
      publisher: 'publisher',
      year: 'year',
      url: 'url',
      accessDate: 'accessDate',
      urlGroup: 'urlGroup',
      accessDateGroup: 'accessDateGroup',
      citationResult: 'citationResult',
      formatExamples: 'formatExamples'
    });

    this.showExamples();
    console.log('[CitationGen] 초기화 완료');
    return this;
  }

  setFormat(btn) {
    document.querySelectorAll('.format-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    this.format = btn.dataset.format;
    this.generate();
    this.showExamples();
  }

  setType(btn) {
    document.querySelectorAll('.source-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    this.type = btn.dataset.type;

    const publisherLabel = document.querySelector('[for="publisher"]') || this.elements.publisher.previousElementSibling;

    if (this.type === 'website') {
      this.elements.urlGroup.style.display = 'block';
      this.elements.accessDateGroup.style.display = 'block';
      publisherLabel.textContent = '웹사이트명';
    } else if (this.type === 'article') {
      this.elements.urlGroup.style.display = 'block';
      this.elements.accessDateGroup.style.display = 'none';
      publisherLabel.textContent = '저널명';
    } else {
      this.elements.urlGroup.style.display = 'none';
      this.elements.accessDateGroup.style.display = 'none';
      publisherLabel.textContent = '출판사';
    }
    this.generate();
  }

  generate() {
    const author = this.elements.author.value.trim();
    const title = this.elements.title.value.trim();
    const publisher = this.elements.publisher.value.trim();
    const year = this.elements.year.value.trim();
    const url = this.elements.url.value.trim();
    const accessDate = this.elements.accessDate.value;

    if (!author && !title) {
      this.elements.citationResult.innerHTML = '<div class="hanging">정보를 입력하면 인용이 생성됩니다.</div>';
      return;
    }

    let citation = '';

    switch (this.format) {
      case 'apa':
        citation = this.formatAPA(author, title, publisher, year, url, accessDate);
        break;
      case 'mla':
        citation = this.formatMLA(author, title, publisher, year, url, accessDate);
        break;
      case 'chicago':
        citation = this.formatChicago(author, title, publisher, year, url, accessDate);
        break;
      case 'harvard':
        citation = this.formatHarvard(author, title, publisher, year, url, accessDate);
        break;
    }

    this.elements.citationResult.innerHTML = `<div class="hanging">${citation}</div>`;
  }

  formatAPA(author, title, publisher, year, url, accessDate) {
    let cite = author ? `${author}` : '';
    if (year) cite += ` (${year}).`;
    else cite += '.';
    if (title) cite += ` <em>${title}</em>.`;
    if (publisher) cite += ` ${publisher}.`;
    if (url) cite += ` ${url}`;
    return cite.trim();
  }

  formatMLA(author, title, publisher, year, url, accessDate) {
    let cite = author ? `${author}.` : '';
    if (title) cite += ` <em>${title}</em>.`;
    if (publisher) cite += ` ${publisher},`;
    if (year) cite += ` ${year}.`;
    if (url) {
      cite += ` ${url}.`;
      if (accessDate) {
        const d = new Date(accessDate);
        cite += ` Accessed ${d.getDate()} ${d.toLocaleString('en', {month: 'short'})}. ${d.getFullYear()}.`;
      }
    }
    return cite.trim();
  }

  formatChicago(author, title, publisher, year, url, accessDate) {
    let cite = author ? `${author}.` : '';
    if (title) cite += ` <em>${title}</em>.`;
    if (publisher) cite += ` ${publisher},`;
    if (year) cite += ` ${year}.`;
    if (url) cite += ` ${url}.`;
    return cite.trim();
  }

  formatHarvard(author, title, publisher, year, url, accessDate) {
    let cite = author ? `${author}` : '';
    if (year) cite += ` (${year})`;
    if (title) cite += ` <em>${title}</em>.`;
    if (publisher) cite += ` ${publisher}.`;
    if (url) {
      cite += ` Available at: ${url}`;
      if (accessDate) {
        const d = new Date(accessDate);
        cite += ` (Accessed: ${d.toLocaleDateString('ko')}).`;
      }
    }
    return cite.trim();
  }

  showExamples() {
    const examples = {
      apa: 'Smith, J. (2024). <em>Book Title</em>. Publisher Name.',
      mla: 'Smith, John. <em>Book Title</em>. Publisher Name, 2024.',
      chicago: 'Smith, John. <em>Book Title</em>. Publisher Name, 2024.',
      harvard: 'Smith, J. (2024) <em>Book Title</em>. Publisher Name.'
    };
    this.elements.formatExamples.innerHTML = `
      <div style="background: var(--bg-primary); padding: 1rem; border-radius: 8px; font-family: serif;">
        ${examples[this.format]}
      </div>
    `;
  }

  async copy() {
    const result = this.elements.citationResult.innerText;
    if (!result || result.includes('정보를 입력하면')) {
      this.showToast('복사할 인용이 없습니다.', 'warning');
      return;
    }
    try {
      await navigator.clipboard.writeText(result);
      this.showSuccess('복사됨!');
    } catch (e) {
      this.showError('복사 실패');
    }
  }

  clear() {
    ['author', 'title', 'publisher', 'year', 'url', 'accessDate'].forEach(id => {
      this.elements[id].value = '';
    });
    this.generate();
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const citationGen = new CitationGen();
window.CitationGen = citationGen;

document.addEventListener('DOMContentLoaded', () => citationGen.init());
