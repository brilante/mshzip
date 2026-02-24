/**
 * 참고문헌 생성기 - ToolBase 기반
 * 참고문헌 목록 관리
 * @created 2026-01-13
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var Bibliography = class Bibliography extends ToolBase {
  constructor() {
    super('Bibliography');
    this.references = [];
    this.style = 'apa';
  }

  init() {
    this.initElements({
      refList: 'refList',
      refCount: 'refCount',
      preview: 'preview',
      refModal: 'refModal',
      modalTitle: 'modalTitle',
      editingIndex: 'editingIndex',
      editingType: 'editingType',
      // 도서 필드
      modalBookFields: 'modalBookFields',
      mAuthor: 'mAuthor',
      mYear: 'mYear',
      mTitle: 'mTitle',
      mPublisher: 'mPublisher',
      mLocation: 'mLocation',
      // 논문 필드
      modalJournalFields: 'modalJournalFields',
      mJAuthor: 'mJAuthor',
      mJYear: 'mJYear',
      mArticleTitle: 'mArticleTitle',
      mJournalName: 'mJournalName',
      mVolIssue: 'mVolIssue',
      // 웹사이트 필드
      modalWebsiteFields: 'modalWebsiteFields',
      mWAuthor: 'mWAuthor',
      mPageTitle: 'mPageTitle',
      mSiteName: 'mSiteName',
      mUrl: 'mUrl',
      mAccessDate: 'mAccessDate',
      // 옵션
      sortAlpha: 'sortAlpha',
      hangingIndent: 'hangingIndent'
    });

    this.loadData();
    this.render();
    this.renderPreview();

    console.log('[Bibliography] 초기화 완료');
    return this;
  }

  loadData() {
    try {
      const saved = localStorage.getItem('bibliographyData');
      if (saved) {
        this.references = JSON.parse(saved);
      }
    } catch (e) {}
  }

  saveData() {
    localStorage.setItem('bibliographyData', JSON.stringify(this.references));
  }

  setStyle(style) {
    this.style = style;
    document.querySelectorAll('.style-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.style === style);
    });
    this.renderPreview();
  }

  openModal(type, index = -1) {
    this.elements.editingIndex.value = index;
    this.elements.editingType.value = type;

    const titles = { book: '도서', journal: '논문', website: '웹사이트' };
    this.elements.modalTitle.textContent = `${titles[type]} ${index >= 0 ? '편집' : '추가'}`;

    // 필드 표시/숨김
    this.elements.modalBookFields.style.display = type === 'book' ? 'block' : 'none';
    this.elements.modalJournalFields.style.display = type === 'journal' ? 'block' : 'none';
    this.elements.modalWebsiteFields.style.display = type === 'website' ? 'block' : 'none';

    // 편집 모드면 데이터 채우기
    if (index >= 0) {
      const ref = this.references[index];
      if (type === 'book') {
        this.elements.mAuthor.value = ref.author || '';
        this.elements.mYear.value = ref.year || '';
        this.elements.mTitle.value = ref.title || '';
        this.elements.mPublisher.value = ref.publisher || '';
        this.elements.mLocation.value = ref.location || '';
      } else if (type === 'journal') {
        this.elements.mJAuthor.value = ref.author || '';
        this.elements.mJYear.value = ref.year || '';
        this.elements.mArticleTitle.value = ref.articleTitle || '';
        this.elements.mJournalName.value = ref.journalName || '';
        this.elements.mVolIssue.value = ref.volIssue || '';
      } else if (type === 'website') {
        this.elements.mWAuthor.value = ref.author || '';
        this.elements.mPageTitle.value = ref.pageTitle || '';
        this.elements.mSiteName.value = ref.siteName || '';
        this.elements.mUrl.value = ref.url || '';
        this.elements.mAccessDate.value = ref.accessDate || '';
      }
    } else {
      // 폼 초기화
      document.querySelectorAll('.modal-content input[type="text"]').forEach(input => input.value = '');
    }

    this.elements.refModal.classList.add('active');
  }

  closeModal() {
    this.elements.refModal.classList.remove('active');
  }

  saveRef() {
    const type = this.elements.editingType.value;
    const index = parseInt(this.elements.editingIndex.value);

    let ref = { type };

    if (type === 'book') {
      ref.author = this.elements.mAuthor.value.trim();
      ref.year = this.elements.mYear.value.trim();
      ref.title = this.elements.mTitle.value.trim();
      ref.publisher = this.elements.mPublisher.value.trim();
      ref.location = this.elements.mLocation.value.trim();

      if (!ref.author || !ref.year || !ref.title) {
        alert('저자명, 출판연도, 책 제목은 필수입니다.');
        return;
      }
    } else if (type === 'journal') {
      ref.author = this.elements.mJAuthor.value.trim();
      ref.year = this.elements.mJYear.value.trim();
      ref.articleTitle = this.elements.mArticleTitle.value.trim();
      ref.journalName = this.elements.mJournalName.value.trim();
      ref.volIssue = this.elements.mVolIssue.value.trim();

      if (!ref.author || !ref.year || !ref.articleTitle || !ref.journalName) {
        alert('저자명, 출판연도, 논문 제목, 학술지명은 필수입니다.');
        return;
      }
    } else if (type === 'website') {
      ref.author = this.elements.mWAuthor.value.trim();
      ref.pageTitle = this.elements.mPageTitle.value.trim();
      ref.siteName = this.elements.mSiteName.value.trim();
      ref.url = this.elements.mUrl.value.trim();
      ref.accessDate = this.elements.mAccessDate.value.trim();

      if (!ref.pageTitle || !ref.url) {
        alert('페이지 제목, URL은 필수입니다.');
        return;
      }
    }

    if (index >= 0) {
      this.references[index] = ref;
    } else {
      this.references.push(ref);
    }

    this.saveData();
    this.render();
    this.renderPreview();
    this.closeModal();
  }

  deleteRef(index) {
    if (!confirm('이 참고문헌을 삭제하시겠습니까?')) return;
    this.references.splice(index, 1);
    this.saveData();
    this.render();
    this.renderPreview();
  }

  clearAll() {
    if (!confirm('모든 참고문헌을 삭제하시겠습니까?')) return;
    this.references = [];
    this.saveData();
    this.render();
    this.renderPreview();
  }

  formatReference(ref) {
    if (ref.type === 'book') {
      switch (this.style) {
        case 'apa':
          return `${ref.author}. (${ref.year}). ${ref.title}.${ref.location ? ` ${ref.location}:` : ''} ${ref.publisher || ''}.`;
        case 'mla':
          return `${ref.author}. ${ref.title}. ${ref.publisher || ''}, ${ref.year}.`;
        case 'chicago':
          return `${ref.author}. ${ref.title}.${ref.location ? ` ${ref.location}:` : ''} ${ref.publisher || ''}, ${ref.year}.`;
        case 'harvard':
          return `${ref.author} (${ref.year}) ${ref.title}.${ref.location ? ` ${ref.location}:` : ''} ${ref.publisher || ''}.`;
      }
    } else if (ref.type === 'journal') {
      switch (this.style) {
        case 'apa':
          return `${ref.author}. (${ref.year}). ${ref.articleTitle}. ${ref.journalName}${ref.volIssue ? `, ${ref.volIssue}` : ''}.`;
        case 'mla':
          return `${ref.author}. "${ref.articleTitle}." ${ref.journalName}${ref.volIssue ? `, ${ref.volIssue}` : ''}, ${ref.year}.`;
        case 'chicago':
          return `${ref.author}. "${ref.articleTitle}." ${ref.journalName}${ref.volIssue ? ` ${ref.volIssue}` : ''} (${ref.year}).`;
        case 'harvard':
          return `${ref.author} (${ref.year}) '${ref.articleTitle}', ${ref.journalName}${ref.volIssue ? `, ${ref.volIssue}` : ''}.`;
      }
    } else if (ref.type === 'website') {
      const author = ref.author || ref.siteName || 'n.d.';
      const year = ref.accessDate ? ref.accessDate.split('-')[0] : 'n.d.';
      switch (this.style) {
        case 'apa':
          return `${author}. (${year}). ${ref.pageTitle}. ${ref.url}`;
        case 'mla':
          return `${ref.author ? ref.author + '. ' : ''}"${ref.pageTitle}."${ref.siteName ? ` ${ref.siteName},` : ''} ${ref.url}.${ref.accessDate ? ` Accessed ${ref.accessDate}.` : ''}`;
        case 'chicago':
          return `${ref.author ? ref.author + '. ' : ''}"${ref.pageTitle}."${ref.siteName ? ` ${ref.siteName}.` : ''} ${ref.url}.`;
        case 'harvard':
          return `${author} (${year}) ${ref.pageTitle}. Available at: ${ref.url}${ref.accessDate ? ` (Accessed: ${ref.accessDate})` : ''}.`;
      }
    }
    return '';
  }

  render() {
    this.elements.refCount.textContent = `${this.references.length}개`;

    if (this.references.length === 0) {
      this.elements.refList.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 2rem;">참고문헌을 추가해주세요</div>';
      return;
    }

    const icons = { book: '', journal: '', website: '' };

    this.elements.refList.innerHTML = this.references.map((ref, index) => `
      <div class="ref-item">
        <div class="ref-item-num">${icons[ref.type]}</div>
        <div class="ref-item-content">${this.formatReference(ref)}</div>
        <div class="ref-item-actions">
          <button class="btn-edit" onclick="bibliography.openModal('${ref.type}', ${index})">편집</button>
          <button class="btn-delete" onclick="bibliography.deleteRef(${index})">삭제</button>
        </div>
      </div>
    `).join('');
  }

  renderPreview() {
    if (this.references.length === 0) {
      this.elements.preview.textContent = '참고문헌을 추가하면 미리보기가 표시됩니다.';
      return;
    }

    let refs = [...this.references];

    // 알파벳순 정렬
    if (this.elements.sortAlpha.checked) {
      refs.sort((a, b) => {
        const aName = a.author || a.pageTitle || '';
        const bName = b.author || b.pageTitle || '';
        return aName.localeCompare(bName);
      });
    }

    const hangingIndent = this.elements.hangingIndent.checked;
    const formatted = refs.map(ref => this.formatReference(ref));

    if (hangingIndent) {
      this.elements.preview.style.textIndent = '-2em';
      this.elements.preview.style.paddingLeft = '2em';
    } else {
      this.elements.preview.style.textIndent = '0';
      this.elements.preview.style.paddingLeft = '0';
    }

    this.elements.preview.textContent = formatted.join('\n\n');
  }

  async copy() {
    try {
      await navigator.clipboard.writeText(this.elements.preview.textContent);
      this.showToast('참고문헌이 복사되었습니다', 'success');
    } catch (e) {
      this.showToast('복사 실패', 'error');
    }
  }

  exportTxt() {
    const blob = new Blob([this.elements.preview.textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = 'bibliography.txt';
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  }

  exportBib() {
    let bib = '';

    this.references.forEach((ref, index) => {
      const key = `ref${index + 1}`;

      if (ref.type === 'book') {
        bib += `@book{${key},\n`;
        bib += `  author = {${ref.author}},\n`;
        bib += `  title = {${ref.title}},\n`;
        bib += `  year = {${ref.year}},\n`;
        if (ref.publisher) bib += `  publisher = {${ref.publisher}},\n`;
        if (ref.location) bib += `  address = {${ref.location}},\n`;
        bib += `}\n\n`;
      } else if (ref.type === 'journal') {
        bib += `@article{${key},\n`;
        bib += `  author = {${ref.author}},\n`;
        bib += `  title = {${ref.articleTitle}},\n`;
        bib += `  journal = {${ref.journalName}},\n`;
        bib += `  year = {${ref.year}},\n`;
        if (ref.volIssue) bib += `  note = {${ref.volIssue}},\n`;
        bib += `}\n\n`;
      } else if (ref.type === 'website') {
        bib += `@misc{${key},\n`;
        if (ref.author) bib += `  author = {${ref.author}},\n`;
        bib += `  title = {${ref.pageTitle}},\n`;
        bib += `  url = {${ref.url}},\n`;
        if (ref.accessDate) bib += `  note = {Accessed: ${ref.accessDate}},\n`;
        bib += `}\n\n`;
      }
    });

    const blob = new Blob([bib], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = 'bibliography.bib';
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  }

  importBib() {
    alert('BibTeX 가져오기 기능은 별도의 파서가 필요합니다.\n현재 버전에서는 수동으로 추가해주세요.');
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const bibliography = new Bibliography();
window.Bibliography = bibliography;

document.addEventListener('DOMContentLoaded', () => bibliography.init());
