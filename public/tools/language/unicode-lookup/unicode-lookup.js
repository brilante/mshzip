/**
 * 유니코드 조회 - ToolBase 기반
 * 문자 ↔ 유니코드 코드포인트 조회
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class UnicodeLookup extends ToolBase {
  constructor() {
    super('UnicodeLookup');
  }

  init() {
    this.initElements({
      charInput: 'charInput',
      codeInput: 'codeInput',
      charResults: 'charResults',
      charTab: 'charTab',
      codeTab: 'codeTab',
      blockSelect: 'blockSelect',
      blockChars: 'blockChars'
    });

    this.elements.charInput.addEventListener('input', () => this.analyzeChars());
    this.analyzeChars();

    console.log('[UnicodeLookup] 초기화 완료');
    return this;
  }

  switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.textContent.includes(tab === 'char' ? '문자' : '코드'));
    });
    this.elements.charTab.classList.toggle('hidden', tab !== 'char');
    this.elements.codeTab.classList.toggle('hidden', tab !== 'code');
  }

  getCharInfo(char) {
    const codePoint = char.codePointAt(0);
    return {
      char: char,
      decimal: codePoint,
      hex: codePoint.toString(16).toUpperCase().padStart(4, '0'),
      unicode: 'U+' + codePoint.toString(16).toUpperCase().padStart(4, '0'),
      html: '&#' + codePoint + ';',
      htmlHex: '&#x' + codePoint.toString(16).toUpperCase() + ';',
      utf8: encodeURIComponent(char),
      name: this.getCharName(codePoint)
    };
  }

  getCharName(codePoint) {
    if (codePoint >= 0xAC00 && codePoint <= 0xD7AF) return '한글 음절';
    if (codePoint >= 0x3040 && codePoint <= 0x309F) return '히라가나';
    if (codePoint >= 0x30A0 && codePoint <= 0x30FF) return '가타카나';
    if (codePoint >= 0x4E00 && codePoint <= 0x9FFF) return 'CJK 통합 한자';
    if (codePoint >= 0x1F600 && codePoint <= 0x1F64F) return '이모티콘';
    if (codePoint >= 0x0041 && codePoint <= 0x005A) return 'Latin Capital Letter';
    if (codePoint >= 0x0061 && codePoint <= 0x007A) return 'Latin Small Letter';
    if (codePoint >= 0x0030 && codePoint <= 0x0039) return 'Digit';
    return 'Character';
  }

  escapeHtml(text) {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  renderCharCard(info) {
    return '<div class="char-card">' +
      '<div class="char-display">' + info.char + '</div>' +
      '<div class="char-info">' +
      '<div class="info-row"><span class="info-label">Unicode</span><span class="info-value">' + info.unicode + '</span></div>' +
      '<div class="info-row"><span class="info-label">Decimal</span><span class="info-value">' + info.decimal + '</span></div>' +
      '<div class="info-row"><span class="info-label">Hex</span><span class="info-value">0x' + info.hex + '</span></div>' +
      '<div class="info-row"><span class="info-label">HTML</span><span class="info-value">' + this.escapeHtml(info.html) + '</span></div>' +
      '<div class="info-row"><span class="info-label">UTF-8</span><span class="info-value">' + info.utf8 + '</span></div>' +
      '<div class="info-row"><span class="info-label">Category</span><span class="info-value">' + info.name + '</span></div>' +
      '</div>' +
      '<div class="copy-code">' +
      '<button class="copy-btn" data-value="' + info.char + '">문자 복사</button>' +
      '<button class="copy-btn" data-value="' + info.unicode + '">Unicode</button>' +
      '<button class="copy-btn" data-value="' + info.html + '">HTML</button>' +
      '<button class="copy-btn" data-value="' + info.htmlHex + '">HTML Hex</button>' +
      '</div>' +
      '</div>';
  }

  copy(text) {
    this.copyToClipboard(text);
    this.showToast('복사되었습니다: ' + text, 'success');
  }

  analyzeChars() {
    const input = this.elements.charInput.value;

    if (!input) {
      this.elements.charResults.innerHTML = '<div style="color:#888;text-align:center;width:100%">문자를 입력하세요</div>';
      return;
    }

    const chars = [...input];
    this.elements.charResults.innerHTML = chars.map(char => this.renderCharCard(this.getCharInfo(char))).join('');

    this.elements.charResults.querySelectorAll('.copy-btn').forEach(btn => {
      btn.addEventListener('click', () => this.copy(btn.dataset.value));
    });
  }

  searchByCode() {
    const input = this.elements.codeInput.value.trim();

    let codePoint;

    if (input.match(/^U\+[0-9A-Fa-f]+$/i)) {
      codePoint = parseInt(input.substring(2), 16);
    } else if (input.match(/^0x[0-9A-Fa-f]+$/i)) {
      codePoint = parseInt(input, 16);
    } else if (input.match(/^[0-9]+$/)) {
      codePoint = parseInt(input, 10);
    } else {
      this.elements.charResults.innerHTML = '<div style="color:#e74c3c;text-align:center;width:100%">올바른 형식이 아닙니다</div>';
      return;
    }

    if (codePoint < 0 || codePoint > 0x10FFFF) {
      this.elements.charResults.innerHTML = '<div style="color:#e74c3c;text-align:center;width:100%">유효하지 않은 코드 포인트입니다</div>';
      return;
    }

    const char = String.fromCodePoint(codePoint);
    this.elements.charResults.innerHTML = this.renderCharCard(this.getCharInfo(char));

    this.elements.charResults.querySelectorAll('.copy-btn').forEach(btn => {
      btn.addEventListener('click', () => this.copy(btn.dataset.value));
    });
  }

  loadBlock() {
    const range = this.elements.blockSelect.value;

    if (!range) {
      this.elements.blockChars.innerHTML = '';
      return;
    }

    const [start, end] = range.split('-').map(h => parseInt(h, 16));
    const limit = Math.min(end, start + 255);

    let html = '';
    for (let i = start; i <= limit; i++) {
      try {
        const char = String.fromCodePoint(i);
        html += '<div class="block-char" data-char="' + char.replace(/"/g, '&quot;') + '" title="U+' + i.toString(16).toUpperCase().padStart(4, '0') + '">' + char + '</div>';
      } catch (e) {}
    }

    this.elements.blockChars.innerHTML = html;

    this.elements.blockChars.querySelectorAll('.block-char').forEach(item => {
      item.addEventListener('click', () => this.selectChar(item.dataset.char));
    });
  }

  selectChar(char) {
    this.elements.charInput.value = char;
    this.switchTab('char');
    this.analyzeChars();
  }
}

// 전역 인스턴스 생성
const unicodeLookup = new UnicodeLookup();
window.UnicodeLookup = unicodeLookup;

// 전역 함수 (HTML onclick 호환)
function switchTab(tab) { unicodeLookup.switchTab(tab); }
function analyzeChars() { unicodeLookup.analyzeChars(); }
function searchByCode() { unicodeLookup.searchByCode(); }
function loadBlock() { unicodeLookup.loadBlock(); }
function copy(text) { unicodeLookup.copy(text); }

document.addEventListener('DOMContentLoaded', () => unicodeLookup.init());
