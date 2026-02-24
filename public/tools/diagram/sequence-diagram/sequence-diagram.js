/**
 * 시퀀스 다이어그램 - ToolBase 기반
 * Mermaid로 시퀀스 다이어그램 생성
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class SequenceDiagram extends ToolBase {
  constructor() {
    super('SequenceDiagram');
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
    console.log('[SequenceDiagram] 초기화 완료');
    return this;
  }

  debouncedRender() {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.render(), 500);
  }

  async render() {
    const code = this.elements.codeEditor.value;
    try {
      const { svg } = await mermaid.render('seq-svg', code);
      this.elements.mermaidOutput.innerHTML = svg;
    } catch (e) {
      this.elements.mermaidOutput.innerHTML = '<div style="color: red; padding: 20px;">구문 오류: ' + e.message + '</div>';
    }
  }

  addParticipant() {
    const name = prompt('참여자 이름:');
    if (name) {
      const lines = this.elements.codeEditor.value.split('\n');
      const insertIndex = lines.findIndex(l => l.includes('participant')) + 1 || 1;
      lines.splice(insertIndex, 0, `    participant ${name.replace(/ /g, '')} as ${name}`);
      this.elements.codeEditor.value = lines.join('\n');
      this.render();
    }
  }

  addMessage(type) {
    const from = prompt('보내는 곳:');
    const to = prompt('받는 곳:');
    const msg = prompt('메시지:');
    if (from && to && msg) {
      this.elements.codeEditor.value += `\n    ${from}${type}${to}: ${msg}`;
      this.render();
    }
  }

  addNote() {
    const over = prompt('위치 (예: Client,API):');
    const text = prompt('노트 내용:');
    if (over && text) {
      this.elements.codeEditor.value += `\n    Note over ${over}: ${text}`;
      this.render();
    }
  }

  addLoop() {
    const condition = prompt('반복 조건:');
    if (condition) {
      this.elements.codeEditor.value += `\n    loop ${condition}\n        \n    end`;
      this.render();
    }
  }

  addAlt() {
    const condition = prompt('조건:');
    if (condition) {
      this.elements.codeEditor.value += `\n    alt ${condition}\n        \n    else 그외\n        \n    end`;
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
    a.download = 'sequence-diagram.svg';
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
const sequenceDiagram = new SequenceDiagram();
window.SequenceDiagram = sequenceDiagram;

document.addEventListener('DOMContentLoaded', () => sequenceDiagram.init());
