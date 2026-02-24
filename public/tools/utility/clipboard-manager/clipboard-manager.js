/**
 * 클립보드 관리자 - ToolBase 기반
 * 클립보드 히스토리 관리
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class ClipboardManager extends ToolBase {
  constructor() {
    super('ClipboardManager');
    this.clips = [];
  }

  init() {
    this.initElements({
      newClip: 'newClip',
      clipLabel: 'clipLabel',
      addClip: 'addClip',
      pasteFromClipboard: 'pasteFromClipboard',
      searchClip: 'searchClip',
      clearAll: 'clearAll',
      clipCount: 'clipCount',
      clipsList: 'clipsList'
    });

    this.load();
    this.bindEvents();
    this.render();

    console.log('[ClipboardManager] 초기화 완료');
    return this;
  }

  load() {
    try {
      this.clips = JSON.parse(localStorage.getItem('clipboardClips')) || [];
    } catch (e) {
      this.clips = [];
    }
  }

  save() {
    localStorage.setItem('clipboardClips', JSON.stringify(this.clips));
  }

  bindEvents() {
    this.elements.addClip.addEventListener('click', () => this.add());
    this.elements.pasteFromClipboard.addEventListener('click', () => this.pasteFromClipboard());
    this.elements.searchClip.addEventListener('input', () => this.render());
    this.elements.clearAll.addEventListener('click', () => this.clearAll());
  }

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  render() {
    const search = this.elements.searchClip.value.toLowerCase();
    const filtered = this.clips.filter(c =>
      c.content.toLowerCase().includes(search) ||
      (c.label && c.label.toLowerCase().includes(search))
    );

    this.elements.clipCount.textContent = this.clips.length;
    this.elements.clipsList.innerHTML = filtered.map(clip => {
      const date = new Date(clip.date);
      return `
        <div class="clip-item ${clip.pinned ? 'pinned' : ''}" data-id="${clip.id}">
          <div class="clip-header">
            <span class="clip-label">
              ${this.escapeHtml(clip.label || '라벨 없음')}
              ${clip.pinned ? '<span class="pin-badge">고정됨</span>' : ''}
            </span>
            <span class="clip-date">${date.toLocaleDateString()}</span>
          </div>
          <div class="clip-content">${this.escapeHtml(clip.content)}</div>
          <div class="clip-actions">
            <button class="btn-copy" onclick="clipboardManager.copyClip('${clip.id}')">복사</button>
            <button class="btn-edit" onclick="clipboardManager.togglePin('${clip.id}')">${clip.pinned ? '고정 해제' : '고정'}</button>
            <button class="btn-delete" onclick="clipboardManager.deleteClip('${clip.id}')">삭제</button>
          </div>
        </div>
      `;
    }).join('');
  }

  add() {
    const content = this.elements.newClip.value.trim();
    const label = this.elements.clipLabel.value.trim();

    if (!content) {
      this.showToast('텍스트를 입력하세요', 'error');
      return;
    }

    this.clips.unshift({
      id: Date.now().toString(),
      content,
      label,
      date: new Date().toISOString(),
      pinned: false
    });

    this.save();
    this.render();

    this.elements.newClip.value = '';
    this.elements.clipLabel.value = '';
    this.showToast('클립이 추가되었습니다');
  }

  async pasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      this.elements.newClip.value = text;
    } catch (err) {
      this.showToast('클립보드 접근 권한이 필요합니다', 'error');
    }
  }

  async copyClip(id) {
    const clip = this.clips.find(c => c.id === id);
    if (clip) {
      await this.copyToClipboard(clip.content);
    }
  }

  togglePin(id) {
    const clip = this.clips.find(c => c.id === id);
    if (clip) {
      clip.pinned = !clip.pinned;
      this.clips.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
      this.save();
      this.render();
    }
  }

  deleteClip(id) {
    this.clips = this.clips.filter(c => c.id !== id);
    this.save();
    this.render();
    this.showToast('클립이 삭제되었습니다');
  }

  clearAll() {
    if (confirm('모든 클립을 삭제하시겠습니까?')) {
      this.clips = [];
      this.save();
      this.render();
      this.showToast('모든 클립이 삭제되었습니다');
    }
  }
}

// 전역 인스턴스 생성
const clipboardManager = new ClipboardManager();
window.ClipboardManager = clipboardManager;

document.addEventListener('DOMContentLoaded', () => clipboardManager.init());
