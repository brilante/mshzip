/**
 * GraphQL 플레이그라운드 - ToolBase 기반
 * GraphQL 쿼리 실행 도구
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class GraphqlPlayground extends ToolBase {
  constructor() {
    super('GraphqlPlayground');
    this.examples = {
      countries: `query {
  countries {
    code
    name
    emoji
    currency
    capital
  }
}`,
      country: `query {
  country(code: "KR") {
    name
    native
    capital
    currency
    languages {
      code
      name
    }
    states {
      name
    }
  }
}`,
      continents: `query {
  continents {
    code
    name
    countries {
      code
      name
    }
  }
}`
    };
  }

  init() {
    this.initElements({
      endpoint: 'endpoint',
      queryEditor: 'queryEditor',
      variablesEditor: 'variablesEditor',
      responseOutput: 'responseOutput',
      responseTime: 'responseTime'
    });

    console.log('[GraphqlPlayground] 초기화 완료');
    return this;
  }

  loadExample(name) {
    this.elements.queryEditor.value = this.examples[name];
  }

  prettifyQuery() {
    try {
      let query = this.elements.queryEditor.value;
      let indent = 0;
      let formatted = '';
      let inString = false;

      for (let i = 0; i < query.length; i++) {
        const char = query[i];

        if (char === '"' && query[i-1] !== '\\') {
          inString = !inString;
        }

        if (!inString) {
          if (char === '{') {
            formatted += ' {\n' + '  '.repeat(++indent);
          } else if (char === '}') {
            formatted = formatted.trimEnd() + '\n' + '  '.repeat(--indent) + '}';
          } else if (char === '\n') {
            formatted += '\n' + '  '.repeat(indent);
          } else {
            formatted += char;
          }
        } else {
          formatted += char;
        }
      }

      this.elements.queryEditor.value = formatted.trim();
      this.showToast('쿼리가 정리되었습니다!', 'success');
    } catch (e) {
      console.error(e);
      this.showToast('쿼리 정리 실패', 'error');
    }
  }

  async executeQuery() {
    const endpoint = this.elements.endpoint.value;
    const query = this.elements.queryEditor.value;
    const variablesText = this.elements.variablesEditor.value;

    let variables = {};
    try {
      variables = JSON.parse(variablesText);
    } catch (e) {}

    this.elements.responseOutput.textContent = '// 로딩 중...';
    this.elements.responseTime.textContent = '';

    const startTime = performance.now();

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, variables })
      });

      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);
      this.elements.responseTime.textContent = duration + 'ms';

      const data = await response.json();
      this.elements.responseOutput.textContent = JSON.stringify(data, null, 2);

    } catch (error) {
      this.elements.responseOutput.textContent = '// 오류: ' + error.message;
      this.elements.responseTime.textContent = 'Error';
    }
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const graphqlPlayground = new GraphqlPlayground();
window.GraphqlPlayground = graphqlPlayground;

document.addEventListener('DOMContentLoaded', () => graphqlPlayground.init());
