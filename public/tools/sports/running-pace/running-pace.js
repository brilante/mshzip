/**
 * 러닝 페이스 계산기 - ToolBase 기반
 * 거리, 시간, 페이스 계산
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var RunningPace = class RunningPace extends ToolBase {
  constructor() {
    super('RunningPace');
    this.mode = 'pace';
    this.raceDistances = [
      { name: '5K', km: 5 },
      { name: '10K', km: 10 },
      { name: '하프마라톤', km: 21.0975 },
      { name: '마라톤', km: 42.195 }
    ];
  }

  init() {
    this.initElements({
      distance: 'distance',
      distanceUnit: 'distanceUnit',
      hours: 'hours',
      minutes: 'minutes',
      seconds: 'seconds',
      distance2: 'distance2',
      paceMin: 'paceMin',
      paceSec: 'paceSec',
      hours2: 'hours2',
      minutes2: 'minutes2',
      seconds2: 'seconds2',
      paceMin2: 'paceMin2',
      paceSec2: 'paceSec2',
      inputPace: 'inputPace',
      inputTime: 'inputTime',
      inputDistance: 'inputDistance',
      resultPanel: 'resultPanel',
      resultLabel: 'resultLabel',
      resultMain: 'resultMain',
      resultGrid: 'resultGrid',
      paceTable: 'paceTable'
    });

    this.calculate();

    console.log('[RunningPace] 초기화 완료');
    return this;
  }

  setMode(mode) {
    this.mode = mode;
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });
    this.elements.inputPace.style.display = mode === 'pace' ? 'block' : 'none';
    this.elements.inputTime.style.display = mode === 'time' ? 'block' : 'none';
    this.elements.inputDistance.style.display = mode === 'distance' ? 'block' : 'none';
    this.calculate();
  }

  calculate() {
    switch (this.mode) {
      case 'pace':
        this.calculatePace();
        break;
      case 'time':
        this.calculateTime();
        break;
      case 'distance':
        this.calculateDistance();
        break;
    }
  }

  calculatePace() {
    const distance = parseFloat(this.elements.distance.value) || 0;
    const unit = this.elements.distanceUnit.value;
    const hours = parseInt(this.elements.hours.value) || 0;
    const minutes = parseInt(this.elements.minutes.value) || 0;
    const seconds = parseInt(this.elements.seconds.value) || 0;

    if (distance <= 0) {
      this.hideResult();
      return;
    }

    const totalSeconds = hours * 3600 + minutes * 60 + seconds;
    if (totalSeconds <= 0) {
      this.hideResult();
      return;
    }

    // km로 변환
    const distanceKm = unit === 'mi' ? distance * 1.60934 : distance;
    const paceSeconds = totalSeconds / distanceKm;

    this.showResult('페이스', this.formatPace(paceSeconds) + '/km', {
      speed: (distanceKm / totalSeconds * 3600).toFixed(2) + ' km/h',
      totalTime: this.formatTime(totalSeconds)
    });

    this.updateRaceTable(paceSeconds);
  }

  calculateTime() {
    const distance = parseFloat(this.elements.distance2.value) || 0;
    const paceMin = parseInt(this.elements.paceMin.value) || 0;
    const paceSec = parseInt(this.elements.paceSec.value) || 0;

    if (distance <= 0) {
      this.hideResult();
      return;
    }

    const paceSeconds = paceMin * 60 + paceSec;
    if (paceSeconds <= 0) {
      this.hideResult();
      return;
    }

    const totalSeconds = distance * paceSeconds;

    this.showResult('예상 시간', this.formatTime(totalSeconds), {
      distance: distance.toFixed(2) + ' km',
      pace: this.formatPace(paceSeconds) + '/km'
    });

    this.updateRaceTable(paceSeconds);
  }

  calculateDistance() {
    const hours = parseInt(this.elements.hours2.value) || 0;
    const minutes = parseInt(this.elements.minutes2.value) || 0;
    const seconds = parseInt(this.elements.seconds2.value) || 0;
    const paceMin = parseInt(this.elements.paceMin2.value) || 0;
    const paceSec = parseInt(this.elements.paceSec2.value) || 0;

    const totalSeconds = hours * 3600 + minutes * 60 + seconds;
    const paceSeconds = paceMin * 60 + paceSec;

    if (totalSeconds <= 0 || paceSeconds <= 0) {
      this.hideResult();
      return;
    }

    const distance = totalSeconds / paceSeconds;

    this.showResult('예상 거리', distance.toFixed(2) + ' km', {
      time: this.formatTime(totalSeconds),
      pace: this.formatPace(paceSeconds) + '/km'
    });

    this.updateRaceTable(paceSeconds);
  }

  formatPace(seconds) {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
  }

  formatTime(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  showResult(label, main, extras) {
    this.elements.resultPanel.style.display = 'block';

    this.elements.resultLabel.textContent = label;
    this.elements.resultMain.textContent = main;

    const labels = {
      speed: '속도',
      totalTime: '총 시간',
      distance: '거리',
      pace: '페이스',
      time: '시간'
    };

    this.elements.resultGrid.innerHTML = Object.entries(extras).map(([key, value]) => {
      return `
        <div class="result-item">
          <div class="result-item-value">${value}</div>
          <div class="result-item-label">${labels[key] || key}</div>
        </div>
      `;
    }).join('');
  }

  hideResult() {
    this.elements.resultPanel.style.display = 'none';
    this.clearRaceTable();
  }

  updateRaceTable(paceSeconds) {
    const rows = this.raceDistances.map(race => {
      const time = race.km * paceSeconds;
      return `
        <div class="pace-row">
          <div>${race.name}</div>
          <div>${this.formatTime(time)}</div>
          <div>${this.formatPace(paceSeconds)}/km</div>
        </div>
      `;
    }).join('');

    this.elements.paceTable.innerHTML = `
      <div class="pace-row pace-header">
        <div>거리</div>
        <div>예상 시간</div>
        <div>페이스</div>
      </div>
      ${rows}
    `;
  }

  clearRaceTable() {
    this.elements.paceTable.innerHTML = `
      <div class="pace-row pace-header">
        <div>거리</div>
        <div>예상 시간</div>
        <div>페이스</div>
      </div>
    `;
  }
}

// 전역 인스턴스 생성
const runningPace = new RunningPace();
window.RunningPace = runningPace;

document.addEventListener('DOMContentLoaded', () => runningPace.init());
