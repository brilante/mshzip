/**
 * 인용 생성기 - ToolBase 기반
 * APA, MLA, Chicago 스타일 인용
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class CitationGenerator extends ToolBase {
  constructor() {
    super('CitationGenerator');
    this.currentStyle = 'apa';
    this.currentType = 'book';
    this.savedCitations = [];

    this.formTemplates = {
      book: [
        { id: 'author', label: '저자 (성, 이름)', placeholder: '홍, 길동' },
        { id: 'year', label: '출판연도', placeholder: '2024' },
        { id: 'title', label: '책 제목', placeholder: '책 제목을 입력하세요' },
        { id: 'publisher', label: '출판사', placeholder: '출판사명' },
        { id: 'city', label: '출판 도시', placeholder: '서울' }
      ],
      journal: [
        { id: 'author', label: '저자 (성, 이름)', placeholder: '홍, 길동' },
        { id: 'year', label: '출판연도', placeholder: '2024' },
        { id: 'articleTitle', label: '논문 제목', placeholder: '논문 제목' },
        { id: 'journalName', label: '학술지명', placeholder: '학술지 이름' },
        { id: 'volume', label: '권(Volume)', placeholder: '10' },
        { id: 'issue', label: '호(Issue)', placeholder: '2' },
        { id: 'pages', label: '페이지', placeholder: '15-30' },
        { id: 'doi', label: 'DOI', placeholder: '10.1000/xxx' }
      ],
      website: [
        { id: 'author', label: '저자/기관', placeholder: '저자 또는 기관명' },
        { id: 'year', label: '게시연도', placeholder: '2024' },
        { id: 'title', label: '페이지 제목', placeholder: '웹페이지 제목' },
        { id: 'siteName', label: '웹사이트명', placeholder: '웹사이트 이름' },
        { id: 'url', label: 'URL', placeholder: 'https://...' },
        { id: 'accessDate', label: '접속일', placeholder: '2024-01-01' }
      ],
      newspaper: [
        { id: 'author', label: '기자명', placeholder: '홍길동' },
        { id: 'year', label: '발행연도', placeholder: '2024' },
        { id: 'month', label: '월', placeholder: '1' },
        { id: 'day', label: '일', placeholder: '15' },
        { id: 'title', label: '기사 제목', placeholder: '기사 제목' },
        { id: 'newspaper', label: '신문사명', placeholder: '조선일보' },
        { id: 'url', label: 'URL (선택)', placeholder: 'https://...' }
      ]
    };
  }

  init() {
    this.initElements({
      sourceType: 'sourceType',
      formFields: 'formFields',
      citationResult: 'citationResult',
      generateCitation: 'generateCitation',
      copyCitation: 'copyCitation',
      savedList: 'savedList'
    });

    this.loadData();
    this.setupEvents();
    this.renderForm();
    this.renderSaved();

    console.log('[CitationGenerator] 초기화 완료');
    return this;
  }

  loadData() {
    try {
      const saved = localStorage.getItem('citations');
      if (saved) {
        this.savedCitations = JSON.parse(saved);
      }
    } catch (e) {}
  }

  setupEvents() {
    this.elements.sourceType.addEventListener('change', (e) => {
      this.currentType = e.target.value;
      this.renderForm();
    });

    document.querySelectorAll('.style-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.style-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentStyle = btn.dataset.style;
      });
    });

    this.elements.generateCitation.addEventListener('click', () => this.generate());
    this.elements.copyCitation.addEventListener('click', () => this.copyCitation());
  }

  renderForm() {
    const fields = this.formTemplates[this.currentType];
    this.elements.formFields.innerHTML = fields.map(f => `
      <div class="form-group">
        <label>${f.label}</label>
        <input type="text" id="${f.id}" placeholder="${f.placeholder}">
      </div>
    `).join('');
  }

  getFormData() {
    const fields = this.formTemplates[this.currentType];
    const data = {};
    fields.forEach(f => {
      data[f.id] = document.getElementById(f.id).value.trim();
    });
    return data;
  }

  generateCitation(data) {
    if (this.currentType === 'book') {
      if (this.currentStyle === 'apa') {
        return `${data.author} (${data.year}). <i>${data.title}</i>. ${data.publisher}.`;
      } else if (this.currentStyle === 'mla') {
        return `${data.author}. <i>${data.title}</i>. ${data.publisher}, ${data.year}.`;
      } else {
        return `${data.author}. <i>${data.title}</i>. ${data.city}: ${data.publisher}, ${data.year}.`;
      }
    } else if (this.currentType === 'journal') {
      if (this.currentStyle === 'apa') {
        return `${data.author} (${data.year}). ${data.articleTitle}. <i>${data.journalName}, ${data.volume}</i>(${data.issue}), ${data.pages}. https://doi.org/${data.doi}`;
      } else if (this.currentStyle === 'mla') {
        return `${data.author}. "${data.articleTitle}." <i>${data.journalName}</i>, vol. ${data.volume}, no. ${data.issue}, ${data.year}, pp. ${data.pages}.`;
      } else {
        return `${data.author}. "${data.articleTitle}." <i>${data.journalName}</i> ${data.volume}, no. ${data.issue} (${data.year}): ${data.pages}.`;
      }
    } else if (this.currentType === 'website') {
      if (this.currentStyle === 'apa') {
        return `${data.author}. (${data.year}). <i>${data.title}</i>. ${data.siteName}. ${data.url}`;
      } else if (this.currentStyle === 'mla') {
        return `${data.author}. "${data.title}." <i>${data.siteName}</i>, ${data.year}, ${data.url}. Accessed ${data.accessDate}.`;
      } else {
        return `${data.author}. "${data.title}." ${data.siteName}. Accessed ${data.accessDate}. ${data.url}.`;
      }
    } else if (this.currentType === 'newspaper') {
      if (this.currentStyle === 'apa') {
        return `${data.author}. (${data.year}, ${data.month}월 ${data.day}일). ${data.title}. <i>${data.newspaper}</i>. ${data.url || ''}`;
      } else if (this.currentStyle === 'mla') {
        return `${data.author}. "${data.title}." <i>${data.newspaper}</i>, ${data.day} ${data.month}월 ${data.year}.`;
      } else {
        return `${data.author}. "${data.title}." <i>${data.newspaper}</i>, ${data.month}월 ${data.day}일, ${data.year}.`;
      }
    }
    return '';
  }

  generate() {
    const data = this.getFormData();
    const citation = this.generateCitation(data);
    this.elements.citationResult.innerHTML = citation;

    this.savedCitations.push({ citation, style: this.currentStyle, type: this.currentType, date: new Date().toISOString() });
    localStorage.setItem('citations', JSON.stringify(this.savedCitations));
    this.renderSaved();

    this.showToast('인용이 생성되었습니다!', 'success');
  }

  copyCitation() {
    const text = this.elements.citationResult.innerText;
    navigator.clipboard.writeText(text).then(() => {
      this.showToast('복사되었습니다!', 'success');
    });
  }

  renderSaved() {
    this.elements.savedList.innerHTML = this.savedCitations.slice(-10).reverse().map((c, i) => `
      <div class="saved-item">
        <p>${c.citation}</p>
        <button onclick="citationGenerator.deleteCitation(${this.savedCitations.length - 1 - i})">삭제</button>
      </div>
    `).join('');
  }

  deleteCitation(idx) {
    this.savedCitations.splice(idx, 1);
    localStorage.setItem('citations', JSON.stringify(this.savedCitations));
    this.renderSaved();
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const citationGenerator = new CitationGenerator();
window.CitationGenerator = citationGenerator;

document.addEventListener('DOMContentLoaded', () => citationGenerator.init());
