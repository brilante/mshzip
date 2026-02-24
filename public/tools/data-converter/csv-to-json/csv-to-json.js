/**
 * CSV → JSON 변환기 - ToolBase 기반
 * CSV 데이터를 JSON 형식으로 변환
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var CsvToJson = class CsvToJson extends ToolBase {
  constructor() {
    super('CsvToJson');
  }

  init() {
    this.initElements({
      csvInput: 'csvInput',
      jsonOutput: 'jsonOutput',
      delimiter: 'delimiter',
      hasHeader: 'hasHeader',
      trimValues: 'trimValues',
      statRows: 'statRows',
      statCols: 'statCols',
      statSize: 'statSize'
    });

    console.log('[CsvToJson] 초기화 완료');
    return this;
  }

  loadFile(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      this.elements.csvInput.value = e.target.result;
      this.convert();
    };
    reader.readAsText(file);
  }

  parseCSV(csv, delimiter = ',') {
    const lines = csv.split(/\r?\n/).filter(line => line.trim());
    if (lines.length === 0) return [];

    const result = [];
    let currentLine = '';
    let inQuotes = false;

    for (const line of lines) {
      currentLine += (currentLine ? '\n' : '') + line;

      // 따옴표 카운트로 완전한 행인지 확인
      const quoteCount = (currentLine.match(/"/g) || []).length;
      inQuotes = quoteCount % 2 !== 0;

      if (!inQuotes) {
        result.push(this.parseLine(currentLine, delimiter));
        currentLine = '';
      }
    }

    // 마지막 불완전한 행 처리
    if (currentLine) {
      result.push(this.parseLine(currentLine, delimiter));
    }

    return result;
  }

  parseLine(line, delimiter) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (inQuotes) {
        if (char === '"') {
          if (nextChar === '"') {
            current += '"';
            i++; // 이스케이프된 따옴표
          } else {
            inQuotes = false;
          }
        } else {
          current += char;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
        } else if (char === delimiter) {
          result.push(current);
          current = '';
        } else {
          current += char;
        }
      }
    }

    result.push(current);
    return result;
  }

  convert() {
    const csv = this.elements.csvInput.value;
    if (!csv.trim()) {
      this.showToast('CSV 데이터를 입력하세요.', 'warning');
      return;
    }

    const delimiter = this.elements.delimiter.value;
    const hasHeader = this.elements.hasHeader.checked;
    const trimValues = this.elements.trimValues.checked;

    try {
      let rows = this.parseCSV(csv, delimiter);

      if (rows.length === 0) {
        this.showToast('유효한 CSV 데이터가 없습니다.', 'error');
        return;
      }

      // 공백 제거
      if (trimValues) {
        rows = rows.map(row => row.map(cell => cell.trim()));
      }

      let result;
      let colCount = rows[0].length;

      if (hasHeader) {
        const headers = rows[0];
        colCount = headers.length;
        result = rows.slice(1).map(row => {
          const obj = {};
          headers.forEach((header, index) => {
            obj[header] = row[index] !== undefined ? row[index] : '';
          });
          return obj;
        });
      } else {
        result = rows;
      }

      const json = JSON.stringify(result, null, 2);
      this.elements.jsonOutput.value = json;

      // 통계 업데이트
      const rowCount = hasHeader ? rows.length - 1 : rows.length;
      this.elements.statRows.textContent = rowCount.toLocaleString();
      this.elements.statCols.textContent = colCount;
      this.elements.statSize.textContent = this.formatFileSize(new Blob([json]).size);

      this.showToast('변환 완료!', 'success');
    } catch (error) {
      console.error('[CsvToJson] 변환 오류:', error);
      this.showToast('변환 오류: ' + error.message, 'error');
    }
  }

  async copyOutput() {
    const output = this.elements.jsonOutput.value;
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
    const output = this.elements.jsonOutput.value;
    if (!output) {
      this.showToast('다운로드할 내용이 없습니다.', 'warning');
      return;
    }

    this.downloadFile(output, 'data.json', 'application/json');
    this.showToast('다운로드 시작!', 'success');
  }

  clear() {
    this.elements.csvInput.value = '';
    this.elements.jsonOutput.value = '';
    this.elements.statRows.textContent = '0';
    this.elements.statCols.textContent = '0';
    this.elements.statSize.textContent = '0 B';
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const csvToJson = new CsvToJson();
window.CsvToJson = csvToJson;

document.addEventListener('DOMContentLoaded', () => csvToJson.init());
