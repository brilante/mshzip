/**
 * cURL to Code 변환기 - ToolBase 기반
 * cURL 명령어를 다양한 언어로 변환
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class CurlToCode extends ToolBase {
  constructor() {
    super('CurlToCode');
    this.parsedCurl = null;
    this.currentLanguage = 'javascript';
  }

  init() {
    this.initElements({
      curlInput: 'curlInput',
      codeOutput: 'codeOutput',
      languageLabel: 'languageLabel'
    });

    console.log('[CurlToCode] 초기화 완료');
    return this;
  }

  parseCurl(curlCommand) {
    const result = {
      method: 'GET',
      url: '',
      headers: {},
      data: null
    };

    // Clean up the command
    let cmd = curlCommand.replace(/\\\n/g, ' ').replace(/\s+/g, ' ').trim();

    // Extract URL
    const urlMatch = cmd.match(/curl\s+(?:-X\s+\w+\s+)?['"](https?:\/\/[^'"]+)['"]|curl\s+(?:-X\s+\w+\s+)?(https?:\/\/\S+)/i);
    if (urlMatch) {
      result.url = urlMatch[1] || urlMatch[2];
    }

    // Extract method
    const methodMatch = cmd.match(/-X\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)/i);
    if (methodMatch) {
      result.method = methodMatch[1].toUpperCase();
    } else if (cmd.includes('-d') || cmd.includes('--data')) {
      result.method = 'POST';
    }

    // Extract headers
    const headerRegex = /-H\s+['"](.*?)['"]/g;
    let match;
    while ((match = headerRegex.exec(cmd)) !== null) {
      const [key, ...valueParts] = match[1].split(':');
      result.headers[key.trim()] = valueParts.join(':').trim();
    }

    // Extract data
    const dataMatch = cmd.match(/(?:-d|--data|--data-raw)\s+['"](.*?)['"]/);
    if (dataMatch) {
      result.data = dataMatch[1];
    }

    return result;
  }

  generateCode(parsed, language) {
    switch (language) {
      case 'javascript':
        return this.generateJavaScript(parsed);
      case 'python':
        return this.generatePython(parsed);
      case 'php':
        return this.generatePHP(parsed);
      case 'go':
        return this.generateGo(parsed);
      case 'java':
        return this.generateJava(parsed);
      default:
        return '// 지원하지 않는 언어입니다';
    }
  }

  generateJavaScript(p) {
    let code = `const response = await fetch('${p.url}', {
  method: '${p.method}',`;

    if (Object.keys(p.headers).length > 0) {
      code += `\n  headers: {\n`;
      for (const [key, value] of Object.entries(p.headers)) {
        code += `    '${key}': '${value}',\n`;
      }
      code += `  },`;
    }

    if (p.data) {
      code += `\n  body: '${p.data.replace(/'/g, "\\'")}'`;
    }

    code += `\n});

const data = await response.json();
console.log(data);`;

    return code;
  }

  generatePython(p) {
    let code = `import requests

response = requests.request(
    method='${p.method}',
    url='${p.url}',`;

    if (Object.keys(p.headers).length > 0) {
      code += `\n    headers={\n`;
      for (const [key, value] of Object.entries(p.headers)) {
        code += `        '${key}': '${value}',\n`;
      }
      code += `    },`;
    }

    if (p.data) {
      code += `\n    data='${p.data}'`;
    }

    code += `\n)

print(response.json())`;

    return code;
  }

  generatePHP(p) {
    let code = `<?php

$curl = curl_init();

curl_setopt_array($curl, [
    CURLOPT_URL => '${p.url}',
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_CUSTOMREQUEST => '${p.method}',`;

    if (Object.keys(p.headers).length > 0) {
      code += `\n    CURLOPT_HTTPHEADER => [\n`;
      for (const [key, value] of Object.entries(p.headers)) {
        code += `        '${key}: ${value}',\n`;
      }
      code += `    ],`;
    }

    if (p.data) {
      code += `\n    CURLOPT_POSTFIELDS => '${p.data}',`;
    }

    code += `\n]);

$response = curl_exec($curl);
curl_close($curl);

echo $response;`;

    return code;
  }

  generateGo(p) {
    let code = `package main

import (
    "fmt"
    "net/http"
    "io/ioutil"
    "strings"
)

func main() {
    client := &http.Client{}`;

    if (p.data) {
      code += `\n    body := strings.NewReader(\`${p.data}\`)
    req, _ := http.NewRequest("${p.method}", "${p.url}", body)`;
    } else {
      code += `\n    req, _ := http.NewRequest("${p.method}", "${p.url}", nil)`;
    }

    for (const [key, value] of Object.entries(p.headers)) {
      code += `\n    req.Header.Add("${key}", "${value}")`;
    }

    code += `

    resp, _ := client.Do(req)
    defer resp.Body.Close()

    respBody, _ := ioutil.ReadAll(resp.Body)
    fmt.Println(string(respBody))
}`;

    return code;
  }

  generateJava(p) {
    let code = `import java.net.http.*;
import java.net.URI;

public class Main {
    public static void main(String[] args) throws Exception {
        HttpClient client = HttpClient.newHttpClient();

        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create("${p.url}"))
            .method("${p.method}", ${p.data ? `HttpRequest.BodyPublishers.ofString("${p.data.replace(/"/g, '\\"')}")` : 'HttpRequest.BodyPublishers.noBody()'})`;

    for (const [key, value] of Object.entries(p.headers)) {
      code += `\n            .header("${key}", "${value}")`;
    }

    code += `
            .build();

        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        System.out.println(response.body());
    }
}`;

    return code;
  }

  convertCurl() {
    const curlInput = this.elements.curlInput.value;
    this.parsedCurl = this.parseCurl(curlInput);
    this.updateCodeOutput();
    this.showToast('cURL이 변환되었습니다!', 'success');
  }

  showLanguage(lang) {
    this.currentLanguage = lang;
    document.querySelectorAll('.lang-tab').forEach(el => el.classList.remove('active'));
    event.target.classList.add('active');
    this.updateCodeOutput();
  }

  updateCodeOutput() {
    if (!this.parsedCurl) return;
    const code = this.generateCode(this.parsedCurl, this.currentLanguage);
    this.elements.codeOutput.textContent = code;

    const labels = {
      javascript: 'JavaScript (fetch)',
      python: 'Python (requests)',
      php: 'PHP (cURL)',
      go: 'Go (net/http)',
      java: 'Java (HttpClient)'
    };
    this.elements.languageLabel.textContent = labels[this.currentLanguage];
  }

  async copyCode() {
    const code = this.elements.codeOutput.textContent;
    try {
      await navigator.clipboard.writeText(code);
      this.showToast('코드가 클립보드에 복사되었습니다!', 'success');
    } catch (e) {
      this.showToast('복사 실패', 'error');
    }
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const curlToCode = new CurlToCode();
window.CurlToCode = curlToCode;

document.addEventListener('DOMContentLoaded', () => curlToCode.init());
