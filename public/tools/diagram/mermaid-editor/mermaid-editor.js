/**
 * Mermaid 에디터 - ToolBase 기반
 * Mermaid 구문으로 다이어그램 생성
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class MermaidEditor extends ToolBase {
  constructor() {
    super('MermaidEditor');
    this.templates = {
      flowchart: `flowchart TD
    A[시작] --> B{조건?}
    B -->|Yes| C[실행 1]
    B -->|No| D[실행 2]
    C --> E[종료]
    D --> E`,
      sequence: `sequenceDiagram
    participant A as 클라이언트
    participant B as 서버
    participant C as 데이터베이스
    A->>B: 요청
    B->>C: 쿼리
    C-->>B: 결과
    B-->>A: 응답`,
      classDiagram: `classDiagram
    class Animal {
        +String name
        +int age
        +makeSound()
    }
    class Dog {
        +String breed
        +bark()
    }
    class Cat {
        +String color
        +meow()
    }
    Animal <|-- Dog
    Animal <|-- Cat`,
      erDiagram: `erDiagram
    CUSTOMER ||--o{ ORDER : places
    ORDER ||--|{ LINE-ITEM : contains
    PRODUCT ||--o{ LINE-ITEM : "ordered in"
    CUSTOMER {
        string name
        string email
    }
    ORDER {
        int id
        date created
    }`,
      pie: `pie title 브라우저 점유율
    "Chrome" : 65
    "Firefox" : 15
    "Safari" : 10
    "Edge" : 8
    "기타" : 2`,
      gantt: `gantt
    title 프로젝트 일정
    dateFormat  YYYY-MM-DD
    section 기획
    요구사항 분석    :a1, 2024-01-01, 7d
    UI/UX 설계      :after a1, 5d
    section 개발
    프론트엔드      :2024-01-15, 14d
    백엔드          :2024-01-15, 14d
    section 테스트
    QA 테스트       :2024-02-01, 7d`
    };
    this.debounceTimer = null;
  }

  init() {
    this.initElements({
      codeEditor: 'codeEditor',
      mermaidOutput: 'mermaidOutput',
      templates: 'templates'
    });

    mermaid.initialize({ startOnLoad: false, theme: 'default' });

    this.on(this.elements.codeEditor, 'input', () => this.debouncedRender());

    this.render();
    console.log('[MermaidEditor] 초기화 완료');
    return this;
  }

  debouncedRender() {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.render(), 500);
  }

  loadTemplate() {
    const sel = this.elements.templates;
    if (this.templates[sel.value]) {
      this.elements.codeEditor.value = this.templates[sel.value];
      this.render();
    }
    sel.value = '';
  }

  async render() {
    const code = this.elements.codeEditor.value;
    try {
      const { svg } = await mermaid.render('mermaid-svg', code);
      this.elements.mermaidOutput.innerHTML = svg;
    } catch (e) {
      this.elements.mermaidOutput.innerHTML = '<div class="error">구문 오류: ' + this.escapeHtml(e.message) + '</div>';
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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
    a.download = 'diagram.svg';
    a.click();
    URL.revokeObjectURL(url);
    this.showToast('SVG 다운로드 시작!', 'success');
  }

  async downloadPNG() {
    const svg = this.elements.mermaidOutput.querySelector('svg');
    if (!svg) {
      this.showToast('먼저 다이어그램을 생성하세요!', 'warning');
      return;
    }

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width * 2;
      canvas.height = img.height * 2;
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = 'diagram.png';
      a.click();
      this.showToast('PNG 다운로드 시작!', 'success');
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  }

  destroy() {
    clearTimeout(this.debounceTimer);
    super.destroy();
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const mermaidEditor = new MermaidEditor();
window.MermaidEditor = mermaidEditor;

document.addEventListener('DOMContentLoaded', () => mermaidEditor.init());
