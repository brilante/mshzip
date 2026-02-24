/**
 * Tailwind CSS Helper Utilities
 * MyMind3 프로젝트
 *
 * JavaScript에서 Tailwind 클래스를 효율적으로 관리하기 위한 유틸리티 함수들
 *
 * Phase 7: element.style.* 직접 할당을 classList 조작으로 대체
 */

(function() {
  'use strict';

  /**
   * 요소의 클래스를 조건부로 토글
   * @param {HTMLElement} element - 대상 요소
   * @param {string} className - 토글할 클래스명
   * @param {boolean} [condition] - 조건 (true면 추가, false면 제거, 생략시 토글)
   * @returns {boolean} 클래스가 존재하는지 여부
   */
  function toggleClass(element, className, condition) {
    if (!element) return false;
    return element.classList.toggle(className, condition);
  }

  /**
   * 여러 클래스를 한 번에 추가
   * @param {HTMLElement} element - 대상 요소
   * @param {...string} classes - 추가할 클래스들
   */
  function addClasses(element) {
    if (!element) return;
    var classes = Array.prototype.slice.call(arguments, 1).filter(Boolean);
    element.classList.add.apply(element.classList, classes);
  }

  /**
   * 여러 클래스를 한 번에 제거
   * @param {HTMLElement} element - 대상 요소
   * @param {...string} classes - 제거할 클래스들
   */
  function removeClasses(element) {
    if (!element) return;
    var classes = Array.prototype.slice.call(arguments, 1).filter(Boolean);
    element.classList.remove.apply(element.classList, classes);
  }

  /**
   * 클래스 교체 (from -> to)
   * @param {HTMLElement} element - 대상 요소
   * @param {string} from - 제거할 클래스
   * @param {string} to - 추가할 클래스
   * @returns {boolean} 교체 성공 여부
   */
  function replaceClass(element, from, to) {
    if (!element) return false;
    if (element.classList.contains(from)) {
      element.classList.remove(from);
      element.classList.add(to);
      return true;
    }
    return false;
  }

  /**
   * CSS 변수 설정
   * @param {HTMLElement} element - 대상 요소
   * @param {string} name - 변수명 (--없이)
   * @param {string|number} value - 값
   */
  function setCSSVar(element, name, value) {
    if (!element) return;
    element.style.setProperty('--' + name, value);
  }

  /**
   * 여러 CSS 변수 한 번에 설정
   * @param {HTMLElement} element - 대상 요소
   * @param {Object} vars - { 변수명: 값 } 객체
   */
  function setCSSVars(element, vars) {
    if (!element || !vars) return;
    Object.keys(vars).forEach(function(name) {
      element.style.setProperty('--' + name, vars[name]);
    });
  }

  /**
   * CSS 변수 가져오기
   * @param {HTMLElement} element - 대상 요소
   * @param {string} name - 변수명 (--없이)
   * @returns {string} 변수 값
   */
  function getCSSVar(element, name) {
    if (!element) return '';
    return getComputedStyle(element).getPropertyValue('--' + name).trim();
  }

  // ============================================
  // 상태 관리 헬퍼
  // ============================================

  /**
   * 요소 표시/숨김 (display)
   * @param {HTMLElement} element - 대상 요소
   * @param {boolean} visible - 표시 여부
   */
  function setVisible(element, visible) {
    if (!element) return;
    toggleClass(element, 'hidden', !visible);
  }

  /**
   * 요소 표시 (flex로)
   * @param {HTMLElement} element - 대상 요소
   * @param {boolean} visible - 표시 여부
   */
  function setVisibleFlex(element, visible) {
    if (!element) return;
    if (visible) {
      removeClasses(element, 'hidden');
      addClasses(element, 'flex');
    } else {
      removeClasses(element, 'flex');
      addClasses(element, 'hidden');
    }
  }

  /**
   * 요소 활성화 상태
   * @param {HTMLElement} element - 대상 요소
   * @param {boolean} active - 활성화 여부
   */
  function setActive(element, active) {
    if (!element) return;
    element.dataset.state = active ? 'active' : 'inactive';
    toggleClass(element, 'active', active);
  }

  /**
   * 요소 비활성화 상태
   * @param {HTMLElement} element - 대상 요소
   * @param {boolean} disabled - 비활성화 여부
   */
  function setDisabled(element, disabled) {
    if (!element) return;
    toggleClass(element, 'disabled', disabled);
    toggleClass(element, 'opacity-50', disabled);
    toggleClass(element, 'pointer-events-none', disabled);
    if (element.disabled !== undefined) {
      element.disabled = disabled;
    }
  }

  /**
   * 로딩 상태
   * @param {HTMLElement} element - 대상 요소
   * @param {boolean} loading - 로딩 여부
   */
  function setLoading(element, loading) {
    if (!element) return;
    element.dataset.loading = loading ? 'true' : 'false';
    toggleClass(element, 'loading', loading);
    toggleClass(element, 'animate-pulse', loading);
  }

  /**
   * 선택 상태
   * @param {HTMLElement} element - 대상 요소
   * @param {boolean} selected - 선택 여부
   */
  function setSelected(element, selected) {
    if (!element) return;
    element.dataset.selected = selected ? 'true' : 'false';
    toggleClass(element, 'selected', selected);
    toggleClass(element, 'ring-2', selected);
    toggleClass(element, 'ring-blue-500', selected);
  }

  /**
   * 에러 상태
   * @param {HTMLElement} element - 대상 요소
   * @param {boolean} hasError - 에러 여부
   */
  function setError(element, hasError) {
    if (!element) return;
    element.dataset.error = hasError ? 'true' : 'false';
    toggleClass(element, 'error', hasError);
    toggleClass(element, 'border-red-500', hasError);
    toggleClass(element, 'text-red-500', hasError);
  }

  /**
   * 성공 상태
   * @param {HTMLElement} element - 대상 요소
   * @param {boolean} success - 성공 여부
   */
  function setSuccess(element, success) {
    if (!element) return;
    element.dataset.success = success ? 'true' : 'false';
    toggleClass(element, 'success', success);
    toggleClass(element, 'border-green-500', success);
    toggleClass(element, 'text-green-500', success);
  }

  // ============================================
  // 테마 관리 헬퍼
  // ============================================

  /**
   * 다크 모드 토글
   * @param {boolean} [isDark] - 다크 모드 여부 (생략시 토글)
   * @returns {boolean} 현재 다크 모드 상태
   */
  function toggleDarkMode(isDark) {
    var html = document.documentElement;

    if (isDark === undefined) {
      isDark = !html.classList.contains('dark');
    }

    html.classList.toggle('dark', isDark);
    html.dataset.theme = isDark ? 'dark' : 'light';

    return isDark;
  }

  /**
   * 현재 다크 모드 여부
   * @returns {boolean}
   */
  function isDarkMode() {
    return document.documentElement.classList.contains('dark') ||
           document.documentElement.dataset.theme === 'dark';
  }

  // ============================================
  // 애니메이션 헬퍼
  // ============================================

  /**
   * 페이드 인 애니메이션
   * @param {HTMLElement} element - 대상 요소
   * @param {number} [duration=300] - 지속 시간 (ms)
   */
  function fadeIn(element, duration) {
    if (!element) return;
    duration = duration || 300;

    removeClasses(element, 'hidden', 'opacity-0');
    addClasses(element, 'transition-opacity');
    element.style.transitionDuration = duration + 'ms';

    // Force reflow
    element.offsetHeight;

    addClasses(element, 'opacity-100');
  }

  /**
   * 페이드 아웃 애니메이션
   * @param {HTMLElement} element - 대상 요소
   * @param {number} [duration=300] - 지속 시간 (ms)
   * @returns {Promise} 애니메이션 완료 후 resolve
   */
  function fadeOut(element, duration) {
    if (!element) return Promise.resolve();
    duration = duration || 300;

    addClasses(element, 'transition-opacity');
    element.style.transitionDuration = duration + 'ms';

    removeClasses(element, 'opacity-100');
    addClasses(element, 'opacity-0');

    return new Promise(function(resolve) {
      setTimeout(function() {
        addClasses(element, 'hidden');
        resolve();
      }, duration);
    });
  }

  /**
   * 슬라이드 다운 애니메이션
   * @param {HTMLElement} element - 대상 요소
   * @param {number} [duration=300] - 지속 시간 (ms)
   */
  function slideDown(element, duration) {
    if (!element) return;
    duration = duration || 300;

    removeClasses(element, 'hidden');
    addClasses(element, 'animate-slide-down');
    element.style.animationDuration = duration + 'ms';
  }

  /**
   * 슬라이드 업 애니메이션
   * @param {HTMLElement} element - 대상 요소
   * @param {number} [duration=300] - 지속 시간 (ms)
   * @returns {Promise}
   */
  function slideUp(element, duration) {
    if (!element) return Promise.resolve();
    duration = duration || 300;

    addClasses(element, 'animate-slide-up');
    element.style.animationDuration = duration + 'ms';

    return new Promise(function(resolve) {
      setTimeout(function() {
        addClasses(element, 'hidden');
        removeClasses(element, 'animate-slide-up');
        resolve();
      }, duration);
    });
  }

  // ============================================
  // 노드 위치 헬퍼 (마인드맵 전용)
  // ============================================

  /**
   * 노드 위치 설정 (CSS 변수 사용)
   * @param {HTMLElement} node - 노드 요소
   * @param {number} x - X 좌표
   * @param {number} y - Y 좌표
   */
  function setNodePosition(node, x, y) {
    if (!node) return;
    setCSSVars(node, {
      'node-x': x + 'px',
      'node-y': y + 'px'
    });
  }

  /**
   * 노드 크기 설정
   * @param {HTMLElement} node - 노드 요소
   * @param {number} width - 너비
   * @param {number} [height] - 높이 (선택)
   */
  function setNodeSize(node, width, height) {
    if (!node) return;
    var vars = { 'node-w': width + 'px' };
    if (height !== undefined) {
      vars['node-h'] = height + 'px';
    }
    setCSSVars(node, vars);
  }

  // ============================================
  // 전역 내보내기
  // ============================================

  window.TailwindHelpers = {
    toggleClass: toggleClass,
    addClasses: addClasses,
    removeClasses: removeClasses,
    replaceClass: replaceClass,
    setCSSVar: setCSSVar,
    setCSSVars: setCSSVars,
    getCSSVar: getCSSVar,
    setVisible: setVisible,
    setVisibleFlex: setVisibleFlex,
    setActive: setActive,
    setDisabled: setDisabled,
    setLoading: setLoading,
    setSelected: setSelected,
    setError: setError,
    setSuccess: setSuccess,
    toggleDarkMode: toggleDarkMode,
    isDarkMode: isDarkMode,
    fadeIn: fadeIn,
    fadeOut: fadeOut,
    slideDown: slideDown,
    slideUp: slideUp,
    setNodePosition: setNodePosition,
    setNodeSize: setNodeSize
  };

  console.log('[TailwindHelpers] 유틸리티 로드 완료 (22개 함수)');
})();
