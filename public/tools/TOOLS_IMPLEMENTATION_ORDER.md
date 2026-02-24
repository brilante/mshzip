# ALLINONE 도구 구현 순서

> 이 문서는 All-in-One 도구 허브의 구현 순서를 추적합니다.
> 각 도구 구현 완료 시 체크박스를 표시합니다.

---

## 구현 우선순위 (난이도순)

> **원칙**: 쉬운 도구부터 구현하여 빠르게 완성도를 높인다.

### Phase 1 구현 순서 (개발자 도구)

| 순서 | 도구 ID | 도구명 | 난이도 | 예상 시간 | 상태 |
|:----:|---------|--------|:------:|:---------:|:----:|
| 1 | json-formatter | JSON 포매터 | | 2h | 완료 |
| 2 | base64-encoder | Base64 인코더/디코더 | | 2h | 완료 |
| 3 | uuid-generator | UUID 생성기 | | 30m | 완료 |
| 4 | hash-generator | 해시 생성기 | | 1h | 완료 |
| 5 | color-converter | 색상 변환기 | | 1.5h | 완료 |
| 6 | regex-tester | 정규식 테스터 | | 2h | 완료 |

### 난이도 기준

| 난이도 | 설명 | 기술 요구사항 |
|:------:|------|---------------|
| | 매우 쉬움 | 내장 API 1-2개, 단순 UI |
| | 쉬움 | 내장 API + 간단한 로직 |
| | 보통 | 복잡한 UI 또는 외부 라이브러리 |
| | 어려움 | 서버 연동 필수, 파일 처리 |
| | 매우 어려움 | 외부 API + 복잡한 로직 |

---

## 폴더 구조

```
public/tools/
├── TOOLS_IMPLEMENTATION_ORDER.md   # 이 문서
├── common/                          # 공통 리소스
│   ├── tools-common.css
│   ├── tools-common.js
│   └── tools-api.js
├── developer/                       # Phase 1 & 7: 개발자 도구
│   ├── json-formatter/
│   ├── base64-encoder/
│   ├── hash-generator/
│   ├── color-converter/
│   ├── uuid-generator/
│   ├── regex-tester/
│   └── url-encoder/                 # Phase 7
├── image/                           # Phase 2: 이미지 도구
│   ├── compress/
│   ├── resize/
│   ├── convert/
│   └── to-base64/
├── document/                        # Phase 3: 문서 변환
│   ├── pdf-merge/
│   ├── pdf-split/
│   ├── pdf-to-image/
│   └── image-to-pdf/
├── text/                            # Phase 4: 텍스트 도구
│   ├── word-counter/
│   ├── case-converter/
│   └── lorem-ipsum/
├── calculator/                      # Phase 4 & 7: 계산기
│   ├── unit-converter/
│   ├── bmi-calc/
│   ├── percentage-calc/
│   └── age-calc/                    # Phase 7
├── design/                          # Phase 7: 디자인 도구
│   ├── border-radius/
│   ├── gradient-generator/
│   ├── shadow-generator/
│   └── color-palette/
├── security/                        # Phase 7: 보안 도구
│   ├── password-generator/
│   └── password-strength/
├── qr-seo/                          # Phase 5 & 7: QR/SEO
│   ├── qr-generator/
│   ├── meta-generator/
│   ├── sitemap-generator/
│   ├── qr-wifi/                     # Phase 7
│   └── qr-vcard/                    # Phase 7
├── data-converter/                  # Phase 8: 데이터 변환
│   ├── csv-to-json/
│   ├── json-to-csv/
│   ├── yaml-to-json/
│   ├── markdown-to-html/
│   └── html-to-markdown/
├── text-processing/                 # Phase 9: 텍스트 처리
│   ├── text-diff/
│   ├── text-sort/
│   ├── duplicate-remover/
│   ├── line-number/
│   └── text-reverse/
└── ai/                              # Phase 6: AI (프리미엄)
    ├── bg-remove/
    └── tts/
```

---

## Phase 1: 개발자 도구 (클라이언트 전용)

> 난이도: | 서버 불필요 | 순수 JavaScript

| # | 도구 ID | 도구명 | 폴더 | 난이도 | 상태 | 완료일 |
|---|---------|--------|------|:------:|:----:|--------|
| 1 | json-formatter | JSON 포매터 | `developer/json-formatter/` | | 완료 | 2026-01-11 |
| 2 | base64-encoder | Base64 인코더/디코더 | `developer/base64-encoder/` | | 완료 | 2026-01-11 |
| 3 | uuid-generator | UUID 생성기 | `developer/uuid-generator/` | | 완료 | 2026-01-12 |
| 4 | hash-generator | 해시 생성기 | `developer/hash-generator/` | | 완료 | 2026-01-12 |
| 5 | color-converter | 색상 변환기 | `developer/color-converter/` | | 완료 | 2026-01-12 |
| 6 | regex-tester | 정규식 테스터 | `developer/regex-tester/` | | 완료 | 2026-01-12 |

---

## Phase 2: 이미지 도구

> 난이도: | 클라이언트 전용 (Canvas API)

| # | 도구 ID | 도구명 | 폴더 | 상태 | 완료일 |
|---|---------|--------|------|------|--------|
| 7 | image-to-base64 | 이미지 → Base64 | `image/to-base64/` | 완료 | 2026-01-12 |
| 8 | image-compress | 이미지 압축 | `image/compress/` | 완료 | 2026-01-12 |
| 9 | image-resize | 이미지 리사이즈 | `image/resize/` | 완료 | 2026-01-12 |
| 10 | image-convert | 포맷 변환 | `image/convert/` | 완료 | 2026-01-12 |

---

## Phase 3: 문서 변환 도구

> 난이도: | 클라이언트 전용 (pdf-lib, pdf.js)

