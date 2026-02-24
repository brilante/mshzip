/**
 * 발달 이정표 - ToolBase 기반
 * 아기 발달 단계 체크
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var Milestone = class Milestone extends ToolBase {
  constructor() {
    super('Milestone');
    this.category = 'all';
    this.completed = {};
    this.ageMonths = 0;

    this.milestones = [
      // 운동 발달
      { id: 'm1', cat: 'motor', month: 1, title: '머리 들기', desc: '엎드린 자세에서 머리를 잠시 들 수 있음' },
      { id: 'm2', cat: 'motor', month: 2, title: '손 펴기', desc: '주먹을 펴고 손가락을 움직임' },
      { id: 'm3', cat: 'motor', month: 3, title: '목 가누기', desc: '목을 완전히 가눌 수 있음' },
      { id: 'm4', cat: 'motor', month: 4, title: '뒤집기', desc: '엎드린 자세에서 뒤집기 시작' },
      { id: 'm5', cat: 'motor', month: 6, title: '앉기', desc: '지지 없이 앉을 수 있음' },
      { id: 'm6', cat: 'motor', month: 8, title: '기어다니기', desc: '배밀이 또는 기어다니기 시작' },
      { id: 'm7', cat: 'motor', month: 10, title: '잡고 서기', desc: '가구를 잡고 일어설 수 있음' },
      { id: 'm8', cat: 'motor', month: 12, title: '첫 걸음', desc: '한두 발자국 걸음마 시작' },

      // 인지 발달
      { id: 'c1', cat: 'cognitive', month: 2, title: '물체 추적', desc: '움직이는 물체를 눈으로 따라감' },
      { id: 'c2', cat: 'cognitive', month: 4, title: '손-눈 협응', desc: '물체를 잡으려고 손을 뻗음' },
      { id: 'c3', cat: 'cognitive', month: 6, title: '원인과 결과', desc: '행동의 결과를 이해하기 시작' },
      { id: 'c4', cat: 'cognitive', month: 8, title: '대상 영속성', desc: '숨긴 물체를 찾으려 함' },
      { id: 'c5', cat: 'cognitive', month: 10, title: '모방하기', desc: '간단한 동작을 따라함' },
      { id: 'c6', cat: 'cognitive', month: 12, title: '도구 사용', desc: '간단한 도구 사용 시도' },

      // 언어 발달
      { id: 'l1', cat: 'language', month: 2, title: '옹알이', desc: '모음 소리 내기 시작' },
      { id: 'l2', cat: 'language', month: 4, title: '웃음소리', desc: '소리 내어 웃음' },
      { id: 'l3', cat: 'language', month: 6, title: '자음 옹알이', desc: '바바, 마마 등 자음 소리' },
      { id: 'l4', cat: 'language', month: 9, title: '이름에 반응', desc: '자신의 이름에 반응함' },
      { id: 'l5', cat: 'language', month: 12, title: '첫 단어', desc: '의미 있는 첫 단어 사용' },
      { id: 'l6', cat: 'language', month: 12, title: '제스처 사용', desc: '가리키기, 손 흔들기' },

      // 사회성 발달
      { id: 's1', cat: 'social', month: 2, title: '사회적 미소', desc: '사람을 보고 미소 짓기' },
      { id: 's2', cat: 'social', month: 4, title: '얼굴 인식', desc: '익숙한 얼굴과 낯선 얼굴 구분' },
      { id: 's3', cat: 'social', month: 6, title: '낯가림', desc: '낯선 사람에 대한 불안 시작' },
      { id: 's4', cat: 'social', month: 8, title: '분리불안', desc: '부모와 떨어짐에 불안해함' },
      { id: 's5', cat: 'social', month: 10, title: '까꿍놀이', desc: '까꿍놀이에 반응하고 즐거워함' },
      { id: 's6', cat: 'social', month: 12, title: '애착 형성', desc: '특정 양육자에 대한 선호 표현' }
    ];

    this.catNames = {
      motor: '운동',
      cognitive: '인지',
      language: '언어',
      social: '사회성'
    };
  }

  init() {
    this.initElements({
      birthDate: 'birthDate',
      ageDisplay: 'ageDisplay',
      progressPercent: 'progressPercent',
      progressFill: 'progressFill',
      milestoneList: 'milestoneList'
    });

    this.loadData();

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    this.elements.birthDate.value = sixMonthsAgo.toISOString().split('T')[0];

    this.calculate();

    console.log('[Milestone] 초기화 완료');
    return this;
  }

  loadData() {
    const saved = localStorage.getItem('milestoneCompleted');
    if (saved) {
      this.completed = JSON.parse(saved);
    }
  }

  saveData() {
    localStorage.setItem('milestoneCompleted', JSON.stringify(this.completed));
  }

  setCategory(cat) {
    this.category = cat;
    document.querySelectorAll('.category-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.cat === cat);
    });
    this.render();
  }

  calculate() {
    const birthDate = this.elements.birthDate.value;
    if (!birthDate) return;

    const birth = new Date(birthDate);
    const now = new Date();
    const months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
    this.ageMonths = Math.max(0, months);

    this.elements.ageDisplay.textContent = this.ageMonths + '개월';
    this.render();
    this.updateProgress();
  }

  toggleComplete(id) {
    if (this.completed[id]) {
      delete this.completed[id];
    } else {
      this.completed[id] = new Date().toISOString();
    }
    this.saveData();
    this.render();
    this.updateProgress();
  }

  updateProgress() {
    const relevant = this.milestones.filter(m => m.month <= this.ageMonths + 3);
    const done = relevant.filter(m => this.completed[m.id]).length;
    const percent = relevant.length > 0 ? Math.round((done / relevant.length) * 100) : 0;

    this.elements.progressPercent.textContent = percent + '%';
    this.elements.progressFill.style.width = percent + '%';
  }

  render() {
    let filtered = this.milestones.filter(m => m.month <= this.ageMonths + 3);

    if (this.category !== 'all') {
      filtered = filtered.filter(m => m.cat === this.category);
    }

    if (filtered.length === 0) {
      this.elements.milestoneList.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 2rem;">해당 항목이 없습니다</div>';
      return;
    }

    // 월령순 정렬
    filtered.sort((a, b) => a.month - b.month);

    this.elements.milestoneList.innerHTML = filtered.map(m => {
      const isDone = !!this.completed[m.id];
      const isPast = m.month <= this.ageMonths;

      return `<div class="milestone-item" style="${!isPast ? 'opacity: 0.6;' : ''}">
        <div class="milestone-check ${isDone ? 'done' : ''}" onclick="milestone.toggleComplete('${m.id}')">
          ${isDone ? '' : ''}
        </div>
        <div class="milestone-content">
          <div class="milestone-title">${m.title}</div>
          <div class="milestone-desc">${m.desc}</div>
          <div class="milestone-age">${this.catNames[m.cat]} · ${m.month}개월</div>
        </div>
      </div>`;
    }).join('');
  }
}

// 전역 인스턴스 생성
const milestone = new Milestone();
window.Milestone = milestone;

// 전역 함수 (HTML onclick 호환)
function setCategory(cat) { milestone.setCategory(cat); }
function calculate() { milestone.calculate(); }

document.addEventListener('DOMContentLoaded', () => milestone.init());
