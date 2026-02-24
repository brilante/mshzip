# ESM 마이그레이션 가이드

> Phase 3.1: 프론트엔드 모듈화

## 개요

기존 전역 스크립트 방식에서 ESM (ECMAScript Modules) 방식으로 점진적 마이그레이션.

## 현재 진행 상태

| 모듈 | 상태 | 위치 |
|------|------|------|
| settings/ui.js | [완료] | `modules/settings/ui.js` |
| settings/auth.js | [완료] | `modules/settings/auth.js` |
| settings/core.js | [대기] | 예정 |
| settings/payment.js | [대기] | 예정 |
| settings/ai.js | [대기] | 예정 |
| core/api-client.js | [대기] | 예정 |

## 마이그레이션 패턴

### 1. 기존 전역 함수 → ESM 클래스

**Before (전역 함수):**
```javascript
// settings-core.js
function initSettings() {
  // ...
}
window.initSettings = initSettings;
```

**After (ESM 클래스):**
```javascript
// modules/settings/core.js
export class SettingsCore {
  static init() {
    // ...
  }
}
```

### 2. HTML 로드 방식 변경

**Before:**
```html
<script src="/js/settings-core.js"></script>
<script>
  document.addEventListener('DOMContentLoaded', initSettings);
</script>
```

**After:**
```html
<script type="module">
  import { SettingsCore } from '/js/modules/settings/index.js';
  document.addEventListener('DOMContentLoaded', () => {
    SettingsCore.init();
  });
</script>
```

### 3. 전역 호환성 유지 (과도기)

기존 코드와의 호환성을 위해 window에 노출:

```javascript
// modules/settings/compat.js
import { SettingsCore } from './core.js';

// 전역 호환성 (deprecated, 향후 제거 예정)
window.initSettings = () => SettingsCore.init();
```

## 폴더 구조

```
public/js/
├── modules/                    # ESM 모듈
│   ├── settings/
│   │   ├── index.js           # 메인 엔트리
│   │   ├── ui.js              # UI 유틸리티
│   │   ├── auth.js            # 인증
│   │   ├── core.js            # 코어 (예정)
│   │   ├── payment.js         # 결제 (예정)
│   │   └── ai.js              # AI 설정 (예정)
│   ├── ai/                    # AI 모듈 (완료)
│   ├── auth/                  # 인증 모듈 (완료)
│   ├── content/               # 콘텐츠 모듈 (완료)
│   ├── features/              # 기능 모듈 (완료)
│   └── ui/                    # UI 모듈 (완료)
├── settings-*.js              # 레거시 (점진적 마이그레이션)
└── core/                      # 코어 유틸리티 (점진적 마이그레이션)
```

## 마이그레이션 우선순위

1. **High**: settings-core.js → modules/settings/core.js
2. **High**: core/api-client.js → modules/core/api-client.js
3. **Medium**: settings-payment.js → modules/settings/payment.js
4. **Medium**: settings-ai.js → modules/settings/ai.js
5. **Low**: 나머지 settings-*.js 파일들

## 주의사항

1. **순환 참조 방지**: 모듈 간 import 시 순환 참조 주의
2. **전역 변수 의존**: `window.` 참조는 점진적으로 제거
3. **브라우저 호환성**: ESM은 IE 미지원 (IE는 이미 지원 중단)
4. **캐시 버스팅**: 모듈 경로에 버전 파라미터 추가 권장

## 테스트 방법

```javascript
// 브라우저 콘솔에서 테스트
import('/js/modules/settings/index.js').then(mod => {
  console.log('Loaded:', mod);
  mod.initSettings();
});
```
