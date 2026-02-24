/**
 * modals.js - 모달 다이얼로그 모듈
 *
 * 입력 모달과 확인 모달을 제공하는 UI 모듈
 * - showInputModal: 텍스트 입력을 받는 모달
 * - showConfirmModal: 확인/취소를 선택하는 모달
 *
 * @module ui/modals
 */

(function() {
  'use strict';

  /**
   * 다크 모드 여부 확인
   * @returns {boolean} 다크 모드 활성화 여부
   */
  function isDarkMode() {
    return document.documentElement.getAttribute('data-theme') === 'dark';
  }

  /**
   * 다크 모드에 따른 스타일 반환
   * @returns {Object} 배경색, 글자색, 입력 배경색, 테두리 색상
   */
  function getThemeStyles() {
    if (isDarkMode()) {
      return {
        bgColor: '#111111',
        textColor: '#ffffff',
        inputBgColor: '#2a2a2a',
        borderColor: '#3a3a3a',
        cancelBgColor: '#333333',
        cancelTextColor: '#ffffff',
        overlayColor: 'rgba(0,0,0,0.7)'
      };
    }
    return {
      bgColor: '#fff',
      textColor: '#333',
      inputBgColor: '#fff',
      borderColor: '#ccc',
      cancelBgColor: '#6c757d',
      cancelTextColor: '#fff',
      overlayColor: 'rgba(0,0,0,0.5)'
    };
  }

  /**
   * 입력 모달 표시
   * 사용자로부터 텍스트 입력을 받는 모달 다이얼로그
   *
   * @param {string} message - 모달에 표시할 메시지
   * @param {string} defaultValue - 입력 필드의 기본값
   * @returns {Promise<string|null>} 입력된 값 또는 취소 시 null
   *
   * @example
   * const name = await showInputModal('이름을 입력하세요', '기본 이름');
   * if (name !== null) {
   *   console.log('입력된 이름:', name);
   * }
   */
  function showInputModal(message, defaultValue = '') {
    return new Promise((resolve) => {
      const theme = getThemeStyles();

      // 오버레이 생성
      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: ${theme.overlayColor};
        z-index: 9998;
      `;

      // 모달 컨테이너 생성
      const modal = document.createElement('div');
      modal.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: ${theme.bgColor};
        padding: 24px;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        z-index: 9999;
        min-width: 350px;
        ${isDarkMode() ? 'border: 1px solid #2a2a2a;' : ''}
      `;

      // 모달 내용 HTML
      modal.innerHTML = `
        <div style="font-size: 16px; margin-bottom: 16px; color: ${theme.textColor};">${message}</div>
        <input type="text" id="inputModalText" value="${defaultValue}" style="
          width: 100%;
          padding: 10px;
          border: 1px solid ${theme.borderColor};
          border-radius: 4px;
          font-size: 14px;
          box-sizing: border-box;
          margin-bottom: 16px;
          background: ${theme.inputBgColor};
          color: ${theme.textColor};
        ">
        <div style="display: flex; gap: 12px; justify-content: flex-end;">
          <button id="inputModalCancel" style="
            padding: 10px 24px;
            background: ${theme.cancelBgColor};
            color: ${theme.cancelTextColor};
            border: none;
            border-radius: 4px;
            cursor: pointer;
          ">${window.i18n?.cancelBtn || '취소'}</button>
          <button id="inputModalOk" style="
            padding: 10px 24px;
            background: #4a90d9;
            color: #fff;
            border: none;
            border-radius: 4px;
            cursor: pointer;
          ">${window.i18n?.confirmBtn || '확인'}</button>
        </div>
      `;

      // DOM에 추가
      document.body.appendChild(overlay);
      document.body.appendChild(modal);

      // 입력 필드 포커스 및 전체 선택
      const input = document.getElementById('inputModalText');
      input.focus();
      input.select();

      // 정리 함수
      const cleanup = () => {
        modal.remove();
        overlay.remove();
      };

      // 제출 함수
      const submit = () => {
        cleanup();
        resolve(input.value);
      };

      // 이벤트 핸들러 등록
      document.getElementById('inputModalOk').onclick = submit;
      document.getElementById('inputModalCancel').onclick = () => {
        cleanup();
        resolve(null);
      };
      overlay.onclick = () => {
        cleanup();
        resolve(null);
      };

      // 키보드 이벤트 처리
      input.onkeydown = (e) => {
        if (e.key === 'Enter') {
          submit();
        }
        if (e.key === 'Escape') {
          cleanup();
          resolve(null);
        }
      };
    });
  }

  /**
   * 확인 모달 표시
   * 사용자에게 확인/취소를 선택하게 하는 모달 다이얼로그
   *
   * @param {string} message - 모달에 표시할 메시지
   * @param {string|null} confirmText - 확인 버튼 텍스트 (기본: '확인')
   * @param {string|null} cancelText - 취소 버튼 텍스트 (기본: '취소')
   * @param {boolean} isDanger - 위험 동작 여부 (true면 확인 버튼이 빨간색)
   * @returns {Promise<boolean>} 확인 시 true, 취소 시 false
   *
   * @example
   * // 일반 확인
   * const confirmed = await showConfirmModal('저장하시겠습니까?');
   *
   * // 위험 동작 확인 (빨간 버튼)
   * const confirmed = await showConfirmModal('삭제하시겠습니까?', '삭제', '취소', true);
   */
  function showConfirmModal(message, confirmText = null, cancelText = null, isDanger = false) {
    // 기본 텍스트 설정
    confirmText = confirmText || (window.i18n?.confirmBtn || '확인');
    cancelText = cancelText || (window.i18n?.cancelBtn || '취소');

    return new Promise((resolve) => {
      const theme = getThemeStyles();

      // 오버레이 생성
      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: ${theme.overlayColor};
        z-index: 9998;
      `;

      // 확인 버튼 색상 (위험 동작이면 빨간색)
      const confirmBtnColor = isDanger ? '#ff6b6b' : '#4a90d9';

      // 모달 컨테이너 생성
      const modal = document.createElement('div');
      modal.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: ${theme.bgColor};
        padding: 24px;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        z-index: 9999;
        min-width: 320px;
        text-align: center;
        ${isDarkMode() ? 'border: 1px solid #2a2a2a;' : ''}
      `;

      // 모달 내용 HTML
      modal.innerHTML = `
        <div style="font-size: 16px; margin-bottom: 20px; color: ${theme.textColor}; white-space: pre-wrap;">${message}</div>
        <div style="display: flex; gap: 12px; justify-content: center;">
          <button id="confirmModalCancel" style="
            padding: 10px 24px;
            background: ${theme.cancelBgColor};
            color: ${theme.cancelTextColor};
            border: none;
            border-radius: 4px;
            cursor: pointer;
          ">${cancelText}</button>
          <button id="confirmModalOk" style="
            padding: 10px 24px;
            background: ${confirmBtnColor};
            color: #fff;
            border: none;
            border-radius: 4px;
            cursor: pointer;
          ">${confirmText}</button>
        </div>
      `;

      // DOM에 추가
      document.body.appendChild(overlay);
      document.body.appendChild(modal);

      // 정리 함수
      const cleanup = () => {
        modal.remove();
        overlay.remove();
      };

      // 이벤트 핸들러 등록
      document.getElementById('confirmModalOk').onclick = () => {
        cleanup();
        resolve(true);
      };
      document.getElementById('confirmModalCancel').onclick = () => {
        cleanup();
        resolve(false);
      };
      overlay.onclick = () => {
        cleanup();
        resolve(false);
      };

      // ESC 키로 취소
      const escHandler = (e) => {
        if (e.key === 'Escape') {
          cleanup();
          resolve(false);
          document.removeEventListener('keydown', escHandler);
        }
      };
      document.addEventListener('keydown', escHandler);
    });
  }

  // window 객체에 함수들 노출
  window.showInputModal = showInputModal;
  window.showConfirmModal = showConfirmModal;

  console.log('[Module] modals.js loaded');
})();
