/**
 * 스케일 레퍼런스 - ToolBase 기반
 * 음계 구성음 확인
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var ScaleRef = class ScaleRef extends ToolBase {
  constructor() {
    super('ScaleRef');
    this.audioContext = null;
    this.notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

    this.scales = {
      major: { name: '메이저', intervals: [0, 2, 4, 5, 7, 9, 11], formula: ['전', '전', '반', '전', '전', '전', '반'] },
      minor: { name: '마이너', intervals: [0, 2, 3, 5, 7, 8, 10], formula: ['전', '반', '전', '전', '반', '전', '전'] },
      harmonicMinor: { name: '하모닉 마이너', intervals: [0, 2, 3, 5, 7, 8, 11], formula: ['전', '반', '전', '전', '반', '증', '반'] },
      melodicMinor: { name: '멜로딕 마이너', intervals: [0, 2, 3, 5, 7, 9, 11], formula: ['전', '반', '전', '전', '전', '전', '반'] },
      pentatonicMajor: { name: '메이저 펜타토닉', intervals: [0, 2, 4, 7, 9], formula: ['전', '전', '단3', '전', '단3'] },
      pentatonicMinor: { name: '마이너 펜타토닉', intervals: [0, 3, 5, 7, 10], formula: ['단3', '전', '전', '단3', '전'] },
      blues: { name: '블루스', intervals: [0, 3, 5, 6, 7, 10], formula: ['단3', '전', '반', '반', '단3', '전'] },
      dorian: { name: '도리안', intervals: [0, 2, 3, 5, 7, 9, 10], formula: ['전', '반', '전', '전', '전', '반', '전'] },
      mixolydian: { name: '믹솔리디안', intervals: [0, 2, 4, 5, 7, 9, 10], formula: ['전', '전', '반', '전', '전', '반', '전'] }
    };

    this.currentScaleNotes = [];
  }

  init() {
    this.initElements({
      rootNote: 'rootNote',
      scaleType: 'scaleType',
      scaleName: 'scaleName',
      scaleNotes: 'scaleNotes',
      formulaSteps: 'formulaSteps',
      piano: 'piano'
    });

    this.renderPiano();
    this.update();

    console.log('[ScaleRef] 초기화 완료');
    return this;
  }

  update() {
    const root = this.elements.rootNote.value;
    const scaleType = this.elements.scaleType.value;
    const scale = this.scales[scaleType];

    const rootIndex = this.notes.indexOf(root);
    this.currentScaleNotes = scale.intervals.map(interval => {
      return this.notes[(rootIndex + interval) % 12];
    });

    this.elements.scaleName.textContent = `${root} ${scale.name}`;

    this.elements.scaleNotes.innerHTML = this.currentScaleNotes.map((note, i) =>
      `<div class="note-badge" onclick="scaleRef.playNote(${i})">${note}</div>`
    ).join('');

    this.elements.formulaSteps.innerHTML = scale.formula.map(step =>
      `<div class="step-badge">${step}</div>`
    ).join('');

    this.updatePiano();
  }

  renderPiano() {
    const whiteKeys = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
    const blackKeyOffsets = [28, 68, 148, 188, 228];

    let html = '';

    for (let octave = 0; octave < 2; octave++) {
      whiteKeys.forEach((key, i) => {
        html += `<div class="white-key" data-note="${key}">
          <span class="key-label">${key}</span>
        </div>`;
      });
    }

    this.elements.piano.innerHTML = html;

    const blackKeys = ['C#', 'D#', 'F#', 'G#', 'A#'];

    for (let octave = 0; octave < 2; octave++) {
      blackKeyOffsets.forEach((offset, i) => {
        const blackKey = document.createElement('div');
        blackKey.className = 'black-key';
        blackKey.dataset.note = blackKeys[i];
        blackKey.style.left = (offset + octave * 280) + 'px';
        this.elements.piano.appendChild(blackKey);
      });
    }
  }

  updatePiano() {
    document.querySelectorAll('.white-key, .black-key').forEach(key => {
      key.classList.remove('active');
    });

    this.currentScaleNotes.forEach(note => {
      document.querySelectorAll(`[data-note="${note}"]`).forEach(key => {
        key.classList.add('active');
      });
    });
  }

  playNote(index) {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    const note = this.currentScaleNotes[index];
    const noteIndex = this.notes.indexOf(note);
    const freq = 261.63 * Math.pow(2, noteIndex / 12);

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.connect(gain);
    gain.connect(this.audioContext.destination);

    osc.frequency.value = freq;
    osc.type = 'triangle';

    gain.gain.setValueAtTime(0.3, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);

    osc.start(this.audioContext.currentTime);
    osc.stop(this.audioContext.currentTime + 0.5);
  }

  playScale() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    this.currentScaleNotes.forEach((note, i) => {
      setTimeout(() => {
        const noteIndex = this.notes.indexOf(note);
        const freq = 261.63 * Math.pow(2, noteIndex / 12);

        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        osc.connect(gain);
        gain.connect(this.audioContext.destination);

        osc.frequency.value = freq;
        osc.type = 'triangle';

        gain.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.4);

        osc.start(this.audioContext.currentTime);
        osc.stop(this.audioContext.currentTime + 0.4);
      }, i * 300);
    });
  }
}

// 전역 인스턴스 생성
const scaleRef = new ScaleRef();
window.ScaleRef = scaleRef;

// 전역 함수 (HTML onclick 호환)
function update() { scaleRef.update(); }
function playScale() { scaleRef.playScale(); }

document.addEventListener('DOMContentLoaded', () => scaleRef.init());
