/**
 * 파일 해시 체커 - ToolBase 기반
 * 파일의 해시값(SHA-1, SHA-256) 계산 및 검증
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class FileHashChecker extends ToolBase {
  constructor() {
    super('FileHashChecker');
    this.currentHashes = { md5: '', sha1: '', sha256: '' };
  }

  init() {
    this.initElements({
      dropZone: 'dropZone',
      fileInput: 'fileInput',
      fileInfo: 'fileInfo',
      fileName: 'fileName',
      fileSize: 'fileSize',
      progressSection: 'progressSection',
      progressFill: 'progressFill',
      progressText: 'progressText',
      resultsSection: 'resultsSection',
      md5Hash: 'md5Hash',
      sha1Hash: 'sha1Hash',
      sha256Hash: 'sha256Hash',
      verifySection: 'verifySection',
      verifyHash: 'verifyHash',
      verifyResult: 'verifyResult'
    });

    this.setupEventListeners();
    console.log('[FileHashChecker] 초기화 완료');
    return this;
  }

  setupEventListeners() {
    const dropZone = this.elements.dropZone;
    const fileInput = this.elements.fileInput;

    this.on(dropZone, 'click', () => fileInput.click());
    this.on(dropZone, 'dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('dragover');
    });
    this.on(dropZone, 'dragleave', () => dropZone.classList.remove('dragover'));
    this.on(dropZone, 'drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
      if (e.dataTransfer.files[0]) this.processFile(e.dataTransfer.files[0]);
    });
    this.on(fileInput, 'change', (e) => {
      if (e.target.files[0]) this.processFile(e.target.files[0]);
    });
    this.on(this.elements.verifyHash, 'input', () => this.verifyHashInput());
  }

  async processFile(file) {
    // 파일 정보 표시
    this.elements.fileName.textContent = file.name;
    this.elements.fileSize.textContent = this.formatFileSize(file.size);
    this.elements.fileInfo.classList.remove('hidden');

    // 진행률 표시
    this.elements.progressSection.classList.remove('hidden');
    this.elements.resultsSection.classList.add('hidden');
    this.elements.verifySection.classList.add('hidden');

    // 해시 계산
    const buffer = await this.readFileAsArrayBuffer(file);

    this.updateProgress(33, 'MD5 계산 중...');
    this.currentHashes.md5 = 'MD5는 Web Crypto API에서 미지원';

    this.updateProgress(66, 'SHA-1 계산 중...');
    this.currentHashes.sha1 = await this.calculateHash('SHA-1', buffer);

    this.updateProgress(100, 'SHA-256 계산 중...');
    this.currentHashes.sha256 = await this.calculateHash('SHA-256', buffer);

    // 결과 표시
    this.elements.md5Hash.textContent = this.currentHashes.md5;
    this.elements.sha1Hash.textContent = this.currentHashes.sha1;
    this.elements.sha256Hash.textContent = this.currentHashes.sha256;

    this.elements.progressSection.classList.add('hidden');
    this.elements.resultsSection.classList.remove('hidden');
    this.elements.verifySection.classList.remove('hidden');
  }

  readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  async calculateHash(algorithm, buffer) {
    const hashBuffer = await crypto.subtle.digest(algorithm, buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  updateProgress(percent, text) {
    this.elements.progressFill.style.width = percent + '%';
    this.elements.progressText.textContent = text;
  }

  copyHash(id) {
    const hash = document.getElementById(id).textContent;
    if (hash && !hash.includes('미지원')) {
      navigator.clipboard.writeText(hash);
      this.showToast('복사되었습니다!');
    }
  }

  verifyHashInput() {
    const input = this.elements.verifyHash.value.trim().toLowerCase();
    const result = this.elements.verifyResult;

    if (!input) {
      result.className = 'verify-result';
      result.textContent = '';
      return;
    }

    const sha1Match = input === this.currentHashes.sha1.toLowerCase();
    const sha256Match = input === this.currentHashes.sha256.toLowerCase();

    if (sha1Match || sha256Match) {
      result.textContent = '해시가 일치합니다 (' + (sha1Match ? 'SHA-1' : 'SHA-256') + ')';
      result.className = 'verify-result match';
    } else {
      result.textContent = '해시가 일치하지 않습니다';
      result.className = 'verify-result no-match';
    }
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const fileHashChecker = new FileHashChecker();
window.FileHashChecker = fileHashChecker;

document.addEventListener('DOMContentLoaded', () => fileHashChecker.init());
