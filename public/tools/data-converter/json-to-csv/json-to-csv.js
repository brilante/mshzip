/**
 * JSON → CSV 변환기 - ToolBase 기반
 * JSON 데이터를 CSV 형식으로 변환
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var JsonToCsv = class JsonToCsv extends ToolBase {
  constructor() {
    super('JsonToCsv');
  }

  init() {
    this.initElements({
      jsonInput: 'jsonInput',
      csvOutput: 'csvOutput',
      delimiter: 'delimiter',
      includeHeader: 'includeHeader',
      quoteAll: 'quoteAll',
      statRows: 'statRows',
      statCols: 'statCols',
      statSize: 'statSize'
    });

    console.log('[JsonToCsv] 초기화 완료');
    return this;
  }

  loadFile(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      this.elements.jsonInput.value = e.target.result;
      this.convert();
    };
    reader.readAsText(file);
  }

  escapeValue(value, delimiter, quoteAll) {
    if (value === null || value === undefined) {
      return '';
    }

    const str = String(value);

    // 따옴표가 필요한 경우: 구분자, 줄바꿈, 따옴표 포함 또는 quoteAll
    const needsQuotes = quoteAll ||
      str.includes(delimiter) ||
      str.includes('\n') ||
      str.includes('\r') ||
      str.includes('"');

    if (needsQuotes) {
      return '"' + str.replace(/"/g, '""') + '"';
    }

    return str;
  }

  flattenObject(obj, prefix = '') {
    const result = {};

    for (const key in obj) {
      const newKey = prefix ? `${prefix}.${key}` : key;
      const value = obj[key];

      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        Object.assign(result, this.flattenObject(value, newKey));
      } else if (Array.isArray(value)) {
        result[newKey] = JSON.stringify(value);
      } else {
        result[newKey] = value;
      }
    }

    return result;
  }

  convert() {
    const jsonStr = this.elements.jsonInput.value;
    if (!jsonStr.trim()) {
      this.showToast('JSON 데이터를 입력하세요.', 'warning');
      return;
    }

    const delimiter = this.elements.delimiter.value === '\\t' ? '\t' : this.elements.delimiter.value;
    const includeHeader = this.elements.includeHeader.checked;
    const quoteAll = this.elements.quoteAll.checked;

    try {
      let data = JSON.parse(jsonStr);

      // 배열이 아니면 배열로 감싸기
      if (!Array.isArray(data)) {
        data = [data];
      }

      if (data.length === 0) {
        this.showToast('변환할 데이터가 없습니다.', 'warning');
        return;
      }

      // 모든 객체 평탄화
      const flatData = data.map(item =>
        typeof item === 'object' && item !== null
          ? this.flattenObject(item)
          : { value: item }
      );

      // 모든 키 수집 (순서 유지)
      const allKeys = new Set();
      flatData.forEach(item => {
        Object.keys(item).forEach(key => allKeys.add(key));
      });
      const headers = Array.from(allKeys);

      // CSV 생성
      const rows = [];

      if (includeHeader) {
        rows.push(headers.map(h => this.escapeValue(h, delimiter, quoteAll)).join(delimiter));
      }

      flatData.forEach(item => {
        const row = headers.map(header =>
          this.escapeValue(item[header], delimiter, quoteAll)
        );
        rows.push(row.join(delimiter));
      });

      const csv = rows.join('\n');
      this.elements.csvOutput.value = csv;

      // 통계 업데이트
      this.elements.statRows.textContent = flatData.length.toLocaleString();
      this.elements.statCols.textContent = headers.length;
      this.elements.statSize.textContent = this.formatFileSize(new Blob([csv]).size);

      this.showToast('변환 완료!', 'success');
    } catch (error) {
      console.error('[JsonToCsv] 변환 오류:', error);
      this.showToast('JSON 파싱 오류: ' + error.message, 'error');
    }
  }

  async copyOutput() {
    const output = this.elements.csvOutput.value;
    if (!output) {
      this.showToast('복사할 내용이 없습니다.', 'warning');
      return;
    }

    try {
      await navigator.clipboard.writeText(output);
      this.showToast('클립보드에 복사되었습니다!', 'success');
    } catch (e) {
      this.showToast('복사 실패', 'error');
    }
  }

  download() {
    const output = this.elements.csvOutput.value;
    if (!output) {
      this.showToast('다운로드할 내용이 없습니다.', 'warning');
      return;
    }

    // UTF-8 BOM 추가 (Excel 호환)
    const bom = '\uFEFF';
    this.downloadFile(bom + output, 'data.csv', 'text/csv;charset=utf-8');
    this.showToast('다운로드 시작!', 'success');
  }

  clear() {
    this.elements.jsonInput.value = '';
    this.elements.csvOutput.value = '';
    this.elements.statRows.textContent = '0';
    this.elements.statCols.textContent = '0';
    this.elements.statSize.textContent = '0 B';
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const jsonToCsv = new JsonToCsv();
window.JsonToCsv = jsonToCsv;

document.addEventListener('DOMContentLoaded', () => jsonToCsv.init());
