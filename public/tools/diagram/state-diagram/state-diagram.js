/**
 * 상태 다이어그램 - ToolBase 기반
 * Mermaid로 상태 다이어그램 생성
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class StateDiagram extends ToolBase {
  constructor() {
    super('StateDiagram');
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
    console.log('[StateDiagram] 초기화 완료');
    return this;
  }

  debouncedRender() {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.render(), 500);
  }

  async render() {
    const code = this.elements.codeEditor.value;
    try {
      const { svg } = await mermaid.render('state-svg', code);
      this.elements.mermaidOutput.innerHTML = svg;
    } catch (e) {
      this.elements.mermaidOutput.innerHTML = '<div style="color: red; padding: 20px;">구문 오류: ' + e.message + '</div>';
    }
  }

  addState() {
    const name = prompt('상태 이름:');
    if (name) {
      this.elements.codeEditor.value += `\n    ${name}`;
      this.render();
    }
  }

  addTransition() {
    const from = prompt('출발 상태:');
    const to = prompt('도착 상태:');
    const label = prompt('전환 조건 (선택):');
    if (from && to) {
      this.elements.codeEditor.value += `\n    ${from} --> ${to}${label ? ' : ' + label : ''}`;
      this.render();
    }
  }

  addStart() {
    const to = prompt('시작 후 첫 상태:');
    if (to) {
      this.elements.codeEditor.value += `\n    [*] --> ${to}`;
      this.render();
    }
  }

  addEnd() {
    const from = prompt('종료 전 상태:');
    if (from) {
      this.elements.codeEditor.value += `\n    ${from} --> [*]`;
      this.render();
    }
  }

  addNote() {
    const state = prompt('상태 이름:');
    const text = prompt('노트 내용:');
    if (state && text) {
      this.elements.codeEditor.value += `\n    note right of ${state} : ${text}`;
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
    a.download = 'state-diagram.svg';
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
const stateDiagram = new StateDiagram();
window.StateDiagram = stateDiagram;

document.addEventListener('DOMContentLoaded', () => stateDiagram.init());