| # | 도구 ID | 도구명 | 폴더 | 상태 | 완료일 |
|---|---------|--------|------|------|--------|
| 11 | image-to-pdf | 이미지 → PDF | `document/image-to-pdf/` | 완료 | 2026-01-12 |
| 12 | pdf-merge | PDF 병합 | `document/pdf-merge/` | 완료 | 2026-01-12 |
| 13 | pdf-split | PDF 분할 | `document/pdf-split/` | 완료 | 2026-01-12 |
| 14 | pdf-to-image | PDF → 이미지 | `document/pdf-to-image/` | 완료 | 2026-01-12 |

---

## Phase 4: 텍스트/계산 도구

> 난이도: | 클라이언트 전용

| # | 도구 ID | 도구명 | 폴더 | 상태 | 완료일 |
|---|---------|--------|------|------|--------|
| 15 | word-counter | 글자수 세기 | `text/word-counter/` | 완료 | 2026-01-12 |
| 16 | case-converter | 대소문자 변환 | `text/case-converter/` | 완료 | 2026-01-12 |
| 17 | lorem-ipsum | Lorem Ipsum 생성 | `text/lorem-ipsum/` | 완료 | 2026-01-12 |
| 18 | unit-converter | 단위 변환기 | `calculator/unit-converter/` | 완료 | 2026-01-12 |
| 19 | bmi-calc | BMI 계산기 | `calculator/bmi-calc/` | 완료 | 2026-01-12 |
| 20 | percentage-calc | 퍼센트 계산기 | `calculator/percentage-calc/` | 완료 | 2026-01-12 |

---

## Phase 5: QR 코드 / SEO 도구

> 난이도: | 클라이언트 전용 (QRCode.js)

| # | 도구 ID | 도구명 | 폴더 | 상태 | 완료일 |
|---|---------|--------|------|------|--------|
| 21 | qr-generator | QR 코드 생성 | `qr-seo/qr-generator/` | 완료 | 2026-01-12 |
| 22 | meta-generator | 메타 태그 생성 | `qr-seo/meta-generator/` | 완료 | 2026-01-12 |
| 23 | sitemap-generator | 사이트맵 생성 | `qr-seo/sitemap-generator/` | 완료 | 2026-01-12 |

---

## Phase 6: AI 기반 도구 (프리미엄)

> 난이도: | 서버 필수 + 외부 API

| # | 도구 ID | 도구명 | 폴더 | 상태 | 완료일 |
|---|---------|--------|------|------|--------|
| 24 | bg-remove | AI 배경 제거 | `ai/bg-remove/` | 완료 | 2026-01-12 |
| 25 | tts | Text-to-Speech | `ai/tts/` | 완료 | 2026-01-12 |

---

## Phase 7: 추가 도구 (확장)

> 난이도: ~| 클라이언트 전용

| # | 도구 ID | 도구명 | 폴더 | 상태 | 완료일 |
|---|---------|--------|------|------|--------|
| 26 | url-encoder | URL 인코더/디코더 | `developer/url-encoder/` | 완료 | 2026-01-12 |
| 27 | age-calc | 나이 계산기 | `calculator/age-calc/` | 완료 | 2026-01-12 |
| 28 | border-radius | 테두리 둥글기 생성기 | `design/border-radius/` | 완료 | 2026-01-12 |
| 29 | gradient-generator | 그라디언트 생성기 | `design/gradient-generator/` | 완료 | 2026-01-12 |
| 30 | shadow-generator | CSS 그림자 생성기 | `design/shadow-generator/` | 완료 | 2026-01-12 |
| 31 | password-generator | 비밀번호 생성기 | `security/password-generator/` | 완료 | 2026-01-12 |
| 32 | password-strength | 비밀번호 강도 테스트 | `security/password-strength/` | 완료 | 2026-01-12 |
| 33 | color-palette | 컬러 팔레트 생성기 | `design/color-palette/` | 완료 | 2026-01-12 |
| 34 | qr-wifi | WiFi QR 코드 생성기 | `qr-seo/qr-wifi/` | 완료 | 2026-01-12 |
| 35 | qr-vcard | 명함 QR 코드 생성기 | `qr-seo/qr-vcard/` | 완료 | 2026-01-12 |

---

## Phase 8: 데이터 변환 도구

> 난이도: | 클라이언트 전용

| # | 도구 ID | 도구명 | 폴더 | 상태 | 완료일 |
|---|---------|--------|------|------|--------|
| 36 | csv-to-json | CSV → JSON | `data-converter/csv-to-json/` | 완료 | 2026-01-12 |
| 37 | json-to-csv | JSON → CSV | `data-converter/json-to-csv/` | 완료 | 2026-01-12 |
| 38 | yaml-to-json | YAML ↔ JSON | `data-converter/yaml-to-json/` | 완료 | 2026-01-12 |
| 39 | markdown-to-html | Markdown → HTML | `data-converter/markdown-to-html/` | 완료 | 2026-01-12 |
| 40 | html-to-markdown | HTML → Markdown | `data-converter/html-to-markdown/` | 완료 | 2026-01-12 |

---

## Phase 9: 텍스트 처리 도구

> 난이도: | 클라이언트 전용

| # | 도구 ID | 도구명 | 폴더 | 상태 | 완료일 |
|---|---------|--------|------|------|--------|
| 41 | text-diff | 텍스트 비교 | `text-processing/text-diff/` | 완료 | 2026-01-12 |
| 42 | text-sort | 텍스트 정렬 | `text-processing/text-sort/` | 완료 | 2026-01-12 |
| 43 | duplicate-remover | 중복 제거 | `text-processing/duplicate-remover/` | 완료 | 2026-01-12 |
| 44 | line-number | 행 번호 추가 | `text-processing/line-number/` | 완료 | 2026-01-12 |
| 45 | text-reverse | 텍스트 역순 | `text-processing/text-reverse/` | 완료 | 2026-01-12 |

---

## Phase 10: 이미지 편집 도구

> 난이도: | 클라이언트 전용 (Canvas API)

