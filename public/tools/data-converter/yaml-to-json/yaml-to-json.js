/**
 * YAML ↔ JSON 변환기 - ToolBase 기반
 * YAML과 JSON 형식 간 상호 변환
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var YamlToJson = class YamlToJson extends ToolBase {
  constructor() {
    super('YamlToJson');
  }

  init() {
    this.initElements({
      yamlInput: 'yamlInput',
      jsonOutput: 'jsonOutput',
      indent: 'indent',
      sortKeys: 'sortKeys',
      statYamlSize: 'statYamlSize',
      statJsonSize: 'statJsonSize',
      statStatus: 'statStatus'
    });

    // 입력 시 자동 통계 업데이트
    this.on(this.elements.yamlInput, 'input', () => this.updateStats());
    this.on(this.elements.jsonOutput, 'input', () => this.updateStats());

    console.log('[YamlToJson] 초기화 완료');
    return this;
  }

  loadFile(input, type) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      if (type === 'yaml') {
        this.elements.yamlInput.value = e.target.result;
        this.convertToJson();
      } else {
        this.elements.jsonOutput.value = e.target.result;
        this.convertToYaml();
      }
    };
    reader.readAsText(file);
  }

  convertToJson() {
    const yaml = this.elements.yamlInput.value;
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
      this.elements.jsonOutput.value = json;

      this.updateStats();
      this.elements.statStatus.textContent = '성공';
      this.elements.statStatus.style.color = 'var(--tools-success)';

      this.showToast('YAML → JSON 변환 완료!', 'success');
    } catch (error) {
      console.error('[YamlToJson] 변환 오류:', error);
      this.elements.statStatus.textContent = '오류';
      this.elements.statStatus.style.color = 'var(--tools-error)';
      this.showToast('YAML 파싱 오류: ' + error.message, 'error');
    }
  }

  convertToYaml() {
    const json = this.elements.jsonOutput.value;
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

      this.elements.yamlInput.value = yaml;

      this.updateStats();
      this.elements.statStatus.textContent = '성공';
      this.elements.statStatus.style.color = 'var(--tools-success)';

      this.showToast('JSON → YAML 변환 완료!', 'success');
    } catch (error) {
      console.error('[YamlToJson] 변환 오류:', error);
      this.elements.statStatus.textContent = '오류';
      this.elements.statStatus.style.color = 'var(--tools-error)';
      this.showToast('JSON 파싱 오류: ' + error.message, 'error');
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
    const yaml = this.elements.yamlInput.value;
    const json = this.elements.jsonOutput.value;

    this.elements.yamlInput.value = json;
    this.elements.jsonOutput.value = yaml;

    this.updateStats();
  }

  updateStats() {
    const yaml = this.elements.yamlInput.value;
    const json = this.elements.jsonOutput.value;

    this.elements.statYamlSize.textContent = this.formatFileSize(new Blob([yaml]).size);
    this.elements.statJsonSize.textContent = this.formatFileSize(new Blob([json]).size);
  }

  async copyOutput(type) {
    const output = type === 'yaml'
      ? this.elements.yamlInput.value
      : this.elements.jsonOutput.value;

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

  downloadYaml() {
    const yaml = this.elements.yamlInput.value;
    if (!yaml) {
      this.showToast('다운로드할 내용이 없습니다.', 'warning');
      return;
    }

    this.downloadFile(yaml, 'data.yaml', 'text/yaml');
    this.showToast('YAML 다운로드 시작!', 'success');
  }

  downloadJson() {
    const json = this.elements.jsonOutput.value;
    if (!json) {
      this.showToast('다운로드할 내용이 없습니다.', 'warning');
      return;
    }

    this.downloadFile(json, 'data.json', 'application/json');
    this.showToast('JSON 다운로드 시작!', 'success');
  }

  clear() {
    this.elements.yamlInput.value = '';
    this.elements.jsonOutput.value = '';
    this.elements.statYamlSize.textContent = '0 B';
    this.elements.statJsonSize.textContent = '0 B';
    this.elements.statStatus.textContent = '-';
    this.elements.statStatus.style.color = '';
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const yamlToJson = new YamlToJson();
window.YamlToJson = yamlToJson;

document.addEventListener('DOMContentLoaded', () => yamlToJson.init());
