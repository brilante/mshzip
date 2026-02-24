/**
 * 광고 문구 생성기 - ToolBase 기반
 * 마케팅 카피 자동 생성
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var AdCopyGen = class AdCopyGen extends ToolBase {
  constructor() {
    super('AdCopyGen');
    this.templates = [
      { id: 'facebook', icon: '', name: 'Facebook 광고', desc: '뉴스피드 광고용' },
      { id: 'google', icon: '', name: 'Google 광고', desc: '검색 광고용' },
      { id: 'instagram', icon: '', name: 'Instagram', desc: '스토리/피드용' },
      { id: 'email', icon: '', name: '이메일', desc: '뉴스레터용' }
    ];
    this.selectedTemplate = 'facebook';
    this._copies = [];
  }

  init() {
    this.initElements({
      templateGrid: 'templateGrid',
      productName: 'productName',
      benefits: 'benefits',
      target: 'target',
      results: 'results'
    });

    this.renderTemplates();

    console.log('[AdCopyGen] 초기화 완료');
    return this;
  }

  renderTemplates() {
    this.elements.templateGrid.innerHTML = this.templates.map(t => `
      <div class="template-card ${t.id === this.selectedTemplate ? 'selected' : ''}"
           data-id="${t.id}" onclick="adCopyGen.selectTemplate('${t.id}')">
        <div class="template-icon">${t.icon}</div>
        <div class="template-name">${t.name}</div>
        <div class="template-desc">${t.desc}</div>
      </div>
    `).join('');
  }

  selectTemplate(id) {
    this.selectedTemplate = id;
    document.querySelectorAll('.template-card').forEach(card => {
      card.classList.toggle('selected', card.dataset.id === id);
    });
  }

  generate() {
    const productName = this.elements.productName.value.trim();
    const benefits = this.elements.benefits.value.trim();
    const target = this.elements.target.value.trim();

    if (!productName) {
      this.showToast('제품/서비스명을 입력해주세요', 'error');
      return;
    }

    const benefitList = benefits ? benefits.split(',').map(b => b.trim()) : ['편리함', '효율성'];
    const copies = this.generateCopies(productName, benefitList, target);
    this.showResults(copies);
  }

  generateCopies(product, benefits, target) {
    const templates = {
      facebook: [
        { type: '혜택 강조', text: `${product}로 ${benefits[0]}을 경험하세요!\n\n${target ? `${target}를 위한 ` : ''}최고의 솔루션입니다.\n${benefits.join('\n')}\n\n지금 바로 시작하세요 →` },
        { type: '문제 해결', text: `아직도 힘들게 작업하세요?\n\n${product}이 해결해 드립니다!\n${benefits.map(b => `• ${b}`).join('\n')}\n\n무료로 시작하기 ` },
        { type: '사회적 증거', text: `10,000명 이상이 선택한 ${product}\n\n"${benefits[0]}이 정말 대단해요!" - 실제 사용자 후기\n\n${target ? `${target}들의 필수 도구` : '지금 바로 경험하세요'}!` }
      ],
      google: [
        { type: '검색 광고 제목', text: `${product} - ${benefits[0]} | 지금 무료 체험` },
        { type: '설명문 1', text: `${benefits.slice(0, 2).join(', ')}. ${target ? target + '를 위한 ' : ''}최적의 솔루션. 지금 시작하세요.` },
        { type: '설명문 2', text: `${product}로 업무 효율 200% 향상. ${benefits[0]} 기능 제공. 30일 무료 체험.` }
      ],
      instagram: [
        { type: '스토리 문구', text: `${product}\n\n${benefits[0]}이\n달라집니다\n\n↑ 위로 스와이프` },
        { type: '피드 캡션', text: `${product}와 함께라면 ${benefits[0]}도 가능해요 \n\n${benefits.map((b, i) => `${i + 1}. ${b}`).join('\n')}\n\n프로필 링크에서 시작하세요! \n\n#${product.replace(/\s/g, '')} #생산성 #업무효율` },
        { type: '릴스 후킹', text: `"${benefits[0]}"이 안 되던 시절...\n\n${product} 쓰기 전 vs 후 ` }
      ],
      email: [
        { type: '제목', text: `[${target || '회원'}님] ${benefits[0]}의 비밀을 알려드릴게요` },
        { type: '본문 시작', text: `안녕하세요,\n\n${benefits[0]}에 어려움을 겪고 계신가요?\n\n${product}이 그 해답이 될 수 있습니다.\n\n${product}의 주요 기능:\n${benefits.map(b => `• ${b}`).join('\n')}\n\n지금 바로 시작해보세요.` },
        { type: 'CTA', text: `[${product} 무료로 시작하기]` }
      ]
    };

    return templates[this.selectedTemplate] || templates.facebook;
  }

  showResults(copies) {
    this.elements.results.innerHTML = `
      <div style="font-weight: 600; margin-bottom: 1rem;">생성된 광고 문구</div>
      ${copies.map((copy, idx) => `
        <div class="copy-card">
          <div class="copy-header">
            <span class="copy-type">${copy.type}</span>
          </div>
          <div class="copy-text">${copy.text.replace(/\n/g, '<br>')}</div>
          <div class="copy-actions">
            <button class="tool-btn tool-btn-secondary" onclick="adCopyGen.copy(${idx})">복사</button>
          </div>
        </div>
      `).join('')}
    `;

    this._copies = copies;
    this.showToast('광고 문구가 생성되었습니다', 'success');
  }

  copy(index) {
    const text = this._copies[index].text;
    this.copyToClipboard(text);
  }
}

// 전역 인스턴스 생성
const adCopyGen = new AdCopyGen();
window.AdCopyGen = adCopyGen;

// 전역 함수 (HTML onclick 호환)
function generate() { adCopyGen.generate(); }
function selectTemplate(id) { adCopyGen.selectTemplate(id); }

document.addEventListener('DOMContentLoaded', () => adCopyGen.init());
