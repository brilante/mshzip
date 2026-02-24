/**
 * 이메일 제목 테스터 - ToolBase 기반
 * 이메일 오픈율 최적화
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var EmailSubjectTester = class EmailSubjectTester extends ToolBase {
  constructor() {
    super('EmailSubjectTester');
    this.spamWords = ['무료', '공짜', '당첨', '100%', '보장', '긴급', '지금 당장', '특별 제안', '돈 버는', '수익', '달러', '클릭하세요', '여기를 클릭'];
    this.powerWords = ['독점', '새로운', '한정', '마지막', '오늘만', '비밀', '발표', '중요'];
  }

  init() {
    this.initElements({
      senderName: 'senderName',
      subject: 'subject',
      preheader: 'preheader',
      charCount: 'charCount',
      previewFrom: 'previewFrom',
      previewSubject: 'previewSubject',
      previewSnippet: 'previewSnippet',
      result: 'result'
    });

    console.log('[EmailSubjectTester] 초기화 완료');
    return this;
  }

  updatePreview() {
    const sender = this.elements.senderName.value || '발신자';
    const subject = this.elements.subject.value || '제목이 여기에 표시됩니다';
    const preheader = this.elements.preheader.value || '프리헤더 텍스트...';

    this.elements.charCount.textContent = this.elements.subject.value.length;
    this.elements.previewFrom.textContent = sender;
    this.elements.previewSubject.textContent = subject;
    this.elements.previewSnippet.textContent = preheader;
  }

  analyze() {
    const subject = this.elements.subject.value.trim();
    const preheader = this.elements.preheader.value.trim();

    if (!subject) {
      this.showToast('이메일 제목을 입력해주세요', 'error');
      return;
    }

    const checks = this.runChecks(subject, preheader);
    const score = this.calculateScore(checks);
    const predictedOpenRate = this.predictOpenRate(score);

    this.showResult(score, predictedOpenRate, checks);
  }

  runChecks(subject, preheader) {
    const checks = [];

    // 길이 체크
    checks.push({
      name: '적절한 길이 (30-50자)',
      pass: subject.length >= 30 && subject.length <= 50,
      detail: `현재 ${subject.length}자`
    });

    // 스팸 단어 체크
    const foundSpam = this.spamWords.filter(w => subject.toLowerCase().includes(w.toLowerCase()));
    checks.push({
      name: '스팸 필터 회피',
      pass: foundSpam.length === 0,
      detail: foundSpam.length > 0 ? `스팸 의심 단어: ${foundSpam.join(', ')}` : '스팸 단어 없음'
    });

    // 대문자 과다 체크
    const upperRatio = (subject.match(/[A-Z]/g) || []).length / subject.length;
    checks.push({
      name: '대문자 적정 사용',
      pass: upperRatio < 0.3,
      detail: upperRatio >= 0.3 ? '대문자가 너무 많습니다' : '적정 수준'
    });

    // 특수문자 체크
    const specialChars = (subject.match(/[!@#$%^&*(){}[\]]/g) || []).length;
    checks.push({
      name: '특수문자 제한',
      pass: specialChars <= 1,
      detail: specialChars > 1 ? `특수문자 ${specialChars}개 발견` : '적정 수준'
    });

    // 이모지 체크 (적절한 사용)
    const emojiCount = (subject.match(/[\u{1F300}-\u{1F9FF}]/gu) || []).length;
    checks.push({
      name: '이모지 적정 사용',
      pass: emojiCount <= 2,
      detail: emojiCount > 0 ? `이모지 ${emojiCount}개` : '이모지 없음'
    });

    // 개인화 요소
    const hasPersonalization = /\[이름\]|\{name\}|{{.*}}|님/.test(subject);
    checks.push({
      name: '개인화 요소',
      pass: hasPersonalization,
      detail: hasPersonalization ? '개인화 토큰 포함' : '개인화 없음 (추가 권장)'
    });

    // 긴급성/희소성
    const hasUrgency = /오늘|지금|마지막|한정|마감|종료|D-/.test(subject);
    checks.push({
      name: '긴급성/희소성',
      pass: hasUrgency,
      detail: hasUrgency ? '긴급성 요소 포함' : '긴급성 없음'
    });

    // 프리헤더 체크
    checks.push({
      name: '프리헤더 텍스트',
      pass: preheader.length >= 40,
      detail: preheader.length > 0 ? `${preheader.length}자` : '프리헤더 없음 (추가 권장)'
    });

    return checks;
  }

  calculateScore(checks) {
    const passed = checks.filter(c => c.pass).length;
    return Math.round((passed / checks.length) * 100);
  }

  predictOpenRate(score) {
    // 점수에 따른 예상 오픈율 (15-30% 범위)
    return 15 + (score / 100) * 15;
  }

  getResultClass(score) {
    if (score >= 80) return 'excellent';
    if (score >= 60) return 'good';
    if (score >= 40) return 'average';
    return 'poor';
  }

  getResultLabel(score) {
    if (score >= 80) return '우수';
    if (score >= 60) return '좋음';
    if (score >= 40) return '보통';
    return '개선 필요';
  }

  showResult(score, openRate, checks) {
    const resultClass = this.getResultClass(score);
    const passedCount = checks.filter(c => c.pass).length;

    this.elements.result.innerHTML = `
      <div class="result-card result-${resultClass}">
        <div style="font-size: 2.5rem; font-weight: 700;">${score}점</div>
        <div style="font-size: 1rem; opacity: 0.9;">${this.getResultLabel(score)}</div>

        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-value">${openRate.toFixed(1)}%</div>
            <div class="metric-label">예상 오픈율</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${passedCount}/${checks.length}</div>
            <div class="metric-label">체크 통과</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${this.elements.subject.value.length}</div>
            <div class="metric-label">문자 수</div>
          </div>
        </div>
      </div>

      <div class="checklist">
        <div style="font-weight: 600; margin-bottom: 0.75rem;">체크리스트</div>
        ${checks.map(c => `
          <div class="checklist-item">
            <span class="${c.pass ? 'check-pass' : 'check-fail'}">${c.pass ? '' : ''}</span>
            <span style="flex: 1;">${c.name}</span>
            <span style="font-size: 0.8rem; color: var(--text-secondary);">${c.detail}</span>
          </div>
        `).join('')}
      </div>

      <div style="margin-top: 1rem; background: var(--bg-primary); border-radius: 8px; padding: 1rem; font-size: 0.85rem;">
        <strong>팁:</strong> 이메일 제목은 30-50자가 최적이며, 모바일에서 잘리지 않도록 핵심 내용을 앞에 배치하세요.
      </div>
    `;
  }
}

// 전역 인스턴스 생성
const emailSubjectTester = new EmailSubjectTester();
window.EmailSubjectTester = emailSubjectTester;

// 전역 함수 (HTML onclick 호환)
function analyze() { emailSubjectTester.analyze(); }
function updatePreview() { emailSubjectTester.updatePreview(); }

document.addEventListener('DOMContentLoaded', () => emailSubjectTester.init());
