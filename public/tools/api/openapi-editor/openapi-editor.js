/**
 * OpenAPI 에디터 - ToolBase 기반
 * OpenAPI YAML 스펙 편집 도구
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class OpenapiEditor extends ToolBase {
  constructor() {
    super('OpenapiEditor');
    this.templates = {
      basic: `openapi: 3.0.3
info:
  title: My API
  description: API 설명
  version: 1.0.0
servers:
  - url: https://api.example.com/v1
paths:
  /hello:
    get:
      summary: Hello World
      responses:
        '200':
          description: 성공
          content:
            application/json:
              schema:
                type: object
                properties:
                  message:
                    type: string`,
      crud: `openapi: 3.0.3
info:
  title: CRUD API
  version: 1.0.0
servers:
  - url: https://api.example.com/v1
paths:
  /items:
    get:
      summary: 항목 목록 조회
      responses:
        '200':
          description: 성공
    post:
      summary: 항목 생성
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
      responses:
        '201':
          description: 생성됨
  /items/{id}:
    get:
      summary: 항목 조회
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: integer
      responses:
        '200':
          description: 성공
    put:
      summary: 항목 수정
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: integer
      responses:
        '200':
          description: 수정됨
    delete:
      summary: 항목 삭제
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: integer
      responses:
        '204':
          description: 삭제됨`
    };
  }

  init() {
    this.initElements({
      specEditor: 'specEditor',
      previewContent: 'previewContent',
      validationResult: 'validationResult'
    });

    this.on(this.elements.specEditor, 'input', () => this.updatePreview());
    this.updatePreview();

    console.log('[OpenapiEditor] 초기화 완료');
    return this;
  }

  loadTemplate(name) {
    this.elements.specEditor.value = this.templates[name];
    this.updatePreview();
    this.showToast(`${name} 템플릿이 로드되었습니다.`, 'success');
  }

  parseYAML(yaml) {
    // Simple YAML parser for OpenAPI basic structure
    const result = { info: {}, paths: {} };
    const lines = yaml.split('\n');
    let currentPath = '';
    let currentMethod = '';
    let indent = 0;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const match = line.match(/^(\s*)(\S+):\s*(.*)/);
      if (!match) continue;

      const [, spaces, key, value] = match;
      const level = spaces.length;

      if (key === 'title' && level <= 2) result.info.title = value;
      if (key === 'version' && level <= 2) result.info.version = value;

      if (level === 2 && key.startsWith('/')) {
        currentPath = key;
        result.paths[currentPath] = {};
      }

      if (level === 4 && ['get', 'post', 'put', 'delete', 'patch'].includes(key)) {
        currentMethod = key;
        result.paths[currentPath][currentMethod] = { summary: '' };
      }

      if (level === 6 && key === 'summary' && currentPath && currentMethod) {
        result.paths[currentPath][currentMethod].summary = value;
      }
    }

    return result;
  }

  updatePreview() {
    const yaml = this.elements.specEditor.value;

    try {
      const spec = this.parseYAML(yaml);

      let html = `<h4>${spec.info.title || 'Untitled API'} <small>v${spec.info.version || '1.0.0'}</small></h4>`;

      for (const [path, methods] of Object.entries(spec.paths)) {
        for (const [method, details] of Object.entries(methods)) {
          html += `
            <div class="endpoint" onclick="this.classList.toggle('open')">
              <div class="endpoint-header">
                <span class="endpoint-method ${method}">${method.toUpperCase()}</span>
                <span class="endpoint-path">${path}</span>
                <span class="endpoint-summary">${details.summary || ''}</span>
              </div>
              <div class="endpoint-body">
                <p>경로: ${path}</p>
                <p>메서드: ${method.toUpperCase()}</p>
                <p>설명: ${details.summary || '없음'}</p>
              </div>
            </div>
          `;
        }
      }

      this.elements.previewContent.innerHTML = html;

    } catch (e) {
      this.elements.previewContent.innerHTML = '<p style="color: red;">YAML 파싱 오류</p>';
    }
  }

  validateSpec() {
    const yaml = this.elements.specEditor.value;

    const hasOpenapi = yaml.includes('openapi:');
    const hasInfo = yaml.includes('info:');
    const hasPaths = yaml.includes('paths:');

    if (hasOpenapi && hasInfo && hasPaths) {
      this.elements.validationResult.className = 'validation-result valid';
      this.elements.validationResult.innerHTML = '유효한 OpenAPI 스펙입니다.';
      this.showToast('유효한 OpenAPI 스펙입니다!', 'success');
    } else {
      const missing = [];
      if (!hasOpenapi) missing.push('openapi');
      if (!hasInfo) missing.push('info');
      if (!hasPaths) missing.push('paths');
      this.elements.validationResult.className = 'validation-result invalid';
      this.elements.validationResult.innerHTML = '필수 필드가 누락되었습니다: ' + missing.join(', ');
      this.showToast('필수 필드가 누락되었습니다.', 'error');
    }
  }

  downloadSpec() {
    const yaml = this.elements.specEditor.value;
    const blob = new Blob([yaml], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'openapi.yaml';
    a.click();
    URL.revokeObjectURL(url);
    this.showToast('스펙이 다운로드되었습니다!', 'success');
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const openapiEditor = new OpenapiEditor();
window.OpenapiEditor = openapiEditor;

document.addEventListener('DOMContentLoaded', () => openapiEditor.init());
