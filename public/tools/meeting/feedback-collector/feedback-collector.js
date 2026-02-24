/**
 * 피드백 수집기 - ToolBase 기반
 * 익명 피드백 수집 및 분석
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var FeedbackCollector = class FeedbackCollector extends ToolBase {
  constructor() {
    super('FeedbackCollector');
    this.ratings = [];
    this.responses = [];
    this.currentRatings = {};
    this.storageKey = 'feedbackCollector_data';

    this.templates = {
      meeting: {
        title: '회의 피드백',
        description: '이번 회의에 대한 의견을 공유해주세요',
        items: ['회의 진행', '시간 관리', '참여도', '결과물']
      },
      presentation: {
        title: '발표 평가',
        description: '발표에 대한 피드백을 남겨주세요',
        items: ['내용 전달력', '자료 품질', '시간 준수', '질의응답']
      },
      workshop: {
        title: '워크샵 평가',
        description: '워크샵에 대한 의견을 공유해주세요',
        items: ['학습 효과', '참여 활동', '진행자 역량', '전반적 만족도']
      },
      team: {
        title: '팀 평가',
        description: '팀 활동에 대한 피드백을 남겨주세요',
        items: ['협업 수준', '의사소통', '목표 달성', '팀 분위기']
      }
    };
  }

  init() {
    this.initElements({
      surveyTitle: 'surveyTitle',
      surveyDesc: 'surveyDesc',
      ratingItems: 'ratingItems',
      surveyTitleDisplay: 'surveyTitleDisplay',
      ratingSections: 'ratingSections',
      feedbackText: 'feedbackText',
      totalResponses: 'totalResponses',
      ratingResults: 'ratingResults',
      feedbackList: 'feedbackList'
    });

    // 기본 템플릿 로드
    this.useTemplate('meeting');
    this.loadFromStorage();
    this.render();

    console.log('[FeedbackCollector] 초기화 완료');
    return this;
  }

  switchTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.tab === tabId) btn.classList.add('active');
    });

    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });
    document.getElementById(`${tabId}Tab`).classList.add('active');

    if (tabId === 'results') {
      this.renderResults();
    }
  }

  useTemplate(templateId) {
    const template = this.templates[templateId];
    if (!template) return;

    this.elements.surveyTitle.value = template.title;
    this.elements.surveyDesc.value = template.description;

    this.ratings = template.items.map((item, index) => ({
      id: index,
      label: item
    }));

    this.renderRatingItems();
    this.applySettings();
  }

  addRatingItem() {
    const newId = this.ratings.length > 0 ? Math.max(...this.ratings.map(r => r.id)) + 1 : 0;
    this.ratings.push({ id: newId, label: '새 항목' });
    this.renderRatingItems();
  }

  removeRatingItem(id) {
    if (this.ratings.length <= 1) {
      this.showToast('최소 1개의 평점 항목이 필요합니다.', 'error');
      return;
    }
    this.ratings = this.ratings.filter(r => r.id !== id);
    this.renderRatingItems();
  }

  renderRatingItems() {
    this.elements.ratingItems.innerHTML = this.ratings.map(item => `
      <div class="rating-item-setup">
        <input type="text" value="${this.escapeHtml(item.label)}"
               onchange="feedbackCollector.updateRatingLabel(${item.id}, this.value)">
        <button class="remove-rating-btn" onclick="feedbackCollector.removeRatingItem(${item.id})"></button>
      </div>
    `).join('');
  }

  updateRatingLabel(id, label) {
    const item = this.ratings.find(r => r.id === id);
    if (item) item.label = label;
  }

  applySettings() {
    // 타이틀 업데이트
    const title = this.elements.surveyTitle.value;
    const desc = this.elements.surveyDesc.value;

    this.elements.surveyTitleDisplay.innerHTML = `
      <h2>${this.escapeHtml(title)}</h2>
      <p class="survey-description">${this.escapeHtml(desc)}</p>
    `;

    // 평점 섹션 렌더링
    this.render();
    this.switchTab('collect');
  }

  render() {
    this.currentRatings = {};

    this.elements.ratingSections.innerHTML = this.ratings.map(item => {
      this.currentRatings[item.id] = 0;
      return `
        <div class="rating-item">
          <div class="rating-label">${this.escapeHtml(item.label)}</div>
          <div class="star-rating" data-rating-id="${item.id}">
            ${[1, 2, 3, 4, 5].map(star => `
              <button class="star-btn" data-star="${star}" onclick="feedbackCollector.setRating(${item.id}, ${star})"></button>
            `).join('')}
            <span class="rating-value" id="rating-value-${item.id}">0</span>
          </div>
        </div>
      `;
    }).join('');
  }

  setRating(itemId, value) {
    this.currentRatings[itemId] = value;

    // 별 업데이트
    const container = document.querySelector(`[data-rating-id="${itemId}"]`);
    container.querySelectorAll('.star-btn').forEach(btn => {
      const star = parseInt(btn.dataset.star);
      btn.classList.toggle('active', star <= value);
    });

    document.getElementById(`rating-value-${itemId}`).textContent = value;
  }

  submitFeedback() {
    // 모든 평점이 입력되었는지 확인
    const unrated = this.ratings.filter(r => !this.currentRatings[r.id]);
    if (unrated.length > 0) {
      this.showToast('모든 항목에 평점을 입력해주세요.', 'error');
      return;
    }

    const feedback = {
      id: Date.now(),
      ratings: { ...this.currentRatings },
      text: this.elements.feedbackText.value.trim(),
      createdAt: new Date().toISOString()
    };

    this.responses.push(feedback);
    this.saveToStorage();

    // 초기화
    this.ratings.forEach(item => {
      this.currentRatings[item.id] = 0;
      const container = document.querySelector(`[data-rating-id="${item.id}"]`);
      container.querySelectorAll('.star-btn').forEach(btn => {
        btn.classList.remove('active');
      });
      document.getElementById(`rating-value-${item.id}`).textContent = '0';
    });
    this.elements.feedbackText.value = '';

    this.showToast('피드백이 제출되었습니다. 감사합니다!', 'success');
  }

  renderResults() {
    this.elements.totalResponses.textContent = this.responses.length;

    // 평점 결과
    if (this.responses.length === 0) {
      this.elements.ratingResults.innerHTML = '<div class="no-feedback">아직 수집된 피드백이 없습니다.</div>';
    } else {
      this.elements.ratingResults.innerHTML = this.ratings.map(item => {
        const scores = this.responses.map(r => r.ratings[item.id] || 0);
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
        const percentage = (avg / 5) * 100;
        const filledStars = Math.round(avg);

        return `
          <div class="result-item">
            <div class="result-header">
              <span class="result-label">${this.escapeHtml(item.label)}</span>
              <span class="result-score">${avg.toFixed(1)}</span>
            </div>
            <div class="result-bar-container">
              <div class="result-bar" style="width: ${percentage}%"></div>
            </div>
            <div class="result-stars">
              ${[1, 2, 3, 4, 5].map(star => `
                <span class="result-star ${star <= filledStars ? 'filled' : ''}"></span>
              `).join('')}
            </div>
          </div>
        `;
      }).join('');
    }

    // 텍스트 피드백
    const textFeedbacks = this.responses.filter(r => r.text);

    if (textFeedbacks.length === 0) {
      this.elements.feedbackList.innerHTML = '<div class="no-feedback">추가 의견이 없습니다.</div>';
    } else {
      this.elements.feedbackList.innerHTML = textFeedbacks.map(feedback => {
        const time = new Date(feedback.createdAt).toLocaleString('ko-KR');
        return `
          <div class="feedback-item">
            <div class="feedback-text">${this.escapeHtml(feedback.text)}</div>
            <div class="feedback-time">${time}</div>
          </div>
        `;
      }).join('');
    }
  }

  exportResults() {
    if (this.responses.length === 0) {
      this.showToast('내보낼 데이터가 없습니다.', 'error');
      return;
    }

    const title = this.elements.surveyTitle.value;
    const date = new Date().toLocaleDateString('ko-KR');

    let md = `# ${title} 결과\n\n`;
    md += `**날짜**: ${date}\n`;
    md += `**응답 수**: ${this.responses.length}명\n\n`;

    md += `## 평점 결과\n\n`;
    this.ratings.forEach(item => {
      const scores = this.responses.map(r => r.ratings[item.id] || 0);
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      const stars = ''.repeat(Math.round(avg)) + ''.repeat(5 - Math.round(avg));
      md += `- **${item.label}**: ${avg.toFixed(1)} ${stars}\n`;
    });

    const textFeedbacks = this.responses.filter(r => r.text);
    if (textFeedbacks.length > 0) {
      md += `\n## 추가 의견\n\n`;
      textFeedbacks.forEach(f => {
        md += `- ${f.text}\n`;
      });
    }

    md += `\n---\n`;
    md += `*MyMind3 피드백 수집기로 작성됨*\n`;

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `feedback_${date}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  copyResults() {
    if (this.responses.length === 0) {
      this.showToast('복사할 데이터가 없습니다.', 'error');
      return;
    }

    const title = this.elements.surveyTitle.value;
    let text = `${title} 결과 (${this.responses.length}명 응답)\n\n`;

    this.ratings.forEach(item => {
      const scores = this.responses.map(r => r.ratings[item.id] || 0);
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      text += `${item.label}: ${avg.toFixed(1)}/5.0\n`;
    });

    const textFeedbacks = this.responses.filter(r => r.text);
    if (textFeedbacks.length > 0) {
      text += `\n추가 의견:\n`;
      textFeedbacks.forEach(f => {
        text += `• ${f.text}\n`;
      });
    }

    this.copyToClipboard(text);
  }

  clearResults() {
    if (this.responses.length === 0) {
      this.showToast('삭제할 데이터가 없습니다.', 'error');
      return;
    }

    if (!confirm(`${this.responses.length}개의 응답을 모두 삭제하시겠습니까?`)) return;

    this.responses = [];
    this.saveToStorage();
    this.renderResults();
  }

  saveToStorage() {
    const data = {
      ratings: this.ratings,
      responses: this.responses,
      title: this.elements.surveyTitle.value,
      desc: this.elements.surveyDesc.value
    };
    localStorage.setItem(this.storageKey, JSON.stringify(data));
  }

  loadFromStorage() {
    const saved = localStorage.getItem(this.storageKey);
    if (saved) {
      const data = JSON.parse(saved);
      if (data.ratings) this.ratings = data.ratings;
      if (data.responses) this.responses = data.responses;
      if (data.title) this.elements.surveyTitle.value = data.title;
      if (data.desc) this.elements.surveyDesc.value = data.desc;

      this.renderRatingItems();
      this.applySettings();
    }
  }

  escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}

// 전역 인스턴스 생성
const feedbackCollector = new FeedbackCollector();
window.FeedbackCollector = feedbackCollector;

// 전역 함수 (HTML onclick 호환)
function switchTab(tabId) { feedbackCollector.switchTab(tabId); }
function useTemplate(templateId) { feedbackCollector.useTemplate(templateId); }
function addRatingItem() { feedbackCollector.addRatingItem(); }
function applySettings() { feedbackCollector.applySettings(); }
function submitFeedback() { feedbackCollector.submitFeedback(); }
function exportResults() { feedbackCollector.exportResults(); }
function copyResults() { feedbackCollector.copyResults(); }
function clearResults() { feedbackCollector.clearResults(); }

document.addEventListener('DOMContentLoaded', () => feedbackCollector.init());
