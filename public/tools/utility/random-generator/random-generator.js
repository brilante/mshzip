/**
 * 랜덤 생성기 - ToolBase 기반
 * 숫자, 비밀번호, UUID, 색상, 동전, 주사위
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class RandomGenerator extends ToolBase {
  constructor() {
    super('RandomGenerator');
  }

  init() {
    this.initElements({
      numMin: 'numMin',
      numMax: 'numMax',
      numCount: 'numCount',
      numResult: 'numResult',
      pwLength: 'pwLength',
      pwUpper: 'pwUpper',
      pwLower: 'pwLower',
      pwNumber: 'pwNumber',
      pwSymbol: 'pwSymbol',
      pwResult: 'pwResult',
      uuidResult: 'uuidResult',
      colorPreview: 'colorPreview',
      colorResult: 'colorResult',
      coinResult: 'coinResult',
      diceType: 'diceType',
      diceCount: 'diceCount',
      diceResult: 'diceResult'
    });

    console.log('[RandomGenerator] 초기화 완료');
    return this;
  }

  generateNumbers() {
    const min = parseInt(this.elements.numMin.value);
    const max = parseInt(this.elements.numMax.value);
    const count = parseInt(this.elements.numCount.value);

    const numbers = [];
    for (let i = 0; i < count; i++) {
      numbers.push(Math.floor(Math.random() * (max - min + 1)) + min);
    }
    this.elements.numResult.textContent = numbers.join(', ');
  }

  generatePassword() {
    const length = parseInt(this.elements.pwLength.value);
    const useUpper = this.elements.pwUpper.checked;
    const useLower = this.elements.pwLower.checked;
    const useNumber = this.elements.pwNumber.checked;
    const useSymbol = this.elements.pwSymbol.checked;

    let chars = '';
    if (useUpper) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (useLower) chars += 'abcdefghijklmnopqrstuvwxyz';
    if (useNumber) chars += '0123456789';
    if (useSymbol) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';

    if (!chars) {
      this.showToast('최소 하나의 옵션을 선택하세요', 'error');
      return;
    }

    let password = '';
    for (let i = 0; i < length; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    this.elements.pwResult.textContent = password;
  }

  generateUUID() {
    const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
    this.elements.uuidResult.textContent = uuid;
  }

  generateColor() {
    const color = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
    this.elements.colorPreview.style.backgroundColor = color;
    this.elements.colorResult.textContent = color;
  }

  flipCoin() {
    const result = Math.random() < 0.5 ? '앞면' : '뒷면';
    const icon = result === '앞면' ? '' : '';
    this.elements.coinResult.textContent = icon + ' ' + result;
  }

  rollDice() {
    const sides = parseInt(this.elements.diceType.value);
    const count = parseInt(this.elements.diceCount.value);

    const results = [];
    for (let i = 0; i < count; i++) {
      results.push(Math.floor(Math.random() * sides) + 1);
    }
    const sum = results.reduce((a, b) => a + b, 0);
    this.elements.diceResult.textContent = results.join(' + ') + (count > 1 ? ' = ' + sum : '');
  }
}

// 전역 인스턴스 생성
const randomGenerator = new RandomGenerator();
window.RandomGenerator = randomGenerator;

document.addEventListener('DOMContentLoaded', () => randomGenerator.init());
