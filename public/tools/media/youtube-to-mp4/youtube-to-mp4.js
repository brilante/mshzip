/**
 * YouTube to MP4 - ToolBase 기반
 * YouTube 영상 다운로드
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var YoutubeToMp4 = class YoutubeToMp4 extends ToolBase {
  constructor() {
    super('YoutubeToMp4');
    this.selectedQuality = '1080';
    this.videoInfo = null;
  }

  init() {
    this.initElements({
      urlInput: 'urlInput',
      resultBox: 'resultBox',
      videoTitle: 'videoTitle',
      videoMeta: 'videoMeta',
      downloadBtn: 'downloadBtn',
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

    console.log('[YoutubeToMp4] 초기화 완료');
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
      '여행 브이로그 - 제주도 3박4일',
      '코딩 튜토리얼 - React 완벽 가이드',
      '요리 레시피 - 초간단 파스타',
      '게임 플레이 - 신작 리뷰',
      '음악 MV - 인기 신곡'
    ];

    const channels = [
      'Travel Vlog',
      'Code Academy',
      'Chef Kitchen',
      'Gaming World',
      'Music Official'
    ];

    return {
      title: titles[Math.floor(Math.random() * titles.length)],
      channel: channels[Math.floor(Math.random() * channels.length)],
      duration: Math.floor(Math.random() * 1800) + 300,
      views: Math.floor(Math.random() * 5000000)
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

  async download() {
    if (!this.videoInfo) return;

    this.elements.downloadBtn.disabled = true;
    this.elements.progressContainer.style.display = 'block';

    for (let i = 0; i <= 100; i += 1) {
      await this.delay(30);
      this.elements.progressFill.style.width = i + '%';

      const downloaded = Math.floor((i / 100) * 200);
      this.elements.progressText.textContent =
        `다운로드 중... ${downloaded}MB / 200MB (${i}%)`;
    }

    this.elements.progressText.textContent = '다운로드 완료! (시뮬레이션)';
    this.elements.downloadBtn.disabled = false;
    this.showToast('MP4 다운로드 완료! (시뮬레이션)', 'success');
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 전역 인스턴스 생성
const youtubeToMp4 = new YoutubeToMp4();
window.YoutubeToMp4 = youtubeToMp4;

// 전역 함수 (HTML onclick 호환)
function analyze() { youtubeToMp4.analyze(); }
function download() { youtubeToMp4.download(); }

document.addEventListener('DOMContentLoaded', () => youtubeToMp4.init());
