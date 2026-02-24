/**
 * 주기율표 - ToolBase 기반
 * 원소 정보 조회
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class PeriodicTable extends ToolBase {
  constructor() {
    super('PeriodicTable');

    this.elements = [
      // Period 1
      { number: 1, symbol: 'H', name: '수소', mass: '1.008', category: 'nonmetal', config: '1s¹', discovery: '1766년', row: 1, col: 1 },
      { number: 2, symbol: 'He', name: '헬륨', mass: '4.003', category: 'noble', config: '1s²', discovery: '1868년', row: 1, col: 18 },
      // Period 2
      { number: 3, symbol: 'Li', name: '리튬', mass: '6.941', category: 'alkali', config: '[He]2s¹', discovery: '1817년', row: 2, col: 1 },
      { number: 4, symbol: 'Be', name: '베릴륨', mass: '9.012', category: 'alkaline', config: '[He]2s²', discovery: '1798년', row: 2, col: 2 },
      { number: 5, symbol: 'B', name: '붕소', mass: '10.81', category: 'metalloid', config: '[He]2s²2p¹', discovery: '1808년', row: 2, col: 13 },
      { number: 6, symbol: 'C', name: '탄소', mass: '12.01', category: 'nonmetal', config: '[He]2s²2p²', discovery: '고대', row: 2, col: 14 },
      { number: 7, symbol: 'N', name: '질소', mass: '14.01', category: 'nonmetal', config: '[He]2s²2p³', discovery: '1772년', row: 2, col: 15 },
      { number: 8, symbol: 'O', name: '산소', mass: '16.00', category: 'nonmetal', config: '[He]2s²2p⁴', discovery: '1774년', row: 2, col: 16 },
      { number: 9, symbol: 'F', name: '플루오린', mass: '19.00', category: 'halogen', config: '[He]2s²2p⁵', discovery: '1886년', row: 2, col: 17 },
      { number: 10, symbol: 'Ne', name: '네온', mass: '20.18', category: 'noble', config: '[He]2s²2p⁶', discovery: '1898년', row: 2, col: 18 },
      // Period 3
      { number: 11, symbol: 'Na', name: '나트륨', mass: '22.99', category: 'alkali', config: '[Ne]3s¹', discovery: '1807년', row: 3, col: 1 },
      { number: 12, symbol: 'Mg', name: '마그네슘', mass: '24.31', category: 'alkaline', config: '[Ne]3s²', discovery: '1755년', row: 3, col: 2 },
      { number: 13, symbol: 'Al', name: '알루미늄', mass: '26.98', category: 'post-transition', config: '[Ne]3s²3p¹', discovery: '1825년', row: 3, col: 13 },
      { number: 14, symbol: 'Si', name: '규소', mass: '28.09', category: 'metalloid', config: '[Ne]3s²3p²', discovery: '1824년', row: 3, col: 14 },
      { number: 15, symbol: 'P', name: '인', mass: '30.97', category: 'nonmetal', config: '[Ne]3s²3p³', discovery: '1669년', row: 3, col: 15 },
      { number: 16, symbol: 'S', name: '황', mass: '32.07', category: 'nonmetal', config: '[Ne]3s²3p⁴', discovery: '고대', row: 3, col: 16 },
      { number: 17, symbol: 'Cl', name: '염소', mass: '35.45', category: 'halogen', config: '[Ne]3s²3p⁵', discovery: '1774년', row: 3, col: 17 },
      { number: 18, symbol: 'Ar', name: '아르곤', mass: '39.95', category: 'noble', config: '[Ne]3s²3p⁶', discovery: '1894년', row: 3, col: 18 },
      // Period 4
      { number: 19, symbol: 'K', name: '칼륨', mass: '39.10', category: 'alkali', config: '[Ar]4s¹', discovery: '1807년', row: 4, col: 1 },
      { number: 20, symbol: 'Ca', name: '칼슘', mass: '40.08', category: 'alkaline', config: '[Ar]4s²', discovery: '1808년', row: 4, col: 2 },
      { number: 21, symbol: 'Sc', name: '스칸듐', mass: '44.96', category: 'transition', config: '[Ar]3d¹4s²', discovery: '1879년', row: 4, col: 3 },
      { number: 22, symbol: 'Ti', name: '타이타늄', mass: '47.87', category: 'transition', config: '[Ar]3d²4s²', discovery: '1791년', row: 4, col: 4 },
      { number: 23, symbol: 'V', name: '바나듐', mass: '50.94', category: 'transition', config: '[Ar]3d³4s²', discovery: '1801년', row: 4, col: 5 },
      { number: 24, symbol: 'Cr', name: '크로뮴', mass: '52.00', category: 'transition', config: '[Ar]3d⁵4s¹', discovery: '1797년', row: 4, col: 6 },
      { number: 25, symbol: 'Mn', name: '망가니즈', mass: '54.94', category: 'transition', config: '[Ar]3d⁵4s²', discovery: '1774년', row: 4, col: 7 },
      { number: 26, symbol: 'Fe', name: '철', mass: '55.85', category: 'transition', config: '[Ar]3d⁶4s²', discovery: '고대', row: 4, col: 8 },
      { number: 27, symbol: 'Co', name: '코발트', mass: '58.93', category: 'transition', config: '[Ar]3d⁷4s²', discovery: '1735년', row: 4, col: 9 },
      { number: 28, symbol: 'Ni', name: '니켈', mass: '58.69', category: 'transition', config: '[Ar]3d⁸4s²', discovery: '1751년', row: 4, col: 10 },
      { number: 29, symbol: 'Cu', name: '구리', mass: '63.55', category: 'transition', config: '[Ar]3d¹⁰4s¹', discovery: '고대', row: 4, col: 11 },
      { number: 30, symbol: 'Zn', name: '아연', mass: '65.38', category: 'transition', config: '[Ar]3d¹⁰4s²', discovery: '고대', row: 4, col: 12 },
      { number: 31, symbol: 'Ga', name: '갈륨', mass: '69.72', category: 'post-transition', config: '[Ar]3d¹⁰4s²4p¹', discovery: '1875년', row: 4, col: 13 },
      { number: 32, symbol: 'Ge', name: '저마늄', mass: '72.63', category: 'metalloid', config: '[Ar]3d¹⁰4s²4p²', discovery: '1886년', row: 4, col: 14 },
      { number: 33, symbol: 'As', name: '비소', mass: '74.92', category: 'metalloid', config: '[Ar]3d¹⁰4s²4p³', discovery: '고대', row: 4, col: 15 },
      { number: 34, symbol: 'Se', name: '셀레늄', mass: '78.97', category: 'nonmetal', config: '[Ar]3d¹⁰4s²4p⁴', discovery: '1817년', row: 4, col: 16 },
      { number: 35, symbol: 'Br', name: '브로민', mass: '79.90', category: 'halogen', config: '[Ar]3d¹⁰4s²4p⁵', discovery: '1826년', row: 4, col: 17 },
      { number: 36, symbol: 'Kr', name: '크립톤', mass: '83.80', category: 'noble', config: '[Ar]3d¹⁰4s²4p⁶', discovery: '1898년', row: 4, col: 18 }
    ];

    this.categoryNames = {
      alkali: '알칼리 금속',
      alkaline: '알칼리 토금속',
      transition: '전이 금속',
      'post-transition': '전이후 금속',
      metalloid: '준금속',
      nonmetal: '비금속',
      halogen: '할로겐',
      noble: '비활성 기체'
    };
  }

  init() {
    this.initElements({
      periodicTable: 'periodicTable',
      elementModal: 'elementModal',
      modalSymbol: 'modalSymbol',
      modalName: 'modalName',
      modalNumber: 'modalNumber',
      modalMass: 'modalMass',
      modalConfig: 'modalConfig',
      modalCategory: 'modalCategory',
      modalDiscovery: 'modalDiscovery'
    });

    this.renderTable();
    this.setupEvents();

    console.log('[PeriodicTable] 초기화 완료');
    return this;
  }

  setupEvents() {
    this.domElements.elementModal.addEventListener('click', (e) => {
      if (e.target.id === 'elementModal') this.closeModal();
    });
  }

  renderTable() {
    const grid = [];

    for (let row = 1; row <= 7; row++) {
      for (let col = 1; col <= 18; col++) {
        const element = this.elements.find(e => e.row === row && e.col === col);
        if (element) {
          grid.push(`
            <div class="element ${element.category}" onclick="periodicTable.showElement(${element.number})">
              <span class="number">${element.number}</span>
              <span class="symbol">${element.symbol}</span>
              <span class="name">${element.name}</span>
            </div>
          `);
        } else {
          grid.push('<div class="element empty"></div>');
        }
      }
    }

    this.domElements.periodicTable.innerHTML = grid.join('');
  }

  showElement(number) {
    const el = this.elements.find(e => e.number === number);
    if (!el) return;

    this.domElements.modalSymbol.textContent = el.symbol;
    this.domElements.modalName.textContent = el.name;
    this.domElements.modalNumber.textContent = el.number;
    this.domElements.modalMass.textContent = el.mass;
    this.domElements.modalConfig.textContent = el.config;
    this.domElements.modalCategory.textContent = this.categoryNames[el.category];
    this.domElements.modalDiscovery.textContent = el.discovery;

    this.domElements.elementModal.classList.remove('hidden');
  }

  closeModal() {
    this.domElements.elementModal.classList.add('hidden');
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const periodicTable = new PeriodicTable();
window.PeriodicTable = periodicTable;

document.addEventListener('DOMContentLoaded', () => periodicTable.init());
