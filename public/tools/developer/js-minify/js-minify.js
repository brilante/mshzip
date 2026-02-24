/**
 * JS 압축 도구 - ToolBase 기반
 * JavaScript 코드 압축 및 정리
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var JsMinify = class JsMinify extends ToolBase {
  constructor() {
    super('JsMinify');
  }

  init() {
    this.initElements({
      inputCode: 'inputCode',
      outputCode: 'outputCode',
      removeComments: 'removeComments',
      removeWhitespace: 'removeWhitespace',
      removeNewlines: 'removeNewlines',
      removeConsole: 'removeConsole',
      inputStats: 'inputStats',
      outputStats: 'outputStats',
      savingsInfo: 'savingsInfo'
    });

    console.log('[JsMinify] 초기화 완료');
    return this;
  }

  minify() {
    const input = this.elements.inputCode.value;
    if (!input.trim()) {
      this.showToast('JavaScript 코드를 입력하세요.', 'warning');
      return;
    }

    const removeComments = this.elements.removeComments.checked;
    const removeWhitespace = this.elements.removeWhitespace.checked;
    const removeNewlines = this.elements.removeNewlines.checked;
    const removeConsole = this.elements.removeConsole.checked;

    let result = input;

    try {
      // 문자열 리터럴 보호
      const strings = [];
      let stringIndex = 0;

      // 템플릿 리터럴 보호
      result = result.replace(/`[^`]*`/g, (match) => {
        strings.push(match);
        return `__STRING_${stringIndex++}__`;
      });

      // 일반 문자열 보호
      result = result.replace(/(["'])(?:(?!\1|\\).|\\.)*\1/g, (match) => {
        strings.push(match);
        return `__STRING_${stringIndex++}__`;
      });

      // 정규식 리터럴 보호
      result = result.replace(/\/(?![*\/])(?:\\.|\[(?:\\.|[^\]])*\]|[^\/\r\n\\])+\/[gimsuy]*/g, (match) => {
        strings.push(match);
        return `__STRING_${stringIndex++}__`;
      });

      // 주석 제거
      if (removeComments) {
        result = result.replace(/\/\/[^\n]*/g, '');
        result = result.replace(/\/\*[\s\S]*?\*\//g, '');
      }

      // console.log 제거
      if (removeConsole) {
        result = result.replace(/console\.(log|debug|info|warn|error|trace|dir|table)\s*\([^)]*\)\s*;?/g, '');
      }

      // 불필요한 공백 제거
      if (removeWhitespace) {
        result = result.replace(/[ \t]+/g, ' ');
        result = result.replace(/\s*([{}()[\];,:])\s*/g, '$1');
        result = result.replace(/\s*([+\-*/%=<>!&|^~?])\s*/g, '$1');

        // 키워드 뒤 공백 유지
        const keywords = ['var', 'let', 'const', 'function', 'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'throw', 'try', 'catch', 'finally', 'new', 'delete', 'typeof', 'instanceof', 'in', 'of', 'class', 'extends', 'import', 'export', 'from', 'as', 'async', 'await', 'yield'];
        keywords.forEach(kw => {
          const regex = new RegExp(`\\b${kw}([a-zA-Z0-9_$])`, 'g');
          result = result.replace(regex, `${kw} $1`);
        });
      }

      // 줄바꿈 최소화
      if (removeNewlines) {
        result = result.replace(/\r?\n/g, '');
        result = result.replace(/}([a-zA-Z])/g, '};$1');
      }

      // 문자열 복원
      for (let i = strings.length - 1; i >= 0; i--) {
        result = result.replace(`__STRING_${i}__`, strings[i]);
      }

      result = result.trim();

      this.elements.outputCode.value = result;
      this.updateStats();
      this.showSavings(input.length, result.length);
      this.showSuccess('압축 완료!');

    } catch (error) {
      this.showError('압축 오류: ' + error.message);
    }
  }

  beautify() {
    const input = this.elements.inputCode.value;
    if (!input.trim()) {
      this.showToast('JavaScript 코드를 입력하세요.', 'warning');
      return;
    }

    try {
      let result = input;
      let formatted = '';
      let indent = 0;
      const indentStr = '  ';

      // 기본 정리
      result = result.replace(/\s+/g, ' ');
      result = result.replace(/\s*([{}()[\];,])\s*/g, '$1');

      let i = 0;
      let inString = false;
      let stringChar = '';

      while (i < result.length) {
        const char = result[i];
        const next = result[i + 1] || '';

        // 문자열 처리
        if ((char === '"' || char === "'" || char === '`') && result[i - 1] !== '\\') {
          if (!inString) {
            inString = true;
            stringChar = char;
          } else if (char === stringChar) {
            inString = false;
          }
          formatted += char;
          i++;
          continue;
        }

        if (inString) {
          formatted += char;
          i++;
          continue;
        }

        // 중괄호 처리
        if (char === '{') {
          formatted += ' {\n' + indentStr.repeat(++indent);
        } else if (char === '}') {
          formatted = formatted.trimEnd();
          formatted += '\n' + indentStr.repeat(--indent) + '}';
          if (next && next !== ';' && next !== ',' && next !== ')') {
            formatted += '\n' + indentStr.repeat(indent);
          }
        }
        // 세미콜론 처리
        else if (char === ';') {
          formatted += ';\n' + indentStr.repeat(indent);
        }
        // 콤마 처리 (객체/배열 내부)
        else if (char === ',') {
          formatted += ',\n' + indentStr.repeat(indent);
        }
        else {
          formatted += char;
        }
        i++;
      }

      // 정리
      formatted = formatted.replace(/\n\s*\n/g, '\n');
      formatted = formatted.replace(/{\s+}/g, '{}');

      this.elements.outputCode.value = formatted.trim();
      this.updateStats();
      this.showSuccess('정리 완료!');

    } catch (error) {
      this.showError('정리 오류: ' + error.message);
    }
  }

  showSavings(originalSize, minifiedSize) {
    const savings = originalSize - minifiedSize;
    const percent = ((savings / originalSize) * 100).toFixed(1);

    if (savings > 0) {
      this.elements.savingsInfo.innerHTML = `<span class="savings-badge">${percent}% 절약 (${savings} bytes)</span>`;
    } else {
      this.elements.savingsInfo.innerHTML = '';
    }
  }

  copy() {
    const output = this.elements.outputCode.value;
    if (!output) {
      this.showToast('복사할 내용이 없습니다.', 'warning');
      return;
    }

    navigator.clipboard.writeText(output).then(() => {
      this.showSuccess('클립보드에 복사되었습니다.');
    });
  }

  async paste() {
    try {
      const text = await navigator.clipboard.readText();
      this.elements.inputCode.value = text;
      this.updateStats();
    } catch (e) {
      this.showError('클립보드 접근이 거부되었습니다.');
    }
  }

  download() {
    const output = this.elements.outputCode.value;
    if (!output) {
      this.showToast('다운로드할 내용이 없습니다.', 'warning');
      return;
    }

    this.downloadFile(output, 'script.min.js', 'application/javascript');
  }

  loadSample() {
    const sample = `/**
 * 샘플 JavaScript 코드
 * 간단한 유틸리티 함수들
 */

// 배열에서 중복 제거
function removeDuplicates(array) {
  return [...new Set(array)];
}

// 문자열 첫 글자 대문자
function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// 딥 클론
function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => deepClone(item));
  }

  const cloned = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }

  return cloned;
}

// 디바운스
function debounce(func, wait) {
  let timeout;

  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };

    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// 사용 예시
console.log('테스트 시작');
const arr = [1, 2, 2, 3, 3, 3];
console.log('중복 제거:', removeDuplicates(arr));
console.log('첫 글자 대문자:', capitalize('hello'));`;

    this.elements.inputCode.value = sample;
    this.updateStats();
    this.showToast('샘플 코드가 로드되었습니다.', 'info');
  }

  updateStats() {
    const input = this.elements.inputCode.value;
    const output = this.elements.outputCode.value;

    this.elements.inputStats.textContent =
      `${input.length}자 / ${new Blob([input]).size} bytes`;
    this.elements.outputStats.textContent =
      `${output.length}자 / ${new Blob([output]).size} bytes`;
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const jsMinify = new JsMinify();
window.JsMinify = jsMinify;

document.addEventListener('DOMContentLoaded', () => jsMinify.init());
