/**
 * 나무 심기 계산기 - ToolBase 기반
 * 탄소 상쇄에 필요한 나무 계산
 * @created 2026-01-13
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class TreePlanting extends ToolBase {
  constructor() {
    super('TreePlanting');
    this.selectedTree = 'pine';

    this.trees = {
      pine: { name: '소나무', icon: '', co2PerYear: 14, area: 25, cost: 3000 },
      oak: { name: '참나무', icon: '', co2PerYear: 22, area: 30, cost: 5000 },
      ginkgo: { name: '은행나무', icon: '', co2PerYear: 18, area: 20, cost: 4000 },
      cherry: { name: '벚나무', icon: '', co2PerYear: 12, area: 15, cost: 6000 },
      bamboo: { name: '대나무', icon: '', co2PerYear: 35, area: 5, cost: 2000 },
      willow: { name: '버드나무', icon: '', co2PerYear: 20, area: 35, cost: 4500 }
    };
  }

  init() {
    this.initElements({
      co2Input: 'co2Input',
      treeTypes: 'treeTypes',
      treesNeeded: 'treesNeeded',
      co2Absorbed: 'co2Absorbed',
      o2Produced: 'o2Produced',
      areaNeeded: 'areaNeeded',
      costEstimate: 'costEstimate',
      forestVisual: 'forestVisual'
    });

    this.renderTreeTypes();
    this.calculate();

    console.log('[TreePlanting] 초기화 완료');
    return this;
  }

  renderTreeTypes() {
    this.elements.treeTypes.innerHTML = Object.entries(this.trees).map(([key, tree]) =>
      `<div class="tree-card ${key === this.selectedTree ? 'selected' : ''}" onclick="treePlanting.selectTree('${key}')">
        <div class="tree-icon">${tree.icon}</div>
        <div class="tree-name">${tree.name}</div>
        <div class="tree-co2">${tree.co2PerYear}kg CO₂/년</div>
      </div>`
    ).join('');
  }

  selectTree(type) {
    this.selectedTree = type;
    this.renderTreeTypes();
    this.calculate();
  }

  calculate() {
    const co2 = parseFloat(this.elements.co2Input.value) || 0;
    const tree = this.trees[this.selectedTree];

    const treesNeeded = Math.ceil(co2 / tree.co2PerYear);
    const co2Absorbed = treesNeeded * tree.co2PerYear;
    const o2Produced = Math.round(co2Absorbed * 0.73);
    const areaNeeded = treesNeeded * tree.area;
    const costEstimate = (treesNeeded * tree.cost) / 10000;

    this.elements.treesNeeded.textContent = treesNeeded;
    this.elements.co2Absorbed.textContent = co2Absorbed.toLocaleString();
    this.elements.o2Produced.textContent = o2Produced.toLocaleString();
    this.elements.areaNeeded.textContent = areaNeeded.toLocaleString();
    this.elements.costEstimate.textContent = costEstimate.toFixed(1);

    this.renderForest(treesNeeded);
  }

  renderForest(count) {
    const tree = this.trees[this.selectedTree];
    const displayCount = Math.min(count, 50);

    if (count === 0) {
      this.elements.forestVisual.innerHTML = '<span style="color: var(--text-secondary);">나무를 심어보세요</span>';
      return;
    }

    const treeEmojis = Object.values(this.trees).map(t => t.icon);
    let html = '';

    for (let i = 0; i < displayCount; i++) {
      const randomTree = treeEmojis[Math.floor(Math.random() * treeEmojis.length)];
      html += `<span class="mini-tree" style="animation-delay: ${i * 0.05}s">${randomTree}</span>`;
    }

    if (count > 50) {
      html += `<span style="color: var(--text-secondary); margin-left: 0.5rem;">+${count - 50}그루</span>`;
    }

    this.elements.forestVisual.innerHTML = html;
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const treePlanting = new TreePlanting();
window.TreePlanting = treePlanting;

document.addEventListener('DOMContentLoaded', () => treePlanting.init());
