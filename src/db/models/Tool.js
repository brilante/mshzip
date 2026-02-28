/**
 * 도구 관리 모델
 * All-in-One 도구 허브의 개별 도구 관리
 *
 * @module db/models/Tool
 * @created 2026-01-11
 */

const db = require('..');

// 기본 도구 데이터 (프리미엄 + 기존 도구)
// isImplemented: true = 구현됨, false/undefined = 미구현
const DEFAULT_TOOLS = [
  // 프리미엄 도구 (서버 고연산 - 로컬 GPU/CPU 집약 처리) - 가장 상위에 표시
  { id: 'youtube-text', name: 'YouTube Text 추출', icon: '', categoryId: 'premium', sortOrder: 1, isPremium: true, isImplemented: true, path: '/tools/media/youtube-text', description: '로컬 Whisper AI로 유튜브 영상 텍스트 추출 (GPU 가속)' },
  { id: 'pdf-ocr', name: 'PDF OCR', icon: '', categoryId: 'premium', sortOrder: 2, isPremium: true, isImplemented: true, path: '/tools/document/pdf-ocr', description: '광학 문자 인식 (Tesseract OCR)' },
  { id: 'video-compress', name: '비디오 압축', icon: '', categoryId: 'premium', sortOrder: 3, isPremium: true, isImplemented: true, path: '/tools/media/video-compress', description: 'FFmpeg 비디오 인코딩 압축' },
  { id: 'audio-noise-remove', name: '오디오 노이즈 제거', icon: '', categoryId: 'premium', sortOrder: 4, isPremium: true, isImplemented: true, path: '/tools/media/audio-noise-remove', description: 'AI 오디오 노이즈 제거' },
  { id: 'video-convert', name: '비디오 변환', icon: '', categoryId: 'premium', sortOrder: 5, isPremium: true, isImplemented: true, path: '/tools/media/video-convert', description: 'FFmpeg 비디오 포맷 변환' },
  { id: 'video-merge', name: '비디오 병합', icon: '', categoryId: 'premium', sortOrder: 6, isPremium: true, isImplemented: true, path: '/tools/media/video-merge', description: 'FFmpeg 비디오 병합' },

  // 1. 문서 변환 (11개) - Phase 24에서 7개 추가 구현
  { id: 'pdf-to-ppt', name: 'PDF → PPT', icon: '', categoryId: 'document', sortOrder: 1, isImplemented: true, path: '/tools/document/pdf-to-ppt' },
  { id: 'ppt-to-pdf', name: 'PPT → PDF', icon: '', categoryId: 'document', sortOrder: 2, isImplemented: true, path: '/tools/document/ppt-to-pdf' },
  { id: 'pdf-to-word', name: 'PDF → Word', icon: '', categoryId: 'document', sortOrder: 3, isImplemented: true, path: '/tools/document/pdf-to-word' },
  { id: 'word-to-pdf', name: 'Word → PDF', icon: '', categoryId: 'document', sortOrder: 4, isImplemented: true, path: '/tools/document/word-to-pdf' },
  { id: 'pdf-to-excel', name: 'PDF → Excel', icon: '', categoryId: 'document', sortOrder: 5, isImplemented: true, path: '/tools/document/pdf-to-excel' },
  { id: 'pdf-to-image', name: 'PDF → JPG/PNG', icon: '', categoryId: 'document', sortOrder: 6, isImplemented: true },
  { id: 'pdf-merge', name: 'PDF 병합', icon: '', categoryId: 'document', sortOrder: 7, isImplemented: true },
  { id: 'pdf-split', name: 'PDF 분할', icon: '', categoryId: 'document', sortOrder: 8, isImplemented: true },
  { id: 'pdf-compress', name: 'PDF 압축', icon: '', categoryId: 'document', sortOrder: 9, isImplemented: true, path: '/tools/document/pdf-compress' },
  // pdf-ocr → 프리미엄 카테고리로 이동됨
  { id: 'image-to-pdf', name: '이미지 → PDF', icon: '', categoryId: 'document', sortOrder: 10, isImplemented: true },

  // 2. 이미지 도구 (17개)
  { id: 'image-compress', name: '이미지 압축', icon: '', categoryId: 'image', sortOrder: 1, isImplemented: true, path: '/tools/image/compress' },
  { id: 'image-resize', name: '이미지 리사이즈', icon: '', categoryId: 'image', sortOrder: 2, isImplemented: true, path: '/tools/image/resize' },
  { id: 'image-convert', name: '포맷 변환', icon: '', categoryId: 'image', sortOrder: 3, isImplemented: true, path: '/tools/image/convert' },
  { id: 'image-grayscale', name: '흑백 변환', icon: '', categoryId: 'image', sortOrder: 4, isImplemented: true, path: '/tools/image/grayscale' },
  { id: 'image-to-base64', name: '이미지 → Base64', icon: '', categoryId: 'image', sortOrder: 5, isImplemented: true, path: '/tools/image/to-base64' },
  { id: 'image-crop', name: '이미지 자르기', icon: '', categoryId: 'image', sortOrder: 6, isImplemented: true, path: '/tools/image/crop' },
  { id: 'image-rotate', name: '이미지 회전', icon: '', categoryId: 'image', sortOrder: 7, isImplemented: true, path: '/tools/image/rotate' },
  { id: 'image-flip', name: '이미지 뒤집기', icon: '↔', categoryId: 'image', sortOrder: 8, isImplemented: true, path: '/tools/image/flip' },
  { id: 'gif-maker', name: 'GIF 생성', icon: '', categoryId: 'image', sortOrder: 9, isImplemented: true },
  { id: 'watermark', name: '워터마크 추가', icon: '', categoryId: 'image', sortOrder: 10, isImplemented: true },
  { id: 'favicon-generator', name: '파비콘 생성', icon: '', categoryId: 'image', sortOrder: 11, isImplemented: true, path: '/tools/image/favicon' },
  { id: 'resize-advanced', name: '고급 리사이즈', icon: '', categoryId: 'image', sortOrder: 12, isImplemented: true, path: '/tools/image/resize-advanced' },
  { id: 'convert-advanced', name: '고급 포맷 변환', icon: '', categoryId: 'image', sortOrder: 13, isImplemented: true, path: '/tools/image/convert-advanced' },
  { id: 'crop-advanced', name: '고급 자르기', icon: '', categoryId: 'image', sortOrder: 14, isImplemented: true, path: '/tools/image/crop-advanced' },
  { id: 'rotate-advanced', name: '고급 회전', icon: '', categoryId: 'image', sortOrder: 15, isImplemented: true, path: '/tools/image/rotate-advanced' },
  { id: 'flip-advanced', name: '고급 뒤집기', icon: '↔', categoryId: 'image', sortOrder: 16, isImplemented: true, path: '/tools/image/flip-advanced' },
  { id: 'favicon-advanced', name: '고급 파비콘 생성', icon: '', categoryId: 'image', sortOrder: 17, isImplemented: true, path: '/tools/image/favicon-advanced' },

  // 3. 비디오/오디오 (4개) - 고연산 도구는 프리미엄 카테고리로 이동
  // 프리미엄 이동: youtube-text, video-compress, video-convert, video-merge, audio-noise-remove
  { id: 'youtube-to-mp3', name: 'YouTube → MP3', icon: '', categoryId: 'media', sortOrder: 1, isImplemented: true, path: '/tools/media/youtube-to-mp3' },
  { id: 'youtube-to-mp4', name: 'YouTube → MP4', icon: '', categoryId: 'media', sortOrder: 2, isImplemented: true, path: '/tools/media/youtube-to-mp4' },
  { id: 'video-trim', name: '비디오 트리밍', icon: '', categoryId: 'media', sortOrder: 3, isImplemented: true, path: '/tools/media/video-trim' },
  { id: 'audio-convert', name: '오디오 변환', icon: '', categoryId: 'media', sortOrder: 4, isImplemented: true, path: '/tools/media/audio-convert' },
  { id: 'video-to-gif', name: '비디오 → GIF', icon: '', categoryId: 'media', sortOrder: 5, isImplemented: true, path: '/tools/media/video-to-gif' },

  // 4. 텍스트/글쓰기 (17개)
  { id: 'word-counter', name: '글자수 세기', icon: '', categoryId: 'text', sortOrder: 1, isImplemented: true },
  { id: 'grammar-check', name: '문법 검사', icon: '', categoryId: 'text', sortOrder: 2, isImplemented: true, isPremium: true, path: '/tools/text/grammar-check' },
  { id: 'plagiarism-check', name: '표절 검사', icon: '', categoryId: 'text', sortOrder: 3, isImplemented: true, isPremium: true, path: '/tools/text/plagiarism-check' },
  { id: 'ai-detect', name: 'AI 탐지', icon: '', categoryId: 'text', sortOrder: 4, isImplemented: true, isPremium: true, path: '/tools/text/ai-detect' },
  { id: 'paraphrase', name: '패러프레이징', icon: '', categoryId: 'text', sortOrder: 5, isImplemented: true, isPremium: true, path: '/tools/text/paraphrase' },
  { id: 'summarize', name: '요약 도구', icon: '', categoryId: 'text', sortOrder: 6, isImplemented: true, isPremium: true, path: '/tools/text/summarize' },
  { id: 'citation-gen', name: '인용 생성기', icon: '', categoryId: 'text', sortOrder: 7, isImplemented: true, path: '/tools/text/citation-gen' },
  { id: 'spell-check', name: '맞춤법 검사', icon: '', categoryId: 'text', sortOrder: 8, isImplemented: true, path: '/tools/text/spell-check' },
  { id: 'keyword-density', name: '키워드 밀도 분석', icon: '', categoryId: 'text', sortOrder: 9, isImplemented: true, path: '/tools/text/keyword-density' },
  { id: 'case-converter', name: '대소문자 변환', icon: '', categoryId: 'text', sortOrder: 10, isImplemented: true },
  { id: 'lorem-ipsum', name: 'Lorem Ipsum 생성', icon: '', categoryId: 'text', sortOrder: 11, isImplemented: true },
  { id: 'text-diff', name: '텍스트 비교', icon: '', categoryId: 'text', sortOrder: 12, isImplemented: true, path: '/tools/text-processing/text-diff' },
  { id: 'text-sort', name: '텍스트 정렬', icon: '', categoryId: 'text', sortOrder: 13, isImplemented: true, path: '/tools/text-processing/text-sort' },
  { id: 'duplicate-remover', name: '중복 제거', icon: '', categoryId: 'text', sortOrder: 14, isImplemented: true, path: '/tools/text-processing/duplicate-remover' },
  { id: 'line-number', name: '행 번호 추가', icon: '', categoryId: 'text', sortOrder: 15, isImplemented: true, path: '/tools/text-processing/line-number' },
  { id: 'text-reverse', name: '텍스트 역순', icon: '↩', categoryId: 'text', sortOrder: 16, isImplemented: true, path: '/tools/text-processing/text-reverse' },
  { id: 'markdown-preview', name: 'Markdown 미리보기', icon: '', categoryId: 'text', sortOrder: 17, isImplemented: true, path: '/tools/text/markdown-preview' },

  // 5. 개발자 도구 (17개)
  { id: 'json-formatter', name: 'JSON 포맷터', icon: '{ }', categoryId: 'developer', sortOrder: 1, isImplemented: true },
  { id: 'json-to-yaml', name: 'JSON ↔ YAML', icon: '', categoryId: 'developer', sortOrder: 2 },
  { id: 'json-to-csv', name: 'JSON ↔ CSV', icon: '', categoryId: 'developer', sortOrder: 3 },
  { id: 'json-to-xml', name: 'JSON ↔ XML', icon: '', categoryId: 'developer', sortOrder: 4 },
  { id: 'base64-encode', name: 'Base64 인코딩', icon: '', categoryId: 'developer', sortOrder: 5, isImplemented: true, path: '/tools/developer/base64-encoder' },
  { id: 'url-encode', name: 'URL 인코딩', icon: '', categoryId: 'developer', sortOrder: 6, isImplemented: true },
  { id: 'html-minify', name: 'HTML 압축', icon: '', categoryId: 'developer', sortOrder: 7, isImplemented: true },
  { id: 'css-minify', name: 'CSS 압축', icon: '', categoryId: 'developer', sortOrder: 8, isImplemented: true },
  { id: 'js-minify', name: 'JS 압축', icon: '', categoryId: 'developer', sortOrder: 9, isImplemented: true },
  { id: 'regex-tester', name: '정규식 테스터', icon: '', categoryId: 'developer', sortOrder: 10, isImplemented: true },
  { id: 'uuid-generator', name: 'UUID 생성', icon: '🆔', categoryId: 'developer', sortOrder: 11, isImplemented: true },
  { id: 'hash-generator', name: '해시 생성', icon: '#', categoryId: 'developer', sortOrder: 12, isImplemented: true },
  { id: 'timestamp-converter', name: '타임스탬프 변환', icon: '', categoryId: 'developer', sortOrder: 13, isImplemented: true },
  { id: 'color-converter', name: '색상 코드 변환', icon: '', categoryId: 'developer', sortOrder: 14, isImplemented: true },
  { id: 'cron-parser', name: 'Cron 표현식 파서', icon: '', categoryId: 'developer', sortOrder: 15, isImplemented: true },
  { id: 'jwt-decoder', name: 'JWT 디코더', icon: '', categoryId: 'developer', sortOrder: 16, isImplemented: true },
  { id: 'diff-checker', name: '코드 비교', icon: '', categoryId: 'developer', sortOrder: 17 },
  { id: 'url-encoder', name: 'URL 인코더/디코더', icon: '', categoryId: 'developer', sortOrder: 18, isImplemented: true, path: '/tools/developer/url-encoder' },

  // 6. 데이터 변환 (9개)
  { id: 'csv-to-json', name: 'CSV → JSON', icon: '', categoryId: 'data-convert', sortOrder: 1, isImplemented: true, path: '/tools/data-converter/csv-to-json' },
  { id: 'excel-to-json', name: 'Excel → JSON', icon: '', categoryId: 'data-convert', sortOrder: 2, path: '/tools/data-converter/excel-to-json' },
  { id: 'xml-to-json', name: 'XML → JSON', icon: '', categoryId: 'data-convert', sortOrder: 3, isImplemented: true, path: '/tools/data-converter/xml-to-json' },
  { id: 'yaml-to-json', name: 'YAML ↔ JSON', icon: '', categoryId: 'data-convert', sortOrder: 4, isImplemented: true, path: '/tools/data-converter/yaml-to-json' },
  { id: 'json-to-csv', name: 'JSON → CSV', icon: '', categoryId: 'data-convert', sortOrder: 5, isImplemented: true, path: '/tools/data-converter/json-to-csv' },
  { id: 'markdown-to-html', name: 'Markdown → HTML', icon: '', categoryId: 'data-convert', sortOrder: 6, isImplemented: true, path: '/tools/data-converter/markdown-to-html' },
  { id: 'html-to-markdown', name: 'HTML → Markdown', icon: '', categoryId: 'data-convert', sortOrder: 7, isImplemented: true, path: '/tools/data-converter/html-to-markdown' },
  { id: 'text-to-binary', name: '텍스트 → 바이너리', icon: '0', categoryId: 'data-convert', sortOrder: 8, path: '/tools/data-converter/text-to-binary' },
  { id: 'text-to-hex', name: '텍스트 → HEX', icon: '', categoryId: 'data-convert', sortOrder: 9, path: '/tools/data-converter/text-to-hex' },

  // 7. QR 코드 (7개)
  { id: 'qr-generate', name: 'QR 코드 생성', icon: '', categoryId: 'qr', sortOrder: 1, isImplemented: true, path: '/tools/qr-seo/qr-generator' },
  { id: 'qr-reader', name: 'QR 코드 읽기', icon: '', categoryId: 'qr', sortOrder: 2, isImplemented: true, path: '/tools/qr-seo/qr-reader' },
  { id: 'qr-custom', name: '맞춤형 QR (로고)', icon: '', categoryId: 'qr', sortOrder: 3, isImplemented: true, path: '/tools/qr-seo/qr-custom' },
  { id: 'qr-wifi', name: 'WiFi QR 코드', icon: '', categoryId: 'qr', sortOrder: 4, isImplemented: true, path: '/tools/qr-seo/qr-wifi' },
  { id: 'qr-vcard', name: 'vCard QR 코드', icon: '', categoryId: 'qr', sortOrder: 5, isImplemented: true, path: '/tools/qr-seo/qr-vcard' },
  { id: 'barcode-generate', name: '바코드 생성', icon: '', categoryId: 'qr', sortOrder: 6, isImplemented: true, path: '/tools/qr-seo/barcode-generate' },
  { id: 'barcode-reader', name: '바코드 읽기', icon: '', categoryId: 'qr', sortOrder: 7, isImplemented: true, path: '/tools/qr-seo/barcode-reader' },

  // 8. SEO 도구 (12개)
  { id: 'meta-tag-gen', name: '메타 태그 생성', icon: '', categoryId: 'seo', sortOrder: 1, isImplemented: true, path: '/tools/seo/og-tag-gen' },
  { id: 'og-tag-gen', name: 'OG 태그 생성', icon: '', categoryId: 'seo', sortOrder: 2, isImplemented: true, path: '/tools/seo/og-tag-gen' },
  { id: 'sitemap-gen', name: '사이트맵 생성', icon: '', categoryId: 'seo', sortOrder: 3, isImplemented: true, path: '/tools/qr-seo/sitemap-generator' },
  { id: 'robots-txt-gen', name: 'robots.txt 생성', icon: '', categoryId: 'seo', sortOrder: 4, isImplemented: true, path: '/tools/seo/robots-txt-gen' },
  { id: 'keyword-research', name: '키워드 리서치', icon: '', categoryId: 'seo', sortOrder: 5, isImplemented: true, path: '/tools/seo/keyword-research' },
  { id: 'backlink-checker', name: '백링크 체커', icon: '', categoryId: 'seo', sortOrder: 6, isImplemented: true, path: '/tools/seo/backlink-checker' },
  { id: 'domain-checker', name: '도메인 권한 체크', icon: '', categoryId: 'seo', sortOrder: 7, isImplemented: true, path: '/tools/seo/domain-checker' },
  { id: 'page-speed', name: '페이지 속도 분석', icon: '', categoryId: 'seo', sortOrder: 8, isImplemented: true, path: '/tools/seo/page-speed' },
  { id: 'ssl-checker', name: 'SSL 인증서 체크', icon: '', categoryId: 'seo', sortOrder: 9, isImplemented: true, path: '/tools/seo/ssl-checker' },
  { id: 'schema-gen', name: 'Schema 마크업 생성', icon: '', categoryId: 'seo', sortOrder: 10, isImplemented: true, path: '/tools/seo/schema-gen' },
  { id: 'title-optimizer', name: '제목 최적화', icon: '', categoryId: 'seo', sortOrder: 11, isImplemented: true, path: '/tools/seo/title-optimizer' },
  { id: 'meta-preview', name: '검색 결과 미리보기', icon: '', categoryId: 'seo', sortOrder: 12, isImplemented: true, path: '/tools/seo/meta-preview' },

  // 9. 계산기 (13개)
  { id: 'percentage-calc', name: '퍼센트 계산기', icon: '%', categoryId: 'calculator', sortOrder: 1, isImplemented: true },
  { id: 'age-calc', name: '나이 계산기', icon: '', categoryId: 'calculator', sortOrder: 2, isImplemented: true },
  { id: 'bmi-calc', name: 'BMI 계산기', icon: '', categoryId: 'calculator', sortOrder: 3, isImplemented: true },
  { id: 'loan-calc', name: '대출 이자 계산기', icon: '', categoryId: 'calculator', sortOrder: 4, isImplemented: true },
  { id: 'compound-interest', name: '복리 계산기', icon: '', categoryId: 'calculator', sortOrder: 5, isImplemented: true },
  { id: 'unit-converter', name: '단위 변환기', icon: '', categoryId: 'calculator', sortOrder: 6, isImplemented: true },
  { id: 'currency-converter', name: '환율 계산기', icon: '', categoryId: 'calculator', sortOrder: 7 },
  { id: 'date-diff-calc', name: '날짜 차이 계산', icon: '', categoryId: 'calculator', sortOrder: 8, isImplemented: true, path: '/tools/calculator/date-diff' },
  { id: 'time-zone', name: '시간대 변환', icon: '', categoryId: 'calculator', sortOrder: 9, isImplemented: true },
  { id: 'tip-calc', name: '팁 계산기', icon: '', categoryId: 'calculator', sortOrder: 10, isImplemented: true },
  { id: 'gpa-calc', name: '학점 계산기', icon: '', categoryId: 'calculator', sortOrder: 11 },
  { id: 'calorie-calc', name: '칼로리 계산기', icon: '', categoryId: 'calculator', sortOrder: 12 },
  { id: 'scientific-calc', name: '공학용 계산기', icon: '', categoryId: 'calculator', sortOrder: 13 },

  // 10. 디자인 도구 (12개)
  { id: 'color-palette', name: '색상 팔레트 생성', icon: '', categoryId: 'design', sortOrder: 1, isImplemented: true },
  { id: 'gradient-gen', name: '그라디언트 생성', icon: '', categoryId: 'design', sortOrder: 2, isImplemented: true, path: '/tools/design/gradient-generator' },
  { id: 'color-picker', name: '색상 추출기', icon: '', categoryId: 'design', sortOrder: 3 },
  { id: 'font-pairing', name: '폰트 조합', icon: '', categoryId: 'design', sortOrder: 4 },
  { id: 'box-shadow-gen', name: 'Box Shadow 생성', icon: '', categoryId: 'design', sortOrder: 5, isImplemented: true },
  { id: 'border-radius-gen', name: 'Border Radius 생성', icon: '◐', categoryId: 'design', sortOrder: 6, isImplemented: true, path: '/tools/design/border-radius' },
  { id: 'glassmorphism-gen', name: 'Glassmorphism 생성', icon: '', categoryId: 'design', sortOrder: 7 },
  { id: 'neumorphism-gen', name: 'Neumorphism 생성', icon: '', categoryId: 'design', sortOrder: 8 },
  { id: 'svg-editor', name: 'SVG 편집기', icon: '', categoryId: 'design', sortOrder: 9 },
  { id: 'icon-library', name: '아이콘 라이브러리', icon: '', categoryId: 'design', sortOrder: 10 },
  { id: 'mockup-gen', name: '목업 생성기', icon: '', categoryId: 'design', sortOrder: 11 },
  { id: 'pattern-gen', name: '패턴 생성기', icon: '', categoryId: 'design', sortOrder: 12 },

  // 11. 비즈니스 (8개)
  { id: 'invoice-gen', name: '인보이스 생성', icon: '', categoryId: 'business', sortOrder: 1, isImplemented: true, path: '/tools/business/invoice-gen' },
  { id: 'resume-builder', name: '이력서 빌더', icon: '', categoryId: 'business', sortOrder: 2, isImplemented: true, path: '/tools/business/resume-builder' },
  { id: 'email-signature', name: '이메일 서명 생성', icon: '', categoryId: 'business', sortOrder: 3, isImplemented: true, path: '/tools/business/email-signature' },
  { id: 'business-card', name: '명함 생성기', icon: '', categoryId: 'business', sortOrder: 4, isImplemented: true, path: '/tools/business/business-card' },
  { id: 'contract-template', name: '계약서 템플릿', icon: '', categoryId: 'business', sortOrder: 5, isImplemented: true, path: '/tools/business/contract-template' },
  { id: 'meeting-scheduler', name: '미팅 스케줄러', icon: '', categoryId: 'business', sortOrder: 6, isImplemented: true, path: '/tools/business/meeting-scheduler' },
  { id: 'expense-tracker', name: '지출 추적기', icon: '', categoryId: 'business', sortOrder: 7, isImplemented: true, path: '/tools/business/expense-tracker' },
  { id: 'project-timeline', name: '프로젝트 타임라인', icon: '', categoryId: 'business', sortOrder: 8, isImplemented: true, path: '/tools/business/project-timeline' },

  // 12. 보안 도구 (8개)
  { id: 'password-gen', name: '비밀번호 생성', icon: '', categoryId: 'security', sortOrder: 1, isImplemented: true, path: '/tools/security/password-generator' },
  { id: 'password-strength', name: '비밀번호 강도 체크', icon: '', categoryId: 'security', sortOrder: 2, isImplemented: true },
  { id: 'md5-hash', name: 'MD5 해시', icon: '#', categoryId: 'security', sortOrder: 3, isImplemented: true, path: '/tools/security/md5-hash' },
  { id: 'sha256-hash', name: 'SHA256 해시', icon: '#', categoryId: 'security', sortOrder: 4, isImplemented: true, path: '/tools/security/sha256-hash' },
  { id: 'encrypt-decrypt', name: '암호화/복호화', icon: '', categoryId: 'security', sortOrder: 5, isImplemented: true, path: '/tools/security/encrypt-decrypt' },
  { id: 'ssl-gen', name: 'SSL 인증서 생성', icon: '', categoryId: 'security', sortOrder: 6, isImplemented: true, path: '/tools/security/ssl-gen' },
  { id: '2fa-gen', name: '2FA 코드 생성', icon: '', categoryId: 'security', sortOrder: 7, isImplemented: true, path: '/tools/security/2fa-gen' },
  { id: 'privacy-policy-gen', name: '개인정보 처리방침 생성', icon: '', categoryId: 'security', sortOrder: 8, isImplemented: true, path: '/tools/security/privacy-policy-gen' },

  // 13. 네트워크 (10개) - Phase 25에서 전체 구현
  { id: 'ip-lookup', name: 'IP 조회', icon: '', categoryId: 'network', sortOrder: 1, isImplemented: true, path: '/tools/network/ip-lookup' },
  { id: 'whois-lookup', name: 'WHOIS 조회', icon: '', categoryId: 'network', sortOrder: 2, isImplemented: true, path: '/tools/network/whois-lookup' },
  { id: 'dns-lookup', name: 'DNS 조회', icon: '', categoryId: 'network', sortOrder: 3, isImplemented: true, path: '/tools/network/dns-lookup' },
  { id: 'ping-test', name: 'Ping 테스트', icon: '', categoryId: 'network', sortOrder: 4, isImplemented: true, path: '/tools/network/ping-test' },
  { id: 'port-scanner', name: '포트 스캐너', icon: '', categoryId: 'network', sortOrder: 5, isImplemented: true, path: '/tools/network/port-scanner' },
  { id: 'speed-test', name: '속도 테스트', icon: '', categoryId: 'network', sortOrder: 6, isImplemented: true, path: '/tools/network/speed-test' },
  { id: 'http-headers', name: 'HTTP 헤더 체크', icon: '', categoryId: 'network', sortOrder: 7, isImplemented: true, path: '/tools/network/http-headers' },
  { id: 'url-shortener', name: 'URL 단축기', icon: '', categoryId: 'network', sortOrder: 8, isImplemented: true, path: '/tools/network/url-shortener' },
  { id: 'url-expander', name: 'URL 확장기', icon: '', categoryId: 'network', sortOrder: 9, isImplemented: true, path: '/tools/network/url-expander' },
  { id: 'link-checker', name: '링크 체커', icon: '', categoryId: 'network', sortOrder: 10, isImplemented: true, path: '/tools/network/link-checker' },

  // 14. 소셜 미디어 (8개) - Phase 27에서 구현
  { id: 'hashtag-gen', name: '해시태그 생성', icon: '#', categoryId: 'social', sortOrder: 1, isImplemented: true, path: '/tools/social/hashtag-gen' },
  { id: 'caption-gen', name: '캡션 생성기', icon: '', categoryId: 'social', sortOrder: 2, isImplemented: true, path: '/tools/social/caption-gen' },
  { id: 'post-scheduler', name: '게시물 스케줄러', icon: '', categoryId: 'social', sortOrder: 3, isImplemented: true, path: '/tools/social/post-scheduler' },
  { id: 'bio-gen', name: '프로필 바이오 생성', icon: '', categoryId: 'social', sortOrder: 4, isImplemented: true, path: '/tools/social/bio-gen' },
  { id: 'thumbnail-maker', name: '썸네일 메이커', icon: '', categoryId: 'social', sortOrder: 5, isImplemented: true, path: '/tools/social/thumbnail-maker' },
  { id: 'story-template', name: '스토리 템플릿', icon: '', categoryId: 'social', sortOrder: 6, isImplemented: true, path: '/tools/social/story-template' },
  { id: 'engagement-calc', name: '인게이지먼트 계산', icon: '', categoryId: 'social', sortOrder: 7, isImplemented: true, path: '/tools/social/engagement-calc' },
  { id: 'username-checker', name: '사용자명 체크', icon: '', categoryId: 'social', sortOrder: 8, isImplemented: true, path: '/tools/social/username-checker' },

  // 15. AI 음성 (프리미엄) (7개) - Phase 30에서 구현
  { id: 'tts', name: 'Text-to-Speech', icon: '', categoryId: 'ai-voice', sortOrder: 1, isPremium: true, isImplemented: true, path: '/tools/ai-voice/tts' },
  { id: 'stt', name: 'Speech-to-Text', icon: '', categoryId: 'ai-voice', sortOrder: 2, isPremium: true, isImplemented: true, path: '/tools/ai-voice/stt' },
  { id: 'voice-clone', name: '음성 복제', icon: '', categoryId: 'ai-voice', sortOrder: 3, isPremium: true, isImplemented: true, path: '/tools/ai-voice/voice-clone' },
  { id: 'ai-voice-gen', name: 'AI 보이스 생성', icon: '', categoryId: 'ai-voice', sortOrder: 4, isPremium: true, isImplemented: true, path: '/tools/ai-voice/ai-voice-gen' },
  { id: 'audio-enhance', name: '오디오 향상', icon: '', categoryId: 'ai-voice', sortOrder: 5, isPremium: true, isImplemented: true, path: '/tools/ai-voice/audio-enhance' },
  { id: 'podcast-gen', name: '팟캐스트 생성', icon: '', categoryId: 'ai-voice', sortOrder: 6, isPremium: true, isImplemented: true, path: '/tools/ai-voice/podcast-gen' },
  { id: 'ai-music', name: 'AI 음악 생성', icon: '', categoryId: 'ai-voice', sortOrder: 7, isPremium: true, isImplemented: true, path: '/tools/ai-voice/ai-music' },

  // 16. AI 이미지 (프리미엄) (9개) - Phase 29에서 구현
  { id: 'ai-image-gen', name: 'AI 이미지 생성', icon: '', categoryId: 'ai-image', sortOrder: 1, isPremium: true, isImplemented: true, path: '/tools/ai-image/ai-image-gen' },
  { id: 'bg-remove', name: '배경 제거', icon: '', categoryId: 'ai-image', sortOrder: 2, isPremium: true, isImplemented: true, path: '/tools/ai-image/bg-remove' },
  { id: 'image-upscale', name: 'AI 업스케일러', icon: '', categoryId: 'ai-image', sortOrder: 3, isPremium: true, isImplemented: true, path: '/tools/ai-image/image-upscale' },
  { id: 'photo-enhance', name: '사진 향상', icon: '', categoryId: 'ai-image', sortOrder: 4, isPremium: true, isImplemented: true, path: '/tools/ai-image/photo-enhance' },
  { id: 'face-swap', name: '얼굴 교체', icon: '', categoryId: 'ai-image', sortOrder: 5, isPremium: true, isImplemented: true, path: '/tools/ai-image/face-swap' },
  { id: 'image-inpaint', name: 'AI 인페인팅', icon: '', categoryId: 'ai-image', sortOrder: 6, isPremium: true, isImplemented: true, path: '/tools/ai-image/image-inpaint' },
  { id: 'style-transfer', name: '스타일 변환', icon: '', categoryId: 'ai-image', sortOrder: 7, isPremium: true, isImplemented: true, path: '/tools/ai-image/style-transfer' },
  { id: 'watermark-remove', name: '워터마크 제거', icon: '', categoryId: 'ai-image', sortOrder: 8, isPremium: true, isImplemented: true, path: '/tools/ai-image/watermark-remove' },
  { id: 'object-remove', name: '객체 제거', icon: '', categoryId: 'ai-image', sortOrder: 9, isPremium: true, isImplemented: true, path: '/tools/ai-image/object-remove' },

  // 17. AI 텍스트 (프리미엄) (7개) - Phase 28에서 구현
  { id: 'ai-writer', name: 'AI 글쓰기', icon: '', categoryId: 'ai-text', sortOrder: 1, isPremium: true, isImplemented: true, path: '/tools/ai-text/ai-writer' },
  { id: 'ai-translator', name: 'AI 번역', icon: '', categoryId: 'ai-text', sortOrder: 2, isPremium: true, isImplemented: true, path: '/tools/ai-text/ai-translator' },
  { id: 'ai-summarizer', name: 'AI 요약', icon: '', categoryId: 'ai-text', sortOrder: 3, isPremium: true, isImplemented: true, path: '/tools/ai-text/ai-summarizer' },
  { id: 'ai-rewriter', name: 'AI 재작성', icon: '', categoryId: 'ai-text', sortOrder: 4, isPremium: true, isImplemented: true, path: '/tools/ai-text/ai-rewriter' },
  { id: 'ai-grammar', name: 'AI 문법 교정', icon: '', categoryId: 'ai-text', sortOrder: 5, isPremium: true, isImplemented: true, path: '/tools/ai-text/ai-grammar' },
  { id: 'ai-chat', name: 'AI 챗봇', icon: '', categoryId: 'ai-text', sortOrder: 6, isPremium: true, isImplemented: true, path: '/tools/ai-text/ai-chat' },
  { id: 'ai-code', name: 'AI 코드 생성', icon: '', categoryId: 'ai-text', sortOrder: 7, isPremium: true, isImplemented: true, path: '/tools/ai-text/ai-code' },

  // 18. 게임/랜덤 (10개) - Phase 31에서 구현
  { id: 'random-number', name: '랜덤 숫자 생성기', icon: '', categoryId: 'game', sortOrder: 1, isImplemented: true, path: '/tools/game/random-number' },
  { id: 'coin-flip', name: '동전 던지기', icon: '', categoryId: 'game', sortOrder: 2, isImplemented: true, path: '/tools/game/coin-flip' },
  { id: 'random-color', name: '랜덤 색상 생성기', icon: '', categoryId: 'game', sortOrder: 3, isImplemented: true, path: '/tools/game/random-color' },
  { id: 'dice-roller', name: '주사위 굴리기', icon: '', categoryId: 'game', sortOrder: 4, isImplemented: true, path: '/tools/game/dice-roller' },
  { id: 'random-name', name: '랜덤 이름 생성기', icon: '', categoryId: 'game', sortOrder: 5, isImplemented: true, path: '/tools/game/random-name' },
  { id: 'card-draw', name: '카드 뽑기', icon: '🃏', categoryId: 'game', sortOrder: 6, isImplemented: true, path: '/tools/game/card-draw' },
  { id: 'roulette-wheel', name: '룰렛 휠', icon: '', categoryId: 'game', sortOrder: 7, isImplemented: true, path: '/tools/game/roulette-wheel' },
  { id: 'team-picker', name: '팀 분배기', icon: '', categoryId: 'game', sortOrder: 8, isImplemented: true, path: '/tools/game/team-picker' },
  { id: 'bingo-generator', name: '빙고 생성기', icon: '', categoryId: 'game', sortOrder: 9, isImplemented: true, path: '/tools/game/bingo-generator' },
  { id: 'truth-or-dare', name: '진실 혹은 대담', icon: '', categoryId: 'game', sortOrder: 10, isImplemented: true, path: '/tools/game/truth-or-dare' },

  // 19. 교육 도구 (9개) - Phase 31에서 구현
  { id: 'stopwatch', name: '스톱워치', icon: '', categoryId: 'education', sortOrder: 1, isImplemented: true, path: '/tools/education/stopwatch' },
  { id: 'countdown-timer', name: '카운트다운 타이머', icon: '', categoryId: 'education', sortOrder: 2, isImplemented: true, path: '/tools/education/countdown-timer' },
  { id: 'pomodoro-timer', name: '포모도로 타이머', icon: '', categoryId: 'education', sortOrder: 3, isImplemented: true, path: '/tools/education/pomodoro-timer' },
  { id: 'study-timer', name: '스터디 타이머', icon: '', categoryId: 'education', sortOrder: 4, isImplemented: true, path: '/tools/education/study-timer' },
  { id: 'typing-test', name: '타자 연습', icon: '', categoryId: 'education', sortOrder: 5, isImplemented: true, path: '/tools/education/typing-test' },
  { id: 'reading-speed', name: '읽기 속도 테스트', icon: '', categoryId: 'education', sortOrder: 6, isImplemented: true, path: '/tools/education/reading-speed' },
  { id: 'flashcard-gen', name: '플래시카드 생성기', icon: '', categoryId: 'education', sortOrder: 7, isImplemented: true, path: '/tools/education/flashcard-gen' },
  { id: 'quiz-generator', name: '퀴즈 생성기', icon: '', categoryId: 'education', sortOrder: 8, isImplemented: true, path: '/tools/education/quiz-generator' },
  { id: 'note-taking', name: '노트 앱', icon: '', categoryId: 'education', sortOrder: 9, isImplemented: true, path: '/tools/education/note-taking' },

  // 20. 건강/웰니스 (9개) - Phase 32에서 구현
  { id: 'sleep-calculator', name: '수면 계산기', icon: '', categoryId: 'health', sortOrder: 1, isImplemented: true, path: '/tools/health/sleep-calculator' },
  { id: 'water-intake', name: '수분 섭취 계산기', icon: '', categoryId: 'health', sortOrder: 2, isImplemented: true, path: '/tools/health/water-intake' },
  { id: 'workout-timer', name: '운동 타이머', icon: '', categoryId: 'health', sortOrder: 3, isImplemented: true, path: '/tools/health/workout-timer' },
  { id: 'heart-rate-zone', name: '심박수 존 계산기', icon: '', categoryId: 'health', sortOrder: 4, isImplemented: true, path: '/tools/health/heart-rate-zone' },
  { id: 'body-fat-calc', name: '체지방률 계산기', icon: '', categoryId: 'health', sortOrder: 5, isImplemented: true, path: '/tools/health/body-fat-calc' },
  { id: 'ideal-weight', name: '이상 체중 계산기', icon: '', categoryId: 'health', sortOrder: 6, isImplemented: true, path: '/tools/health/ideal-weight' },
  { id: 'pregnancy-calc', name: '임신 주수 계산기', icon: '', categoryId: 'health', sortOrder: 7, isImplemented: true, path: '/tools/health/pregnancy-calc' },
  { id: 'macro-calculator', name: '매크로 계산기', icon: '', categoryId: 'health', sortOrder: 8, isImplemented: true, path: '/tools/health/macro-calculator' },
  { id: 'breathing-exercise', name: '호흡 운동', icon: '', categoryId: 'health', sortOrder: 9, isImplemented: true, path: '/tools/health/breathing-exercise' },

  // 21. 언어/번역 (9개) - Phase 32에서 구현
  { id: 'romanization', name: '한글 ↔ 로마자 변환', icon: '', categoryId: 'language', sortOrder: 1, isImplemented: true, path: '/tools/language/romanization' },
  { id: 'unicode-converter', name: '유니코드 변환기', icon: '', categoryId: 'language', sortOrder: 2, isImplemented: true, path: '/tools/language/unicode-converter' },
  { id: 'emoji-search', name: '이모지 검색기', icon: '', categoryId: 'language', sortOrder: 3, isImplemented: true, path: '/tools/language/emoji-search' },
  { id: 'kaomoji-library', name: '카오모지 라이브러리', icon: '(◕‿◕)', categoryId: 'language', sortOrder: 4, isImplemented: true, path: '/tools/language/kaomoji-library' },
  { id: 'text-to-emoji', name: '텍스트 → 이모지', icon: '', categoryId: 'language', sortOrder: 5, isImplemented: true, path: '/tools/language/text-to-emoji' },
  { id: 'phonetic-alphabet', name: '음성 알파벳', icon: '', categoryId: 'language', sortOrder: 6, isImplemented: true, path: '/tools/language/phonetic-alphabet' },
  { id: 'morse-code', name: '모스 부호 변환기', icon: '', categoryId: 'language', sortOrder: 7, isImplemented: true, path: '/tools/language/morse-code' },
  { id: 'pig-latin', name: '피그 라틴 변환기', icon: '', categoryId: 'language', sortOrder: 8, isImplemented: true, path: '/tools/language/pig-latin' },
  { id: 'braille-converter', name: '점자 변환기', icon: '⠃', categoryId: 'language', sortOrder: 9, isImplemented: true, path: '/tools/language/braille-converter' },

  // 22. 금융/부동산 (10개) - Phase 33에서 구현
  { id: 'mortgage-calc', name: '모기지 계산기', icon: '', categoryId: 'finance', sortOrder: 1, isImplemented: true, path: '/tools/finance/mortgage-calc' },
  { id: 'investment-roi', name: '투자 수익률 계산기', icon: '', categoryId: 'finance', sortOrder: 2, isImplemented: true, path: '/tools/finance/investment-roi' },
  { id: 'tax-calculator', name: '세금 계산기', icon: '', categoryId: 'finance', sortOrder: 3, isImplemented: true, path: '/tools/finance/tax-calculator' },
  { id: 'retirement-calc', name: '은퇴 계획 계산기', icon: '', categoryId: 'finance', sortOrder: 4, isImplemented: true, path: '/tools/finance/retirement-calc' },
  { id: 'rental-yield', name: '임대 수익률 계산기', icon: '', categoryId: 'finance', sortOrder: 5, isImplemented: true, path: '/tools/finance/rental-yield' },
  { id: 'salary-calc', name: '연봉 계산기', icon: '', categoryId: 'finance', sortOrder: 6, isImplemented: true, path: '/tools/finance/salary-calc' },
  { id: 'inflation-calc', name: '인플레이션 계산기', icon: '', categoryId: 'finance', sortOrder: 7, isImplemented: true, path: '/tools/finance/inflation-calc' },
  { id: 'lease-vs-buy', name: '리스 vs 구매 비교', icon: '', categoryId: 'finance', sortOrder: 8, isImplemented: true, path: '/tools/finance/lease-vs-buy' },
  { id: 'debt-payoff', name: '부채 상환 계산기', icon: '', categoryId: 'finance', sortOrder: 9, isImplemented: true, path: '/tools/finance/debt-payoff' },
  { id: 'stock-profit', name: '주식 수익 계산기', icon: '', categoryId: 'finance', sortOrder: 10, isImplemented: true, path: '/tools/finance/stock-profit' },

  // 보안 추가 도구 (6개) - Phase 33에서 구현
  { id: 'breach-checker', name: '유출 확인 도구', icon: '', categoryId: 'security', sortOrder: 9, isImplemented: true, path: '/tools/security/breach-checker' },
  { id: 'secure-note', name: '보안 노트', icon: '', categoryId: 'security', sortOrder: 10, isImplemented: true, path: '/tools/security/secure-note' },
  { id: 'file-hash-checker', name: '파일 해시 검증기', icon: '', categoryId: 'security', sortOrder: 11, isImplemented: true, path: '/tools/security/file-hash-checker' },
  { id: 'ssl-checker', name: 'SSL 인증서 확인', icon: '', categoryId: 'security', sortOrder: 12, isImplemented: true, path: '/tools/security/ssl-checker' },
  { id: 'dns-leak-test', name: 'DNS 누출 테스트', icon: '', categoryId: 'security', sortOrder: 13, isImplemented: true, path: '/tools/security/dns-leak-test' },
  { id: 'metadata-remover', name: '메타데이터 제거', icon: '', categoryId: 'security', sortOrder: 14, isImplemented: true, path: '/tools/security/metadata-remover' },

  // 소셜 미디어 추가 (5개) - Phase 34에서 구현
  { id: 'twitter-thread-gen', name: '트위터 스레드 생성기', icon: '', categoryId: 'social', sortOrder: 9, isImplemented: true, path: '/tools/social/twitter-thread-gen' },
  { id: 'link-in-bio', name: '링크 인 바이오', icon: '', categoryId: 'social', sortOrder: 10, isImplemented: true, path: '/tools/social/link-in-bio' },
  { id: 'social-image-resizer', name: '소셜 이미지 리사이저', icon: '', categoryId: 'social', sortOrder: 11, isImplemented: true, path: '/tools/social/social-image-resizer' },
  { id: 'best-time-post', name: '최적 포스팅 시간', icon: '', categoryId: 'social', sortOrder: 12, isImplemented: true, path: '/tools/social/best-time-post' },
  { id: 'follower-fake-checker', name: '팔로워 품질 체커', icon: '', categoryId: 'social', sortOrder: 13, isImplemented: true, path: '/tools/social/follower-fake-checker' },

  // 23. 마케팅/분석 (10개) - Phase 34에서 구현
  { id: 'marketing-keyword-research', name: '키워드 연구 도구', icon: '', categoryId: 'marketing', sortOrder: 1, isImplemented: true, path: '/tools/marketing/keyword-research' },
  { id: 'ad-copy-gen', name: '광고 문구 생성기', icon: '', categoryId: 'marketing', sortOrder: 2, isImplemented: true, path: '/tools/marketing/ad-copy-gen' },
  { id: 'ab-test-calc', name: 'A/B 테스트 계산기', icon: '', categoryId: 'marketing', sortOrder: 3, isImplemented: true, path: '/tools/marketing/ab-test-calc' },
  { id: 'utm-builder', name: 'UTM 빌더', icon: '', categoryId: 'marketing', sortOrder: 4, isImplemented: true, path: '/tools/marketing/utm-builder' },
  { id: 'marketing-roi-calc', name: '마케팅 ROI 계산기', icon: '', categoryId: 'marketing', sortOrder: 5, isImplemented: true, path: '/tools/marketing/roi-calculator' },
  { id: 'ctr-predictor', name: 'CTR 예측기', icon: '', categoryId: 'marketing', sortOrder: 6, isImplemented: true, path: '/tools/marketing/ctr-predictor' },
  { id: 'headline-analyzer', name: '헤드라인 분석기', icon: '', categoryId: 'marketing', sortOrder: 7, isImplemented: true, path: '/tools/marketing/headline-analyzer' },
  { id: 'email-subject-tester', name: '이메일 제목 테스터', icon: '', categoryId: 'marketing', sortOrder: 8, isImplemented: true, path: '/tools/marketing/email-subject-tester' },
  { id: 'competitor-analyzer', name: '경쟁사 분석 도구', icon: '', categoryId: 'marketing', sortOrder: 9, isImplemented: true, path: '/tools/marketing/competitor-analyzer' },
  { id: 'landing-page-scorer', name: '랜딩 페이지 점수', icon: '', categoryId: 'marketing', sortOrder: 10, isImplemented: true, path: '/tools/marketing/landing-page-scorer' },

  // 24. 생산성 (10개) - Phase 35에서 구현
  { id: 'meeting-timer', name: '회의 타이머', icon: '', categoryId: 'productivity', sortOrder: 1, isImplemented: true, path: '/tools/productivity/meeting-timer' },
  { id: 'agenda-maker', name: '회의 안건 생성기', icon: '', categoryId: 'productivity', sortOrder: 2, isImplemented: true, path: '/tools/productivity/agenda-maker' },
  { id: 'decision-matrix', name: '의사결정 매트릭스', icon: '', categoryId: 'productivity', sortOrder: 3, isImplemented: true, path: '/tools/productivity/decision-matrix' },
  { id: 'priority-matrix', name: '우선순위 매트릭스', icon: '', categoryId: 'productivity', sortOrder: 4, isImplemented: true, path: '/tools/productivity/priority-matrix' },
  { id: 'goal-tracker', name: '목표 추적기', icon: '', categoryId: 'productivity', sortOrder: 5, isImplemented: true, path: '/tools/productivity/goal-tracker' },
  { id: 'habit-tracker', name: '습관 추적기', icon: '', categoryId: 'productivity', sortOrder: 6, isImplemented: true, path: '/tools/productivity/habit-tracker' },
  { id: 'time-tracker', name: '시간 추적기', icon: '', categoryId: 'productivity', sortOrder: 7, isImplemented: true, path: '/tools/productivity/time-tracker' },
  { id: 'productivity-invoice-generator', name: '인보이스 생성기', icon: '', categoryId: 'productivity', sortOrder: 8, isImplemented: true, path: '/tools/productivity/invoice-generator' },
  { id: 'receipt-maker', name: '영수증 생성기', icon: '', categoryId: 'productivity', sortOrder: 9, isImplemented: true, path: '/tools/productivity/receipt-maker' },
  { id: 'productivity-expense-tracker', name: '지출 추적기', icon: '', categoryId: 'productivity', sortOrder: 10, isImplemented: true, path: '/tools/productivity/expense-tracker' },

  // 25. 법률/계약 (10개) - Phase 35에서 구현
  { id: 'nda-generator', name: 'NDA 생성기', icon: '', categoryId: 'legal', sortOrder: 1, isImplemented: true, path: '/tools/legal/nda-generator' },
  { id: 'tos-generator', name: '이용약관 생성기', icon: '', categoryId: 'legal', sortOrder: 2, isImplemented: true, path: '/tools/legal/tos-generator' },
  { id: 'contract-analyzer', name: '계약서 분석기', icon: '', categoryId: 'legal', sortOrder: 3, isImplemented: true, path: '/tools/legal/contract-analyzer' },
  { id: 'legal-calculator', name: '법률 계산기', icon: '', categoryId: 'legal', sortOrder: 4, isImplemented: true, path: '/tools/legal/legal-calculator' },
  { id: 'signature-maker', name: '전자서명 생성기', icon: '', categoryId: 'legal', sortOrder: 5, isImplemented: true, path: '/tools/legal/signature-maker' },
  { id: 'trademark-search', name: '상표 검색기', icon: '®', categoryId: 'legal', sortOrder: 6, isImplemented: true, path: '/tools/legal/trademark-search' },
  { id: 'copyright-notice', name: '저작권 고지 생성기', icon: '©', categoryId: 'legal', sortOrder: 7, isImplemented: true, path: '/tools/legal/copyright-notice' },
  { id: 'disclaimer-gen', name: '면책조항 생성기', icon: '', categoryId: 'legal', sortOrder: 8, isImplemented: true, path: '/tools/legal/disclaimer-gen' },
  { id: 'refund-policy', name: '환불 정책 생성기', icon: '', categoryId: 'legal', sortOrder: 9, isImplemented: true, path: '/tools/legal/refund-policy' },
  { id: 'cookie-policy', name: '쿠키 정책 생성기', icon: '', categoryId: 'legal', sortOrder: 10, isImplemented: true, path: '/tools/legal/cookie-policy' },

  // 26. 여행 (10개) - Phase 36에서 구현
  { id: 'flight-time-calc', name: '비행 시간 계산기', icon: '', categoryId: 'travel', sortOrder: 1, isImplemented: true, path: '/tools/travel/flight-time-calc' },
  { id: 'timezone-planner', name: '시간대 플래너', icon: '', categoryId: 'travel', sortOrder: 2, isImplemented: true, path: '/tools/travel/timezone-planner' },
  { id: 'travel-currency', name: '여행 환율 계산기', icon: '', categoryId: 'travel', sortOrder: 3, isImplemented: true, path: '/tools/travel/travel-currency' },
  { id: 'packing-list', name: '여행 짐 체크리스트', icon: '', categoryId: 'travel', sortOrder: 4, isImplemented: true, path: '/tools/travel/packing-list' },
  { id: 'itinerary-planner', name: '여행 일정 플래너', icon: '', categoryId: 'travel', sortOrder: 5, isImplemented: true, path: '/tools/travel/itinerary-planner' },
  { id: 'distance-calc', name: '거리 계산기', icon: '', categoryId: 'travel', sortOrder: 6, isImplemented: true, path: '/tools/travel/distance-calc' },
  { id: 'jet-lag-calc', name: '시차 적응 계산기', icon: '', categoryId: 'travel', sortOrder: 7, isImplemented: true, path: '/tools/travel/jet-lag-calc' },
  { id: 'travel-budget', name: '여행 예산 계산기', icon: '', categoryId: 'travel', sortOrder: 8, isImplemented: true, path: '/tools/travel/travel-budget' },
  { id: 'visa-checker', name: '비자 정보 확인', icon: '', categoryId: 'travel', sortOrder: 9, isImplemented: true, path: '/tools/travel/visa-checker' },
  { id: 'weather-packing', name: '날씨별 짐 추천', icon: '', categoryId: 'travel', sortOrder: 10, isImplemented: true, path: '/tools/travel/weather-packing' },

  // 27. 요리/레시피 (10개) - Phase 36에서 구현
  { id: 'recipe-scaler', name: '레시피 양 조절기', icon: '', categoryId: 'cooking', sortOrder: 1, isImplemented: true, path: '/tools/cooking/recipe-scaler' },
  { id: 'cooking-unit-converter', name: '요리 단위 변환기', icon: '', categoryId: 'cooking', sortOrder: 2, isImplemented: true, path: '/tools/cooking/cooking-unit-converter' },
  { id: 'multi-timer', name: '멀티 타이머', icon: '', categoryId: 'cooking', sortOrder: 3, isImplemented: true, path: '/tools/cooking/multi-timer' },
  { id: 'meal-planner', name: '식단 플래너', icon: '', categoryId: 'cooking', sortOrder: 4, isImplemented: true, path: '/tools/cooking/meal-planner' },
  { id: 'nutrition-calc', name: '영양소 계산기', icon: '', categoryId: 'cooking', sortOrder: 5, isImplemented: true, path: '/tools/cooking/nutrition-calc' },
  { id: 'substitution-finder', name: '재료 대체 검색', icon: '', categoryId: 'cooking', sortOrder: 6, isImplemented: true, path: '/tools/cooking/substitution-finder' },
  { id: 'temp-converter', name: '요리 온도 변환기', icon: '', categoryId: 'cooking', sortOrder: 7, isImplemented: true, path: '/tools/cooking/temp-converter' },
  { id: 'portion-calc', name: '1인분 계산기', icon: '', categoryId: 'cooking', sortOrder: 8, isImplemented: true, path: '/tools/cooking/portion-calc' },
  { id: 'grocery-list', name: '장보기 목록', icon: '', categoryId: 'cooking', sortOrder: 9, isImplemented: true, path: '/tools/cooking/grocery-list' },
  { id: 'recipe-cost-calc', name: '레시피 원가 계산기', icon: '', categoryId: 'cooking', sortOrder: 10, isImplemented: true, path: '/tools/cooking/recipe-cost-calc' },

  // 28. 펫/반려동물 (10개) - Phase 37에서 구현
  { id: 'pet-age-calc', name: '반려동물 나이 계산기', icon: '', categoryId: 'pet', sortOrder: 1, isImplemented: true, path: '/tools/pet/pet-age-calc' },
  { id: 'pet-food-calc', name: '사료 급여량 계산기', icon: '', categoryId: 'pet', sortOrder: 2, isImplemented: true, path: '/tools/pet/pet-food-calc' },
  { id: 'vaccination-tracker', name: '예방접종 추적기', icon: '', categoryId: 'pet', sortOrder: 3, isImplemented: true, path: '/tools/pet/vaccination-tracker' },
  { id: 'pet-weight-tracker', name: '체중 추적기', icon: '', categoryId: 'pet', sortOrder: 4, isImplemented: true, path: '/tools/pet/pet-weight-tracker' },
  { id: 'pet-expense-calc', name: '반려동물 비용 계산기', icon: '', categoryId: 'pet', sortOrder: 5, isImplemented: true, path: '/tools/pet/pet-expense-calc' },
  { id: 'breed-info', name: '품종 정보', icon: '', categoryId: 'pet', sortOrder: 6, isImplemented: true, path: '/tools/pet/breed-info' },
  { id: 'pet-name-gen', name: '이름 생성기', icon: '', categoryId: 'pet', sortOrder: 7, isImplemented: true, path: '/tools/pet/pet-name-gen' },
  { id: 'walk-tracker', name: '산책 추적기', icon: '', categoryId: 'pet', sortOrder: 8, isImplemented: true, path: '/tools/pet/walk-tracker' },
  { id: 'pet-bmi-calc', name: 'BCS 체형 계산기', icon: '', categoryId: 'pet', sortOrder: 9, isImplemented: true, path: '/tools/pet/pet-bmi-calc' },
  { id: 'medication-reminder', name: '투약 알림', icon: '', categoryId: 'pet', sortOrder: 10, isImplemented: true, path: '/tools/pet/medication-reminder' },

  // 29. DIY/홈 (10개) - Phase 37에서 구현
  { id: 'paint-calc', name: '페인트 계산기', icon: '', categoryId: 'diy', sortOrder: 1, isImplemented: true, path: '/tools/diy/paint-calc' },
  { id: 'tile-calc', name: '타일 계산기', icon: '', categoryId: 'diy', sortOrder: 2, isImplemented: true, path: '/tools/diy/tile-calc' },
  { id: 'wallpaper-calc', name: '벽지 계산기', icon: '', categoryId: 'diy', sortOrder: 3, isImplemented: true, path: '/tools/diy/wallpaper-calc' },
  { id: 'wood-calc', name: '목재 계산기', icon: '', categoryId: 'diy', sortOrder: 4, isImplemented: true, path: '/tools/diy/wood-calc' },
  { id: 'concrete-calc', name: '콘크리트 계산기', icon: '', categoryId: 'diy', sortOrder: 5, isImplemented: true, path: '/tools/diy/concrete-calc' },
  { id: 'room-area-calc', name: '방 면적 계산기', icon: '', categoryId: 'diy', sortOrder: 6, isImplemented: true, path: '/tools/diy/room-area-calc' },
  { id: 'furniture-planner', name: '가구 배치 도우미', icon: '', categoryId: 'diy', sortOrder: 7, isImplemented: true, path: '/tools/diy/furniture-planner' },
  { id: 'color-matcher', name: '색상 조합 도우미', icon: '', categoryId: 'diy', sortOrder: 8, isImplemented: true, path: '/tools/diy/color-matcher' },
  { id: 'measurement-converter', name: '단위 변환기', icon: '', categoryId: 'diy', sortOrder: 9, isImplemented: true, path: '/tools/diy/measurement-converter' },
  { id: 'project-cost-calc', name: '프로젝트 비용 계산기', icon: '', categoryId: 'diy', sortOrder: 10, isImplemented: true, path: '/tools/diy/project-cost-calc' },

  // 30. 유틸리티 (10개) - Phase 38에서 구현
  { id: 'clipboard-manager', name: '클립보드 관리자', icon: '', categoryId: 'utility', sortOrder: 1, isImplemented: true, path: '/tools/utility/clipboard-manager' },
  { id: 'note-pad', name: '간편 메모장', icon: '', categoryId: 'utility', sortOrder: 2, isImplemented: true, path: '/tools/utility/note-pad' },
  { id: 'checklist-maker', name: '체크리스트 생성기', icon: '', categoryId: 'utility', sortOrder: 3, isImplemented: true, path: '/tools/utility/checklist-maker' },
  { id: 'bookmark-manager', name: '북마크 관리자', icon: '', categoryId: 'utility', sortOrder: 4, isImplemented: true, path: '/tools/utility/bookmark-manager' },
  { id: 'countdown-event', name: '이벤트 카운트다운', icon: '', categoryId: 'utility', sortOrder: 5, isImplemented: true, path: '/tools/utility/countdown-event' },
  { id: 'world-clock', name: '세계 시계', icon: '', categoryId: 'utility', sortOrder: 6, isImplemented: true, path: '/tools/utility/world-clock' },
  { id: 'unit-price-calc', name: '단가 비교 계산기', icon: '', categoryId: 'utility', sortOrder: 7, isImplemented: true, path: '/tools/utility/unit-price-calc' },
  { id: 'split-bill', name: '더치페이 계산기', icon: '', categoryId: 'utility', sortOrder: 8, isImplemented: true, path: '/tools/utility/split-bill' },
  { id: 'random-picker', name: '랜덤 선택기', icon: '', categoryId: 'utility', sortOrder: 9, isImplemented: true, path: '/tools/utility/random-picker' },
  { id: 'screen-ruler', name: '화면 눈금자', icon: '', categoryId: 'utility', sortOrder: 10, isImplemented: true, path: '/tools/utility/screen-ruler' },

  // 31. 스포츠/피트니스 (10개) - Phase 38에서 구현
  { id: 'running-pace', name: '러닝 페이스 계산기', icon: '', categoryId: 'sports', sortOrder: 1, isImplemented: true, path: '/tools/sports/running-pace' },
  { id: 'sports-workout-timer', name: '운동 타이머', icon: '', categoryId: 'sports', sortOrder: 2, isImplemented: true, path: '/tools/sports/workout-timer' },
  { id: 'rep-counter', name: '세트/횟수 카운터', icon: '', categoryId: 'sports', sortOrder: 3, isImplemented: true, path: '/tools/sports/rep-counter' },
  { id: 'stretch-guide', name: '스트레칭 가이드', icon: '', categoryId: 'sports', sortOrder: 4, isImplemented: true, path: '/tools/sports/stretch-guide' },
  { id: 'sports-heart-rate-zone', name: '심박수 존 계산기', icon: '', categoryId: 'sports', sortOrder: 5, isImplemented: true, path: '/tools/sports/heart-rate-zone' },
  { id: 'steps-converter', name: '걸음 수 변환기', icon: '', categoryId: 'sports', sortOrder: 6, isImplemented: true, path: '/tools/sports/steps-converter' },
  { id: 'sports-score', name: '스포츠 점수판', icon: '', categoryId: 'sports', sortOrder: 7, isImplemented: true, path: '/tools/sports/sports-score' },
  { id: 'exercise-log', name: '운동 기록장', icon: '', categoryId: 'sports', sortOrder: 8, isImplemented: true, path: '/tools/sports/exercise-log' },
  { id: 'sports-water-intake', name: '수분 섭취 트래커', icon: '', categoryId: 'sports', sortOrder: 9, isImplemented: true, path: '/tools/sports/water-intake' },
  { id: 'rest-timer', name: '휴식 타이머', icon: '', categoryId: 'sports', sortOrder: 10, isImplemented: true, path: '/tools/sports/rest-timer' },

  // 32. 음악/악기 (10개) - Phase 39에서 구현
  { id: 'tuner', name: '악기 튜너', icon: '', categoryId: 'music', sortOrder: 1, isImplemented: true, path: '/tools/music/tuner' },
  { id: 'metronome', name: '메트로놈', icon: '', categoryId: 'music', sortOrder: 2, isImplemented: true, path: '/tools/music/metronome' },
  { id: 'chord-finder', name: '코드 파인더', icon: '', categoryId: 'music', sortOrder: 3, isImplemented: true, path: '/tools/music/chord-finder' },
  { id: 'bpm-tap', name: 'BPM 탭 측정기', icon: '', categoryId: 'music', sortOrder: 4, isImplemented: true, path: '/tools/music/bpm-tap' },
  { id: 'key-transpose', name: '키 변환기', icon: '', categoryId: 'music', sortOrder: 5, isImplemented: true, path: '/tools/music/key-transpose' },
  { id: 'interval-trainer', name: '음정 트레이너', icon: '', categoryId: 'music', sortOrder: 6, isImplemented: true, path: '/tools/music/interval-trainer' },
  { id: 'note-reader', name: '음표 읽기', icon: '', categoryId: 'music', sortOrder: 7, isImplemented: true, path: '/tools/music/note-reader' },
  { id: 'scale-ref', name: '스케일 레퍼런스', icon: '', categoryId: 'music', sortOrder: 8, isImplemented: true, path: '/tools/music/scale-ref' },
  { id: 'tempo-convert', name: '템포 변환기', icon: '', categoryId: 'music', sortOrder: 9, isImplemented: true, path: '/tools/music/tempo-convert' },
  { id: 'practice-timer', name: '연습 타이머', icon: '', categoryId: 'music', sortOrder: 10, isImplemented: true, path: '/tools/music/practice-timer' },

  // 33. 자동차/운전 (10개) - Phase 39에서 구현
  { id: 'fuel-calc', name: '연비 계산기', icon: '', categoryId: 'automotive', sortOrder: 1, isImplemented: true, path: '/tools/automotive/fuel-calc' },
  { id: 'mileage-log', name: '주행 기록장', icon: '', categoryId: 'automotive', sortOrder: 2, isImplemented: true, path: '/tools/automotive/mileage-log' },
  { id: 'tire-size', name: '타이어 사이즈 계산기', icon: '', categoryId: 'automotive', sortOrder: 3, isImplemented: true, path: '/tools/automotive/tire-size' },
  { id: 'oil-change', name: '엔진오일 교환 주기', icon: '', categoryId: 'automotive', sortOrder: 4, isImplemented: true, path: '/tools/automotive/oil-change' },
  { id: 'parking-timer', name: '주차 타이머', icon: '🅿', categoryId: 'automotive', sortOrder: 5, isImplemented: true, path: '/tools/automotive/parking-timer' },
  { id: 'car-loan', name: '자동차 할부 계산기', icon: '', categoryId: 'automotive', sortOrder: 6, isImplemented: true, path: '/tools/automotive/car-loan' },
  { id: 'trip-cost', name: '여행 비용 계산기', icon: '', categoryId: 'automotive', sortOrder: 7, isImplemented: true, path: '/tools/automotive/trip-cost' },
  { id: 'speed-convert', name: '속도 변환기', icon: '', categoryId: 'automotive', sortOrder: 8, isImplemented: true, path: '/tools/automotive/speed-convert' },
  { id: 'engine-cc', name: '배기량 계산기', icon: '', categoryId: 'automotive', sortOrder: 9, isImplemented: true, path: '/tools/automotive/engine-cc' },
  { id: 'car-value', name: '중고차 시세 계산기', icon: '', categoryId: 'automotive', sortOrder: 10, isImplemented: true, path: '/tools/automotive/car-value' },

  // 34. 부모/육아 (10개) - Phase 40에서 구현
  { id: 'due-date', name: '출산 예정일 계산기', icon: '', categoryId: 'parenting', sortOrder: 1, isImplemented: true, path: '/tools/parenting/due-date' },
  { id: 'baby-name', name: '아기 이름 생성기', icon: '', categoryId: 'parenting', sortOrder: 2, isImplemented: true, path: '/tools/parenting/baby-name' },
  { id: 'growth-chart', name: '성장 차트', icon: '', categoryId: 'parenting', sortOrder: 3, isImplemented: true, path: '/tools/parenting/growth-chart' },
  { id: 'feeding-log', name: '수유 기록', icon: '', categoryId: 'parenting', sortOrder: 4, isImplemented: true, path: '/tools/parenting/feeding-log' },
  { id: 'sleep-tracker', name: '수면 추적기', icon: '', categoryId: 'parenting', sortOrder: 5, isImplemented: true, path: '/tools/parenting/sleep-tracker' },
  { id: 'vaccine-schedule', name: '예방접종 스케줄', icon: '', categoryId: 'parenting', sortOrder: 6, isImplemented: true, path: '/tools/parenting/vaccine-schedule' },
  { id: 'milestone', name: '발달 이정표', icon: '', categoryId: 'parenting', sortOrder: 7, isImplemented: true, path: '/tools/parenting/milestone' },
  { id: 'diaper-calc', name: '기저귀 계산기', icon: '', categoryId: 'parenting', sortOrder: 8, isImplemented: true, path: '/tools/parenting/diaper-calc' },
  { id: 'baby-cost', name: '아기 비용 계산기', icon: '', categoryId: 'parenting', sortOrder: 9, isImplemented: true, path: '/tools/parenting/baby-cost' },
  { id: 'cry-decoder', name: '울음 해석기', icon: '', categoryId: 'parenting', sortOrder: 10, isImplemented: true, path: '/tools/parenting/cry-decoder' },

  // 35. 패션/뷰티 (10개) - Phase 40에서 구현
  { id: 'size-convert', name: '사이즈 변환기', icon: '', categoryId: 'fashion', sortOrder: 1, isImplemented: true, path: '/tools/fashion/size-convert' },
  { id: 'color-match', name: '컬러 매칭', icon: '', categoryId: 'fashion', sortOrder: 2, isImplemented: true, path: '/tools/fashion/color-match' },
  { id: 'outfit-planner', name: '코디 플래너', icon: '', categoryId: 'fashion', sortOrder: 3, isImplemented: true, path: '/tools/fashion/outfit-planner' },
  { id: 'skin-tone', name: '퍼스널 컬러', icon: '', categoryId: 'fashion', sortOrder: 4, isImplemented: true, path: '/tools/fashion/skin-tone' },
  { id: 'body-type', name: '체형 분석기', icon: '', categoryId: 'fashion', sortOrder: 5, isImplemented: true, path: '/tools/fashion/body-type' },
  { id: 'wardrobe-capsule', name: '캡슐 옷장', icon: '', categoryId: 'fashion', sortOrder: 6, isImplemented: true, path: '/tools/fashion/wardrobe-capsule' },
  { id: 'style-quiz', name: '스타일 퀴즈', icon: '', categoryId: 'fashion', sortOrder: 7, isImplemented: true, path: '/tools/fashion/style-quiz' },
  { id: 'fabric-care', name: '섬유 관리 가이드', icon: '', categoryId: 'fashion', sortOrder: 8, isImplemented: true, path: '/tools/fashion/fabric-care' },
  { id: 'accessory-match', name: '액세서리 매칭', icon: '', categoryId: 'fashion', sortOrder: 9, isImplemented: true, path: '/tools/fashion/accessory-match' },
  { id: 'trend-color', name: '트렌드 컬러', icon: '', categoryId: 'fashion', sortOrder: 10, isImplemented: true, path: '/tools/fashion/trend-color' },

  // 36. 학생/학업 (10개) - Phase 41에서 구현
  { id: 'gpa-calc', name: '학점 계산기', icon: '', categoryId: 'student', sortOrder: 1, isImplemented: true, path: '/tools/student/gpa-calc' },
  { id: 'study-timer', name: '공부 타이머', icon: '', categoryId: 'student', sortOrder: 2, isImplemented: true, path: '/tools/student/study-timer' },
  { id: 'exam-countdown', name: '시험 D-Day', icon: '', categoryId: 'student', sortOrder: 3, isImplemented: true, path: '/tools/student/exam-countdown' },
  { id: 'flashcard', name: '플래시카드', icon: '', categoryId: 'student', sortOrder: 4, isImplemented: true, path: '/tools/student/flashcard' },
  { id: 'schedule-maker', name: '시간표 생성기', icon: '', categoryId: 'student', sortOrder: 5, isImplemented: true, path: '/tools/student/schedule-maker' },
  { id: 'note-organizer', name: '노트 정리', icon: '', categoryId: 'student', sortOrder: 6, isImplemented: true, path: '/tools/student/note-organizer' },
  { id: 'assignment-tracker', name: '과제 관리', icon: '', categoryId: 'student', sortOrder: 7, isImplemented: true, path: '/tools/student/assignment-tracker' },
  { id: 'grade-predictor', name: '성적 예측기', icon: '', categoryId: 'student', sortOrder: 8, isImplemented: true, path: '/tools/student/grade-predictor' },
  { id: 'pomodoro', name: '뽀모도로 타이머', icon: '', categoryId: 'student', sortOrder: 9, isImplemented: true, path: '/tools/student/pomodoro' },
  { id: 'study-stats', name: '학습 통계', icon: '', categoryId: 'student', sortOrder: 10, isImplemented: true, path: '/tools/student/study-stats' },

  // 37. 환경/지속가능성 (10개) - Phase 41에서 구현
  { id: 'carbon-footprint', name: '탄소 발자국 계산기', icon: '', categoryId: 'eco', sortOrder: 1, isImplemented: true, path: '/tools/eco/carbon-footprint' },
  { id: 'recycle-guide', name: '재활용 가이드', icon: '', categoryId: 'eco', sortOrder: 2, isImplemented: true, path: '/tools/eco/recycle-guide' },
  { id: 'water-usage', name: '물 사용량 계산기', icon: '', categoryId: 'eco', sortOrder: 3, isImplemented: true, path: '/tools/eco/water-usage' },
  { id: 'energy-calc', name: '에너지 계산기', icon: '', categoryId: 'eco', sortOrder: 4, isImplemented: true, path: '/tools/eco/energy-calc' },
  { id: 'eco-tips', name: '친환경 팁', icon: '', categoryId: 'eco', sortOrder: 5, isImplemented: true, path: '/tools/eco/eco-tips' },
  { id: 'plastic-tracker', name: '플라스틱 추적기', icon: '', categoryId: 'eco', sortOrder: 6, isImplemented: true, path: '/tools/eco/plastic-tracker' },
  { id: 'tree-planting', name: '나무 심기 계산기', icon: '', categoryId: 'eco', sortOrder: 7, isImplemented: true, path: '/tools/eco/tree-planting' },
  { id: 'sustainable-shopping', name: '지속가능 쇼핑', icon: '', categoryId: 'eco', sortOrder: 8, isImplemented: true, path: '/tools/eco/sustainable-shopping' },
  { id: 'food-waste', name: '음식물 쓰레기 관리', icon: '', categoryId: 'eco', sortOrder: 9, isImplemented: true, path: '/tools/eco/food-waste' },
  { id: 'eco-challenge', name: '에코 챌린지', icon: '', categoryId: 'eco', sortOrder: 10, isImplemented: true, path: '/tools/eco/eco-challenge' },

  // 38. 데이터 시각화 (10개) - Phase 42에서 구현
  { id: 'bar-chart', name: '막대 차트', icon: '', categoryId: 'visualization', sortOrder: 1, isImplemented: true, path: '/tools/visualization/bar-chart' },
  { id: 'line-chart', name: '선형 차트', icon: '', categoryId: 'visualization', sortOrder: 2, isImplemented: true, path: '/tools/visualization/line-chart' },
  { id: 'pie-chart', name: '원형 차트', icon: '', categoryId: 'visualization', sortOrder: 3, isImplemented: true, path: '/tools/visualization/pie-chart' },
  { id: 'scatter-plot', name: '산점도', icon: '', categoryId: 'visualization', sortOrder: 4, isImplemented: true, path: '/tools/visualization/scatter-plot' },
  { id: 'area-chart', name: '영역 차트', icon: '', categoryId: 'visualization', sortOrder: 5, isImplemented: true, path: '/tools/visualization/area-chart' },
  { id: 'radar-chart', name: '레이더 차트', icon: '', categoryId: 'visualization', sortOrder: 6, isImplemented: true, path: '/tools/visualization/radar-chart' },
  { id: 'gantt-chart', name: '간트 차트', icon: '', categoryId: 'visualization', sortOrder: 7, isImplemented: true, path: '/tools/visualization/gantt-chart' },
  { id: 'treemap', name: '트리맵', icon: '', categoryId: 'visualization', sortOrder: 8, isImplemented: true, path: '/tools/visualization/treemap' },
  { id: 'heatmap', name: '히트맵', icon: '', categoryId: 'visualization', sortOrder: 9, isImplemented: true, path: '/tools/visualization/heatmap' },
  { id: 'word-cloud', name: '워드 클라우드', icon: '', categoryId: 'visualization', sortOrder: 10, isImplemented: true, path: '/tools/visualization/word-cloud' },

  // 39. 전자책/출판 (10개) - Phase 42에서 구현
  { id: 'epub-reader', name: 'EPUB 리더', icon: '', categoryId: 'ebook', sortOrder: 1, isImplemented: true, path: '/tools/ebook/epub-reader' },
  { id: 'ebook-creator', name: '전자책 제작기', icon: '', categoryId: 'ebook', sortOrder: 2, isImplemented: true, path: '/tools/ebook/ebook-creator' },
  { id: 'epub-validator', name: 'EPUB 검증기', icon: '', categoryId: 'ebook', sortOrder: 3, isImplemented: true, path: '/tools/ebook/epub-validator' },
  { id: 'book-outline', name: '책 목차 생성기', icon: '', categoryId: 'ebook', sortOrder: 4, isImplemented: true, path: '/tools/ebook/book-outline' },
  { id: 'chapter-splitter', name: '챕터 분리기', icon: '', categoryId: 'ebook', sortOrder: 5, isImplemented: true, path: '/tools/ebook/chapter-splitter' },
  { id: 'reading-time', name: '읽기 시간 계산기', icon: '', categoryId: 'ebook', sortOrder: 6, isImplemented: true, path: '/tools/ebook/reading-time' },
  { id: 'book-stats', name: '도서 통계', icon: '', categoryId: 'ebook', sortOrder: 7, isImplemented: true, path: '/tools/ebook/book-stats' },
  { id: 'isbn-lookup', name: 'ISBN 조회', icon: '', categoryId: 'ebook', sortOrder: 8, isImplemented: true, path: '/tools/ebook/isbn-lookup' },
  { id: 'ebook-citation-gen', name: '인용문 생성기', icon: '', categoryId: 'ebook', sortOrder: 9, isImplemented: true, path: '/tools/ebook/citation-gen' },
  { id: 'bibliography', name: '참고문헌 생성기', icon: '', categoryId: 'ebook', sortOrder: 10, isImplemented: true, path: '/tools/ebook/bibliography' }
];

