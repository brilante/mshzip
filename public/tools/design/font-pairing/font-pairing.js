/**
 * 폰트 조합 (Font Pairing) - ToolBase 기반
 * 어울리는 폰트 조합 찾기
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var FontPairing = class FontPairing extends ToolBase {
  constructor() {
    super('FontPairing');
    this.fonts = [
      { name: 'Noto Sans KR', category: 'sans-serif', korean: true },
      { name: 'Pretendard', category: 'sans-serif', korean: true },
      { name: 'Roboto', category: 'sans-serif', korean: false },
      { name: 'Open Sans', category: 'sans-serif', korean: false },
      { name: 'Lato', category: 'sans-serif', korean: false },
      { name: 'Montserrat', category: 'sans-serif', korean: false },
      { name: 'Poppins', category: 'sans-serif', korean: false },
      { name: 'Inter', category: 'sans-serif', korean: false },
      { name: 'Nunito', category: 'sans-serif', korean: false },
      { name: 'Work Sans', category: 'sans-serif', korean: false },
      { name: 'Noto Serif KR', category: 'serif', korean: true },
      { name: 'Playfair Display', category: 'serif', korean: false },
      { name: 'Merriweather', category: 'serif', korean: false },
      { name: 'Lora', category: 'serif', korean: false },
      { name: 'PT Serif', category: 'serif', korean: false },
      { name: 'Source Serif Pro', category: 'serif', korean: false },
      { name: 'Black Han Sans', category: 'display', korean: true },
      { name: 'Do Hyeon', category: 'display', korean: true },
      { name: 'Jua', category: 'display', korean: true },
      { name: 'Bebas Neue', category: 'display', korean: false },
      { name: 'Anton', category: 'display', korean: false },
      { name: 'Oswald', category: 'display', korean: false },
      { name: 'Nanum Pen Script', category: 'handwriting', korean: true },
      { name: 'Gaegu', category: 'handwriting', korean: true },
      { name: 'Dancing Script', category: 'handwriting', korean: false },
      { name: 'Pacifico', category: 'handwriting', korean: false }
    ];
    this.pairings = [
      { heading: 'Playfair Display', body: 'Noto Sans KR', style: '클래식' },
      { heading: 'Montserrat', body: 'Noto Sans KR', style: '모던' },
      { heading: 'Black Han Sans', body: 'Noto Sans KR', style: '임팩트' },
      { heading: 'Noto Serif KR', body: 'Noto Sans KR', style: '전통적' },
      { heading: 'Poppins', body: 'Open Sans', style: '심플' },
      { heading: 'Bebas Neue', body: 'Roboto', style: '볼드' },
      { heading: 'Lora', body: 'Merriweather', style: '우아함' },
      { heading: 'Do Hyeon', body: 'Noto Sans KR', style: '캐주얼' }
    ];
    this.loadedFonts = new Set();
  }

  init() {
    this.initElements({
      headingFont: 'headingFont',
      bodyFont: 'bodyFont',
      headingSize: 'headingSize',
      bodySize: 'bodySize',
      lineHeight: 'lineHeight',
      headingSizeValue: 'headingSizeValue',
      bodySizeValue: 'bodySizeValue',
      lineHeightValue: 'lineHeightValue',
      pairingGrid: 'pairingGrid',
      previewCard: 'previewCard',
      cssCode: 'cssCode'
    });

    this.populateSelects();
    this.renderPairings();
    this.loadFont('Playfair Display');
    this.loadFont('Noto Sans KR');
    this.updatePreview();

    console.log('[FontPairing] 초기화 완료');
    return this;
  }

  populateSelects() {
    const categories = {
      'display': '디스플레이',
      'serif': '세리프',
      'sans-serif': '산세리프',
      'handwriting': '손글씨'
    };

    for (const [category, label] of Object.entries(categories)) {
      const categoryFonts = this.fonts.filter(f => f.category === category);

      if (categoryFonts.length > 0) {
        const optgroup1 = document.createElement('optgroup');
        optgroup1.label = label;
        const optgroup2 = document.createElement('optgroup');
        optgroup2.label = label;

        categoryFonts.forEach(font => {
          const option1 = document.createElement('option');
          option1.value = font.name;
          option1.textContent = font.name + (font.korean ? ' (한글)' : '');
          optgroup1.appendChild(option1);

          const option2 = document.createElement('option');
          option2.value = font.name;
          option2.textContent = font.name + (font.korean ? ' (한글)' : '');
          optgroup2.appendChild(option2);
        });

        this.elements.headingFont.appendChild(optgroup1);
        this.elements.bodyFont.appendChild(optgroup2);
      }
    }

    this.elements.headingFont.value = 'Playfair Display';
    this.elements.bodyFont.value = 'Noto Sans KR';
  }

  renderPairings() {
    this.elements.pairingGrid.innerHTML = this.pairings.map((pair, index) => `
      <div class="pairing-card" onclick="fontPairing.selectPairing(${index})">
        <div class="pairing-preview">
          <div class="pairing-heading" style="font-family: '${pair.heading}', sans-serif;">Aa</div>
          <div class="pairing-body" style="font-family: '${pair.body}', sans-serif;">Aa</div>
        </div>
        <div class="pairing-info">
          <div class="pairing-fonts">${pair.heading} + ${pair.body}</div>
          <div class="pairing-style">${pair.style}</div>
        </div>
      </div>
    `).join('');

    this.pairings.forEach(pair => {
      this.loadFont(pair.heading);
      this.loadFont(pair.body);
    });
  }

  loadFont(fontName) {
    if (this.loadedFonts.has(fontName)) return;

    const link = document.createElement('link');
    link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/ /g, '+')}:wght@400;500;600;700&display=swap`;
    link.rel = 'stylesheet';
    document.head.appendChild(link);

    this.loadedFonts.add(fontName);
  }

  selectPairing(index) {
    const pair = this.pairings[index];
    this.elements.headingFont.value = pair.heading;
    this.elements.bodyFont.value = pair.body;
    this.updatePreview();
    this.showToast(`${pair.style} 스타일 선택됨`, 'success');
  }

  randomPair() {
    const headingFonts = this.fonts.filter(f => f.category === 'display' || f.category === 'serif');
    const bodyFonts = this.fonts.filter(f => f.category === 'sans-serif');

    const randomHeading = headingFonts[Math.floor(Math.random() * headingFonts.length)];
    const randomBody = bodyFonts[Math.floor(Math.random() * bodyFonts.length)];

    this.elements.headingFont.value = randomHeading.name;
    this.elements.bodyFont.value = randomBody.name;

    this.loadFont(randomHeading.name);
    this.loadFont(randomBody.name);
    this.updatePreview();

    this.showToast('랜덤 조합 생성됨!', 'success');
  }

  updatePreview() {
    const headingFont = this.elements.headingFont.value;
    const bodyFont = this.elements.bodyFont.value;
    const headingSize = this.elements.headingSize.value;
    const bodySize = this.elements.bodySize.value;
    const lineHeight = this.elements.lineHeight.value;

    this.loadFont(headingFont);
    this.loadFont(bodyFont);

    this.elements.headingSizeValue.textContent = headingSize + 'px';
    this.elements.bodySizeValue.textContent = bodySize + 'px';
    this.elements.lineHeightValue.textContent = lineHeight;

    const preview = this.elements.previewCard;
    preview.querySelector('.preview-heading').style.fontFamily = `'${headingFont}', sans-serif`;
    preview.querySelector('.preview-heading').style.fontSize = headingSize + 'px';
    preview.querySelector('.preview-subheading').style.fontFamily = `'${headingFont}', sans-serif`;
    preview.querySelector('.preview-subheading').style.fontSize = (headingSize * 0.6) + 'px';

    preview.querySelectorAll('.preview-body').forEach(el => {
      el.style.fontFamily = `'${bodyFont}', sans-serif`;
      el.style.fontSize = bodySize + 'px';
      el.style.lineHeight = lineHeight;
    });

    this.generateCode(headingFont, bodyFont, headingSize, bodySize, lineHeight);
  }

  generateCode(headingFont, bodyFont, headingSize, bodySize, lineHeight) {
    const code = `/* Google Fonts */
@import url('https://fonts.googleapis.com/css2?family=${headingFont.replace(/ /g, '+')}:wght@400;600;700&family=${bodyFont.replace(/ /g, '+')}:wght@400;500&display=swap');

/* Typography */
h1, h2, h3, h4, h5, h6 {
  font-family: '${headingFont}', sans-serif;
}

h1 {
  font-size: ${headingSize}px;
  font-weight: 700;
}

body, p {
  font-family: '${bodyFont}', sans-serif;
  font-size: ${bodySize}px;
  line-height: ${lineHeight};
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
const fontPairing = new FontPairing();
window.FontPairing = fontPairing;

document.addEventListener('DOMContentLoaded', () => fontPairing.init());
