/**
 * 조직도 생성기 - ToolBase 기반
 * 조직 구조도 생성 및 편집
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class OrgChartGen extends ToolBase {
  constructor() {
    super('OrgChartGen');
    this.members = [
      { id: 1, name: 'CEO', title: '대표이사', parentId: null, color: '#2c3e50' },
      { id: 2, name: '김철수', title: 'CTO', parentId: 1, color: '#3498db' },
      { id: 3, name: '이영희', title: 'CFO', parentId: 1, color: '#27ae60' },
      { id: 4, name: '박민수', title: 'COO', parentId: 1, color: '#e67e22' },
      { id: 5, name: '정지훈', title: '개발팀장', parentId: 2, color: '#3498db' },
      { id: 6, name: '최유나', title: '디자인팀장', parentId: 2, color: '#9b59b6' },
      { id: 7, name: '한승우', title: '재무팀장', parentId: 3, color: '#27ae60' }
    ];
    this.selectedMember = null;
    this.nextId = 8;
  }

  init() {
    this.initElements({
      chartContainer: 'chartContainer',
      editPanel: 'editPanel',
      editName: 'editName',
      editTitle: 'editTitle',
      editColor: 'editColor',
      editParent: 'editParent'
    });

    this.renderChart();
    console.log('[OrgChartGen] 초기화 완료');
    return this;
  }

  renderChart() {
    const container = this.elements.chartContainer;
    const levels = this.buildLevels();

    let html = '<div class="org-chart">';
    levels.forEach((level, idx) => {
      html += '<div class="org-level">';
      level.forEach(member => {
        html += `
          <div class="org-node${this.selectedMember?.id === member.id ? ' selected' : ''}"
               style="background: ${member.color}"
               onclick="orgChartGen.selectMember(${member.id})">
            ${member.parentId ? '<div class="connector"></div>' : ''}
            <div class="name">${this.escapeHtml(member.name)}</div>
            <div class="title">${this.escapeHtml(member.title)}</div>
          </div>
        `;
      });
      html += '</div>';
    });
    html += '</div>';

    container.innerHTML = html;
  }

  buildLevels() {
    const levels = [];
    const roots = this.members.filter(m => m.parentId === null);

    const addLevel = (nodes) => {
      if (nodes.length === 0) return;
      levels.push(nodes);
      const children = [];
      nodes.forEach(node => {
        children.push(...this.members.filter(m => m.parentId === node.id));
      });
      addLevel(children);
    };

    addLevel(roots);
    return levels;
  }

  selectMember(id) {
    this.selectedMember = this.members.find(m => m.id === id);
    this.showEditPanel();
    this.renderChart();
  }

  showEditPanel() {
    const panel = this.elements.editPanel;
    if (!this.selectedMember) {
      panel.style.display = 'none';
      return;
    }

    panel.style.display = 'block';
    this.elements.editName.value = this.selectedMember.name;
    this.elements.editTitle.value = this.selectedMember.title;
    this.elements.editColor.value = this.selectedMember.color;

    const parentSelect = this.elements.editParent;
    parentSelect.innerHTML = '<option value="">없음 (최상위)</option>';
    this.members.filter(m => m.id !== this.selectedMember.id).forEach(m => {
      parentSelect.innerHTML += `<option value="${m.id}" ${this.selectedMember.parentId === m.id ? 'selected' : ''}>${m.name}</option>`;
    });
  }

  saveEdit() {
    if (!this.selectedMember) return;
    this.selectedMember.name = this.elements.editName.value;
    this.selectedMember.title = this.elements.editTitle.value;
    this.selectedMember.color = this.elements.editColor.value;
    const parentVal = this.elements.editParent.value;
    this.selectedMember.parentId = parentVal ? parseInt(parentVal) : null;
    this.renderChart();
    this.showToast('저장되었습니다.', 'success');
  }

  addMember() {
    const name = prompt('구성원 이름:');
    const title = prompt('직책:');
    if (name && title) {
      this.members.push({
        id: this.nextId++,
        name,
        title,
        parentId: this.selectedMember?.id || this.members[0]?.id || null,
        color: '#3498db'
      });
      this.renderChart();
      this.showToast('구성원이 추가되었습니다.', 'success');
    }
  }

  deleteMember() {
    if (!this.selectedMember) return;
    if (!confirm(`"${this.selectedMember.name}"을(를) 삭제하시겠습니까?\n하위 구성원도 함께 삭제됩니다.`)) return;

    const removeWithChildren = (id) => {
      this.members.filter(m => m.parentId === id).forEach(child => removeWithChildren(child.id));
      this.members = this.members.filter(m => m.id !== id);
    };

    removeWithChildren(this.selectedMember.id);
    this.selectedMember = null;
    this.elements.editPanel.style.display = 'none';
    this.renderChart();
    this.showToast('삭제되었습니다.', 'success');
  }

  clearChart() {
    if (confirm('모든 구성원을 삭제하시겠습니까?')) {
      this.members = [];
      this.selectedMember = null;
      this.elements.editPanel.style.display = 'none';
      this.renderChart();
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  async downloadImage() {
    await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
    const container = this.elements.chartContainer;
    const canvas = await window.html2canvas(container, { scale: 2 });
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = 'org-chart.png';
    a.click();
    this.showToast('이미지 다운로드 시작!', 'success');
  }

  loadScript(src) {
    return new Promise((resolve) => {
      if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      document.head.appendChild(script);
    });
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const orgChartGen = new OrgChartGen();
window.OrgChartGen = orgChartGen;

document.addEventListener('DOMContentLoaded', () => orgChartGen.init());
