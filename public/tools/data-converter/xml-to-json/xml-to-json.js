/**
 * XML ↔ JSON 변환 도구 - ToolBase 기반
 * XML과 JSON 상호 변환
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var XmlJson = class XmlJson extends ToolBase {
  constructor() {
    super('XmlJson');
  }

  init() {
    this.initElements({
      xmlInput: 'xmlInput',
      jsonInput: 'jsonInput',
      xmlStats: 'xmlStats',
      jsonStats: 'jsonStats'
    });

    console.log('[XmlJson] 초기화 완료');
    return this;
  }

  toJson() {
    const xml = this.elements.xmlInput.value.trim();
    if (!xml) {
      this.showToast('XML을 입력하세요.', 'warning');
      return;
    }

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xml, 'text/xml');

      // 파싱 에러 체크
      const parseError = doc.querySelector('parsererror');
      if (parseError) {
        throw new Error('XML 파싱 오류: ' + parseError.textContent.substring(0, 100));
      }

      const json = this.xmlToJson(doc.documentElement);
      const result = {};
      result[doc.documentElement.tagName] = json;

      this.elements.jsonInput.value = JSON.stringify(result, null, 2);
      this.updateStats();
      this.showToast('JSON으로 변환 완료!', 'success');

    } catch (error) {
      this.showToast('변환 오류: ' + error.message, 'error');
    }
  }

  xmlToJson(node) {
    const obj = {};

    // 속성 처리
    if (node.attributes && node.attributes.length > 0) {
      for (let i = 0; i < node.attributes.length; i++) {
        const attr = node.attributes[i];
        obj['@' + attr.nodeName] = attr.nodeValue;
      }
    }

    // 자식 노드 처리
    if (node.hasChildNodes()) {
      for (let i = 0; i < node.childNodes.length; i++) {
        const child = node.childNodes[i];

        // 텍스트 노드
        if (child.nodeType === 3) {
          const text = child.nodeValue.trim();
          if (text) {
            // 다른 속성이 없으면 텍스트만 반환
            if (Object.keys(obj).length === 0 && node.childNodes.length === 1) {
              return text;
            }
            obj['#text'] = text;
          }
        }
        // 요소 노드
        else if (child.nodeType === 1) {
          const childJson = this.xmlToJson(child);
          const tagName = child.tagName;

          // 같은 이름의 요소가 있으면 배열로
          if (obj[tagName] !== undefined) {
            if (!Array.isArray(obj[tagName])) {
              obj[tagName] = [obj[tagName]];
            }
            obj[tagName].push(childJson);
          } else {
            obj[tagName] = childJson;
          }
        }
      }
    }

    return Object.keys(obj).length === 0 ? '' : obj;
  }

  toXml() {
    const json = this.elements.jsonInput.value.trim();
    if (!json) {
      this.showToast('JSON을 입력하세요.', 'warning');
      return;
    }

    try {
      const obj = JSON.parse(json);
      const xml = this.jsonToXml(obj, 0);

      this.elements.xmlInput.value = '<?xml version="1.0" encoding="UTF-8"?>\n' + xml;
      this.updateStats();
      this.showToast('XML로 변환 완료!', 'success');

    } catch (error) {
      this.showToast('변환 오류: ' + error.message, 'error');
    }
  }

  jsonToXml(obj, indent) {
    const indentStr = '  '.repeat(indent);
    let xml = '';

    if (typeof obj !== 'object' || obj === null) {
      return this.escapeXml(String(obj));
    }

    for (const key in obj) {
      if (!obj.hasOwnProperty(key)) continue;

      const value = obj[key];

      // 속성은 건너뜀 (부모에서 처리)
      if (key.startsWith('@')) continue;

      // 텍스트 노드
      if (key === '#text') {
        xml += this.escapeXml(String(value));
        continue;
      }

      // 배열 처리
      if (Array.isArray(value)) {
        value.forEach(item => {
          xml += this.createXmlElement(key, item, indent);
        });
      } else {
        xml += this.createXmlElement(key, value, indent);
      }
    }

    return xml;
  }

  createXmlElement(tagName, value, indent) {
    const indentStr = '  '.repeat(indent);
    let xml = indentStr + '<' + tagName;

    // 속성 추가
    if (typeof value === 'object' && value !== null) {
      for (const key in value) {
        if (key.startsWith('@')) {
          xml += ' ' + key.substring(1) + '="' + this.escapeXml(String(value[key])) + '"';
        }
      }
    }

    // 빈 요소
    if (value === null || value === '' ||
        (typeof value === 'object' && Object.keys(value).filter(k => !k.startsWith('@')).length === 0)) {
      xml += '/>\n';
      return xml;
    }

    xml += '>';

    // 단순 값
    if (typeof value !== 'object') {
      xml += this.escapeXml(String(value)) + '</' + tagName + '>\n';
      return xml;
    }

    // 텍스트만 있는 경우
    const nonAttrKeys = Object.keys(value).filter(k => !k.startsWith('@'));
    if (nonAttrKeys.length === 1 && nonAttrKeys[0] === '#text') {
      xml += this.escapeXml(String(value['#text'])) + '</' + tagName + '>\n';
      return xml;
    }

    // 중첩 요소
    xml += '\n';
    xml += this.jsonToXml(value, indent + 1);
    xml += indentStr + '</' + tagName + '>\n';

    return xml;
  }

  escapeXml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  async copy(type) {
    const text = this.elements[type === 'xml' ? 'xmlInput' : 'jsonInput'].value;
    if (!text) {
      this.showToast('복사할 내용이 없습니다.', 'warning');
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      this.showToast('클립보드에 복사되었습니다.', 'success');
    } catch (e) {
      this.showToast('복사 실패', 'error');
    }
  }

  async paste(type) {
    try {
      const text = await navigator.clipboard.readText();
      this.elements[type === 'xml' ? 'xmlInput' : 'jsonInput'].value = text;
      this.updateStats();
    } catch (e) {
      this.showToast('클립보드 접근이 거부되었습니다.', 'error');
    }
  }

  loadSample(type) {
    const samples = {
      simple: `<?xml version="1.0" encoding="UTF-8"?>
<book>
  <title>JavaScript 완벽 가이드</title>
  <author>David Flanagan</author>
  <year>2020</year>
  <price>45000</price>
</book>`,

      nested: `<?xml version="1.0" encoding="UTF-8"?>
<company>
  <name>MyMind3</name>
  <employees>
    <employee>
      <name>홍길동</name>
      <position>개발자</position>
    </employee>
    <employee>
      <name>김철수</name>
      <position>디자이너</position>
    </employee>
  </employees>
  <location>서울</location>
</company>`,

      attributes: `<?xml version="1.0" encoding="UTF-8"?>
<catalog>
  <product id="1" category="electronics">
    <name>스마트폰</name>
    <price currency="KRW">1000000</price>
    <stock available="true">50</stock>
  </product>
  <product id="2" category="electronics">
    <name>노트북</name>
    <price currency="KRW">1500000</price>
    <stock available="true">30</stock>
  </product>
</catalog>`,

      json: `{
  "catalog": {
    "product": [
      {
        "@id": "1",
        "@category": "electronics",
        "name": "스마트폰",
        "price": {
          "@currency": "KRW",
          "#text": "1000000"
        }
      },
      {
        "@id": "2",
        "@category": "electronics",
        "name": "노트북",
        "price": {
          "@currency": "KRW",
          "#text": "1500000"
        }
      }
    ]
  }
}`
    };

    if (type === 'json') {
      this.elements.jsonInput.value = samples.json;
    } else {
      this.elements.xmlInput.value = samples[type];
    }

    this.updateStats();
    this.showToast('샘플이 로드되었습니다.', 'info');
  }

  updateStats() {
    const xml = this.elements.xmlInput.value;
    const json = this.elements.jsonInput.value;

    this.elements.xmlStats.textContent = `${xml.length}자`;
    this.elements.jsonStats.textContent = `${json.length}자`;
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const xmlJson = new XmlJson();
window.XmlJson = xmlJson;

document.addEventListener('DOMContentLoaded', () => xmlJson.init());
