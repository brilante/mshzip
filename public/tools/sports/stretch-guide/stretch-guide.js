/**
 * 스트레칭 가이드 - ToolBase 기반
 * 부위별 스트레칭 안내
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var StretchGuide = class StretchGuide extends ToolBase {
  constructor() {
    super('StretchGuide');
    this.timer = null;
    this.currentTime = 30;
    this.isRunning = false;
    this.currentIndex = 0;
    this.activeCategory = 'all';

    this.stretches = [
      // 목/어깨
      { id: 1, name: '목 좌우 스트레칭', bodyPart: '목', category: 'neck', duration: 30, desc: '고개를 좌우로 천천히 기울여 목 옆 근육을 이완시킵니다. 각 방향 15초씩 유지합니다.' },
      { id: 2, name: '목 앞뒤 스트레칭', bodyPart: '목', category: 'neck', duration: 30, desc: '턱을 가슴 쪽으로 당기고, 천천히 뒤로 젖힙니다. 각 동작 15초씩 유지합니다.' },
      { id: 3, name: '어깨 돌리기', bodyPart: '어깨', category: 'shoulder', duration: 30, desc: '어깨를 앞으로 5회, 뒤로 5회 크게 돌려줍니다.' },
      { id: 4, name: '어깨 스트레칭', bodyPart: '어깨', category: 'shoulder', duration: 30, desc: '한 팔을 반대쪽으로 뻗어 어깨 뒤쪽을 스트레칭합니다. 각 팔 15초씩.' },

      // 팔/손목
      { id: 5, name: '손목 스트레칭', bodyPart: '손목', category: 'arm', duration: 30, desc: '팔을 앞으로 뻗고 손끝을 위/아래로 당겨 손목을 스트레칭합니다.' },
      { id: 6, name: '삼두근 스트레칭', bodyPart: '팔', category: 'arm', duration: 30, desc: '팔꿈치를 머리 뒤로 들어올리고 반대 손으로 당깁니다. 각 팔 15초씩.' },
      { id: 7, name: '전완근 스트레칭', bodyPart: '팔', category: 'arm', duration: 30, desc: '팔을 앞으로 뻗고 손가락을 아래로 당겨 전완을 스트레칭합니다.' },

      // 등/허리
      { id: 8, name: '고양이-소 스트레칭', bodyPart: '등/허리', category: 'back', duration: 45, desc: '네 발 자세에서 등을 둥글게 말았다가 오목하게 만듭니다. 천천히 반복합니다.' },
      { id: 9, name: '아이 자세', bodyPart: '등/허리', category: 'back', duration: 45, desc: '무릎을 꿇고 앉아 상체를 앞으로 숙여 팔을 쭉 뻗습니다. 등과 어깨가 이완됩니다.' },
      { id: 10, name: '허리 비틀기', bodyPart: '허리', category: 'back', duration: 30, desc: '바닥에 누워 한쪽 무릎을 반대편으로 넘깁니다. 각 방향 15초씩.' },

      // 다리/엉덩이
      { id: 11, name: '햄스트링 스트레칭', bodyPart: '허벅지 뒤', category: 'leg', duration: 30, desc: '다리를 앞으로 뻗고 상체를 숙여 허벅지 뒤쪽을 스트레칭합니다.' },
      { id: 12, name: '대퇴사두근 스트레칭', bodyPart: '허벅지 앞', category: 'leg', duration: 30, desc: '한 발을 뒤로 들어 발목을 잡고 허벅지 앞쪽을 스트레칭합니다. 각 다리 15초씩.' },
      { id: 13, name: '비둘기 자세', bodyPart: '엉덩이', category: 'leg', duration: 45, desc: '한쪽 다리를 앞으로 접고 반대 다리를 뒤로 뻗어 엉덩이를 스트레칭합니다.' },
      { id: 14, name: '종아리 스트레칭', bodyPart: '종아리', category: 'leg', duration: 30, desc: '벽에 손을 짚고 한 발을 뒤로 빼 종아리를 늘립니다. 각 다리 15초씩.' },

      // 전신
      { id: 15, name: '전신 스트레칭', bodyPart: '전신', category: 'full', duration: 30, desc: '양손을 깍지 끼고 위로 쭉 뻗으며 온몸을 늘립니다.' },
      { id: 16, name: '옆구리 스트레칭', bodyPart: '옆구리', category: 'full', duration: 30, desc: '한 손을 위로 올리고 반대쪽으로 상체를 기울입니다. 각 방향 15초씩.' }
    ];

    this.categories = {
      all: '전체',
      neck: '목/어깨',
      shoulder: '어깨',
      arm: '팔/손목',
      back: '등/허리',
      leg: '다리',
      full: '전신'
    };
  }

  init() {
    this.initElements({
      categoryList: 'categoryList',
      stretchList: 'stretchList',
      timerStretchName: 'timerStretchName',
      timerTime: 'timerTime',
      routineProgress: 'routineProgress',
      routineTime: 'routineTime'
    });

    this.renderCategories();
    this.render();
    this.updateTimerDisplay();

    console.log('[StretchGuide] 초기화 완료');
    return this;
  }

  renderCategories() {
    this.elements.categoryList.innerHTML = Object.entries(this.categories).map(([key, name]) =>
      `<div class="category-btn ${this.activeCategory === key ? 'active' : ''}" onclick="stretchGuide.setCategory('${key}')">${name}</div>`
    ).join('');
  }

  setCategory(category) {
    this.activeCategory = category;
    this.currentIndex = 0;
    this.renderCategories();
    this.render();
  }

  getFilteredStretches() {
    if (this.activeCategory === 'all') {
      return this.stretches;
    }
    return this.stretches.filter(s => s.category === this.activeCategory);
  }

  render() {
    const list = this.elements.stretchList;
    const filtered = this.getFilteredStretches();

    list.innerHTML = filtered.map((stretch, index) => `
      <div class="stretch-card ${index === this.currentIndex ? 'active' : ''}" onclick="stretchGuide.selectStretch(${index})">
        <div class="stretch-header">
          <div>
            <div class="stretch-name">${stretch.name}</div>
            <div class="stretch-body-part">${stretch.bodyPart}</div>
          </div>
          <div class="stretch-duration">${stretch.duration}초</div>
        </div>
        <div class="stretch-desc">${stretch.desc}</div>
      </div>
    `).join('');

    this.updateRoutineInfo();
  }

  selectStretch(index) {
    const cards = document.querySelectorAll('.stretch-card');
    cards.forEach(card => card.classList.remove('expanded'));

    this.currentIndex = index;
    this.stopTimer();

    const filtered = this.getFilteredStretches();
    this.currentTime = filtered[index].duration;
    this.updateTimerDisplay();
    this.render();

    cards[index]?.classList.add('expanded');
  }

  startTimer() {
    if (this.isRunning) return;

    const filtered = this.getFilteredStretches();
    if (filtered.length === 0) return;

    this.isRunning = true;
    this.timer = setInterval(() => this.tick(), 1000);
    this.updateTimerDisplay();
  }

  pauseTimer() {
    this.isRunning = false;
    clearInterval(this.timer);
  }

  stopTimer() {
    this.pauseTimer();
    const filtered = this.getFilteredStretches();
    if (filtered[this.currentIndex]) {
      this.currentTime = filtered[this.currentIndex].duration;
    }
    this.updateTimerDisplay();
  }

  tick() {
    this.currentTime--;

    if (this.currentTime <= 3 && this.currentTime > 0) {
      this.playSound(880);
    }

    if (this.currentTime <= 0) {
      this.playSound(523);
      this.nextStretch();
    }

    this.updateTimerDisplay();
  }

  nextStretch() {
    const filtered = this.getFilteredStretches();
    this.currentIndex++;

    if (this.currentIndex >= filtered.length) {
      this.currentIndex = 0;
      this.pauseTimer();
      this.showToast('스트레칭 완료!', 'success');
    }

    this.currentTime = filtered[this.currentIndex].duration;
    this.updateTimerDisplay();
    this.render();
  }

  updateTimerDisplay() {
    const filtered = this.getFilteredStretches();
    const current = filtered[this.currentIndex];

    this.elements.timerStretchName.textContent =
      current ? current.name : '스트레칭을 선택하세요';

    const minutes = Math.floor(this.currentTime / 60);
    const seconds = this.currentTime % 60;
    this.elements.timerTime.textContent =
      `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  updateRoutineInfo() {
    const filtered = this.getFilteredStretches();
    const totalTime = filtered.reduce((sum, s) => sum + s.duration, 0);
    const totalMinutes = Math.ceil(totalTime / 60);

    this.elements.routineProgress.textContent =
      `${this.currentIndex + 1} / ${filtered.length}`;
    this.elements.routineTime.textContent =
      `총 ${totalMinutes}분`;
  }

  playSound(freq) {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {}
  }
}

// 전역 인스턴스 생성
const stretchGuide = new StretchGuide();
window.StretchGuide = stretchGuide;

document.addEventListener('DOMContentLoaded', () => stretchGuide.init());
