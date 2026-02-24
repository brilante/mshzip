/**
 * 진실 또는 대담 - ToolBase 기반
 * 파티 게임용 질문/미션 생성기
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class TruthOrDare extends ToolBase {
  constructor() {
    super('TruthOrDare');
    this.mode = 'truth';
    this.level = 'mild';
    this.players = [];
    this.currentPlayerIndex = 0;
    this.history = [];
    this.usedQuestions = { truth: new Set(), dare: new Set() };

    this.questions = {
      truth: {
        mild: [
          '가장 좋아하는 음식은 무엇인가요?',
          '어렸을 때 장래희망은 무엇이었나요?',
          '가장 좋아하는 영화는?',
          '버킷리스트에 있는 것 하나는?',
          '가장 최근에 운 적은 언제인가요?',
          '가장 부끄러웠던 순간은?',
          '가장 자랑스러운 순간은?',
          '숨겨둔 취미가 있나요?'
        ],
        medium: [
          '짝사랑한 적 있나요? 누구였나요?',
          '가장 후회하는 일은?',
          '거짓말한 적 있나요? 무슨 내용이었나요?',
          '몰래 한 적 있는 일은?',
          '가장 황당했던 실수는?',
          '첫사랑 이야기를 해주세요',
          '부모님께 숨기는 비밀이 있나요?',
          '가장 무서웠던 경험은?'
        ],
        spicy: [
          '가장 창피한 비밀은?',
          '진심으로 싫어하는 사람이 있나요?',
          '가장 큰 실패는?',
          '아무도 모르는 나만의 비밀은?',
          '이 자리에 있는 사람 중 제일 매력적인 사람은?',
          '거짓말로 얻은 것이 있나요?',
          '가장 미친 짓을 한 적은?',
          '후회하는 연애 경험은?'
        ]
      },
      dare: {
        mild: [
          '재미있는 춤을 30초간 추세요',
          '이상한 목소리로 자기소개를 하세요',
          '양옆 사람에게 칭찬을 하세요',
          '가장 좋아하는 노래를 불러주세요',
          '우스꽝스러운 표정을 지어보세요',
          '10초 동안 눈 깜빡이지 않기',
          '동물 흉내를 내보세요',
          '혼자 박수치며 환호하기'
        ],
        medium: [
          '옆 사람 어깨 마사지 해주기',
          'SNS에 이상한 셀카 올리기',
          '가장 창피한 춤 30초',
          '모르는 사람에게 가서 인사하기',
          '아이유 노래 열창하기',
          '갑자기 엎드려 팔굽혀펴기 10개',
          '옆 사람 손 잡고 1분간 눈 마주치기',
          '지금 기분을 랩으로 표현하기'
        ],
        spicy: [
          '좋아하는 사람에게 전화해서 칭찬하기',
          '옆 사람 볼에 뽀뽀하기',
          '다음 라운드까지 반말하기',
          'SNS 스토리에 방금 찍은 사진 올리기',
          '가장 창피한 포즈로 사진 찍기',
          '벌칙주 원샷하기',
          '10초간 이상한 외침하기',
          '다음 차례까지 아기처럼 말하기'
        ]
      }
    };

    this.customQuestions = JSON.parse(localStorage.getItem('todCustom') || '{"truth":{"mild":[],"medium":[],"spicy":[]},"dare":{"mild":[],"medium":[],"spicy":[]}}');
  }

  init() {
    this.initElements({
      drawBtn: 'drawBtn',
      playerInput: 'playerInput',
      addPlayerBtn: 'addPlayerBtn',
      playerList: 'playerList',
      currentPlayer: 'currentPlayer',
      questionCard: 'questionCard',
      questionType: 'questionType',
      questionText: 'questionText',
      customType: 'customType',
      customLevel: 'customLevel',
      customQuestion: 'customQuestion',
      addCustomBtn: 'addCustomBtn',
      clearBtn: 'clearBtn',
      historyList: 'historyList'
    });

    this.setupEvents();

    console.log('[TruthOrDare] 초기화 완료');
    return this;
  }

  setupEvents() {
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.mode = e.currentTarget.dataset.mode;
      });
    });

    document.querySelectorAll('.diff-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.level = e.target.dataset.level;
      });
    });

    this.elements.drawBtn.addEventListener('click', () => this.draw());

    this.elements.addPlayerBtn.addEventListener('click', () => this.addPlayer());
    this.elements.playerInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.addPlayer();
    });

    this.elements.addCustomBtn.addEventListener('click', () => this.addCustom());
    this.elements.clearBtn.addEventListener('click', () => this.clearHistory());
  }

  draw() {
    let type = this.mode;
    if (type === 'random') {
      type = Math.random() < 0.5 ? 'truth' : 'dare';
    }

    const allQuestions = [
      ...this.questions[type][this.level],
      ...this.customQuestions[type][this.level]
    ];

    // 사용하지 않은 질문 필터링
    const available = allQuestions.filter(q => !this.usedQuestions[type].has(q));

    if (available.length === 0) {
      // 모두 사용했으면 리셋
      this.usedQuestions[type].clear();
      available.push(...allQuestions);
    }

    const question = available[Math.floor(Math.random() * available.length)];
    this.usedQuestions[type].add(question);

    this.showQuestion(type, question);
    this.addToHistory(type, question);
    this.nextPlayer();
  }

  showQuestion(type, question) {
    this.elements.questionCard.className = `question-card ${type}`;
    this.elements.questionType.textContent = type === 'truth' ? '진실' : '대담';
    this.elements.questionText.textContent = question;

    this.elements.questionCard.style.animation = 'none';
    this.elements.questionCard.offsetHeight; // 리플로우
    this.elements.questionCard.style.animation = 'cardFlip 0.5s ease';
  }

  addPlayer() {
    const name = this.elements.playerInput.value.trim();

    if (name && !this.players.includes(name)) {
      this.players.push(name);
      this.renderPlayers();
      this.elements.playerInput.value = '';
    }
  }

  removePlayer(index) {
    this.players.splice(index, 1);
    if (this.currentPlayerIndex >= this.players.length) {
      this.currentPlayerIndex = 0;
    }
    this.renderPlayers();
  }

  renderPlayers() {
    this.elements.playerList.innerHTML = this.players.map((name, i) => `
      <span class="player-tag ${i === this.currentPlayerIndex ? 'current' : ''}">
        ${this.escapeHtml(name)}
        <button onclick="tod.removePlayer(${i})">&times;</button>
      </span>
    `).join('');

    if (this.players.length > 0) {
      this.elements.currentPlayer.textContent = `현재 차례: ${this.players[this.currentPlayerIndex]}`;
    } else {
      this.elements.currentPlayer.textContent = '';
    }
  }

  nextPlayer() {
    if (this.players.length > 0) {
      this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
      this.renderPlayers();
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  addCustom() {
    const type = this.elements.customType.value;
    const level = this.elements.customLevel.value;
    const question = this.elements.customQuestion.value.trim();

    if (question) {
      this.customQuestions[type][level].push(question);
      localStorage.setItem('todCustom', JSON.stringify(this.customQuestions));
      this.elements.customQuestion.value = '';
      this.showToast('질문이 추가되었습니다!');
    }
  }

  addToHistory(type, question) {
    const entry = {
      type,
      question,
      player: this.players.length > 0 ? this.players[this.currentPlayerIndex] : null
    };

    this.history.unshift(entry);
    if (this.history.length > 20) this.history.pop();
    this.renderHistory();
  }

  renderHistory() {
    this.elements.historyList.innerHTML = this.history.map(h => `
      <div class="history-item">
        <span class="type ${h.type}">${h.type === 'truth' ? '진실' : '대담'}</span>
        <span class="question">${this.escapeHtml(h.question)}</span>
        ${h.player ? `<span class="player">${this.escapeHtml(h.player)}</span>` : ''}
      </div>
    `).join('');
  }

  clearHistory() {
    this.history = [];
    this.usedQuestions = { truth: new Set(), dare: new Set() };
    this.renderHistory();
  }
}

// 전역 인스턴스 생성
const tod = new TruthOrDare();
window.TruthOrDare = tod;

document.addEventListener('DOMContentLoaded', () => tod.init());

// CSS 애니메이션 추가
const style = document.createElement('style');
style.textContent = `
@keyframes cardFlip {
  0% { transform: rotateY(0); }
  50% { transform: rotateY(90deg); }
  100% { transform: rotateY(0); }
}
`;
document.head.appendChild(style);
