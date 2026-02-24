/**
 * 학점 계산기 - ToolBase 기반
 * GPA 및 평균 학점 계산
 * @created 2026-01-13
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var GpaCalc = class GpaCalc extends ToolBase {
  constructor() {
    super('GpaCalc');
    this.scale = 4.5;
    this.rows = [];
    this.nextId = 1;

    this.gradePoints = {
      4.5: { 'A+': 4.5, 'A0': 4.0, 'B+': 3.5, 'B0': 3.0, 'C+': 2.5, 'C0': 2.0, 'D+': 1.5, 'D0': 1.0, 'F': 0 },
      4.3: { 'A+': 4.3, 'A0': 4.0, 'A-': 3.7, 'B+': 3.3, 'B0': 3.0, 'B-': 2.7, 'C+': 2.3, 'C0': 2.0, 'C-': 1.7, 'D+': 1.3, 'D0': 1.0, 'D-': 0.7, 'F': 0 },
      4.0: { 'A': 4.0, 'B': 3.0, 'C': 2.0, 'D': 1.0, 'F': 0 }
    };
  }

  init() {
    this.initElements({
      gradeList: 'gradeList',
      gpaScale: 'gpaScale',
      totalGpa: 'totalGpa',
      totalCredits: 'totalCredits',
      totalSubjects: 'totalSubjects',
      gradeLevel: 'gradeLevel',
      gradeTable: 'gradeTable'
    });

    this.loadData();
    if (this.rows.length === 0) {
      this.addRow();
      this.addRow();
      this.addRow();
    }
    this.render();
    this.renderGradeTable();

    console.log('[GpaCalc] 초기화 완료');
    return this;
  }

  loadData() {
    try {
      const saved = localStorage.getItem('gpaCalcData');
      if (saved) {
        const data = JSON.parse(saved);
        this.rows = data.rows || [];
        this.scale = data.scale || 4.5;
        this.nextId = data.nextId || 1;
      }
    } catch (e) {}
  }

  saveData() {
    localStorage.setItem('gpaCalcData', JSON.stringify({
      rows: this.rows,
      scale: this.scale,
      nextId: this.nextId
    }));
  }

  setScale(scale) {
    this.scale = scale;
    document.querySelectorAll('.scale-tab').forEach(tab => {
      tab.classList.toggle('active', parseFloat(tab.dataset.scale) === scale);
    });
    this.elements.gpaScale.textContent = `/ ${scale}`;
    this.render();
    this.renderGradeTable();
    this.saveData();
  }

  addRow() {
    this.rows.push({ id: this.nextId++, name: '', credits: 3, grade: 'A0' });
    this.render();
    this.saveData();
  }

  removeRow(id) {
    this.rows = this.rows.filter(r => r.id !== id);
    this.render();
    this.calculate();
    this.saveData();
  }

  updateRow(id, field, value) {
    const row = this.rows.find(r => r.id === id);
    if (row) {
      row[field] = field === 'credits' ? parseInt(value) || 0 : value;
      this.calculate();
      this.saveData();
    }
  }

  render() {
    const grades = Object.keys(this.gradePoints[this.scale]);

    this.elements.gradeList.innerHTML = this.rows.map(row => `
      <div class="grade-row">
        <input type="text" value="${row.name}" placeholder="과목명" onchange="gpaCalc.updateRow(${row.id}, 'name', this.value)">
        <select onchange="gpaCalc.updateRow(${row.id}, 'credits', this.value)">
          ${[1,2,3,4,5,6].map(c => `<option value="${c}" ${row.credits === c ? 'selected' : ''}>${c}학점</option>`).join('')}
        </select>
        <select onchange="gpaCalc.updateRow(${row.id}, 'grade', this.value)">
          ${grades.map(g => `<option value="${g}" ${row.grade === g ? 'selected' : ''}>${g}</option>`).join('')}
        </select>
        <button class="remove-btn" onclick="gpaCalc.removeRow(${row.id})">×</button>
      </div>
    `).join('');

    this.calculate();
  }

  calculate() {
    const points = this.gradePoints[this.scale];
    let totalPoints = 0;
    let totalCredits = 0;

    this.rows.forEach(row => {
      if (row.credits > 0 && points[row.grade] !== undefined) {
        totalPoints += row.credits * points[row.grade];
        totalCredits += row.credits;
      }
    });

    const gpa = totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : '0.00';
    const percent = totalCredits > 0 ? ((totalPoints / totalCredits) / this.scale * 100).toFixed(1) : 0;

    this.elements.totalGpa.textContent = gpa;
    this.elements.totalCredits.textContent = totalCredits;
    this.elements.totalSubjects.textContent = this.rows.length;

    // 등급 계산
    let level = '-';
    const gpaNum = parseFloat(gpa);
    if (gpaNum >= this.scale * 0.9) level = '최우등';
    else if (gpaNum >= this.scale * 0.8) level = '우등';
    else if (gpaNum >= this.scale * 0.7) level = '양호';
    else if (gpaNum >= this.scale * 0.6) level = '보통';
    else if (gpaNum > 0) level = '노력필요';

    this.elements.gradeLevel.textContent = level;
  }

  renderGradeTable() {
    const points = this.gradePoints[this.scale];
    const entries = Object.entries(points);
    const html = entries.map(([grade, point]) => `${grade}: ${point}`).join(' | ');
    this.elements.gradeTable.textContent = html;
  }
}

// 전역 인스턴스 생성
const gpaCalc = new GpaCalc();
window.GpaCalc = gpaCalc;

document.addEventListener('DOMContentLoaded', () => gpaCalc.init());
