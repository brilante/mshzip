/**
 * JSON ↔ XML 변환기 - ToolBase 기반
 * JSON과 XML 형식 간 상호 변환
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var JsonToXml = class JsonToXml extends ToolBase {
  constructor() {
    super('JsonToXml');
  }

  init() {
    this.initElements({
      jsonInput: 'jsonInput',
      xmlOutput: 'xmlOutput',
      indent: 'indent',
      rootTag: 'rootTag',
      includeDeclaration: 'includeDeclaration',
      statJsonSize: 'statJsonSize',
      statXmlSize: 'statXmlSize',
      statStatus: 'statStatus'
    });

    this.on(this.elements.jsonInput, 'input', () => this.updateStats());
    this.on(this.elements.xmlOutput, 'input', () => this.updateStats());

    console.log('[JsonToXml] 초기화 완료');
    return this;
  }

  loadFile(input, type) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      if (type === 'json') {
        this.elements.jsonInput.value = e.target.result;
        this.convertToXml();
      } else {
        this.elements.xmlOutput.value = e.target.result;
        this.convertToJson();
      }
    };
    reader.readAsText(file);
  }

  convertToXml() {
    const json = this.elements.jsonInput.value;
    if (!json.trim()) {
      this.showToast('JSON 데이터를 입력하세요.', 'warning');
      return;
    }

    const indent = parseInt(this.elements.indent.value);
    const rootTag = this.elements.rootTag.value || 'root';
    const includeDeclaration = this.elements.includeDeclaration.checked;

    try {
      const data = JSON.parse(json);
      let xml = '';

      if (includeDeclaration) {
        xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
      }

      xml += this.jsonToXmlRecursive(data, rootTag, indent, 0);

      this.elements.xmlOutput.value = xml;
      this.updateStats();
      this.setStatus('success', '변환 성공');
      this.showSuccess('JSON → XML 변환 완료!');
    } catch (error) {
      console.error('[JsonToXml] 변환 오류:', error);
      this.setStatus('error', '오류');
      this.showError('JSON 파싱 오류: ' + error.message);
    }
  }

  jsonToXmlRecursive(obj, tagName, indentSize, level) {
    const indent = ' '.repeat(indentSize * level);
    const childIndent = ' '.repeat(indentSize * (level + 1));

    if (obj === null || obj === undefined) {
      return `${indent}<${tagName}/>\n`;
    }

    if (typeof obj !== 'object') {
      const escaped = this.escapeXml(String(obj));
      return `${indent}<${tagName}>${escaped}</${tagName}>\n`;
    }

    if (Array.isArray(obj)) {
      let xml = '';
      obj.forEach(item => {
        xml += this.jsonToXmlRecursive(item, tagName, indentSize, level);
      });
      return xml;
    }

    // 객체
    let children = '';
    const keys = Object.keys(obj);

    if (keys.length === 0) {
      return `${indent}<${tagName}/>\n`;
    }

    keys.forEach(key => {
      const safeKey = this.sanitizeTagName(key);
      children += this.jsonToXmlRecursive(obj[key], safeKey, indentSize, level + 1);
    });

    return `${indent}<${tagName}>\n${children}${indent}</${tagName}>\n`;
  }

  escapeXml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  sanitizeTagName(name) {
    let tag = name.replace(/[^a-zA-Z0-9_-]/g, '_');
    if (/^[0-9]/.test(tag)) {
      tag = '_' + tag;
    }
    return tag || 'item';
  }

  convertToJson() {
    const xml = this.elements.xmlOutput.value;
    if (!xml.trim()) {
      this.showToast('XML 데이터를 입력하세요.', 'warning');
      return;
    }

    const indent = parseInt(this.elements.indent.value);

    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xml, 'text/xml');

      const parseError = xmlDoc.querySelector('parsererror');
      if (parseError) {
        throw new Error('XML 파싱 오류');
      }

      const json = this.xmlToJsonRecursive(xmlDoc.documentElement);
      const formatted = JSON.stringify(json, null, indent);

      this.elements.jsonInput.value = formatted;
      this.updateStats();
      this.setStatus('success', '변환 성공');
      this.showSuccess('XML → JSON 변환 완료!');
    } catch (error) {
      console.error('[JsonToXml] 변환 오류:', error);
      this.setStatus('error', '오류');
      this.showError('XML 파싱 오류: ' + error.message);
    }
  }

  xmlToJsonRecursive(node) {
    // 텍스트 노드
    if (node.nodeType === 3) {
      return node.textContent.trim();
    }

    // 요소 노드
    if (node.nodeType === 1) {
      const obj = {};
      const children = Array.from(node.childNodes).filter(n =>
        n.nodeType === 1 || (n.nodeType === 3 && n.textContent.trim())
      );

      // 텍스트만 있는 경우
      if (children.length === 1 && children[0].nodeType === 3) {
        return children[0].textContent.trim();
      }

      // 자식 요소 처리
      children.forEach(child => {
        if (child.nodeType === 1) {
          const tagName = child.tagName;
          const value = this.xmlToJsonRecursive(child);

          if (obj[tagName] !== undefined) {
            if (!Array.isArray(obj[tagName])) {
              obj[tagName] = [obj[tagName]];
            }
            obj[tagName].push(value);
          } else {
            obj[tagName] = value;
          }
        }
      });

      return obj;
    }

    return null;
  }

  swap() {
    const json = this.elements.jsonInput.value;
    const xml = this.elements.xmlOutput.value;
    this.elements.jsonInput.value = xml;
    this.elements.xmlOutput.value = json;
    this.updateStats();
  }

  updateStats() {
    const json = this.elements.jsonInput.value;
    const xml = this.elements.xmlOutput.value;
    this.elements.statJsonSize.textContent = this.formatFileSize(new Blob([json]).size);
    this.elements.statXmlSize.textContent = this.formatFileSize(new Blob([xml]).size);
  }

  setStatus(type, text) {
    this.elements.statStatus.textContent = text;
    this.elements.statStatus.style.color = type === 'success' ? 'var(--tools-success)' : 'var(--tools-error)';
  }

  async copyOutput(type) {
    const output = type === 'json'
      ? this.elements.jsonInput.value
      : this.elements.xmlOutput.value;

    if (!output) {
      this.showToast('복사할 내용이 없습니다.', 'warning');
      return;
    }

    try {
      await navigator.clipboard.writeText(output);
      this.showSuccess('클립보드에 복사되었습니다!');
    } catch (e) {
      this.showError('복사 실패');
    }
  }

  downloadJson() {
    const json = this.elements.jsonInput.value;
    if (!json) {
      this.showToast('다운로드할 내용이 없습니다.', 'warning');
      return;
    }
    this.downloadFile(json, 'data.json', 'application/json');
  }

  downloadXml() {
    const xml = this.elements.xmlOutput.value;
    if (!xml) {
      this.showToast('다운로드할 내용이 없습니다.', 'warning');
      return;
    }
    this.downloadFile(xml, 'data.xml', 'application/xml');
  }

  clear() {
    this.elements.jsonInput.value = '';
    this.elements.xmlOutput.value = '';
    this.elements.statJsonSize.textContent = '0 B';
    this.elements.statXmlSize.textContent = '0 B';
    this.elements.statStatus.textContent = '-';
    this.elements.statStatus.style.color = '';
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const jsonToXml = new JsonToXml();
window.JsonToXml = jsonToXml;

document.addEventListener('DOMContentLoaded', () => jsonToXml.init());
