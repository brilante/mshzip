/**
 * 학점 계산기 (GPA Calculator) - ToolBase 기반
 * 과목별 학점과 성적을 입력하여 평균 평점을 계산
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var GpaCalc = class GpaCalc extends ToolBase {
  constructor() {
    super('GpaCalc');
    this.subjectCount = 0;
    this.gradeSystems = {
      '4.5': {
        'A+': 4.5, 'A0': 4.0, 'B+': 3.5, 'B0': 3.0,
        'C+': 2.5, 'C0': 2.0, 'D+': 1.5, 'D0': 1.0, 'F': 0.0
      },
      '4.3': {
        'A+': 4.3, 'A0': 4.0, 'A-': 3.7, 'B+': 3.3, 'B0': 3.0, 'B-': 2.7,
        'C+': 2.3, 'C0': 2.0, 'C-': 1.7, 'D+': 1.3, 'D0': 1.0, 'D-': 0.7, 'F': 0.0
      },
      '4.0': {
        'A': 4.0, 'B': 3.0, 'C': 2.0, 'D': 1.0, 'F': 0.0
      }
    };
  }

  init() {
    this.initElements({
      subjectsBody: 'subjectsBody',
      resultSection: 'resultSection',
      gpaValue: 'gpaValue',
      gpaMax: 'gpaMax',
      gpaStatus: 'gpaStatus',
      totalCredits: 'totalCredits',
      totalPoints: 'totalPoints',
      percentage: 'percentage'
    });

    // 초기 3개 과목 추가
    for (let i = 0; i < 3; i++) {
      this.addSubject();
    }

    console.log('[GpaCalc] 초기화 완료');
    return this;
  }

  getCurrentSystem() {
    return document.querySelector('input[name="gradeSystem"]:checked').value;
  }

  changeSystem() {
    const system = this.getCurrentSystem();
    const grades = this.gradeSystems[system];

    // 성적 선택 옵션 업데이트
    document.querySelectorAll('.grade-select').forEach(select => {
      const currentValue = select.value;
      select.innerHTML = '<option value="">성적 선택</option>';
      Object.keys(grades).forEach(grade => {
        const option = document.createElement('option');
        option.value = grade;
        option.textContent = `${grade} (${grades[grade]})`;
        select.appendChild(option);
      });
      if (grades[currentValue] !== undefined) {
        select.value = currentValue;
      }
    });

    // 성적표 업데이트
    this.updateGradeTable();

    // 결과가 있으면 재계산
    if (this.elements.resultSection.style.display !== 'none') {
      this.calculate();
    }
  }

  updateGradeTable() {
    const system = this.getCurrentSystem();
    const grades = this.gradeSystems[system];
    const tbody = document.querySelector('#gradeTable tbody');
    const thead = document.querySelector('#gradeTable thead tr');

    thead.innerHTML = `<th>등급</th><th>점수 (${system})</th><th>백분율</th>`;

    const percentages = {
      'A+': '95~100%', 'A0': '90~94%', 'A-': '87~89%',
      'B+': '85~86%', 'B0': '80~84%', 'B-': '77~79%',
      'C+': '75~76%', 'C0': '70~74%', 'C-': '67~69%',
      'D+': '65~66%', 'D0': '60~64%', 'D-': '57~59%',
      'A': '90~100%', 'B': '80~89%', 'C': '70~79%', 'D': '60~69%',
      'F': '0~59%'
    };

    tbody.innerHTML = Object.entries(grades).map(([grade, point]) =>
      `<tr><td>${grade}</td><td>${point}</td><td>${percentages[grade] || '-'}</td></tr>`
    ).join('');
  }

  addSubject() {
    this.subjectCount++;
    const system = this.getCurrentSystem();
    const grades = this.gradeSystems[system];

    const gradeOptions = Object.keys(grades).map(grade =>
      `<option value="${grade}">${grade} (${grades[grade]})</option>`
    ).join('');

    const row = document.createElement('tr');
    row.id = `subject-${this.subjectCount}`;
    row.innerHTML = `
      <td><input type="text" class="subject-name" placeholder="과목명"></td>
      <td>
        <select class="credit-select">
          <option value="1">1학점</option>
          <option value="2">2학점</option>
          <option value="3" selected>3학점</option>
          <option value="4">4학점</option>
        </select>
      </td>
      <td>
        <select class="grade-select">
          <option value="">성적 선택</option>
          ${gradeOptions}
        </select>
      </td>
      <td>
        <button class="delete-btn" onclick="gpaCalc.removeSubject(${this.subjectCount})"></button>
      </td>
    `;

    this.elements.subjectsBody.appendChild(row);
  }

  removeSubject(id) {
    const row = document.getElementById(`subject-${id}`);
    if (row) {
      row.remove();
    }

    // 최소 1개 과목 유지
    if (document.querySelectorAll('#subjectsBody tr').length === 0) {
      this.addSubject();
    }
  }

  calculate() {
    const system = this.getCurrentSystem();
    const grades = this.gradeSystems[system];
    const rows = document.querySelectorAll('#subjectsBody tr');

    let totalCredits = 0;
    let totalPoints = 0;
    let validSubjects = 0;

    rows.forEach(row => {
      const credit = parseInt(row.querySelector('.credit-select').value);
      const gradeValue = row.querySelector('.grade-select').value;

      if (gradeValue && grades[gradeValue] !== undefined) {
        totalCredits += credit;
        totalPoints += credit * grades[gradeValue];
        validSubjects++;
      }
    });

    if (validSubjects === 0) {
      this.showError('최소 1개 이상의 과목에 성적을 입력해주세요.');
      return;
    }

    const gpa = totalCredits > 0 ? totalPoints / totalCredits : 0;
    const maxGpa = parseFloat(system);
    const percentage = (gpa / maxGpa * 100).toFixed(1);

    // 결과 표시
    this.elements.gpaValue.textContent = gpa.toFixed(2);
    this.elements.gpaMax.textContent = `/ ${system}`;
    this.elements.totalCredits.textContent = totalCredits;
    this.elements.totalPoints.textContent = totalPoints.toFixed(2);
    this.elements.percentage.textContent = `${percentage}%`;

    // 상태 메시지
    const ratio = gpa / maxGpa;

    if (ratio >= 0.9) {
      this.elements.gpaStatus.textContent = '최우등 (Summa Cum Laude)';
      this.elements.gpaStatus.className = 'gpa-status excellent';
    } else if (ratio >= 0.8) {
      this.elements.gpaStatus.textContent = '우등 (Magna Cum Laude)';
      this.elements.gpaStatus.className = 'gpa-status good';
    } else if (ratio >= 0.7) {
      this.elements.gpaStatus.textContent = '우수 (Cum Laude)';
      this.elements.gpaStatus.className = 'gpa-status average';
    } else if (ratio >= 0.5) {
      this.elements.gpaStatus.textContent = '보통';
      this.elements.gpaStatus.className = 'gpa-status below';
    } else {
      this.elements.gpaStatus.textContent = '학사 경고 주의';
      this.elements.gpaStatus.className = 'gpa-status warning';
    }

    this.elements.resultSection.style.display = 'block';
    this.elements.resultSection.scrollIntoView({ behavior: 'smooth' });
  }

  reset() {
    this.elements.subjectsBody.innerHTML = '';
    this.elements.resultSection.style.display = 'none';
    this.subjectCount = 0;

    // 초기 3개 과목 추가
    for (let i = 0; i < 3; i++) {
      this.addSubject();
    }

    this.showToast('초기화되었습니다.', 'info');
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const gpaCalc = new GpaCalc();
window.GpaCalc = gpaCalc;

document.addEventListener('DOMContentLoaded', () => gpaCalc.init());