| # | 도구 ID | 도구명 | 폴더 | 상태 | 완료일 |
|---|---------|--------|------|------|--------|
| 46 | image-rotate | 이미지 회전 | `image/rotate/` | 완료 | 2026-01-12 |
| 47 | image-flip | 이미지 뒤집기 | `image/flip/` | 완료 | 2026-01-12 |
| 48 | grayscale | 흑백 변환 | `image/grayscale/` | 완료 | 2026-01-12 |
| 49 | image-crop | 이미지 자르기 | `image/crop/` | 완료 | 2026-01-12 |
| 50 | favicon-generator | 파비콘 생성 | `image/favicon/` | 완료 | 2026-01-12 |

---

## Phase 11: 추가 도구 (이미지/개발자)

> 난이도: | 클라이언트 전용

| # | 도구 ID | 도구명 | 폴더 | 상태 | 완료일 |
|---|---------|--------|------|------|--------|
| 51 | gif-maker | GIF 생성 | `image/gif-maker/` | 완료 | 2026-01-12 |
| 52 | watermark | 워터마크 추가 | `image/watermark/` | 완료 | 2026-01-12 |
| 53 | timestamp-converter | 타임스탬프 변환 | `developer/timestamp-converter/` | 완료 | 2026-01-12 |
| 54 | jwt-decoder | JWT 디코더 | `developer/jwt-decoder/` | 완료 | 2026-01-12 |
| 55 | cron-parser | Cron 파서 | `developer/cron-parser/` | 완료 | 2026-01-12 |

---

## Phase 12: 개발자 도구 (압축/변환)

> 난이도: | 클라이언트 전용

| # | 도구 ID | 도구명 | 폴더 | 상태 | 완료일 |
|---|---------|--------|------|------|--------|
| 56 | url-encode | URL 인코딩 | `developer/url-encode/` | 완료 | 2026-01-12 |
| 57 | html-minify | HTML 압축 | `developer/html-minify/` | 완료 | 2026-01-12 |
| 58 | css-minify | CSS 압축 | `developer/css-minify/` | 완료 | 2026-01-12 |
| 59 | js-minify | JS 압축 | `developer/js-minify/` | 완료 | 2026-01-12 |
| 60 | xml-to-json | XML ↔ JSON | `data-converter/xml-to-json/` | 완료 | 2026-01-12 |

---

## Phase 13: 계산기 도구

> 난이도: | 클라이언트 전용

| # | 도구 ID | 도구명 | 폴더 | 상태 | 완료일 |
|---|---------|--------|------|------|--------|
| 61 | date-diff-calc | 날짜 차이 계산 | `calculator/date-diff/` | 완료 | 2026-01-12 |
| 62 | time-zone | 시간대 변환 | `calculator/time-zone/` | 완료 | 2026-01-12 |
| 63 | loan-calc | 대출 이자 계산기 | `calculator/loan-calc/` | 완료 | 2026-01-12 |
| 64 | compound-interest | 복리 계산기 | `calculator/compound-interest/` | 완료 | 2026-01-12 |
| 65 | tip-calc | 팁 계산기 | `calculator/tip-calc/` | 완료 | 2026-01-12 |

---

## 구현 진행 상황

| Phase | 전체 | 완료 | 진행률 |
|-------|:----:|:----:|:------:|
| Phase 1 | 6 | 6 | 100% |
| Phase 2 | 4 | 4 | 100% |
| Phase 3 | 4 | 4 | 100% |
| Phase 4 | 6 | 6 | 100% |
| Phase 5 | 3 | 3 | 100% |
| Phase 6 | 2 | 2 | 100% |
| Phase 7 | 10 | 10 | 100% |
| Phase 8 | 5 | 5 | 100% |
| Phase 9 | 5 | 5 | 100% |
| Phase 10 | 5 | 5 | 100% |
| Phase 11 | 5 | 5 | 100% |
| Phase 12 | 5 | 5 | 100% |
| Phase 13 | 5 | 5 | 100% |
| **총계** | **65** | **65** | **100%** |

---

## 도구 사용 규칙 (필수)

> **중요**: 도구는 반드시 **도구 버튼 → 도구 팝업 → 도구 선택** 순서로 접근해야 한다.

### 접근 흐름 (필수)
```
[도구 버튼 클릭] → [도구 레이어 팝업] → [도구 선택] → [🆕 새 창(window.open)으로 열기]
```

### 규칙
1. **도구 버튼 필수**: 메인 페이지의 도구 버튼을 클릭하여 도구 팝업 열기
2. **도구 팝업에서 선택**: 레이어 팝업에서 원하는 도구를 찾아 클릭
3. **🆕 새 창으로 열기**: 도구 클릭 시 `window.open()`으로 **새 브라우저 창/탭** 열기
4. **URL 직접 접근 금지**: `/tools/...` URL로 직접 접근 절대 불가

### 새 창 열기 구현
```javascript
// 도구 팝업에서 도구 클릭 시
function openTool(toolPath) {
  // 새 창으로 열기 (필수)
  window.open(toolPath, '_blank');
}
```

### 금지 사항
```
브라우저 주소창에 /tools/developer/json-formatter/ 직접 입력
외부 링크로 도구 페이지 직접 공유
북마크로 도구 페이지 직접 접근
```

### 허용 사항
```
도구 버튼 → 도구 팝업 → 도구 선택 → 새 창 열기
도구 팝업 내 검색으로 도구 찾기
카테고리별 도구 탐색
```

### 보안 구현
- 서버에서 Referer 체크하여 직접 URL 접근 차단
- 도구 페이지는 메인 페이지에서만 열 수 있도록 검증

---

## 도구 구현 체크리스트 (필수!)

> **중요**: 새 도구를 구현할 때 반드시 아래 체크리스트를 모두 완료해야 한다.

### 1단계: 도구 파일 생성
- [ ] `public/tools/[카테고리]/[도구명]/index.html` 생성
- [ ] `public/tools/[카테고리]/[도구명]/[도구명].js` 생성
- [ ] HTML 제목에 도구명 포함: `<title>[도구명] - MyMind3 도구</title>`
- [ ] 도구 헤더에 아이콘과 제목 표시

