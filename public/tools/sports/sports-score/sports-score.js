/**
 * 스포츠 점수판 - ToolBase 기반
 * 간편 점수 기록
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var SportsScore = class SportsScore extends ToolBase {
  constructor() {
    super('SportsScore');
    this.homeScore = 0;
    this.awayScore = 0;
    this.period = 1;
    this.timerSeconds = 0;
    this.timerInterval = null;
    this.isTimerRunning = false;
    this.activeSport = 'basketball';

    this.sports = {
      basketball: { name: '농구', periods: 4, periodName: '쿼터', pointIncrement: 1 },
      soccer: { name: '축구', periods: 2, periodName: '전반/후반', pointIncrement: 1 },
      volleyball: { name: '배구', periods: 5, periodName: '세트', pointIncrement: 1 },
      baseball: { name: '야구', periods: 9, periodName: '이닝', pointIncrement: 1 },
      tennis: { name: '테니스', periods: 5, periodName: '세트', pointIncrement: 1 },
      badminton: { name: '배드민턴', periods: 3, periodName: '게임', pointIncrement: 1 }
    };
  }

  init() {
    this.initElements({
      sportSelector: 'sportSelector',
      homeTeam: 'homeTeam',
      awayTeam: 'awayTeam',
      homeScore: 'homeScore',
      awayScore: 'awayScore',
      periodInfo: 'periodInfo',
      timeInfo: 'timeInfo',
      timerBtn: 'timerBtn'
    });

    this.load();
    this.renderSportSelector();
    this.updateDisplay();

    console.log('[SportsScore] 초기화 완료');
    return this;
  }

  load() {
    try {
      const saved = localStorage.getItem('sports-score-data');
      if (saved) {
        const data = JSON.parse(saved);
        this.homeScore = data.homeScore || 0;
        this.awayScore = data.awayScore || 0;
        this.period = data.period || 1;
        this.activeSport = data.sport || 'basketball';
        this.elements.homeTeam.value = data.homeTeam || '홈팀';
        this.elements.awayTeam.value = data.awayTeam || '원정팀';
      }
    } catch (e) {}
  }

  save() {
    const data = {
      homeScore: this.homeScore,
      awayScore: this.awayScore,
      period: this.period,
      sport: this.activeSport,
      homeTeam: this.elements.homeTeam.value,
      awayTeam: this.elements.awayTeam.value
    };
    localStorage.setItem('sports-score-data', JSON.stringify(data));
  }

  renderSportSelector() {
    this.elements.sportSelector.innerHTML = Object.entries(this.sports).map(([key, sport]) =>
      `<div class="sport-btn ${this.activeSport === key ? 'active' : ''}" onclick="sportsScore.setSport('${key}')">${sport.name}</div>`
    ).join('');
  }

  setSport(sport) {
    this.activeSport = sport;
    this.period = 1;
    this.renderSportSelector();
    this.updateDisplay();
    this.save();
  }

  changeScore(team, delta) {
    if (team === 'home') {
      this.homeScore = Math.max(0, this.homeScore + delta);
    } else {
      this.awayScore = Math.max(0, this.awayScore + delta);
    }
    this.updateDisplay();
    this.save();
  }

  nextPeriod() {
    const sport = this.sports[this.activeSport];
    if (this.period < sport.periods) {
      this.period++;
      this.updateDisplay();
      this.save();
    }
  }

  prevPeriod() {
    if (this.period > 1) {
      this.period--;
      this.updateDisplay();
      this.save();
    }
  }

  toggleTimer() {
    if (this.isTimerRunning) {
      clearInterval(this.timerInterval);
      this.isTimerRunning = false;
      this.elements.timerBtn.textContent = '계속';
    } else {
      this.timerInterval = setInterval(() => {
        this.timerSeconds++;
        this.updateTimerDisplay();
      }, 1000);
      this.isTimerRunning = true;
      this.elements.timerBtn.textContent = '정지';
    }
  }

  updateTimerDisplay() {
    const minutes = Math.floor(this.timerSeconds / 60);
    const seconds = this.timerSeconds % 60;
    this.elements.timeInfo.textContent =
      `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  updateDisplay() {
    this.elements.homeScore.textContent = this.homeScore;
    this.elements.awayScore.textContent = this.awayScore;

    const sport = this.sports[this.activeSport];
    let periodText;

    if (this.activeSport === 'soccer') {
      periodText = this.period === 1 ? '전반전' : '후반전';
    } else {
      periodText = `${this.period}${sport.periodName}`;
    }

    this.elements.periodInfo.textContent = periodText;
  }

  reset() {
    this.homeScore = 0;
    this.awayScore = 0;
    this.period = 1;
    this.timerSeconds = 0;
    clearInterval(this.timerInterval);
    this.isTimerRunning = false;
    this.elements.timerBtn.textContent = '시작';
    this.updateDisplay();
    this.updateTimerDisplay();
    this.save();
    this.showToast('점수가 리셋되었습니다', 'success');
  }

  swapTeams() {
    // 팀 이름 교체
    const homeTeam = this.elements.homeTeam.value;
    const awayTeam = this.elements.awayTeam.value;
    this.elements.homeTeam.value = awayTeam;
    this.elements.awayTeam.value = homeTeam;

    // 점수 교체
    [this.homeScore, this.awayScore] = [this.awayScore, this.homeScore];
    this.updateDisplay();
    this.save();
  }

  share() {
    const homeTeam = this.elements.homeTeam.value;
    const awayTeam = this.elements.awayTeam.value;
    const sport = this.sports[this.activeSport];

    let text = `${sport.name} 경기 결과\n\n`;
    text += `${homeTeam}: ${this.homeScore}\n`;
    text += `${awayTeam}: ${this.awayScore}\n\n`;

    if (this.homeScore > this.awayScore) {
      text += `${homeTeam} 승리!`;
    } else if (this.awayScore > this.homeScore) {
      text += `${awayTeam} 승리!`;
    } else {
      text += `무승부`;
    }

    this.copyToClipboard(text);
  }
}

// 전역 인스턴스 생성
const sportsScore = new SportsScore();
window.SportsScore = sportsScore;

document.addEventListener('DOMContentLoaded', () => sportsScore.init());
