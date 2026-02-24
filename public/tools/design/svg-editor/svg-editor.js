/**
 * SVG 편집기 - ToolBase 기반
 * SVG 코드 편집 및 미리보기
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var SvgEditor = class SvgEditor extends ToolBase {
  constructor() {
    super('SvgEditor');
    this.templates = {
      circle: `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <circle cx="50" cy="50" r="40" fill="#3b82f6" stroke="#1d4ed8" stroke-width="2"/>
</svg>`,
      rect: `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <rect x="10" y="10" width="80" height="80" rx="10" fill="#10b981" stroke="#059669" stroke-width="2"/>
</svg>`,
      star: `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <polygon points="50,5 61,40 98,40 68,62 79,97 50,75 21,97 32,62 2,40 39,40" fill="#f59e0b" stroke="#d97706" stroke-width="2"/>
</svg>`,
      heart: `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <path d="M50,88 C20,60 5,40 20,25 C35,10 50,25 50,25 C50,25 65,10 80,25 C95,40 80,60 50,88 Z" fill="#ef4444" stroke="#dc2626" stroke-width="2"/>
</svg>`
    };
  }

  init() {
    this.initElements({
      svgCode: 'svgCode',
      svgPreview: 'svgPreview',
      svgInfo: 'svgInfo',
      bgType: 'bgType',
      previewArea: 'previewArea',
      imageInput: 'imageInput'
    });

    this.loadTemplate('circle');
    console.log('[SvgEditor] 초기화 완료');
    return this;
  }

  loadTemplate(name) {
    this.elements.svgCode.value = this.templates[name];
    this.updatePreview();
  }

  loadFile(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      this.elements.svgCode.value = e.target.result;
      this.updatePreview();
      this.showToast('SVG 파일 로드 완료!', 'success');
    };
    reader.readAsText(file);
  }

  updatePreview() {
    const code = this.elements.svgCode.value;
    const preview = this.elements.svgPreview;
    const info = this.elements.svgInfo;

    try {
      // 간단한 유효성 검사
      if (!code.trim().startsWith('<svg') && !code.trim().startsWith('<?xml')) {
        preview.innerHTML = '<p class="error-msg">유효한 SVG 코드가 아닙니다.</p>';
        info.textContent = '';
        return;
      }

      preview.innerHTML = code;

      // SVG 정보 표시
      const svg = preview.querySelector('svg');
      if (svg) {
        const width = svg.getAttribute('width') || svg.viewBox?.baseVal?.width || 'auto';
        const height = svg.getAttribute('height') || svg.viewBox?.baseVal?.height || 'auto';
        const viewBox = svg.getAttribute('viewBox') || 'none';
        info.textContent = `크기: ${width} × ${height} | viewBox: ${viewBox} | 크기: ${new Blob([code]).size} bytes`;
      }
    } catch (e) {
      preview.innerHTML = '<p class="error-msg">SVG 파싱 오류</p>';
      info.textContent = '';
    }
  }

  updateBg() {
    const type = this.elements.bgType.value;
    const area = this.elements.previewArea;

    area.className = 'preview-area';
    if (type !== 'transparent') {
      area.classList.add(`bg-${type}`);
    }
  }

  formatCode() {
    let code = this.elements.svgCode.value;

    // 간단한 포매팅
    code = code.replace(/>\s*</g, '>\n<');
    code = code.replace(/\n\s*\n/g, '\n');

    // 들여쓰기 추가
    const lines = code.split('\n');
    let indent = 0;
    const formatted = lines.map(line => {
      line = line.trim();
      if (line.startsWith('</') || line.startsWith('/>')) indent--;
      const result = '  '.repeat(Math.max(0, indent)) + line;
      if (line.startsWith('<') && !line.startsWith('</') && !line.startsWith('<?') && !line.endsWith('/>')) indent++;
      return result;
    }).join('\n');

    this.elements.svgCode.value = formatted;
    this.updatePreview();
    this.showToast('코드 정리 완료!', 'success');
  }

  minifyCode() {
    let code = this.elements.svgCode.value;
    code = code.replace(/\s+/g, ' ');
    code = code.replace(/> </g, '><');
    code = code.replace(/\s*=\s*/g, '=');
    code = code.trim();

    this.elements.svgCode.value = code;
    this.updatePreview();
    this.showToast('코드 압축 완료!', 'success');
  }

  async copyCode() {
    const code = this.elements.svgCode.value;
    try {
      await navigator.clipboard.writeText(code);
      this.showToast('SVG 코드가 복사되었습니다!', 'success');
    } catch (e) {
      this.showToast('복사 실패', 'error');
    }
  }

  downloadSvg() {
    const code = this.elements.svgCode.value;
    if (!code.trim()) {
      this.showToast('다운로드할 SVG가 없습니다.', 'warning');
      return;
    }

    const blob = new Blob([code], { type: 'image/svg+xml' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'image.svg';
    link.click();
    URL.revokeObjectURL(link.href);
    this.showToast('SVG 다운로드 시작!', 'success');
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const svgEditor = new SvgEditor();
window.SvgEditor = svgEditor;

document.addEventListener('DOMContentLoaded', () => svgEditor.init());