### 2단계: All-in-One 허브 연결 (`public/index.html`)
- [ ] `implementedTools` 객체에 도구 핸들러 추가:
```javascript
'[도구-id]': () => {
  window.open('/tools/?load=[카테고리]/[도구명]', '_blank');
},
```

### 3단계: 도구 래퍼 제목 등록 (`public/tools/index.html`)
- [ ] `toolNames` 객체에 도구명 추가:
```javascript
'[카테고리]/[도구명]': '[한글 도구명]',
```

### 4단계: 데이터베이스 등록 (`src/db/models/Tool.js`)
- [ ] `DEFAULT_TOOLS` 배열에 도구 추가:
```javascript
{ id: '[도구-id]', name: '[한글명]', icon: '[이모지]', categoryId: '[카테고리]', sortOrder: N, isImplemented: true, path: '/tools/[카테고리]/[도구명]' },
```

### 5단계: 테스트
- [ ] All-in-One 허브에서 도구 표시 확인 (없이)
- [ ] 도구 클릭 시 새 창 열림 확인
- [ ] 래퍼 페이지 제목에 도구명 표시 확인
- [ ] 도구 기능 정상 동작 확인

### 연결 파일 요약
| 파일 | 역할 | 필수 수정 내용 |
|------|------|----------------|
| `public/index.html` | All-in-One 허브 | `implementedTools` 객체에 핸들러 추가 |
| `public/tools/index.html` | 도구 래퍼 | `toolNames` 객체에 제목 추가 |
| `src/db/models/Tool.js` | DB 기본값 | `DEFAULT_TOOLS` 배열에 도구 추가 |

---

## 도구별 파일 구조 (표준)

각 도구 폴더는 다음 구조를 따릅니다:

```
[tool-id]/
├── index.html          # 도구 HTML (독립 페이지) ← 새 창으로 열림
├── [tool-id].js        # 도구 JavaScript 로직
├── [tool-id].css       # 도구 전용 스타일 (선택)
└── README.md           # 도구 설명 (선택)
```

---

## 상태 표시

- 미구현: 아직 시작하지 않음
- 진행중: 구현 진행 중
- 완료: 구현 및 테스트 완료
- 보류: 일시 중단

---

## 변경 이력

