/**
 * 빙고 생성기 - ToolBase 기반
 * 커스텀 빙고판 생성 및 플레이
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class BingoGenerator extends ToolBase {
  constructor() {
    super('BingoGenerator');
    this.gridSize = 5;
    this.mode = 'numbers';
    this.board = [];
    this.marked = new Set();
    this.calledNumbers = [];
    this.numberPool = [];
    this.bingoCount = 0;
  }

  init() {
    this.initElements({
      gridSize: 'gridSize',
      freeCenter: 'freeCenter',
      minNum: 'minNum',
      maxNum: 'maxNum',
      customItems: 'customItems',
      numbersOptions: 'numbersOptions',
      customOptions: 'customOptions',
      callSection: 'callSection',
      generateBtn: 'generateBtn',
      resetBtn: 'resetBtn',
      printBtn: 'printBtn',
      newCardBtn: 'newCardBtn',
      callBtn: 'callBtn',
      bingoBoard: 'bingoBoard',
      bingoStatus: 'bingoStatus',
      calledNumber: 'calledNumber',
      calledHistory: 'calledHistory'
    });

    this.setupEvents();

    console.log('[BingoGenerator] 초기화 완료');
    return this;
  }

  setupEvents() {
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.mode = e.target.dataset.mode;

        this.elements.numbersOptions.style.display =
          this.mode === 'numbers' ? 'block' : 'none';
        this.elements.customOptions.style.display =
          this.mode === 'custom' ? 'block' : 'none';
        this.elements.callSection.style.display =
          this.mode === 'numbers' ? 'block' : 'none';
      });
    });

    this.elements.gridSize.addEventListener('change', (e) => {
      this.gridSize = parseInt(e.target.value);
    });

    this.elements.generateBtn.addEventListener('click', () => this.generate());
    this.elements.resetBtn.addEventListener('click', () => this.resetMarks());
    this.elements.printBtn.addEventListener('click', () => window.print());
    this.elements.newCardBtn.addEventListener('click', () => this.generate());
    this.elements.callBtn.addEventListener('click', () => this.callNumber());
  }

  generate() {
    this.gridSize = parseInt(this.elements.gridSize.value);
    const freeCenter = this.elements.freeCenter.checked;
    const totalCells = this.gridSize * this.gridSize;

    let items = [];

    if (this.mode === 'numbers') {
      const min = parseInt(this.elements.minNum.value) || 1;
      const max = parseInt(this.elements.maxNum.value) || 75;

      for (let i = min; i <= max; i++) {
        items.push(i.toString());
      }

      // 호출용 숫자 풀 설정
      this.numberPool = [...items].sort(() => Math.random() - 0.5);
      this.calledNumbers = [];
      this.elements.calledHistory.innerHTML = '';
      this.elements.calledNumber.textContent = '-';
      this.elements.callSection.style.display = 'block';
    } else {
      const customText = this.elements.customItems.value.trim();
      items = customText.split('\n').map(s => s.trim()).filter(s => s);
      this.elements.callSection.style.display = 'none';
    }

    if (items.length < totalCells - (freeCenter ? 1 : 0)) {
      alert(`항목이 부족합니다. 최소 ${totalCells - (freeCenter ? 1 : 0)}개 필요합니다.`);
      return;
    }

    // 셔플 및 보드 생성
    const shuffled = [...items].sort(() => Math.random() - 0.5);
    this.board = [];
    this.marked = new Set();
    this.bingoCount = 0;

    let itemIndex = 0;
    for (let i = 0; i < totalCells; i++) {
      const row = Math.floor(i / this.gridSize);
      const col = i % this.gridSize;
      const isCenter = freeCenter &&
        this.gridSize % 2 === 1 &&
        row === Math.floor(this.gridSize / 2) &&
        col === Math.floor(this.gridSize / 2);

      if (isCenter) {
        this.board.push({ value: 'FREE', free: true });
        this.marked.add(i);
      } else {
        this.board.push({ value: shuffled[itemIndex++], free: false });
      }
    }

    this.renderBoard();
    this.elements.bingoStatus.textContent = '';
  }

  renderBoard() {
    this.elements.bingoBoard.style.gridTemplateColumns = `repeat(${this.gridSize}, 1fr)`;

    this.elements.bingoBoard.innerHTML = this.board.map((cell, i) => {
      const classes = ['bingo-cell'];
      if (cell.free) classes.push('free', 'marked');
      else if (this.marked.has(i)) classes.push('marked');

      return `<div class="${classes.join(' ')}" data-index="${i}">${this.escapeHtml(cell.value)}</div>`;
    }).join('');

    // 클릭 이벤트
    this.elements.bingoBoard.querySelectorAll('.bingo-cell:not(.free)').forEach(cell => {
      cell.addEventListener('click', () => this.toggleMark(parseInt(cell.dataset.index)));
    });
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  toggleMark(index) {
    if (this.marked.has(index)) {
      this.marked.delete(index);
    } else {
      this.marked.add(index);
    }
    this.renderBoard();
    this.checkBingo();
  }

  checkBingo() {
    const size = this.gridSize;
    let bingoLines = [];

    // 가로 체크
    for (let row = 0; row < size; row++) {
      const line = [];
      let complete = true;
      for (let col = 0; col < size; col++) {
        const idx = row * size + col;
        line.push(idx);
        if (!this.marked.has(idx)) complete = false;
      }
      if (complete) bingoLines.push(line);
    }

    // 세로 체크
    for (let col = 0; col < size; col++) {
      const line = [];
      let complete = true;
      for (let row = 0; row < size; row++) {
        const idx = row * size + col;
        line.push(idx);
        if (!this.marked.has(idx)) complete = false;
      }
      if (complete) bingoLines.push(line);
    }

    // 대각선 체크
    let diag1 = [], diag2 = [];
    let diag1Complete = true, diag2Complete = true;
    for (let i = 0; i < size; i++) {
      const idx1 = i * size + i;
      const idx2 = i * size + (size - 1 - i);
      diag1.push(idx1);
      diag2.push(idx2);
      if (!this.marked.has(idx1)) diag1Complete = false;
      if (!this.marked.has(idx2)) diag2Complete = false;
    }
    if (diag1Complete) bingoLines.push(diag1);
    if (diag2Complete) bingoLines.push(diag2);

    // 빙고 표시
    document.querySelectorAll('.bingo-cell').forEach(cell => {
      cell.classList.remove('bingo-line');
    });

    if (bingoLines.length > 0) {
      bingoLines.flat().forEach(idx => {
        document.querySelector(`.bingo-cell[data-index="${idx}"]`).classList.add('bingo-line');
      });

      if (bingoLines.length !== this.bingoCount) {
        this.bingoCount = bingoLines.length;
        this.elements.bingoStatus.textContent = `BINGO! (${bingoLines.length}줄)`;
      }
    } else {
      this.bingoCount = 0;
      this.elements.bingoStatus.textContent = '';
    }
  }

  resetMarks() {
    this.board.forEach((cell, i) => {
      if (!cell.free) {
        this.marked.delete(i);
      }
    });
    this.bingoCount = 0;
    this.renderBoard();
    this.elements.bingoStatus.textContent = '';
  }

  callNumber() {
    if (this.numberPool.length === 0) {
      this.elements.calledNumber.textContent = '끝!';
      return;
    }

    const num = this.numberPool.pop();
    this.calledNumbers.push(num);

    this.elements.calledNumber.textContent = num;

    this.elements.calledHistory.innerHTML = this.calledNumbers.map(n =>
      `<span class="called">${n}</span>`
    ).join('');

    // 보드에서 자동 마킹
    this.board.forEach((cell, i) => {
      if (cell.value === num) {
        this.marked.add(i);
      }
    });
    this.renderBoard();
    this.checkBingo();
  }
}

// 전역 인스턴스 생성
const bingo = new BingoGenerator();
window.BingoGenerator = bingo;

document.addEventListener('DOMContentLoaded', () => bingo.init());
