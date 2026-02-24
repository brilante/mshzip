/**
 * 트렌드 컬러 - ToolBase 기반
 * 시즌별 유행 컬러 가이드
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var TrendColor = class TrendColor extends ToolBase {
  constructor() {
    super('TrendColor');
    this.season = '2026ss';
    this.selectedColor = null;

    this.seasons = {
      '2026ss': {
        hero: { name: 'Mocha Mousse', hex: '#A47764', pantone: 'PANTONE 17-1230' },
        insight: '2026 S/S 시즌은 자연에서 영감받은 따뜻한 중성색이 주목받고 있습니다. 모카 무스를 중심으로 한 어스톤과 활기찬 액센트 컬러의 조화가 트렌드입니다.',
        colors: [
          { name: 'Mocha Mousse', hex: '#A47764', usage: '코트, 니트, 백 등 메인 아이템', combos: ['#F5F0E8', '#3D3D3D', '#D4A574'] },
          { name: 'Soft Sage', hex: '#9CAF88', usage: '블라우스, 셔츠, 스카프', combos: ['#FFFFFF', '#A47764', '#E8DED1'] },
          { name: 'Butter Yellow', hex: '#F4E285', usage: '원피스, 액세서리, 포인트', combos: ['#FFFFFF', '#3D3D3D', '#9CAF88'] },
          { name: 'Powder Blue', hex: '#B8D4E3', usage: '데님, 아우터, 가방', combos: ['#FFFFFF', '#3D3D3D', '#F4E285'] },
          { name: 'Coral Pink', hex: '#F08080', usage: '립스틱, 블러셔, 포인트 아이템', combos: ['#FFFFFF', '#A47764', '#3D3D3D'] },
          { name: 'Cream', hex: '#F5F0E8', usage: '베이스 레이어, 니트, 팬츠', combos: ['#A47764', '#9CAF88', '#3D3D3D'] },
          { name: 'Terracotta', hex: '#D4A574', usage: '가죽 아이템, 신발, 벨트', combos: ['#F5F0E8', '#3D3D3D', '#9CAF88'] },
          { name: 'Slate Gray', hex: '#708090', usage: '수트, 팬츠, 아우터', combos: ['#FFFFFF', '#A47764', '#F4E285'] },
          { name: 'Off White', hex: '#FAF9F6', usage: '셔츠, 티셔츠, 베이스', combos: ['#3D3D3D', '#A47764', '#9CAF88'] },
          { name: 'Charcoal', hex: '#3D3D3D', usage: '팬츠, 재킷, 액세서리', combos: ['#FFFFFF', '#F4E285', '#F08080'] }
        ]
      },
      '2025fw': {
        hero: { name: 'Burgundy', hex: '#800020', pantone: 'PANTONE 19-1930' },
        insight: '2025 F/W는 깊고 풍부한 색감이 특징입니다. 버건디를 필두로 한 와인 톤과 딥 그린, 브라운 계열이 럭셔리한 무드를 연출합니다.',
        colors: [
          { name: 'Burgundy', hex: '#800020', usage: '코트, 니트, 립스틱', combos: ['#F5F0E8', '#2F4F4F', '#D4AF37'] },
          { name: 'Forest Green', hex: '#228B22', usage: '아우터, 니트, 스커트', combos: ['#F5F0E8', '#800020', '#8B4513'] },
          { name: 'Chocolate', hex: '#7B3F00', usage: '가죽 자켓, 부츠, 벨트', combos: ['#F5F0E8', '#2F4F4F', '#D4AF37'] },
          { name: 'Navy', hex: '#000080', usage: '수트, 코트, 팬츠', combos: ['#FFFFFF', '#800020', '#D4AF37'] },
          { name: 'Mustard', hex: '#FFDB58', usage: '스웨터, 스카프, 포인트', combos: ['#2F4F4F', '#800020', '#3D3D3D'] },
          { name: 'Camel', hex: '#C19A6B', usage: '코트, 부츠, 가방', combos: ['#FFFFFF', '#800020', '#000080'] },
          { name: 'Plum', hex: '#DDA0DD', usage: '블라우스, 원피스, 액세서리', combos: ['#2F4F4F', '#F5F0E8', '#3D3D3D'] },
          { name: 'Slate', hex: '#708090', usage: '팬츠, 재킷, 니트', combos: ['#FFFFFF', '#800020', '#C19A6B'] },
          { name: 'Ivory', hex: '#FFFFF0', usage: '셔츠, 니트, 베이스', combos: ['#800020', '#2F4F4F', '#7B3F00'] },
          { name: 'Black', hex: '#000000', usage: '팬츠, 부츠, 가방', combos: ['#FFFFFF', '#800020', '#D4AF37'] }
        ]
      },
      '2025ss': {
        hero: { name: 'Peach Fuzz', hex: '#FFBE98', pantone: 'PANTONE 13-1023' },
        insight: '2025 S/S는 부드럽고 따뜻한 피치 컬러가 주도했습니다. 자연스러운 피부톤을 연상시키는 뉴트럴과 청량한 블루 계열이 함께 트렌드를 이끌었습니다.',
        colors: [
          { name: 'Peach Fuzz', hex: '#FFBE98', usage: '원피스, 블라우스, 메이크업', combos: ['#FFFFFF', '#87CEEB', '#F5F0E8'] },
          { name: 'Sky Blue', hex: '#87CEEB', usage: '셔츠, 데님, 액세서리', combos: ['#FFFFFF', '#FFBE98', '#F5F5DC'] },
          { name: 'Lavender', hex: '#E6E6FA', usage: '니트, 스커트, 가디건', combos: ['#FFFFFF', '#FFBE98', '#98FB98'] },
          { name: 'Mint', hex: '#98FB98', usage: '티셔츠, 원피스, 가방', combos: ['#FFFFFF', '#FFBE98', '#E6E6FA'] },
          { name: 'Lemon', hex: '#FFF44F', usage: '액세서리, 신발, 포인트', combos: ['#FFFFFF', '#3D3D3D', '#87CEEB'] },
          { name: 'Blush', hex: '#DE5D83', usage: '립스틱, 블러셔, 드레스', combos: ['#F5F0E8', '#FFFFFF', '#3D3D3D'] },
          { name: 'Sand', hex: '#C2B280', usage: '팬츠, 재킷, 가방', combos: ['#FFFFFF', '#87CEEB', '#FFBE98'] },
          { name: 'White', hex: '#FFFFFF', usage: '셔츠, 팬츠, 스니커즈', combos: ['#FFBE98', '#87CEEB', '#3D3D3D'] },
          { name: 'Silver', hex: '#C0C0C0', usage: '주얼리, 가방, 신발', combos: ['#FFFFFF', '#3D3D3D', '#E6E6FA'] },
          { name: 'Graphite', hex: '#383838', usage: '팬츠, 선글라스, 벨트', combos: ['#FFFFFF', '#FFBE98', '#87CEEB'] }
        ]
      }
    };
  }

  init() {
    this.initElements({
      heroColor: 'heroColor',
      heroName: 'heroName',
      heroCode: 'heroCode',
      colorPalette: 'colorPalette',
      trendInsight: 'trendInsight',
      colorDetail: 'colorDetail',
      colorPreview: 'colorPreview',
      colorName: 'colorName',
      colorCodes: 'colorCodes',
      usageList: 'usageList',
      combinationColors: 'combinationColors'
    });

    this.setSeason('2026ss');

    console.log('[TrendColor] 초기화 완료');
    return this;
  }

  setSeason(season) {
    this.season = season;
    this.selectedColor = null;

    document.querySelectorAll('.season-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.season === season);
    });

    this.render();
  }

  render() {
    const data = this.seasons[this.season];

    // Hero 컬러
    this.elements.heroColor.style.background = data.hero.hex;
    this.elements.heroColor.style.color = this.getContrastColor(data.hero.hex);
    this.elements.heroName.textContent = data.hero.name;
    this.elements.heroCode.textContent = `${data.hero.hex} · ${data.hero.pantone} (클릭하여 복사)`;

    // 팔레트
    this.elements.colorPalette.innerHTML = data.colors.map((c, i) => `
      <div class="palette-item ${this.selectedColor === i ? 'selected' : ''}"
           style="background: ${c.hex};"
           onclick="trendColor.selectColor(${i})"
           title="${c.name}"></div>
    `).join('');

    // 인사이트
    this.elements.trendInsight.textContent = data.insight;

    // 선택된 컬러 상세
    if (this.selectedColor !== null) {
      this.showColorDetail(this.selectedColor);
    }
  }

  selectColor(index) {
    this.selectedColor = index;
    this.render();
    this.showColorDetail(index);
  }

  showColorDetail(index) {
    const color = this.seasons[this.season].colors[index];

    this.elements.colorPreview.style.background = color.hex;
    this.elements.colorName.textContent = color.name;
    this.elements.colorCodes.textContent = `HEX: ${color.hex} · RGB: ${this.hexToRgb(color.hex)}`;

    this.elements.usageList.textContent = color.usage;

    this.elements.combinationColors.innerHTML = color.combos.map(c => `
      <div class="combo-color" style="background: ${c};" onclick="trendColor.copyHex('${c}')" title="${c}"></div>
    `).join('');

    this.elements.colorDetail.style.display = 'block';
  }

  copyColor() {
    const hex = this.seasons[this.season].hero.hex;
    this.copyHex(hex);
  }

  copyHex(hex) {
    navigator.clipboard.writeText(hex).then(() => {
      this.showToast(`${hex} 복사됨`, 'success');
    });
  }

  hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `${r}, ${g}, ${b}`;
  }

  getContrastColor(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#000000' : '#FFFFFF';
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const trendColor = new TrendColor();
window.TrendColor = trendColor;

document.addEventListener('DOMContentLoaded', () => trendColor.init());