| 날짜 | 변경 내용 |
|------|----------|
| 2026-01-11 | 문서 생성, 25개 도구 목록 정의 |
| 2026-01-12 | 난이도순 구현 순서 추가, JSON 포매터/Base64 인코더 완료 표시 |
| 2026-01-12 | 도구 사용 규칙 수정 (도구 버튼 → 팝업 → 새 창, URL 직접 접근 금지) |
| 2026-01-12 | UUID 생성기 구현 완료 (Phase 1: 3/6) |
| 2026-01-12 | 해시 생성기 구현 완료 (Phase 1: 4/6) |
| 2026-01-12 | 색상 변환기 구현 완료 (Phase 1: 5/6) |
| 2026-01-12 | 정규식 테스터 구현 완료 (Phase 1: 6/6 - **Phase 1 완료!**) |
| 2026-01-12 | Phase 4 텍스트/계산 도구 6개 구현 완료 (글자수 세기, 대소문자 변환, Lorem Ipsum 생성, 단위 변환기, BMI 계산기, 퍼센트 계산기) - **Phase 4 완료!** |
| 2026-01-12 | Phase 5 QR/SEO 도구 3개 구현 완료 (QR 코드 생성, 메타 태그 생성, 사이트맵 생성) - **Phase 5 완료!** |
| 2026-01-12 | Phase 6 AI 도구 2개 구현 완료 (AI 배경 제거, Text-to-Speech) - **Phase 6 완료!** |
| 2026-01-12 | Phase 7 추가 도구 10개 구현 완료 (URL 인코더, 나이 계산기, 테두리 둥글기, 그라디언트 생성기, CSS 그림자 생성기, 비밀번호 생성기, 비밀번호 강도 테스트, 컬러 팔레트 생성기, WiFi QR 생성기, 명함 QR 생성기) - **Phase 7 완료!** |
| 2026-01-12 | Phase 8 데이터 변환 도구 5개 구현 완료 (CSV↔JSON, YAML↔JSON, Markdown↔HTML) - **Phase 8 완료!** |
| 2026-01-12 | Phase 9 텍스트 처리 도구 5개 구현 완료 (텍스트 비교, 텍스트 정렬, 중복 제거, 행 번호 추가, 텍스트 역순) - **Phase 9 완료! 전체 45개 도구 100% 완성!** |
| 2026-01-12 | Phase 10 이미지 편집 도구 5개 구현 완료 (이미지 회전, 이미지 뒤집기, 흑백 변환, 이미지 자르기, 파비콘 생성) - **Phase 10 완료!** |
| 2026-01-12 | Phase 11 추가 도구 5개 구현 완료 (GIF 생성, 워터마크 추가, 타임스탬프 변환, JWT 디코더, Cron 파서) - **Phase 11 완료!** |
| 2026-01-12 | Phase 12 개발자 도구 5개 구현 완료 (URL 인코딩, HTML 압축, CSS 압축, JS 압축, XML↔JSON) - **Phase 12 완료!** |
| 2026-01-12 | Phase 14~30 미구현 도구 126개 구현 계획 추가 |
| 2026-01-12 | Phase 14 계산기 도구 4개 구현 완료 (학점 계산기, 칼로리 계산기, 환율 계산기, 공학용 계산기) - **Phase 14 완료!** |
| 2026-01-12 | Phase 15 데이터 변환 도구 4개 구현 완료 (Excel→JSON, SQL→JSON, 텍스트→바이너리, 텍스트→HEX) - **Phase 15 완료!** |
| 2026-01-12 | Phase 16 디자인 도구 9개 구현 완료 (색상 추출기, 폰트 조합, Box Shadow, Glassmorphism, Neumorphism, SVG 편집기, 아이콘 라이브러리, 목업 생성기, 패턴 생성기) - **Phase 16 완료!** |
| 2026-01-12 | Phase 17 개발자 도구 3개 구현 완료 (JSON↔YAML, JSON↔XML, 코드 비교) - **Phase 17 완료!** |
| 2026-01-12 | Phase 18 QR 코드 도구 4개 구현 완료 (QR 읽기, 맞춤형 QR, 바코드 생성, 바코드 읽기) - **Phase 18 완료!** |
| 2026-01-12 | Phase 19 이미지 도구 6개 구현 완료 (고급 리사이즈, 고급 변환, 고급 자르기, 고급 회전, 고급 뒤집기, 고급 파비콘) - **Phase 19 완료!** |
| 2026-01-12 | Phase 20 텍스트 도구 9개 구현 완료 (문법 검사, 표절 검사, AI 탐지, 패러프레이즈, 요약, 인용 생성기, 맞춤법 검사, 키워드 밀도, Markdown 미리보기) - **Phase 20 완료! 총 104개 도구 구현!** |
| 2026-01-12 | Phase 21 보안 도구 6개 구현 완료 (MD5 해시, SHA256 해시, 암호화/복호화, SSL 인증서 생성, 2FA 코드 생성, 개인정보 처리방침 생성) - **Phase 21 완료!** |
| 2026-01-12 | Phase 22 SEO 도구 10개 구현 완료 (OG 태그 생성, robots.txt 생성, 키워드 리서치, 백링크 체커, 도메인 권한 체크, 페이지 속도 분석, SSL 인증서 체크, Schema 마크업 생성, 제목 최적화, 검색 결과 미리보기) - **Phase 22 완료!** |
| 2026-01-12 | Phase 23 비즈니스 도구 8개 구현 완료 (인보이스 생성, 이력서 빌더, 이메일 서명 생성, 명함 생성기, 계약서 템플릿, 미팅 스케줄러, 지출 추적기, 프로젝트 타임라인) - **Phase 23 완료! 총 128개 도구 구현!** |
| 2026-01-12 | Phase 24 문서 변환 도구 7개 구현 완료 (PDF→PPT, PPT→PDF, PDF→Word, Word→PDF, PDF→Excel, PDF 압축, PDF OCR) - **Phase 24 완료!** |
| 2026-01-12 | Phase 25 네트워크 도구 10개 구현 완료 (IP 조회, WHOIS 조회, DNS 조회, Ping 테스트, 포트 스캐너, 속도 테스트, HTTP 헤더 체크, URL 단축기, URL 확장기, 링크 체커) - **Phase 25 완료!** |
| 2026-01-12 | Phase 26 미디어 도구 9개 구현 완료 (YouTube→MP3, YouTube→MP4, 비디오 압축, 비디오 변환, 비디오 트리밍, 비디오 병합, 오디오 노이즈 제거, 오디오 변환, 비디오→GIF) - **Phase 26 완료! 총 154개 도구 구현!** |
| 2026-01-12 | Phase 27 소셜 미디어 도구 8개 구현 완료 (해시태그 생성, 캡션 생성, 게시물 스케줄러, 바이오 생성, 썸네일 메이커, 스토리 템플릿, 인게이지먼트 계산, 사용자명 체크) - **Phase 27 완료! 총 162개 도구 (85%)!** |
| 2026-01-12 | Phase 28 AI 텍스트 도구 7개 구현 완료 (AI 글쓰기, AI 번역, AI 요약, AI 재작성, AI 문법 교정, AI 챗봇, AI 코드 생성) - **Phase 28 완료!** |
| 2026-01-12 | Phase 29 AI 이미지 도구 9개 구현 완료 (AI 이미지 생성, 배경 제거, AI 업스케일러, 사진 향상, 얼굴 교체, AI 인페인팅, 스타일 변환, 워터마크 제거, 객체 제거) - **Phase 29 완료!** |
| 2026-01-12 | Phase 30 AI 음성 도구 7개 구현 완료 (TTS, STT, 음성 복제, AI 보이스 생성, 오디오 향상, 팟캐스트 생성, AI 음악 생성) - **Phase 30 완료! 총 185개 도구 100%! 전체 완료!** |

---

# 구현 완료 도구 목록 (Phase 14~30)

> **총 120개 도구** | 모두 구현 완료!

---

## Phase 14: 계산기 도구 (추가) 완료

> 난이도: | 클라이언트 전용 | **완료일: 2026-01-12**

| # | 도구 ID | 도구명 | 폴더 | 난이도 | 상태 |
|---|---------|--------|------|:------:|:----:|
| 66 | gpa-calc | 학점 계산기 | `calculator/gpa-calc/` | | 완료 |
| 67 | calorie-calc | 칼로리 계산기 | `calculator/calorie-calc/` | | 완료 |
| 68 | currency-converter | 환율 계산기 | `calculator/currency-converter/` | | 완료 |
| 69 | scientific-calc | 공학용 계산기 | `calculator/scientific-calc/` | | 완료 |

---

## Phase 15: 데이터 변환 도구 (추가) 완료

> 난이도: ~| 클라이언트 전용

| # | 도구 ID | 도구명 | 폴더 | 난이도 | 상태 |
|---|---------|--------|------|:------:|:----:|
| 70 | excel-to-json | Excel → JSON | `data-converter/excel-to-json/` | | |
| 71 | sql-to-json | SQL → JSON | `data-converter/sql-to-json/` | | |
| 72 | text-to-binary | 텍스트 → 바이너리 | `data-converter/text-to-binary/` | | |
| 73 | text-to-hex | 텍스트 → HEX | `data-converter/text-to-hex/` | | |

---

## Phase 16: 디자인 도구 (추가) 완료

> 난이도: ~| 클라이언트 전용

