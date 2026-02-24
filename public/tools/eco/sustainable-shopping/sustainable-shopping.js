/**
 * 지속가능 쇼핑 - ToolBase 기반
 * 친환경 소비 체크리스트
 * @created 2026-01-13
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class SustainableShopping extends ToolBase {
  constructor() {
    super('SustainableShopping');
    this.checkedItems = {};

    this.checklists = {
      preBuy: [
        { id: 'pb1', text: '정말 필요한 물건인지 생각했나요?', impact: '+10' },
        { id: 'pb2', text: '기존에 가진 것으로 대체할 수 없나요?', impact: '+10' },
        { id: 'pb3', text: '중고로 구매할 수 있나요?', impact: '+15' },
        { id: 'pb4', text: '품질이 좋아 오래 쓸 수 있나요?', impact: '+10' },
        { id: 'pb5', text: '수리 가능한 제품인가요?', impact: '+10' }
      ],
      inStore: [
        { id: 'is1', text: '장바구니/에코백을 가져왔나요?', impact: '+5' },
        { id: 'is2', text: '과대포장 제품을 피했나요?', impact: '+10' },
        { id: 'is3', text: '로컬/국내산 제품을 선택했나요?', impact: '+10' },
        { id: 'is4', text: '친환경 인증 마크를 확인했나요?', impact: '+5' },
        { id: 'is5', text: '리필 제품을 선택했나요?', impact: '+10' }
      ],
      packaging: [
        { id: 'pk1', text: '비닐 포장을 거절했나요?', impact: '+5' },
        { id: 'pk2', text: '묶음 배송을 선택했나요?', impact: '+10' },
        { id: 'pk3', text: '재활용 가능 포장인가요?', impact: '+5' },
        { id: 'pk4', text: '에코 포장 옵션을 선택했나요?', impact: '+5' }
      ]
    };

    this.alternatives = [
      { bad: '비닐봉지', good: '장바구니', reason: '연간 300개 비닐 절약' },
      { bad: '일회용 컵', good: '텀블러', reason: '연간 500개 컵 절약' },
      { bad: '새 의류', good: '중고 의류', reason: 'CO₂ 82% 감소' },
      { bad: '일반 세제', good: '리필 세제', reason: '플라스틱 80% 감소' },
      { bad: '일반 배송', good: '묶음 배송', reason: '배송 탄소 30% 감소' },
      { bad: '해외 직구', good: '국내 제품', reason: '운송 탄소 대폭 감소' }
    ];
  }

  init() {
    this.initElements({
      preBuyChecklist: 'preBuyChecklist',
      inStoreChecklist: 'inStoreChecklist',
      packagingChecklist: 'packagingChecklist',
      alternativesList: 'alternativesList',
      scoreValue: 'scoreValue',
      scoreText: 'scoreText'
    });

    this.loadData();
    this.render();
    this.updateScore();

    console.log('[SustainableShopping] 초기화 완료');
    return this;
  }

  loadData() {
    try {
      const saved = localStorage.getItem('sustainableShoppingData');
      if (saved) {
        this.checkedItems = JSON.parse(saved);
      }
    } catch (e) {}
  }

  saveData() {
    localStorage.setItem('sustainableShoppingData', JSON.stringify(this.checkedItems));
  }

  toggleItem(id) {
    this.checkedItems[id] = !this.checkedItems[id];
    this.saveData();
    this.render();
    this.updateScore();
  }

  renderChecklist(items, containerId) {
    const container = this.elements[containerId];
    container.innerHTML = items.map(item => {
      const checked = this.checkedItems[item.id];
      return `<div class="checklist-item ${checked ? 'checked' : ''}" onclick="sustainableShopping.toggleItem('${item.id}')">
        <div class="check-box">${checked ? '' : ''}</div>
        <span class="item-text">${item.text}</span>
        <span class="item-impact">${item.impact}</span>
      </div>`;
    }).join('');
  }

  renderAlternatives() {
    this.elements.alternativesList.innerHTML = this.alternatives.map(alt =>
      `<div class="alternative-card">
        <div class="alt-header">
          <span class="alt-bad">${alt.bad}</span>
          <span class="alt-arrow">→</span>
          <span class="alt-good">${alt.good}</span>
        </div>
        <div class="alt-reason">${alt.reason}</div>
      </div>`
    ).join('');
  }

  updateScore() {
    const allItems = [...this.checklists.preBuy, ...this.checklists.inStore, ...this.checklists.packaging];
    let score = 0;

    allItems.forEach(item => {
      if (this.checkedItems[item.id]) {
        score += parseInt(item.impact.replace('+', ''));
      }
    });

    const maxScore = allItems.reduce((sum, item) => sum + parseInt(item.impact.replace('+', '')), 0);
    const percent = Math.round((score / maxScore) * 100);

    this.elements.scoreValue.textContent = percent;

    let text = '';
    if (percent === 0) text = '체크리스트를 확인해보세요';
    else if (percent < 30) text = '조금 더 노력해보세요! ';
    else if (percent < 60) text = '좋은 시작이에요! ';
    else if (percent < 90) text = '훌륭해요! ';
    else text = '완벽한 친환경 쇼퍼! ';

    this.elements.scoreText.textContent = text;
  }

  render() {
    this.renderChecklist(this.checklists.preBuy, 'preBuyChecklist');
    this.renderChecklist(this.checklists.inStore, 'inStoreChecklist');
    this.renderChecklist(this.checklists.packaging, 'packagingChecklist');
    this.renderAlternatives();
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const sustainableShopping = new SustainableShopping();
window.SustainableShopping = sustainableShopping;

document.addEventListener('DOMContentLoaded', () => sustainableShopping.init());
