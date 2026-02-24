/**
 * 성적 예측기 - ToolBase 기반
 * 최종 성적 예측 및 목표 점수 계산
 * @created 2026-01-13
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var GradePredictor = class GradePredictor extends ToolBase {
  constructor() {
    super('GradePredictor');
    this.items = [];
  }

  init() {
    this.initElements({
      itemName: 'itemName',
      itemWeight: 'itemWeight',
      itemScore: 'itemScore',
      gradeList: 'gradeList',
      totalWeight: 'totalWeight',
      remainWeight: 'remainWeight',
      currentAvg: 'currentAvg',
      predictedGrade: 'predictedGrade',
      gradeEstimate: 'gradeEstimate',
      targetScore: 'targetScore',
      neededScore: 'neededScore'
    });

    this.loadData();
    this.render();
    this.calculate();

    console.log('[GradePredictor] 초기화 완료');
    return this;
  }

  loadData() {
    try {
      const saved = localStorage.getItem('gradePredictorData');
      if (saved) {
        this.items = JSON.parse(saved);
      }
    } catch (e) {}
  }

  saveData() {
    localStorage.setItem('gradePredictorData', JSON.stringify(this.items));
  }

  addItem() {
    const name = this.elements.itemName.value.trim();
    const weight = parseFloat(this.elements.itemWeight.value);
    const score = parseFloat(this.elements.itemScore.value);

    if (!name) {
      this.showToast('항목명을 입력해주세요', 'error');
      return;
    }
    if (isNaN(weight) || weight <= 0 || weight > 100) {
      this.showToast('비중은 1~100 사이 값을 입력해주세요', 'error');
      return;
    }
    if (isNaN(score) || score < 0 || score > 100) {
      this.showToast('점수는 0~100 사이 값을 입력해주세요', 'error');
      return;
    }

    const totalWeight = this.items.reduce((sum, item) => sum + item.weight, 0);
    if (totalWeight + weight > 100) {
      this.showToast('총 비중이 100%를 초과합니다', 'error');
      return;
    }

    this.items.push({ id: Date.now(), name, weight, score });
    this.saveData();
    this.render();
    this.calculate();

    this.elements.itemName.value = '';
    this.elements.itemScore.value = '';

    this.showToast('항목이 추가되었습니다', 'success');
  }

  deleteItem(id) {
    this.items = this.items.filter(item => item.id !== id);
    this.saveData();
    this.render();
    this.calculate();
  }

  render() {
    if (this.items.length === 0) {
      this.elements.gradeList.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 1rem;">성적 항목을 추가해주세요</div>';
      return;
    }

    this.elements.gradeList.innerHTML = this.items.map(item => `
      <div class="grade-item">
        <div class="grade-info">
          <span class="grade-name">${item.name}</span>
          <span class="grade-detail">비중 ${item.weight}% · ${item.score}점</span>
        </div>
        <button class="btn-delete" onclick="gradePredictor.deleteItem(${item.id})">삭제</button>
      </div>
    `).join('');
  }

  calculate() {
    const totalWeight = this.items.reduce((sum, item) => sum + item.weight, 0);
    const weightedSum = this.items.reduce((sum, item) => sum + (item.score * item.weight), 0);
    const remainWeight = 100 - totalWeight;

    let currentAvg = totalWeight > 0 ? (weightedSum / totalWeight) : 0;
    let predictedGrade = totalWeight > 0 ? (weightedSum / 100) : 0;

    if (remainWeight > 0 && totalWeight > 0) {
      const assumedRemain = currentAvg;
      predictedGrade = (weightedSum + (assumedRemain * remainWeight)) / 100;
    }

    this.elements.totalWeight.textContent = `${totalWeight}%`;
    this.elements.remainWeight.textContent = `${remainWeight}%`;
    this.elements.currentAvg.textContent = totalWeight > 0 ? currentAvg.toFixed(1) : '-';
    this.elements.predictedGrade.textContent = totalWeight > 0 ? predictedGrade.toFixed(1) : '-';
    this.elements.gradeEstimate.textContent = this.getGradeLetter(predictedGrade);

    this.calcNeeded();
  }

  getGradeLetter(score) {
    if (score >= 95) return 'A+';
    if (score >= 90) return 'A0';
    if (score >= 85) return 'B+';
    if (score >= 80) return 'B0';
    if (score >= 75) return 'C+';
    if (score >= 70) return 'C0';
    if (score >= 65) return 'D+';
    if (score >= 60) return 'D0';
    return 'F';
  }

  calcNeeded() {
    const targetInput = this.elements.targetScore.value;
    const neededEl = this.elements.neededScore;

    if (!targetInput) {
      neededEl.textContent = '-';
      return;
    }

    const target = parseFloat(targetInput);
    const totalWeight = this.items.reduce((sum, item) => sum + item.weight, 0);
    const weightedSum = this.items.reduce((sum, item) => sum + (item.score * item.weight), 0);
    const remainWeight = 100 - totalWeight;

    if (remainWeight <= 0) {
      neededEl.textContent = '완료';
      return;
    }

    const needed = ((target * 100) - weightedSum) / remainWeight;

    if (needed > 100) {
      neededEl.textContent = '불가';
      neededEl.style.color = '#ef4444';
    } else if (needed < 0) {
      neededEl.textContent = '달성';
      neededEl.style.color = '#22c55e';
    } else {
      neededEl.textContent = needed.toFixed(1);
      neededEl.style.color = 'var(--primary)';
    }
  }
}

// 전역 인스턴스 생성
const gradePredictor = new GradePredictor();
window.GradePredictor = gradePredictor;

document.addEventListener('DOMContentLoaded', () => gradePredictor.init());