| # | 도구 ID | 도구명 | 폴더 | 난이도 | 상태 |
|---|---------|--------|------|:------:|:----:|
| 74 | color-picker | 색상 추출기 | `design/color-picker/` | | |
| 75 | font-pairing | 폰트 조합 | `design/font-pairing/` | | |
| 76 | box-shadow-gen | Box Shadow 생성 | `design/box-shadow-gen/` | | |
| 77 | glassmorphism-gen | Glassmorphism 생성 | `design/glassmorphism-gen/` | | |
| 78 | neumorphism-gen | Neumorphism 생성 | `design/neumorphism-gen/` | | |
| 79 | svg-editor | SVG 편집기 | `design/svg-editor/` | | |
| 80 | icon-library | 아이콘 라이브러리 | `design/icon-library/` | | |
| 81 | mockup-gen | 목업 생성기 | `design/mockup-gen/` | | |
| 82 | pattern-gen | 패턴 생성기 | `design/pattern-gen/` | | |

---

## Phase 17: 개발자 도구 (추가) 완료

> 난이도: | 클라이언트 전용 | **완료일: 2026-01-12**

| # | 도구 ID | 도구명 | 폴더 | 난이도 | 상태 |
|---|---------|--------|------|:------:|:----:|
| 83 | json-to-yaml | JSON ↔ YAML | `developer/json-to-yaml/` | | |
| 84 | json-to-xml | JSON ↔ XML | `developer/json-to-xml/` | | |
| 85 | diff-checker | 코드 비교 | `developer/diff-checker/` | | |

---

## Phase 18: QR 코드 도구 (추가) 완료

> 난이도: | 클라이언트 전용 (jsQR, QRCode.js, JsBarcode, Quagga2) | **완료일: 2026-01-12**

| # | 도구 ID | 도구명 | 폴더 | 난이도 | 상태 |
|---|---------|--------|------|:------:|:----:|
| 86 | qr-reader | QR 코드 읽기 | `qr-seo/qr-reader/` | | |
| 87 | qr-custom | 맞춤형 QR (로고) | `qr-seo/qr-custom/` | | |
| 88 | barcode-generate | 바코드 생성 | `qr-seo/barcode-generate/` | | |
| 89 | barcode-reader | 바코드 읽기 | `qr-seo/barcode-reader/` | | |

---

## Phase 19: 이미지 도구 (추가) 완료

> 난이도: | 클라이언트 전용 (Canvas API, JSZip) | **완료일: 2026-01-12**

| # | 도구 ID | 도구명 | 폴더 | 난이도 | 상태 |
|---|---------|--------|------|:------:|:----:|
| 90 | image-resize-adv | 이미지 리사이즈 (고급) | `image/resize-advanced/` | | |
| 91 | image-convert-adv | 포맷 변환 (고급) | `image/convert-advanced/` | | |
| 92 | image-crop-adv | 이미지 자르기 (고급) | `image/crop-advanced/` | | |
| 93 | image-rotate-adv | 이미지 회전 (고급) | `image/rotate-advanced/` | | |
| 94 | image-flip-adv | 이미지 뒤집기 (고급) | `image/flip-advanced/` | | |
| 95 | favicon-generator-adv | 파비콘 생성 (고급) | `image/favicon-advanced/` | | |

---

## Phase 20: 텍스트 도구 (추가) 완료

> 난이도: ~| 데모 모드 (AI 기반은 프리미엄) | **완료일: 2026-01-12**

| # | 도구 ID | 도구명 | 폴더 | 난이도 | 상태 |
|---|---------|--------|------|:------:|:----:|
| 96 | grammar-check | 문법 검사 | `text/grammar-check/` | | |
| 97 | plagiarism-check | 표절 검사 | `text/plagiarism-check/` | | |
| 98 | ai-detect | AI 탐지 | `text/ai-detect/` | | |
| 99 | paraphrase | 패러프레이징 | `text/paraphrase/` | | |
| 100 | summarize | 요약 도구 | `text/summarize/` | | |
| 101 | citation-gen | 인용 생성기 | `text/citation-gen/` | | |
| 102 | spell-check | 맞춤법 검사 | `text/spell-check/` | | |
| 103 | keyword-density | 키워드 밀도 분석 | `text/keyword-density/` | | |
| 104 | markdown-preview | Markdown 미리보기 | `text/markdown-preview/` | | |

---

## Phase 21: 보안 도구 (추가) 완료

> 난이도: ~| 클라이언트 전용 | **완료일: 2026-01-12**

| # | 도구 ID | 도구명 | 폴더 | 난이도 | 상태 |
|---|---------|--------|------|:------:|:----:|
| 105 | md5-hash | MD5 해시 | `security/md5-hash/` | | |
| 106 | sha256-hash | SHA256 해시 | `security/sha256-hash/` | | |
| 107 | encrypt-decrypt | 암호화/복호화 | `security/encrypt-decrypt/` | | |
| 108 | ssl-gen | SSL 인증서 생성 | `security/ssl-gen/` | | |
| 109 | 2fa-gen | 2FA 코드 생성 | `security/2fa-gen/` | | |
| 110 | privacy-policy-gen | 개인정보 처리방침 생성 | `security/privacy-policy-gen/` | | |

---

## Phase 22: SEO 도구 (추가) 완료

> 난이도: ~| 클라이언트 전용 (시뮬레이션 데이터) | **완료일: 2026-01-12**

| # | 도구 ID | 도구명 | 폴더 | 난이도 | 상태 |
|---|---------|--------|------|:------:|:----:|
| 111 | og-tag-gen | OG 태그 생성 | `seo/og-tag-gen/` | | |
| 112 | robots-txt-gen | robots.txt 생성 | `seo/robots-txt-gen/` | | |
| 113 | keyword-research | 키워드 리서치 | `seo/keyword-research/` | | |
| 114 | backlink-checker | 백링크 체커 | `seo/backlink-checker/` | | |
| 115 | domain-checker | 도메인 권한 체크 | `seo/domain-checker/` | | |
| 116 | page-speed | 페이지 속도 분석 | `seo/page-speed/` | | |
| 117 | ssl-checker | SSL 인증서 체크 | `seo/ssl-checker/` | | |
| 118 | schema-gen | Schema 마크업 생성 | `seo/schema-gen/` | | |
| 119 | title-optimizer | 제목 최적화 | `seo/title-optimizer/` | | |
| 120 | meta-preview | 검색 결과 미리보기 | `seo/meta-preview/` | | |

