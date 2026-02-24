/**
 * UUID 생성기 도구 - ToolBase 기반
 * UUID v1/v4 생성, 검증, 포맷팅
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var UuidGenerator = class UuidGenerator extends ToolBase {
  constructor() {
    super('UuidGenerator');
    this.generatedUuids = [];
  }

  init() {
    this.initElements({
      count: 'uuidCount',
      version: 'uuidVersion',
      uppercase: 'uppercase',
      noHyphens: 'noHyphens',
      addBraces: 'addBraces',
      output: 'uuidOutput',
      validateInput: 'validateInput',
      validateResult: 'validateResult',
      statTotal: 'statTotal',
      statVersion: 'statVersion',
      statFormat: 'statFormat'
    });

    // 키보드 단축키
    this.on(document, 'keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        this.generate();
      }
    });

    console.log('[UuidGenerator] 초기화 완료');
    return this;
  }

  generateUuidV4() {
    if (crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  generateUuidV1() {
    const now = Date.now();
    const timeHex = now.toString(16).padStart(12, '0');
    const timeLow = timeHex.slice(-8);
    const timeMid = timeHex.slice(-12, -8);
    const timeHi = '1' + timeHex.slice(0, 3);

    const clockSeq = (Math.random() * 0x3fff | 0x8000).toString(16);
    const node = Array.from({ length: 6 }, () =>
      Math.floor(Math.random() * 256).toString(16).padStart(2, '0')
    ).join('');

    return `${timeLow}-${timeMid}-${timeHi}-${clockSeq}-${node}`;
  }

  generate() {
    const count = parseInt(this.elements.count.value) || 1;
    const version = this.elements.version.value;
    const uppercase = this.elements.uppercase.checked;
    const noHyphens = this.elements.noHyphens.checked;
    const addBraces = this.elements.addBraces.checked;

    this.generatedUuids = [];

    for (let i = 0; i < count; i++) {
      let uuid = version === '1' ? this.generateUuidV1() : this.generateUuidV4();
      uuid = this.formatUuid(uuid, { uppercase, noHyphens, addBraces });
      this.generatedUuids.push(uuid);
    }

    this.renderOutput();
    this.updateStats();
  }

  formatUuid(uuid, options = {}) {
    let result = uuid;

    if (options.uppercase) {
      result = result.toUpperCase();
    }

    if (options.noHyphens) {
      result = result.replace(/-/g, '');
    }

    if (options.addBraces) {
      result = `{${result}}`;
    }

    return result;
  }

  renderOutput() {
    if (this.generatedUuids.length === 0) {
      this.elements.output.innerHTML = '<div class="uuid-placeholder">UUID 생성 버튼을 클릭하세요</div>';
      return;
    }

    const html = this.generatedUuids.map((uuid, index) => `
      <div class="uuid-item">
        <span class="uuid-index">${index + 1}</span>
        <code class="uuid-value">${uuid}</code>
        <button class="uuid-copy-btn" onclick="uuidGenerator.copyOne(${index})" title="복사">
          </button>
      </div>
    `).join('');

    this.elements.output.innerHTML = html;
  }

  updateStats() {
    const version = this.elements.version.value;
    const noHyphens = this.elements.noHyphens.checked;
    const addBraces = this.elements.addBraces.checked;

    this.elements.statTotal.textContent = this.generatedUuids.length;
    this.elements.statVersion.textContent = `v${version}`;

    let format = '표준';
    if (noHyphens) format = '하이픈 없음';
    if (addBraces) format = 'GUID';
    this.elements.statFormat.textContent = format;
  }

  copyOne(index) {
    const uuid = this.generatedUuids[index];
    if (uuid) {
      navigator.clipboard.writeText(uuid).then(() => {
        this.showSuccess('UUID가 복사되었습니다');
      });
    }
  }

  copyAll() {
    if (this.generatedUuids.length === 0) {
      this.showToast('복사할 UUID가 없습니다', 'warning');
      return;
    }

    const text = this.generatedUuids.join('\n');
    navigator.clipboard.writeText(text).then(() => {
      this.showSuccess(`${this.generatedUuids.length}개 UUID가 복사되었습니다`);
    });
  }

  download() {
    if (this.generatedUuids.length === 0) {
      this.showToast('다운로드할 UUID가 없습니다', 'warning');
      return;
    }

    const text = this.generatedUuids.join('\n');
    this.downloadFile(text, `uuids-${Date.now()}.txt`, 'text/plain');
  }

  validate() {
    const input = this.elements.validateInput.value.trim();
    const resultEl = this.elements.validateResult;

    if (!input) {
      resultEl.textContent = '';
      resultEl.className = 'validate-result';
      return;
    }

    const patterns = [
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      /^[0-9a-f]{32}$/i,
      /^\{[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\}$/i
    ];

    const isValid = patterns.some(pattern => pattern.test(input));

    if (isValid) {
      let version = '?';
      const normalized = input.replace(/[{}-]/g, '');
      const versionChar = normalized[12];
      if (['1', '2', '3', '4', '5'].includes(versionChar)) {
        version = versionChar;
      }

      resultEl.textContent = `유효 (v${version})`;
      resultEl.className = 'validate-result valid';
    } else {
      resultEl.textContent = '유효하지 않음';
      resultEl.className = 'validate-result invalid';
    }
  }

  clear() {
    this.generatedUuids = [];
    this.renderOutput();
    this.elements.statTotal.textContent = '0';
    this.elements.validateInput.value = '';
    this.elements.validateResult.textContent = '';
    this.elements.validateResult.className = 'validate-result';
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const uuidGenerator = new UuidGenerator();
window.UuidGenerator = uuidGenerator;

document.addEventListener('DOMContentLoaded', () => uuidGenerator.init());
