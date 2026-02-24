/**
 * 마케팅 ROI 계산기 - ToolBase 기반
 * 마케팅 투자 수익률 분석
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var MarketingROI = class MarketingROI extends ToolBase {
  constructor() {
    super('MarketingROI');
  }

  init() {
    this.initElements({
      cost: 'cost',
      otherCost: 'otherCost',
      conversions: 'conversions',
      valuePerConversion: 'valuePerConversion',
      baselineRevenue: 'baselineRevenue',
      result: 'result'
    });

    console.log('[MarketingROI] 초기화 완료');
    return this;
  }

  calculate() {
    const cost = parseFloat(this.elements.cost.value) || 0;
    const otherCost = parseFloat(this.elements.otherCost.value) || 0;
    const conversions = parseInt(this.elements.conversions.value) || 0;
    const valuePerConversion = parseFloat(this.elements.valuePerConversion.value) || 0;
    const baselineRevenue = parseFloat(this.elements.baselineRevenue.value) || 0;

    if (cost === 0) {
      this.showToast('마케팅 비용을 입력해주세요', 'error');
      return;
    }

    const totalCost = cost + otherCost;
    const grossRevenue = conversions * valuePerConversion;
    const incrementalRevenue = grossRevenue - baselineRevenue;
    const netProfit = incrementalRevenue - totalCost;
    const roi = (netProfit / totalCost) * 100;
    const roas = grossRevenue / cost;
    const cpa = conversions > 0 ? totalCost / conversions : 0;
    const breakEvenConversions = valuePerConversion > 0 ? Math.ceil(totalCost / valuePerConversion) : 0;

    this.showResult({
      roi,
      roas,
      netProfit,
      grossRevenue,
      incrementalRevenue,
      totalCost,
      cpa,
      conversions,
      breakEvenConversions
    });
  }

  showResult(data) {
    let resultClass = 'result-neutral';
    let roiLabel = 'ROI';

    if (data.roi > 0) {
      resultClass = 'result-positive';
      roiLabel = '수익';
    } else if (data.roi < 0) {
      resultClass = 'result-negative';
      roiLabel = '손실';
    }

    this.elements.result.innerHTML = `
      <div class="result-card ${resultClass}">
        <div class="roi-value">${data.roi >= 0 ? '+' : ''}${data.roi.toFixed(1)}%</div>
        <div class="roi-label">마케팅 ${roiLabel}</div>

        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-value">${data.roas.toFixed(2)}x</div>
            <div class="metric-label">ROAS</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">₩${this.formatNumber(data.netProfit)}</div>
            <div class="metric-label">순이익</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">₩${this.formatNumber(data.cpa)}</div>
            <div class="metric-label">CPA (전환당 비용)</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${data.breakEvenConversions}</div>
            <div class="metric-label">손익분기 전환 수</div>
          </div>
        </div>
      </div>

      <div class="breakdown">
        <div style="font-weight: 600; margin-bottom: 0.75rem;">상세 분석</div>
        <div class="breakdown-item">
          <span>총 마케팅 비용</span>
          <span>₩${this.formatNumber(data.totalCost)}</span>
        </div>
        <div class="breakdown-item">
          <span>총 매출</span>
          <span>₩${this.formatNumber(data.grossRevenue)}</span>
        </div>
        <div class="breakdown-item">
          <span>증분 매출</span>
          <span>₩${this.formatNumber(data.incrementalRevenue)}</span>
        </div>
        <div class="breakdown-item">
          <span>순이익</span>
          <span style="font-weight: 600; color: ${data.netProfit >= 0 ? '#22c55e' : '#ef4444'};">
            ₩${this.formatNumber(data.netProfit)}
          </span>
        </div>
        <div class="breakdown-item">
          <span>전환 수</span>
          <span>${data.conversions}건</span>
        </div>
      </div>

      <div style="margin-top: 1rem; background: var(--bg-primary); border-radius: 8px; padding: 1rem; font-size: 0.85rem;">
        <strong>지표 설명:</strong>
        <ul style="margin-top: 0.5rem; padding-left: 1.5rem; color: var(--text-secondary);">
          <li><strong>ROI</strong>: (순이익 / 비용) × 100</li>
          <li><strong>ROAS</strong>: 총 매출 / 광고 비용 (1x 이상이면 광고비 회수)</li>
          <li><strong>CPA</strong>: 전환 1건당 소요 비용</li>
        </ul>
      </div>
    `;
  }

  formatNumber(num) {
    return Math.abs(num).toLocaleString('ko-KR');
  }
}

// 전역 인스턴스 생성
const marketingROI = new MarketingROI();
window.MarketingROI = marketingROI;

// 전역 함수 (HTML onclick 호환)
function calculate() { marketingROI.calculate(); }

document.addEventListener('DOMContentLoaded', () => marketingROI.init());
