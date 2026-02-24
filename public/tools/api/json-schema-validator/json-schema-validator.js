/**
 * JSON 스키마 검증기 - ToolBase 기반
 * JSON Schema 기반 데이터 검증 도구
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class JsonSchemaValidator extends ToolBase {
  constructor() {
    super('JsonSchemaValidator');
  }

  init() {
    this.initElements({
      schemaInput: 'schemaInput',
      dataInput: 'dataInput',
      result: 'result'
    });

    console.log('[JsonSchemaValidator] 초기화 완료');
    return this;
  }

  validateJSON() {
    const schemaText = this.elements.schemaInput.value;
    const dataText = this.elements.dataInput.value;

    try {
      const schema = JSON.parse(schemaText);
      const data = JSON.parse(dataText);

      const errors = this.simpleValidate(schema, data);

      if (errors.length === 0) {
        this.elements.result.className = 'result valid';
        this.elements.result.innerHTML = `
          <div class="result-icon"></div>
          <div class="result-text">유효합니다! JSON 데이터가 스키마를 준수합니다.</div>
        `;
      } else {
        this.elements.result.className = 'result invalid';
        this.elements.result.innerHTML = `
          <div class="result-icon"></div>
          <div class="result-text">유효하지 않습니다. ${errors.length}개의 오류가 발견되었습니다.</div>
          <div class="error-list">
            ${errors.map(e => `<div class="error-item">• ${e}</div>`).join('')}
          </div>
        `;
      }

    } catch (e) {
      this.elements.result.className = 'result invalid';
      this.elements.result.innerHTML = `
        <div class="result-icon"></div>
        <div class="result-text">JSON 파싱 오류: ${e.message}</div>
      `;
    }
  }

  simpleValidate(schema, data, path = '') {
    const errors = [];

    // Check type
    if (schema.type) {
      const actualType = Array.isArray(data) ? 'array' : typeof data;
      const expectedType = schema.type === 'integer' ? 'number' : schema.type;
      if (actualType !== expectedType) {
        errors.push(`${path || 'root'}: 타입이 "${schema.type}"이어야 하지만 "${actualType}"입니다`);
        return errors;
      }
      if (schema.type === 'integer' && !Number.isInteger(data)) {
        errors.push(`${path || 'root'}: 정수여야 합니다`);
      }
    }

    // Check required properties
    if (schema.required && schema.type === 'object') {
      schema.required.forEach(prop => {
        if (!(prop in data)) {
          errors.push(`${path || 'root'}: 필수 속성 "${prop}"이(가) 없습니다`);
        }
      });
    }

    // Check properties
    if (schema.properties && typeof data === 'object' && !Array.isArray(data)) {
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        if (key in data) {
          errors.push(...this.simpleValidate(propSchema, data[key], path ? `${path}.${key}` : key));
        }
      }
    }

    // Check string constraints
    if (schema.type === 'string' && typeof data === 'string') {
      if (schema.minLength && data.length < schema.minLength) {
        errors.push(`${path}: 최소 ${schema.minLength}자 이상이어야 합니다`);
      }
      if (schema.maxLength && data.length > schema.maxLength) {
        errors.push(`${path}: 최대 ${schema.maxLength}자 이하여야 합니다`);
      }
      if (schema.format === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data)) {
        errors.push(`${path}: 유효한 이메일 형식이어야 합니다`);
      }
    }

    // Check number constraints
    if ((schema.type === 'number' || schema.type === 'integer') && typeof data === 'number') {
      if (schema.minimum !== undefined && data < schema.minimum) {
        errors.push(`${path}: ${schema.minimum} 이상이어야 합니다`);
      }
      if (schema.maximum !== undefined && data > schema.maximum) {
        errors.push(`${path}: ${schema.maximum} 이하여야 합니다`);
      }
    }

    // Check array constraints
    if (schema.type === 'array' && Array.isArray(data)) {
      if (schema.minItems && data.length < schema.minItems) {
        errors.push(`${path}: 최소 ${schema.minItems}개 항목이 필요합니다`);
      }
      if (schema.items) {
        data.forEach((item, i) => {
          errors.push(...this.simpleValidate(schema.items, item, `${path}[${i}]`));
        });
      }
    }

    return errors;
  }

  generateSchema() {
    const dataText = this.elements.dataInput.value;
    try {
      const data = JSON.parse(dataText);
      const schema = this.inferSchema(data);
      this.elements.schemaInput.value = JSON.stringify(schema, null, 2);
      this.showToast('스키마가 생성되었습니다!', 'success');
    } catch (e) {
      this.showToast('유효한 JSON 데이터를 먼저 입력하세요.', 'error');
    }
  }

  inferSchema(data) {
    if (data === null) return { type: 'null' };
    if (Array.isArray(data)) {
      return {
        type: 'array',
        items: data.length > 0 ? this.inferSchema(data[0]) : {}
      };
    }
    if (typeof data === 'object') {
      const properties = {};
      const required = [];
      for (const [key, value] of Object.entries(data)) {
        properties[key] = this.inferSchema(value);
        required.push(key);
      }
      return { type: 'object', properties, required };
    }
    if (typeof data === 'number') {
      return Number.isInteger(data) ? { type: 'integer' } : { type: 'number' };
    }
    return { type: typeof data };
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const jsonSchemaValidator = new JsonSchemaValidator();
window.JsonSchemaValidator = jsonSchemaValidator;

document.addEventListener('DOMContentLoaded', () => jsonSchemaValidator.init());
