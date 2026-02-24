/**
 * Speech-to-Text - ToolBase 기반
 * 음성을 텍스트로 변환
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class SttTool extends ToolBase {
  constructor() {
    super('SttTool');
    this.selectedModel = 'whisper';
    this.isRecording = false;
    this.recognition = null;
    this.resultText = '';
    this.recordTime = 0;
    this.recordInterval = null;

    this.modelNames = {
      'whisper': 'Whisper',
      'google-stt': 'Google STT',
      'azure-stt': 'Azure STT'
    };
  }

  init() {
    this.initElements({
      langSelect: 'langSelect',
      recordBtn: 'recordBtn',
      recordStatus: 'recordStatus',
      recordTime: 'recordTime',
      resultContent: 'resultContent',
      copyBtn: 'copyBtn',
      downloadBtn: 'downloadBtn'
    });

    // Web Speech API 초기화
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;

      this.recognition.onresult = (event) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          this.resultText += finalTranscript + ' ';
          this.updateResult();
        }
      };

      this.recognition.onend = () => {
        if (this.isRecording) {
          this.recognition.start();
        }
      };
    }

    console.log('[SttTool] 초기화 완료');
    return this;
  }

  selectModel(model) {
    this.selectedModel = model;
    document.querySelectorAll('.model-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.model === model);
    });
  }

  toggleRecord() {
    if (this.isRecording) {
      this.stopRecord();
    } else {
      this.startRecord();
    }
  }

  startRecord() {
    if (!this.recognition) {
      this.showToast('이 브라우저는 음성 인식을 지원하지 않습니다.', 'error');
      return;
    }

    this.isRecording = true;
    this.recognition.lang = this.elements.langSelect.value;
    this.recognition.start();

    this.elements.recordBtn.classList.add('recording');
    this.elements.recordStatus.textContent = '녹음 중... 클릭하여 중지';

    this.recordTime = 0;
    this.recordInterval = setInterval(() => {
      this.recordTime++;
      const mins = Math.floor(this.recordTime / 60).toString().padStart(2, '0');
      const secs = (this.recordTime % 60).toString().padStart(2, '0');
      this.elements.recordTime.textContent = `${mins}:${secs}`;
    }, 1000);
  }

  stopRecord() {
    this.isRecording = false;
    if (this.recognition) {
      this.recognition.stop();
    }

    this.elements.recordBtn.classList.remove('recording');
    this.elements.recordStatus.textContent = '버튼을 클릭하여 녹음 시작';

    clearInterval(this.recordInterval);

    if (this.resultText) {
      this.showToast(`${this.modelNames[this.selectedModel]}로 변환 완료!`);
    }
  }

  handleFile(event) {
    const file = event.target.files[0];
    if (file) {
      this.showToast('파일 처리 중...');

      // 데모: 시뮬레이션된 결과
      setTimeout(() => {
        this.resultText = `[${file.name}] 에서 추출된 텍스트입니다.\n\n안녕하세요, 이것은 음성 인식 데모입니다. 실제 서비스에서는 업로드된 오디오 파일이 AI 모델로 처리되어 텍스트로 변환됩니다.`;
        this.updateResult();
        this.showToast('파일 변환 완료!');
      }, 2000);
    }
  }

  updateResult() {
    const content = this.elements.resultContent;
    content.innerHTML = `<div class="result-text">${this.resultText}</div>`;
    this.elements.copyBtn.disabled = false;
    this.elements.downloadBtn.disabled = false;
  }

  copy() {
    if (!this.resultText) return;
    this.copyToClipboard(this.resultText);
  }

  download() {
    if (!this.resultText) return;
    const blob = new Blob([this.resultText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = 'transcription.txt';
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
    this.showToast('텍스트가 다운로드되었습니다!');
  }
}

// 전역 인스턴스 생성
const sttTool = new SttTool();
window.STT = sttTool;

document.addEventListener('DOMContentLoaded', () => sttTool.init());
console.log('[SttTool] 모듈 로드 완료');
