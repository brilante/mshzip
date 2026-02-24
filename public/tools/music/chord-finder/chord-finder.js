/**
 * 코드 파인더 - ToolBase 기반
 * 기타 코드 다이어그램
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var ChordFinder = class ChordFinder extends ToolBase {
  constructor() {
    super('ChordFinder');
    this.root = 'C';
    this.type = 'major';
    this.audioContext = null;

    this.notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

    this.types = {
      major: { name: '메이저', suffix: '', intervals: [0, 4, 7] },
      minor: { name: '마이너', suffix: 'm', intervals: [0, 3, 7] },
      '7': { name: '세븐', suffix: '7', intervals: [0, 4, 7, 10] },
      maj7: { name: '메이저7', suffix: 'maj7', intervals: [0, 4, 7, 11] },
      m7: { name: '마이너7', suffix: 'm7', intervals: [0, 3, 7, 10] },
      dim: { name: '디미니시', suffix: 'dim', intervals: [0, 3, 6] },
      aug: { name: '오그먼트', suffix: 'aug', intervals: [0, 4, 8] },
      sus4: { name: '서스4', suffix: 'sus4', intervals: [0, 5, 7] }
    };

    this.diagrams = {
      'C_major': [[0,-1], [1,3], [2,2], [3,0], [4,1], [5,0]],
      'C_minor': [[0,-1], [1,3], [2,4], [3,5], [4,5], [5,3]],
      'D_major': [[0,-1], [1,-1], [2,0], [3,2], [4,3], [5,2]],
      'D_minor': [[0,-1], [1,-1], [2,0], [3,2], [4,3], [5,1]],
      'E_major': [[0,0], [1,2], [2,2], [3,1], [4,0], [5,0]],
      'E_minor': [[0,0], [1,2], [2,2], [3,0], [4,0], [5,0]],
      'F_major': [[0,1], [1,1], [2,2], [3,3], [4,3], [5,1]],
      'F_minor': [[0,1], [1,1], [2,1], [3,3], [4,3], [5,1]],
      'G_major': [[0,3], [1,2], [2,0], [3,0], [4,0], [5,3]],
      'G_minor': [[0,3], [1,1], [2,0], [3,0], [4,3], [5,3]],
      'A_major': [[0,-1], [1,0], [2,2], [3,2], [4,2], [5,0]],
      'A_minor': [[0,-1], [1,0], [2,2], [3,2], [4,1], [5,0]],
      'B_major': [[0,-1], [1,2], [2,4], [3,4], [4,4], [5,2]],
      'B_minor': [[0,-1], [1,2], [2,4], [3,4], [4,3], [5,2]]
    };
  }

  init() {
    this.initElements({
      rootNotes: 'rootNotes',
      chordTypes: 'chordTypes',
      chordName: 'chordName',
      chordNotes: 'chordNotes',
      fretboard: 'fretboard',
      fretNumbers: 'fretNumbers'
    });

    this.renderRootNotes();
    this.renderChordTypes();
    this.updateChord();

    console.log('[ChordFinder] 초기화 완료');
    return this;
  }

  renderRootNotes() {
    this.elements.rootNotes.innerHTML = this.notes.map(note =>
      `<div class="note-btn ${note === this.root ? 'active' : ''}" onclick="chordFinder.setRoot('${note}')">${note}</div>`
    ).join('');
  }

  renderChordTypes() {
    this.elements.chordTypes.innerHTML = Object.entries(this.types).map(([key, type]) =>
      `<div class="note-btn ${key === this.type ? 'active' : ''}" onclick="chordFinder.setType('${key}')">${type.name}</div>`
    ).join('');
  }

  setRoot(root) {
    this.root = root;
    this.renderRootNotes();
    this.updateChord();
  }

  setType(type) {
    this.type = type;
    this.renderChordTypes();
    this.updateChord();
  }

  getChordNotes() {
    const rootIndex = this.notes.indexOf(this.root);
    const intervals = this.types[this.type].intervals;

    return intervals.map(interval => {
      const noteIndex = (rootIndex + interval) % 12;
      return this.notes[noteIndex];
    });
  }

  updateChord() {
    const suffix = this.types[this.type].suffix;
    const chordNotes = this.getChordNotes();

    this.elements.chordName.textContent = this.root + suffix;
    this.elements.chordNotes.textContent = chordNotes.join(' - ');

    this.renderDiagram();
  }

  renderDiagram() {
    const key = `${this.root}_${this.type}`;
    let diagram = this.diagrams[key];

    if (!diagram) {
      diagram = this.generateBarreChord();
    }

    const maxFret = Math.max(...diagram.map(d => d[1]).filter(f => f > 0), 4);
    const minFret = Math.min(...diagram.map(d => d[1]).filter(f => f > 0));
    const startFret = minFret > 3 ? minFret - 1 : 0;

    let html = '<div class="fret-grid">';

    for (let string = 5; string >= 0; string--) {
      html += '<div class="string-row">';

      const fret = diagram[string][1];
      html += '<div class="fret-marker">';
      if (fret === -1) {
        html += '<span class="mute-marker"></span>';
      } else if (fret === 0) {
        html += '<span class="open-marker">○</span>';
      }
      html += '</div>';

      for (let f = startFret + 1; f <= startFret + 5; f++) {
        html += '<div class="fret-marker">';
        if (fret === f) {
          html += `<div class="finger-dot">${f}</div>`;
        }
        html += '</div>';
      }
      html += '</div>';
    }
    html += '</div>';

    this.elements.fretboard.innerHTML = html;

    this.elements.fretNumbers.innerHTML = Array(5).fill(0).map((_, i) =>
      `<div class="fret-num">${startFret + i + 1}</div>`
    ).join('');
  }

  generateBarreChord() {
    const rootIndex = this.notes.indexOf(this.root);
    const baseFret = rootIndex <= 4 ? rootIndex : rootIndex - 5;

    return [
      [0, baseFret],
      [1, baseFret + 2],
      [2, baseFret + 2],
      [3, baseFret + 1],
      [4, baseFret],
      [5, baseFret]
    ];
  }

  playChord() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    const chordNotes = this.getChordNotes();
    const baseFreq = 261.63;

    chordNotes.forEach((note, i) => {
      const noteIndex = this.notes.indexOf(note);
      const freq = baseFreq * Math.pow(2, noteIndex / 12);

      setTimeout(() => {
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        osc.connect(gain);
        gain.connect(this.audioContext.destination);

        osc.frequency.value = freq;
        osc.type = 'triangle';

        gain.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 1);

        osc.start(this.audioContext.currentTime);
        osc.stop(this.audioContext.currentTime + 1);
      }, i * 50);
    });
  }
}

// 전역 인스턴스 생성
const chordFinder = new ChordFinder();
window.ChordFinder = chordFinder;

// 전역 함수 (HTML onclick 호환)
function setRoot(root) { chordFinder.setRoot(root); }
function setType(type) { chordFinder.setType(type); }
function playChord() { chordFinder.playChord(); }

document.addEventListener('DOMContentLoaded', () => chordFinder.init());
