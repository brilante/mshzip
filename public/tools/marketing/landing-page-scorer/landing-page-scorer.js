/**
 * 랜딩 페이지 점수 - ToolBase 기반
 * 전환율 최적화 체크리스트
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var LandingScorer = class LandingScorer extends ToolBase {
  constructor() {
    super('LandingScorer');
    this.categories = {
      headline: {
        name: '헤드라인/카피',
        items: [
          { id: 'clear-headline', label: '명확한 가치 제안 헤드라인', weight: 10 },
          { id: 'benefit-focused', label: '혜택 중심 서브헤드라인', weight: 8 },
          { id: 'scannable', label: '스캔하기 쉬운 불릿포인트', weight: 6 }
        ]
      },
      cta: {
        name: 'CTA (행동 유도)',
        items: [
          { id: 'visible-cta', label: '눈에 띄는 CTA 버튼', weight: 10 },
          { id: 'action-text', label: '행동 지향적 버튼 텍스트', weight: 8 },
          { id: 'multiple-cta', label: '여러 위치에 CTA 배치', weight: 6 }
        ]
      },
      trust: {
        name: '신뢰 요소',
        items: [
          { id: 'testimonials', label: '고객 후기/증언', weight: 8 },
          { id: 'social-proof', label: '사회적 증거 (숫자, 로고)', weight: 8 },
          { id: 'guarantee', label: '환불 보장/보증', weight: 6 }
        ]
      },
      design: {
        name: '디자인/UX',
        items: [
          { id: 'clean-design', label: '깔끔한 레이아웃', weight: 7 },
          { id: 'mobile-friendly', label: '모바일 최적화', weight: 9 },
          { id: 'fast-load', label: '빠른 로딩 속도', weight: 8 }
        ]
      },
      content: {
        name: '콘텐츠',
        items: [
          { id: 'hero-image', label: '관련성 높은 이미지/비디오', weight: 7 },
          { id: 'no-nav', label: '최소한의 네비게이션', weight: 5 },
          { id: 'form-simple', label: '간단한 폼 (최소 필드)', weight: 7 }
        ]
      }
    };
  }

  init() {
    this.initElements({
      checklist: 'checklist',
      result: 'result'
    });

    this.renderChecklist();

    console.log('[LandingScorer] 초기화 완료');
    return this;
  }

  renderChecklist() {
    let html = '';

    Object.entries(this.categories).forEach(([catId, category]) => {
      category.items.forEach(item => {
        html += `
          <label class="checklist-item" for="${item.id}" onclick="landingScorer.toggleItem(this)">
            <input type="checkbox" id="${item.id}" data-weight="${item.weight}" data-category="${catId}">
            <span>${item.label}</span>
          </label>
        `;
      });
    });

    this.elements.checklist.innerHTML = html;
  }

  toggleItem(element) {
    element.classList.toggle('checked');
  }

  calculate() {
    const checkboxes = document.querySelectorAll('#checklist input[type="checkbox"]');
    let totalWeight = 0;
    let earnedWeight = 0;
    const categoryScores = {};

    // 카테고리별 점수 초기화
    Object.keys(this.categories).forEach(cat => {
      categoryScores[cat] = { earned: 0, total: 0 };
    });

    checkboxes.forEach(cb => {
      const weight = parseInt(cb.dataset.weight);
      const category = cb.dataset.category;

      totalWeight += weight;
      categoryScores[category].total += weight;

      if (cb.checked) {
        earnedWeight += weight;
        categoryScores[category].earned += weight;
      }
    });

    const overallScore = Math.round((earnedWeight / totalWeight) * 100);
    const predictedConversion = this.predictConversion(overallScore);

    this.showResult(overallScore, predictedConversion, categoryScores);
  }

  predictConversion(score) {
    // 점수에 따른 예상 전환율 (1-10% 범위)
    return 1 + (score / 100) * 9;
  }

  getResultClass(score) {
    if (score >= 80) return 'excellent';
    if (score >= 60) return 'good';
    if (score >= 40) return 'average';
    return 'poor';
  }

  getResultLabel(score) {
    if (score >= 80) return '우수한 랜딩 페이지';
    if (score >= 60) return '좋은 랜딩 페이지';
    if (score >= 40) return '개선 필요';
    return '최적화 필요';
  }

  showResult(score, conversion, categoryScores) {
    const recommendations = this.getRecommendations(categoryScores);

    this.elements.result.innerHTML = `
      <div class="result-card result-${this.getResultClass(score)}">
        <div class="score-value">${score}점</div>
        <div class="score-label">${this.getResultLabel(score)}</div>

        <div class="category-scores">
          ${Object.entries(categoryScores).map(([catId, scores]) => {
            const catScore = scores.total > 0 ? Math.round((scores.earned / scores.total) * 100) : 0;
            return `
              <div class="category-card">
                <div class="category-value">${catScore}%</div>
                <div class="category-label">${this.categories[catId].name}</div>
              </div>
            `;
          }).join('')}
          <div class="category-card">
            <div class="category-value">${conversion.toFixed(1)}%</div>
            <div class="category-label">예상 전환율</div>
          </div>
        </div>
      </div>

      ${recommendations.length > 0 ? `
        <div class="recommendations">
          <div style="font-weight: 600; margin-bottom: 0.75rem;">개선 권장사항</div>
          <ul style="padding-left: 1.5rem; font-size: 0.9rem;">
            ${recommendations.map(r => `<li style="margin-bottom: 0.5rem;">${r}</li>`).join('')}
          </ul>
        </div>
      ` : ''}

      <div style="margin-top: 1rem; background: var(--bg-primary); border-radius: 8px; padding: 1rem; font-size: 0.85rem;">
        <strong>벤치마크:</strong>
        <ul style="margin-top: 0.5rem; padding-left: 1.5rem; color: var(--text-secondary);">
          <li>평균 랜딩 페이지 전환율: 2-5%</li>
          <li>상위 25% 랜딩 페이지: 5-10%</li>
          <li>최상위 10%: 10% 이상</li>
        </ul>
      </div>
    `;
  }

  getRecommendations(categoryScores) {
    const recommendations = [];
    const checkboxes = document.querySelectorAll('#checklist input[type="checkbox"]:not(:checked)');

    // 체크되지 않은 높은 가중치 항목 추천
    const unchecked = Array.from(checkboxes)
      .map(cb => ({
        id: cb.id,
        weight: parseInt(cb.dataset.weight),
        label: cb.parentElement.querySelector('span').textContent
      }))
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 3);

    unchecked.forEach(item => {
      recommendations.push(`<strong>${item.label}</strong>을(를) 추가하세요 (영향도: 높음)`);
    });

    // 카테고리별 낮은 점수 개선 권장
    Object.entries(categoryScores).forEach(([catId, scores]) => {
      const catScore = scores.total > 0 ? (scores.earned / scores.total) * 100 : 0;
      if (catScore < 50) {
        recommendations.push(`${this.categories[catId].name} 영역을 집중적으로 개선하세요`);
      }
    });

    return recommendations.slice(0, 5);
  }
}

// 전역 인스턴스 생성
const landingScorer = new LandingScorer();
window.LandingScorer = landingScorer;

// 전역 함수 (HTML onclick 호환)
function calculate() { landingScorer.calculate(); }

document.addEventListener('DOMContentLoaded', () => landingScorer.init());
