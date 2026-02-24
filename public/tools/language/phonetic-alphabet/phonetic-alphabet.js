/**
 * 음성 알파벳 변환기 - ToolBase 기반
 * NATO, LAPD 등 음성 알파벳 변환
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var PhoneticAlphabet = class PhoneticAlphabet extends ToolBase {
  constructor() {
    super('PhoneticAlphabet');
    this.currentSystem = 'nato';
    this.result = '';

    this.systems = {
      nato: {
        A: 'Alpha', B: 'Bravo', C: 'Charlie', D: 'Delta', E: 'Echo',
        F: 'Foxtrot', G: 'Golf', H: 'Hotel', I: 'India', J: 'Juliet',
        K: 'Kilo', L: 'Lima', M: 'Mike', N: 'November', O: 'Oscar',
        P: 'Papa', Q: 'Quebec', R: 'Romeo', S: 'Sierra', T: 'Tango',
        U: 'Uniform', V: 'Victor', W: 'Whiskey', X: 'X-ray', Y: 'Yankee', Z: 'Zulu',
        '0': 'Zero', '1': 'One', '2': 'Two', '3': 'Three', '4': 'Four',
        '5': 'Five', '6': 'Six', '7': 'Seven', '8': 'Eight', '9': 'Niner'
      },
      lapd: {
        A: 'Adam', B: 'Boy', C: 'Charles', D: 'David', E: 'Edward',
        F: 'Frank', G: 'George', H: 'Henry', I: 'Ida', J: 'John',
        K: 'King', L: 'Lincoln', M: 'Mary', N: 'Nora', O: 'Ocean',
        P: 'Paul', Q: 'Queen', R: 'Robert', S: 'Sam', T: 'Tom',
        U: 'Union', V: 'Victor', W: 'William', X: 'X-ray', Y: 'Young', Z: 'Zebra',
        '0': 'Zero', '1': 'One', '2': 'Two', '3': 'Three', '4': 'Four',
        '5': 'Five', '6': 'Six', '7': 'Seven', '8': 'Eight', '9': 'Nine'
      },
      korean: {
        A: '알파', B: '브라보', C: '찰리', D: '델타', E: '에코',
        F: '폭스트롯', G: '골프', H: '호텔', I: '인디아', J: '줄리엣',
        K: '킬로', L: '리마', M: '마이크', N: '노벰버', O: '오스카',
        P: '파파', Q: '퀘벡', R: '로미오', S: '시에라', T: '탱고',
        U: '유니폼', V: '빅터', W: '위스키', X: '엑스레이', Y: '양키', Z: '줄루',
        '0': '영', '1': '일', '2': '이', '3': '삼', '4': '사',
        '5': '오', '6': '육', '7': '칠', '8': '팔', '9': '구'
      }
    };
  }

  init() {
    this.initElements({
      inputText: 'inputText',
      result: 'result'
    });

    this.setupEvents();
    this.convert();

    console.log('[PhoneticAlphabet] 초기화 완료');
    return this;
  }

  setupEvents() {
    document.querySelectorAll('.system-tab').forEach(tab => {
      tab.addEventListener('click', () => this.setSystem(tab.dataset.system));
    });

    this.elements.inputText.addEventListener('input', () => this.convert());
  }

  setSystem(system) {
    this.currentSystem = system;
    document.querySelectorAll('.system-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.system === system);
    });
    this.convert();
  }

  convert() {
    const input = this.elements.inputText.value.toUpperCase();
    const system = this.systems[this.currentSystem];

    let html = '';
    let textResult = [];

    for (const char of input) {
      if (system[char]) {
        html += `<span class="phonetic-word"><span class="letter">${char}</span>${system[char]}</span>`;
        textResult.push(system[char]);
      } else if (char === ' ') {
        html += '<br>';
        textResult.push('-');
      }
    }

    this.elements.result.innerHTML = html || '<span style="color: var(--text-secondary);">결과가 여기에 표시됩니다</span>';
    this.result = textResult.join(' ');
  }

  copy() {
    if (this.result) {
      this.copyToClipboard(this.result);
      this.showToast('클립보드에 복사되었습니다!', 'success');
    }
  }
}

// 전역 인스턴스 생성
const phoneticAlphabet = new PhoneticAlphabet();
window.PhoneticAlphabet = phoneticAlphabet;

document.addEventListener('DOMContentLoaded', () => phoneticAlphabet.init());
