/**
 * 패턴 생성기 - ToolBase 기반
 * CSS 배경 패턴 생성
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var PatternGen = class PatternGen extends ToolBase {
  constructor() {
    super('PatternGen');
    this.currentPattern = 'dots';
    this.patterns = {
      dots: {
        name: '도트',
        generate: (size, color, bg) => `
          radial-gradient(${color} 1px, transparent 1px)
        `,
        bgSize: (size) => `${size}px ${size}px`
      },
      grid: {
        name: '그리드',
        generate: (size, color, bg) => `
          linear-gradient(${color} 1px, transparent 1px),
          linear-gradient(90deg, ${color} 1px, transparent 1px)
        `,
        bgSize: (size) => `${size}px ${size}px`
      },
      lines: {
        name: '수평선',
        generate: (size, color, bg) => `
          linear-gradient(${color} 1px, transparent 1px)
        `,
        bgSize: (size) => `100% ${size}px`
      },
      verticalLines: {
        name: '수직선',
        generate: (size, color, bg) => `
          linear-gradient(90deg, ${color} 1px, transparent 1px)
        `,
        bgSize: (size) => `${size}px 100%`
      },
      diagonal: {
        name: '대각선',
        generate: (size, color, bg) => `
          repeating-linear-gradient(
            45deg,
            ${color},
            ${color} 1px,
            transparent 1px,
            transparent ${size}px
          )
        `,
        bgSize: () => 'auto'
      },
      crosshatch: {
        name: '크로스해치',
        generate: (size, color, bg) => `
          repeating-linear-gradient(
            45deg,
            ${color},
            ${color} 1px,
            transparent 1px,
            transparent ${size}px
          ),
          repeating-linear-gradient(
            -45deg,
            ${color},
            ${color} 1px,
            transparent 1px,
            transparent ${size}px
          )
        `,
        bgSize: () => 'auto'
      },
      zigzag: {
        name: '지그재그',
        generate: (size, color, bg) => `
          linear-gradient(135deg, ${color} 25%, transparent 25%),
          linear-gradient(225deg, ${color} 25%, transparent 25%),
          linear-gradient(45deg, ${color} 25%, transparent 25%),
          linear-gradient(315deg, ${color} 25%, transparent 25%)
        `,
        bgSize: (size) => `${size}px ${size}px`,
        bgPos: (size) => `0 0, ${size/2}px 0, ${size/2}px -${size/2}px, 0 ${size/2}px`
      },
      checkerboard: {
        name: '체커보드',
        generate: (size, color, bg) => `
          linear-gradient(45deg, ${color} 25%, transparent 25%),
          linear-gradient(-45deg, ${color} 25%, transparent 25%),
          linear-gradient(45deg, transparent 75%, ${color} 75%),
          linear-gradient(-45deg, transparent 75%, ${color} 75%)
        `,
        bgSize: (size) => `${size}px ${size}px`,
        bgPos: (size) => `0 0, 0 ${size/2}px, ${size/2}px -${size/2}px, -${size/2}px 0`
      },
      polkaDots: {
        name: '폴카도트',
        generate: (size, color, bg) => `
          radial-gradient(${color} ${size/4}px, transparent ${size/4}px)
        `,
        bgSize: (size) => `${size}px ${size}px`
      },
      waves: {
        name: '웨이브',
        generate: (size, color, bg) => `
          radial-gradient(circle at 100% 50%, transparent 20%, ${color} 21%, ${color} 34%, transparent 35%, transparent),
          radial-gradient(circle at 0% 50%, transparent 20%, ${color} 21%, ${color} 34%, transparent 35%, transparent)
        `,
        bgSize: (size) => `${size * 2}px ${size}px`
      }
    };
  }

  init() {
    this.initElements({
      patternGrid: 'patternGrid',
      bgColor: 'bgColor',
      patternColor: 'patternColor',
      patternSize: 'patternSize',
      opacity: 'opacity',
      patternSizeValue: 'patternSizeValue',
      opacityValue: 'opacityValue',
      patternPreview: 'patternPreview',
      cssCode: 'cssCode'
    });

    this.renderPatternGrid();
    this.update();
    console.log('[PatternGen] 초기화 완료');
    return this;
  }

  renderPatternGrid() {
    this.elements.patternGrid.innerHTML = Object.entries(this.patterns).map(([key, pattern]) => `
      <button class="pattern-btn ${key === this.currentPattern ? 'active' : ''}"
              data-pattern="${key}"
              onclick="patternGen.setPattern('${key}')">
        ${pattern.name}
      </button>
    `).join('');
  }

  setPattern(pattern) {
    this.currentPattern = pattern;
    document.querySelectorAll('.pattern-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-pattern="${pattern}"]`).classList.add('active');
    this.update();
  }

  update() {
    const bgColor = this.elements.bgColor.value;
    const patternColor = this.elements.patternColor.value;
    const size = parseInt(this.elements.patternSize.value);
    const opacity = this.elements.opacity.value;

    // 값 표시 업데이트
    this.elements.patternSizeValue.textContent = size + 'px';
    this.elements.opacityValue.textContent = opacity + '%';

    // 패턴 색상에 불투명도 적용
    const colorWithOpacity = this.hexToRgba(patternColor, opacity / 100);

    const pattern = this.patterns[this.currentPattern];
    const gradient = pattern.generate(size, colorWithOpacity, bgColor);
    const bgSize = pattern.bgSize(size);
    const bgPos = pattern.bgPos ? pattern.bgPos(size) : '0 0';

    // 프리뷰 업데이트
    const preview = this.elements.patternPreview;
    preview.style.backgroundColor = bgColor;
    preview.style.backgroundImage = gradient;
    preview.style.backgroundSize = bgSize;
    preview.style.backgroundPosition = bgPos;

    // CSS 코드 생성
    this.generateCode(bgColor, gradient, bgSize, bgPos);
  }

  hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  generateCode(bgColor, gradient, bgSize, bgPos) {
    const code = `.pattern {
  background-color: ${bgColor};
  background-image: ${gradient.trim()};
  background-size: ${bgSize};
  background-position: ${bgPos};
}`;
    this.elements.cssCode.textContent = code;
  }

  async copyCode() {
    const code = this.elements.cssCode.textContent;
    try {
      await navigator.clipboard.writeText(code);
      this.showToast('CSS 코드가 복사되었습니다!', 'success');
    } catch (e) {
      this.showToast('복사 실패', 'error');
    }
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const patternGen = new PatternGen();
window.PatternGen = patternGen;

document.addEventListener('DOMContentLoaded', () => patternGen.init());
