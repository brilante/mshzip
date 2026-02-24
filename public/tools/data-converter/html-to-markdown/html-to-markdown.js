/**
 * HTML → Markdown 변환기 - ToolBase 기반
 * HTML을 Markdown으로 변환
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var HtmlToMarkdown = class HtmlToMarkdown extends ToolBase {
  constructor() {
    super('HtmlToMarkdown');
    this.turndownService = null;
  }

  init() {
    this.initElements({
      htmlInput: 'htmlInput',
      markdownOutput: 'markdownOutput',
      headingStyle: 'headingStyle',
      bulletStyle: 'bulletStyle',
      codeBlockStyle: 'codeBlockStyle',
      gfm: 'gfm',
      statHtmlSize: 'statHtmlSize',
      statMdSize: 'statMdSize',
      statReduction: 'statReduction'
    });

    this.setupTurndown();
    this.setupOptionListeners();

    console.log('[HtmlToMarkdown] 초기화 완료');
    return this;
  }

  setupTurndown() {
    const headingStyle = this.elements.headingStyle.value;
    const bulletStyle = this.elements.bulletStyle.value;
    const codeBlockStyle = this.elements.codeBlockStyle.value;
    const gfm = this.elements.gfm.checked;

    this.turndownService = new TurndownService({
      headingStyle: headingStyle,
      bulletListMarker: bulletStyle,
      codeBlockStyle: codeBlockStyle,
      hr: '---',
      strongDelimiter: '**',
      emDelimiter: '_'
    });

    // GFM 플러그인 (표, 취소선, 작업 목록)
    if (gfm && typeof turndownPluginGfm !== 'undefined') {
      this.turndownService.use(turndownPluginGfm.gfm);
    }

    // 빈 요소 처리
    this.turndownService.addRule('blankParagraph', {
      filter: function(node) {
        return node.nodeName === 'P' && !node.textContent.trim();
      },
      replacement: function() {
        return '';
      }
    });

    // br 태그 처리
    this.turndownService.addRule('br', {
      filter: 'br',
      replacement: function() {
        return '  \n';
      }
    });
  }

  setupOptionListeners() {
    ['headingStyle', 'bulletStyle', 'codeBlockStyle', 'gfm'].forEach(id => {
      this.on(this.elements[id], 'change', () => {
        if (this.elements.htmlInput.value.trim()) {
          this.convert();
        }
      });
    });
  }

  loadFile(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      this.elements.htmlInput.value = e.target.result;
      this.convert();
    };
    reader.readAsText(file);
  }

  liveConvert() {
    // 디바운스 처리
    if (this._debounceTimer) {
      clearTimeout(this._debounceTimer);
    }
    this._debounceTimer = setTimeout(() => {
      this.convert();
    }, 300);
  }

  convert() {
    const html = this.elements.htmlInput.value;
    if (!html.trim()) {
      this.elements.markdownOutput.value = '';
      this.updateStats('', '');
      return;
    }

    try {
      // 옵션이 변경되었을 수 있으므로 재설정
      this.setupTurndown();

      // HTML 변환
      const markdown = this.turndownService.turndown(html);
      this.elements.markdownOutput.value = markdown;

      // 통계 업데이트
      this.updateStats(html, markdown);

      this.showToast('변환 완료!', 'success');
    } catch (error) {
      console.error('[HtmlToMarkdown] 변환 오류:', error);
      this.showToast('변환 오류: ' + error.message, 'error');
    }
  }

  updateStats(html, markdown) {
    const htmlSize = new Blob([html]).size;
    const mdSize = new Blob([markdown]).size;
    const reduction = htmlSize > 0 ? Math.round((1 - mdSize / htmlSize) * 100) : 0;

    this.elements.statHtmlSize.textContent = this.formatFileSize(htmlSize);
    this.elements.statMdSize.textContent = this.formatFileSize(mdSize);
    this.elements.statReduction.textContent = reduction + '%';
    this.elements.statReduction.style.color =
      reduction > 0 ? 'var(--tools-success)' : 'var(--tools-text)';
  }

  async copyOutput() {
    const output = this.elements.markdownOutput.value;
    if (!output) {
      this.showToast('복사할 내용이 없습니다.', 'warning');
      return;
    }

    try {
      await navigator.clipboard.writeText(output);
      this.showToast('클립보드에 복사되었습니다!', 'success');
    } catch (e) {
      this.showToast('복사 실패', 'error');
    }
  }

  download() {
    const output = this.elements.markdownOutput.value;
    if (!output) {
      this.showToast('다운로드할 내용이 없습니다.', 'warning');
      return;
    }

    this.downloadFile(output, 'document.md', 'text/markdown');
    this.showToast('다운로드 시작!', 'success');
  }

  clear() {
    this.elements.htmlInput.value = '';
    this.elements.markdownOutput.value = '';
    this.elements.statHtmlSize.textContent = '0 B';
    this.elements.statMdSize.textContent = '0 B';
    this.elements.statReduction.textContent = '0%';
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const htmlToMarkdown = new HtmlToMarkdown();
window.HtmlToMarkdown = htmlToMarkdown;

document.addEventListener('DOMContentLoaded', () => htmlToMarkdown.init());
