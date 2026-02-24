/**
 * 체크리스트 메이커 - ToolBase 기반
 * 템플릿 기반 체크리스트 생성
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class ChecklistMaker extends ToolBase {
  constructor() {
    super('ChecklistMaker');
    this.currentItems = [];
    this.checklists = [];
    this.templates = {
      travel: ['여권/신분증', '항공권/숙소 예약 확인', '환전/카드', '여행자 보험', '충전기/어댑터', '세면도구', '상비약', '옷/속옷', '카메라', '여행 가이드북'],
      meeting: ['회의 안건 정리', '발표 자료 준비', '참석자 명단 확인', '회의실 예약', '필기도구', '노트북/태블릿', '음료/다과 준비', '회의록 양식'],
      project: ['프로젝트 범위 정의', '팀원 역할 배분', '일정 계획 수립', '예산 책정', '리스크 분석', '커뮤니케이션 계획', '도구/기술 선정', '킥오프 미팅'],
      moving: ['이사 업체 예약', '전입신고', '공과금 정산', '주소 변경 신청', '이삿짐 정리/포장', '청소 예약', '인터넷/TV 이전', '열쇠 인수인계'],
      event: ['컨셉/테마 결정', '장소 섭외', '초대장 발송', '케이터링 예약', '음향/조명 준비', '사진/영상 촬영 예약', '진행 순서 정리', '비상 연락망']
    };
  }

  init() {
    this.initElements({
      templateSelect: 'templateSelect',
      checklistTitle: 'checklistTitle',
      newItem: 'newItem',
      addItem: 'addItem',
      itemsList: 'itemsList',
      saveChecklist: 'saveChecklist',
      checklistsList: 'checklistsList'
    });

    this.load();
    this.bindEvents();
    this.renderItems();
    this.renderChecklists();

    console.log('[ChecklistMaker] 초기화 완료');
    return this;
  }

  load() {
    try {
      const saved = localStorage.getItem('checklists');
      if (saved) {
        this.checklists = JSON.parse(saved);
      }
    } catch (e) {}
  }

  save() {
    localStorage.setItem('checklists', JSON.stringify(this.checklists));
  }

  bindEvents() {
    this.elements.templateSelect.addEventListener('change', (e) => {
      const template = this.templates[e.target.value];
      if (template) {
        this.currentItems = template.map(text => ({ text, checked: false }));
        this.renderItems();
      }
    });

    this.elements.addItem.addEventListener('click', () => this.addItemHandler());
    this.elements.newItem.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.addItemHandler();
    });

    this.elements.saveChecklist.addEventListener('click', () => this.saveChecklistHandler());
  }

  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  renderItems() {
    this.elements.itemsList.innerHTML = this.currentItems.map((item, idx) => `
      <div class="item-row ${item.checked ? 'checked' : ''}">
        <input type="checkbox" ${item.checked ? 'checked' : ''} onchange="checklistMaker.toggleItem(${idx})">
        <span>${this.escapeHtml(item.text)}</span>
        <button onclick="checklistMaker.removeItem(${idx})">삭제</button>
      </div>
    `).join('');
  }

  addItemHandler() {
    const text = this.elements.newItem.value.trim();
    if (!text) return;

    this.currentItems.push({ text, checked: false });
    this.elements.newItem.value = '';
    this.renderItems();
  }

  toggleItem(idx) {
    this.currentItems[idx].checked = !this.currentItems[idx].checked;
    this.renderItems();
  }

  removeItem(idx) {
    this.currentItems.splice(idx, 1);
    this.renderItems();
  }

  saveChecklistHandler() {
    const title = this.elements.checklistTitle.value.trim() || '제목 없음';

    if (this.currentItems.length === 0) {
      this.showToast('항목을 추가하세요', 'error');
      return;
    }

    this.checklists.unshift({
      id: Date.now().toString(),
      title,
      items: [...this.currentItems],
      date: new Date().toISOString()
    });

    this.save();
    this.renderChecklists();

    this.currentItems = [];
    this.elements.checklistTitle.value = '';
    this.elements.templateSelect.value = '';
    this.renderItems();
    this.showToast('체크리스트가 저장되었습니다', 'success');
  }

  renderChecklists() {
    this.elements.checklistsList.innerHTML = this.checklists.map(cl => {
      const completed = cl.items.filter(i => i.checked).length;
      const total = cl.items.length;
      const percent = Math.round((completed / total) * 100);

      return `
        <div class="checklist-card" data-id="${cl.id}">
          <h4>${this.escapeHtml(cl.title)}</h4>
          <div class="progress">
            <div class="progress-fill" style="width: ${percent}%"></div>
          </div>
          <div class="stats">${completed}/${total} 완료 (${percent}%)</div>
          <div class="items-preview">
            ${cl.items.map((item, idx) => `
              <div class="preview-item ${item.checked ? 'checked' : ''}">
                <input type="checkbox" ${item.checked ? 'checked' : ''} onchange="checklistMaker.toggleChecklistItem('${cl.id}', ${idx})">
                <span>${this.escapeHtml(item.text)}</span>
              </div>
            `).join('')}
          </div>
          <div class="actions">
            <button class="btn-copy" onclick="checklistMaker.copyChecklist('${cl.id}')">복사</button>
            <button class="btn-delete" onclick="checklistMaker.deleteChecklist('${cl.id}')">삭제</button>
          </div>
        </div>
      `;
    }).join('');
  }

  toggleChecklistItem(clId, idx) {
    const cl = this.checklists.find(c => c.id === clId);
    if (cl) {
      cl.items[idx].checked = !cl.items[idx].checked;
      this.save();
      this.renderChecklists();
    }
  }

  copyChecklist(id) {
    const cl = this.checklists.find(c => c.id === id);
    if (cl) {
      this.currentItems = cl.items.map(i => ({ ...i, checked: false }));
      this.elements.checklistTitle.value = cl.title + ' (복사본)';
      this.renderItems();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      this.showToast('체크리스트가 복사되었습니다', 'success');
    }
  }

  deleteChecklist(id) {
    if (confirm('이 체크리스트를 삭제하시겠습니까?')) {
      this.checklists = this.checklists.filter(c => c.id !== id);
      this.save();
      this.renderChecklists();
      this.showToast('체크리스트가 삭제되었습니다', 'success');
    }
  }
}

// 전역 인스턴스 생성
const checklistMaker = new ChecklistMaker();
window.ChecklistMaker = checklistMaker;

document.addEventListener('DOMContentLoaded', () => checklistMaker.init());
