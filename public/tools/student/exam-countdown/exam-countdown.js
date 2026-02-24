/**
 * 시험 D-Day - ToolBase 기반
 * 시험 일정 카운트다운
 * @created 2026-01-13
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var ExamCountdown = class ExamCountdown extends ToolBase {
  constructor() {
    super('ExamCountdown');
    this.exams = [];
    this.intervalId = null;

    this.motivations = [
      '오늘 하루 최선을 다하면 내일이 달라집니다.',
      '노력은 배신하지 않습니다.',
      '지금 흘리는 땀이 미래의 열매가 됩니다.',
      '포기하지 않으면 실패도 없습니다.',
      '꿈을 향해 한 걸음씩 나아가세요.',
      '할 수 있다고 믿으면 반은 이룬 것입니다.',
      '어려울수록 더 빛나는 법입니다.',
      '시작이 반입니다. 오늘도 파이팅!'
    ];
  }

  init() {
    this.initElements({
      examName: 'examName',
      examDate: 'examDate',
      examList: 'examList',
      motivationQuote: 'motivationQuote'
    });

    this.loadData();
    this.render();
    this.startTimer();
    this.showMotivation();

    console.log('[ExamCountdown] 초기화 완료');
    return this;
  }

  loadData() {
    try {
      const saved = localStorage.getItem('examCountdownData');
      if (saved) {
        this.exams = JSON.parse(saved);
      }
    } catch (e) {}
  }

  saveData() {
    localStorage.setItem('examCountdownData', JSON.stringify(this.exams));
  }

  addExam() {
    const name = this.elements.examName.value.trim();
    const dateStr = this.elements.examDate.value;

    if (!name || !dateStr) {
      this.showToast('시험명과 날짜를 입력해주세요', 'error');
      return;
    }

    this.exams.push({
      id: Date.now(),
      name,
      date: new Date(dateStr).toISOString()
    });

    this.exams.sort((a, b) => new Date(a.date) - new Date(b.date));
    this.saveData();
    this.render();

    this.elements.examName.value = '';
    this.elements.examDate.value = '';

    this.showToast('시험이 추가되었습니다', 'success');
  }

  deleteExam(id) {
    if (!confirm('이 시험을 삭제할까요?')) return;
    this.exams = this.exams.filter(e => e.id !== id);
    this.saveData();
    this.render();
  }

  startTimer() {
    this.intervalId = setInterval(() => this.updateCountdowns(), 1000);
  }

  getTimeRemaining(targetDate) {
    const now = new Date();
    const target = new Date(targetDate);
    const diff = target - now;

    if (diff <= 0) {
      return { passed: true, days: 0, hours: 0, minutes: 0, seconds: 0 };
    }

    return {
      passed: false,
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((diff % (1000 * 60)) / 1000)
    };
  }

  updateCountdowns() {
    this.exams.forEach(exam => {
      const time = this.getTimeRemaining(exam.date);
      const ddayEl = document.getElementById(`dday-${exam.id}`);
      const timeEl = document.getElementById(`time-${exam.id}`);

      if (ddayEl) {
        if (time.passed) {
          ddayEl.textContent = 'D-Day 지남';
        } else if (time.days === 0) {
          ddayEl.textContent = 'D-Day!';
        } else {
          ddayEl.textContent = `D-${time.days}`;
        }
      }

      if (timeEl && !time.passed) {
        timeEl.innerHTML = `
          <div class="time-box"><div class="time-value">${time.days}</div><div class="time-label">일</div></div>
          <div class="time-box"><div class="time-value">${time.hours}</div><div class="time-label">시간</div></div>
          <div class="time-box"><div class="time-value">${time.minutes}</div><div class="time-label">분</div></div>
          <div class="time-box"><div class="time-value">${time.seconds}</div><div class="time-label">초</div></div>
        `;
      }
    });
  }

  render() {
    if (this.exams.length === 0) {
      this.elements.examList.innerHTML = '<div class="exam-empty">등록된 시험이 없습니다</div>';
      return;
    }

    this.elements.examList.innerHTML = this.exams.map(exam => {
      const date = new Date(exam.date);
      const dateStr = `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
      const time = this.getTimeRemaining(exam.date);

      return `<div class="exam-card" style="${time.passed ? 'opacity: 0.6;' : ''}">
        <div class="exam-name">${exam.name}</div>
        <div class="exam-date">${dateStr}</div>
        <div class="exam-dday" id="dday-${exam.id}">${time.passed ? 'D-Day 지남' : time.days === 0 ? 'D-Day!' : `D-${time.days}`}</div>
        <div class="exam-time-grid" id="time-${exam.id}">
          <div class="time-box"><div class="time-value">${time.days}</div><div class="time-label">일</div></div>
          <div class="time-box"><div class="time-value">${time.hours}</div><div class="time-label">시간</div></div>
          <div class="time-box"><div class="time-value">${time.minutes}</div><div class="time-label">분</div></div>
          <div class="time-box"><div class="time-value">${time.seconds}</div><div class="time-label">초</div></div>
        </div>
        <div class="exam-actions">
          <button class="btn-delete" onclick="examCountdown.deleteExam(${exam.id})">삭제</button>
        </div>
      </div>`;
    }).join('');
  }

  showMotivation() {
    const quote = this.motivations[Math.floor(Math.random() * this.motivations.length)];
    this.elements.motivationQuote.textContent = `"${quote}"`;
  }
}

// 전역 인스턴스 생성
const examCountdown = new ExamCountdown();
window.ExamCountdown = examCountdown;

document.addEventListener('DOMContentLoaded', () => examCountdown.init());
