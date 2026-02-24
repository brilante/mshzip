/**
 * EPUB 검증기 - ToolBase 기반
 * 전자책 품질 체크
 * @created 2026-01-13
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var EpubValidator = class EpubValidator extends ToolBase {
  constructor() {
    super('EpubValidator');
    this.checkedItems = {};
    this.checklistItems = [
      { category: '메타데이터', items: ['제목이 명확하게 입력되어 있음', '저자 정보가 정확함', 'ISBN이 등록되어 있음', '출판일이 설정되어 있음', '언어 코드가 올바름'] },
      { category: '콘텐츠', items: ['목차(TOC)가 있음', '모든 챕터가 올바르게 연결됨', '맞춤법 검사 완료', '문단 구조가 적절함', '페이지 나눔이 자연스러움'] },
      { category: '이미지', items: ['모든 이미지가 표시됨', '이미지 해상도가 적절함', 'Alt 텍스트가 있음', '파일 크기가 최적화됨'] },
      { category: '스타일', items: ['폰트가 일관됨', '줄간격이 적절함', '여백이 충분함', '제목 스타일이 통일됨'] },
      { category: '접근성', items: ['텍스트-배경 대비가 충분함', '링크가 명확하게 표시됨', '논리적 읽기 순서', 'TTS 호환성 확인'] }
    ];
  }

  init() {
    this.initElements({
      uploadZone: 'uploadZone',
      checklist: 'checklist',
      resultPanel: 'resultPanel',
      summary: 'summary',
      resultList: 'resultList'
    });

    this.setupDragDrop();
    this.loadChecklist();
    this.renderChecklist();

    console.log('[EpubValidator] 초기화 완료');
    return this;
  }

  setupDragDrop() {
    const uploadZone = this.elements.uploadZone;

    this.on(uploadZone, 'dragover', (e) => {
      e.preventDefault();
      uploadZone.classList.add('dragover');
    });

    this.on(uploadZone, 'dragleave', () => {
      uploadZone.classList.remove('dragover');
    });

    this.on(uploadZone, 'drop', (e) => {
      e.preventDefault();
      uploadZone.classList.remove('dragover');
      const file = e.dataTransfer.files[0];
      if (file) this.processFile(file);
    });
  }

  loadChecklist() {
    try {
      const saved = localStorage.getItem('epubValidatorChecklist');
      if (saved) {
        this.checkedItems = JSON.parse(saved);
      }
    } catch (e) {
      this.checkedItems = {};
    }
  }

  saveChecklist() {
    localStorage.setItem('epubValidatorChecklist', JSON.stringify(this.checkedItems));
  }

  renderChecklist() {
    let html = '';

    this.checklistItems.forEach(category => {
      html += `<div style="margin-bottom: 1rem;">
        <h4 style="font-weight: 600; font-size: 0.9rem; margin-bottom: 0.5rem;">${category.category}</h4>`;

      category.items.forEach((item, index) => {
        const key = `${category.category}-${index}`;
        const checked = this.checkedItems[key] ? 'checked' : '';
        html += `<div class="checklist-item">
          <input type="checkbox" id="${key}" ${checked} onchange="epubValidator.toggleCheck('${key}')">
          <label for="${key}" style="font-size: 0.85rem;">${item}</label>
        </div>`;
      });

      html += '</div>';
    });

    this.elements.checklist.innerHTML = html;
  }

  toggleCheck(key) {
    this.checkedItems[key] = !this.checkedItems[key];
    this.saveChecklist();
  }

  resetChecklist() {
    if (!confirm('체크리스트를 초기화하시겠습니까?')) return;
    this.checkedItems = {};
    this.saveChecklist();
    this.renderChecklist();
  }

  exportChecklist() {
    let text = '전자책 출판 체크리스트\n';
    text += '=' .repeat(40) + '\n\n';

    this.checklistItems.forEach(category => {
      text += `[${category.category}]\n`;
      category.items.forEach((item, index) => {
        const key = `${category.category}-${index}`;
        const checked = this.checkedItems[key] ? '' : '○';
        text += `  ${checked} ${item}\n`;
      });
      text += '\n';
    });

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = 'epub_checklist.txt';
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  }

  handleFile(event) {
    const file = event.target.files[0];
    if (file) this.processFile(file);
  }

  processFile(file) {
    const extension = file.name.split('.').pop().toLowerCase();

    if (extension === 'html' || extension === 'htm') {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.validateHTML(e.target.result, file.name);
      };
      reader.readAsText(file);
    } else if (extension === 'epub') {
      alert('EPUB 파일 검증을 위해서는 JSZip 라이브러리가 필요합니다.\nHTML 파일로 검증하거나 체크리스트를 사용해주세요.');
    } else {
      alert('지원하지 않는 파일 형식입니다.');
    }
  }

  validateHTML(content, filename) {
    const results = [];
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/html');

    // 메타데이터 검사
    const title = doc.querySelector('title');
    if (title && title.textContent.trim()) {
      results.push({ type: 'pass', message: '제목 태그가 있습니다', detail: title.textContent });
    } else {
      results.push({ type: 'fail', message: '제목 태그가 없거나 비어있습니다' });
    }

    const lang = doc.documentElement.getAttribute('lang');
    if (lang) {
      results.push({ type: 'pass', message: '언어 속성이 설정되어 있습니다', detail: lang });
    } else {
      results.push({ type: 'warn', message: '언어 속성이 없습니다 (lang 속성 권장)' });
    }

    // 구조 검사
    const headings = doc.querySelectorAll('h1, h2, h3, h4, h5, h6');
    if (headings.length > 0) {
      results.push({ type: 'pass', message: `제목 태그가 ${headings.length}개 있습니다` });
    } else {
      results.push({ type: 'warn', message: '제목 태그(h1~h6)가 없습니다' });
    }

    const paragraphs = doc.querySelectorAll('p');
    results.push({ type: 'info', message: `문단이 ${paragraphs.length}개 있습니다` });

    // 이미지 검사
    const images = doc.querySelectorAll('img');
    if (images.length > 0) {
      let imagesWithAlt = 0;
      images.forEach(img => {
        if (img.getAttribute('alt')) imagesWithAlt++;
      });

      if (imagesWithAlt === images.length) {
        results.push({ type: 'pass', message: `모든 이미지(${images.length}개)에 alt 속성이 있습니다` });
      } else {
        results.push({ type: 'warn', message: `${images.length}개 이미지 중 ${images.length - imagesWithAlt}개에 alt 속성이 없습니다` });
      }
    }

    // 링크 검사
    const links = doc.querySelectorAll('a');
    if (links.length > 0) {
      let emptyLinks = 0;
      links.forEach(link => {
        if (!link.textContent.trim() && !link.querySelector('img')) emptyLinks++;
      });

      if (emptyLinks === 0) {
        results.push({ type: 'pass', message: `모든 링크(${links.length}개)에 텍스트가 있습니다` });
      } else {
        results.push({ type: 'warn', message: `${emptyLinks}개의 빈 링크가 있습니다` });
      }
    }

    // 인라인 스타일 검사
    const inlineStyles = doc.querySelectorAll('[style]');
    if (inlineStyles.length > 10) {
      results.push({ type: 'warn', message: `인라인 스타일이 ${inlineStyles.length}개 있습니다 (CSS 파일 권장)` });
    } else {
      results.push({ type: 'info', message: `인라인 스타일이 ${inlineStyles.length}개 있습니다` });
    }

    this.showResults(results, filename);
  }

  showResults(results, filename) {
    this.elements.resultPanel.style.display = 'block';

    const counts = { pass: 0, warn: 0, fail: 0, info: 0 };
    results.forEach(r => counts[r.type]++);

    this.elements.summary.innerHTML = `
      <div class="summary-item"><div class="count" style="color: #16a34a;">${counts.pass}</div><div style="font-size: 0.85rem;">통과</div></div>
      <div class="summary-item"><div class="count" style="color: #d97706;">${counts.warn}</div><div style="font-size: 0.85rem;">주의</div></div>
      <div class="summary-item"><div class="count" style="color: #dc2626;">${counts.fail}</div><div style="font-size: 0.85rem;">실패</div></div>
      <div class="summary-item"><div class="count" style="color: #2563eb;">${counts.info}</div><div style="font-size: 0.85rem;">정보</div></div>
    `;

    const icons = { pass: '', warn: '!', fail: '', info: 'i' };

    this.elements.resultList.innerHTML = `
      <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.75rem;">파일: ${filename}</p>
      ${results.map(r => `
        <div class="result-item">
          <div class="result-icon ${r.type}">${icons[r.type]}</div>
          <div>
            <div style="font-weight: 500;">${r.message}</div>
            ${r.detail ? `<div style="font-size: 0.8rem; color: var(--text-secondary);">${r.detail}</div>` : ''}
          </div>
        </div>
      `).join('')}
    `;
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const epubValidator = new EpubValidator();
window.EpubValidator = epubValidator;

document.addEventListener('DOMContentLoaded', () => epubValidator.init());
