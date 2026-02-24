/**
 * SQL 포맷터 - ToolBase 기반
 * SQL 쿼리 포맷/압축 도구
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class SqlFormatter extends ToolBase {
  constructor() {
    super('SqlFormatter');
    this.keywords = [
      'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'IN', 'LIKE', 'BETWEEN',
      'JOIN', 'INNER', 'LEFT', 'RIGHT', 'FULL', 'OUTER', 'CROSS', 'ON',
      'ORDER', 'BY', 'ASC', 'DESC', 'LIMIT', 'OFFSET',
      'GROUP', 'HAVING', 'DISTINCT', 'AS',
      'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE',
      'CREATE', 'TABLE', 'DROP', 'ALTER', 'ADD', 'COLUMN',
      'INDEX', 'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES',
      'NULL', 'NOT', 'DEFAULT', 'UNIQUE', 'CHECK', 'CONSTRAINT',
      'UNION', 'ALL', 'EXCEPT', 'INTERSECT',
      'CASE', 'WHEN', 'THEN', 'ELSE', 'END',
      'EXISTS', 'ANY', 'SOME',
      'COUNT', 'SUM', 'AVG', 'MIN', 'MAX'
    ];
  }

  init() {
    this.initElements({
      inputSQL: 'inputSQL',
      outputSQL: 'outputSQL',
      indent: 'indent',
      keywordCase: 'keywordCase'
    });

    this.formatSQL();

    console.log('[SqlFormatter] 초기화 완료');
    return this;
  }

  formatSQL() {
    const input = this.elements.inputSQL.value;
    const indentOption = this.elements.indent.value;
    const keywordCase = this.elements.keywordCase.value;

    const indent = indentOption === 'tab' ? '\t' : ' '.repeat(parseInt(indentOption));

    let sql = input.trim();

    // Normalize whitespace
    sql = sql.replace(/\s+/g, ' ');

    // Handle keyword case
    if (keywordCase !== 'preserve') {
      this.keywords.forEach(kw => {
        const regex = new RegExp('\\b' + kw + '\\b', 'gi');
        sql = sql.replace(regex, keywordCase === 'upper' ? kw.toUpperCase() : kw.toLowerCase());
      });
    }

    // Add newlines before major keywords
    const majorKeywords = ['SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'ORDER BY', 'GROUP BY', 'HAVING', 'LIMIT', 'OFFSET', 'INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'FULL JOIN', 'CROSS JOIN', 'JOIN', 'ON', 'UNION', 'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE'];

    majorKeywords.forEach(kw => {
      const kwFormatted = keywordCase === 'upper' ? kw.toUpperCase() : keywordCase === 'lower' ? kw.toLowerCase() : kw;
      const regex = new RegExp(' (' + kwFormatted.replace(/ /g, '\\s+') + ')\\b', 'gi');
      sql = sql.replace(regex, '\n' + kwFormatted);
    });

    // Indent continuation lines
    const lines = sql.split('\n');
    const formatted = lines.map((line, i) => {
      line = line.trim();
      if (i === 0) return line;

      // Indent certain keywords
      const indentKeywords = ['AND', 'OR', 'ON'];
      const shouldIndent = indentKeywords.some(kw => {
        const kwCheck = keywordCase === 'upper' ? kw.toUpperCase() : keywordCase === 'lower' ? kw.toLowerCase() : kw;
        return line.toUpperCase().startsWith(kw);
      });

      return (shouldIndent ? indent : '') + line;
    }).join('\n');

    this.elements.outputSQL.value = formatted;
  }

  minifySQL() {
    const input = this.elements.inputSQL.value;
    const minified = input.replace(/\s+/g, ' ').trim();
    this.elements.outputSQL.value = minified;
    this.showToast('SQL이 압축되었습니다!', 'success');
  }

  async copyResult() {
    const output = this.elements.outputSQL.value;
    try {
      await navigator.clipboard.writeText(output);
      this.showToast('클립보드에 복사되었습니다!', 'success');
    } catch (e) {
      this.showToast('복사 실패', 'error');
    }
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const sqlFormatter = new SqlFormatter();
window.SqlFormatter = sqlFormatter;

document.addEventListener('DOMContentLoaded', () => sqlFormatter.init());
