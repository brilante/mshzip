/**
 * MD5/SHA 해시 생성기 - ToolBase 기반
 * 텍스트 및 파일의 다양한 해시값 생성
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class Md5Hash extends ToolBase {
  constructor() {
    super('Md5Hash');
  }

  init() {
    this.initElements({
      textInput: 'textInput',
      uppercase: 'uppercase',
      hashResult: 'hashResult',
      sha1Result: 'sha1Result',
      sha256Result: 'sha256Result',
      sha512Result: 'sha512Result',
      textTab: 'textTab',
      fileTab: 'fileTab',
      fileDrop: 'fileDrop',
      fileInput: 'fileInput',
      fileInfo: 'fileInfo'
    });

    this.setupEventListeners();
    console.log('[Md5Hash] 초기화 완료');
    return this;
  }

  setupEventListeners() {
    this.on(this.elements.textInput, 'input', () => this.generateHashes());
    this.on(this.elements.uppercase, 'change', () => this.generateHashes());

    const fileDrop = this.elements.fileDrop;
    const fileInput = this.elements.fileInput;

    this.on(fileDrop, 'click', () => fileInput.click());
    this.on(fileDrop, 'dragover', (e) => {
      e.preventDefault();
      fileDrop.classList.add('dragover');
    });
    this.on(fileDrop, 'dragleave', () => fileDrop.classList.remove('dragover'));
    this.on(fileDrop, 'drop', (e) => {
      e.preventDefault();
      fileDrop.classList.remove('dragover');
      this.handleFile(e.dataTransfer.files[0]);
    });
    this.on(fileInput, 'change', (e) => {
      if (e.target.files[0]) this.handleFile(e.target.files[0]);
    });
  }

  // MD5 구현
  md5(string) {
    const rotateLeft = (val, shift) => (val << shift) | (val >>> (32 - shift));
    const addUnsigned = (x, y) => (x + y) >>> 0;
    const F = (x, y, z) => (x & y) | (~x & z);
    const G = (x, y, z) => (x & z) | (y & ~z);
    const H = (x, y, z) => x ^ y ^ z;
    const I = (x, y, z) => y ^ (x | ~z);

    const FF = (a, b, c, d, x, s, ac) => addUnsigned(rotateLeft(addUnsigned(a, addUnsigned(addUnsigned(F(b, c, d), x), ac)), s), b);
    const GG = (a, b, c, d, x, s, ac) => addUnsigned(rotateLeft(addUnsigned(a, addUnsigned(addUnsigned(G(b, c, d), x), ac)), s), b);
    const HH = (a, b, c, d, x, s, ac) => addUnsigned(rotateLeft(addUnsigned(a, addUnsigned(addUnsigned(H(b, c, d), x), ac)), s), b);
    const II = (a, b, c, d, x, s, ac) => addUnsigned(rotateLeft(addUnsigned(a, addUnsigned(addUnsigned(I(b, c, d), x), ac)), s), b);

    const convertToWordArray = (str) => {
      const lWordCount = (((str.length + 8) - ((str.length + 8) % 64)) / 64 + 1) * 16;
      const lWordArray = new Array(lWordCount - 1);
      let lByteCount = 0;
      let lWordCount2 = 0;

      while (lByteCount < str.length) {
        lWordCount2 = (lByteCount - (lByteCount % 4)) / 4;
        const lBytePosition = (lByteCount % 4) * 8;
        lWordArray[lWordCount2] = (lWordArray[lWordCount2] | (str.charCodeAt(lByteCount) << lBytePosition));
        lByteCount++;
      }

      lWordCount2 = (lByteCount - (lByteCount % 4)) / 4;
      const lBytePosition = (lByteCount % 4) * 8;
      lWordArray[lWordCount2] = lWordArray[lWordCount2] | (0x80 << lBytePosition);
      lWordArray[lWordCount - 2] = str.length << 3;
      lWordArray[lWordCount - 1] = str.length >>> 29;

      return lWordArray;
    };

    const wordToHex = (value) => {
      let hex = '', temp;
      for (let i = 0; i <= 3; i++) {
        temp = (value >>> (i * 8)) & 255;
        hex += ('0' + temp.toString(16)).slice(-2);
      }
      return hex;
    };

    const x = convertToWordArray(string);
    let a = 0x67452301, b = 0xEFCDAB89, c = 0x98BADCFE, d = 0x10325476;

    const S11 = 7, S12 = 12, S13 = 17, S14 = 22;
    const S21 = 5, S22 = 9, S23 = 14, S24 = 20;
    const S31 = 4, S32 = 11, S33 = 16, S34 = 23;
    const S41 = 6, S42 = 10, S43 = 15, S44 = 21;

    for (let k = 0; k < x.length; k += 16) {
      const AA = a, BB = b, CC = c, DD = d;

      a = FF(a, b, c, d, x[k+0], S11, 0xD76AA478);
      d = FF(d, a, b, c, x[k+1], S12, 0xE8C7B756);
      c = FF(c, d, a, b, x[k+2], S13, 0x242070DB);
      b = FF(b, c, d, a, x[k+3], S14, 0xC1BDCEEE);
      a = FF(a, b, c, d, x[k+4], S11, 0xF57C0FAF);
      d = FF(d, a, b, c, x[k+5], S12, 0x4787C62A);
      c = FF(c, d, a, b, x[k+6], S13, 0xA8304613);
      b = FF(b, c, d, a, x[k+7], S14, 0xFD469501);
      a = FF(a, b, c, d, x[k+8], S11, 0x698098D8);
      d = FF(d, a, b, c, x[k+9], S12, 0x8B44F7AF);
      c = FF(c, d, a, b, x[k+10], S13, 0xFFFF5BB1);
      b = FF(b, c, d, a, x[k+11], S14, 0x895CD7BE);
      a = FF(a, b, c, d, x[k+12], S11, 0x6B901122);
      d = FF(d, a, b, c, x[k+13], S12, 0xFD987193);
      c = FF(c, d, a, b, x[k+14], S13, 0xA679438E);
      b = FF(b, c, d, a, x[k+15], S14, 0x49B40821);

      a = GG(a, b, c, d, x[k+1], S21, 0xF61E2562);
      d = GG(d, a, b, c, x[k+6], S22, 0xC040B340);
      c = GG(c, d, a, b, x[k+11], S23, 0x265E5A51);
      b = GG(b, c, d, a, x[k+0], S24, 0xE9B6C7AA);
      a = GG(a, b, c, d, x[k+5], S21, 0xD62F105D);
      d = GG(d, a, b, c, x[k+10], S22, 0x2441453);
      c = GG(c, d, a, b, x[k+15], S23, 0xD8A1E681);
      b = GG(b, c, d, a, x[k+4], S24, 0xE7D3FBC8);
      a = GG(a, b, c, d, x[k+9], S21, 0x21E1CDE6);
      d = GG(d, a, b, c, x[k+14], S22, 0xC33707D6);
      c = GG(c, d, a, b, x[k+3], S23, 0xF4D50D87);
      b = GG(b, c, d, a, x[k+8], S24, 0x455A14ED);
      a = GG(a, b, c, d, x[k+13], S21, 0xA9E3E905);
      d = GG(d, a, b, c, x[k+2], S22, 0xFCEFA3F8);
      c = GG(c, d, a, b, x[k+7], S23, 0x676F02D9);
      b = GG(b, c, d, a, x[k+12], S24, 0x8D2A4C8A);

      a = HH(a, b, c, d, x[k+5], S31, 0xFFFA3942);
      d = HH(d, a, b, c, x[k+8], S32, 0x8771F681);
      c = HH(c, d, a, b, x[k+11], S33, 0x6D9D6122);
      b = HH(b, c, d, a, x[k+14], S34, 0xFDE5380C);
      a = HH(a, b, c, d, x[k+1], S31, 0xA4BEEA44);
      d = HH(d, a, b, c, x[k+4], S32, 0x4BDECFA9);
      c = HH(c, d, a, b, x[k+7], S33, 0xF6BB4B60);
      b = HH(b, c, d, a, x[k+10], S34, 0xBEBFBC70);
      a = HH(a, b, c, d, x[k+13], S31, 0x289B7EC6);
      d = HH(d, a, b, c, x[k+0], S32, 0xEAA127FA);
      c = HH(c, d, a, b, x[k+3], S33, 0xD4EF3085);
      b = HH(b, c, d, a, x[k+6], S34, 0x4881D05);
      a = HH(a, b, c, d, x[k+9], S31, 0xD9D4D039);
      d = HH(d, a, b, c, x[k+12], S32, 0xE6DB99E5);
      c = HH(c, d, a, b, x[k+15], S33, 0x1FA27CF8);
      b = HH(b, c, d, a, x[k+2], S34, 0xC4AC5665);

      a = II(a, b, c, d, x[k+0], S41, 0xF4292244);
      d = II(d, a, b, c, x[k+7], S42, 0x432AFF97);
      c = II(c, d, a, b, x[k+14], S43, 0xAB9423A7);
      b = II(b, c, d, a, x[k+5], S44, 0xFC93A039);
      a = II(a, b, c, d, x[k+12], S41, 0x655B59C3);
      d = II(d, a, b, c, x[k+3], S42, 0x8F0CCC92);
      c = II(c, d, a, b, x[k+10], S43, 0xFFEFF47D);
      b = II(b, c, d, a, x[k+1], S44, 0x85845DD1);
      a = II(a, b, c, d, x[k+8], S41, 0x6FA87E4F);
      d = II(d, a, b, c, x[k+15], S42, 0xFE2CE6E0);
      c = II(c, d, a, b, x[k+6], S43, 0xA3014314);
      b = II(b, c, d, a, x[k+13], S44, 0x4E0811A1);
      a = II(a, b, c, d, x[k+4], S41, 0xF7537E82);
      d = II(d, a, b, c, x[k+11], S42, 0xBD3AF235);
      c = II(c, d, a, b, x[k+2], S43, 0x2AD7D2BB);
      b = II(b, c, d, a, x[k+9], S44, 0xEB86D391);

      a = addUnsigned(a, AA);
      b = addUnsigned(b, BB);
      c = addUnsigned(c, CC);
      d = addUnsigned(d, DD);
    }

    return wordToHex(a) + wordToHex(b) + wordToHex(c) + wordToHex(d);
  }

  // SHA 해시 (Web Crypto API 사용)
  async sha(algorithm, text) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest(algorithm, data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async generateHashes() {
    const text = this.elements.textInput.value;
    const uppercase = this.elements.uppercase.checked;

    if (!text) {
      this.elements.hashResult.value = '';
      this.elements.sha1Result.value = '';
      this.elements.sha256Result.value = '';
      this.elements.sha512Result.value = '';
      return;
    }

    let md5Hash = this.md5(text);
    let sha1Hash = await this.sha('SHA-1', text);
    let sha256Hash = await this.sha('SHA-256', text);
    let sha512Hash = await this.sha('SHA-512', text);

    if (uppercase) {
      md5Hash = md5Hash.toUpperCase();
      sha1Hash = sha1Hash.toUpperCase();
      sha256Hash = sha256Hash.toUpperCase();
      sha512Hash = sha512Hash.toUpperCase();
    }

    this.elements.hashResult.value = md5Hash;
    this.elements.sha1Result.value = sha1Hash;
    this.elements.sha256Result.value = sha256Hash;
    this.elements.sha512Result.value = sha512Hash;
  }

  switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.textContent.includes(tab === 'text' ? '텍스트' : '파일'));
    });
    this.elements.textTab.classList.toggle('hidden', tab !== 'text');
    this.elements.fileTab.classList.toggle('hidden', tab !== 'file');
  }

  copyHash() {
    const hash = this.elements.hashResult.value;
    if (hash) {
      navigator.clipboard.writeText(hash);
      this.showToast('복사되었습니다!');
    }
  }

  copyTo(id) {
    const hash = document.getElementById(id).value;
    if (hash) {
      navigator.clipboard.writeText(hash);
      this.showToast('복사되었습니다!');
    }
  }

  async handleFile(file) {
    const fileInfo = this.elements.fileInfo;
    fileInfo.classList.add('show');
    fileInfo.innerHTML = '파일명: ' + file.name + '<br>크기: ' + this.formatFileSize(file.size) + '<br><br>해시 계산 중...';

    const buffer = await file.arrayBuffer();
    const text = new TextDecoder().decode(buffer);

    const md5Hash = this.md5(text);
    const sha1Hash = await this.sha('SHA-1', text);
    const sha256Hash = await this.sha('SHA-256', text);

    const uppercase = this.elements.uppercase.checked;

    this.elements.hashResult.value = uppercase ? md5Hash.toUpperCase() : md5Hash;
    this.elements.sha1Result.value = uppercase ? sha1Hash.toUpperCase() : sha1Hash;
    this.elements.sha256Result.value = uppercase ? sha256Hash.toUpperCase() : sha256Hash;

    fileInfo.innerHTML = '파일명: ' + file.name + '<br>크기: ' + this.formatFileSize(file.size) + '<br><br>해시 생성 완료';
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const md5Hash = new Md5Hash();
window.Md5Hash = md5Hash;

document.addEventListener('DOMContentLoaded', () => md5Hash.init());
