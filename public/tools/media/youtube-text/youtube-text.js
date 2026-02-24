/**
 * YouTube 텍스트 추출 도구 - ToolBase 기반
 * 로컬 Whisper AI를 사용하여 유튜브 영상 음성을 텍스트로 변환
 * @version 1.0.0
 * @created 2026-01-17
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class YouTubeText extends ToolBase {
  constructor() {
    super('YouTubeText');
    this.videoId = null;
    this.extractedText = '';
    this.timestamps = [];
  }

  init() {
    this.initElements({
      youtubeUrl: 'youtubeUrl',
      videoInfo: 'videoInfo',
      videoThumbnail: 'videoThumbnail',
      videoTitle: 'videoTitle',
      videoChannel: 'videoChannel',
      extractBtn: 'extractBtn',
      extractMethod: 'extractMethod',
      outputLanguage: 'outputLanguage',
      includeTimestamp: 'includeTimestamp',
      progressSection: 'progressSection',
      progressFill: 'progressFill',
      progressText: 'progressText',
      resultPlaceholder: 'resultPlaceholder',
      textResult: 'textResult',
      resultContent: 'resultContent',
      resultInfo: 'resultInfo',
      charCount: 'charCount',
      createNodeBtn: 'createNodeBtn'
    });

    if (this.elements.youtubeUrl) {
      this.elements.youtubeUrl.addEventListener('input', () => this.onUrlChange());
      this.elements.youtubeUrl.addEventListener('paste', () => setTimeout(() => this.onUrlChange(), 100));
    }

    console.log('[YouTubeText] 초기화 완료');
    return this;
  }

  async pasteUrl() {
    try {
      const text = await navigator.clipboard.readText();
      if (this.elements.youtubeUrl) {
        this.elements.youtubeUrl.value = text;
        this.onUrlChange();
      }
    } catch (err) {
      console.error('[YouTubeText] 클립보드 읽기 실패:', err);
      alert('클립보드에서 URL을 읽을 수 없습니다.');
    }
  }

  onUrlChange() {
    const url = this.elements.youtubeUrl?.value?.trim() || '';
    const videoId = this.extractVideoId(url);

    if (videoId) {
      this.videoId = videoId;
      this.showVideoInfo(videoId);
      this.elements.extractBtn.disabled = false;
    } else {
      this.videoId = null;
      this.hideVideoInfo();
      this.elements.extractBtn.disabled = true;
    }
  }

  extractVideoId(url) {
    if (!url) return null;

    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
      /^([a-zA-Z0-9_-]{11})$/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  }

  showVideoInfo(videoId) {
    if (this.elements.videoInfo) {
      this.elements.videoInfo.style.display = 'block';
      this.elements.videoThumbnail.src = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
      this.elements.videoTitle.textContent = '영상 정보 로딩 중...';
      this.elements.videoChannel.textContent = '';

      this.fetchVideoInfo(videoId);
    }
  }

  hideVideoInfo() {
    if (this.elements.videoInfo) this.elements.videoInfo.style.display = 'none';
  }

  async fetchVideoInfo(videoId) {
    try {
      const response = await fetch(`/api/tools/youtube/info?videoId=${videoId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          this.elements.videoTitle.textContent = data.data.title || '제목 없음';
          this.elements.videoChannel.textContent = data.data.channel || '';
        }
      } else {
        this.elements.videoTitle.textContent = `Video ID: ${videoId}`;
        this.elements.videoChannel.textContent = '(영상 정보를 가져올 수 없습니다)';
      }
    } catch (err) {
      this.elements.videoTitle.textContent = `Video ID: ${videoId}`;
      this.elements.videoChannel.textContent = '(영상 정보를 가져올 수 없습니다)';
    }
  }

  async extract() {
    if (!this.videoId) {
      alert('유효한 YouTube URL을 입력해주세요.');
      return;
    }

    const method = this.elements.extractMethod.value;
    const language = this.elements.outputLanguage.value;
    const includeTimestamp = this.elements.includeTimestamp.value === 'yes';

    this.showProgress();
    this.elements.extractBtn.disabled = true;
    this.elements.extractBtn.classList.add('extract-btn-loading');
    this.elements.extractBtn.innerHTML = '<span class="btn-spinner"></span> 추출 중...';

    try {
      this.updateProgress(10, '영상 정보 확인 중...');

      const response = await fetch('/api/tools/youtube/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: this.videoId,
          method,
          language,
          includeTimestamp
        })
      });

      this.updateProgress(30, '음성 추출 중...');

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || '텍스트 추출에 실패했습니다.');
      }

      this.updateProgress(60, 'Whisper AI 변환 중...');

      const result = await response.json();

      this.updateProgress(90, '결과 처리 중...');

      if (result.success && result.data) {
        this.extractedText = result.data.text || '';
        this.timestamps = result.data.timestamps || [];
        this.showResult(this.extractedText, result.data.duration);
      } else {
        throw new Error(result.error || '텍스트 추출 결과가 없습니다.');
      }

      this.updateProgress(100, '완료!');
      setTimeout(() => this.hideProgress(), 1000);

    } catch (error) {
      console.error('[YouTubeText] 추출 오류:', error);
      this.hideProgress();
      this.showError(error.message);
    } finally {
      this.elements.extractBtn.disabled = false;
      this.elements.extractBtn.classList.remove('extract-btn-loading');
      this.elements.extractBtn.textContent = '텍스트 추출 시작';
    }
  }

  showProgress() {
    if (this.elements.progressSection) this.elements.progressSection.style.display = 'block';
  }

  updateProgress(percent, text) {
    if (this.elements.progressFill) this.elements.progressFill.style.width = `${percent}%`;
    if (this.elements.progressText) this.elements.progressText.textContent = text;
  }

  hideProgress() {
    if (this.elements.progressSection) this.elements.progressSection.style.display = 'none';
    this.updateProgress(0, '준비 중...');
  }

  showResult(text, duration) {
    this.elements.resultPlaceholder.style.display = 'none';
    this.elements.textResult.style.display = 'flex';

    this.elements.resultContent.textContent = text;
    this.elements.charCount.textContent = `${text.length.toLocaleString()}자`;

    if (duration) {
      this.elements.resultInfo.textContent = `추출된 텍스트 (${this.formatDuration(duration)})`;
    }
  }

  showError(message) {
    this.elements.resultPlaceholder.style.display = 'flex';
    this.elements.resultPlaceholder.innerHTML = `
      <div class="result-icon"></div>
      <div class="result-message" style="color: #ef4444;">추출 실패</div>
      <div class="result-detail">${message}</div>
    `;
    this.elements.textResult.style.display = 'none';
  }

  async copyText() {
    if (!this.extractedText) {
      alert('복사할 텍스트가 없습니다.');
      return;
    }

    try {
      await navigator.clipboard.writeText(this.extractedText);
      alert('텍스트가 클립보드에 복사되었습니다.');
    } catch (err) {
      console.error('[YouTubeText] 복사 실패:', err);
      alert('텍스트 복사에 실패했습니다.');
    }
  }

  downloadText(format = 'txt') {
    if (!this.extractedText) {
      alert('다운로드할 텍스트가 없습니다.');
      return;
    }

    let content = this.extractedText;
    let filename = `youtube_${this.videoId}_${Date.now()}`;
    let mimeType = 'text/plain';

    if (format === 'srt' && this.timestamps.length > 0) {
      content = this.generateSRT();
      filename += '.srt';
      mimeType = 'text/srt';
    } else {
      filename += '.txt';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  generateSRT() {
    if (!this.timestamps || this.timestamps.length === 0) {
      return this.extractedText;
    }

    let srt = '';
    this.timestamps.forEach((item, index) => {
      srt += `${index + 1}\n`;
      srt += `${this.formatSRTTime(item.start)} --> ${this.formatSRTTime(item.end)}\n`;
      srt += `${item.text}\n\n`;
    });
    return srt;
  }

  formatSRTTime(seconds) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
  }

  formatDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}분 ${secs}초`;
  }

  async createNode() {
    if (!this.extractedText) {
      alert('노드로 생성할 텍스트가 없습니다. 먼저 텍스트를 추출해주세요.');
      return;
    }

    const createNodeBtn = this.elements.createNodeBtn;
    if (createNodeBtn) {
      createNodeBtn.disabled = true;
      createNodeBtn.textContent = '확인 중...';
    }

    try {
      const authResponse = await fetch('/api/auth/check', {
        method: 'GET',
        credentials: 'include'
      });
      const authData = await authResponse.json();

      if (!authData.success || !authData.authenticated) {
        alert('노드 생성은 로그인된 회원 전용 기능입니다.\n로그인 후 다시 시도해주세요.');
        if (createNodeBtn) {
          createNodeBtn.disabled = false;
          createNodeBtn.textContent = '노드생성';
        }
        return;
      }
    } catch (error) {
      console.error('[YouTubeText] 로그인 확인 실패:', error);
      alert('로그인 상태를 확인할 수 없습니다.\n로그인 후 다시 시도해주세요.');
      if (createNodeBtn) {
        createNodeBtn.disabled = false;
        createNodeBtn.textContent = '노드생성';
      }
      return;
    }

    if (createNodeBtn) {
      createNodeBtn.textContent = '생성 중...';
    }

    const nodeData = {
      type: 'tools:createNode',
      source: 'youtube-text',
      title: this.elements.videoTitle?.textContent || 'YouTube 텍스트',
      content: this.extractedText,
      videoId: this.videoId
    };

    let messageSent = false;

    if (window.self !== window.top) {
      window.parent.postMessage(nodeData, '*');
      messageSent = true;
    }

    if (window.opener && !window.opener.closed) {
      window.opener.postMessage(nodeData, '*');
      messageSent = true;
    }

    if (messageSent) {
      navigator.clipboard.writeText(this.extractedText).then(() => {
        alert('텍스트가 클립보드에 복사되었고, 메인 화면에 노드 생성을 요청했습니다.\n메인 화면에서 확인해주세요.');
      }).catch(() => {
        alert('메인 화면에 노드 생성을 요청했습니다.\n메인 화면에서 확인해주세요.');
      });
    } else {
      navigator.clipboard.writeText(this.extractedText).then(() => {
        alert('메인 화면과 연결되지 않았습니다.\n텍스트가 클립보드에 복사되었으니, 메인 화면에서 직접 붙여넣기 해주세요.');
      }).catch(() => {
        alert('메인 화면과 연결되지 않았습니다.\n메인 화면에서 직접 노드를 생성해주세요.');
      });
    }

    setTimeout(() => {
      if (createNodeBtn) {
        createNodeBtn.disabled = false;
        createNodeBtn.textContent = '노드생성';
      }
    }, 1000);
  }
}

// 전역 인스턴스 생성
const youtubeText = new YouTubeText();
window.YouTubeText = youtubeText;

// 전역 함수 (HTML onclick 호환)
function pasteUrl() { youtubeText.pasteUrl(); }
function extract() { youtubeText.extract(); }
function copyText() { youtubeText.copyText(); }
function downloadText(format) { youtubeText.downloadText(format); }
function createNode() { youtubeText.createNode(); }

document.addEventListener('DOMContentLoaded', () => youtubeText.init());
