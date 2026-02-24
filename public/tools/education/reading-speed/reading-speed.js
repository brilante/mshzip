/**
 * 읽기 속도 테스트 - ToolBase 기반
 * WPM 측정 및 이해도 테스트
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var ReadingSpeed = class ReadingSpeed extends ToolBase {
  constructor() {
    super('ReadingSpeed');
    this.texts = {
      easy: {
        text: '오늘은 날씨가 정말 좋습니다. 파란 하늘에 하얀 구름이 떠 있습니다. 새들이 나무에서 노래를 부릅니다. 꽃들이 예쁘게 피어 있습니다. 아이들이 공원에서 즐겁게 놀고 있습니다. 강아지도 함께 뛰어다닙니다. 모두 행복해 보입니다. 봄이 왔습니다. 따뜻한 봄날입니다.',
        questions: [
          { q: '오늘 날씨는 어떤가요?', options: ['비가 온다', '날씨가 좋다', '눈이 온다', '흐리다'], answer: 1 },
          { q: '아이들은 어디서 놀고 있나요?', options: ['집', '학교', '공원', '바다'], answer: 2 },
          { q: '어떤 계절인가요?', options: ['여름', '가을', '겨울', '봄'], answer: 3 }
        ]
      },
      medium: {
        text: '인공지능 기술은 우리 생활의 많은 부분을 변화시키고 있습니다. 스마트폰의 음성 비서부터 자율주행 자동차까지, AI는 다양한 분야에서 활용되고 있습니다. 특히 의료 분야에서는 질병 진단의 정확도를 높이는 데 큰 기여를 하고 있습니다. 교육 분야에서도 개인 맞춤형 학습이 가능해지고 있습니다. 하지만 AI 기술의 발전과 함께 일자리 변화와 윤리적 문제에 대한 논의도 필요합니다. 우리는 기술의 혜택을 누리면서도 그에 따른 책임에 대해 생각해야 합니다.',
        questions: [
          { q: 'AI가 활용되는 분야로 언급되지 않은 것은?', options: ['의료', '교육', '농업', '자율주행'], answer: 2 },
          { q: 'AI 발전과 함께 논의가 필요한 문제는?', options: ['환경 문제', '일자리 변화와 윤리', '교통 문제', '식량 문제'], answer: 1 },
          { q: '의료 분야에서 AI의 역할은?', options: ['약 배달', '질병 진단 정확도 향상', '병원 청소', '환자 운송'], answer: 1 }
        ]
      },
      hard: {
        text: '양자 컴퓨팅은 양자역학의 원리를 활용하여 정보를 처리하는 혁신적인 기술입니다. 기존의 고전 컴퓨터가 비트를 사용하여 0 또는 1의 상태만을 표현하는 것과 달리, 양자 컴퓨터는 큐비트를 사용하여 중첩과 얽힘이라는 양자역학적 현상을 활용합니다. 이를 통해 특정 유형의 문제에서는 기존 컴퓨터보다 기하급수적으로 빠른 계산이 가능합니다. 현재 암호 해독, 신약 개발, 물류 최적화 등의 분야에서 양자 컴퓨팅의 잠재력이 연구되고 있습니다. 그러나 양자 상태의 불안정성과 오류 수정 문제 등 아직 해결해야 할 기술적 과제가 많습니다.',
        questions: [
          { q: '양자 컴퓨터가 사용하는 정보 단위는?', options: ['비트', '바이트', '큐비트', '기가비트'], answer: 2 },
          { q: '양자역학적 현상으로 언급된 것은?', options: ['중력과 마찰', '중첩과 얽힘', '열과 압력', '자기장과 전기장'], answer: 1 },
          { q: '양자 컴퓨팅의 기술적 과제는?', options: ['전력 소비', '크기 문제', '양자 상태 불안정성', '소음 문제'], answer: 2 }
        ]
      }
    };

    this.currentLevel = 'medium';
    this.currentText = null;
    this.wordCount = 0;
    this.startTime = null;
    this.endTime = null;
    this.interval = null;
    this.isRunning = false;
  }

  init() {
    this.initElements({
      levelSelect: 'levelSelect',
      wordCount: 'wordCount',
      textContent: 'textContent',
      startBtn: 'startBtn',
      finishBtn: 'finishBtn',
      timerDisplay: 'timerDisplay',
      resultPanel: 'resultPanel',
      wpmResult: 'wpmResult',
      timeResult: 'timeResult',
      comprehensionSection: 'comprehensionSection',
      comprehensionResult: 'comprehensionResult'
    });

    this.loadText();

    console.log('[ReadingSpeed] 초기화 완료');
    return this;
  }

  loadText() {
    this.currentLevel = this.elements.levelSelect.value;
    this.currentText = this.texts[this.currentLevel];
    this.wordCount = this.currentText.text.split(/\s+/).length;

    this.elements.wordCount.textContent = `${this.wordCount} 단어`;
    this.elements.textContent.textContent = '시작 버튼을 눌러 테스트를 시작하세요.';
    this.elements.textContent.classList.remove('blur');
  }

  start() {
    this.isRunning = true;
    this.startTime = Date.now();

    this.elements.textContent.textContent = this.currentText.text;
    this.elements.startBtn.style.display = 'none';
    this.elements.finishBtn.style.display = 'block';
    this.elements.resultPanel.style.display = 'none';

    this.interval = setInterval(() => this.updateTimer(), 1000);
  }

  updateTimer() {
    const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    this.elements.timerDisplay.textContent =
      `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  finish() {
    this.isRunning = false;
    this.endTime = Date.now();
    clearInterval(this.interval);

    const elapsedSeconds = (this.endTime - this.startTime) / 1000;
    const elapsedMinutes = elapsedSeconds / 60;
    const wpm = Math.round(this.wordCount / elapsedMinutes);

    this.elements.wpmResult.textContent = wpm;
    this.elements.timeResult.textContent = Math.round(elapsedSeconds) + '초';
    this.elements.textContent.classList.add('blur');
    this.elements.finishBtn.style.display = 'none';
    this.elements.resultPanel.style.display = 'block';

    this.showComprehension();
  }

  showComprehension() {
    this.elements.comprehensionSection.innerHTML = '<div style="font-weight: 600; margin-bottom: 1rem;">이해도 테스트</div>';

    this.currentText.questions.forEach((q, i) => {
      this.elements.comprehensionSection.innerHTML += `
        <div class="question" data-index="${i}">
          <div class="question-text">${i + 1}. ${q.q}</div>
          <div class="options">
            ${q.options.map((opt, j) => `
              <div class="option" data-question="${i}" data-option="${j}" onclick="readingSpeed.selectOption(${i}, ${j})">${opt}</div>
            `).join('')}
          </div>
        </div>
      `;
    });

    this.elements.comprehensionSection.innerHTML += `
      <button class="tool-btn tool-btn-primary" style="width: 100%; margin-top: 1rem;" onclick="readingSpeed.checkAnswers()">
        정답 확인
      </button>
    `;
  }

  selectOption(questionIndex, optionIndex) {
    document.querySelectorAll(`.option[data-question="${questionIndex}"]`).forEach(opt => {
      opt.classList.remove('selected');
    });
    document.querySelector(`.option[data-question="${questionIndex}"][data-option="${optionIndex}"]`).classList.add('selected');
  }

  checkAnswers() {
    let correct = 0;
    const questions = this.currentText.questions;

    questions.forEach((q, i) => {
      const selected = document.querySelector(`.option[data-question="${i}"].selected`);
      const correctOption = document.querySelector(`.option[data-question="${i}"][data-option="${q.answer}"]`);

      correctOption.classList.add('correct');

      if (selected) {
        const selectedIndex = parseInt(selected.dataset.option);
        if (selectedIndex === q.answer) {
          correct++;
        } else {
          selected.classList.add('wrong');
        }
      }
    });

    const comprehension = Math.round((correct / questions.length) * 100);
    this.elements.comprehensionResult.textContent = comprehension + '%';

    // 버튼 비활성화
    document.querySelectorAll('.option').forEach(opt => {
      opt.style.pointerEvents = 'none';
    });

    this.showToast(`이해도: ${comprehension}% (${correct}/${questions.length})`, correct === questions.length ? 'success' : 'info');
  }

  reset() {
    this.isRunning = false;
    clearInterval(this.interval);
    this.loadText();

    this.elements.timerDisplay.textContent = '00:00';
    this.elements.startBtn.style.display = 'block';
    this.elements.finishBtn.style.display = 'none';
    this.elements.resultPanel.style.display = 'none';
    this.elements.comprehensionResult.textContent = '0%';
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const readingSpeed = new ReadingSpeed();
window.ReadingSpeed = readingSpeed;

document.addEventListener('DOMContentLoaded', () => readingSpeed.init());
