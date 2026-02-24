/**
 * 키 변환기 - ToolBase 기반
 * 코드 이조 (Transpose)
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var KeyTranspose = class KeyTranspose extends ToolBase {
  constructor() {
    super('KeyTranspose');
    this.notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    this.notesFlat = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
    this.currentKey = 'C';
    this.transpose = 0;

    this.diatonicPattern = [
      { interval: 0, suffix: '' },
      { interval: 2, suffix: 'm' },
      { interval: 4, suffix: 'm' },
      { interval: 5, suffix: '' },
      { interval: 7, suffix: '' },
      { interval: 9, suffix: 'm' },
      { interval: 11, suffix: 'dim' }
    ];
  }

  init() {
    this.initElements({
      keyGrid: 'keyGrid',
      transposeValue: 'transposeValue',
      originalKey: 'originalKey',
      transposedKey: 'transposedKey',
      originalChords: 'originalChords',
      transposedChords: 'transposedChords',
      chordInput: 'chordInput',
      chordResult: 'chordResult'
    });

    this.renderKeyGrid();
    this.update();

    console.log('[KeyTranspose] 초기화 완료');
    return this;
  }

  renderKeyGrid() {
    this.elements.keyGrid.innerHTML = this.notes.map(note =>
      `<div class="key-btn ${note === this.currentKey ? 'active' : ''}" onclick="keyTranspose.setKey('${note}')">${note}</div>`
    ).join('');
  }

  setKey(key) {
    this.currentKey = key;
    this.renderKeyGrid();
    this.update();
  }

  adjust(delta) {
    this.transpose += delta;
    if (this.transpose > 11) this.transpose = -11;
    if (this.transpose < -11) this.transpose = 11;
    this.update();
  }

  getTransposedNote(note) {
    const noteIndex = this.notes.indexOf(note);
    if (noteIndex === -1) {
      const flatIndex = this.notesFlat.indexOf(note);
      if (flatIndex === -1) return note;
      const newIndex = (flatIndex + this.transpose + 12) % 12;
      return this.transpose < 0 ? this.notesFlat[newIndex] : this.notes[newIndex];
    }
    const newIndex = (noteIndex + this.transpose + 12) % 12;
    return this.transpose < 0 ? this.notesFlat[newIndex] : this.notes[newIndex];
  }

  parseChord(chord) {
    const match = chord.match(/^([A-G][#b]?)(.*)/);
    if (!match) return { root: chord, suffix: '' };
    return { root: match[1], suffix: match[2] };
  }

  transposeChordString(chord) {
    const { root, suffix } = this.parseChord(chord);
    const newRoot = this.getTransposedNote(root);
    return newRoot + suffix;
  }

  update() {
    const sign = this.transpose > 0 ? '+' : '';
    this.elements.transposeValue.textContent = sign + this.transpose;

    const originalKey = this.currentKey;
    const transposedKey = this.getTransposedNote(originalKey);

    this.elements.originalKey.textContent = originalKey;
    this.elements.transposedKey.textContent = transposedKey;

    this.renderDiatonicChords(originalKey, transposedKey);
  }

  renderDiatonicChords(originalKey, transposedKey) {
    const originalKeyIndex = this.notes.indexOf(originalKey);

    let originalHtml = '';
    let transposedHtml = '';

    this.diatonicPattern.forEach((pattern, i) => {
      const origNoteIndex = (originalKeyIndex + pattern.interval) % 12;
      const origChord = this.notes[origNoteIndex] + pattern.suffix;

      const transposedChord = this.transposeChordString(origChord);

      originalHtml += `<div class="chord-item original">${origChord}</div>`;
      transposedHtml += `<div class="chord-item transposed">${transposedChord}</div>`;
    });

    this.elements.originalChords.innerHTML = originalHtml;
    this.elements.transposedChords.innerHTML = transposedHtml;
  }

  transposeChord() {
    const input = this.elements.chordInput.value.trim();
    if (!input) {
      this.showToast('코드를 입력하세요', 'error');
      return;
    }

    const chords = input.split(/[\s,]+/);
    const transposed = chords.map(chord => this.transposeChordString(chord));

    this.elements.chordResult.innerHTML =
      `<span style="color: var(--text-secondary);">${chords.join(' ')}</span> → <span style="color: var(--primary);">${transposed.join(' ')}</span>`;
  }
}

// 전역 인스턴스 생성
const keyTranspose = new KeyTranspose();
window.KeyTranspose = keyTranspose;

// 전역 함수 (HTML onclick 호환)
function setKey(key) { keyTranspose.setKey(key); }
function adjust(delta) { keyTranspose.adjust(delta); }
function transposeChord() { keyTranspose.transposeChord(); }

document.addEventListener('DOMContentLoaded', () => keyTranspose.init());