---

## Phase 23: 비즈니스 도구 완료

> 난이도: ~| 클라이언트 전용 (localStorage) | **완료일: 2026-01-12**

| # | 도구 ID | 도구명 | 폴더 | 난이도 | 상태 |
|---|---------|--------|------|:------:|:----:|
| 121 | invoice-gen | 인보이스 생성 | `business/invoice-gen/` | | |
| 122 | resume-builder | 이력서 빌더 | `business/resume-builder/` | | |
| 123 | email-signature | 이메일 서명 생성 | `business/email-signature/` | | |
| 124 | business-card | 명함 생성기 | `business/business-card/` | | |
| 125 | contract-template | 계약서 템플릿 | `business/contract-template/` | | |
| 126 | meeting-scheduler | 미팅 스케줄러 | `business/meeting-scheduler/` | | |
| 127 | expense-tracker | 지출 추적기 | `business/expense-tracker/` | | |
| 128 | project-timeline | 프로젝트 타임라인 | `business/project-timeline/` | | |

---

## Phase 24: 문서 변환 도구 (추가) 완료

> 난이도: ~| 서버 필요 (데모 모드 구현) | **완료일: 2026-01-12**

| # | 도구 ID | 도구명 | 폴더 | 난이도 | 상태 |
|---|---------|--------|------|:------:|:----:|
| 129 | pdf-to-ppt | PDF → PPT | `document/pdf-to-ppt/` | | |
| 130 | ppt-to-pdf | PPT → PDF | `document/ppt-to-pdf/` | | |
| 131 | pdf-to-word | PDF → Word | `document/pdf-to-word/` | | |
| 132 | word-to-pdf | Word → PDF | `document/word-to-pdf/` | | |
| 133 | pdf-to-excel | PDF → Excel | `document/pdf-to-excel/` | | |
| 134 | pdf-compress | PDF 압축 | `document/pdf-compress/` | | |
| 135 | pdf-ocr | PDF OCR | `document/pdf-ocr/` | | |

---

## Phase 25: 네트워크 도구 완료

> 난이도: | 서버 필수 (데모 모드 구현) | **완료일: 2026-01-12**

| # | 도구 ID | 도구명 | 폴더 | 난이도 | 상태 |
|---|---------|--------|------|:------:|:----:|
| 136 | ip-lookup | IP 조회 | `network/ip-lookup/` | | |
| 137 | whois-lookup | WHOIS 조회 | `network/whois-lookup/` | | |
| 138 | dns-lookup | DNS 조회 | `network/dns-lookup/` | | |
| 139 | ping-test | Ping 테스트 | `network/ping-test/` | | |
| 140 | port-scanner | 포트 스캐너 | `network/port-scanner/` | | |
| 141 | speed-test | 속도 테스트 | `network/speed-test/` | | |
| 142 | http-headers | HTTP 헤더 체크 | `network/http-headers/` | | |
| 143 | url-shortener | URL 단축기 | `network/url-shortener/` | | |
| 144 | url-expander | URL 확장기 | `network/url-expander/` | | |
| 145 | link-checker | 링크 체커 | `network/link-checker/` | | |

---

## Phase 26: 미디어 도구 완료

> 난이도: ~| 서버 필수 (데모 모드 구현) | **완료일: 2026-01-12**

| # | 도구 ID | 도구명 | 폴더 | 난이도 | 상태 |
|---|---------|--------|------|:------:|:----:|
| 146 | youtube-to-mp3 | YouTube → MP3 | `media/youtube-to-mp3/` | | |
| 147 | youtube-to-mp4 | YouTube → MP4 | `media/youtube-to-mp4/` | | |
| 148 | video-compress | 비디오 압축 | `media/video-compress/` | | |
| 149 | video-convert | 비디오 변환 | `media/video-convert/` | | |
| 150 | video-trim | 비디오 트리밍 | `media/video-trim/` | | |
| 151 | video-merge | 비디오 병합 | `media/video-merge/` | | |
| 152 | audio-noise-remove | 오디오 노이즈 제거 | `media/audio-noise-remove/` | | |
| 153 | audio-convert | 오디오 변환 | `media/audio-convert/` | | |
| 154 | video-to-gif | 비디오 → GIF | `media/video-to-gif/` | | |

---

## Phase 27: 소셜 미디어 도구 완료

> 난이도: ~| 클라이언트 전용 (데모 모드) | **완료일: 2026-01-12**

| # | 도구 ID | 도구명 | 폴더 | 난이도 | 상태 |
|---|---------|--------|------|:------:|:----:|
| 155 | hashtag-gen | 해시태그 생성 | `social/hashtag-gen/` | | |
| 156 | caption-gen | 캡션 생성기 | `social/caption-gen/` | | |
| 157 | post-scheduler | 게시물 스케줄러 | `social/post-scheduler/` | | |
| 158 | bio-gen | 프로필 바이오 생성 | `social/bio-gen/` | | |
| 159 | thumbnail-maker | 썸네일 메이커 | `social/thumbnail-maker/` | | |
| 160 | story-template | 스토리 템플릿 | `social/story-template/` | | |
| 161 | engagement-calc | 인게이지먼트 계산 | `social/engagement-calc/` | | |
| 162 | username-checker | 사용자명 체크 | `social/username-checker/` | | |

---

## Phase 28: AI 텍스트 도구 [프리미엄] 완료

> 난이도: | 서버 + 외부 API (OpenAI, Anthropic) | **완료일: 2026-01-12**

