/**
 * AI 음악 생성 - ToolBase 기반
 * AI로 맞춤형 음악 생성
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class AiMusicTool extends ToolBase {
  constructor() {
    super('AiMusicTool');
    this.selectedModel = 'suno';
    this.selectedGenre = 'pop';
    this.selectedMoods = ['happy'];

    this.modelNames = {
      'suno': 'Suno AI',
      'udio': 'Udio',
      'musicgen': 'MusicGen'
    };

    this.genreNames = {
      'pop': '팝',
      'rock': '록',
      'electronic': '일렉트로닉',
      'jazz': '재즈',
      'classical': '클래식',
      'hiphop': '힙합',
      'lofi': 'Lo-Fi',
      'ambient': '앰비언트'
    };

    this.moodNames = {
      'happy': '밝은',
      'sad': '슬픈',
      'energetic': '에너지',
      'calm': '차분한',
      'epic': '웅장한',
      'romantic': '로맨틱',
      'mysterious': '신비로운',
      'dark': '어두운'
    };
  }

  init() {
    this.initElements({
      resultArea: 'resultArea',
      durationSlider: 'durationSlider',
      tempoSlider: 'tempoSlider',
      downloadBtn: 'downloadBtn'
    });

    console.log('[AiMusicTool] 초기화 완료');
    return this;
  }

  selectModel(model) {
    this.selectedModel = model;
    document.querySelectorAll('.model-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.model === model);
    });
  }

  selectGenre(genre) {
    this.selectedGenre = genre;
    document.querySelectorAll('.genre-card').forEach(card => {
      card.classList.toggle('active', card.dataset.genre === genre);
    });
  }

  toggleMood(mood) {
    const idx = this.selectedMoods.indexOf(mood);
    if (idx > -1) {
      if (this.selectedMoods.length > 1) {
        this.selectedMoods.splice(idx, 1);
      } else {
        this.showToast('최소 하나의 분위기를 선택해야 합니다.', 'error');
        return;
      }
    } else {
      if (this.selectedMoods.length >= 3) {
        this.showToast('최대 3개까지 선택할 수 있습니다.', 'error');
        return;
      }
      this.selectedMoods.push(mood);
    }

    document.querySelectorAll('.mood-tag').forEach(tag => {
      tag.classList.toggle('active', this.selectedMoods.includes(tag.dataset.mood));
    });
  }

  async generate() {
    this.showToast('음악 생성 중... (약 30초 소요)');

    await this.delay(3500);

    const duration = this.elements.durationSlider.value;
    const tempo = this.elements.tempoSlider.value;
    const moodText = this.selectedMoods.map(m => this.moodNames[m]).join(', ');

    const resultArea = this.elements.resultArea;
    resultArea.innerHTML = `
      <div class="music-player">
        <div class="player-title">AI Generated Music</div>
        <div class="player-info">
          ${this.genreNames[this.selectedGenre]} | ${moodText} | ${duration}초 | ${tempo} BPM
        </div>
        <audio controls style="width: 100%;">
          <source src="" type="audio/mpeg">
        </audio>
        <div style="margin-top: 1rem; font-size: 0.85rem; color: var(--text-secondary);">
          ${this.modelNames[this.selectedModel]}로 생성됨
        </div>
      </div>
    `;

    this.elements.downloadBtn.disabled = false;
    this.showToast('음악이 생성되었습니다!');
  }

  download() {
    this.showToast('데모 모드: 실제 서비스에서 MP3 다운로드가 가능합니다.');
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 전역 인스턴스 생성
const aiMusicTool = new AiMusicTool();
window.AIMusic = aiMusicTool;

document.addEventListener('DOMContentLoaded', () => aiMusicTool.init());
console.log('[AiMusicTool] 모듈 로드 완료');
