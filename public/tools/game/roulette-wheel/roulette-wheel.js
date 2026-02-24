/**
 * 룰렛 휠 - ToolBase 기반
 * 커스텀 항목 룰렛 돌리기
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class RouletteWheel extends ToolBase {
  constructor() {
    super('RouletteWheel');
    this.items = ['항목1', '항목2', '항목3', '항목4'];
    this.colors = [
      '#e74c3c', '#3498db', '#2ecc71', '#f39c12',
      '#9b59b6', '#1abc9c', '#e67e22', '#34495e',
      '#16a085', '#c0392b', '#2980b9', '#27ae60'
    ];
    this.history = JSON.parse(localStorage.getItem('rouletteHistory') || '[]');
    this.isSpinning = false;
    this.currentRotation = 0;
  }

  init() {
    this.canvas = document.getElementById('wheelCanvas');
    this.ctx = this.canvas.getContext('2d');

    this.initElements({
      spinBtn: 'spinBtn',
      addBtn: 'addBtn',
      newItem: 'newItem',
      clearBtn: 'clearBtn',
      itemList: 'itemList',
      resultDisplay: 'resultDisplay',
      historyList: 'historyList'
    });

    this.loadItems();
    this.drawWheel();
    this.setupEvents();
    this.renderItems();
    this.renderHistory();

    console.log('[RouletteWheel] 초기화 완료');
    return this;
  }

  loadItems() {
    const saved = localStorage.getItem('rouletteItems');
    if (saved) {
      this.items = JSON.parse(saved);
    }
  }

  saveItems() {
    localStorage.setItem('rouletteItems', JSON.stringify(this.items));
  }

  setupEvents() {
    this.elements.spinBtn.addEventListener('click', () => this.spin());
    this.elements.addBtn.addEventListener('click', () => this.addItem());
    this.elements.newItem.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.addItem();
    });
    this.elements.clearBtn.addEventListener('click', () => this.clearHistory());

    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.loadPreset(e.target.dataset.preset));
    });
  }

  drawWheel() {
    const { ctx, canvas, items, colors } = this;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 10;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (items.length === 0) {
      ctx.fillStyle = '#ddd';
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.fill();
      ctx.fillStyle = '#999';
      ctx.font = '20px Noto Sans KR';
      ctx.textAlign = 'center';
      ctx.fillText('항목을 추가하세요', centerX, centerY);
      return;
    }

    const sliceAngle = (2 * Math.PI) / items.length;

    items.forEach((item, i) => {
      const startAngle = i * sliceAngle + this.currentRotation;
      const endAngle = startAngle + sliceAngle;

      // 조각 그리기
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = colors[i % colors.length];
      ctx.fill();

      // 테두리
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      ctx.stroke();

      // 텍스트
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(startAngle + sliceAngle / 2);
      ctx.fillStyle = 'white';
      ctx.font = 'bold 14px Noto Sans KR';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';

      const text = item.length > 10 ? item.substring(0, 10) + '...' : item;
      ctx.fillText(text, radius - 20, 0);
      ctx.restore();
    });

    // 중앙 원
    ctx.beginPath();
    ctx.arc(centerX, centerY, 20, 0, 2 * Math.PI);
    ctx.fillStyle = 'white';
    ctx.fill();
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  spin() {
    if (this.isSpinning || this.items.length === 0) return;

    this.isSpinning = true;
    this.elements.spinBtn.disabled = true;
    this.elements.resultDisplay.textContent = '';

    const spinDuration = 4000;
    const spinRevolutions = 5 + Math.random() * 5;
    const totalRotation = spinRevolutions * 2 * Math.PI;
    const startTime = performance.now();

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / spinDuration, 1);

      // 이징 함수 (ease-out)
      const easeOut = 1 - Math.pow(1 - progress, 4);

      this.currentRotation = totalRotation * easeOut;
      this.drawWheel();

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        this.finishSpin();
      }
    };

    requestAnimationFrame(animate);
  }

  finishSpin() {
    this.isSpinning = false;
    this.elements.spinBtn.disabled = false;

    // 결과 계산 (위쪽 포인터 기준)
    const normalizedRotation = ((this.currentRotation % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const sliceAngle = (2 * Math.PI) / this.items.length;

    // 포인터는 위쪽(-90도 = -PI/2)에 있음
    const pointerAngle = -Math.PI / 2 - normalizedRotation;
    const normalizedPointer = ((pointerAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const selectedIndex = Math.floor(normalizedPointer / sliceAngle);

    const result = this.items[selectedIndex];
    this.showResult(result);
    this.addToHistory(result);
  }

  showResult(result) {
    this.elements.resultDisplay.textContent = `${result}`;
    this.elements.resultDisplay.classList.remove('animate');
    void this.elements.resultDisplay.offsetWidth; // 리플로우 강제
    this.elements.resultDisplay.classList.add('animate');
  }

  addItem() {
    const value = this.elements.newItem.value.trim();

    if (value && !this.items.includes(value)) {
      this.items.push(value);
      this.saveItems();
      this.drawWheel();
      this.renderItems();
      this.elements.newItem.value = '';
    }
  }

  removeItem(index) {
    this.items.splice(index, 1);
    this.saveItems();
    this.drawWheel();
    this.renderItems();
  }

  renderItems() {
    this.elements.itemList.innerHTML = this.items.map((item, i) => `
      <span class="item-tag">
        <span class="color-dot" style="background:${this.colors[i % this.colors.length]}"></span>
        ${this.escapeHtml(item)}
        <button onclick="roulette.removeItem(${i})">&times;</button>
      </span>
    `).join('');
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  loadPreset(preset) {
    const presets = {
      lunch: ['짜장면', '짬뽕', '김치찌개', '순대국', '비빔밥', '돈까스', '초밥', '햄버거'],
      yesno: ['예', '아니오'],
      numbers: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']
    };

    if (presets[preset]) {
      this.items = [...presets[preset]];
      this.saveItems();
      this.drawWheel();
      this.renderItems();
    }
  }

  addToHistory(result) {
    const entry = {
      result,
      time: new Date().toLocaleTimeString()
    };

    this.history.unshift(entry);
    if (this.history.length > 20) this.history.pop();
    localStorage.setItem('rouletteHistory', JSON.stringify(this.history));
    this.renderHistory();
  }

  renderHistory() {
    this.elements.historyList.innerHTML = this.history.map(h => `
      <div class="history-item">
        <span class="result">${this.escapeHtml(h.result)}</span>
        <span class="time">${h.time}</span>
      </div>
    `).join('');
  }

  clearHistory() {
    if (confirm('기록을 삭제하시겠습니까?')) {
      this.history = [];
      localStorage.removeItem('rouletteHistory');
      this.renderHistory();
    }
  }
}

// 전역 인스턴스 생성
const roulette = new RouletteWheel();
window.RouletteWheel = roulette;

document.addEventListener('DOMContentLoaded', () => roulette.init());
