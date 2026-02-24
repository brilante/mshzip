/**
 * A/B 테스트 계산기 - ToolBase 기반
 * 통계적 유의성 검증
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var ABTestCalc = class ABTestCalc extends ToolBase {
  constructor() {
    super('ABTestCalc');
  }

  init() {
    this.initElements({
      visitorsA: 'visitorsA',
      conversionsA: 'conversionsA',
      visitorsB: 'visitorsB',
      conversionsB: 'conversionsB',
      confidence: 'confidence',
      result: 'result'
    });

    console.log('[ABTestCalc] 초기화 완료');
    return this;
  }

  calculate() {
    const visitorsA = parseInt(this.elements.visitorsA.value) || 0;
    const conversionsA = parseInt(this.elements.conversionsA.value) || 0;
    const visitorsB = parseInt(this.elements.visitorsB.value) || 0;
    const conversionsB = parseInt(this.elements.conversionsB.value) || 0;
    const confidenceLevel = parseFloat(this.elements.confidence.value);

    if (visitorsA === 0 || visitorsB === 0) {
      this.showToast('방문자 수를 입력해주세요', 'error');
      return;
    }

    if (conversionsA > visitorsA || conversionsB > visitorsB) {
      this.showToast('전환 수는 방문자 수보다 클 수 없습니다', 'error');
      return;
    }

    const rateA = conversionsA / visitorsA;
    const rateB = conversionsB / visitorsB;

    // Z-검정 계산
    const pooledRate = (conversionsA + conversionsB) / (visitorsA + visitorsB);
    const standardError = Math.sqrt(pooledRate * (1 - pooledRate) * (1 / visitorsA + 1 / visitorsB));
    const zScore = (rateB - rateA) / standardError;

    // p-value 계산 (양측 검정)
    const pValue = 2 * (1 - this.normalCDF(Math.abs(zScore)));

    // 통계적 유의성 판단
    const alpha = 1 - confidenceLevel;
    const isSignificant = pValue < alpha;

    // 상대적 개선율
    const improvement = ((rateB - rateA) / rateA) * 100;

    this.showResult({
      rateA,
      rateB,
      improvement,
      zScore,
      pValue,
      isSignificant,
      confidenceLevel,
      visitorsA,
      visitorsB
    });
  }

  // 표준정규분포 누적분포함수 근사
  normalCDF(x) {
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x) / Math.sqrt(2);

    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return 0.5 * (1.0 + sign * y);
  }

  showResult(data) {
    let resultClass = 'result-nodata';
    let resultTitle = '데이터 부족';
    let resultDesc = '더 많은 데이터가 필요합니다';
    let winner = '';

    if (data.visitorsA >= 100 && data.visitorsB >= 100) {
      if (data.isSignificant) {
        resultClass = 'result-winner';
        winner = data.rateB > data.rateA ? 'B' : 'A';
        resultTitle = `변형 ${winner} 승리!`;
        resultDesc = `통계적으로 유의미한 차이가 있습니다 (${(data.confidenceLevel * 100).toFixed(0)}% 신뢰수준)`;
      } else {
        resultClass = 'result-inconclusive';
        resultTitle = '결론 없음';
        resultDesc = '통계적으로 유의미한 차이가 없습니다';
      }
    }

    const totalA = (data.rateA / (data.rateA + data.rateB) * 100) || 50;
    const totalB = 100 - totalA;

    this.elements.result.innerHTML = `
      <div class="result-card ${resultClass}">
        <div style="font-size: 1.5rem; font-weight: 700; margin-bottom: 0.5rem;">${resultTitle}</div>
        <div style="opacity: 0.9;">${resultDesc}</div>

        <div class="stat-grid">
          <div class="stat-item">
            <div class="stat-value">${(data.rateA * 100).toFixed(2)}%</div>
            <div class="stat-label">A 전환율</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${(data.rateB * 100).toFixed(2)}%</div>
            <div class="stat-label">B 전환율</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${data.improvement >= 0 ? '+' : ''}${data.improvement.toFixed(1)}%</div>
            <div class="stat-label">상대적 변화</div>
          </div>
        </div>
      </div>

      <div class="comparison">
        <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 0.5rem;">
          <span>🅰A: ${(data.rateA * 100).toFixed(2)}%</span>
          <span>🅱B: ${(data.rateB * 100).toFixed(2)}%</span>
        </div>
        <div class="bar-container">
          <div class="bar-a" style="width: ${totalA}%">${totalA.toFixed(0)}%</div>
          <div class="bar-b" style="width: ${totalB}%">${totalB.toFixed(0)}%</div>
        </div>
      </div>

      <div style="margin-top: 1rem; background: var(--bg-primary); border-radius: 8px; padding: 1rem; font-size: 0.85rem;">
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem;">
          <div><strong>Z-점수:</strong> ${data.zScore.toFixed(4)}</div>
          <div><strong>P-값:</strong> ${data.pValue.toFixed(4)}</div>
          <div><strong>신뢰 수준:</strong> ${(data.confidenceLevel * 100).toFixed(0)}%</div>
          <div><strong>유의 수준:</strong> ${((1 - data.confidenceLevel) * 100).toFixed(0)}%</div>
        </div>
      </div>
    `;
  }
}

// 전역 인스턴스 생성
const abTestCalc = new ABTestCalc();
window.ABTestCalc = abTestCalc;

// 전역 함수 (HTML onclick 호환)
function calculate() { abTestCalc.calculate(); }

document.addEventListener('DOMContentLoaded', () => abTestCalc.init());
