/**
 * 인용문 생성기 - ToolBase 기반
 * 학술 인용 형식 생성
 * @created 2026-01-13
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var CitationGen = class CitationGen extends ToolBase {
  constructor() {
    super('CitationGen');
    this.sourceType = 'book';
    this.style = 'apa';
    this.lastCitation = '';
  }

  init() {
    this.initElements({
      // 도서 필드
      author: 'author',
      year: 'year',
      title: 'title',
      publisher: 'publisher',
      location: 'location',
      edition: 'edition',
      // 논문 필드
      jAuthor: 'jAuthor',
      jYear: 'jYear',
      articleTitle: 'articleTitle',
      journalName: 'journalName',
      volume: 'volume',
      issue: 'issue',
      pages: 'pages',
      doi: 'doi',
      // 웹사이트 필드
      wAuthor: 'wAuthor',
      pageTitle: 'pageTitle',
      siteName: 'siteName',
      url: 'url',
      publishDate: 'publishDate',
      accessDate: 'accessDate',
      // 패널
      bookFields: 'bookFields',
      journalFields: 'journalFields',
      websiteFields: 'websiteFields',
      resultPanel: 'resultPanel',
      citationResult: 'citationResult',
      inTextResult: 'inTextResult'
    });

    // 오늘 날짜를 접속일 기본값으로
    const today = new Date().toISOString().split('T')[0];
    this.elements.accessDate.value = today;

    console.log('[CitationGen] 초기화 완료');
    return this;
  }

  setSourceType(type) {
    this.sourceType = type;

    document.querySelectorAll('.source-type-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.type === type);
    });

    this.elements.bookFields.style.display = type === 'book' ? 'block' : 'none';
    this.elements.journalFields.style.display = type === 'journal' ? 'block' : 'none';
    this.elements.websiteFields.style.display = type === 'website' ? 'block' : 'none';
  }

  setStyle(style) {
    this.style = style;
    document.querySelectorAll('.style-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.style === style);
    });
  }

  getBookData() {
    return {
      author: this.elements.author.value.trim(),
      year: this.elements.year.value.trim(),
      title: this.elements.title.value.trim(),
      publisher: this.elements.publisher.value.trim(),
      location: this.elements.location.value.trim(),
      edition: this.elements.edition.value.trim()
    };
  }

  getJournalData() {
    return {
      author: this.elements.jAuthor.value.trim(),
      year: this.elements.jYear.value.trim(),
      articleTitle: this.elements.articleTitle.value.trim(),
      journalName: this.elements.journalName.value.trim(),
      volume: this.elements.volume.value.trim(),
      issue: this.elements.issue.value.trim(),
      pages: this.elements.pages.value.trim(),
      doi: this.elements.doi.value.trim()
    };
  }

  getWebsiteData() {
    return {
      author: this.elements.wAuthor.value.trim(),
      pageTitle: this.elements.pageTitle.value.trim(),
      siteName: this.elements.siteName.value.trim(),
      url: this.elements.url.value.trim(),
      publishDate: this.elements.publishDate.value.trim(),
      accessDate: this.elements.accessDate.value.trim()
    };
  }

  generate() {
    let citation = '';
    let inText = '';

    switch (this.sourceType) {
      case 'book':
        const book = this.getBookData();
        if (!book.author || !book.year || !book.title) {
          alert('저자명, 출판연도, 책 제목은 필수입니다.');
          return;
        }
        ({ citation, inText } = this.generateBookCitation(book));
        break;

      case 'journal':
        const journal = this.getJournalData();
        if (!journal.author || !journal.year || !journal.articleTitle || !journal.journalName) {
          alert('저자명, 출판연도, 논문 제목, 학술지명은 필수입니다.');
          return;
        }
        ({ citation, inText } = this.generateJournalCitation(journal));
        break;

      case 'website':
        const website = this.getWebsiteData();
        if (!website.pageTitle || !website.url) {
          alert('페이지 제목, URL은 필수입니다.');
          return;
        }
        ({ citation, inText } = this.generateWebsiteCitation(website));
        break;
    }

    this.elements.resultPanel.style.display = 'block';
    this.elements.citationResult.innerHTML = citation;
    this.elements.inTextResult.textContent = inText;
    this.lastCitation = citation.replace(/<[^>]*>/g, '');
  }

  generateBookCitation(data) {
    let citation = '';
    let inText = '';
    const lastName = data.author.split(' ')[0];

    switch (this.style) {
      case 'apa':
        citation = `${data.author}. (${data.year}). <i>${data.title}</i>${data.edition ? ` (${data.edition})` : ''}.${data.location ? ` ${data.location}:` : ''} ${data.publisher || ''}.`;
        inText = `(${lastName}, ${data.year})`;
        break;

      case 'mla':
        citation = `${data.author}. <i>${data.title}</i>.${data.edition ? ` ${data.edition},` : ''} ${data.publisher || ''}, ${data.year}.`;
        inText = `(${lastName})`;
        break;

      case 'chicago':
        citation = `${data.author}. <i>${data.title}</i>.${data.edition ? ` ${data.edition}.` : ''}${data.location ? ` ${data.location}:` : ''} ${data.publisher || ''}, ${data.year}.`;
        inText = `(${lastName} ${data.year})`;
        break;

      case 'harvard':
        citation = `${data.author} (${data.year}) <i>${data.title}</i>.${data.edition ? ` ${data.edition}.` : ''}${data.location ? ` ${data.location}:` : ''} ${data.publisher || ''}.`;
        inText = `(${lastName}, ${data.year})`;
        break;

      case 'vancouver':
        citation = `${data.author}. ${data.title}.${data.edition ? ` ${data.edition}.` : ''}${data.location ? ` ${data.location}:` : ''} ${data.publisher || ''}; ${data.year}.`;
        inText = `[1]`;
        break;
    }

    return { citation, inText };
  }

  generateJournalCitation(data) {
    let citation = '';
    let inText = '';
    const lastName = data.author.split(' ')[0];

    switch (this.style) {
      case 'apa':
        citation = `${data.author}. (${data.year}). ${data.articleTitle}. <i>${data.journalName}</i>`;
        if (data.volume) citation += `, <i>${data.volume}</i>`;
        if (data.issue) citation += `(${data.issue})`;
        if (data.pages) citation += `, ${data.pages}`;
        citation += '.';
        if (data.doi) citation += ` https://doi.org/${data.doi}`;
        inText = `(${lastName}, ${data.year})`;
        break;

      case 'mla':
        citation = `${data.author}. "${data.articleTitle}." <i>${data.journalName}</i>`;
        if (data.volume) citation += `, vol. ${data.volume}`;
        if (data.issue) citation += `, no. ${data.issue}`;
        citation += `, ${data.year}`;
        if (data.pages) citation += `, pp. ${data.pages}`;
        citation += '.';
        inText = `(${lastName})`;
        break;

      case 'chicago':
        citation = `${data.author}. "${data.articleTitle}." <i>${data.journalName}</i>`;
        if (data.volume) citation += ` ${data.volume}`;
        if (data.issue) citation += `, no. ${data.issue}`;
        citation += ` (${data.year})`;
        if (data.pages) citation += `: ${data.pages}`;
        citation += '.';
        inText = `(${lastName} ${data.year})`;
        break;

      case 'harvard':
        citation = `${data.author} (${data.year}) '${data.articleTitle}', <i>${data.journalName}</i>`;
        if (data.volume) citation += `, ${data.volume}`;
        if (data.issue) citation += `(${data.issue})`;
        if (data.pages) citation += `, pp. ${data.pages}`;
        citation += '.';
        inText = `(${lastName}, ${data.year})`;
        break;

      case 'vancouver':
        citation = `${data.author}. ${data.articleTitle}. ${data.journalName}. ${data.year}`;
        if (data.volume) citation += `;${data.volume}`;
        if (data.issue) citation += `(${data.issue})`;
        if (data.pages) citation += `:${data.pages}`;
        citation += '.';
        inText = `[1]`;
        break;
    }

    return { citation, inText };
  }

  generateWebsiteCitation(data) {
    let citation = '';
    let inText = '';
    const authorPart = data.author || data.siteName || 'n.d.';
    const lastName = data.author ? data.author.split(' ')[0] : (data.siteName || '');
    const year = data.publishDate ? data.publishDate.split('-')[0] : 'n.d.';

    switch (this.style) {
      case 'apa':
        citation = `${authorPart}. (${year}). ${data.pageTitle}.`;
        if (data.siteName && data.author) citation += ` ${data.siteName}.`;
        citation += ` ${data.url}`;
        inText = `(${lastName}, ${year})`;
        break;

      case 'mla':
        if (data.author) citation = `${data.author}. `;
        citation += `"${data.pageTitle}."`;
        if (data.siteName) citation += ` <i>${data.siteName}</i>,`;
        if (data.publishDate) citation += ` ${data.publishDate},`;
        citation += ` ${data.url}.`;
        if (data.accessDate) citation += ` Accessed ${data.accessDate}.`;
        inText = data.author ? `(${lastName})` : `("${data.pageTitle.substring(0, 20)}...")`;
        break;

      case 'chicago':
        if (data.author) citation = `${data.author}. `;
        citation += `"${data.pageTitle}."`;
        if (data.siteName) citation += ` ${data.siteName}.`;
        if (data.publishDate) citation += ` ${data.publishDate}.`;
        citation += ` ${data.url}.`;
        inText = `(${lastName} ${year})`;
        break;

      case 'harvard':
        citation = `${authorPart} (${year}) <i>${data.pageTitle}</i>.`;
        if (data.siteName) citation += ` ${data.siteName}.`;
        citation += ` Available at: ${data.url}`;
        if (data.accessDate) citation += ` (Accessed: ${data.accessDate})`;
        citation += '.';
        inText = `(${lastName}, ${year})`;
        break;

      case 'vancouver':
        if (data.author) citation = `${data.author}. `;
        citation += `${data.pageTitle} [Internet].`;
        if (data.siteName) citation += ` ${data.siteName};`;
        if (data.publishDate) citation += ` ${data.publishDate}`;
        if (data.accessDate) citation += ` [cited ${data.accessDate}]`;
        citation += `. Available from: ${data.url}`;
        inText = `[1]`;
        break;
    }

    return { citation, inText };
  }

  async copy() {
    try {
      await navigator.clipboard.writeText(this.lastCitation);
      this.showToast('인용문이 복사되었습니다', 'success');
    } catch (e) {
      this.showToast('복사 실패', 'error');
    }
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const citationGen = new CitationGen();
window.CitationGen = citationGen;

document.addEventListener('DOMContentLoaded', () => citationGen.init());
