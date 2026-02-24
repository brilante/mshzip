/**
 * AI 코드 생성 - ToolBase 기반
 * 자연어로 코드를 생성하고 설명받기
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class AiCodeTool extends ToolBase {
  constructor() {
    super('AiCodeTool');
    this.selectedModel = 'gpt-4o-mini';
    this.selectedLang = 'javascript';
    this.generatedCode = '';

    this.modelNames = {
      'gpt-4o-mini': 'GPT-4o Mini',
      'claude-3-haiku': 'Claude 3 Haiku',
      'gemini-2-flash': 'Gemini 2.0 Flash',
      'codestral': 'Codestral'
    };

    this.langNames = {
      javascript: 'JavaScript',
      python: 'Python',
      typescript: 'TypeScript',
      java: 'Java',
      csharp: 'C#',
      go: 'Go',
      rust: 'Rust',
      sql: 'SQL'
    };

    // 데모용 코드 템플릿
    this.codeTemplates = {
      javascript: {
        '중복': `// 배열에서 중복 제거하는 함수
function removeDuplicates(arr) {
  return [...new Set(arr)];
}

// 사용 예시
const numbers = [1, 2, 2, 3, 4, 4, 5];
console.log(removeDuplicates(numbers)); // [1, 2, 3, 4, 5]`,

        '피보나치': `// 피보나치 수열 계산 함수
function fibonacci(n) {
  if (n <= 1) return n;

  let prev = 0, curr = 1;
  for (let i = 2; i <= n; i++) {
    [prev, curr] = [curr, prev + curr];
  }
  return curr;
}

// 사용 예시
console.log(fibonacci(10)); // 55`,

        'API': `// REST API 호출 함수
async function fetchData(url, options = {}) {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });

    if (!response.ok) {
      throw new Error(\`HTTP error! status: \${response.status}\`);
    }

    return await response.json();
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
}

// 사용 예시
// const data = await fetchData('https://api.example.com/data');`,

        '날짜': `// 날짜 포맷 변환 함수
function formatDate(date, format = 'YYYY-MM-DD') {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');

  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes);
}

// 사용 예시
console.log(formatDate(new Date(), 'YYYY-MM-DD HH:mm'));`,

        '이메일': `// 이메일 유효성 검사 함수
function isValidEmail(email) {
  const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$/;
  return regex.test(email);
}

// 사용 예시
console.log(isValidEmail('test@example.com')); // true
console.log(isValidEmail('invalid-email')); // false`,

        default: `// 자동 생성된 코드
function processData(input) {
  // 입력 데이터 검증
  if (!input) {
    throw new Error('입력 데이터가 필요합니다.');
  }

  // 데이터 처리 로직
  const result = input;

  return result;
}

// 사용 예시
const data = processData('test');
console.log(data);`
      },

      python: {
        '중복': `# 배열에서 중복 제거하는 함수
def remove_duplicates(arr):
    return list(set(arr))

# 사용 예시
numbers = [1, 2, 2, 3, 4, 4, 5]
print(remove_duplicates(numbers))  # [1, 2, 3, 4, 5]`,

        '피보나치': `# 피보나치 수열 계산 함수
def fibonacci(n):
    if n <= 1:
        return n

    prev, curr = 0, 1
    for _ in range(2, n + 1):
        prev, curr = curr, prev + curr
    return curr

# 사용 예시
print(fibonacci(10))  # 55`,

        'API': `# REST API 호출 함수
import requests

def fetch_data(url, headers=None):
    try:
        response = requests.get(url, headers=headers or {})
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        print(f"Error: {e}")
        raise

# 사용 예시
# data = fetch_data('https://api.example.com/data')`,

        '날짜': `# 날짜 포맷 변환 함수
from datetime import datetime

def format_date(date, fmt='%Y-%m-%d'):
    if isinstance(date, str):
        date = datetime.fromisoformat(date)
    return date.strftime(fmt)

# 사용 예시
print(format_date(datetime.now(), '%Y-%m-%d %H:%M'))`,

        '이메일': `# 이메일 유효성 검사 함수
import re

def is_valid_email(email):
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))

# 사용 예시
print(is_valid_email('test@example.com'))  # True
print(is_valid_email('invalid-email'))  # False`,

        default: `# 자동 생성된 코드
def process_data(input_data):
    """데이터 처리 함수"""
    if not input_data:
        raise ValueError("입력 데이터가 필요합니다.")

    # 데이터 처리 로직
    result = input_data

    return result

# 사용 예시
data = process_data('test')
print(data)`
      },

      typescript: {
        default: `// TypeScript 코드
interface DataType {
  id: number;
  name: string;
  value: unknown;
}

function processData<T>(input: T): T {
  if (!input) {
    throw new Error('입력 데이터가 필요합니다.');
  }
  return input;
}

// 사용 예시
const result = processData<DataType>({ id: 1, name: 'test', value: null });
console.log(result);`
      },

      java: {
        default: `// Java 코드
public class DataProcessor {
    public static <T> T processData(T input) {
        if (input == null) {
            throw new IllegalArgumentException("입력 데이터가 필요합니다.");
        }
        return input;
    }

    public static void main(String[] args) {
        String result = processData("test");
        System.out.println(result);
    }
}`
      },

      csharp: {
        default: `// C# 코드
public class DataProcessor
{
    public static T ProcessData<T>(T input)
    {
        if (input == null)
        {
            throw new ArgumentNullException(nameof(input), "입력 데이터가 필요합니다.");
        }
        return input;
    }

    public static void Main()
    {
        var result = ProcessData("test");
        Console.WriteLine(result);
    }
}`
      },

      go: {
        default: `// Go 코드
package main

import (
    "errors"
    "fmt"
)

func processData(input string) (string, error) {
    if input == "" {
        return "", errors.New("입력 데이터가 필요합니다")
    }
    return input, nil
}

func main() {
    result, err := processData("test")
    if err != nil {
        fmt.Println("Error:", err)
        return
    }
    fmt.Println(result)
}`
      },

      rust: {
        default: `// Rust 코드
fn process_data(input: &str) -> Result<&str, &'static str> {
    if input.is_empty() {
        return Err("입력 데이터가 필요합니다.");
    }
    Ok(input)
}

fn main() {
    match process_data("test") {
        Ok(result) => println!("{}", result),
        Err(e) => eprintln!("Error: {}", e),
    }
}`
      },

      sql: {
        default: `-- SQL 쿼리
SELECT
    id,
    name,
    created_at
FROM users
WHERE status = 'active'
ORDER BY created_at DESC
LIMIT 10;

-- 데이터 삽입
INSERT INTO users (name, email, status)
VALUES ('홍길동', 'hong@example.com', 'active');`
      }
    };
  }

  init() {
    this.initElements({
      promptInput: 'promptInput',
      codeContent: 'codeContent',
      codeLang: 'codeLang',
      loadingIndicator: 'loadingIndicator'
    });

    console.log('[AiCodeTool] 초기화 완료');
    return this;
  }

  selectModel(model) {
    this.selectedModel = model;
    document.querySelectorAll('.model-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.model === model);
    });
  }

  selectLang(lang) {
    this.selectedLang = lang;
    document.querySelectorAll('.lang-chip').forEach(chip => {
      chip.classList.toggle('active', chip.dataset.lang === lang);
    });
    this.elements.codeLang.textContent = this.langNames[lang];
  }

  setPrompt(text) {
    this.elements.promptInput.value = text;
  }

  async generate() {
    const prompt = this.elements.promptInput.value.trim();

    if (!prompt) {
      this.showToast('생성할 코드를 설명해주세요.', 'error');
      return;
    }

    // 로딩 표시
    const codeContent = this.elements.codeContent;
    const loadingIndicator = this.elements.loadingIndicator;
    codeContent.querySelector('.code-placeholder')?.remove();
    loadingIndicator.classList.add('active');

    // 시뮬레이션 딜레이
    await this.delay(1500 + Math.random() * 1000);

    // 코드 생성
    const code = this.findMatchingCode(prompt);
    this.generatedCode = code;

    // 결과 표시
    loadingIndicator.classList.remove('active');
    codeContent.innerHTML = `<pre style="margin: 0; white-space: pre-wrap;">${this.escapeHtml(code)}</pre>`;

    this.showToast(`${this.modelNames[this.selectedModel]}로 코드 생성 완료!`);
  }

  findMatchingCode(prompt) {
    const templates = this.codeTemplates[this.selectedLang] || this.codeTemplates.javascript;
    const promptLower = prompt.toLowerCase();

    // 키워드 매칭
    for (const [keyword, code] of Object.entries(templates)) {
      if (keyword !== 'default' && promptLower.includes(keyword.toLowerCase())) {
        return code;
      }
    }

    return templates.default;
  }

  async explain() {
    if (!this.generatedCode) {
      this.showToast('먼저 코드를 생성해주세요.', 'error');
      return;
    }

    const codeContent = this.elements.codeContent;
    const loadingIndicator = this.elements.loadingIndicator;
    loadingIndicator.classList.add('active');

    await this.delay(1000);

    loadingIndicator.classList.remove('active');

    const explanation = `/* 코드 설명
 *
 * 이 코드는 ${this.langNames[this.selectedLang]}로 작성되었습니다.
 *
 * 주요 기능:
 * - 입력 데이터를 받아 처리합니다.
 * - 오류 처리가 포함되어 있습니다.
 * - 결과를 반환합니다.
 *
 * 사용 방법:
 * 아래 예시 코드를 참고하여 함수를 호출하세요.
 *
 * 생성 모델: ${this.modelNames[this.selectedModel]}
 */