/**
 * 도구 모델
 */
const Tool = {
  /**
   * 테이블 초기화
   */
  async initTable() {
    await db.run(`
      CREATE TABLE IF NOT EXISTS tools (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        icon TEXT NOT NULL DEFAULT '',
        description TEXT,
        category_id TEXT NOT NULL,
        path TEXT,
        sort_order INTEGER DEFAULT 0,
        is_premium INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        is_implemented INTEGER DEFAULT 0,
        phase INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES tool_categories(id)
      )
    `);

    // is_implemented 컬럼이 없으면 추가 (마이그레이션)
    try {
      await db.run('ALTER TABLE tools ADD COLUMN is_implemented INTEGER DEFAULT 0');
    } catch (e) {
      // 컬럼이 이미 존재하면 무시
    }

    // 인덱스 생성
    await db.run('CREATE INDEX IF NOT EXISTS idx_tools_category ON tools(category_id)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_tools_active ON tools(is_active)');

    console.log('[Tool] Table initialized');
  },

  /**
   * 기본 도구 데이터 삽입
   */
  async seedDefaultTools() {
    const existing = await db.get('SELECT COUNT(*) as count FROM tools');

    if (Number(existing.count) === 0) {
      await db.transaction(async (tx) => {
        for (const tool of DEFAULT_TOOLS) {
          await tx.run(`
            INSERT INTO tools (id, name, icon, category_id, path, sort_order, is_premium, is_active, is_implemented)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT DO NOTHING
          `, [
            tool.id,
            tool.name,
            tool.icon,
            tool.categoryId,
            tool.path || `/tools/${tool.categoryId}/${tool.id}`,
            tool.sortOrder || 0,
            tool.isPremium ? 1 : 0,
            tool.isActive !== false ? 1 : 0,
            tool.isImplemented ? 1 : 0
          ]);
        }
      });
      console.log(`[Tool] Seeded ${DEFAULT_TOOLS.length} default tools`);
    }
  },

  /**
   * 모든 도구 조회 (카테고리별 그룹화)
   */
  async getAllGroupedByCategory() {
    const tools = await db.all(`
      SELECT t.id, t.name, t.icon, t.description, t.category_id as "categoryId",
             t.path, t.sort_order as "sortOrder", t.is_premium as "isPremium",
             t.is_active as "isActive", t.is_implemented as "isImplemented", t.phase,
             c.name as "categoryName", c.icon as "categoryIcon", c.color as "categoryColor"
      FROM tools t
      JOIN tool_categories c ON t.category_id = c.id
      WHERE t.is_active = 1 AND c.is_active = 1
      ORDER BY c.sort_order ASC, t.is_premium DESC, t.sort_order ASC
    `);

    // 카테고리별 그룹화
    const grouped = {};
    for (const tool of tools) {
      if (!grouped[tool.categoryId]) {
        grouped[tool.categoryId] = {
          id: tool.categoryId,
          name: tool.categoryName,
          icon: tool.categoryIcon,
          color: tool.categoryColor,
          tools: []
        };
      }
      grouped[tool.categoryId].tools.push({
        id: tool.id,
        name: tool.name,
        icon: tool.icon,
        description: tool.description,
        path: tool.path,
        sortOrder: tool.sortOrder,
        isPremium: !!tool.isPremium,
        isImplemented: !!tool.isImplemented,
        phase: tool.phase
      });
    }

    return grouped;
  },

  /**
   * 카테고리별 도구 조회
   */
  async getByCategory(categoryId) {
    return await db.all(`
      SELECT id, name, icon, description, category_id as "categoryId",
             path, sort_order as "sortOrder", is_premium as "isPremium",
             is_active as "isActive", phase
      FROM tools
      WHERE category_id = ? AND is_active = 1
      ORDER BY sort_order ASC
    `, [categoryId]);
  },

  /**
   * 도구 ID로 조회
   */
  async getById(toolId) {
    return await db.get(`
      SELECT id, name, icon, description, category_id as "categoryId",
             path, sort_order as "sortOrder", is_premium as "isPremium",
             is_active as "isActive", phase, detailed_guide as "detailedGuide",
             polished_guide as "polishedGuide", faq
      FROM tools
      WHERE id = ?
    `, [toolId]);
  },

  /**
   * 도구 검색
   */
  async search(query) {
    const searchTerm = `%${query}%`;
    return await db.all(`
      SELECT t.id, t.name, t.icon, t.category_id as "categoryId",
             t.path, t.is_premium as "isPremium",
             c.name as "categoryName"
      FROM tools t
      JOIN tool_categories c ON t.category_id = c.id
      WHERE t.is_active = 1 AND (t.name LIKE ? OR c.name LIKE ?)
      ORDER BY t.name ASC
      LIMIT 20
    `, [searchTerm, searchTerm]);
  },

  /**
   * 도구 생성
   */
  async create(tool) {
    const result = await db.run(`
      INSERT INTO tools (id, name, icon, description, category_id, path, sort_order, is_premium, phase)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      tool.id,
      tool.name,
      tool.icon || '',
      tool.description || null,
      tool.categoryId,
      tool.path || `/tools/${tool.categoryId}/${tool.id}`,
      tool.sortOrder || 0,
      tool.isPremium ? 1 : 0,
      tool.phase || 1
    ]);
    return result.changes > 0 ? tool : null;
  },

  // ==========================================
  // 관리자용 메서드
  // ==========================================

  /**
   * 관리자용 도구 목록 조회 (필터링 지원)
   * @param {Object} options - { category, status, search }
   */
  async getAllForAdmin(options = {}) {
    let sql = `
      SELECT t.*,
             c.name as category_name,
             c.icon as category_icon,
             c.id as category_slug
      FROM tools t
      LEFT JOIN tool_categories c ON t.category_id = c.id
      WHERE 1=1
    `;
    const params = [];

    // 카테고리 필터
    if (options.category) {
      sql += ' AND c.id = ?';
      params.push(options.category);
    }

    // 상태 필터
    if (options.status === 'active') {
      sql += ' AND t.is_active = 1';
    } else if (options.status === 'inactive') {
      sql += ' AND t.is_active = 0';
    }

    // 검색 필터
    if (options.search) {
      sql += ' AND (t.name LIKE ? OR t.name_ko LIKE ? OR t.description LIKE ? OR t.description_ko LIKE ?)';
      const searchTerm = `%${options.search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    sql += ' ORDER BY c.sort_order, t.sort_order, t.name';

    return await db.all(sql, params);
  },

  /**
   * 도구 상태 변경
   */
  async updateStatus(toolId, isActive) {
    const result = await db.run(
      'UPDATE tools SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [isActive ? 1 : 0, toolId]
    );
    return result.changes > 0;
  },

  /**
   * 도구 순서 변경
   */
  async updateOrder(toolId, sortOrder) {
    const result = await db.run(
      'UPDATE tools SET sort_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [sortOrder, toolId]
    );
    return result.changes > 0;
  },

  /**
   * 도구 정보 수정
   */
  async update(toolId, updates) {
    const allowedFields = ['name', 'name_ko', 'description', 'description_ko', 'icon', 'path', 'sort_order', 'is_active'];
    const setClauses = [];
    const params = [];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        setClauses.push(`${key} = ?`);
        params.push(value);
      }
    }

    if (setClauses.length === 0) return false;

    setClauses.push('updated_at = CURRENT_TIMESTAMP');
    params.push(toolId);

    const sql = `UPDATE tools SET ${setClauses.join(', ')} WHERE id = ?`;
    const result = await db.run(sql, params);
    return result.changes > 0;
  },

  /**
   * 일괄 상태 변경
   */
  async bulkUpdateStatus(toolIds, isActive) {
    if (!Array.isArray(toolIds) || toolIds.length === 0) return false;

    const placeholders = toolIds.map(() => '?').join(',');
    const sql = `
      UPDATE tools SET is_active = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id IN (${placeholders})
    `;
    const result = await db.run(sql, [isActive ? 1 : 0, ...toolIds]);
    return result.changes > 0;
  },

  /**
   * 총 도구 개수
   */
  async getCount() {
    const result = await db.get('SELECT COUNT(*) as count FROM tools WHERE is_active = 1');
    return result.count;
  }
};

module.exports = Tool;