| # | 도구 ID | 도구명 | 폴더 | 난이도 | 상태 |
|---|---------|--------|------|:------:|:----:|
| 163 | ai-writer | AI 글쓰기 | `ai-text/ai-writer/` | | |
| 164 | ai-translator | AI 번역 | `ai-text/ai-translator/` | | |
| 165 | ai-summarizer | AI 요약 | `ai-text/ai-summarizer/` | | |
| 166 | ai-rewriter | AI 재작성 | `ai-text/ai-rewriter/` | | |
| 167 | ai-grammar | AI 문법 교정 | `ai-text/ai-grammar/` | | |
| 168 | ai-chat | AI 챗봇 | `ai-text/ai-chat/` | | |
| 169 | ai-code | AI 코드 생성 | `ai-text/ai-code/` | | |

---

## Phase 29: AI 이미지 도구 [프리미엄] 완료

> 난이도: | 서버 + 외부 API (Stability AI, Replicate) | **완료일: 2026-01-12**

| # | 도구 ID | 도구명 | 폴더 | 난이도 | 상태 |
|---|---------|--------|------|:------:|:----:|
| 170 | ai-image-gen | AI 이미지 생성 | `ai-image/ai-image-gen/` | | |
| 171 | bg-remove | 배경 제거 | `ai-image/bg-remove/` | | |
| 172 | image-upscale | AI 업스케일러 | `ai-image/image-upscale/` | | |
| 173 | photo-enhance | 사진 향상 | `ai-image/photo-enhance/` | | |
| 174 | face-swap | 얼굴 교체 | `ai-image/face-swap/` | | |
| 175 | image-inpaint | AI 인페인팅 | `ai-image/image-inpaint/` | | |
| 176 | style-transfer | 스타일 변환 | `ai-image/style-transfer/` | | |
| 177 | watermark-remove | 워터마크 제거 | `ai-image/watermark-remove/` | | |
| 178 | object-remove | 객체 제거 | `ai-image/object-remove/` | | |

---

## Phase 30: AI 음성 도구 [프리미엄] 완료

> 난이도: | 서버 + 외부 API (ElevenLabs, Whisper) | **완료일: 2026-01-12**

| # | 도구 ID | 도구명 | 폴더 | 난이도 | 상태 |
|---|---------|--------|------|:------:|:----:|
| 179 | tts | Text-to-Speech | `ai-voice/tts/` | | |
| 180 | stt | Speech-to-Text | `ai-voice/stt/` | | |
| 181 | voice-clone | 음성 복제 | `ai-voice/voice-clone/` | | |
| 182 | ai-voice-gen | AI 보이스 생성 | `ai-voice/ai-voice-gen/` | | |
| 183 | audio-enhance | 오디오 향상 | `ai-voice/audio-enhance/` | | |
| 184 | podcast-gen | 팟캐스트 생성 | `ai-voice/podcast-gen/` | | |
| 185 | ai-music | AI 음악 생성 | `ai-voice/ai-music/` | | |

---

## 전체 구현 진행 현황

| Phase | 카테고리 | 전체 | 완료 | 진행률 | 난이도 |
|:-----:|----------|:----:|:----:|:------:|:------:|
| 1-13 | 기존 구현 완료 | 65 | 65 | 100% | ~|
| 14 | 계산기 (추가) | 4 | 4 | 100% | ~|
| 15 | 데이터 변환 (추가) | 4 | 4 | 100% | ~|
| 16 | 디자인 (추가) | 9 | 9 | 100% | ~|
| 17 | 개발자 (추가) | 3 | 3 | 100% | ~|
| 18 | QR 코드 (추가) | 4 | 4 | 100% | |
| 19 | 이미지 (추가) | 6 | 6 | 100% | |
| 20 | 텍스트 (추가) | 9 | 9 | 100% | ~|
| 21 | 보안 (추가) | 6 | 6 | 100% | ~|
| 22 | SEO (추가) | 10 | 10 | 100% | ~|
| 23 | 비즈니스 | 8 | 8 | 100% | ~|
| 24 | 문서 변환 (추가) | 7 | 7 | 100% | ~|
| 25 | 네트워크 | 10 | 10 | 100% | ~|
| 26 | 미디어 | 9 | 9 | 100% | ~|
| 27 | 소셜 미디어 | 8 | 8 | 100% | ~|
| 28 | AI 텍스트 [Premium] | 7 | 7 | 100% | |
| 29 | AI 이미지 [Premium] | 9 | 9 | 100% | |
| 30 | AI 음성 [Premium] | 7 | 7 | 100% | |
| **총계** | | **185** | **185** | **100%** | |

---

## 구현 우선순위 요약

### Tier 1: 클라이언트 전용 (Phase 14-19) - 30개
> 서버 불필요, 빠른 구현 가능

1. **계산기** (4개): 환율, 학점, 칼로리, 공학용
2. **데이터 변환** (4개): Excel, SQL, Binary, HEX
3. **디자인** (9개): 색상 추출, 폰트, CSS 효과, SVG
4. **개발자** (3개): JSON 변환, 코드 비교
5. **QR/바코드** (4개): QR 읽기, 바코드
6. **이미지** (6개): 고급 편집 기능

### Tier 2: 서버 연동 필요 (Phase 20-27) - 68개
> 서버 API 개발 필요

1. **텍스트** (9개): 문법/맞춤법, AI 탐지
2. **보안** (6개): 해시, 암호화, 2FA
3. **SEO** (10개): 키워드, 백링크, 속도
4. **비즈니스** (8개): 인보이스, 이력서
5. **문서** (7개): Office 변환, OCR
6. **네트워크** (10개): IP, DNS, 속도
7. **미디어** (10개): 비디오/오디오 변환
8. **소셜** (8개): 해시태그, 썸네일

### Tier 3: AI 프리미엄 (Phase 28-30) - 23개
> 외부 AI API 필요, 유료 기능

1. **AI 텍스트** (7개): 글쓰기, 번역, 요약
2. **AI 이미지** (9개): 생성, 향상, 변환
3. **AI 음성** (7개): TTS, STT, 음악 생성

---

**문서 버전**: 7.0
**최종 업데이트**: 2026-01-12 (Phase 30 완료 - 총 185개 도구, 100% 완성!) 