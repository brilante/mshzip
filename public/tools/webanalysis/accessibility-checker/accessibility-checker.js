/**
 * 접근성 검사기 - ToolBase 기반
 * WCAG 가이드라인 기반 웹 접근성 검사
 * @created 2026-01-13
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class AccessibilityCheckerTool extends ToolBase {
  constructor() {
    super('AccessibilityCheckerTool');
    this.currentFilter = 'all';
    this.issues = [];

    // 접근성 규칙 정의
    this.rules = [
      // 이미지 관련
      {
        id: 'img-alt',
        category: 'perceivable',
        level: 'error',
        wcag: 'WCAG 1.1.1',
        title: '이미지에 대체 텍스트 없음',
        description: '모든 이미지에는 alt 속성이 필요합니다.',
        check: (doc) => {
          const issues = [];
          doc.querySelectorAll('img').forEach(img => {
            if (!img.hasAttribute('alt')) {
              issues.push({ element: img.outerHTML.substring(0, 100) });
            }
          });
          return issues;
        }
      },
      {
        id: 'img-alt-empty',
        category: 'perceivable',
        level: 'warning',
        wcag: 'WCAG 1.1.1',
        title: '이미지 대체 텍스트가 비어있음',
        description: '의미 있는 이미지는 설명이 포함된 alt 텍스트가 필요합니다.',
        check: (doc) => {
          const issues = [];
          doc.querySelectorAll('img[alt=""]').forEach(img => {
            if (!img.getAttribute('role')?.includes('presentation')) {
              issues.push({ element: img.outerHTML.substring(0, 100) });
            }
          });
          return issues;
        }
      },
      // 제목 구조
      {
        id: 'heading-order',
        category: 'operable',
        level: 'warning',
        wcag: 'WCAG 1.3.1',
        title: '제목 순서가 올바르지 않음',
        description: '제목 태그는 h1, h2, h3 순서로 사용해야 합니다.',
        check: (doc) => {
          const issues = [];
          const headings = doc.querySelectorAll('h1, h2, h3, h4, h5, h6');
          let lastLevel = 0;
          headings.forEach(h => {
            const level = parseInt(h.tagName[1]);
            if (level > lastLevel + 1 && lastLevel !== 0) {
              issues.push({ element: `<${h.tagName.toLowerCase()}>${h.textContent.substring(0, 50)}...` });
            }
            lastLevel = level;
          });
          return issues;
        }
      },
      {
        id: 'missing-h1',
        category: 'operable',
        level: 'error',
        wcag: 'WCAG 1.3.1',
        title: 'h1 태그 없음',
        description: '페이지에는 최소 하나의 h1 제목이 필요합니다.',
        check: (doc) => {
          const h1 = doc.querySelector('h1');
          return h1 ? [] : [{ element: '페이지에 h1 태그가 없습니다' }];
        }
      },
      // 링크
      {
        id: 'link-text',
        category: 'operable',
        level: 'warning',
        wcag: 'WCAG 2.4.4',
        title: '링크 텍스트가 불명확함',
        description: '"여기를 클릭", "더 보기" 같은 모호한 링크 텍스트는 피해야 합니다.',
        check: (doc) => {
          const issues = [];
          const badTexts = ['click here', 'here', 'more', '더 보기', '여기', '클릭'];
          doc.querySelectorAll('a').forEach(a => {
            const text = a.textContent.trim().toLowerCase();
            if (badTexts.includes(text)) {
              issues.push({ element: a.outerHTML.substring(0, 100) });
            }
          });
          return issues;
        }
      },
      {
        id: 'link-new-window',
        category: 'operable',
        level: 'notice',
        wcag: 'WCAG 3.2.5',
        title: '새 창으로 열리는 링크',
        description: '새 창으로 열리는 링크는 사용자에게 알려야 합니다.',
        check: (doc) => {
          const issues = [];
          doc.querySelectorAll('a[target="_blank"]').forEach(a => {
            if (!a.textContent.includes('새 창') && !a.getAttribute('aria-label')?.includes('new')) {
              issues.push({ element: a.outerHTML.substring(0, 100) });
            }
          });
          return issues;
        }
      },
      // 폼
      {
        id: 'form-label',
        category: 'understandable',
        level: 'error',
        wcag: 'WCAG 1.3.1',
        title: '폼 입력에 레이블 없음',
        description: '모든 폼 입력에는 연결된 label이 필요합니다.',
        check: (doc) => {
          const issues = [];
          doc.querySelectorAll('input, select, textarea').forEach(input => {
            if (input.type === 'hidden' || input.type === 'submit' || input.type === 'button') return;
            const id = input.id;
            const hasLabel = id && doc.querySelector(`label[for="${id}"]`);
            const hasAriaLabel = input.getAttribute('aria-label');
            const hasAriaLabelledBy = input.getAttribute('aria-labelledby');
            if (!hasLabel && !hasAriaLabel && !hasAriaLabelledBy) {
              issues.push({ element: input.outerHTML.substring(0, 100) });
            }
          });
          return issues;
        }
      },
      // 언어
      {
        id: 'html-lang',
        category: 'understandable',
        level: 'error',
        wcag: 'WCAG 3.1.1',
        title: 'html lang 속성 없음',
        description: 'html 요소에 언어가 지정되어야 합니다.',
        check: (doc) => {
          const html = doc.documentElement || doc.querySelector('html');
          if (!html || !html.getAttribute('lang')) {
            return [{ element: '<html> 태그에 lang 속성이 없습니다' }];
          }
          return [];
        }
      },
      // 대비
      {
        id: 'meta-viewport',
        category: 'robust',
        level: 'warning',
        wcag: 'WCAG 1.4.4',
        title: '확대/축소 제한',
        description: 'user-scalable=no 또는 maximum-scale=1은 접근성을 저해합니다.',
        check: (doc) => {
          const viewport = doc.querySelector('meta[name="viewport"]');
          if (viewport) {
            const content = viewport.getAttribute('content') || '';
            if (content.includes('user-scalable=no') || content.includes('maximum-scale=1')) {
              return [{ element: viewport.outerHTML }];
            }
          }
          return [];
        }
      },
      // 테이블
      {
        id: 'table-header',
        category: 'perceivable',
        level: 'warning',
        wcag: 'WCAG 1.3.1',
        title: '테이블에 헤더 없음',
        description: '데이터 테이블에는 th 요소가 필요합니다.',
        check: (doc) => {
          const issues = [];
          doc.querySelectorAll('table').forEach(table => {
            if (!table.querySelector('th')) {
              issues.push({ element: '<table>에 <th> 헤더가 없습니다' });
            }
          });
          return issues;
        }
      },
      // 버튼
      {
        id: 'button-name',
        category: 'operable',
        level: 'error',
        wcag: 'WCAG 4.1.2',
        title: '버튼에 접근 가능한 이름 없음',
        description: '버튼에는 텍스트나 aria-label이 필요합니다.',
        check: (doc) => {
          const issues = [];
          doc.querySelectorAll('button').forEach(btn => {
            const text = btn.textContent.trim();
            const ariaLabel = btn.getAttribute('aria-label');
            const title = btn.getAttribute('title');
            if (!text && !ariaLabel && !title) {
              issues.push({ element: btn.outerHTML.substring(0, 100) });
            }
          });
          return issues;
        }
      },
      // iframe
      {
        id: 'iframe-title',
        category: 'operable',
        level: 'warning',
        wcag: 'WCAG 4.1.2',
        title: 'iframe에 title 없음',
        description: 'iframe에는 내용을 설명하는 title이 필요합니다.',
        check: (doc) => {
          const issues = [];
          doc.querySelectorAll('iframe').forEach(iframe => {
            if (!iframe.getAttribute('title')) {
              issues.push({ element: iframe.outerHTML.substring(0, 100) });
            }
          });
          return issues;
        }
      }
    ];

    this.categoryNames = {
      perceivable: { name: '인식 가능', icon: '' },
      operable: { name: '운용 가능', icon: '' },
      understandable: { name: '이해 가능', icon: '' },
      robust: { name: '견고함', icon: '' }
    };
  }

  init() {
    this.initElements({
      urlInput: 'urlInput',
      htmlInput: 'htmlInput',
      resultSection: 'resultSection',
      scoreCircle: 'scoreCircle',
      scoreValue: 'scoreValue',
      scoreGrade: 'scoreGrade',
      scoreSummary: 'scoreSummary',
      categoryResults: 'categoryResults',
      issuesList: 'issuesList'
    });

    console.log('[AccessibilityCheckerTool] 초기화 완료');
    return this;
  }

  switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.toggle('active', content.id === tab + 'Tab');
    });
  }

  async analyzeUrl() {
    const url = this.elements.urlInput.value.trim();
    if (!url) {
      this.showToast('URL을 입력해주세요.', 'error');
      return;
    }

    try {
      // CORS 프록시 사용 또는 직접 fetch
      const response = await fetch(url);
      const html = await response.text();
      this.analyze(html);
    } catch (error) {
      this.showToast('URL을 가져올 수 없습니다. CORS 제한이 있을 수 있습니다.\nHTML 코드를 직접 붙여넣어 검사해주세요.', 'error');
    }
  }

  analyzeHtml() {
    const html = this.elements.htmlInput.value.trim();
    if (!html) {
      this.showToast('HTML 코드를 입력해주세요.', 'error');
      return;
    }
    this.analyze(html);
  }

  analyze(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    this.issues = [];
    let errorCount = 0;
    let warningCount = 0;
    let noticeCount = 0;

    const categoryScores = {
      perceivable: { pass: 0, fail: 0 },
      operable: { pass: 0, fail: 0 },
      understandable: { pass: 0, fail: 0 },
      robust: { pass: 0, fail: 0 }
    };

    this.rules.forEach(rule => {
      const ruleIssues = rule.check(doc);
      if (ruleIssues.length > 0) {
        categoryScores[rule.category].fail++;
        ruleIssues.forEach(issue => {
          this.issues.push({
            ...rule,
            element: issue.element
          });
          if (rule.level === 'error') errorCount++;
          else if (rule.level === 'warning') warningCount++;
          else noticeCount++;
        });
      } else {
        categoryScores[rule.category].pass++;
      }
    });

    // 점수 계산 (오류는 -10점, 경고는 -5점, 알림은 -2점)
    const maxScore = 100;
    const penalty = (errorCount * 10) + (warningCount * 5) + (noticeCount * 2);
    const score = Math.max(0, maxScore - penalty);

    this.renderResults(score, categoryScores, errorCount, warningCount, noticeCount);
  }

  renderResults(score, categoryScores, errorCount, warningCount, noticeCount) {
    this.elements.resultSection.style.display = 'block';

    // 점수 표시
    const scoreCircle = this.elements.scoreCircle;
    const offset = 283 - (283 * score / 100);
    scoreCircle.style.strokeDashoffset = offset;

    let gradeClass = 'good';
    let gradeText = '우수';
    if (score < 50) {
      gradeClass = 'poor';
      gradeText = '개선 필요';
    } else if (score < 80) {
      gradeClass = 'fair';
      gradeText = '보통';
    }

    scoreCircle.className = `score-fill ${gradeClass}`;
    this.elements.scoreValue.textContent = score;
    this.elements.scoreGrade.textContent = gradeText;
    this.elements.scoreGrade.className = `score-grade ${gradeClass}`;
    this.elements.scoreSummary.textContent =
      `오류 ${errorCount}개, 경고 ${warningCount}개, 알림 ${noticeCount}개 발견`;

    // 카테고리 결과
    const categoryHtml = Object.entries(categoryScores).map(([key, val]) => {
      const total = val.pass + val.fail;
      const percent = total > 0 ? Math.round((val.pass / total) * 100) : 100;
      let scoreClass = 'pass';
      if (percent < 50) scoreClass = 'fail';
      else if (percent < 80) scoreClass = 'partial';

      return `
        <div class="category-card">
          <div class="category-icon">${this.categoryNames[key].icon}</div>
          <div class="category-name">${this.categoryNames[key].name}</div>
          <div class="category-score ${scoreClass}">${percent}%</div>
        </div>
      `;
    }).join('');

    this.elements.categoryResults.innerHTML = categoryHtml;

    // 이슈 목록
    this.renderIssues();
  }

  renderIssues() {
    const list = this.elements.issuesList;

    if (this.issues.length === 0) {
      list.innerHTML = '<div class="loading">발견된 이슈가 없습니다! </div>';
      return;
    }

    list.innerHTML = this.issues.map((issue, index) => `
      <div class="issue-item" data-level="${issue.level}" data-index="${index}">
        <div class="issue-level">
          <span class="level-badge ${issue.level}">
            ${issue.level === 'error' ? '오류' : issue.level === 'warning' ? '경고' : '알림'}
          </span>
        </div>
        <div class="issue-content">
          <div class="issue-title">${issue.title}</div>
          <div class="issue-description">${issue.description}</div>
          <div class="issue-element">${this.escapeHtml(issue.element)}</div>
          <div class="issue-wcag">${issue.wcag}</div>
        </div>
      </div>
    `).join('');
  }

  filterIssues(level) {
    this.currentFilter = level;

    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.level === level);
    });

    document.querySelectorAll('.issue-item').forEach(item => {
      if (level === 'all' || item.dataset.level === level) {
        item.classList.remove('hidden');
      } else {
        item.classList.add('hidden');
      }
    });
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}

// 전역 인스턴스 생성
const accessibilityCheckerTool = new AccessibilityCheckerTool();
window.AccessibilityChecker = accessibilityCheckerTool;

document.addEventListener('DOMContentLoaded', () => accessibilityCheckerTool.init());
