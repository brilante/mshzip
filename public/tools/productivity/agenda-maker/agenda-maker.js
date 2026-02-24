/**
 * 회의 안건 생성기 - ToolBase 기반
 * 체계적인 회의 안건 작성
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var AgendaMaker = class AgendaMaker extends ToolBase {
  constructor() {
    super('AgendaMaker');
    this._lastAgenda = null;
    this.templates = {
      regular: {
        name: '정기 회의',
        sections: [
          { title: '인사 및 출석 확인', percent: 5 },
          { title: '지난 회의 액션 아이템 확인', percent: 10 },
          { title: '주간 업무 보고', percent: 30 },
          { title: '이슈 및 논의 사항', percent: 35 },
          { title: '다음 주 계획', percent: 15 },
          { title: '마무리 및 Q&A', percent: 5 }
        ]
      },
      kickoff: {
        name: '프로젝트 킥오프',
        sections: [
          { title: '프로젝트 개요 소개', percent: 15 },
          { title: '목표 및 범위 정의', percent: 20 },
          { title: '팀 역할 및 책임', percent: 15 },
          { title: '일정 및 마일스톤', percent: 20 },
          { title: '리스크 및 의존성', percent: 15 },
          { title: '커뮤니케이션 계획', percent: 10 },
          { title: 'Q&A', percent: 5 }
        ]
      },
      review: {
        name: '리뷰/회고',
        sections: [
          { title: '진행 상황 리뷰', percent: 20 },
          { title: '잘된 점 (Keep)', percent: 20 },
          { title: '개선할 점 (Problem)', percent: 20 },
          { title: '시도할 것 (Try)', percent: 20 },
          { title: '액션 아이템 정리', percent: 15 },
          { title: '마무리', percent: 5 }
        ]
      },
      brainstorm: {
        name: '브레인스토밍',
        sections: [
          { title: '주제 소개 및 목표 설정', percent: 10 },
          { title: '아이디어 발산 (자유 발언)', percent: 35 },
          { title: '아이디어 그룹화', percent: 20 },
          { title: '우선순위 투표', percent: 15 },
          { title: '선정된 아이디어 논의', percent: 15 },
          { title: '다음 단계 정의', percent: 5 }
        ]
      },
      decision: {
        name: '의사결정',
        sections: [
          { title: '배경 및 현황 설명', percent: 15 },
          { title: '옵션 제시', percent: 20 },
          { title: '각 옵션 장단점 분석', percent: 25 },
          { title: '토론 및 질의응답', percent: 20 },
          { title: '의사결정', percent: 10 },
          { title: '실행 계획 수립', percent: 10 }
        ]
      }
    };
  }

  init() {
    this.initElements({
      meetingTitle: 'meetingTitle',
      meetingDate: 'meetingDate',
      meetingTime: 'meetingTime',
      meetingLocation: 'meetingLocation',
      totalMinutes: 'totalMinutes',
      attendees: 'attendees',
      meetingType: 'meetingType',
      result: 'result'
    });

    this.elements.meetingDate.valueAsDate = new Date();

    console.log('[AgendaMaker] 초기화 완료');
    return this;
  }

  generate() {
    const title = this.elements.meetingTitle.value.trim() || '회의';
    const date = this.elements.meetingDate.value;
    const time = this.elements.meetingTime.value;
    const location = this.elements.meetingLocation.value.trim() || '미정';
    const totalMinutes = parseInt(this.elements.totalMinutes.value) || 60;
    const attendees = this.elements.attendees.value.trim();
    const meetingType = this.elements.meetingType.value;

    const template = this.templates[meetingType];
    const agenda = this.buildAgenda(template, totalMinutes);

    this.showResult(title, date, time, location, attendees, template.name, agenda, totalMinutes);
  }

  buildAgenda(template, totalMinutes) {
    let currentTime = 0;
    return template.sections.map(section => {
      const minutes = Math.round(totalMinutes * section.percent / 100);
      const startTime = currentTime;
      currentTime += minutes;
      return {
        title: section.title,
        minutes,
        startTime
      };
    });
  }

  formatTime(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h > 0) {
      return `${h}시간 ${m}분`;
    }
    return `${m}분`;
  }

  showResult(title, date, time, location, attendees, typeName, agenda, totalMinutes) {
    const formattedDate = date ? new Date(date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }) : '미정';

    this.elements.result.innerHTML = `
      <div class="agenda-preview">
        <div class="agenda-header">
          <div class="agenda-title">${title}</div>
          <div class="agenda-meta">
            ${formattedDate} ${time} | ${location} | 총 ${this.formatTime(totalMinutes)}
          </div>
          ${attendees ? `<div class="agenda-meta">참석자: ${attendees}</div>` : ''}
          <div class="agenda-meta" style="margin-top: 0.5rem;">유형: ${typeName}</div>
        </div>

        ${agenda.map((item, idx) => `
          <div class="agenda-section">
            <div class="agenda-section-title">
              <span>${idx + 1}.</span>
              <span>${item.title}</span>
              <span class="time-badge">${item.minutes}분</span>
            </div>
            <div class="agenda-item">
              <input type="text" class="tool-input" placeholder="세부 내용 입력..." style="font-size: 0.9rem;">
            </div>
          </div>
        `).join('')}

        <div style="margin-top: 1.5rem; display: flex; gap: 0.5rem;">
          <button class="tool-btn tool-btn-primary" onclick="agendaMaker.copy()">텍스트 복사</button>
          <button class="tool-btn tool-btn-secondary" onclick="agendaMaker.download()">다운로드</button>
        </div>
      </div>
    `;

    this._lastAgenda = { title, date, time, location, attendees, typeName, agenda, totalMinutes };
  }

  copy() {
    if (!this._lastAgenda) return;
    const { title, date, time, location, attendees, agenda, totalMinutes } = this._lastAgenda;

    let text = `${title}\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `일시: ${date} ${time}\n`;
    text += `장소: ${location}\n`;
    text += `시간: ${this.formatTime(totalMinutes)}\n`;
    if (attendees) text += `참석자: ${attendees}\n`;
    text += `\n【 회의 안건 】\n\n`;

    agenda.forEach((item, idx) => {
      text += `${idx + 1}. ${item.title} (${item.minutes}분)\n`;
    });

    this.copyToClipboard(text);
  }

  download() {
    if (!this._lastAgenda) return;
    const { title, date } = this._lastAgenda;

    const text = this.generateMarkdown();
    const blob = new Blob([text], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title}_${date || 'agenda'}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  generateMarkdown() {
    if (!this._lastAgenda) return '';
    const { title, date, time, location, attendees, typeName, agenda, totalMinutes } = this._lastAgenda;

    let md = `# ${title}\n\n`;
    md += `## 회의 정보\n\n`;
    md += `- **일시**: ${date} ${time}\n`;
    md += `- **장소**: ${location}\n`;
    md += `- **시간**: ${this.formatTime(totalMinutes)}\n`;
    md += `- **유형**: ${typeName}\n`;
    if (attendees) md += `- **참석자**: ${attendees}\n`;
    md += `\n## 안건\n\n`;

    agenda.forEach((item, idx) => {
      md += `### ${idx + 1}. ${item.title} (${item.minutes}분)\n\n`;
      md += `- [ ] 세부 내용\n\n`;
    });

    md += `## 액션 아이템\n\n`;
    md += `| 담당자 | 내용 | 기한 |\n`;
    md += `|--------|------|------|\n`;
    md += `|        |      |      |\n`;

    return md;
  }
}

// 전역 인스턴스 생성
const agendaMaker = new AgendaMaker();
window.AgendaMaker = agendaMaker;

// 전역 함수 (HTML onclick 호환)
function generate() { agendaMaker.generate(); }

document.addEventListener('DOMContentLoaded', () => agendaMaker.init());
