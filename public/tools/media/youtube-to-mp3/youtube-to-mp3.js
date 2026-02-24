/**
 * YouTube to MP3 - ToolBase 기반
 * YouTube 영상에서 오디오 추출
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var YoutubeToMp3 = class YoutubeToMp3 extends ToolBase {
  constructor() {
    super('YoutubeToMp3');
    this.selectedQuality = '320';
    this.videoInfo = null;
  }

  init() {
    this.initElements({
      urlInput: 'urlInput',
      resultBox: 'resultBox',
      videoTitle: 'videoTitle',
      videoMeta: 'videoMeta',
      convertBtn: 'convertBtn',
      progressContainer: 'progressContainer',
      progressFill: 'progressFill',
      progressText: 'progressText'
    });

    this.elements.urlInput.addEventListener('keypress', e => {
      if (e.key === 'Enter') this.analyze();
    });

    document.querySelectorAll('.quality-btn').forEach(btn => {
      btn.addEventListener('click', () => this.selectQuality(btn.dataset.quality));
    });

    console.log('[YoutubeToMp3] 초기화 완료');
    return this;
  }

  selectQuality(quality) {
    this.selectedQuality = quality;
    document.querySelectorAll('.quality-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.quality === quality);
    });
  }

  analyze() {
    const url = this.elements.urlInput.value.trim();

    if (!url) {
      this.showToast('URL을 입력해주세요.', 'warning');
      return;
    }

    if (!this.isValidYoutubeUrl(url)) {
      this.showToast('올바른 YouTube URL이 아닙니다.', 'error');
      return;
    }

    this.videoInfo = this.generateDemoInfo(url);
    this.showVideoInfo();
    this.showToast('영상 분석 완료! (데모)', 'success');
  }

  isValidYoutubeUrl(url) {
    const patterns = [
      /youtube\.com\/watch\?v=/,
      /youtu\.be\//,
      /youtube\.com\/embed\//
    ];
    return patterns.some(p => p.test(url));
  }

  generateDemoInfo(url) {
    const titles = [
      '아름다운 피아노 연주 모음',
      'Lo-Fi Hip Hop Radio',
      'Best EDM Mix 2026',
      '클래식 음악 베스트',
      'Jazz Cafe Music'
    ];

    const channels = [
      'Music Channel',
      'Chill Beats',
      'Piano World',
      'EDM Nation',
      'Jazz Life'
    ];

    return {
      title: titles[Math.floor(Math.random() * titles.length)],
      channel: channels[Math.floor(Math.random() * channels.length)],
      duration: Math.floor(Math.random() * 3600) + 180,
      views: Math.floor(Math.random() * 10000000)
    };
  }

  showVideoInfo() {
    this.elements.videoTitle.textContent = this.videoInfo.title;
    this.elements.videoMeta.textContent =
      `${this.videoInfo.channel} • ${this.formatDuration(this.videoInfo.duration)} • ${this.formatViews(this.videoInfo.views)} 조회수`;
    this.elements.resultBox.style.display = 'block';
  }

  formatDuration(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  formatViews(views) {
    if (views >= 1000000) return (views / 1000000).toFixed(1) + 'M';
    if (views >= 1000) return (views / 1000).toFixed(1) + 'K';
    return views.toString();
  }

  async convert() {
    if (!this.videoInfo) return;

    this.elements.convertBtn.disabled = true;
    this.elements.progressContainer.style.display = 'block';

    for (let i = 0; i <= 100; i += 2) {
      await this.delay(50);
      this.elements.progressFill.style.width = i + '%';

      if (i < 30) {
        this.elements.progressText.textContent = '오디오 추출 중...';
      } else if (i < 70) {
        this.elements.progressText.textContent = `MP3 변환 중... (${this.selectedQuality}kbps)`;
      } else {
        this.elements.progressText.textContent = '파일 준비 중...';
      }
    }

    this.elements.progressText.textContent = '변환 완료! (시뮬레이션)';
    this.elements.convertBtn.disabled = false;
    this.showToast('MP3 변환 완료! (시뮬레이션)', 'success');
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 전역 인스턴스 생성
const youtubeToMp3 = new YoutubeToMp3();
window.YoutubeToMp3 = youtubeToMp3;

// 전역 함수 (HTML onclick 호환)
function analyze() { youtubeToMp3.analyze(); }
function convert() { youtubeToMp3.convert(); }

document.addEventListener('DOMContentLoaded', () => youtubeToMp3.init());
