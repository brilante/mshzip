/**
 * 패널 리사이징 모듈
 * @module modules/panel-resize
 * @description 3패널 레이아웃의 드래그 리사이징 기능
 */

/**
 * 패널 숨김 상태 (전역 공유)
 */
window.panelHiddenState = window.panelHiddenState || {
  left: false,
  middle: false,
  right: false
};

/**
 * 패널 리사이징 설정
 */
function setupExactMyMind2Resizing() {
  const leftPanel = document.getElementById('leftPanel');
  const middlePanel = document.getElementById('middlePanel');
  const rightPanel = document.getElementById('rightPanel');
  const divider1 = document.getElementById('divider1');
  const divider2 = document.getElementById('divider2');

  if (!leftPanel || !middlePanel || !rightPanel || !divider1 || !divider2) {
    console.warn('[Panel Resize] 필요한 패널 요소를 찾을 수 없습니다.');
    return;
  }

  let isResizing = false;
  let currentDivider = null;
  let resizeStartX = 0;
  let resizeStartWidth = 0;
  let resizeNextStartWidth = 0;
  let resizeMinWidth = 0;

  function startResize(e, divider) {
    const totalWidth = document.body.offsetWidth;
    const leftWidth = leftPanel.offsetWidth;
    const middleWidth = middlePanel.offsetWidth;
    const rightWidth = rightPanel.offsetWidth;

    window.panelHiddenState.left = (leftWidth / totalWidth) < 0.05;
    window.panelHiddenState.middle = (middleWidth / totalWidth) < 0.05;
    window.panelHiddenState.right = (rightWidth / totalWidth) < 0.05;

    isResizing = true;
    currentDivider = divider;
    resizeStartX = e.clientX;
    resizeMinWidth = totalWidth * 0.1;

    if (window.panelHiddenState.middle) {
      resizeStartWidth = leftPanel.offsetWidth;
      resizeNextStartWidth = rightPanel.offsetWidth;
    } else {
      if (divider === divider1) {
        resizeStartWidth = leftPanel.offsetWidth;
        resizeNextStartWidth = middlePanel.offsetWidth;
      } else {
        resizeStartWidth = middlePanel.offsetWidth;
        resizeNextStartWidth = rightPanel.offsetWidth;
      }
    }

    document.addEventListener('mousemove', resize);
    document.addEventListener('mouseup', stopResize);
    divider.classList.add('active');
    document.body.style.cursor = 'col-resize';
    e.preventDefault();
  }

  function resize(e) {
    if (!isResizing) return;
    const dx = e.clientX - resizeStartX;
    const totalWidth = document.body.offsetWidth;

    if (window.panelHiddenState.middle) {
      let newLeftWidth = Math.max(resizeMinWidth, resizeStartWidth + dx);
      let newRightWidth = Math.max(resizeMinWidth, resizeNextStartWidth - dx);
      if (newLeftWidth + newRightWidth > totalWidth) {
        newLeftWidth = totalWidth - resizeMinWidth;
        newRightWidth = resizeMinWidth;
      }
      leftPanel.style.width = newLeftWidth + 'px';
      rightPanel.style.width = newRightWidth + 'px';
    } else {
      if (currentDivider === divider1) {
        let newLeftWidth = Math.max(resizeMinWidth, resizeStartWidth + dx);
        let newMiddleWidth = Math.max(resizeMinWidth, resizeNextStartWidth - dx);
        if (newLeftWidth + newMiddleWidth > totalWidth - rightPanel.offsetWidth) {
          newLeftWidth = totalWidth - rightPanel.offsetWidth - resizeMinWidth;
          newMiddleWidth = resizeMinWidth;
        }
        leftPanel.style.width = newLeftWidth + 'px';
        middlePanel.style.width = newMiddleWidth + 'px';
      } else if (currentDivider === divider2) {
        let newMiddleWidth = Math.max(resizeMinWidth, resizeStartWidth + dx);
        let newRightWidth = Math.max(resizeMinWidth, resizeNextStartWidth - dx);
        if (newMiddleWidth + newRightWidth > totalWidth - leftPanel.offsetWidth) {
          newMiddleWidth = totalWidth - leftPanel.offsetWidth - resizeMinWidth;
          newRightWidth = resizeMinWidth;
        }
        middlePanel.style.width = newMiddleWidth + 'px';
        rightPanel.style.width = newRightWidth + 'px';
      }
    }
  }

  function stopResize() {
    isResizing = false;
    if (currentDivider) currentDivider.classList.remove('active');
    document.body.style.cursor = '';
    document.removeEventListener('mousemove', resize);
    document.removeEventListener('mouseup', stopResize);

    // 패널 리사이즈 완료 후 에디터 프리뷰 영역 갱신
    setTimeout(() => {
      // Window resize 이벤트 트리거하여 TOAST UI Editor가 리사이즈 감지하도록 함
      window.dispatchEvent(new Event('resize'));

      // 프리뷰 탭이 활성화되어 있으면 커스텀 프리뷰 강제 갱신
      if (window.MyMind3Editor && window.MyMind3Editor.refreshPreviewSize) {
        window.MyMind3Editor.refreshPreviewSize();
        console.log('[Panel Resize] Preview size refreshed');
      }
    }, 50);
  }

  divider1.addEventListener('mousedown', (e) => startResize(e, divider1));
  divider2.addEventListener('mousedown', (e) => startResize(e, divider2));
}

// 전역 접근 가능하도록 등록
window.setupExactMyMind2Resizing = setupExactMyMind2Resizing;

// 모듈 내보내기
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { setupExactMyMind2Resizing };
}
