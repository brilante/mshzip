/**
 * 해시 생성기 도구 - ToolBase 기반
 * MD5, SHA-1, SHA-256, SHA-512 해시 생성
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var HashGenerator = class HashGenerator extends ToolBase {
  constructor() {
    super('HashGenerator');
    this.currentHash = '';
    this.allHashes = {};
    this.hashLengths = {
      'MD5': { hex: 32, base64: 24 },
      'SHA-1': { hex: 40, base64: 28 },
      'SHA-256': { hex: 64, base64: 44 },
      'SHA-512': { hex: 128, base64: 88 }
    };
  }

  init() {
    this.initElements({
      algorithm: 'hashAlgorithm',
      outputFormat: 'outputFormat',
      uppercase: 'uppercase',
      inputText: 'inputText',
      hashOutput: 'hashOutput',
      verifyInput: 'verifyInput',
      verifyResult: 'verifyResult',
      charCount: 'charCount',
      byteCount: 'byteCount',
      statAlgorithm: 'statAlgorithm',
      statLength: 'statLength',
      statFormat: 'statFormat',
      allHashesContainer: 'allHashesContainer',
      toggleIcon: 'toggleIcon'
    });

    // 옵션 변경 이벤트
    this.on(this.elements.algorithm, 'change', () => this.generateHash());
    this.on(this.elements.outputFormat, 'change', () => this.generateHash());
    this.on(this.elements.uppercase, 'change', () => this.generateHash());

    // 키보드 단축키
    this.on(document, 'keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        this.generateHash();
      }
    });

    this.updateStats();
    console.log('[HashGenerator] 초기화 완료');
    return this;
  }

  md5(string) {
    function md5cycle(x, k) {
      let a = x[0], b = x[1], c = x[2], d = x[3];
      a = ff(a, b, c, d, k[0], 7, -680876936);
      d = ff(d, a, b, c, k[1], 12, -389564586);
      c = ff(c, d, a, b, k[2], 17, 606105819);
      b = ff(b, c, d, a, k[3], 22, -1044525330);
      a = ff(a, b, c, d, k[4], 7, -176418897);
      d = ff(d, a, b, c, k[5], 12, 1200080426);
      c = ff(c, d, a, b, k[6], 17, -1473231341);
      b = ff(b, c, d, a, k[7], 22, -45705983);
      a = ff(a, b, c, d, k[8], 7, 1770035416);
      d = ff(d, a, b, c, k[9], 12, -1958414417);
      c = ff(c, d, a, b, k[10], 17, -42063);
      b = ff(b, c, d, a, k[11], 22, -1990404162);
      a = ff(a, b, c, d, k[12], 7, 1804603682);
      d = ff(d, a, b, c, k[13], 12, -40341101);
      c = ff(c, d, a, b, k[14], 17, -1502002290);
      b = ff(b, c, d, a, k[15], 22, 1236535329);
      a = gg(a, b, c, d, k[1], 5, -165796510);
      d = gg(d, a, b, c, k[6], 9, -1069501632);
      c = gg(c, d, a, b, k[11], 14, 643717713);
      b = gg(b, c, d, a, k[0], 20, -373897302);
      a = gg(a, b, c, d, k[5], 5, -701558691);
      d = gg(d, a, b, c, k[10], 9, 38016083);
      c = gg(c, d, a, b, k[15], 14, -660478335);
      b = gg(b, c, d, a, k[4], 20, -405537848);
      a = gg(a, b, c, d, k[9], 5, 568446438);
      d = gg(d, a, b, c, k[14], 9, -1019803690);
      c = gg(c, d, a, b, k[3], 14, -187363961);
      b = gg(b, c, d, a, k[8], 20, 1163531501);
      a = gg(a, b, c, d, k[13], 5, -1444681467);
      d = gg(d, a, b, c, k[2], 9, -51403784);
      c = gg(c, d, a, b, k[7], 14, 1735328473);
      b = gg(b, c, d, a, k[12], 20, -1926607734);
      a = hh(a, b, c, d, k[5], 4, -378558);
      d = hh(d, a, b, c, k[8], 11, -2022574463);
      c = hh(c, d, a, b, k[11], 16, 1839030562);
      b = hh(b, c, d, a, k[14], 23, -35309556);
      a = hh(a, b, c, d, k[1], 4, -1530992060);
      d = hh(d, a, b, c, k[4], 11, 1272893353);
      c = hh(c, d, a, b, k[7], 16, -155497632);
      b = hh(b, c, d, a, k[10], 23, -1094730640);
      a = hh(a, b, c, d, k[13], 4, 681279174);
      d = hh(d, a, b, c, k[0], 11, -358537222);
      c = hh(c, d, a, b, k[3], 16, -722521979);
      b = hh(b, c, d, a, k[6], 23, 76029189);
      a = hh(a, b, c, d, k[9], 4, -640364487);
      d = hh(d, a, b, c, k[12], 11, -421815835);
      c = hh(c, d, a, b, k[15], 16, 530742520);
      b = hh(b, c, d, a, k[2], 23, -995338651);
      a = ii(a, b, c, d, k[0], 6, -198630844);
      d = ii(d, a, b, c, k[7], 10, 1126891415);
      c = ii(c, d, a, b, k[14], 15, -1416354905);
      b = ii(b, c, d, a, k[5], 21, -57434055);
      a = ii(a, b, c, d, k[12], 6, 1700485571);
      d = ii(d, a, b, c, k[3], 10, -1894986606);
      c = ii(c, d, a, b, k[10], 15, -1051523);
      b = ii(b, c, d, a, k[1], 21, -2054922799);
      a = ii(a, b, c, d, k[8], 6, 1873313359);
      d = ii(d, a, b, c, k[15], 10, -30611744);
      c = ii(c, d, a, b, k[6], 15, -1560198380);
      b = ii(b, c, d, a, k[13], 21, 1309151649);
      a = ii(a, b, c, d, k[4], 6, -145523070);
      d = ii(d, a, b, c, k[11], 10, -1120210379);
      c = ii(c, d, a, b, k[2], 15, 718787259);
      b = ii(b, c, d, a, k[9], 21, -343485551);
      x[0] = add32(a, x[0]);
      x[1] = add32(b, x[1]);
      x[2] = add32(c, x[2]);
      x[3] = add32(d, x[3]);
    }

    function cmn(q, a, b, x, s, t) {
      a = add32(add32(a, q), add32(x, t));
      return add32((a << s) | (a >>> (32 - s)), b);
    }
    function ff(a, b, c, d, x, s, t) { return cmn((b & c) | ((~b) & d), a, b, x, s, t); }
    function gg(a, b, c, d, x, s, t) { return cmn((b & d) | (c & (~d)), a, b, x, s, t); }
    function hh(a, b, c, d, x, s, t) { return cmn(b ^ c ^ d, a, b, x, s, t); }
    function ii(a, b, c, d, x, s, t) { return cmn(c ^ (b | (~d)), a, b, x, s, t); }
    function add32(a, b) { return (a + b) & 0xFFFFFFFF; }

    function md5blk(s) {
      const md5blks = [];
      for (let i = 0; i < 64; i += 4) {
        md5blks[i >> 2] = s.charCodeAt(i) + (s.charCodeAt(i + 1) << 8) + (s.charCodeAt(i + 2) << 16) + (s.charCodeAt(i + 3) << 24);
      }
      return md5blks;
    }

    function rhex(n) {
      const hex_chr = '0123456789abcdef';
      let s = '';
      for (let j = 0; j < 4; j++) {
        s += hex_chr.charAt((n >> (j * 8 + 4)) & 0x0F) + hex_chr.charAt((n >> (j * 8)) & 0x0F);
      }
      return s;
    }

    function hex(x) {
      for (let i = 0; i < x.length; i++) {
        x[i] = rhex(x[i]);
      }
      return x.join('');
    }

    let utf8 = unescape(encodeURIComponent(string));
    let n = utf8.length;
    const state = [1732584193, -271733879, -1732584194, 271733878];
    let i;
    for (i = 64; i <= n; i += 64) {
      md5cycle(state, md5blk(utf8.substring(i - 64, i)));
    }
    utf8 = utf8.substring(i - 64);
    const tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    for (i = 0; i < utf8.length; i++) {
      tail[i >> 2] |= utf8.charCodeAt(i) << ((i % 4) << 3);
    }
    tail[i >> 2] |= 0x80 << ((i % 4) << 3);
    if (i > 55) {
      md5cycle(state, tail);
      for (i = 0; i < 16; i++) tail[i] = 0;
    }
    tail[14] = n * 8;
    md5cycle(state, tail);
    return hex(state);
  }

  async cryptoHash(algorithm, text) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest(algorithm, data);
    return hashBuffer;
  }

  bufferToHex(buffer) {
    return Array.from(new Uint8Array(buffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  bufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  async generateHash() {
    const text = this.elements.inputText.value;
    const algorithm = this.elements.algorithm.value;
    const format = this.elements.outputFormat.value;
    const uppercase = this.elements.uppercase.checked;

    this.elements.charCount.textContent = text.length;
    this.elements.byteCount.textContent = new TextEncoder().encode(text).length;

    if (!text) {
      this.currentHash = '';
      this.elements.hashOutput.textContent = '해시 결과가 여기에 표시됩니다';
      this.elements.hashOutput.classList.remove('has-value');
      this.clearAllHashes();
      this.updateStats();
      return;
    }

    try {
      let hash;

      if (algorithm === 'MD5') {
        hash = this.md5(text);
        if (format === 'base64') {
          const bytes = new Uint8Array(hash.match(/.{2}/g).map(byte => parseInt(byte, 16)));
          hash = btoa(String.fromCharCode(...bytes));
        }
      } else {
        const buffer = await this.cryptoHash(algorithm, text);
        hash = format === 'hex' ? this.bufferToHex(buffer) : this.bufferToBase64(buffer);
      }

      if (uppercase && format === 'hex') {
        hash = hash.toUpperCase();
      }

      this.currentHash = hash;
      this.elements.hashOutput.textContent = hash;
      this.elements.hashOutput.classList.add('has-value');

      await this.updateAllHashes(text, format, uppercase);
      this.verifyHash();
    } catch (error) {
      console.error('[HashGenerator] 해시 생성 실패:', error);
      this.elements.hashOutput.textContent = '해시 생성 오류';
    }

    this.updateStats();
  }

  async updateAllHashes(text, format, uppercase) {
    if (!text) {
      this.clearAllHashes();
      return;
    }

    const algorithms = ['MD5', 'SHA-1', 'SHA-256', 'SHA-512'];

    for (const algo of algorithms) {
      try {
        let hash;
        if (algo === 'MD5') {
          hash = this.md5(text);
          if (format === 'base64') {
            const bytes = new Uint8Array(hash.match(/.{2}/g).map(byte => parseInt(byte, 16)));
            hash = btoa(String.fromCharCode(...bytes));
          }
        } else {
          const buffer = await this.cryptoHash(algo, text);
          hash = format === 'hex' ? this.bufferToHex(buffer) : this.bufferToBase64(buffer);
        }

        if (uppercase && format === 'hex') {
          hash = hash.toUpperCase();
        }

        this.allHashes[algo] = hash;
        const elementId = 'hash' + algo.replace('-', '');
        const element = document.getElementById(elementId);
        if (element) {
          element.textContent = hash;
        }
      } catch (error) {
        console.error(`[HashGenerator] ${algo} 해시 생성 실패:`, error);
      }
    }
  }

  clearAllHashes() {
    this.allHashes = {};
    ['MD5', 'SHA1', 'SHA256', 'SHA512'].forEach(id => {
      const element = document.getElementById('hash' + id);
      if (element) {
        element.textContent = '-';
      }
    });
  }

  updateStats() {
    const algorithm = this.elements.algorithm.value;
    const format = this.elements.outputFormat.value;

    this.elements.statAlgorithm.textContent = algorithm;
    this.elements.statLength.textContent = this.hashLengths[algorithm][format];
    this.elements.statFormat.textContent = format === 'hex' ? 'Hex' : 'Base64';
  }

  copyHash() {
    if (!this.currentHash) {
      this.showToast('복사할 해시가 없습니다', 'warning');
      return;
    }

    navigator.clipboard.writeText(this.currentHash).then(() => {
      this.showSuccess('해시가 복사되었습니다');
    });
  }

  copySpecificHash(algorithm) {
    const hash = this.allHashes[algorithm];
    if (!hash) {
      this.showToast('복사할 해시가 없습니다', 'warning');
      return;
    }

    navigator.clipboard.writeText(hash).then(() => {
      this.showSuccess(`${algorithm} 해시가 복사되었습니다`);
    });
  }

  verifyHash() {
    const input = this.elements.verifyInput.value.trim();
    const resultEl = this.elements.verifyResult;

    if (!input || !this.currentHash) {
      resultEl.textContent = '';
      resultEl.className = 'verify-result';
      return;
    }

    const isMatch = input.toLowerCase() === this.currentHash.toLowerCase();

    if (isMatch) {
      resultEl.textContent = '일치';
      resultEl.className = 'verify-result match';
    } else {
      resultEl.textContent = '불일치';
      resultEl.className = 'verify-result no-match';
    }
  }

  toggleAllHashes() {
    const container = this.elements.allHashesContainer;
    const icon = this.elements.toggleIcon;

    if (container.classList.contains('hidden')) {
      container.classList.remove('hidden');
      icon.textContent = '▲';
    } else {
      container.classList.add('hidden');
      icon.textContent = '▼';
    }
  }

  async pasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      this.elements.inputText.value = text;
      this.generateHash();
      this.showSuccess('클립보드에서 붙여넣었습니다');
    } catch (error) {
      this.showError('클립보드 접근 실패');
    }
  }

  clearInput() {
    this.elements.inputText.value = '';
    this.elements.verifyInput.value = '';
    this.elements.verifyResult.textContent = '';
    this.elements.verifyResult.className = 'verify-result';
    this.generateHash();
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const hashGenerator = new HashGenerator();
window.HashGenerator = hashGenerator;

document.addEventListener('DOMContentLoaded', () => hashGenerator.init());
