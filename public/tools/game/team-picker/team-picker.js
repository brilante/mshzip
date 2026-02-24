/**
 * 팀 뽑기 - ToolBase 기반
 * 참가자를 팀으로 랜덤 배분
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class TeamPicker extends ToolBase {
  constructor() {
    super('TeamPicker');
    this.members = [];
    this.teams = [];
    this.history = JSON.parse(localStorage.getItem('teamHistory') || '[]');
    this.teamColors = [
      { color: '#e74c3c', dark: '#c0392b' },
      { color: '#3498db', dark: '#2980b9' },
      { color: '#2ecc71', dark: '#27ae60' },
      { color: '#f39c12', dark: '#e67e22' },
      { color: '#9b59b6', dark: '#8e44ad' },
      { color: '#1abc9c', dark: '#16a085' },
      { color: '#34495e', dark: '#2c3e50' },
      { color: '#e67e22', dark: '#d35400' }
    ];
  }

  init() {
    this.initElements({
      memberInput: 'memberInput',
      addMemberBtn: 'addMemberBtn',
      bulkInput: 'bulkInput',
      bulkAddBtn: 'bulkAddBtn',
      clearMembersBtn: 'clearMembersBtn',
      membersTags: 'membersTags',
      memberCount: 'memberCount',
      teamCount: 'teamCount',
      teamSize: 'teamSize',
      shuffleBtn: 'shuffleBtn',
      reshuffleBtn: 'reshuffleBtn',
      copyResultBtn: 'copyResultBtn',
      teamsContainer: 'teamsContainer',
      resultSection: 'resultSection',
      historyList: 'historyList'
    });

    this.setupEvents();
    this.renderHistory();

    console.log('[TeamPicker] 초기화 완료');
    return this;
  }

  setupEvents() {
    // 입력
    this.elements.addMemberBtn.addEventListener('click', () => this.addMember());
    this.elements.memberInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.addMember();
    });
    this.elements.bulkAddBtn.addEventListener('click', () => this.bulkAdd());
    this.elements.clearMembersBtn.addEventListener('click', () => this.clearMembers());

    // 설정
    document.querySelectorAll('input[name="teamMode"]').forEach(radio => {
      radio.addEventListener('change', () => this.updateModeInputs());
    });

    // 셔플
    this.elements.shuffleBtn.addEventListener('click', () => this.shuffle());
    this.elements.reshuffleBtn.addEventListener('click', () => this.shuffle());
    this.elements.copyResultBtn.addEventListener('click', () => this.copyResult());
  }

  addMember() {
    const name = this.elements.memberInput.value.trim();

    if (name && !this.members.includes(name)) {
      this.members.push(name);
      this.renderMembers();
      this.elements.memberInput.value = '';
      this.elements.memberInput.focus();
    }
  }

  bulkAdd() {
    const text = this.elements.bulkInput.value.trim();

    if (text) {
      const names = text.split(/[,\n]/).map(n => n.trim()).filter(n => n);
      names.forEach(name => {
        if (!this.members.includes(name)) {
          this.members.push(name);
        }
      });
      this.renderMembers();
      this.elements.bulkInput.value = '';
    }
  }

  removeMember(index) {
    this.members.splice(index, 1);
    this.renderMembers();
  }

  clearMembers() {
    if (confirm('모든 참가자를 삭제하시겠습니까?')) {
      this.members = [];
      this.renderMembers();
      this.elements.resultSection.style.display = 'none';
    }
  }

  renderMembers() {
    this.elements.memberCount.textContent = this.members.length;

    this.elements.membersTags.innerHTML = this.members.map((name, i) => `
      <span class="member-tag">
        ${this.escapeHtml(name)}
        <button onclick="teamPicker.removeMember(${i})">&times;</button>
      </span>
    `).join('');
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  updateModeInputs() {
    const mode = document.querySelector('input[name="teamMode"]:checked').value;
    this.elements.teamCount.disabled = mode !== 'count';
    this.elements.teamSize.disabled = mode !== 'size';
  }

  shuffle() {
    if (this.members.length < 2) {
      alert('최소 2명 이상의 참가자가 필요합니다.');
      return;
    }

    const mode = document.querySelector('input[name="teamMode"]:checked').value;
    let numTeams;

    if (mode === 'count') {
      numTeams = parseInt(this.elements.teamCount.value) || 2;
    } else {
      const teamSize = parseInt(this.elements.teamSize.value) || 4;
      numTeams = Math.ceil(this.members.length / teamSize);
    }

    numTeams = Math.min(numTeams, this.members.length);

    // 셔플
    const shuffled = [...this.members].sort(() => Math.random() - 0.5);

    // 팀 분배
    this.teams = Array.from({ length: numTeams }, () => []);
    shuffled.forEach((member, i) => {
      this.teams[i % numTeams].push(member);
    });

    this.renderTeams();
    this.addToHistory();
    this.elements.resultSection.style.display = 'block';
  }

  renderTeams() {
    this.elements.teamsContainer.innerHTML = this.teams.map((team, i) => {
      const colors = this.teamColors[i % this.teamColors.length];
      return `
        <div class="team-card" style="--team-color:${colors.color};--team-color-dark:${colors.dark};animation-delay:${i * 0.1}s">
          <h4>팀 ${i + 1} (${team.length}명)</h4>
          <div class="team-members">
            ${team.map(m => `<div class="team-member">${this.escapeHtml(m)}</div>`).join('')}
          </div>
        </div>
      `;
    }).join('');
  }

  copyResult() {
    const text = this.teams.map((team, i) =>
      `팀 ${i + 1}: ${team.join(', ')}`
    ).join('\n');

    navigator.clipboard.writeText(text).then(() => {
      this.showToast('결과가 복사되었습니다!');
    });
  }

  addToHistory() {
    const entry = {
      teams: this.teams.map((team, i) => ({
        name: `팀 ${i + 1}`,
        members: [...team]
      })),
      time: new Date().toLocaleString()
    };

    this.history.unshift(entry);
    if (this.history.length > 10) this.history.pop();
    localStorage.setItem('teamHistory', JSON.stringify(this.history));
    this.renderHistory();
  }

  renderHistory() {
    this.elements.historyList.innerHTML = this.history.map(h => `
      <div class="history-item">
        <div class="time">${h.time}</div>
        <div class="teams-summary">
          ${h.teams.map(t => `${t.name}(${t.members.length}명)`).join(' | ')}
        </div>
      </div>
    `).join('');
  }
}

// 전역 인스턴스 생성
const teamPicker = new TeamPicker();
window.TeamPicker = teamPicker;

document.addEventListener('DOMContentLoaded', () => teamPicker.init());
