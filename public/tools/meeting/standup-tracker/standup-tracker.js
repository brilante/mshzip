/**
 * 스탠드업 트래커 - ToolBase 기반
 * 데일리 스크럼 관리
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var StandupTracker = class StandupTracker extends ToolBase {
  constructor() {
    super('StandupTracker');
    this.members = [];
    this.standups = {};
    this.storageKey = 'standupTracker_data';
  }

  init() {
    this.initElements({
      standupDate: 'standupDate',
      memberName: 'memberName',
      standupBoard: 'standupBoard',
      emptyState: 'emptyState',
      summarySection: 'summarySection',
      completedCount: 'completedCount',
      plannedCount: 'plannedCount',
      blockerCount: 'blockerCount',
      historyModal: 'historyModal',
      historyList: 'historyList'
    });

    // 오늘 날짜 설정
    this.goToday();

    // Enter 키 이벤트
    this.elements.memberName.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.addMember();
    });

    // 저장된 데이터 로드
    this.loadFromStorage();
    this.render();

    console.log('[StandupTracker] 초기화 완료');
    return this;
  }

  getCurrentDate() {
    return this.elements.standupDate.value;
  }

  setDate(dateStr) {
    this.elements.standupDate.value = dateStr;
    this.loadDay();
  }

  goToday() {
    const today = new Date().toISOString().split('T')[0];
    this.setDate(today);
  }

  prevDay() {
    const current = new Date(this.getCurrentDate());
    current.setDate(current.getDate() - 1);
    this.setDate(current.toISOString().split('T')[0]);
  }

  nextDay() {
    const current = new Date(this.getCurrentDate());
    current.setDate(current.getDate() + 1);
    this.setDate(current.toISOString().split('T')[0]);
  }

  loadDay() {
    this.render();
  }

  addMember() {
    const name = this.elements.memberName.value.trim();

    if (!name) return;
    if (this.members.includes(name)) {
      this.showToast('이미 등록된 팀원입니다.', 'error');
      return;
    }

    this.members.push(name);
    this.elements.memberName.value = '';
    this.saveToStorage();
    this.render();
  }

  removeMember(name) {
    if (!confirm(`${name} 팀원을 삭제하시겠습니까?`)) return;

    this.members = this.members.filter(m => m !== name);
    this.saveToStorage();
    this.render();
  }

  getStandup(date, member) {
    const key = `${date}_${member}`;
    if (!this.standups[key]) {
      this.standups[key] = {
        yesterday: [],
        today: [],
        blockers: []
      };
    }
    return this.standups[key];
  }

  addItem(member, type) {
    const inputId = `input-${this.sanitizeId(member)}-${type}`;
    const input = document.getElementById(inputId);
    const text = input.value.trim();

    if (!text) return;

    const date = this.getCurrentDate();
    const standup = this.getStandup(date, member);
    standup[type].push(text);

    input.value = '';
    this.saveToStorage();
    this.render();
  }

  removeItem(member, type, index) {
    const date = this.getCurrentDate();
    const standup = this.getStandup(date, member);
    standup[type].splice(index, 1);
    this.saveToStorage();
    this.render();
  }

  sanitizeId(str) {
    return str.replace(/[^a-zA-Z0-9가-힣]/g, '_');
  }

  render() {
    const date = this.getCurrentDate();

    if (this.members.length === 0) {
      this.elements.standupBoard.innerHTML = '';
      this.elements.emptyState.classList.add('show');
      this.elements.summarySection.style.display = 'none';
      return;
    }

    this.elements.emptyState.classList.remove('show');
    this.elements.summarySection.style.display = 'block';

    let totalYesterday = 0;
    let totalToday = 0;
    let totalBlockers = 0;

    this.elements.standupBoard.innerHTML = this.members.map(member => {
      const standup = this.getStandup(date, member);
      const sanitizedId = this.sanitizeId(member);

      totalYesterday += standup.yesterday.length;
      totalToday += standup.today.length;
      totalBlockers += standup.blockers.length;

      return `
        <div class="member-card">
          <div class="member-header">
            <div class="member-name">
              <div class="member-avatar">${member.charAt(0)}</div>
              ${this.escapeHtml(member)}
            </div>
            <div class="member-actions">
              <button class="member-action-btn delete" onclick="standupTracker.removeMember('${this.escapeHtml(member)}')">삭제</button>
            </div>
          </div>
          <div class="member-content">
            <div class="standup-column">
              <div class="column-title yesterday">어제 한 일</div>
              <input type="text" class="standup-input" id="input-${sanitizedId}-yesterday"
                     placeholder="완료한 작업..."
                     onkeypress="if(event.key==='Enter')standupTracker.addItem('${this.escapeHtml(member)}','yesterday')">
              <div class="standup-items">
                ${standup.yesterday.map((item, i) => `
                  <div class="standup-item">
                    <span class="item-text">${this.escapeHtml(item)}</span>
                    <button class="item-delete" onclick="standupTracker.removeItem('${this.escapeHtml(member)}','yesterday',${i})"></button>
                  </div>
                `).join('')}
              </div>
            </div>
            <div class="standup-column">
              <div class="column-title today">오늘 할 일</div>
              <input type="text" class="standup-input" id="input-${sanitizedId}-today"
                     placeholder="오늘 계획..."
                     onkeypress="if(event.key==='Enter')standupTracker.addItem('${this.escapeHtml(member)}','today')">
              <div class="standup-items">
                ${standup.today.map((item, i) => `
                  <div class="standup-item">
                    <span class="item-text">${this.escapeHtml(item)}</span>
                    <button class="item-delete" onclick="standupTracker.removeItem('${this.escapeHtml(member)}','today',${i})"></button>
                  </div>
                `).join('')}
              </div>
            </div>
            <div class="standup-column">
              <div class="column-title blocker">블로커</div>
              <input type="text" class="standup-input" id="input-${sanitizedId}-blockers"
                     placeholder="장애물..."
                     onkeypress="if(event.key==='Enter')standupTracker.addItem('${this.escapeHtml(member)}','blockers')">
              <div class="standup-items">
                ${standup.blockers.map((item, i) => `
                  <div class="standup-item blocker-item">
                    <span class="item-text">${this.escapeHtml(item)}</span>
                    <button class="item-delete" onclick="standupTracker.removeItem('${this.escapeHtml(member)}','blockers',${i})"></button>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // 요약 업데이트
    this.elements.completedCount.textContent = totalYesterday;
    this.elements.plannedCount.textContent = totalToday;
    this.elements.blockerCount.textContent = totalBlockers;
  }

  exportMarkdown() {
    const date = this.getCurrentDate();
    const formattedDate = new Date(date).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });

    let md = `# 데일리 스탠드업\n\n`;
    md += `**날짜**: ${formattedDate}\n\n`;

    this.members.forEach(member => {
      const standup = this.getStandup(date, member);
      md += `## ${member}\n\n`;

      md += `### 어제 한 일\n`;
      if (standup.yesterday.length === 0) {
        md += `- (없음)\n`;
      } else {
        standup.yesterday.forEach(item => {
          md += `- ${item}\n`;
        });
      }
      md += `\n`;

      md += `### 오늘 할 일\n`;
      if (standup.today.length === 0) {
        md += `- (없음)\n`;
      } else {
        standup.today.forEach(item => {
          md += `- ${item}\n`;
        });
      }
      md += `\n`;

      if (standup.blockers.length > 0) {
        md += `### 블로커\n`;
        standup.blockers.forEach(item => {
          md += `- ${item}\n`;
        });
        md += `\n`;
      }
    });

    md += `---\n`;
    md += `*MyMind3 스탠드업 트래커로 작성됨*\n`;

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `standup_${date}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  copyStandup() {
    const date = this.getCurrentDate();
    const formattedDate = new Date(date).toLocaleDateString('ko-KR');

    let text = `데일리 스탠드업 - ${formattedDate}\n\n`;

    this.members.forEach(member => {
      const standup = this.getStandup(date, member);
      text += `${member}\n`;

      text += `  어제: `;
      text += standup.yesterday.length > 0 ? standup.yesterday.join(', ') : '(없음)';
      text += `\n`;

      text += `  오늘: `;
      text += standup.today.length > 0 ? standup.today.join(', ') : '(없음)';
      text += `\n`;

      if (standup.blockers.length > 0) {
        text += `  블로커: ${standup.blockers.join(', ')}\n`;
      }
      text += `\n`;
    });

    this.copyToClipboard(text);
  }

  showHistory() {
    // 날짜별로 그룹화
    const dates = [...new Set(Object.keys(this.standups).map(key => key.split('_')[0]))];
    dates.sort().reverse();

    if (dates.length === 0) {
      this.elements.historyList.innerHTML = '<p style="text-align:center;color:var(--tools-text-secondary)">기록이 없습니다.</p>';
    } else {
      this.elements.historyList.innerHTML = dates.map(date => {
        const formattedDate = new Date(date).toLocaleDateString('ko-KR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          weekday: 'short'
        });

        let memberCount = 0;
        let totalItems = 0;
        this.members.forEach(member => {
          const standup = this.standups[`${date}_${member}`];
          if (standup) {
            const count = standup.yesterday.length + standup.today.length + standup.blockers.length;
            if (count > 0) {
              memberCount++;
              totalItems += count;
            }
          }
        });

        return `
          <div class="history-item" onclick="standupTracker.setDate('${date}');standupTracker.closeHistory()">
            <div class="history-date">${formattedDate}</div>
            <div class="history-summary">${memberCount}명 참여 · ${totalItems}개 항목</div>
          </div>
        `;
      }).join('');
    }

    this.elements.historyModal.classList.add('show');
  }

  closeHistory(event) {
    if (event && event.target !== event.currentTarget) return;
    this.elements.historyModal.classList.remove('show');
  }

  clearDay() {
    const date = this.getCurrentDate();
    if (!confirm(`${date}의 모든 기록을 삭제하시겠습니까?`)) return;

    this.members.forEach(member => {
      const key = `${date}_${member}`;
      delete this.standups[key];
    });

    this.saveToStorage();
    this.render();
  }

  saveToStorage() {
    const data = {
      members: this.members,
      standups: this.standups
    };
    localStorage.setItem(this.storageKey, JSON.stringify(data));
  }

  loadFromStorage() {
    const saved = localStorage.getItem(this.storageKey);
    if (saved) {
      const data = JSON.parse(saved);
      this.members = data.members || [];
      this.standups = data.standups || {};
    }
  }

  escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}

// 전역 인스턴스 생성
const standupTracker = new StandupTracker();
window.StandupTracker = standupTracker;

// 전역 함수 (HTML onclick 호환)
function addMember() { standupTracker.addMember(); }
function goToday() { standupTracker.goToday(); }
function prevDay() { standupTracker.prevDay(); }
function nextDay() { standupTracker.nextDay(); }
function loadDay() { standupTracker.loadDay(); }
function exportMarkdown() { standupTracker.exportMarkdown(); }
function copyToClipboard() { standupTracker.copyStandup(); }
function showHistory() { standupTracker.showHistory(); }
function closeHistory(event) { standupTracker.closeHistory(event); }
function clearDay() { standupTracker.clearDay(); }

document.addEventListener('DOMContentLoaded', () => standupTracker.init());
