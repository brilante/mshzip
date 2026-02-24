/**
 * 모스 부호 변환기 - ToolBase 기반
 * 텍스트 ↔ 모스 부호 변환 및 오디오 재생
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class MorseCode extends ToolBase {
  constructor() {
    super('MorseCode');

    this.morseMap = {
      'A': '.-', 'B': '-...', 'C': '-.-.', 'D': '-..', 'E': '.', 'F': '..-.', 'G': '--.', 'H': '....', 'I': '..', 'J': '.---',
      'K': '-.-', 'L': '.-..', 'M': '--', 'N': '-.', 'O': '---', 'P': '.--.', 'Q': '--.-', 'R': '.-.', 'S': '...', 'T': '-',
      'U': '..-', 'V': '...-', 'W': '.--', 'X': '-..-', 'Y': '-.--', 'Z': '--..',
      '0': '-----', '1': '.----', '2': '..---', '3': '...--', '4': '....-', '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.',
      '.': '.-.-.-', ',': '--..--', '?': '..--..', "'": '.----.', '!': '-.-.--', '/': '-..-.', '(': '-.--.', ')': '-.--.-',
      '&': '.-...', ':': '---...', ';': '-.-.-.', '=': '-...-', '+': '.-.-.', '-': '-....-', '_': '..--.-', '"': '.-..-.',
      '$': '...-..-', '@': '.--.-.', ' ': '/'
    };

    this.reverseMorseMap = {};
    for (const [char, code] of Object.entries(this.morseMap)) {
      this.reverseMorseMap[code] = char;
    }
  }

  init() {
    this.initElements({
      textInput: 'textInput',
      morseInput: 'morseInput',
      visualMorse: 'visualMorse',
      referenceContent: 'referenceContent'
    });

    this.elements.textInput.addEventListener('input', () => this.textToMorse());
    this.showReference('letters');

    console.log('[MorseCode] 초기화 완료');
    return this;
  }

  textToMorse() {
    const text = this.elements.textInput.value.toUpperCase();
    const morse = [];

    for (const char of text) {
      if (this.morseMap[char]) {
        morse.push(this.morseMap[char]);
      } else if (char === ' ') {
        morse.push('/');
      }
    }

    this.elements.morseInput.value = morse.join(' ');
    this.updateVisual(morse);
  }

  morseToText() {
    const morse = this.elements.morseInput.value.trim();
    const words = morse.split(' / ');
    const text = [];

    for (const word of words) {
      const letters = word.split(' ');
      const wordText = letters.map(code => this.reverseMorseMap[code] || '').join('');
      text.push(wordText);
    }

    this.elements.textInput.value = text.join(' ');
  }

  updateVisual(morseArray) {
    const container = this.elements.visualMorse;
    container.innerHTML = '';

    const text = this.elements.textInput.value.toUpperCase();
    let textIndex = 0;

    for (let i = 0; i < morseArray.length; i++) {
      const code = morseArray[i];

      if (code === '/') {
        const space = document.createElement('span');
        space.className = 'word-space';
        container.appendChild(space);
        textIndex++;
        continue;
      }

      const letterGroup = document.createElement('span');
      letterGroup.className = 'morse-symbol';
      letterGroup.style.display = 'inline-flex';
      letterGroup.style.alignItems = 'center';
      letterGroup.style.gap = '3px';
      letterGroup.style.marginRight = '10px';

      for (const symbol of code) {
        const el = document.createElement('span');
        el.className = symbol === '.' ? 'dot' : 'dash';
        letterGroup.appendChild(el);
      }

      const label = document.createElement('span');
      label.className = 'letter-label';
      label.textContent = text[textIndex] || '';
      letterGroup.appendChild(label);

      container.appendChild(letterGroup);
      textIndex++;
    }
  }

  playMorse() {
    const morse = this.elements.morseInput.value;
    if (!morse) return;

    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const dotDuration = 0.1;
    const dashDuration = 0.3;
    const symbolGap = 0.1;
    const letterGap = 0.3;
    const wordGap = 0.7;

    let time = audioCtx.currentTime;

    for (const symbol of morse) {
      if (symbol === '.') {
        this.playTone(audioCtx, time, dotDuration);
        time += dotDuration + symbolGap;
      } else if (symbol === '-') {
        this.playTone(audioCtx, time, dashDuration);
        time += dashDuration + symbolGap;
      } else if (symbol === ' ') {
        time += letterGap;
      } else if (symbol === '/') {
        time += wordGap;
      }
    }
  }

  playTone(audioCtx, startTime, duration) {
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.frequency.value = 600;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.5, startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
  }

  copyMorse() {
    const morse = this.elements.morseInput.value;
    if (morse) {
      this.copyToClipboard(morse);
      this.showToast('복사되었습니다!', 'success');
    }
  }

  clearText() {
    this.elements.textInput.value = '';
    this.elements.morseInput.value = '';
    this.elements.visualMorse.innerHTML = '';
  }

  showReference(type) {
    document.querySelectorAll('.ref-tab').forEach(tab => {
      tab.classList.toggle('active', tab.textContent.includes(
        type === 'letters' ? '알파벳' : type === 'numbers' ? '숫자' : '구두점'
      ));
    });

    let items = [];

    if (type === 'letters') {
      items = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    } else if (type === 'numbers') {
      items = '0123456789'.split('');
    } else {
      items = ['.', ',', '?', "'", '!', '/', '(', ')', '&', ':', ';', '=', '+', '-', '_', '"', '$', '@'];
    }

    this.elements.referenceContent.innerHTML = items.map(char =>
      '<div class="ref-item">' +
      '<div class="ref-char">' + char + '</div>' +
      '<div class="ref-morse">' + (this.morseMap[char] || '') + '</div>' +
      '</div>'
    ).join('');
  }
}

// 전역 인스턴스 생성
const morseCode = new MorseCode();
window.MorseCode = morseCode;

// 전역 함수 (HTML onclick 호환)
function textToMorse() { morseCode.textToMorse(); }
function morseToText() { morseCode.morseToText(); }
function playMorse() { morseCode.playMorse(); }
function copyMorse() { morseCode.copyMorse(); }
function clearText() { morseCode.clearText(); }
function showReference(type) { morseCode.showReference(type); }

document.addEventListener('DOMContentLoaded', () => morseCode.init());
