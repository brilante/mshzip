/**
 * 팟캐스트 생성 - ToolBase 기반
 * AI로 팟캐스트 에피소드 제작
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class PodcastGenTool extends ToolBase {
  constructor() {
    super('PodcastGenTool');
    this.selectedModel = 'notebooklm';
    this.selectedFormat = 'interview';

    this.modelNames = {
      'notebooklm': 'NotebookLM',
      'elevenlabs': 'ElevenLabs',
      'descript': 'Descript'
    };

    this.formatNames = {
      'interview': '인터뷰',
      'discussion': '토론',
      'narration': '내레이션'
    };
  }

  init() {
    this.initElements({
      scriptSection: 'scriptSection',
      resultArea: 'resultArea',
      durationSlider: 'durationSlider',
      bgmSelect: 'bgmSelect',
      downloadBtn: 'downloadBtn'
    });

    console.log('[PodcastGenTool] 초기화 완료');
    return this;
  }

  selectModel(model) {
    this.selectedModel = model;
    document.querySelectorAll('.model-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.model === model);
    });
  }

  selectFormat(format) {
    this.selectedFormat = format;
    document.querySelectorAll('.format-card').forEach(card => {
      card.classList.toggle('active', card.dataset.format === format);
    });
  }

  addScript() {
    const section = this.elements.scriptSection;
    const addBtn = section.querySelector('.add-script-btn');

    const scriptItem = document.createElement('div');
    scriptItem.className = 'script-item';
    scriptItem.innerHTML = `
      <div class="script-speaker">
        <select>
          <option value="host">호스트</option>
          <option value="guest1">게스트 1</option>
          <option value="guest2">게스트 2</option>
          <option value="narrator">내레이터</option>
        </select>
      </div>
      <div class="script-text">
        <textarea placeholder="대사를 입력하세요..."></textarea>
      </div>
    `;

    section.insertBefore(scriptItem, addBtn);
    this.showToast('대사가 추가되었습니다.');
  }

  async generate() {
    const scripts = document.querySelectorAll('.script-item');
    let hasContent = false;

    scripts.forEach(item => {
      const text = item.querySelector('textarea').value.trim();
      if (text) hasContent = true;
    });

    if (!hasContent) {
      this.showToast('스크립트를 입력하세요.', 'error');
      return;
    }

    this.showToast('팟캐스트 생성 중...');

    await this.delay(3000);

    const duration = this.elements.durationSlider.value;
    const bgm = this.elements.bgmSelect.value;

    const resultArea = this.elements.resultArea;
    resultArea.innerHTML = `
      <div style="margin-bottom: 1rem;">팟캐스트 생성 완료!</div>
      <div style="background: var(--bg-secondary); padding: 1rem; border-radius: 8px; margin: 1rem 0;">
        <div style="font-size: 0.9rem; font-weight: 600; margin-bottom: 0.5rem;">MyMind3 팟캐스트</div>
        <div style="font-size: 0.8rem; color: var(--text-secondary);">
          형식: ${this.formatNames[this.selectedFormat]} | 길이: 약 ${duration}분 |
          BGM: ${bgm === 'none' ? '없음' : this.getBgmName(bgm)}
        </div>
        <audio controls style="width: 100%; margin-top: 1rem;">
          <source src="" type="audio/mpeg">
        </audio>
      </div>
      <div style="font-size: 0.85rem; color: var(--text-secondary);">
        ${this.modelNames[this.selectedModel]}로 생성됨
      </div>
    `;

    this.elements.downloadBtn.disabled = false;
    this.showToast('팟캐스트가 생성되었습니다!');
  }

  getBgmName(bgm) {
    const names = {
      'upbeat': '밝은 분위기',
      'calm': '차분한 분위기',
      'corporate': '비즈니스',
      'tech': '테크/미래'
    };
    return names[bgm] || bgm;
  }

  download() {
    this.showToast('데모 모드: 실제 서비스에서 MP3 다운로드가 가능합니다.');
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 전역 인스턴스 생성
const podcastGenTool = new PodcastGenTool();
window.PodcastGen = podcastGenTool;

document.addEventListener('DOMContentLoaded', () => podcastGenTool.init());
console.log('[PodcastGenTool] 모듈 로드 완료');
