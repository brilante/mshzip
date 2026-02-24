/**
 * LinkedIn 프로필 최적화 도구 - ToolBase 기반
 * 프로필 점수 및 개선 제안
 * @created 2026-01-13
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var LinkedInOptimizer = class LinkedInOptimizer extends ToolBase {
  constructor() {
    super('LinkedInOptimizer');
    this.industryKeywords = {
      tech: ['JavaScript', 'Python', 'React', 'Node.js', 'AWS', 'Docker', 'Kubernetes', 'CI/CD', 'Agile', 'Scrum', 'DevOps', 'Machine Learning', 'AI', 'Data Science', 'Full Stack', 'Backend', 'Frontend', 'Cloud', 'API', 'Microservices'],
      marketing: ['Digital Marketing', 'SEO', 'SEM', 'Content Strategy', 'Brand Management', 'Social Media', 'Google Analytics', 'A/B Testing', 'Lead Generation', 'CRM', 'Marketing Automation', 'Campaign Management', 'ROI', 'KPI', 'Conversion Rate'],
      finance: ['Financial Analysis', 'Risk Management', 'Investment', 'Portfolio Management', 'Excel', 'Financial Modeling', 'Budgeting', 'Forecasting', 'Compliance', 'Audit', 'M&A', 'Due Diligence', 'Valuation', 'Bloomberg', 'SQL'],
      design: ['UI/UX', 'Figma', 'Adobe XD', 'Sketch', 'User Research', 'Wireframing', 'Prototyping', 'Design Thinking', 'Visual Design', 'Interaction Design', 'Responsive Design', 'Design Systems', 'A/B Testing', 'User Testing', 'Accessibility']
    };
  }

  init() {
    this.initElements({
      headline: 'headline',
      summary: 'summary',
      experienceCount: 'experienceCount',
      skillCount: 'skillCount',
      recommendationCount: 'recommendationCount',
      hasPhoto: 'hasPhoto',
      hasBanner: 'hasBanner',
      hasCustomUrl: 'hasCustomUrl',
      resultPanel: 'resultPanel',
      scoreCircle: 'scoreCircle',
      scoreNumber: 'scoreNumber',
      scoreDescription: 'scoreDescription',
      checklist: 'checklist',
      suggestionsPanel: 'suggestionsPanel',
      suggestions: 'suggestions',
      keywordsPanel: 'keywordsPanel',
      keywordTags: 'keywordTags'
    });

    console.log('[LinkedInOptimizer] 초기화 완료');
    return this;
  }

  analyze() {
    const headline = this.elements.headline.value.trim();
    const summary = this.elements.summary.value.trim();
    const experienceCount = parseInt(this.elements.experienceCount.value) || 0;
    const skillCount = parseInt(this.elements.skillCount.value) || 0;
    const recommendationCount = parseInt(this.elements.recommendationCount.value) || 0;
    const hasPhoto = this.elements.hasPhoto.checked;
    const hasBanner = this.elements.hasBanner.checked;
    const hasCustomUrl = this.elements.hasCustomUrl.checked;

    const checks = [];
    let score = 0;

    // 프로필 사진 (15점)
    if (hasPhoto) {
      score += 15;
      checks.push({ pass: true, title: '프로필 사진', desc: '프로필 사진이 설정되어 있습니다.' });
    } else {
      checks.push({ pass: false, title: '프로필 사진', desc: '프로필 사진을 추가하면 프로필 조회수가 21배 증가합니다.' });
    }

    // 배경 이미지 (5점)
    if (hasBanner) {
      score += 5;
      checks.push({ pass: true, title: '배경 이미지', desc: '배경 이미지가 설정되어 있습니다.' });
    } else {
      checks.push({ pass: false, title: '배경 이미지', desc: '전문적인 배경 이미지를 추가하세요.' });
    }

    // 헤드라인 (20점)
    if (headline.length >= 50) {
      score += 20;
      checks.push({ pass: true, title: '헤드라인', desc: `충분한 길이의 헤드라인 (${headline.length}자)` });
    } else if (headline.length >= 20) {
      score += 10;
      checks.push({ pass: false, title: '헤드라인', desc: `헤드라인이 짧습니다 (${headline.length}자). 50자 이상 권장.` });
    } else {
      checks.push({ pass: false, title: '헤드라인', desc: '키워드가 포함된 상세한 헤드라인을 작성하세요.' });
    }

    // 요약 (20점)
    if (summary.length >= 300) {
      score += 20;
      checks.push({ pass: true, title: '요약 (About)', desc: `상세한 요약 작성됨 (${summary.length}자)` });
    } else if (summary.length >= 100) {
      score += 10;
      checks.push({ pass: false, title: '요약 (About)', desc: `요약이 짧습니다 (${summary.length}자). 300자 이상 권장.` });
    } else {
      checks.push({ pass: false, title: '요약 (About)', desc: '자신을 소개하는 상세한 요약을 작성하세요.' });
    }

    // 경력 (15점)
    if (experienceCount >= 3) {
      score += 15;
      checks.push({ pass: true, title: '경력', desc: `${experienceCount}개의 경력이 등록되어 있습니다.` });
    } else if (experienceCount >= 1) {
      score += 8;
      checks.push({ pass: false, title: '경력', desc: `경력이 ${experienceCount}개 등록되어 있습니다. 3개 이상 권장.` });
    } else {
      checks.push({ pass: false, title: '경력', desc: '경력 정보를 추가하세요.' });
    }

    // 스킬 (10점)
    if (skillCount >= 10) {
      score += 10;
      checks.push({ pass: true, title: '스킬', desc: `${skillCount}개의 스킬이 등록되어 있습니다.` });
    } else if (skillCount >= 5) {
      score += 5;
      checks.push({ pass: false, title: '스킬', desc: `스킬이 ${skillCount}개 등록되어 있습니다. 10개 이상 권장.` });
    } else {
      checks.push({ pass: false, title: '스킬', desc: '관련 스킬을 추가하세요.' });
    }

    // 추천서 (10점)
    if (recommendationCount >= 3) {
      score += 10;
      checks.push({ pass: true, title: '추천서', desc: `${recommendationCount}개의 추천서가 있습니다.` });
    } else if (recommendationCount >= 1) {
      score += 5;
      checks.push({ pass: false, title: '추천서', desc: `추천서가 ${recommendationCount}개 있습니다. 3개 이상 권장.` });
    } else {
      checks.push({ pass: false, title: '추천서', desc: '동료나 상사에게 추천서를 요청하세요.' });
    }

    // 커스텀 URL (5점)
    if (hasCustomUrl) {
      score += 5;
      checks.push({ pass: true, title: '커스텀 URL', desc: '커스텀 URL이 설정되어 있습니다.' });
    } else {
      checks.push({ pass: false, title: '커스텀 URL', desc: '기억하기 쉬운 커스텀 URL을 설정하세요.' });
    }

    this.renderResults(score, checks);
    this.renderSuggestions(checks.filter(c => !c.pass));
    this.renderKeywords(headline, summary);
  }

  renderResults(score, checks) {
    this.elements.resultPanel.style.display = 'block';

    const scoreCircle = this.elements.scoreCircle;
    const scoreNumber = this.elements.scoreNumber;
    const scoreDesc = this.elements.scoreDescription;

    scoreNumber.textContent = score;

    scoreCircle.className = 'score-circle';
    if (score >= 80) {
      scoreCircle.classList.add('excellent');
      scoreDesc.innerHTML = '<strong>훌륭합니다!</strong><br>프로필이 잘 최적화되어 있습니다.';
    } else if (score >= 60) {
      scoreCircle.classList.add('good');
      scoreDesc.innerHTML = '<strong>양호합니다</strong><br>몇 가지 개선하면 더 좋아집니다.';
    } else if (score >= 40) {
      scoreCircle.classList.add('fair');
      scoreDesc.innerHTML = '<strong>보통입니다</strong><br>개선이 필요한 부분이 있습니다.';
    } else {
      scoreCircle.classList.add('poor');
      scoreDesc.innerHTML = '<strong>개선 필요</strong><br>프로필을 보완해주세요.';
    }

    const checklistHtml = checks.map(check => `
      <div class="checklist-item">
        <span class="checklist-icon">${check.pass ? '' : ''}</span>
        <div class="checklist-content">
          <div class="checklist-title">${check.title}</div>
          <div class="checklist-desc">${check.desc}</div>
        </div>
      </div>
    `).join('');

    this.elements.checklist.innerHTML = checklistHtml;
  }

  renderSuggestions(failedChecks) {
    if (failedChecks.length === 0) {
      this.elements.suggestionsPanel.style.display = 'none';
      return;
    }

    this.elements.suggestionsPanel.style.display = 'block';

    const suggestions = {
      '프로필 사진': '전문적인 헤드샷을 사용하세요. 배경은 깔끔하게, 얼굴이 화면의 60%를 차지하도록 합니다.',
      '배경 이미지': '업계와 관련된 이미지나 회사 브랜드 이미지를 사용하세요. 권장 크기: 1584×396px',
      '헤드라인': '직책 + 전문 분야 + 핵심 가치를 포함하세요. 예: "Senior Developer | React & Node.js | Building Scalable Solutions"',
      '요약 (About)': '1) 누구인지 2) 무엇을 하는지 3) 어떤 가치를 제공하는지 4) 연락 방법을 포함하세요.',
      '경력': '각 경력에 구체적인 성과와 수치를 포함하세요. 예: "매출 30% 증가에 기여"',
      '스킬': '채용 공고에서 자주 언급되는 기술 키워드를 추가하세요.',
      '추천서': '함께 일했던 동료, 상사, 클라이언트에게 추천서를 요청하세요.',
      '커스텀 URL': 'linkedin.com/in/이름 형태로 설정하면 기억하기 쉽습니다.'
    };

    const html = failedChecks.map(check => `
      <div class="suggestion-card">
        <div class="suggestion-title">${check.title} 개선하기</div>
        <div style="font-size: 0.9rem;">${suggestions[check.title] || check.desc}</div>
      </div>
    `).join('');

    this.elements.suggestions.innerHTML = html;
  }

  renderKeywords(headline, summary) {
    const text = (headline + ' ' + summary).toLowerCase();

    // 텍스트에서 관련 업계 감지
    let detectedIndustry = 'tech'; // 기본값
    if (text.includes('marketing') || text.includes('마케팅') || text.includes('seo')) {
      detectedIndustry = 'marketing';
    } else if (text.includes('finance') || text.includes('금융') || text.includes('투자')) {
      detectedIndustry = 'finance';
    } else if (text.includes('design') || text.includes('디자인') || text.includes('ux')) {
      detectedIndustry = 'design';
    }

    // 해당 업계의 키워드 중 아직 없는 것 추천
    const industryKeywords = this.industryKeywords[detectedIndustry] || this.industryKeywords.tech;
    const missingKeywords = industryKeywords.filter(kw => !text.includes(kw.toLowerCase()));

    this.elements.keywordsPanel.style.display = 'block';
    this.elements.keywordTags.innerHTML = missingKeywords.slice(0, 15).map(kw =>
      `<span class="keyword-tag">${kw}</span>`
    ).join('');
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const linkedInOptimizer = new LinkedInOptimizer();
window.LinkedInOptimizer = linkedInOptimizer;

document.addEventListener('DOMContentLoaded', () => linkedInOptimizer.init());
