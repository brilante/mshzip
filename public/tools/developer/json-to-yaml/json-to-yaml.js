/**
 * JSON ↔ YAML 변환기 - ToolBase 기반
 * JSON과 YAML 형식 간 상호 변환
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var JsonToYaml = class JsonToYaml extends ToolBase {
  constructor() {
    super('JsonToYaml');
  }

  init() {
    this.initElements({
      jsonInput: 'jsonInput',
      yamlOutput: 'yamlOutput',
      indent: 'indent',
      sortKeys: 'sortKeys',
      statJsonSize: 'statJsonSize',
      statYamlSize: 'statYamlSize',
      statStatus: 'statStatus'
    });

    this.on(this.elements.jsonInput, 'input', () => this.updateStats());
    this.on(this.elements.yamlOutput, 'input', () => this.updateStats());

    console.log('[JsonToYaml] 초기화 완료');
    return this;
  }

  loadFile(input, type) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      if (type === 'json') {
        this.elements.jsonInput.value = e.target.result;
        this.convertToYaml();
      } else {
        this.elements.yamlOutput.value = e.target.result;
        this.convertToJson();
      }
    };
    reader.readAsText(file);
  }

  convertToYaml() {
    const json = this.elements.jsonInput.value;
    if (!json.trim()) {
      this.showToast('JSON 데이터를 입력하세요.', 'warning');
      return;
    }

    const indent = parseInt(this.elements.indent.value);
    const sortKeys = this.elements.sortKeys.checked;

    try {
      let data = JSON.parse(json);

      if (sortKeys && typeof data === 'object') {
        data = this.sortObjectKeys(data);
      }

      const yaml = jsyaml.dump(data, {
        indent: indent,
        lineWidth: -1,
        noRefs: true,
        sortKeys: sortKeys
      });

      this.elements.yamlOutput.value = yaml;
      this.updateStats();
      this.setStatus('success', '변환 성공');
      this.showSuccess('JSON → YAML 변환 완료!');
    } catch (error) {
      console.error('[JsonToYaml] 변환 오류:', error);
      this.setStatus('error', '오류');
      this.showError('JSON 파싱 오류: ' + error.message);
    }
  }

  convertToJson() {
    const yaml = this.elements.yamlOutput.value;
    if (!yaml.trim()) {
      this.showToast('YAML 데이터를 입력하세요.', 'warning');
      return;
    }

    const indent = parseInt(this.elements.indent.value);
    const sortKeys = this.elements.sortKeys.checked;

    try {
      let data = jsyaml.load(yaml);

      if (sortKeys && typeof data === 'object') {
        data = this.sortObjectKeys(data);
      }

      const json = JSON.stringify(data, null, indent);
      this.elements.jsonInput.value = json;
      this.updateStats();
      this.setStatus('success', '변환 성공');
      this.showSuccess('YAML → JSON 변환 완료!');
    } catch (error) {
      console.error('[JsonToYaml] 변환 오류:', error);
      this.setStatus('error', '오류');
      this.showError('YAML 파싱 오류: ' + error.message);
    }
  }

  sortObjectKeys(obj) {
    if (Array.isArray(obj)) {
      return obj.map(item => this.sortObjectKeys(item));
    }
    if (obj !== null && typeof obj === 'object') {
      const sorted = {};
      Object.keys(obj).sort().forEach(key => {
        sorted[key] = this.sortObjectKeys(obj[key]);
      });
      return sorted;
    }
    return obj;
  }

  swap() {
    const json = this.elements.jsonInput.value;
    const yaml = this.elements.yamlOutput.value;
    this.elements.jsonInput.value = yaml;
    this.elements.yamlOutput.value = json;
    this.updateStats();
  }

  updateStats() {
    const json = this.elements.jsonInput.value;
    const yaml = this.elements.yamlOutput.value;
    this.elements.statJsonSize.textContent = this.formatFileSize(new Blob([json]).size);
    this.elements.statYamlSize.textContent = this.formatFileSize(new Blob([yaml]).size);
  }

  setStatus(type, text) {
    this.elements.statStatus.textContent = text;
    this.elements.statStatus.style.color = type === 'success' ? 'var(--tools-success)' : 'var(--tools-error)';
  }

  async copyOutput(type) {
    const output = type === 'json'
      ? this.elements.jsonInput.value
      : this.elements.yamlOutput.value;

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

  downloadYaml() {
    const yaml = this.elements.yamlOutput.value;
    if (!yaml) {
      this.showToast('다운로드할 내용이 없습니다.', 'warning');
      return;
    }
    this.downloadFile(yaml, 'data.yaml', 'text/yaml');
  }

  clear() {
    this.elements.jsonInput.value = '';
    this.elements.yamlOutput.value = '';
    this.elements.statJsonSize.textContent = '0 B';
    this.elements.statYamlSize.textContent = '0 B';
    this.elements.statStatus.textContent = '-';
    this.elements.statStatus.style.color = '';
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const jsonToYaml = new JsonToYaml();
window.JsonToYaml = jsonToYaml;

document.addEventListener('DOMContentLoaded', () => jsonToYaml.init());
