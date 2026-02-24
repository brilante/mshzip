/**
 * 템포 변환기 - ToolBase 기반
 * BPM과 음악 용어 변환
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class TempoConvert extends ToolBase {
  constructor() {
    super('TempoConvert');

    this.tempos = [
      { name: 'Grave', min: 20, max: 40, desc: '매우 느리고 장중하게' },
      { name: 'Largo', min: 40, max: 60, desc: '아주 느리게' },
      { name: 'Larghetto', min: 60, max: 66, desc: '조금 느리게' },
      { name: 'Adagio', min: 66, max: 76, desc: '느리게' },
      { name: 'Andante', min: 76, max: 108, desc: '걷는 빠르기로' },
      { name: 'Moderato', min: 108, max: 120, desc: '보통 빠르기로' },
      { name: 'Allegro moderato', min: 112, max: 124, desc: '약간 빠르게' },
      { name: 'Allegretto', min: 116, max: 120, desc: '조금 빠르게' },
      { name: 'Allegro', min: 120, max: 156, desc: '빠르게' },
      { name: 'Vivace', min: 156, max: 176, desc: '활발하게' },
      { name: 'Presto', min: 168, max: 200, desc: '매우 빠르게' },
      { name: 'Prestissimo', min: 200, max: 300, desc: '가장 빠르게' }
    ];
  }

  init() {
    this.initElements({
      bpmInput: 'bpmInput',
      currentBpm: 'currentBpm',
      tempoTerm: 'tempoTerm',
      tempoList: 'tempoList',
      beatLength: 'beatLength',
      measureLength: 'measureLength',
      measuresPerMin: 'measuresPerMin',
      hertz: 'hertz',
      wholeNote: 'wholeNote',
      halfNote: 'halfNote',
      quarterNote: 'quarterNote',
      eighthNote: 'eighthNote',
      sixteenthNote: 'sixteenthNote'
    });

    this.renderTempoList();
    this.update();

    console.log('[TempoConvert] 초기화 완료');
    return this;
  }

  renderTempoList() {
    this.elements.tempoList.innerHTML = this.tempos.map(tempo => `
      <div class="tempo-item" data-min="${tempo.min}" data-max="${tempo.max}"
           onclick="tempoConvert.selectTempo(${tempo.min}, ${tempo.max})"
           title="${tempo.desc}">
        <span class="tempo-name">${tempo.name}</span>
        <span class="tempo-range">${tempo.min}-${tempo.max}</span>
      </div>
    `).join('');
  }

  selectTempo(min, max) {
    const mid = Math.round((min + max) / 2);
    this.elements.bpmInput.value = mid;
    this.update();
  }

  update() {
    const bpm = parseInt(this.elements.bpmInput.value) || 120;

    this.elements.currentBpm.textContent = bpm;

    const term = this.findTempoTerm(bpm);
    this.elements.tempoTerm.textContent = term;

    document.querySelectorAll('.tempo-item').forEach(item => {
      const min = parseInt(item.dataset.min);
      const max = parseInt(item.dataset.max);
      item.classList.toggle('active', bpm >= min && bpm <= max);
    });

    const beatMs = 60000 / bpm;
    const measureMs = beatMs * 4;
    const measuresPerMin = bpm / 4;
    const hz = bpm / 60;

    this.elements.beatLength.textContent = Math.round(beatMs) + 'ms';
    this.elements.measureLength.textContent = (measureMs / 1000).toFixed(2) + '초';
    this.elements.measuresPerMin.textContent = measuresPerMin.toFixed(1) + '마디';
    this.elements.hertz.textContent = hz.toFixed(2) + 'Hz';

    this.elements.wholeNote.textContent = Math.round(beatMs * 4) + 'ms';
    this.elements.halfNote.textContent = Math.round(beatMs * 2) + 'ms';
    this.elements.quarterNote.textContent = Math.round(beatMs) + 'ms';
    this.elements.eighthNote.textContent = Math.round(beatMs / 2) + 'ms';
    this.elements.sixteenthNote.textContent = Math.round(beatMs / 4) + 'ms';
  }

  findTempoTerm(bpm) {
    for (const tempo of this.tempos) {
      if (bpm >= tempo.min && bpm <= tempo.max) {
        return `${tempo.name} (${tempo.desc})`;
      }
    }

    if (bpm < 20) return 'Grave보다 느림';
    return 'Prestissimo보다 빠름';
  }
}

// 전역 인스턴스 생성
const tempoConvert = new TempoConvert();
window.TempoConvert = tempoConvert;

// 전역 함수 (HTML onclick 호환)
function update() { tempoConvert.update(); }
function selectTempo(min, max) { tempoConvert.selectTempo(min, max); }

document.addEventListener('DOMContentLoaded', () => tempoConvert.init());
