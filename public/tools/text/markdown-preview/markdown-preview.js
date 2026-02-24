/**
 * Markdown 미리보기 - ToolBase 기반
 * 실시간 Markdown 렌더링
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var MdPreview = class MdPreview extends ToolBase {
  constructor() {
    super('MdPreview');
  }

  init() {
    this.initElements({
      mdInput: 'mdInput',
      mdPreview: 'mdPreview'
    });

    marked.setOptions({
      breaks: true,
      gfm: true
    });

    console.log('[MdPreview] 초기화 완료');
    return this;
  }

  render() {
    const input = this.elements.mdInput.value;
    try {
      this.elements.mdPreview.innerHTML = marked.parse(input);
    } catch (e) {
      this.elements.mdPreview.innerHTML = '<p style="color:red">렌더링 오류</p>';
    }
  }

  insert(before, after = '') {
    const textarea = this.elements.mdInput;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.substring(start, end);

    textarea.value = text.substring(0, start) + before + selected + after + text.substring(end);
    textarea.focus();
    textarea.setSelectionRange(start + before.length, start + before.length + selected.length);
    this.render();
  }

  loadSample() {
    this.elements.mdInput.value = `# Markdown 미리보기

이것은 **Markdown** 미리보기 도구입니다.

## 기능

- 실시간 렌더링
- GFM(GitHub Flavored Markdown) 지원
- 다양한 요소 지원

### 코드 블록

\`\`\`javascript
function hello() {
  console.log('Hello, World!');
}
\`\`\`

### 인용

> Markdown은 텍스트 기반의 마크업 언어입니다.

### 테이블

| 이름 | 설명 |
|------|------|
| Bold | **굵게** |
| Italic | *기울임* |

### 링크와 이미지

[Google](https://google.com)

---

이것은 샘플 문서입니다.`;
    this.render();
  }

  async copyHtml() {
    const html = this.elements.mdPreview.innerHTML;
    try {
      await navigator.clipboard.writeText(html);
      this.showSuccess('HTML 복사됨!');
    } catch (e) {
      this.showError('복사 실패');
    }
  }

  download() {
    const md = this.elements.mdInput.value;
    if (!md) {
      this.showToast('내용이 없습니다.', 'warning');
      return;
    }
    this.downloadFile(md, 'document.md', 'text/markdown');
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const mdPreview = new MdPreview();
window.MdPreview = mdPreview;

document.addEventListener('DOMContentLoaded', () => mdPreview.init());
