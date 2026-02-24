/**
 * 연봉 협상 도우미 - ToolBase 기반
 * 연봉 범위 분석 및 협상 전략
 * @created 2026-01-13
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var SalaryNegotiation = class SalaryNegotiation extends ToolBase {
  constructor() {
    super('SalaryNegotiation');
    // 직무별 기본 연봉 테이블 (신입 기준, 만원)
    this.baseSalaries = {
      tech: 4000,
      finance: 4500,
      marketing: 3500,
      design: 3500,
      sales: 3500,
      hr: 3500,
      other: 3500
    };

    // 경력 연차별 상승률
    this.expMultipliers = {
      0: 1.0,
      1: 1.1,
      2: 1.2,
      3: 1.35,
      5: 1.55,
      7: 1.75,
      10: 2.0,
      15: 2.3
    };

    // 회사 규모별 배수
    this.sizeMultipliers = {
      startup: 0.9,
      medium: 1.0,
      large: 1.15,
      conglomerate: 1.3
    };
  }

  init() {
    this.initElements({
      currentSalary: 'currentSalary',
      yearsExp: 'yearsExp',
      jobField: 'jobField',
      companySize: 'companySize',
      situation: 'situation',
      resultPanel: 'resultPanel',
      minSalary: 'minSalary',
      targetSalary: 'targetSalary',
      maxSalary: 'maxSalary',
      factorsPanel: 'factorsPanel',
      factorsList: 'factorsList',
      tipsPanel: 'tipsPanel',
      tipsList: 'tipsList',
      scriptsPanel: 'scriptsPanel',
      scriptsList: 'scriptsList'
    });

    console.log('[SalaryNegotiation] 초기화 완료');
    return this;
  }

  getExpMultiplier(years) {
    const keys = Object.keys(this.expMultipliers).map(Number).sort((a, b) => b - a);
    for (const key of keys) {
      if (years >= key) return this.expMultipliers[key];
    }
    return 1.0;
  }

  analyze() {
    const currentSalary = parseInt(this.elements.currentSalary.value) || 0;
    const yearsExp = parseInt(this.elements.yearsExp.value) || 0;
    const jobField = this.elements.jobField.value;
    const companySize = this.elements.companySize.value;
    const situation = this.elements.situation.value;

    // 시장 기준 연봉 계산
    const baseSalary = this.baseSalaries[jobField];
    const expMultiplier = this.getExpMultiplier(yearsExp);
    const sizeMultiplier = this.sizeMultipliers[companySize];

    const marketSalary = Math.round(baseSalary * expMultiplier * sizeMultiplier);

    // 현재 연봉과 시장가 비교
    const reference = currentSalary > 0 ? Math.max(currentSalary, marketSalary) : marketSalary;

    // 연봉 범위 계산
    let minSalary, targetSalary, maxSalary;

    if (situation === 'internal') {
      // 사내 협상: 보수적
      minSalary = Math.round(reference * 1.03);
      targetSalary = Math.round(reference * 1.07);
      maxSalary = Math.round(reference * 1.12);
    } else if (situation === 'offer') {
      // 오퍼 받은 상태: 적극적
      minSalary = Math.round(reference * 1.10);
      targetSalary = Math.round(reference * 1.20);
      maxSalary = Math.round(reference * 1.30);
    } else {
      // 면접 중 또는 탐색: 중간
      minSalary = Math.round(reference * 1.08);
      targetSalary = Math.round(reference * 1.15);
      maxSalary = Math.round(reference * 1.25);
    }

    // 결과 표시
    this.renderSalaryRange(minSalary, targetSalary, maxSalary);
    this.renderFactors(currentSalary, marketSalary, yearsExp, situation);
    this.renderTips(situation, companySize);
    this.renderScripts(targetSalary, currentSalary, situation);
  }

  renderSalaryRange(min, target, max) {
    this.elements.resultPanel.style.display = 'block';
    this.elements.minSalary.textContent = min.toLocaleString();
    this.elements.targetSalary.textContent = target.toLocaleString();
    this.elements.maxSalary.textContent = max.toLocaleString();
  }

  renderFactors(current, market, years, situation) {
    this.elements.factorsPanel.style.display = 'block';

    const factors = [];

    // 현재 연봉 vs 시장가
    if (current > 0) {
      if (current < market * 0.9) {
        factors.push({ label: '현재 연봉이 시장 평균 이하', impact: 'positive', desc: '협상 여지 큼' });
      } else if (current > market * 1.1) {
        factors.push({ label: '현재 연봉이 시장 평균 이상', impact: 'neutral', desc: '현실적 목표 설정 필요' });
      } else {
        factors.push({ label: '현재 연봉이 시장 평균 수준', impact: 'neutral', desc: '표준적 협상 진행' });
      }
    }

    // 경력
    if (years >= 5) {
      factors.push({ label: `${years}년 경력`, impact: 'positive', desc: '충분한 경험 보유' });
    } else if (years >= 3) {
      factors.push({ label: `${years}년 경력`, impact: 'neutral', desc: '적정 경력 수준' });
    } else {
      factors.push({ label: `${years}년 경력`, impact: 'negative', desc: '경력 보강 필요' });
    }

    // 상황
    if (situation === 'offer') {
      factors.push({ label: '오퍼 보유 상태', impact: 'positive', desc: '협상력 높음' });
    } else if (situation === 'internal') {
      factors.push({ label: '사내 협상', impact: 'negative', desc: '협상 폭 제한적' });
    }

    const html = factors.map(f => `
      <div class="factor-item">
        <div>
          <span class="factor-label">${f.label}</span>
          <span style="font-size: 0.8rem; color: var(--text-secondary); margin-left: 0.5rem;">${f.desc}</span>
        </div>
        <span class="factor-impact ${f.impact}">${f.impact === 'positive' ? '유리' : f.impact === 'negative' ? '불리' : '보통'}</span>
      </div>
    `).join('');

    this.elements.factorsList.innerHTML = html;
  }

  renderTips(situation, companySize) {
    this.elements.tipsPanel.style.display = 'block';

    const tips = [
      { title: '첫 제안은 회사가 먼저', desc: '가능하면 회사 측에서 먼저 연봉을 제안하도록 유도하세요.' },
      { title: '전체 보상 패키지 고려', desc: '기본급 외에 성과급, 스톡옵션, 복지 등 전체 패키지를 파악하세요.' },
      { title: '시간을 가지세요', desc: '즉답을 피하고 "검토 후 연락드리겠습니다"라고 말씀하세요.' },
      { title: '대안을 준비하세요', desc: '연봉 외에 재택근무, 휴가, 교육비 등으로 협상할 수 있습니다.' }
    ];

    if (situation === 'offer') {
      tips.unshift({ title: '다른 오퍼 언급', desc: '경쟁 오퍼가 있다면 적절히 언급하여 협상력을 높이세요.' });
    }

    if (companySize === 'startup') {
      tips.push({ title: '스톡옵션 협상', desc: '스타트업은 기본급 대신 스톡옵션으로 협상할 여지가 있습니다.' });
    }

    const html = tips.map(t => `
      <div class="tip-card">
        <div class="tip-title">${t.title}</div>
        <div style="font-size: 0.9rem;">${t.desc}</div>
      </div>
    `).join('');

    this.elements.tipsList.innerHTML = html;
  }

  renderScripts(target, current, situation) {
    this.elements.scriptsPanel.style.display = 'block';

    const scripts = [];

    if (situation === 'offer') {
      scripts.push(`"제안해주신 조건에 감사드립니다. 다만 제 경력과 시장 가치를 고려했을 때, ${target.toLocaleString()}만원 정도가 적정하다고 생각합니다."`);
      scripts.push(`"이 포지션에 대한 열정이 있습니다. 연봉을 조정해주신다면 바로 결정할 수 있을 것 같습니다."`);
    } else if (situation === 'internal') {
      scripts.push(`"지난 1년간 [성과]를 달성했습니다. 이러한 기여를 고려해 연봉 인상을 요청드립니다."`);
      scripts.push(`"현재 제 역할과 책임이 늘어났는데, 이에 맞는 보상 조정을 논의하고 싶습니다."`);
    } else {
      scripts.push(`"희망 연봉은 ${target.toLocaleString()}만원입니다. 제 경력과 보유 기술을 고려한 금액입니다."`);
      scripts.push(`"연봉 범위를 먼저 말씀해주시면, 그에 맞춰 논의하겠습니다."`);
    }

    scripts.push(`"기본급 조정이 어렵다면, 사이닝 보너스나 다른 형태의 보상도 검토 가능할까요?"`);

    const html = scripts.map(s => `<div class="script-box">${s}</div>`).join('');
    this.elements.scriptsList.innerHTML = html;
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const salaryNegotiation = new SalaryNegotiation();
window.SalaryNegotiation = salaryNegotiation;

document.addEventListener('DOMContentLoaded', () => salaryNegotiation.init());
