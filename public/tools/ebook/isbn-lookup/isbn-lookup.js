/**
 * ISBN 조회 - ToolBase 기반
 * 도서 정보 검색 및 변환
 * @created 2026-01-13
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var IsbnLookup = class IsbnLookup extends ToolBase {
  constructor() {
    super('IsbnLookup');
    this.convertMode = '10to13';
    this.history = [];
    this.sampleBooks = {
      '9788932919492': {
        title: '참을 수 없는 존재의 가벼움',
        author: '밀란 쿤데라',
        publisher: '민음사',
        date: '2018-05-01',
        pages: 520,
        isbn10: '8932919496',
        isbn13: '9788932919492'
      },
      '9788937460494': {
        title: '어린 왕자',
        author: '생텍쥐페리',
        publisher: '문학동네',
        date: '2007-03-20',
        pages: 160,
        isbn10: '8937460491',
        isbn13: '9788937460494'
      },
      '9788954672214': {
        title: '채식주의자',
        author: '한강',
        publisher: '창비',
        date: '2007-10-30',
        pages: 247,
        isbn10: '8954672213',
        isbn13: '9788954672214'
      }
    };
  }

  init() {
    this.initElements({
      isbnInput: 'isbnInput',
      resultPanel: 'resultPanel',
      bookTitle: 'bookTitle',
      bookAuthor: 'bookAuthor',
      bookPublisher: 'bookPublisher',
      bookDate: 'bookDate',
      bookPages: 'bookPages',
      isbn10: 'isbn10',
      isbn13: 'isbn13',
      searchHistory: 'searchHistory',
      convertInput: 'convertInput',
      convertResult: 'convertResult',
      validateInput: 'validateInput',
      validateResult: 'validateResult'
    });

    this.loadHistory();
    this.renderHistory();

    console.log('[IsbnLookup] 초기화 완료');
    return this;
  }

  loadHistory() {
    try {
      const saved = localStorage.getItem('isbnHistory');
      if (saved) {
        this.history = JSON.parse(saved);
      }
    } catch (e) {}
  }

  saveHistory() {
    localStorage.setItem('isbnHistory', JSON.stringify(this.history));
  }

  cleanIsbn(isbn) {
    return isbn.replace(/[-\s]/g, '');
  }

  search() {
    const isbn = this.cleanIsbn(this.elements.isbnInput.value);

    if (!isbn) {
      alert('ISBN을 입력해주세요.');
      return;
    }

    if (!this.isValidFormat(isbn)) {
      alert('올바른 ISBN 형식이 아닙니다.');
      return;
    }

    // ISBN-10을 ISBN-13으로 변환하여 검색
    const isbn13 = isbn.length === 10 ? this.convertIsbn10to13(isbn) : isbn;

    // 샘플 데이터에서 검색 (실제로는 API 호출)
    const book = this.sampleBooks[isbn13];

    if (book) {
      this.displayResult(book);
      this.addToHistory(isbn, book.title);
    } else {
      // 데모: 가상의 결과 표시
      this.displayResult({
        title: '도서 정보 (API 연동 필요)',
        author: '저자 정보 없음',
        publisher: '-',
        date: '-',
        pages: '-',
        isbn10: isbn.length === 10 ? isbn : this.convertIsbn13to10(isbn),
        isbn13: isbn13
      });
      this.addToHistory(isbn, '검색됨');
    }
  }

  displayResult(book) {
    this.elements.resultPanel.style.display = 'block';
    this.elements.bookTitle.textContent = book.title;
    this.elements.bookAuthor.textContent = book.author;
    this.elements.bookPublisher.textContent = book.publisher;
    this.elements.bookDate.textContent = book.date;
    this.elements.bookPages.textContent = book.pages;
    this.elements.isbn10.textContent = book.isbn10;
    this.elements.isbn13.textContent = book.isbn13;
  }

  addToHistory(isbn, title) {
    // 중복 제거
    this.history = this.history.filter(h => h.isbn !== isbn);

    // 맨 앞에 추가
    this.history.unshift({ isbn, title, date: new Date().toLocaleDateString() });

    // 최대 10개 유지
    this.history = this.history.slice(0, 10);

    this.saveHistory();
    this.renderHistory();
  }

  renderHistory() {
    if (this.history.length === 0) {
      this.elements.searchHistory.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 0.5rem;">검색 기록이 없습니다</div>';
      return;
    }

    this.elements.searchHistory.innerHTML = this.history.map(h => `
      <div class="history-item" onclick="isbnLookup.searchFromHistory('${h.isbn}')">
        <div>
          <div style="font-weight: 500;">${h.isbn}</div>
          <div style="font-size: 0.8rem; color: var(--text-secondary);">${h.title}</div>
        </div>
        <span style="font-size: 0.75rem; color: var(--text-secondary);">${h.date}</span>
      </div>
    `).join('');
  }

  searchFromHistory(isbn) {
    this.elements.isbnInput.value = isbn;
    this.search();
  }

  setConvertMode(mode) {
    this.convertMode = mode;
    document.querySelectorAll('.format-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });
  }

  convert() {
    const isbn = this.cleanIsbn(this.elements.convertInput.value);

    if (!isbn) {
      alert('변환할 ISBN을 입력해주세요.');
      return;
    }

    let result;
    if (this.convertMode === '10to13') {
      if (isbn.length !== 10) {
        alert('ISBN-10은 10자리여야 합니다.');
        return;
      }
      result = this.convertIsbn10to13(isbn);
    } else {
      if (isbn.length !== 13) {
        alert('ISBN-13은 13자리여야 합니다.');
        return;
      }
      result = this.convertIsbn13to10(isbn);
    }

    this.elements.convertResult.style.display = 'block';
    this.elements.convertResult.textContent = this.formatIsbn(result);
  }

  convertIsbn10to13(isbn10) {
    const isbn12 = '978' + isbn10.slice(0, 9);
    const checkDigit = this.calculateIsbn13CheckDigit(isbn12);
    return isbn12 + checkDigit;
  }

  convertIsbn13to10(isbn13) {
    if (!isbn13.startsWith('978')) {
      return 'N/A (978로 시작하는 ISBN만 변환 가능)';
    }
    const isbn9 = isbn13.slice(3, 12);
    const checkDigit = this.calculateIsbn10CheckDigit(isbn9);
    return isbn9 + checkDigit;
  }

  calculateIsbn13CheckDigit(isbn12) {
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(isbn12[i]) * (i % 2 === 0 ? 1 : 3);
    }
    const remainder = sum % 10;
    return remainder === 0 ? '0' : String(10 - remainder);
  }

  calculateIsbn10CheckDigit(isbn9) {
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(isbn9[i]) * (10 - i);
    }
    const remainder = sum % 11;
    const check = 11 - remainder;
    if (check === 10) return 'X';
    if (check === 11) return '0';
    return String(check);
  }

  formatIsbn(isbn) {
    if (isbn.length === 13) {
      return `${isbn.slice(0, 3)}-${isbn.slice(3, 5)}-${isbn.slice(5, 10)}-${isbn.slice(10, 12)}-${isbn.slice(12)}`;
    } else if (isbn.length === 10) {
      return `${isbn.slice(0, 2)}-${isbn.slice(2, 7)}-${isbn.slice(7, 9)}-${isbn.slice(9)}`;
    }
    return isbn;
  }

  validate() {
    const isbn = this.cleanIsbn(this.elements.validateInput.value);

    if (!isbn) {
      alert('검증할 ISBN을 입력해주세요.');
      return;
    }

    this.elements.validateResult.style.display = 'block';

    if (!this.isValidFormat(isbn)) {
      this.elements.validateResult.innerHTML = '<div style="color: #ef4444; padding: 0.5rem; background: #fee2e2; border-radius: 6px;">올바르지 않은 형식 (10자리 또는 13자리여야 함)</div>';
      return;
    }

    const isValid = isbn.length === 10 ? this.validateIsbn10(isbn) : this.validateIsbn13(isbn);

    if (isValid) {
      this.elements.validateResult.innerHTML = `<div style="color: #16a34a; padding: 0.5rem; background: #dcfce7; border-radius: 6px;">유효한 ISBN-${isbn.length}</div>`;
    } else {
      this.elements.validateResult.innerHTML = `<div style="color: #ef4444; padding: 0.5rem; background: #fee2e2; border-radius: 6px;">체크섬 오류 - 유효하지 않은 ISBN</div>`;
    }
  }

  isValidFormat(isbn) {
    if (isbn.length === 10) {
      return /^[0-9]{9}[0-9X]$/.test(isbn);
    } else if (isbn.length === 13) {
      return /^[0-9]{13}$/.test(isbn);
    }
    return false;
  }

  validateIsbn10(isbn) {
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(isbn[i]) * (10 - i);
    }
    const lastChar = isbn[9];
    sum += lastChar === 'X' ? 10 : parseInt(lastChar);
    return sum % 11 === 0;
  }

  validateIsbn13(isbn) {
    let sum = 0;
    for (let i = 0; i < 13; i++) {
      sum += parseInt(isbn[i]) * (i % 2 === 0 ? 1 : 3);
    }
    return sum % 10 === 0;
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const isbnLookup = new IsbnLookup();
window.IsbnLookup = isbnLookup;

document.addEventListener('DOMContentLoaded', () => isbnLookup.init());
