/**
 * 스킬 매칭 분석 도구 - ToolBase 기반
 * 채용 공고와 보유 스킬 비교
 * @created 2026-01-13
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var SkillMatcher = class SkillMatcher extends ToolBase {
  constructor() {
    super('SkillMatcher');
    // 일반적인 기술 키워드 매핑 (동의어 처리)
    this.skillAliases = {
      'js': 'javascript',
      'ts': 'typescript',
      'py': 'python',
      'node': 'nodejs',
      'node.js': 'nodejs',
      'react.js': 'react',
      'reactjs': 'react',
      'vue.js': 'vue',
      'vuejs': 'vue',
      'angular.js': 'angular',
      'angularjs': 'angular',
      'next.js': 'nextjs',
      'nuxt.js': 'nuxtjs',
      'express.js': 'express',
      'expressjs': 'express',
      'mongo': 'mongodb',
      'postgres': 'postgresql',
      'k8s': 'kubernetes',
      'gcp': 'google cloud',
      'amazon web services': 'aws',
      'ms azure': 'azure',
      'microsoft azure': 'azure'
    };

    // 공통 기술 키워드 목록
    this.techKeywords = [
      'javascript', 'typescript', 'python', 'java', 'kotlin', 'swift', 'go', 'golang', 'rust', 'c++', 'c#', 'ruby', 'php', 'scala',
      'react', 'vue', 'angular', 'svelte', 'nextjs', 'nuxtjs', 'gatsby',
      'nodejs', 'express', 'nestjs', 'fastapi', 'django', 'flask', 'spring', 'spring boot',
      'html', 'css', 'sass', 'less', 'tailwind', 'bootstrap', 'material ui',
      'mongodb', 'mysql', 'postgresql', 'redis', 'elasticsearch', 'dynamodb', 'firebase',
      'aws', 'azure', 'gcp', 'google cloud', 'docker', 'kubernetes', 'jenkins', 'ci/cd', 'github actions',
      'git', 'github', 'gitlab', 'bitbucket',
      'graphql', 'rest', 'api', 'microservices',
      'agile', 'scrum', 'jira', 'confluence',
      'figma', 'sketch', 'adobe xd', 'photoshop',
      'machine learning', 'deep learning', 'tensorflow', 'pytorch', 'ai', 'nlp',
      'linux', 'unix', 'windows server',
      'security', 'oauth', 'jwt', 'ssl'
    ];
  }

  init() {
    this.initElements({
      jobDescription: 'jobDescription',
      mySkills: 'mySkills',
      resultPanel: 'resultPanel',
      matchPercent: 'matchPercent',
      matchedCount: 'matchedCount',
      missingCount: 'missingCount',
      extraCount: 'extraCount',
      matchFill: 'matchFill',
      matchedSkills: 'matchedSkills',
      missingSkills: 'missingSkills',
      extraSkills: 'extraSkills',
      recommendation: 'recommendation'
    });

    console.log('[SkillMatcher] 초기화 완료');
    return this;
  }

  normalizeSkill(skill) {
    const lower = skill.toLowerCase().trim();
    return this.skillAliases[lower] || lower;
  }

  extractSkillsFromText(text) {
    const lower = text.toLowerCase();
    const found = new Set();

    // 기술 키워드 검색
    this.techKeywords.forEach(keyword => {
      const patterns = [
        new RegExp(`\\b${keyword}\\b`, 'i'),
        new RegExp(`\\b${keyword.replace(/\s+/g, '[-\\s]?')}\\b`, 'i')
      ];

      patterns.forEach(pattern => {
        if (pattern.test(lower)) {
          found.add(this.normalizeSkill(keyword));
        }
      });
    });

    // 동의어 체크
    Object.keys(this.skillAliases).forEach(alias => {
      if (lower.includes(alias)) {
        found.add(this.skillAliases[alias]);
      }
    });

    return Array.from(found);
  }

  analyze() {
    const jobDesc = this.elements.jobDescription.value.trim();
    const mySkillsText = this.elements.mySkills.value.trim();

    if (!jobDesc) {
      this.showToast('채용 공고 내용을 입력해주세요.', 'warning');
      return;
    }

    if (!mySkillsText) {
      this.showToast('보유 스킬을 입력해주세요.', 'warning');
      return;
    }

    // 채용 공고에서 스킬 추출
    const requiredSkills = this.extractSkillsFromText(jobDesc);

    // 내 스킬 파싱
    const mySkills = mySkillsText.split(/[,\n]/)
      .map(s => this.normalizeSkill(s))
      .filter(s => s);

    const mySkillsSet = new Set(mySkills);

    // 매칭 분석
    const matched = requiredSkills.filter(s => mySkillsSet.has(s));
    const missing = requiredSkills.filter(s => !mySkillsSet.has(s));
    const extra = mySkills.filter(s => !requiredSkills.includes(s));

    // 매칭률 계산
    const matchPercent = requiredSkills.length > 0
      ? Math.round((matched.length / requiredSkills.length) * 100)
      : 0;

    this.renderResults(matchPercent, matched, missing, extra);
  }

  renderResults(matchPercent, matched, missing, extra) {
    this.elements.resultPanel.style.display = 'block';

    // 퍼센트 표시
    this.elements.matchPercent.textContent = `${matchPercent}%`;
    this.elements.matchedCount.textContent = matched.length;
    this.elements.missingCount.textContent = missing.length;
    this.elements.extraCount.textContent = extra.length;

    // 매칭 바
    const matchFill = this.elements.matchFill;
    matchFill.style.width = `${matchPercent}%`;
    matchFill.className = 'match-fill';
    if (matchPercent >= 80) matchFill.classList.add('excellent');
    else if (matchPercent >= 60) matchFill.classList.add('good');
    else if (matchPercent >= 40) matchFill.classList.add('fair');
    else matchFill.classList.add('poor');

    // 스킬 태그 렌더링
    this.elements.matchedSkills.innerHTML = matched.length > 0
      ? matched.map(s => `<span class="skill-tag matched">${s}</span>`).join('')
      : '<span style="color: var(--text-secondary);">없음</span>';

    this.elements.missingSkills.innerHTML = missing.length > 0
      ? missing.map(s => `<span class="skill-tag missing">${s}</span>`).join('')
      : '<span style="color: var(--text-secondary);">없음</span>';

    this.elements.extraSkills.innerHTML = extra.length > 0
      ? extra.map(s => `<span class="skill-tag extra">${s}</span>`).join('')
      : '<span style="color: var(--text-secondary);">없음</span>';

    // 추천 메시지
    let recommendation = '';
    if (matchPercent >= 80) {
      recommendation = `<strong>훌륭합니다!</strong><br>이 포지션에 매우 적합합니다. 자신감을 가지고 지원하세요!`;
    } else if (matchPercent >= 60) {
      recommendation = `<strong>좋습니다!</strong><br>대부분의 요구사항을 충족합니다. ${missing.slice(0, 3).join(', ')} 등을 학습하면 더 좋을 것 같습니다.`;
    } else if (matchPercent >= 40) {
      recommendation = `<strong>도전해볼만 합니다</strong><br>핵심 스킬 몇 가지가 부족하지만, 학습 의지를 어필하며 지원해보세요. 우선 학습 추천: ${missing.slice(0, 3).join(', ')}`;
    } else {
      recommendation = `<strong>추가 학습 권장</strong><br>요구 스킬과의 갭이 있습니다. ${missing.slice(0, 5).join(', ')} 등을 먼저 학습하시는 것을 권장합니다.`;
    }

    this.elements.recommendation.innerHTML = recommendation;
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const skillMatcher = new SkillMatcher();
window.SkillMatcher = skillMatcher;

document.addEventListener('DOMContentLoaded', () => skillMatcher.init());
