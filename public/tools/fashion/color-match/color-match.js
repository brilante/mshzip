/**
 * 컬러 매칭 - ToolBase 기반
 * 패션 색상 조합 추천
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var ColorMatch = class ColorMatch extends ToolBase {
  constructor() {
    super('ColorMatch');
    this.mainColor = '#3b82f6';
    this.harmonyType = 'complementary';

    this.tips = {
      complementary: '보색 조합은 강렬하고 역동적인 느낌을 줍니다. 한 색을 메인으로, 다른 색은 포인트로 사용하세요.',
      analogous: '유사색 조합은 자연스럽고 편안한 느낌을 줍니다. 그라데이션 효과로 세련된 스타일을 연출할 수 있습니다.',
      triadic: '삼색 조합은 균형 잡힌 조화를 만듭니다. 한 색을 60%, 다른 색은 30%, 10% 비율로 사용하세요.',
      monochromatic: '단색 조합은 우아하고 세련된 느낌을 줍니다. 다양한 톤과 질감으로 깊이감을 더하세요.'
    };
  }

  init() {
    this.initElements({
      mainColor: 'mainColor',
      colorPicker: 'colorPicker',
      colorHex: 'colorHex',
      matchColors: 'matchColors',
      outfitTop: 'outfitTop',
      outfitBottom: 'outfitBottom',
      outfitAcc: 'outfitAcc',
      styleTip: 'styleTip'
    });

    this.setColor('#3b82f6');

    console.log('[ColorMatch] 초기화 완료');
    return this;
  }

  setColor(color) {
    this.mainColor = color;
    this.elements.mainColor.style.backgroundColor = color;
    this.elements.colorPicker.value = color;
    this.elements.colorHex.value = color.toUpperCase();
    this.updateMatches();
  }

  setColorFromHex(hex) {
    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
      this.setColor(hex);
    }
  }

  setHarmony(type) {
    this.harmonyType = type;
    document.querySelectorAll('.harmony-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.type === type);
    });
    this.updateMatches();
  }

  hexToHsl(hex) {
    let r = parseInt(hex.slice(1, 3), 16) / 255;
    let g = parseInt(hex.slice(3, 5), 16) / 255;
    let b = parseInt(hex.slice(5, 7), 16) / 255;

    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }

    return { h: h * 360, s: s * 100, l: l * 100 };
  }

  hslToHex(h, s, l) {
    s /= 100;
    l /= 100;
    const a = s * Math.min(l, 1 - l);
    const f = n => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  }

  getHarmonyColors() {
    const hsl = this.hexToHsl(this.mainColor);
    const colors = [];

    switch (this.harmonyType) {
      case 'complementary':
        colors.push({ color: this.hslToHex((hsl.h + 180) % 360, hsl.s, hsl.l), name: '보색' });
        colors.push({ color: this.hslToHex((hsl.h + 150) % 360, hsl.s * 0.7, hsl.l), name: '유사보색1' });
        colors.push({ color: this.hslToHex((hsl.h + 210) % 360, hsl.s * 0.7, hsl.l), name: '유사보색2' });
        break;
      case 'analogous':
        colors.push({ color: this.hslToHex((hsl.h + 30) % 360, hsl.s, hsl.l), name: '인접색1' });
        colors.push({ color: this.hslToHex((hsl.h - 30 + 360) % 360, hsl.s, hsl.l), name: '인접색2' });
        colors.push({ color: this.hslToHex((hsl.h + 60) % 360, hsl.s * 0.8, hsl.l), name: '인접색3' });
        break;
      case 'triadic':
        colors.push({ color: this.hslToHex((hsl.h + 120) % 360, hsl.s, hsl.l), name: '삼색1' });
        colors.push({ color: this.hslToHex((hsl.h + 240) % 360, hsl.s, hsl.l), name: '삼색2' });
        break;
      case 'monochromatic':
        colors.push({ color: this.hslToHex(hsl.h, hsl.s, Math.min(hsl.l + 20, 90)), name: '밝은톤' });
        colors.push({ color: this.hslToHex(hsl.h, hsl.s, Math.max(hsl.l - 20, 10)), name: '어두운톤' });
        colors.push({ color: this.hslToHex(hsl.h, hsl.s * 0.5, hsl.l), name: '탁한톤' });
        break;
    }

    // 뉴트럴 컬러 추가
    colors.push({ color: '#FFFFFF', name: '화이트' });
    colors.push({ color: '#000000', name: '블랙' });
    colors.push({ color: '#9CA3AF', name: '그레이' });

    return colors;
  }

  updateMatches() {
    const colors = this.getHarmonyColors();

    this.elements.matchColors.innerHTML = colors.map(c => `
      <div style="text-align: center;">
        <div class="match-color" style="background: ${c.color};" onclick="colorMatch.copyColor('${c.color}')"></div>
        <div class="match-color-name">${c.name}</div>
      </div>
    `).join('');

    // 코디 예시 업데이트
    this.elements.outfitTop.style.backgroundColor = this.mainColor;
    this.elements.outfitBottom.style.backgroundColor = colors[0]?.color || '#ccc';
    this.elements.outfitAcc.style.backgroundColor = colors[1]?.color || '#ccc';

    // 스타일링 팁 업데이트
    this.elements.styleTip.textContent = this.tips[this.harmonyType];
  }

  copyColor(color) {
    navigator.clipboard.writeText(color).then(() => {
      this.showToast(`${color} 복사됨`, 'success');
    });
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const colorMatch = new ColorMatch();
window.ColorMatch = colorMatch;

document.addEventListener('DOMContentLoaded', () => colorMatch.init());
