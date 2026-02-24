/**
 * CSV 편집기 - ToolBase 기반
 * 브라우저에서 CSV 파일 편집
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var CsvEditor = class CsvEditor extends ToolBase {
  constructor() {
    super('CsvEditor');
    this.data = [];
    this.headers = [];
    this.selectedCell = null;
    this.selectedRow = null;
    this.selectedCol = null;
    this.history = [];
    this.historyIndex = -1;
    this.fileName = 'data.csv';
  }

  init() {
    this.initElements({
      dropzone: 'dropzone',
      fileInput: 'fileInput',
      uploadSection: 'uploadSection',
      toolbar: 'toolbar',
      editorSection: 'editorSection',
      tableHead: 'tableHead',
      tableBody: 'tableBody',
      cellCount: 'cellCount',
      selectedInfo: 'selectedInfo',
      searchInput: 'searchInput'
    });

    this.bindEvents();

    console.log('[CsvEditor] 초기화 완료');
    return this;
  }

  bindEvents() {
    this.elements.dropzone.addEventListener('click', (e) => {
      if (e.target.tagName !== 'BUTTON') {
        this.elements.fileInput.click();
      }
    });

    this.elements.dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.elements.dropzone.classList.add('dragover');
    });

    this.elements.dropzone.addEventListener('dragleave', () => {
      this.elements.dropzone.classList.remove('dragover');
    });

    this.elements.dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      this.elements.dropzone.classList.remove('dragover');
      const file = e.dataTransfer.files[0];
      if (file) this.handleFile(file);
    });

    this.elements.fileInput.addEventListener('change', (e) => {
      if (e.target.files[0]) {
        this.handleFile(e.target.files[0]);
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        this.undo();
      } else if (e.ctrlKey && e.key === 'y') {
        e.preventDefault();
        this.redo();
      }
    });
  }

  handleFile(file) {
    this.fileName = file.name;
    const reader = new FileReader();

    reader.onload = (e) => {
      const text = e.target.result;
      this.parseCSV(text);
      this.showEditor();
    };

    reader.readAsText(file);
  }

  parseCSV(text) {
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    if (lines.length === 0) return;

    const firstLine = lines[0];
    let delimiter = ',';
    if (firstLine.includes('\t')) delimiter = '\t';
    else if (firstLine.includes(';') && !firstLine.includes(',')) delimiter = ';';

    this.headers = this.parseLine(lines[0], delimiter);
    this.data = [];

    for (let i = 1; i < lines.length; i++) {
      const row = this.parseLine(lines[i], delimiter);
      while (row.length < this.headers.length) row.push('');
      this.data.push(row);
    }

    this.saveHistory();
  }

  parseLine(line, delimiter) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current);
    return result;
  }

  createNew() {
    this.headers = ['열1', '열2', '열3'];
    this.data = [
      ['', '', ''],
      ['', '', ''],
      ['', '', '']
    ];
    this.fileName = 'new_data.csv';
    this.saveHistory();
    this.showEditor();
  }

  showEditor() {
    this.elements.uploadSection.style.display = 'none';
    this.elements.toolbar.style.display = 'flex';
    this.elements.editorSection.style.display = 'block';
    this.render();
  }

  render() {
    this.renderHeaders();
    this.renderBody();
    this.updateStatus();
  }

  renderHeaders() {
    let html = '<tr><th class="row-header">#</th>';

    this.headers.forEach((header, index) => {
      html += `<th class="col-header" data-col="${index}" onclick="csvEditor.selectColumn(${index})">${this.escapeHtml(header)}</th>`;
    });

    html += '</tr>';
    this.elements.tableHead.innerHTML = html;
  }

  renderBody() {
    let html = '';

    this.data.forEach((row, rowIndex) => {
      html += `<tr>`;
      html += `<td class="row-number" data-row="${rowIndex}" onclick="csvEditor.selectRow(${rowIndex})">${rowIndex + 1}</td>`;

      row.forEach((cell, colIndex) => {
        html += `<td data-row="${rowIndex}" data-col="${colIndex}">`;
        html += `<input type="text" class="cell-input" value="${this.escapeHtml(cell)}"
                  onfocus="csvEditor.onCellFocus(${rowIndex}, ${colIndex})"
                  onblur="csvEditor.onCellBlur(${rowIndex}, ${colIndex}, this.value)"
                  onkeydown="csvEditor.onCellKeydown(event, ${rowIndex}, ${colIndex})">`;
        html += `</td>`;
      });

      html += `</tr>`;
    });

    this.elements.tableBody.innerHTML = html;
  }

  escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  onCellFocus(row, col) {
    this.selectedCell = { row, col };
    this.clearSelection();
    const td = document.querySelector(`td[data-row="${row}"][data-col="${col}"]`);
    if (td) td.classList.add('selected');
    this.updateStatus();
  }

  onCellBlur(row, col, value) {
    if (this.data[row][col] !== value) {
      this.data[row][col] = value;
      this.saveHistory();
    }
  }

  onCellKeydown(e, row, col) {
    const maxRow = this.data.length - 1;
    const maxCol = this.headers.length - 1;

    if (e.key === 'Tab') {
      e.preventDefault();
      const nextCol = e.shiftKey ? col - 1 : col + 1;
      if (nextCol >= 0 && nextCol <= maxCol) {
        this.focusCell(row, nextCol);
      } else if (!e.shiftKey && row < maxRow) {
        this.focusCell(row + 1, 0);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (row < maxRow) {
        this.focusCell(row + 1, col);
      }
    } else if (e.key === 'ArrowDown' && row < maxRow) {
      e.preventDefault();
      this.focusCell(row + 1, col);
    } else if (e.key === 'ArrowUp' && row > 0) {
      e.preventDefault();
      this.focusCell(row - 1, col);
    }
  }

  focusCell(row, col) {
    const input = document.querySelector(`td[data-row="${row}"][data-col="${col}"] input`);
    if (input) input.focus();
  }

  selectRow(rowIndex) {
    this.clearSelection();
    this.selectedRow = rowIndex;
    document.querySelector(`td.row-number[data-row="${rowIndex}"]`).classList.add('selected');
    document.querySelectorAll(`td[data-row="${rowIndex}"]`).forEach(td => td.classList.add('selected'));
    this.updateStatus();
  }

  selectColumn(colIndex) {
    this.clearSelection();
    this.selectedCol = colIndex;
    document.querySelector(`th[data-col="${colIndex}"]`).classList.add('selected');
    document.querySelectorAll(`td[data-col="${colIndex}"]`).forEach(td => td.classList.add('selected'));
    this.updateStatus();
  }

  clearSelection() {
    this.selectedRow = null;
    this.selectedCol = null;
    document.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));
  }

  addRow() {
    const newRow = new Array(this.headers.length).fill('');
    this.data.push(newRow);
    this.saveHistory();
    this.render();
  }

  addColumn() {
    const colName = `열${this.headers.length + 1}`;
    this.headers.push(colName);
    this.data.forEach(row => row.push(''));
    this.saveHistory();
    this.render();
  }

  deleteSelectedRow() {
    if (this.selectedRow !== null && this.data.length > 1) {
      this.data.splice(this.selectedRow, 1);
      this.saveHistory();
      this.clearSelection();
      this.render();
    }
  }

  deleteSelectedColumn() {
    if (this.selectedCol !== null && this.headers.length > 1) {
      this.headers.splice(this.selectedCol, 1);
      this.data.forEach(row => row.splice(this.selectedCol, 1));
      this.saveHistory();
      this.clearSelection();
      this.render();
    }
  }

  sortAsc() {
    if (this.selectedCol !== null) {
      this.data.sort((a, b) => {
        const valA = a[this.selectedCol] || '';
        const valB = b[this.selectedCol] || '';
        return valA.localeCompare(valB, 'ko', { numeric: true });
      });
      this.saveHistory();
      this.render();
    }
  }

  sortDesc() {
    if (this.selectedCol !== null) {
      this.data.sort((a, b) => {
        const valA = a[this.selectedCol] || '';
        const valB = b[this.selectedCol] || '';
        return valB.localeCompare(valA, 'ko', { numeric: true });
      });
      this.saveHistory();
      this.render();
    }
  }

  search(query) {
    document.querySelectorAll('.highlight').forEach(el => el.classList.remove('highlight'));

    if (!query) return;

    const lowerQuery = query.toLowerCase();
    this.data.forEach((row, rowIndex) => {
      row.forEach((cell, colIndex) => {
        if (cell.toLowerCase().includes(lowerQuery)) {
          const td = document.querySelector(`td[data-row="${rowIndex}"][data-col="${colIndex}"]`);
          if (td) td.classList.add('highlight');
        }
      });
    });
  }

  saveHistory() {
    this.history = this.history.slice(0, this.historyIndex + 1);
    this.history.push({
      headers: [...this.headers],
      data: this.data.map(row => [...row])
    });
    this.historyIndex = this.history.length - 1;

    if (this.history.length > 50) {
      this.history.shift();
      this.historyIndex--;
    }
  }

  undo() {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      const state = this.history[this.historyIndex];
      this.headers = [...state.headers];
      this.data = state.data.map(row => [...row]);
      this.render();
    }
  }

  redo() {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      const state = this.history[this.historyIndex];
      this.headers = [...state.headers];
      this.data = state.data.map(row => [...row]);
      this.render();
    }
  }

  download() {
    const csv = this.toCSV();
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = this.fileName.replace(/\.[^.]+$/, '') + '_edited.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  toCSV() {
    const escape = (str) => {
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return '"' + str.replace(/"/g, '""') + '"';
      }
      return str;
    };

    let csv = this.headers.map(escape).join(',') + '\n';
    this.data.forEach(row => {
      csv += row.map(escape).join(',') + '\n';
    });

    return csv;
  }

  reset() {
    this.data = [];
    this.headers = [];
    this.history = [];
    this.historyIndex = -1;
    this.clearSelection();

    this.elements.uploadSection.style.display = 'block';
    this.elements.toolbar.style.display = 'none';
    this.elements.editorSection.style.display = 'none';
    this.elements.fileInput.value = '';
  }

  updateStatus() {
    const totalCells = this.headers.length * this.data.length;
    this.elements.cellCount.textContent = `${totalCells}개 셀 (${this.data.length}행 × ${this.headers.length}열)`;

    let info = '';
    if (this.selectedCell) {
      info = `선택: ${String.fromCharCode(65 + this.selectedCell.col)}${this.selectedCell.row + 1}`;
    } else if (this.selectedRow !== null) {
      info = `선택: ${this.selectedRow + 1}행`;
    } else if (this.selectedCol !== null) {
      info = `선택: ${String.fromCharCode(65 + this.selectedCol)}열`;
    }
    this.elements.selectedInfo.textContent = info;
  }
}

// 전역 인스턴스 생성
const csvEditor = new CsvEditor();
window.CsvEditor = csvEditor;

// 전역 함수 (HTML onclick 호환)
function createNew() { csvEditor.createNew(); }
function addRow() { csvEditor.addRow(); }
function addColumn() { csvEditor.addColumn(); }
function deleteSelectedRow() { csvEditor.deleteSelectedRow(); }
function deleteSelectedColumn() { csvEditor.deleteSelectedColumn(); }
function sortAsc() { csvEditor.sortAsc(); }
function sortDesc() { csvEditor.sortDesc(); }
function download() { csvEditor.download(); }
function reset() { csvEditor.reset(); }

document.addEventListener('DOMContentLoaded', () => csvEditor.init());
