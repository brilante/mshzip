/**
 * 클래스 다이어그램 - ToolBase 기반
 * Mermaid로 클래스 다이어그램 생성
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class ClassDiagram extends ToolBase {
  constructor() {
    super('ClassDiagram');
    this.debounceTimer = null;
  }

  init() {
    this.initElements({
      codeEditor: 'codeEditor',
      mermaidOutput: 'mermaidOutput'
    });

    mermaid.initialize({ startOnLoad: false, theme: 'default' });

    this.on(this.elements.codeEditor, 'input', () => this.debouncedRender());

    this.render();
    console.log('[ClassDiagram] 초기화 완료');
    return this;
  }

  debouncedRender() {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.render(), 500);
  }

  async render() {
    const code = this.elements.codeEditor.value;
    try {
      const { svg } = await mermaid.render('class-svg', code);
      this.elements.mermaidOutput.innerHTML = svg;
    } catch (e) {
      this.elements.mermaidOutput.innerHTML = '<div style="color: red; padding: 20px;">구문 오류: ' + e.message + '</div>';
    }
  }

  addClass() {
    const name = prompt('클래스 이름:');
    if (name) {
      this.elements.codeEditor.value += `\n    class ${name} {\n        +attribute type\n        +method() void\n    }`;
      this.render();
    }
  }

  addRelation(type) {
    const class1 = prompt('첫 번째 클래스:');
    const class2 = prompt('두 번째 클래스:');
    if (class1 && class2) {
      this.elements.codeEditor.value += `\n    ${class1} ${type} ${class2}`;
      this.render();
    }
  }

  downloadSVG() {
    const svg = this.elements.mermaidOutput.querySelector('svg');
    if (!svg) {
      this.showToast('먼저 다이어그램을 생성하세요!', 'warning');
      return;
    }
    const svgData = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgData], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'class-diagram.svg';
    a.click();
    URL.revokeObjectURL(url);
    this.showToast('SVG 다운로드 시작!', 'success');
  }

  destroy() {
    clearTimeout(this.debounceTimer);
    super.destroy();
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const classDiagram = new ClassDiagram();
window.ClassDiagram = classDiagram;

document.addEventListener('DOMContentLoaded', () => classDiagram.init());
