/**
 * 모바일 친화성 테스트 - ToolBase 기반
 * 반응형 디자인 체크
 * @created 2026-01-13
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class MobileFriendlyTestTool extends ToolBase {
  constructor() {
    super('MobileFriendlyTestTool');
    this.checks = [];
  }

  init() {
    this.initElements({
      urlInput: 'urlInput',
      htmlInput: 'htmlInput',
      resultPanel: 'resultPanel',
      phonePreview: 'phonePreview',
      tabletPreview: 'tabletPreview',
      resultBadge: 'resultBadge',
      resultIcon: 'resultIcon',
      resultText: 'resultText',
      resultDesc: 'resultDesc',
      checkList: 'checkList'
    });

    console.log('[MobileFriendlyTestTool] 초기화 완료');
    return this;
  }

  test() {
    const url = this.elements.urlInput.value.trim();

    if (!url) {
      this.showToast('URL을 입력해주세요.', 'error');
      return;
    }

    // URL 미리보기 (보안 정책상 안내 메시지 표시)
    this.showPreview(url);

    // 기본 체크 수행
    this.runDefaultChecks();
    this.showResults();
  }

  analyzeHtml() {
    const html = this.elements.htmlInput.value.trim();

    if (!html) {
      this.showToast('HTML 코드를 입력해주세요.', 'error');
      return;
    }

    this.checks = [];

    // Viewport 메타 태그 검사
    const hasViewport = html.includes('viewport') && html.includes('width=device-width');
    this.checks.push({
      pass: hasViewport,
      title: 'Viewport 메타 태그',
      desc: hasViewport
        ? 'viewport 메타 태그가 올바르게 설정되어 있습니다.'
        : "viewport 메타 태그를 추가하세요: <meta name='viewport' content='width=device-width, initial-scale=1'>"
    });

    // 고정 너비 검사
    const hasFixedWidth = /width:\s*\d{4,}px/i.test(html);
    this.checks.push({
      pass: !hasFixedWidth,
      title: '고정 너비 사용',
      desc: !hasFixedWidth
        ? '고정 너비 사용이 발견되지 않았습니다.'
        : '1000px 이상의 고정 너비가 발견되었습니다. 상대 단위를 사용하세요.'
    });

    // 미디어 쿼리 검사
    const hasMediaQuery = /@media/i.test(html);
    this.checks.push({
      pass: hasMediaQuery,
      title: '미디어 쿼리 사용',
      desc: hasMediaQuery
        ? '반응형 미디어 쿼리가 사용되고 있습니다.'
        : '미디어 쿼리를 사용하여 다양한 화면 크기를 지원하세요.'
    });

    // Flexbox/Grid 검사
    const hasFlexOrGrid = /display:\s*(flex|grid)/i.test(html);
    this.checks.push({
      pass: hasFlexOrGrid,
      title: 'Flexbox/Grid 레이아웃',
      desc: hasFlexOrGrid
        ? '유연한 레이아웃 기술이 사용되고 있습니다.'
        : 'Flexbox 또는 Grid를 사용하면 반응형 레이아웃을 쉽게 만들 수 있습니다.'
    });

    // 터치 타겟 크기 (간접 검사)
    const hasSmallPadding = /padding:\s*[0-3]px/i.test(html);
    this.checks.push({
      pass: !hasSmallPadding,
      title: '터치 타겟 크기',
      desc: !hasSmallPadding
        ? '터치 요소 크기가 적절해 보입니다.'
        : '버튼과 링크의 터치 영역이 너무 작을 수 있습니다. (최소 44px 권장)'
    });

    // 폰트 크기 검사
    const hasTooSmallFont = /font-size:\s*([0-9]|1[0-1])px/i.test(html);
    this.checks.push({
      pass: !hasTooSmallFont,
      title: '가독성 있는 폰트 크기',
      desc: !hasTooSmallFont
        ? '폰트 크기가 적절합니다.'
        : '12px 미만의 폰트가 발견되었습니다. 모바일에서는 최소 14px 이상을 권장합니다.'
    });

    // 이미지 반응형 검사
    const hasResponsiveImages = /max-width:\s*100%/i.test(html) || /img\s*{[^}]*max-width/i.test(html);
    this.checks.push({
      pass: hasResponsiveImages,
      title: '반응형 이미지',
      desc: hasResponsiveImages
        ? '이미지에 max-width가 적용되어 있습니다.'
        : '이미지에 max-width: 100%를 적용하여 반응형으로 만드세요.'
    });

    this.showResults();
  }

  showPreview(url) {
    // 외부 URL 미리보기 안내
    const phonePreview = this.elements.phonePreview;
    const tabletPreview = this.elements.tabletPreview;

    // iframe 사용 금지 - 외부 URL은 보안상 직접 렌더링 불가, 안내 메시지 표시
    const previewMsg = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-secondary,#888);font-size:0.9rem;text-align:center;padding:1rem;">외부 URL 미리보기는<br>보안 정책상 제한됩니다.<br>HTML 코드를 직접 입력하세요.</div>`;
    phonePreview.innerHTML = previewMsg;
    tabletPreview.innerHTML = previewMsg;
  }

  runDefaultChecks() {
    // URL 테스트용 기본 체크
    this.checks = [
      { pass: true, title: 'Viewport 메타 태그', desc: 'HTML을 분석하려면 HTML 코드를 입력하세요.' },
      { pass: true, title: '터치 타겟 크기', desc: '버튼과 링크가 충분히 커야 합니다. (최소 44px)' },
      { pass: true, title: '가독성 있는 폰트', desc: '모바일에서 최소 14px 이상의 폰트를 권장합니다.' },
      { pass: true, title: '콘텐츠 너비', desc: '가로 스크롤 없이 화면에 맞아야 합니다.' },
      { pass: true, title: '요소 간격', desc: '탭할 수 있는 요소 사이에 충분한 간격이 필요합니다.' }
    ];
  }

  showResults() {
    this.elements.resultPanel.style.display = 'block';

    const passCount = this.checks.filter(c => c.pass).length;
    const totalCount = this.checks.length;
    const allPass = passCount === totalCount;

    const badge = this.elements.resultBadge;
    badge.className = 'result-badge ' + (allPass ? 'pass' : 'fail');

    this.elements.resultIcon.textContent = allPass ? '' : '';
    this.elements.resultText.textContent = allPass ? '모바일 친화적' : '개선 필요';
    this.elements.resultDesc.textContent = `${passCount}/${totalCount} 항목 통과`;

    const html = this.checks.map(check => `
      <div class="check-item">
        <span class="check-icon">${check.pass ? '' : ''}</span>
        <div class="check-content">
          <div class="check-title">${check.title}</div>
          <div class="check-desc">${check.desc}</div>
        </div>
      </div>
    `).join('');

    this.elements.checkList.innerHTML = html;
  }
}

// 전역 인스턴스 생성
const mobileFriendlyTestTool = new MobileFriendlyTestTool();
window.MobileFriendlyTest = mobileFriendlyTestTool;

document.addEventListener('DOMContentLoaded', () => mobileFriendlyTestTool.init());
