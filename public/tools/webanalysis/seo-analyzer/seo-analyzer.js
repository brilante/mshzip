/**
 * SEO 분석기 - ToolBase 기반
 * 검색 엔진 최적화 점검
 * @created 2026-01-13
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class SeoAnalyzerTool extends ToolBase {
  constructor() {
    super('SeoAnalyzerTool');
    this.category = 'all';
    this.checks = [];
  }

  init() {
    this.initElements({
      pageTitle: 'pageTitle',
      metaDesc: 'metaDesc',
      pageUrl: 'pageUrl',
      keywords: 'keywords',
      resultPanel: 'resultPanel',
      previewTitle: 'previewTitle',
      previewUrl: 'previewUrl',
      previewDesc: 'previewDesc',
      seoScore: 'seoScore',
      scoreDesc: 'scoreDesc',
      checkList: 'checkList'
    });

    console.log('[SeoAnalyzerTool] 초기화 완료');
    return this;
  }

  analyze() {
    const title = this.elements.pageTitle.value.trim();
    const desc = this.elements.metaDesc.value.trim();
    const url = this.elements.pageUrl.value.trim() || 'https://example.com';
    const keywords = this.elements.keywords.value.trim().split(',').map(k => k.trim().toLowerCase()).filter(k => k);

    this.checks = [];

    // 제목 검사
    this.checks.push({
      category: 'title',
      pass: title.length > 0,
      title: '제목 태그 존재',
      desc: title.length > 0 ? '제목 태그가 설정되어 있습니다.' : '제목 태그를 추가하세요.'
    });

    this.checks.push({
      category: 'title',
      pass: title.length >= 30 && title.length <= 60,
      title: '제목 길이 (30-60자)',
      desc: `현재 ${title.length}자. ${title.length < 30 ? '조금 더 길게' : title.length > 60 ? '조금 더 짧게' : '적절합니다.'}`
    });

    if (keywords.length > 0) {
      const titleLower = title.toLowerCase();
      const hasKeyword = keywords.some(k => titleLower.includes(k));
      this.checks.push({
        category: 'title',
        pass: hasKeyword,
        title: '제목에 키워드 포함',
        desc: hasKeyword ? '타겟 키워드가 제목에 포함되어 있습니다.' : '타겟 키워드를 제목에 포함하세요.'
      });
    }

    // 메타 설명 검사
    this.checks.push({
      category: 'description',
      pass: desc.length > 0,
      title: '메타 설명 존재',
      desc: desc.length > 0 ? '메타 설명이 설정되어 있습니다.' : '메타 설명을 추가하세요.'
    });

    this.checks.push({
      category: 'description',
      pass: desc.length >= 120 && desc.length <= 160,
      title: '메타 설명 길이 (120-160자)',
      desc: `현재 ${desc.length}자. ${desc.length < 120 ? '조금 더 길게' : desc.length > 160 ? '조금 더 짧게' : '적절합니다.'}`
    });

    if (keywords.length > 0) {
      const descLower = desc.toLowerCase();
      const hasKeyword = keywords.some(k => descLower.includes(k));
      this.checks.push({
        category: 'description',
        pass: hasKeyword,
        title: '메타 설명에 키워드 포함',
        desc: hasKeyword ? '타겟 키워드가 설명에 포함되어 있습니다.' : '타겟 키워드를 설명에 포함하세요.'
      });
    }

    // 키워드 검사
    this.checks.push({
      category: 'keywords',
      pass: keywords.length > 0,
      title: '타겟 키워드 설정',
      desc: keywords.length > 0 ? `${keywords.length}개의 키워드가 설정되어 있습니다.` : '타겟 키워드를 설정하세요.'
    });

    this.checks.push({
      category: 'keywords',
      pass: keywords.length >= 1 && keywords.length <= 5,
      title: '적절한 키워드 수 (1-5개)',
      desc: `현재 ${keywords.length}개. ${keywords.length === 0 ? '키워드를 추가하세요.' : keywords.length > 5 ? '핵심 키워드에 집중하세요.' : '적절합니다.'}`
    });

    // URL 검사
    if (url && url !== 'https://example.com') {
      const urlPath = url.replace(/https?:\/\/[^\/]+/, '');
      this.checks.push({
        category: 'keywords',
        pass: urlPath.length <= 75,
        title: 'URL 길이',
        desc: urlPath.length <= 75 ? 'URL 길이가 적절합니다.' : 'URL이 너무 깁니다. 간결하게 유지하세요.'
      });

      const hasSpecialChars = /[^a-zA-Z0-9\-\/\.]/.test(urlPath);
      this.checks.push({
        category: 'keywords',
        pass: !hasSpecialChars,
        title: 'URL 형식',
        desc: !hasSpecialChars ? 'URL이 깔끔합니다.' : '특수문자 대신 하이픈(-)을 사용하세요.'
      });
    }

    // 점수 계산
    const passCount = this.checks.filter(c => c.pass).length;
    const score = Math.round((passCount / this.checks.length) * 100);

    // 결과 표시
    this.renderPreview(title, url, desc);
    this.renderScore(score);
    this.renderChecks();

    this.elements.resultPanel.style.display = 'block';
  }

  renderPreview(title, url, desc) {
    this.elements.previewTitle.textContent = title || '페이지 제목을 입력하세요';
    this.elements.previewUrl.textContent = url || 'https://example.com';
    this.elements.previewDesc.textContent = desc || '메타 설명을 입력하세요. 검색 결과에서 사용자가 보게 될 설명입니다.';
  }

  renderScore(score) {
    const scoreEl = this.elements.seoScore;
    const descEl = this.elements.scoreDesc;

    scoreEl.textContent = score;
    scoreEl.className = 'score-big';

    if (score >= 80) {
      scoreEl.classList.add('good');
      descEl.textContent = '훌륭합니다! SEO가 잘 최적화되어 있습니다.';
    } else if (score >= 50) {
      scoreEl.classList.add('average');
      descEl.textContent = '괜찮습니다. 몇 가지 개선하면 더 좋아집니다.';
    } else {
      scoreEl.classList.add('poor');
      descEl.textContent = '개선이 필요합니다. 체크리스트를 확인하세요.';
    }
  }

  setCategory(cat) {
    this.category = cat;
    document.querySelectorAll('.category-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.cat === cat);
    });
    this.renderChecks();
  }

  renderChecks() {
    const filtered = this.category === 'all'
      ? this.checks
      : this.checks.filter(c => c.category === this.category);

    const html = filtered.map(check => `
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
const seoAnalyzerTool = new SeoAnalyzerTool();
window.SeoAnalyzer = seoAnalyzerTool;

document.addEventListener('DOMContentLoaded', () => seoAnalyzerTool.init());
