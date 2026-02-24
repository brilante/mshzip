/**
 * Excel → JSON 변환기 - ToolBase 기반
 * Excel 파일(.xlsx, .xls)을 JSON 형식으로 변환
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var ExcelToJson = class ExcelToJson extends ToolBase {
  constructor() {
    super('ExcelToJson');
    this.workbook = null;
    this.fileName = '';
  }

  init() {
    this.initElements({
      dropZone: 'dropZone',
      fileInput: 'fileInput',
      fileInfo: 'fileInfo',
      fileName: 'fileName',
      sheetSelect: 'sheetSelect',
      hasHeader: 'hasHeader',
      trimValues: 'trimValues',
      skipEmpty: 'skipEmpty',
      convertBtn: 'convertBtn',
      jsonOutput: 'jsonOutput',
      statSheets: 'statSheets',
      statRows: 'statRows',
      statCols: 'statCols',
      statSize: 'statSize'
    });

    this.setupDropZone();
    this.setupFileInput();
    this.setupSheetSelect();

    console.log('[ExcelToJson] 초기화 완료');
    return this;
  }

  setupDropZone() {
    this.on(this.elements.dropZone, 'click', () => {
      this.elements.fileInput.click();
    });

    this.on(this.elements.dropZone, 'dragover', (e) => {
      e.preventDefault();
      this.elements.dropZone.classList.add('drag-over');
    });

    this.on(this.elements.dropZone, 'dragleave', () => {
      this.elements.dropZone.classList.remove('drag-over');
    });

    this.on(this.elements.dropZone, 'drop', (e) => {
      e.preventDefault();
      this.elements.dropZone.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file) this.loadFile(file);
    });
  }

  setupFileInput() {
    this.on(this.elements.fileInput, 'change', (e) => {
      const file = e.target.files[0];
      if (file) this.loadFile(file);
    });
  }

  setupSheetSelect() {
    this.on(this.elements.sheetSelect, 'change', () => {
      if (this.workbook) {
        this.convert();
      }
    });
  }

  loadFile(file) {
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    const validExtensions = ['.xlsx', '.xls'];
    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));

    if (!validTypes.includes(file.type) && !validExtensions.includes(ext)) {
      this.showToast('Excel 파일(.xlsx, .xls)만 지원합니다.', 'error');
      return;
    }

    this.fileName = file.name;
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        this.workbook = XLSX.read(data, { type: 'array' });

        // UI 업데이트
        this.showFileInfo(file.name);
        this.updateSheetSelect();

        // 자동 변환
        this.convert();

        this.showToast('파일 로드 완료!', 'success');
      } catch (error) {
        console.error('[ExcelToJson] 파일 파싱 오류:', error);
        this.showToast('파일을 읽을 수 없습니다: ' + error.message, 'error');
      }
    };

    reader.onerror = () => {
      this.showToast('파일 읽기 오류', 'error');
    };

    reader.readAsArrayBuffer(file);
  }

  showFileInfo(name) {
    this.elements.dropZone.style.display = 'none';
    this.elements.fileInfo.style.display = 'flex';
    this.elements.fileName.textContent = name;
    this.elements.convertBtn.disabled = false;
  }

  removeFile() {
    this.workbook = null;
    this.fileName = '';
    this.elements.dropZone.style.display = 'flex';
    this.elements.fileInfo.style.display = 'none';
    this.elements.fileInput.value = '';
    this.elements.convertBtn.disabled = true;
    this.elements.sheetSelect.innerHTML = '<option value="">파일을 먼저 선택하세요</option>';
    this.elements.sheetSelect.disabled = true;
    this.clear();
  }

  updateSheetSelect() {
    const select = this.elements.sheetSelect;
    select.innerHTML = '';
    select.disabled = false;

    this.workbook.SheetNames.forEach((name, index) => {
      const option = document.createElement('option');
      option.value = name;
      option.textContent = name;
      if (index === 0) option.selected = true;
      select.appendChild(option);
    });

    this.elements.statSheets.textContent = this.workbook.SheetNames.length;
  }

  convert() {
    if (!this.workbook) {
      this.showToast('먼저 Excel 파일을 선택하세요.', 'warning');
      return;
    }

    const sheetName = this.elements.sheetSelect.value;
    const hasHeader = this.elements.hasHeader.checked;
    const trimValues = this.elements.trimValues.checked;
    const skipEmpty = this.elements.skipEmpty.checked;

    try {
      const sheet = this.workbook.Sheets[sheetName];
      if (!sheet) {
        this.showToast('시트를 찾을 수 없습니다.', 'error');
        return;
      }

      // 시트를 배열로 변환
      let rows = XLSX.utils.sheet_to_json(sheet, {
        header: hasHeader ? undefined : 1,
        defval: '',
        raw: false
      });

      // 헤더가 없는 경우 배열 형식으로 변환
      if (!hasHeader) {
        rows = XLSX.utils.sheet_to_json(sheet, {
          header: 1,
          defval: '',
          raw: false
        });
      }

      // 빈 행 제거
      if (skipEmpty) {
        rows = rows.filter(row => {
          if (Array.isArray(row)) {
            return row.some(cell => cell !== '' && cell != null);
          }
          return Object.values(row).some(cell => cell !== '' && cell != null);
        });
      }

      // 공백 제거
      if (trimValues) {
        rows = rows.map(row => {
          if (Array.isArray(row)) {
            return row.map(cell => typeof cell === 'string' ? cell.trim() : cell);
          }
          const newRow = {};
          for (const key in row) {
            newRow[key] = typeof row[key] === 'string' ? row[key].trim() : row[key];
          }
          return newRow;
        });
      }

      const json = JSON.stringify(rows, null, 2);
      this.elements.jsonOutput.value = json;

      // 통계 업데이트
      const colCount = rows.length > 0
        ? (Array.isArray(rows[0]) ? rows[0].length : Object.keys(rows[0]).length)
        : 0;

      this.elements.statRows.textContent = rows.length.toLocaleString();
      this.elements.statCols.textContent = colCount;
      this.elements.statSize.textContent = this.formatFileSize(new Blob([json]).size);

      this.showToast('변환 완료!', 'success');
    } catch (error) {
      console.error('[ExcelToJson] 변환 오류:', error);
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

    const baseName = this.fileName ? this.fileName.replace(/\.[^.]+$/, '') : 'data';
    this.downloadFile(output, `${baseName}.json`, 'application/json');
    this.showToast('다운로드 시작!', 'success');
  }

  clear() {
    this.elements.jsonOutput.value = '';
    this.elements.statRows.textContent = '0';
    this.elements.statCols.textContent = '0';
    this.elements.statSize.textContent = '0 B';
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const excelToJson = new ExcelToJson();
window.ExcelToJson = excelToJson;

document.addEventListener('DOMContentLoaded', () => excelToJson.init());
