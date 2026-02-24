/**
 * 악기 튜너 - ToolBase 기반
 * 마이크로 음정 측정
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var Tuner = class Tuner extends ToolBase {
  constructor() {
    super('Tuner');
    this.audioContext = null;
    this.analyser = null;
    this.mediaStream = null;
    this.isListening = false;
    this.animationId = null;
    this.instrument = 'chromatic';
    this.refPitch = 440;

    this.noteStrings = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

    this.instruments = {
      chromatic: null,
      guitar: [82.41, 110.00, 146.83, 196.00, 246.94, 329.63],
      bass: [41.20, 55.00, 73.42, 98.00],
      ukulele: [392.00, 261.63, 329.63, 440.00]
    };
  }

  init() {
    this.initElements({
      refPitch: 'refPitch',
      startBtn: 'startBtn',
      statusIndicator: 'statusIndicator',
      noteDisplay: 'noteDisplay',
      freqDisplay: 'freqDisplay',
      centsDisplay: 'centsDisplay',
      meterNeedle: 'meterNeedle',
      stringGuide: 'stringGuide'
    });

    this.refPitch = parseInt(this.elements.refPitch.value) || 440;

    console.log('[Tuner] 초기화 완료');
    return this;
  }

  setInstrument(inst) {
    this.instrument = inst;
    document.querySelectorAll('.instrument-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.inst === inst);
    });

    const guide = this.elements.stringGuide;
    if (inst === 'guitar') {
      guide.innerHTML = `
        <h3 style="font-weight: 600; margin-bottom: 0.5rem;">기타 표준 튜닝</h3>
        <div style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 0.5rem; text-align: center;">
          ${['E2', 'A2', 'D3', 'G3', 'B3', 'E4'].map((note, i) => `
            <div style="padding: 0.5rem; background: var(--bg-primary); border-radius: 8px;">
              <div style="font-weight: 600;">${6-i}번</div>
              <div style="color: var(--primary);">${note}</div>
            </div>
          `).join('')}
        </div>
      `;
    } else if (inst === 'bass') {
      guide.innerHTML = `
        <h3 style="font-weight: 600; margin-bottom: 0.5rem;">베이스 표준 튜닝</h3>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.5rem; text-align: center;">
          ${['E1', 'A1', 'D2', 'G2'].map((note, i) => `
            <div style="padding: 0.5rem; background: var(--bg-primary); border-radius: 8px;">
              <div style="font-weight: 600;">${4-i}번</div>
              <div style="color: var(--primary);">${note}</div>
            </div>
          `).join('')}
        </div>
      `;
    } else if (inst === 'ukulele') {
      guide.innerHTML = `
        <h3 style="font-weight: 600; margin-bottom: 0.5rem;">우쿨렐레 표준 튜닝</h3>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.5rem; text-align: center;">
          ${['G4', 'C4', 'E4', 'A4'].map((note, i) => `
            <div style="padding: 0.5rem; background: var(--bg-primary); border-radius: 8px;">
              <div style="font-weight: 600;">${4-i}번</div>
              <div style="color: var(--primary);">${note}</div>
            </div>
          `).join('')}
        </div>
      `;
    } else {
      guide.innerHTML = `
        <h3 style="font-weight: 600; margin-bottom: 0.5rem;">크로매틱 튜너</h3>
        <p style="font-size: 0.85rem; color: var(--text-secondary);">모든 음정을 감지합니다. 가장 가까운 음을 표시합니다.</p>
      `;
    }
  }

  async toggle() {
    if (this.isListening) {
      this.stop();
    } else {
      await this.start();
    }
  }

  async start() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;

      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      source.connect(this.analyser);

      this.isListening = true;
      this.elements.startBtn.textContent = '마이크 중지';
      this.elements.statusIndicator.className = 'status-indicator listening';

      this.refPitch = parseInt(this.elements.refPitch.value) || 440;
      this.detect();
    } catch (e) {
      this.showToast('마이크 접근 권한이 필요합니다', 'error');
    }
  }

  stop() {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
    }
    if (this.audioContext) {
      this.audioContext.close();
    }
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }

    this.isListening = false;
    this.elements.startBtn.textContent = '마이크 시작';
    this.elements.statusIndicator.className = 'status-indicator idle';
    this.elements.noteDisplay.textContent = '-';
    this.elements.freqDisplay.textContent = '--- Hz';
    this.elements.centsDisplay.textContent = '마이크를 활성화하세요';
    this.elements.centsDisplay.className = 'cents-display';
    this.elements.meterNeedle.style.left = '50%';
  }

  detect() {
    const buffer = new Float32Array(this.analyser.fftSize);
    this.analyser.getFloatTimeDomainData(buffer);

    const frequency = this.autoCorrelate(buffer, this.audioContext.sampleRate);

    if (frequency > 0) {
      const noteInfo = this.getNoteInfo(frequency);
      this.updateDisplay(noteInfo, frequency);
    }

    this.animationId = requestAnimationFrame(() => this.detect());
  }

  autoCorrelate(buffer, sampleRate) {
    let SIZE = buffer.length;
    let rms = 0;

    for (let i = 0; i < SIZE; i++) {
      rms += buffer[i] * buffer[i];
    }
    rms = Math.sqrt(rms / SIZE);

    if (rms < 0.01) return -1;

    let r1 = 0, r2 = SIZE - 1;
    const threshold = 0.2;

    for (let i = 0; i < SIZE / 2; i++) {
      if (Math.abs(buffer[i]) < threshold) { r1 = i; break; }
    }
    for (let i = 1; i < SIZE / 2; i++) {
      if (Math.abs(buffer[SIZE - i]) < threshold) { r2 = SIZE - i; break; }
    }

    buffer = buffer.slice(r1, r2);
    SIZE = buffer.length;

    const c = new Array(SIZE).fill(0);
    for (let i = 0; i < SIZE; i++) {
      for (let j = 0; j < SIZE - i; j++) {
        c[i] += buffer[j] * buffer[j + i];
      }
    }

    let d = 0;
    while (c[d] > c[d + 1]) d++;
    let maxval = -1, maxpos = -1;
    for (let i = d; i < SIZE; i++) {
      if (c[i] > maxval) {
        maxval = c[i];
        maxpos = i;
      }
    }

    let T0 = maxpos;

    const x1 = c[T0 - 1], x2 = c[T0], x3 = c[T0 + 1];
    const a = (x1 + x3 - 2 * x2) / 2;
    const b = (x3 - x1) / 2;
    if (a) T0 = T0 - b / (2 * a);

    return sampleRate / T0;
  }

  getNoteInfo(frequency) {
    const noteNum = 12 * (Math.log2(frequency / this.refPitch)) + 49;
    const noteIndex = Math.round(noteNum) % 12;
    const octave = Math.floor((Math.round(noteNum) + 8) / 12);
    const cents = Math.round((noteNum - Math.round(noteNum)) * 100);

    return {
      note: this.noteStrings[noteIndex],
      octave: octave,
      cents: cents,
      noteNum: Math.round(noteNum)
    };
  }

  updateDisplay(noteInfo, frequency) {
    this.elements.noteDisplay.textContent = noteInfo.note + noteInfo.octave;
    this.elements.freqDisplay.textContent = frequency.toFixed(1) + ' Hz';

    const centsDisplay = this.elements.centsDisplay;
    if (Math.abs(noteInfo.cents) <= 5) {
      centsDisplay.textContent = '정확합니다!';
      centsDisplay.className = 'cents-display in-tune';
    } else if (noteInfo.cents > 0) {
      centsDisplay.textContent = `+${noteInfo.cents} 센트 (높음)`;
      centsDisplay.className = 'cents-display sharp';
    } else {
      centsDisplay.textContent = `${noteInfo.cents} 센트 (낮음)`;
      centsDisplay.className = 'cents-display flat';
    }

    const needlePos = 50 + (noteInfo.cents / 50 * 50);
    this.elements.meterNeedle.style.left = Math.max(0, Math.min(100, needlePos)) + '%';
  }
}

// 전역 인스턴스 생성
const tuner = new Tuner();
window.Tuner = tuner;

// 전역 함수 (HTML onclick 호환)
function setInstrument(inst) { tuner.setInstrument(inst); }
function toggle() { tuner.toggle(); }

document.addEventListener('DOMContentLoaded', () => tuner.init());
