/**
 * NATO 음성 알파벳 변환기 - ToolBase 기반
 * 텍스트를 NATO 음성 알파벳으로 변환
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class NatoAlphabet extends ToolBase {
  constructor() {
    super('NatoAlphabet');

    this.alphabet = {
      'A': { word: 'Alpha', phonetic: 'AL-FAH' },
      'B': { word: 'Bravo', phonetic: 'BRAH-VOH' },
      'C': { word: 'Charlie', phonetic: 'CHAR-LEE' },
      'D': { word: 'Delta', phonetic: 'DELL-TAH' },
      'E': { word: 'Echo', phonetic: 'ECK-OH' },
      'F': { word: 'Foxtrot', phonetic: 'FOKS-TROT' },
      'G': { word: 'Golf', phonetic: 'GOLF' },
      'H': { word: 'Hotel', phonetic: 'HOH-TEL' },
      'I': { word: 'India', phonetic: 'IN-DEE-AH' },
      'J': { word: 'Juliet', phonetic: 'JEW-LEE-ETT' },
      'K': { word: 'Kilo', phonetic: 'KEY-LOH' },
      'L': { word: 'Lima', phonetic: 'LEE-MAH' },
      'M': { word: 'Mike', phonetic: 'MIKE' },
      'N': { word: 'November', phonetic: 'NO-VEM-BER' },
      'O': { word: 'Oscar', phonetic: 'OSS-CAH' },
      'P': { word: 'Papa', phonetic: 'PAH-PAH' },
      'Q': { word: 'Quebec', phonetic: 'KEH-BECK' },
      'R': { word: 'Romeo', phonetic: 'ROW-ME-OH' },
      'S': { word: 'Sierra', phonetic: 'SEE-AIR-RAH' },
      'T': { word: 'Tango', phonetic: 'TANG-GO' },
      'U': { word: 'Uniform', phonetic: 'YOU-NEE-FORM' },
      'V': { word: 'Victor', phonetic: 'VIK-TAH' },
      'W': { word: 'Whiskey', phonetic: 'WISS-KEY' },
      'X': { word: 'X-ray', phonetic: 'ECKS-RAY' },
      'Y': { word: 'Yankee', phonetic: 'YANG-KEY' },
      'Z': { word: 'Zulu', phonetic: 'ZOO-LOO' },
      '0': { word: 'Zero', phonetic: 'ZEE-RO' },
      '1': { word: 'One', phonetic: 'WUN' },
      '2': { word: 'Two', phonetic: 'TOO' },
      '3': { word: 'Three', phonetic: 'TREE' },
      '4': { word: 'Four', phonetic: 'FOW-ER' },
      '5': { word: 'Five', phonetic: 'FIFE' },
      '6': { word: 'Six', phonetic: 'SIX' },
      '7': { word: 'Seven', phonetic: 'SEV-EN' },
      '8': { word: 'Eight', phonetic: 'AIT' },
      '9': { word: 'Nine', phonetic: 'NIN-ER' }
    };
  }

  init() {
    this.initElements({
      inputText: 'inputText',
      output: 'output',
      alphabetGrid: 'alphabetGrid'
    });

    this.elements.inputText.addEventListener('input', () => this.convert());
    this.renderAlphabetGrid();
    this.convert();

    console.log('[NatoAlphabet] 초기화 완료');
    return this;
  }

  convert() {
    const input = this.elements.inputText.value.toUpperCase();
    this.elements.output.innerHTML = '';

    for (const char of input) {
      if (this.alphabet[char]) {
        const item = document.createElement('div');
        item.className = 'nato-item';
        item.innerHTML = '<span class="nato-char">' + char + '</span>' +
                        '<span class="nato-word">' + this.alphabet[char].word + '</span>';
        this.elements.output.appendChild(item);
      } else if (char === ' ') {
        const space = document.createElement('div');
        space.className = 'space-indicator';
        space.textContent = '|';
        this.elements.output.appendChild(space);
      }
    }

    if (this.elements.output.innerHTML === '') {
      this.elements.output.innerHTML = '<div style="color:#888;width:100%;text-align:center">변환할 텍스트를 입력하세요</div>';
    }
  }

  copyResult() {
    const input = this.elements.inputText.value.toUpperCase();
    const result = [];

    for (const char of input) {
      if (this.alphabet[char]) {
        result.push(this.alphabet[char].word);
      } else if (char === ' ') {
        result.push('|');
      }
    }

    if (result.length > 0) {
      this.copyToClipboard(result.join(' '));
      this.showToast('복사되었습니다!', 'success');
    }
  }

  renderAlphabetGrid() {
    this.elements.alphabetGrid.innerHTML = '';

    for (const [char, data] of Object.entries(this.alphabet)) {
      const item = document.createElement('div');
      item.className = 'alphabet-item';
      item.innerHTML = '<div class="alphabet-letter">' + char + '</div>' +
                      '<div class="alphabet-nato">' + data.word + '</div>' +
                      '<div class="alphabet-phonetic">' + data.phonetic + '</div>';
      item.onclick = () => {
        this.elements.inputText.value += char;
        this.convert();
      };
      this.elements.alphabetGrid.appendChild(item);
    }
  }
}

// 전역 인스턴스 생성
const natoAlphabet = new NatoAlphabet();
window.NatoAlphabet = natoAlphabet;

// 전역 함수 (HTML onclick 호환)
function convert() { natoAlphabet.convert(); }
function copyResult() { natoAlphabet.copyResult(); }

document.addEventListener('DOMContentLoaded', () => natoAlphabet.init());
