/**
 * 의사결정 매트릭스 - ToolBase 기반
 * 가중치 기반 옵션 비교
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var DecisionMatrix = class DecisionMatrix extends ToolBase {
  constructor() {
    super('DecisionMatrix');
    this.criteria = [
      { name: '비용', weight: 3 },
      { name: '품질', weight: 5 },
      { name: '시간', weight: 4 }
    ];
    this.options = ['옵션 A', '옵션 B', '옵션 C'];
    this.scores = {};
  }

  init() {
    this.initElements({
      criteriaList: 'criteriaList',
      optionList: 'optionList',
      matrixContainer: 'matrixContainer',
      result: 'result'
    });

    this.renderCriteria();
    this.renderOptions();
    this.renderMatrix();

    console.log('[DecisionMatrix] 초기화 완료');
    return this;
  }

  renderCriteria() {
    this.elements.criteriaList.innerHTML = this.criteria.map((c, idx) => `
      <div class="criteria-row">
        <input type="text" class="tool-input" value="${c.name}" onchange="decisionMatrix.updateCriteria(${idx}, 'name', this.value)" style="flex: 1;">
        <input type="number" class="tool-input" value="${c.weight}" min="1" max="10" onchange="decisionMatrix.updateCriteria(${idx}, 'weight', this.value)" style="width: 80px;" title="가중치 (1-10)">
        <button onclick="decisionMatrix.removeCriteria(${idx})" style="background: none; border: none; cursor: pointer;"></button>
      </div>
    `).join('');
  }

  renderOptions() {
    this.elements.optionList.innerHTML = this.options.map((opt, idx) => `
      <div class="option-row">
        <input type="text" class="tool-input" value="${opt}" onchange="decisionMatrix.updateOption(${idx}, this.value)" style="flex: 1;">
        <button onclick="decisionMatrix.removeOption(${idx})" style="background: none; border: none; cursor: pointer;"></button>
      </div>
    `).join('');
  }

  renderMatrix() {
    if (this.criteria.length === 0 || this.options.length === 0) {
      this.elements.matrixContainer.innerHTML = '';
      return;
    }

    let html = `
      <table class="matrix-table">
        <thead>
          <tr>
            <th>기준 (가중치)</th>
            ${this.options.map(opt => `<th>${opt}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
    `;

    this.criteria.forEach((c, cIdx) => {
      html += `<tr>
        <td><strong>${c.name}</strong> (×${c.weight})</td>
        ${this.options.map((opt, oIdx) => {
          const key = `${cIdx}-${oIdx}`;
          const value = this.scores[key] || 5;
          return `<td>
            <input type="number" min="1" max="10" value="${value}"
              onchange="decisionMatrix.updateScore('${key}', this.value)">
          </td>`;
        }).join('')}
      </tr>`;
    });

    html += `</tbody></table>
      <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.5rem;">
        * 각 점수는 1-10 사이로 입력 (10 = 최고)
      </div>
    `;

    this.elements.matrixContainer.innerHTML = html;
  }

  addCriteria() {
    this.criteria.push({ name: `기준 ${this.criteria.length + 1}`, weight: 3 });
    this.renderCriteria();
    this.renderMatrix();
  }

  removeCriteria(idx) {
    this.criteria.splice(idx, 1);
    this.renderCriteria();
    this.renderMatrix();
  }

  updateCriteria(idx, field, value) {
    if (field === 'weight') {
      this.criteria[idx].weight = parseInt(value) || 1;
    } else {
      this.criteria[idx].name = value;
    }
    this.renderMatrix();
  }

  addOption() {
    this.options.push(`옵션 ${this.options.length + 1}`);
    this.renderOptions();
    this.renderMatrix();
  }

  removeOption(idx) {
    this.options.splice(idx, 1);
    this.renderOptions();
    this.renderMatrix();
  }

  updateOption(idx, value) {
    this.options[idx] = value;
    this.renderMatrix();
  }

  updateScore(key, value) {
    this.scores[key] = Math.min(10, Math.max(1, parseInt(value) || 5));
  }

  calculate() {
    if (this.criteria.length === 0 || this.options.length === 0) {
      this.showToast('기준과 옵션을 추가해주세요', 'error');
      return;
    }

    const results = this.options.map((opt, oIdx) => {
      let totalScore = 0;
      let maxPossible = 0;

      this.criteria.forEach((c, cIdx) => {
        const key = `${cIdx}-${oIdx}`;
        const score = this.scores[key] || 5;
        totalScore += score * c.weight;
        maxPossible += 10 * c.weight;
      });

      return {
        name: opt,
        score: totalScore,
        maxPossible,
        percentage: Math.round((totalScore / maxPossible) * 100)
      };
    });

    results.sort((a, b) => b.score - a.score);
    this.showResult(results);
  }

  showResult(results) {
    const winner = results[0];

    this.elements.result.innerHTML = `
      <div class="result-card">
        <div>최적의 선택</div>
        <div class="winner-name">${winner.name}</div>
        <div class="winner-score">${winner.score}점 (${winner.percentage}%)</div>
      </div>

      <div class="ranking">
        <div style="font-weight: 600; margin-bottom: 0.75rem;">전체 순위</div>
        ${results.map((r, idx) => `
          <div class="ranking-item">
            <span>${idx + 1}. ${r.name}</span>
            <span><strong>${r.score}</strong>점 (${r.percentage}%)</span>
          </div>
        `).join('')}
      </div>

      <div style="margin-top: 1rem; font-size: 0.85rem; color: var(--text-secondary);">
        * 가중치가 높은 기준일수록 결과에 더 큰 영향을 미칩니다.
      </div>
    `;
  }
}

// 전역 인스턴스 생성
const decisionMatrix = new DecisionMatrix();
window.DecisionMatrix = decisionMatrix;

// 전역 함수 (HTML onclick 호환)
function addCriteria() { decisionMatrix.addCriteria(); }
function addOption() { decisionMatrix.addOption(); }
function calculate() { decisionMatrix.calculate(); }

document.addEventListener('DOMContentLoaded', () => decisionMatrix.init());
