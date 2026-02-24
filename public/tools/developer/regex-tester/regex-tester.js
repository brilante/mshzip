/**
 * 정규식 테스터 도구 - ToolBase 기반
 * 정규표현식 패턴 테스트 및 매칭 확인
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var RegexTester = class RegexTester extends ToolBase {
  constructor() {
    super('RegexTester');
    this.commonPatterns = [
      { name: '이메일', pattern: '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}', desc: 'user@example.com' },
      { name: '전화번호 (한국)', pattern: '0\\d{1,2}-\\d{3,4}-\\d{4}', desc: '010-1234-5678' },
      { name: 'URL', pattern: 'https?://[\\w\\-._~:/?#[\\]@!$&\'()*+,;=%]+', desc: 'https://example.com' },
      { name: 'IPv4', pattern: '(?:(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\.){3}(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)', desc: '192.168.0.1' },
      { name: 'HTML 태그', pattern: '<([a-z]+)[^>]*>.*?</\\1>|<[a-z]+[^>]*/?>', desc: '<div>...</div>' },
      { name: '16진수 색상', pattern: '#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})', desc: '#ff5733, #fff' },
      { name: '날짜 (YYYY-MM-DD)', pattern: '\\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\\d|3[01])', desc: '2026-01-12' },
      { name: '시간 (HH:MM)', pattern: '(?:[01]\\d|2[0-3]):[0-5]\\d', desc: '14:30' },
      { name: '숫자만', pattern: '\\d+', desc: '123, 4567' },
      { name: '한글만', pattern: '[가-힣]+', desc: '한글문자열' },
      { name: '영문자만', pattern: '[a-zA-Z]+', desc: 'Hello' },
      { name: '공백 제거', pattern: '^\\s+|\\s+$', desc: '앞뒤 공백' }
    ];
  }

  init() {
    this.initElements({
      patternInput: 'regexPattern',
      flagsInput: 'regexFlags',
      testInput: 'testString',
      matchCount: 'matchCount',
      matchesResult: 'matchesResult',
      groupsSection: 'groupsSection',
      groupsResult: 'groupsResult',
      regexError: 'regexError',
      highlightOverlay: 'highlightOverlay',
      patternsGrid: 'patternsGrid',
      flagG: 'flagG',
      flagI: 'flagI',
      flagM: 'flagM',
      flagS: 'flagS',
      flagU: 'flagU'
    });

    // 패턴 라이브러리 생성
    this.createPatternLibrary();

    // 키보드 단축키
    this.on(document, 'keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        this.testRegex();
      }
    });

    console.log('[RegexTester] 초기화 완료');
    return this;
  }

  createPatternLibrary() {
    const grid = this.elements.patternsGrid;
    grid.innerHTML = '';

    this.commonPatterns.forEach(item => {
      const card = document.createElement('button');
      card.className = 'pattern-card';
      card.innerHTML = `
        <div class="pattern-name">${item.name}</div>
        <div class="pattern-desc">${item.desc}</div>
      `;
      card.onclick = () => this.applyPattern(item.pattern);
      card.title = item.pattern;
      grid.appendChild(card);
    });
  }

  applyPattern(pattern) {
    this.elements.patternInput.value = pattern;
    this.onPatternChange();
    this.elements.testInput.focus();
  }

  updateFlags() {
    let flags = '';
    if (this.elements.flagG.checked) flags += 'g';
    if (this.elements.flagI.checked) flags += 'i';
    if (this.elements.flagM.checked) flags += 'm';
    if (this.elements.flagS.checked) flags += 's';
    if (this.elements.flagU.checked) flags += 'u';

    this.elements.flagsInput.value = flags;
    this.testRegex();
  }

  syncFlagCheckboxes(flags) {
    this.elements.flagG.checked = flags.includes('g');
    this.elements.flagI.checked = flags.includes('i');
    this.elements.flagM.checked = flags.includes('m');
    this.elements.flagS.checked = flags.includes('s');
    this.elements.flagU.checked = flags.includes('u');
  }

  onPatternChange() {
    const flags = this.elements.flagsInput.value;
    this.syncFlagCheckboxes(flags);
    this.testRegex();
  }

  onTestChange() {
    this.testRegex();
  }

  testRegex() {
    const pattern = this.elements.patternInput.value;
    const flags = this.elements.flagsInput.value;
    const testString = this.elements.testInput.value;

    if (!pattern) {
      this.clearResults();
      this.hideError();
      return;
    }

    let regex;
    try {
      regex = new RegExp(pattern, flags);
      this.hideError();
    } catch (e) {
      this.showRegexError(e.message);
      this.clearResults();
      return;
    }

    if (!testString) {
      this.clearResults();
      this.elements.matchCount.textContent = '';
      return;
    }

    const matches = [];

    if (flags.includes('g')) {
      let match;
      while ((match = regex.exec(testString)) !== null) {
        matches.push({
          text: match[0],
          index: match.index,
          length: match[0].length,
          groups: match.slice(1)
        });

        if (match[0].length === 0) {
          regex.lastIndex++;
        }
      }
    } else {
      const match = regex.exec(testString);
      if (match) {
        matches.push({
          text: match[0],
          index: match.index,
          length: match[0].length,
          groups: match.slice(1)
        });
      }
    }

    this.displayResults(matches, testString);
    this.displayGroups(matches);
    this.highlightMatches(matches, testString);
    this.updateMatchCount(matches.length);
  }

  displayResults(matches, testString) {
    const container = this.elements.matchesResult;

    if (matches.length === 0) {
      container.innerHTML = '<div class="no-matches">매칭되는 항목이 없습니다.</div>';
      return;
    }

    let html = '<div class="matches-list">';
    matches.forEach((match, i) => {
      html += `
        <div class="match-item">
          <div class="match-header">
            <span class="match-number">#${i + 1}</span>
            <span class="match-position">위치: ${match.index} - ${match.index + match.length}</span>
          </div>
          <div class="match-text">${this.escapeHtml(match.text)}</div>
        </div>
      `;
    });
    html += '</div>';

    container.innerHTML = html;
  }

  displayGroups(matches) {
    const section = this.elements.groupsSection;
    const container = this.elements.groupsResult;

    const hasGroups = matches.some(m => m.groups && m.groups.length > 0);

    if (!hasGroups) {
      section.style.display = 'none';
      return;
    }

    section.style.display = 'block';

    let html = '<div class="groups-list">';
    matches.forEach((match, matchIdx) => {
      if (match.groups && match.groups.length > 0) {
        html += `<div class="group-match">`;
        html += `<div class="group-match-header">매칭 #${matchIdx + 1}</div>`;
        match.groups.forEach((group, groupIdx) => {
          if (group !== undefined) {
            html += `
              <div class="group-item">
                <span class="group-number">그룹 ${groupIdx + 1}:</span>
                <span class="group-value">${this.escapeHtml(group)}</span>
              </div>
            `;
          }
        });
        html += '</div>';
      }
    });
    html += '</div>';

    container.innerHTML = html;
  }

  highlightMatches(matches, testString) {
    const overlay = this.elements.highlightOverlay;

    if (matches.length === 0 || !testString) {
      overlay.innerHTML = '';
      return;
    }

    let highlighted = this.escapeHtml(testString);
    let offset = 0;

    const escapedPositions = this.calculateEscapedPositions(testString);

    matches.forEach((match, i) => {
      const colorClass = `highlight-${(i % 5) + 1}`;
      const startPos = escapedPositions[match.index];
      const endPos = escapedPositions[match.index + match.length] || highlighted.length;

      const before = highlighted.slice(0, startPos + offset);
      const matchText = highlighted.slice(startPos + offset, endPos + offset);
      const after = highlighted.slice(endPos + offset);

      const wrapper = `<mark class="${colorClass}">${matchText}</mark>`;
      highlighted = before + wrapper + after;
      offset += wrapper.length - matchText.length;
    });

    overlay.innerHTML = highlighted;
  }

  calculateEscapedPositions(str) {
    const positions = [];
    let escapedIndex = 0;

    for (let i = 0; i <= str.length; i++) {
      positions[i] = escapedIndex;
      if (i < str.length) {
        const char = str[i];
        if (char === '&') escapedIndex += 5;
        else if (char === '<') escapedIndex += 4;
        else if (char === '>') escapedIndex += 4;
        else if (char === '"') escapedIndex += 6;
        else escapedIndex += 1;
      }
    }

    return positions;
  }

  updateMatchCount(count) {
    this.elements.matchCount.textContent = count > 0 ? `${count}개 매칭` : '매칭 없음';
    this.elements.matchCount.className = 'match-count ' + (count > 0 ? 'has-matches' : 'no-match');
  }

  clearResults() {
    this.elements.matchesResult.innerHTML = '<div class="no-matches">정규식을 입력하고 테스트 문자열에서 매칭을 확인하세요.</div>';
    this.elements.groupsSection.style.display = 'none';
    this.elements.highlightOverlay.innerHTML = '';
    this.elements.matchCount.textContent = '';
  }

  showRegexError(message) {
    this.elements.regexError.textContent = '' + message;
    this.elements.regexError.style.display = 'block';
    this.elements.patternInput.classList.add('input-error');
  }

  hideError() {
    this.elements.regexError.style.display = 'none';
    this.elements.patternInput.classList.remove('input-error');
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  copyPattern() {
    const pattern = this.elements.patternInput.value;
    const flags = this.elements.flagsInput.value;
    const fullPattern = `/${pattern}/${flags}`;

    navigator.clipboard.writeText(fullPattern).then(() => {
      this.showSuccess('정규식이 복사되었습니다');
    });
  }

  copyMatches() {
    const matches = this.elements.matchesResult.querySelectorAll('.match-text');
    if (matches.length === 0) {
      this.showToast('복사할 매칭 결과가 없습니다', 'warning');
      return;
    }

    const text = Array.from(matches).map(el => el.textContent).join('\n');
    navigator.clipboard.writeText(text).then(() => {
      this.showSuccess('매칭 결과가 복사되었습니다');
    });
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const regexTester = new RegexTester();
window.RegexTester = regexTester;

document.addEventListener('DOMContentLoaded', () => regexTester.init());
