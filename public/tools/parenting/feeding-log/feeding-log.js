/**
 * 수유 기록 - ToolBase 기반
 * 모유/분유 수유 기록
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var FeedingLog = class FeedingLog extends ToolBase {
  constructor() {
    super('FeedingLog');
    this.type = 'breast';
    this.records = [];
    this.timerRunning = false;
    this.timerStart = null;
    this.timerInterval = null;
    this.timerElapsed = 0;

    this.typeNames = {
      breast: '모유',
      formula: '분유',
      pumped: '유축'
    };

    this.sideNames = {
      left: '왼쪽',
      right: '오른쪽',
      both: '양쪽'
    };
  }

  init() {
    this.initElements({
      formulaInput: 'formulaInput',
      breastInput: 'breastInput',
      timerBtn: 'timerBtn',
      timerDisplay: 'timerDisplay',
      duration: 'duration',
      side: 'side',
      amount: 'amount',
      memo: 'memo',
      todayCount: 'todayCount',
      totalAmount: 'totalAmount',
      lastFeed: 'lastFeed',
      logList: 'logList'
    });

    this.loadRecords();
    this.render();
    this.updateStats();

    console.log('[FeedingLog] 초기화 완료');
    return this;
  }

  setType(type) {
    this.type = type;
    document.querySelectorAll('.type-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.type === type);
    });

    const showFormula = type === 'formula' || type === 'pumped';
    this.elements.formulaInput.style.display = showFormula ? 'block' : 'none';
    this.elements.breastInput.style.display = type === 'breast' ? 'block' : 'none';
  }

  toggleTimer() {
    if (this.timerRunning) {
      this.pauseTimer();
    } else {
      this.startTimer();
    }
  }

  startTimer() {
    this.timerRunning = true;
    this.timerStart = Date.now() - this.timerElapsed;
    this.elements.timerBtn.textContent = '일시정지';

    this.timerInterval = setInterval(() => {
      this.timerElapsed = Date.now() - this.timerStart;
      this.updateTimerDisplay();
    }, 1000);
  }

  pauseTimer() {
    this.timerRunning = false;
    clearInterval(this.timerInterval);
    this.elements.timerBtn.textContent = '계속';
  }

  resetTimer() {
    this.timerRunning = false;
    clearInterval(this.timerInterval);
    this.timerElapsed = 0;
    this.timerStart = null;
    this.elements.timerBtn.textContent = '시작';
    this.updateTimerDisplay();
  }

  updateTimerDisplay() {
    const totalSeconds = Math.floor(this.timerElapsed / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    this.elements.timerDisplay.textContent =
      `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    // 타이머 값을 duration에 자동 반영
    if (this.type === 'breast') {
      this.elements.duration.value = minutes || 1;
    }
  }

  addRecord() {
    const record = {
      id: Date.now(),
      type: this.type,
      time: new Date().toISOString()
    };

    if (this.type === 'breast') {
      record.duration = parseInt(this.elements.duration.value) || 15;
      record.side = this.elements.side.value;
    } else {
      record.amount = parseInt(this.elements.amount.value) || 120;
    }

    const memo = this.elements.memo.value.trim();
    if (memo) record.memo = memo;

    this.records.unshift(record);
    this.saveRecords();
    this.render();
    this.updateStats();
    this.resetTimer();

    this.elements.memo.value = '';
    this.showToast('기록이 추가되었습니다', 'success');
  }

  deleteRecord(id) {
    this.records = this.records.filter(r => r.id !== id);
    this.saveRecords();
    this.render();
    this.updateStats();
  }

  clearAll() {
    if (confirm('모든 기록을 삭제하시겠습니까?')) {
      this.records = [];
      this.saveRecords();
      this.render();
      this.updateStats();
      this.showToast('모든 기록이 삭제되었습니다', 'success');
    }
  }

  updateStats() {
    const today = new Date().toDateString();
    const todayRecords = this.records.filter(r =>
      new Date(r.time).toDateString() === today
    );

    this.elements.todayCount.textContent = todayRecords.length + '회';

    const totalAmount = todayRecords.reduce((sum, r) => sum + (r.amount || 0), 0);
    this.elements.totalAmount.textContent = totalAmount + 'ml';

    if (this.records.length > 0) {
      const lastTime = new Date(this.records[0].time);
      const now = new Date();
      const diff = Math.floor((now - lastTime) / 60000);

      if (diff < 60) {
        this.elements.lastFeed.textContent = diff + '분 전';
      } else {
        this.elements.lastFeed.textContent = Math.floor(diff / 60) + '시간 전';
      }
    }
  }

  loadRecords() {
    const saved = localStorage.getItem('feedingRecords');
    if (saved) {
      this.records = JSON.parse(saved);
    }
  }

  saveRecords() {
    localStorage.setItem('feedingRecords', JSON.stringify(this.records));
  }

  render() {
    if (this.records.length === 0) {
      this.elements.logList.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 1rem;">기록이 없습니다</div>';
      return;
    }

    this.elements.logList.innerHTML = this.records.slice(0, 30).map(record => {
      const time = new Date(record.time);
      const timeStr = `${time.getMonth() + 1}/${time.getDate()} ${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`;

      let details = '';
      if (record.type === 'breast') {
        details = `${record.duration}분, ${this.sideNames[record.side]}`;
      } else {
        details = `${record.amount}ml`;
      }

      return `<div class="log-item">
        <div class="log-header">
          <span class="log-type">${this.typeNames[record.type]}</span>
          <span class="log-time">${timeStr}</span>
        </div>
        <div class="log-details">
          ${details}
          ${record.memo ? `<br>${record.memo}` : ''}
        </div>
        <div style="text-align: right; margin-top: 0.5rem;">
          <span class="log-delete" onclick="feedingLog.deleteRecord(${record.id})">삭제</span>
        </div>
      </div>`;
    }).join('');
  }
}

// 전역 인스턴스 생성
const feedingLog = new FeedingLog();
window.FeedingLog = feedingLog;

// 전역 함수 (HTML onclick 호환)
function setType(type) { feedingLog.setType(type); }
function toggleTimer() { feedingLog.toggleTimer(); }
function resetTimer() { feedingLog.resetTimer(); }
function addRecord() { feedingLog.addRecord(); }
function clearAll() { feedingLog.clearAll(); }

document.addEventListener('DOMContentLoaded', () => feedingLog.init());
