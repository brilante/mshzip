/**
 * SQL → JSON 변환기 - ToolBase 기반
 * SQL INSERT 문을 JSON 형식으로 변환
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var SqlToJson = class SqlToJson extends ToolBase {
  constructor() {
    super('SqlToJson');
  }

  init() {
    this.initElements({
      sqlInput: 'sqlInput',
      jsonOutput: 'jsonOutput',
      parseMode: 'parseMode',
      includeTableName: 'includeTableName',
      parseTypes: 'parseTypes',
      statTables: 'statTables',
      statRows: 'statRows',
      statCols: 'statCols',
      statSize: 'statSize'
    });

    console.log('[SqlToJson] 초기화 완료');
    return this;
  }

  loadFile(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      this.elements.sqlInput.value = e.target.result;
      this.convert();
    };
    reader.readAsText(file);
  }

  parseInsert(sql) {
    const results = [];
    const tableMap = new Map();

    // INSERT 문 찾기 (여러 개 처리)
    const insertRegex = /INSERT\s+INTO\s+[`"']?(\w+)[`"']?\s*\(([^)]+)\)\s*VALUES\s*([\s\S]+?)(?:;|$)/gi;
    let match;

    while ((match = insertRegex.exec(sql)) !== null) {
      const tableName = match[1];
      const columnsStr = match[2];
      const valuesStr = match[3];

      // 컬럼 파싱
      const columns = columnsStr.split(',').map(col =>
        col.trim().replace(/[`"']/g, '')
      );

      // VALUES 파싱
      const valueGroups = this.parseValues(valuesStr);

      if (!tableMap.has(tableName)) {
        tableMap.set(tableName, { columns, rows: [] });
      }

      const tableData = tableMap.get(tableName);

      for (const values of valueGroups) {
        const row = {};
        columns.forEach((col, index) => {
          row[col] = this.parseValue(values[index]);
        });
        tableData.rows.push(row);
      }
    }

    // 결과 포맷팅
    const includeTableName = this.elements.includeTableName.checked;

    for (const [tableName, data] of tableMap) {
      if (includeTableName) {
        results.push({
          table: tableName,
          columns: data.columns,
          data: data.rows
        });
      } else {
        results.push(...data.rows);
      }
    }

    return {
      data: results,
      tables: tableMap.size,
      rows: Array.from(tableMap.values()).reduce((sum, t) => sum + t.rows.length, 0),
      cols: tableMap.size > 0 ? Array.from(tableMap.values())[0].columns.length : 0
    };
  }

  parseValues(valuesStr) {
    const groups = [];
    let current = [];
    let inQuotes = false;
    let quoteChar = '';
    let currentValue = '';
    let depth = 0;

    for (let i = 0; i < valuesStr.length; i++) {
      const char = valuesStr[i];
      const prevChar = valuesStr[i - 1];

      if (!inQuotes) {
        if (char === "'" || char === '"') {
          inQuotes = true;
          quoteChar = char;
          currentValue += char;
        } else if (char === '(') {
          depth++;
          if (depth === 1) {
            currentValue = '';
          } else {
            currentValue += char;
          }
        } else if (char === ')') {
          depth--;
          if (depth === 0) {
            if (currentValue.trim()) {
              current.push(currentValue.trim());
            }
            if (current.length > 0) {
              groups.push([...current]);
              current = [];
            }
            currentValue = '';
          } else {
            currentValue += char;
          }
        } else if (char === ',' && depth === 1) {
          current.push(currentValue.trim());
          currentValue = '';
        } else if (depth > 0) {
          currentValue += char;
        }
      } else {
        currentValue += char;
        if (char === quoteChar && prevChar !== '\\') {
          inQuotes = false;
          quoteChar = '';
        }
      }
    }

    return groups;
  }

  parseValue(value) {
    if (value === undefined || value === null) return null;

    value = value.trim();

    // NULL 체크
    if (value.toUpperCase() === 'NULL') return null;

    // 문자열 처리
    if ((value.startsWith("'") && value.endsWith("'")) ||
        (value.startsWith('"') && value.endsWith('"'))) {
      return value.slice(1, -1).replace(/\\'/g, "'").replace(/\\"/g, '"');
    }

    const parseTypes = this.elements.parseTypes.checked;
    if (!parseTypes) return value;

    // 숫자 처리
    if (/^-?\d+$/.test(value)) {
      return parseInt(value, 10);
    }
    if (/^-?\d+\.\d+$/.test(value)) {
      return parseFloat(value);
    }

    // boolean 처리
    if (value.toUpperCase() === 'TRUE') return true;
    if (value.toUpperCase() === 'FALSE') return false;

    return value;
  }

  parseCreateTable(sql) {
    const results = [];
    const createRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"']?(\w+)[`"']?\s*\(([^;]+)\)/gi;
    let match;

    while ((match = createRegex.exec(sql)) !== null) {
      const tableName = match[1];
      const columnsStr = match[2];

      const columns = [];
      const columnDefs = columnsStr.split(',');

      for (const def of columnDefs) {
        const trimmed = def.trim();
        // PRIMARY KEY, FOREIGN KEY 등 제약조건 스킵
        if (/^(PRIMARY|FOREIGN|UNIQUE|CHECK|CONSTRAINT)/i.test(trimmed)) continue;

        const colMatch = trimmed.match(/^[`"']?(\w+)[`"']?\s+(\w+)/i);
        if (colMatch) {
          columns.push({
            name: colMatch[1],
            type: colMatch[2].toUpperCase(),
            nullable: !/NOT\s+NULL/i.test(trimmed),
            primaryKey: /PRIMARY\s+KEY/i.test(trimmed),
            autoIncrement: /AUTO_INCREMENT|AUTOINCREMENT/i.test(trimmed),
            default: this.extractDefault(trimmed)
          });
        }
      }

      results.push({
        table: tableName,
        columns
      });
    }

    return {
      data: results,
      tables: results.length,
      rows: results.reduce((sum, t) => sum + t.columns.length, 0),
      cols: results.length > 0 ? results[0].columns.length : 0
    };
  }

  extractDefault(columnDef) {
    const match = columnDef.match(/DEFAULT\s+(['"]?)([^'"\s,)]+)\1/i);
    return match ? match[2] : null;
  }

  convert() {
    const sql = this.elements.sqlInput.value;
    if (!sql.trim()) {
      this.showToast('SQL 문을 입력하세요.', 'warning');
      return;
    }

    const parseMode = this.elements.parseMode.value;

    try {
      let result;

      if (parseMode === 'insert') {
        result = this.parseInsert(sql);
      } else {
        result = this.parseCreateTable(sql);
      }

      if (result.tables === 0 && result.rows === 0) {
        this.showToast('파싱할 SQL 문을 찾을 수 없습니다.', 'error');
        return;
      }

      const json = JSON.stringify(result.data, null, 2);
      this.elements.jsonOutput.value = json;

      // 통계 업데이트
      this.elements.statTables.textContent = result.tables;
      this.elements.statRows.textContent = result.rows.toLocaleString();
      this.elements.statCols.textContent = result.cols;
      this.elements.statSize.textContent = this.formatFileSize(new Blob([json]).size);

      this.showToast('변환 완료!', 'success');
    } catch (error) {
      console.error('[SqlToJson] 변환 오류:', error);
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

    this.downloadFile(output, 'sql-data.json', 'application/json');
    this.showToast('다운로드 시작!', 'success');
  }

  clear() {
    this.elements.sqlInput.value = '';
    this.elements.jsonOutput.value = '';
    this.elements.statTables.textContent = '0';
    this.elements.statRows.textContent = '0';
    this.elements.statCols.textContent = '0';
    this.elements.statSize.textContent = '0 B';
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const sqlToJson = new SqlToJson();
window.SqlToJson = sqlToJson;

document.addEventListener('DOMContentLoaded', () => sqlToJson.init());
