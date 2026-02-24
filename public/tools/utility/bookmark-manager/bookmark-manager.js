/**
 * 북마크 관리자 - ToolBase 기반
 * URL 북마크 저장 및 관리
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var BookmarkManager = class BookmarkManager extends ToolBase {
  constructor() {
    super('BookmarkManager');
    this.bookmarks = [];
    this.activeCategory = 'all';
    this.categories = {
      all: { name: '전체', icon: '' },
      general: { name: '일반', icon: '' },
      work: { name: '업무', icon: '' },
      study: { name: '학습', icon: '' },
      shopping: { name: '쇼핑', icon: '' },
      entertainment: { name: '엔터테인먼트', icon: '' }
    };
  }

  init() {
    this.initElements({
      bookmarkTitle: 'bookmarkTitle',
      bookmarkUrl: 'bookmarkUrl',
      bookmarkCategory: 'bookmarkCategory',
      categoryTabs: 'categoryTabs',
      bookmarkList: 'bookmarkList'
    });

    this.load();
    this.render();

    console.log('[BookmarkManager] 초기화 완료');
    return this;
  }

  load() {
    try {
      const saved = localStorage.getItem('bookmark-manager-data');
      if (saved) {
        this.bookmarks = JSON.parse(saved);
      }
    } catch (e) {}
  }

  save() {
    localStorage.setItem('bookmark-manager-data', JSON.stringify(this.bookmarks));
  }

  add() {
    const title = this.elements.bookmarkTitle.value.trim();
    const url = this.elements.bookmarkUrl.value.trim();
    const category = this.elements.bookmarkCategory.value;

    if (!url) {
      this.showToast('URL을 입력하세요', 'error');
      return;
    }

    try {
      new URL(url);
    } catch (e) {
      this.showToast('올바른 URL을 입력하세요', 'error');
      return;
    }

    this.bookmarks.unshift({
      id: Date.now(),
      title: title || this.extractDomain(url),
      url: url,
      category: category,
      createdAt: new Date().toISOString()
    });

    this.save();
    this.render();

    this.elements.bookmarkTitle.value = '';
    this.elements.bookmarkUrl.value = '';
    this.showToast('북마크가 추가되었습니다', 'success');
  }

  extractDomain(url) {
    try {
      const domain = new URL(url).hostname;
      return domain.replace('www.', '');
    } catch (e) {
      return url;
    }
  }

  getFavicon(url) {
    try {
      const domain = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
    } catch (e) {
      return null;
    }
  }

  open(id) {
    const bookmark = this.bookmarks.find(b => b.id === id);
    if (bookmark) {
      window.open(bookmark.url, '_blank');
    }
  }

  copy(id) {
    const bookmark = this.bookmarks.find(b => b.id === id);
    if (bookmark) {
      this.copyToClipboard(bookmark.url);
    }
  }

  remove(id) {
    this.bookmarks = this.bookmarks.filter(b => b.id !== id);
    this.save();
    this.render();
    this.showToast('북마크가 삭제되었습니다', 'success');
  }

  setCategory(category) {
    this.activeCategory = category;
    this.render();
  }

  render() {
    this.renderTabs();
    this.renderList();
  }

  renderTabs() {
    const tabs = this.elements.categoryTabs;
    const counts = { all: this.bookmarks.length };

    this.bookmarks.forEach(b => {
      counts[b.category] = (counts[b.category] || 0) + 1;
    });

    tabs.innerHTML = Object.entries(this.categories).map(([key, cat]) => `
      <div class="category-tab ${this.activeCategory === key ? 'active' : ''}" onclick="bookmarkManager.setCategory('${key}')">
        ${cat.icon} ${cat.name} (${counts[key] || 0})
      </div>
    `).join('');
  }

  renderList() {
    const list = this.elements.bookmarkList;
    let filtered = this.bookmarks;

    if (this.activeCategory !== 'all') {
      filtered = this.bookmarks.filter(b => b.category === this.activeCategory);
    }

    if (filtered.length === 0) {
      list.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-secondary);">북마크가 없습니다</div>';
      return;
    }

    list.innerHTML = filtered.map(bookmark => `
      <div class="bookmark-item">
        <div class="bookmark-icon">
          <img src="${this.getFavicon(bookmark.url)}" alt="" style="width: 16px; height: 16px;" onerror="this.style.display='none'">
        </div>
        <div class="bookmark-info">
          <div class="bookmark-title">${this.escapeHtml(bookmark.title)}</div>
          <div class="bookmark-url">${this.escapeHtml(bookmark.url)}</div>
        </div>
        <div class="bookmark-actions">
          <button class="tool-btn tool-btn-secondary" onclick="bookmarkManager.open(${bookmark.id})" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">열기</button>
          <button class="tool-btn tool-btn-secondary" onclick="bookmarkManager.copy(${bookmark.id})" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">복사</button>
          <button class="tool-btn tool-btn-secondary" onclick="bookmarkManager.remove(${bookmark.id})" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">삭제</button>
        </div>
      </div>
    `).join('');
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// 전역 인스턴스 생성
const bookmarkManager = new BookmarkManager();
window.BookmarkManager = bookmarkManager;

document.addEventListener('DOMContentLoaded', () => bookmarkManager.init());
