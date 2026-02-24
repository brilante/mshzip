/**
 * 계약서 분석기 - ToolBase 기반
 * 계약서 주요 조항 분석
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var ContractAnalyzer = class ContractAnalyzer extends ToolBase {
  constructor() {
    super('ContractAnalyzer');

    this.patterns = {
      warning: [
        { pattern: /무한\s*책임|무제한\s*책임/g, title: '무한 책임 조항', desc: '책임 한도가 명시되지 않아 위험할 수 있습니다.' },
        { pattern: /일방적\s*해지|즉시\s*해지/g, title: '일방적 해지 조항', desc: '상대방이 일방적으로 계약을 해지할 수 있는 조항입니다.' },
        { pattern: /위약금.*100%|전액\s*배상/g, title: '과도한 위약금', desc: '위약금이 과도하게 설정되어 있을 수 있습니다.' },
        { pattern: /모든\s*권리.*양도|저작권.*전부.*이전/g, title: '전면적 권리 양도', desc: '모든 권리를 양도하는 조항이 포함되어 있습니다.' },
        { pattern: /경쟁\s*금지.*무기한|영구.*경업금지/g, title: '무기한 경쟁금지', desc: '경쟁금지 기간이 무기한으로 설정되어 있습니다.' }
      ],
      caution: [
        { pattern: /자동\s*갱신|자동\s*연장/g, title: '자동 갱신 조항', desc: '계약이 자동으로 갱신될 수 있습니다. 해지 조건을 확인하세요.' },
        { pattern: /비밀유지.*\d+년|기밀.*\d+년/g, title: '장기 비밀유지', desc: '비밀유지 기간을 확인하세요.' },
        { pattern: /손해배상|배상\s*책임/g, title: '손해배상 조항', desc: '배상 범위와 한도를 확인하세요.' },
        { pattern: /지식\s*재산|특허|저작권/g, title: '지적재산권 조항', desc: '지적재산권의 귀속을 명확히 확인하세요.' },
        { pattern: /관할.*법원|준거법/g, title: '관할/준거법', desc: '분쟁 시 적용되는 법률과 관할 법원을 확인하세요.' },
        { pattern: /제3자.*제공|정보.*공유/g, title: '제3자 정보 제공', desc: '정보가 제3자에게 제공될 수 있는 조항입니다.' }
      ],
      info: [
        { pattern: /계약\s*기간|유효\s*기간/g, title: '계약 기간', desc: '계약의 유효 기간이 명시되어 있습니다.' },
        { pattern: /결제|대금|보수|수수료/g, title: '대금 조항', desc: '결제/대금 관련 조항이 포함되어 있습니다.' },
        { pattern: /해지|종료|만료/g, title: '해지/종료 조항', desc: '계약 해지/종료 관련 조항이 있습니다.' },
        { pattern: /의무|책임|역할/g, title: '의무 사항', desc: '당사자의 의무가 명시되어 있습니다.' }
      ]
    };
  }

  init() {
    this.initElements({
      contractText: 'contractText',
      totalClauses: 'totalClauses',
      warningCount: 'warningCount',
      cautionCount: 'cautionCount',
      okCount: 'okCount',
      analysisResults: 'analysisResults'
    });

    console.log('[ContractAnalyzer] 초기화 완료');
    return this;
  }

  analyze() {
    const text = this.elements.contractText.value.trim();

    if (!text) {
      this.showToast('계약서 내용을 입력해주세요', 'error');
      return;
    }

    const results = [];
    let warningCount = 0;
    let cautionCount = 0;
    let okCount = 0;

    // 경고 패턴 분석
    this.patterns.warning.forEach(item => {
      if (item.pattern.test(text)) {
        results.push({ type: 'warning', ...item });
        warningCount++;
      }
    });

    // 주의 패턴 분석
    this.patterns.caution.forEach(item => {
      if (item.pattern.test(text)) {
        results.push({ type: 'caution', ...item });
        cautionCount++;
      }
    });

    // 정보 패턴 분석
    this.patterns.info.forEach(item => {
      if (item.pattern.test(text)) {
        results.push({ type: 'info', ...item });
        okCount++;
      }
    });

    // 조항 수 계산 (제X조 패턴)
    const clauseMatches = text.match(/제\s*\d+\s*조/g);
    const totalClauses = clauseMatches ? clauseMatches.length : 0;

    // 통계 업데이트
    this.elements.totalClauses.textContent = totalClauses;
    this.elements.warningCount.textContent = warningCount;
    this.elements.cautionCount.textContent = cautionCount;
    this.elements.okCount.textContent = okCount;

    // 결과 렌더링
    const container = this.elements.analysisResults;

    if (results.length === 0) {
      container.innerHTML = `
        <div class="result-item result-ok">
          <div class="result-title">특이사항 없음</div>
          <div class="result-desc">주요 위험 요소가 발견되지 않았습니다. 다만, 전문가 검토를 권장합니다.</div>
        </div>
      `;
    } else {
      container.innerHTML = results.map(r => `
        <div class="result-item result-${r.type}">
          <div class="result-title">
            ${r.type === 'warning' ? '' : r.type === 'caution' ? '' : 'ℹ'} ${r.title}
          </div>
          <div class="result-desc">${r.desc}</div>
        </div>
      `).join('');
    }

    // 추가 권장사항
    container.innerHTML += `
      <div class="result-item" style="background: var(--bg-secondary); margin-top: 1rem;">
        <div class="result-title">검토 권장사항</div>
        <div class="result-desc">
          • 계약 당사자 정보가 정확한지 확인하세요<br>
          • 서명 전 전문가(변호사) 검토를 권장합니다<br>
          • 모든 조항을 꼼꼼히 읽어보세요
        </div>
      </div>
    `;

    this.showToast('분석이 완료되었습니다', 'success');
  }
}

// 전역 인스턴스 생성
const contractAnalyzer = new ContractAnalyzer();
window.ContractAnalyzer = contractAnalyzer;

// 전역 함수 (HTML onclick 호환)
function analyze() { contractAnalyzer.analyze(); }

document.addEventListener('DOMContentLoaded', () => contractAnalyzer.init());
