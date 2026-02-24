/**
 * 아이콘 라이브러리 - ToolBase 기반
 * 다양한 아이콘 검색 및 복사
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var IconLibrary = class IconLibrary extends ToolBase {
  constructor() {
    super('IconLibrary');
    this.icons = [
      // 화살표
      { name: '위 화살표', icon: '↑', category: 'arrows', tags: ['up', 'arrow'] },
      { name: '아래 화살표', icon: '↓', category: 'arrows', tags: ['down', 'arrow'] },
      { name: '왼쪽 화살표', icon: '←', category: 'arrows', tags: ['left', 'arrow'] },
      { name: '오른쪽 화살표', icon: '→', category: 'arrows', tags: ['right', 'arrow'] },
      { name: '위아래 화살표', icon: '↕', category: 'arrows', tags: ['vertical', 'arrow'] },
      { name: '좌우 화살표', icon: '↔', category: 'arrows', tags: ['horizontal', 'arrow'] },
      { name: '되돌리기', icon: '↩', category: 'arrows', tags: ['return', 'undo'] },
      { name: '다시실행', icon: '↪', category: 'arrows', tags: ['redo', 'forward'] },
      { name: '새로고침', icon: '⟳', category: 'arrows', tags: ['refresh', 'reload'] },
      // UI
      { name: '체크', icon: '', category: 'ui', tags: ['check', 'ok', 'done'] },
      { name: '엑스', icon: '', category: 'ui', tags: ['x', 'close', 'cancel'] },
      { name: '플러스', icon: '+', category: 'ui', tags: ['plus', 'add'] },
      { name: '마이너스', icon: '−', category: 'ui', tags: ['minus', 'remove'] },
      { name: '검색', icon: '', category: 'ui', tags: ['search', 'find'] },
      { name: '설정', icon: '', category: 'ui', tags: ['settings', 'gear'] },
      { name: '홈', icon: '', category: 'ui', tags: ['home', 'house'] },
      { name: '메뉴', icon: '', category: 'ui', tags: ['menu', 'hamburger'] },
      { name: '별', icon: '', category: 'ui', tags: ['star', 'favorite'] },
      { name: '빈 별', icon: '', category: 'ui', tags: ['star', 'empty'] },
      { name: '하트', icon: '', category: 'ui', tags: ['heart', 'love'] },
      { name: '빈 하트', icon: '', category: 'ui', tags: ['heart', 'empty'] },
      { name: '알림', icon: '', category: 'ui', tags: ['bell', 'notification'] },
      { name: '잠금', icon: '', category: 'ui', tags: ['lock', 'secure'] },
      { name: '잠금해제', icon: '', category: 'ui', tags: ['unlock', 'open'] },
      // 소셜
      { name: '공유', icon: '', category: 'social', tags: ['share', 'export'] },
      { name: '링크', icon: '', category: 'social', tags: ['link', 'url'] },
      { name: '이메일', icon: '', category: 'social', tags: ['email', 'mail'] },
      { name: '전화', icon: '', category: 'social', tags: ['phone', 'call'] },
      { name: '메시지', icon: '', category: 'social', tags: ['message', 'chat'] },
      { name: '사용자', icon: '', category: 'social', tags: ['user', 'person'] },
      { name: '그룹', icon: '', category: 'social', tags: ['group', 'team'] },
      // 미디어
      { name: '재생', icon: '', category: 'media', tags: ['play', 'start'] },
      { name: '일시정지', icon: '', category: 'media', tags: ['pause', 'stop'] },
      { name: '정지', icon: '', category: 'media', tags: ['stop', 'end'] },
      { name: '이전', icon: '', category: 'media', tags: ['previous', 'back'] },
      { name: '다음', icon: '', category: 'media', tags: ['next', 'forward'] },
      { name: '볼륨', icon: '', category: 'media', tags: ['volume', 'sound'] },
      { name: '음소거', icon: '', category: 'media', tags: ['mute', 'silent'] },
      { name: '카메라', icon: '', category: 'media', tags: ['camera', 'photo'] },
      { name: '비디오', icon: '', category: 'media', tags: ['video', 'movie'] },
      { name: '음악', icon: '', category: 'media', tags: ['music', 'audio'] },
      // 파일
      { name: '폴더', icon: '', category: 'files', tags: ['folder', 'directory'] },
      { name: '파일', icon: '', category: 'files', tags: ['file', 'document'] },
      { name: '저장', icon: '', category: 'files', tags: ['save', 'disk'] },
      { name: '다운로드', icon: '', category: 'files', tags: ['download', 'import'] },
      { name: '업로드', icon: '', category: 'files', tags: ['upload', 'export'] },
      { name: '복사', icon: '', category: 'files', tags: ['copy', 'clipboard'] },
      { name: '휴지통', icon: '', category: 'files', tags: ['trash', 'delete'] },
      { name: '편집', icon: '', category: 'files', tags: ['edit', 'pencil'] },
      // 이모지
      { name: '웃음', icon: '', category: 'emoji', tags: ['smile', 'happy'] },
      { name: '좋아요', icon: '', category: 'emoji', tags: ['like', 'thumbs up'] },
      { name: '박수', icon: '', category: 'emoji', tags: ['clap', 'applause'] },
      { name: '불꽃', icon: '', category: 'emoji', tags: ['fire', 'hot'] },
      { name: '로켓', icon: '', category: 'emoji', tags: ['rocket', 'launch'] },
      { name: '전구', icon: '', category: 'emoji', tags: ['idea', 'light'] },
      { name: '경고', icon: '', category: 'emoji', tags: ['warning', 'alert'] },
      { name: '정보', icon: 'ℹ', category: 'emoji', tags: ['info', 'information'] },
      { name: '질문', icon: '', category: 'emoji', tags: ['question', 'help'] },
      { name: '느낌표', icon: '', category: 'emoji', tags: ['exclamation', 'important'] }
    ];
    this.currentCategory = 'all';
    this.selectedIcon = null;
  }

  init() {
    this.initElements({
      iconsGrid: 'iconsGrid',
      searchInput: 'searchInput',
      selectedPanel: 'selectedPanel',
      selectedPreview: 'selectedPreview',
      selectedName: 'selectedName'
    });

    this.renderIcons();
    console.log('[IconLibrary] 초기화 완료');
    return this;
  }

  renderIcons(icons = null) {
    const displayIcons = icons || this.getFilteredIcons();

    if (displayIcons.length === 0) {
      this.elements.iconsGrid.innerHTML = '<div class="no-results">검색 결과가 없습니다.</div>';
      return;
    }

    this.elements.iconsGrid.innerHTML = displayIcons.map((item, index) => `
      <div class="icon-card" onclick="iconLibrary.selectIcon(${index})">
        <div class="icon-symbol">${item.icon}</div>
        <div class="icon-name">${item.name}</div>
      </div>
    `).join('');
  }

  getFilteredIcons() {
    if (this.currentCategory === 'all') return this.icons;
    return this.icons.filter(i => i.category === this.currentCategory);
  }

  search() {
    const query = this.elements.searchInput.value.toLowerCase();
    if (!query) {
      this.renderIcons();
      return;
    }

    const filtered = this.getFilteredIcons().filter(icon =>
      icon.name.toLowerCase().includes(query) ||
      icon.tags.some(tag => tag.includes(query))
    );
    this.renderIcons(filtered);
  }

  filterCategory(category) {
    this.currentCategory = category;
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-category="${category}"]`).classList.add('active');
    this.elements.searchInput.value = '';
    this.renderIcons();
  }

  selectIcon(index) {
    const icons = this.getFilteredIcons();
    this.selectedIcon = icons[index];

    this.elements.selectedPanel.style.display = 'flex';
    this.elements.selectedPreview.textContent = this.selectedIcon.icon;
    this.elements.selectedName.textContent = this.selectedIcon.name;
  }

  async copyIcon(type) {
    if (!this.selectedIcon) return;

    let text;
    if (type === 'svg') {
      text = this.selectedIcon.icon;
    } else {
      text = `&#${this.selectedIcon.icon.codePointAt(0)};`;
    }

    try {
      await navigator.clipboard.writeText(text);
      this.showToast('아이콘이 복사되었습니다!', 'success');
    } catch (e) {
      this.showToast('복사 실패', 'error');
    }
  }

  downloadIcon() {
    if (!this.selectedIcon) return;

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
  <text x="50" y="70" font-size="60" text-anchor="middle">${this.selectedIcon.icon}</text>
</svg>`;

    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${this.selectedIcon.name}.svg`;
    link.click();
    URL.revokeObjectURL(link.href);
    this.showToast('아이콘 다운로드 시작!', 'success');
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const iconLibrary = new IconLibrary();
window.IconLibrary = iconLibrary;

document.addEventListener('DOMContentLoaded', () => iconLibrary.init());
