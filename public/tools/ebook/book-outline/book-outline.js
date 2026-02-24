/**
 * 책 목차 생성기 - ToolBase 기반
 * 아웃라인 편집기
 * @created 2026-01-13
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var BookOutline = class BookOutline extends ToolBase {
  constructor() {
    super('BookOutline');
    this.outline = [];
    this.idCounter = 0;
    this.templates = {
      novel: [
        { title: '프롤로그', children: [] },
        { title: '제1부: 시작', children: [
          { title: '제1장: 만남', children: [] },
          { title: '제2장: 변화의 조짐', children: [] },
          { title: '제3장: 결심', children: [] }
        ]},
        { title: '제2부: 전개', children: [
          { title: '제4장: 여정', children: [] },
          { title: '제5장: 시련', children: [] },
          { title: '제6장: 성장', children: [] }
        ]},
        { title: '제3부: 결말', children: [
          { title: '제7장: 대결', children: [] },
          { title: '제8장: 해결', children: [] }
        ]},
        { title: '에필로그', children: [] }
      ],
      nonfiction: [
        { title: '서문', children: [] },
        { title: '제1장: 서론', children: [
          { title: '1.1 배경', children: [] },
          { title: '1.2 목적', children: [] },
          { title: '1.3 구성', children: [] }
        ]},
        { title: '제2장: 본론', children: [
          { title: '2.1 핵심 개념', children: [] },
          { title: '2.2 사례 연구', children: [] },
          { title: '2.3 분석', children: [] }
        ]},
        { title: '제3장: 결론', children: [
          { title: '3.1 요약', children: [] },
          { title: '3.2 제언', children: [] }
        ]},
        { title: '참고문헌', children: [] },
        { title: '색인', children: [] }
      ],
      tutorial: [
        { title: '들어가며', children: [] },
        { title: 'Part 1: 입문', children: [
          { title: '1장: 소개', children: [] },
          { title: '2장: 환경 설정', children: [] }
        ]},
        { title: 'Part 2: 기초', children: [
          { title: '3장: 기본 개념', children: [] },
          { title: '4장: 첫 번째 프로젝트', children: [] }
        ]},
        { title: 'Part 3: 심화', children: [
          { title: '5장: 고급 기능', children: [] },
          { title: '6장: 최적화', children: [] }
        ]},
        { title: 'Part 4: 실전', children: [
          { title: '7장: 실제 프로젝트', children: [] },
          { title: '8장: 배포', children: [] }
        ]},
        { title: '부록', children: [
          { title: 'A: 참고 자료', children: [] },
          { title: 'B: FAQ', children: [] }
        ]}
      ],
      empty: []
    };
  }

  init() {
    this.initElements({
      outlineTree: 'outlineTree'
    });

    this.loadData();
    this.render();

    console.log('[BookOutline] 초기화 완료');
    return this;
  }

  loadData() {
    try {
      const saved = localStorage.getItem('bookOutlineData');
      if (saved) {
        const data = JSON.parse(saved);
        this.outline = data.outline || [];
        this.idCounter = data.idCounter || 0;
      }
    } catch (e) {}
  }

  saveData() {
    localStorage.setItem('bookOutlineData', JSON.stringify({
      outline: this.outline,
      idCounter: this.idCounter
    }));
  }

  generateId() {
    return ++this.idCounter;
  }

  loadTemplate(type) {
    if (this.outline.length > 0 && !confirm('현재 목차를 덮어쓰시겠습니까?')) return;

    this.idCounter = 0;
    this.outline = this.addIdsToTemplate(this.templates[type]);
    this.saveData();
    this.render();
  }

  addIdsToTemplate(items) {
    return items.map(item => ({
      id: this.generateId(),
      title: item.title,
      expanded: true,
      children: this.addIdsToTemplate(item.children || [])
    }));
  }

  findItem(items, id) {
    for (const item of items) {
      if (item.id === id) return item;
      if (item.children) {
        const found = this.findItem(item.children, id);
        if (found) return found;
      }
    }
    return null;
  }

  findParent(items, id, parent = null) {
    for (const item of items) {
      if (item.id === id) return parent;
      if (item.children) {
        const found = this.findParent(item.children, id, item);
        if (found !== undefined) return found;
      }
    }
    return undefined;
  }

  addItem(parentId) {
    const title = prompt('항목 제목을 입력하세요:');
    if (!title) return;

    const newItem = { id: this.generateId(), title, expanded: true, children: [] };

    if (parentId === null) {
      this.outline.push(newItem);
    } else {
      const parent = this.findItem(this.outline, parentId);
      if (parent) {
        parent.children = parent.children || [];
        parent.children.push(newItem);
        parent.expanded = true;
      }
    }

    this.saveData();
    this.render();
  }

  editItem(id) {
    const item = this.findItem(this.outline, id);
    if (!item) return;

    const title = prompt('항목 제목을 입력하세요:', item.title);
    if (title === null) return;

    item.title = title;
    this.saveData();
    this.render();
  }

  deleteItem(id) {
    if (!confirm('이 항목을 삭제하시겠습니까?')) return;

    const deleteFromArray = (items) => {
      const index = items.findIndex(item => item.id === id);
      if (index >= 0) {
        items.splice(index, 1);
        return true;
      }
      for (const item of items) {
        if (item.children && deleteFromArray(item.children)) return true;
      }
      return false;
    };

    deleteFromArray(this.outline);
    this.saveData();
    this.render();
  }

  toggleExpand(id) {
    const item = this.findItem(this.outline, id);
    if (item) {
      item.expanded = !item.expanded;
      this.saveData();
      this.render();
    }
  }

  renderItem(item, level = 0) {
    const hasChildren = item.children && item.children.length > 0;
    const toggleIcon = hasChildren ? (item.expanded ? '▼' : '') : '•';

    let html = `
      <div class="outline-item" data-id="${item.id}">
        <div class="outline-item-header">
          <span class="outline-toggle" onclick="bookOutline.toggleExpand(${item.id})">${toggleIcon}</span>
          <span class="level-badge">L${level + 1}</span>
          <span class="outline-text">${item.title}</span>
          <div class="outline-actions">
            <button onclick="bookOutline.addItem(${item.id})">+</button>
            <button onclick="bookOutline.editItem(${item.id})"></button>
            <button onclick="bookOutline.deleteItem(${item.id})"></button>
          </div>
        </div>
    `;

    if (hasChildren) {
      html += `<div class="outline-children ${item.expanded ? 'expanded' : ''}">`;
      item.children.forEach(child => {
        html += this.renderItem(child, level + 1);
      });
      html += '</div>';
    }

    html += '</div>';
    return html;
  }

  render() {
    if (this.outline.length === 0) {
      this.elements.outlineTree.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 2rem;">템플릿을 선택하거나 항목을 추가해주세요</div>';
      return;
    }

    this.elements.outlineTree.innerHTML = this.outline.map(item => this.renderItem(item)).join('');
  }

  flattenOutline(items, level = 0, result = []) {
    items.forEach(item => {
      result.push({ title: item.title, level });
      if (item.children) {
        this.flattenOutline(item.children, level + 1, result);
      }
    });
    return result;
  }

  exportText() {
    if (this.outline.length === 0) {
      alert('내보낼 목차가 없습니다.');
      return;
    }

    const flat = this.flattenOutline(this.outline);
    const text = flat.map(item => '  '.repeat(item.level) + item.title).join('\n');

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = 'book_outline.txt';
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  }

  exportMarkdown() {
    if (this.outline.length === 0) {
      alert('내보낼 목차가 없습니다.');
      return;
    }

    const flat = this.flattenOutline(this.outline);
    const md = flat.map(item => {
      const prefix = '#'.repeat(Math.min(item.level + 1, 6));
      return `${prefix} ${item.title}`;
    }).join('\n\n');

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = 'book_outline.md';
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  }

  exportJSON() {
    if (this.outline.length === 0) {
      alert('내보낼 목차가 없습니다.');
      return;
    }

    const cleanOutline = (items) => items.map(item => ({
      title: item.title,
      children: item.children ? cleanOutline(item.children) : []
    }));

    const json = JSON.stringify(cleanOutline(this.outline), null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = 'book_outline.json';
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const bookOutline = new BookOutline();
window.BookOutline = bookOutline;

document.addEventListener('DOMContentLoaded', () => bookOutline.init());