${this.generatedCode}`;

    codeContent.innerHTML = `<pre style="margin: 0; white-space: pre-wrap;">${this.escapeHtml(explanation)}</pre>`;
    this.generatedCode = explanation;

    this.showToast('코드 설명이 추가되었습니다!');
  }

  async optimize() {
    if (!this.generatedCode) {
      this.showToast('먼저 코드를 생성해주세요.', 'error');
      return;
    }

    const codeContent = this.elements.codeContent;
    const loadingIndicator = this.elements.loadingIndicator;
    loadingIndicator.classList.add('active');

    await this.delay(1200);

    loadingIndicator.classList.remove('active');

    const optimized = `// 최적화된 코드
// - 불필요한 연산 제거
// - 메모리 효율성 개선
// - 가독성 향상

${this.generatedCode}

// 최적화 완료
// 성능: ~15% 향상
// 메모리: ~10% 절감`;

    codeContent.innerHTML = `<pre style="margin: 0; white-space: pre-wrap;">${this.escapeHtml(optimized)}</pre>`;
    this.generatedCode = optimized;

    this.showToast('코드가 최적화되었습니다!');
  }

  copyCode() {
    if (!this.generatedCode) {
      this.showToast('복사할 코드가 없습니다.', 'error');
      return;
    }
    this.copyToClipboard(this.generatedCode);
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 전역 인스턴스 생성
const aiCodeTool = new AiCodeTool();
window.AICode = aiCodeTool;

document.addEventListener('DOMContentLoaded', () => aiCodeTool.init());
console.log('[AiCodeTool] 모듈 로드 완료');
