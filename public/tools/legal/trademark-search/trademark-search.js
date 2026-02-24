/**
 * 상표 검색기 - ToolBase 기반
 * 상표 등록 가능성 확인 시뮬레이션
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var TrademarkSearch = class TrademarkSearch extends ToolBase {
  constructor() {
    super('TrademarkSearch');
    this.selectedClasses = [];

    this.classes = [
      { id: 1, name: '화학제품' },
      { id: 2, name: '페인트, 도료' },
      { id: 3, name: '화장품, 세제' },
      { id: 5, name: '의약품' },
      { id: 9, name: '전자기기, 소프트웨어' },
      { id: 10, name: '의료기기' },
      { id: 12, name: '차량, 운송수단' },
      { id: 14, name: '귀금속, 시계' },
      { id: 16, name: '종이, 문구' },
      { id: 18, name: '가방, 가죽제품' },
      { id: 20, name: '가구' },
      { id: 21, name: '주방용품' },
      { id: 25, name: '의류, 신발' },
      { id: 28, name: '게임, 완구' },
      { id: 29, name: '식품(육류, 유제품)' },
      { id: 30, name: '식품(곡물, 커피)' },
      { id: 32, name: '음료' },
      { id: 33, name: '주류' },
      { id: 35, name: '광고, 사업관리' },
      { id: 36, name: '금융, 보험' },
      { id: 38, name: '통신서비스' },
      { id: 41, name: '교육, 엔터테인먼트' },
      { id: 42, name: 'IT, 과학서비스' },
      { id: 43, name: '음식점, 숙박' },
      { id: 44, name: '의료, 미용' },
      { id: 45, name: '법률, 보안서비스' }
    ];

    // 시뮬레이션용 데이터
    this.sampleData = [
      { name: '애플', status: 'registered', owner: 'Apple Inc.', classes: [9, 42], regDate: '1990-03-15' },
      { name: '삼성', status: 'registered', owner: '삼성전자', classes: [9, 35, 42], regDate: '1985-01-20' },
      { name: '구글', status: 'registered', owner: 'Google LLC', classes: [9, 35, 38, 42], regDate: '2000-09-15' },
      { name: '카카오', status: 'registered', owner: '카카오', classes: [9, 35, 38, 42], regDate: '2010-06-10' },
      { name: '네이버', status: 'registered', owner: '네이버', classes: [9, 35, 38, 42], regDate: '2002-03-25' },
      { name: '스타벅스', status: 'registered', owner: 'Starbucks Corp.', classes: [30, 32, 43], regDate: '1998-05-10' },
      { name: '나이키', status: 'registered', owner: 'Nike Inc.', classes: [25, 28], regDate: '1978-12-01' },
      { name: '테슬라', status: 'registered', owner: 'Tesla Inc.', classes: [9, 12], regDate: '2005-07-20' }
    ];
  }

  init() {
    this.initElements({
      trademarkQuery: 'trademarkQuery',
      classGrid: 'classGrid',
      searchResults: 'searchResults'
    });

    this.renderClasses();

    console.log('[TrademarkSearch] 초기화 완료');
    return this;
  }

  renderClasses() {
    this.elements.classGrid.innerHTML = this.classes.map(c => `
      <div class="class-item" data-id="${c.id}" onclick="trademarkSearch.toggleClass(${c.id})">
        ${c.id}류: ${c.name}
      </div>
    `).join('');
  }

  toggleClass(id) {
    const idx = this.selectedClasses.indexOf(id);
    if (idx === -1) {
      this.selectedClasses.push(id);
    } else {
      this.selectedClasses.splice(idx, 1);
    }

    document.querySelectorAll('.class-item').forEach(item => {
      item.classList.toggle('selected', this.selectedClasses.includes(parseInt(item.dataset.id)));
    });
  }

  search() {
    const query = this.elements.trademarkQuery.value.trim().toLowerCase();

    if (!query) {
      this.showToast('상표명을 입력해주세요', 'error');
      return;
    }

    // 시뮬레이션 검색
    const results = this.sampleData.filter(item =>
      item.name.toLowerCase().includes(query) ||
      query.includes(item.name.toLowerCase())
    );

    // 유사도 검사 (간단한 시뮬레이션)
    const similarResults = this.findSimilar(query);

    this.renderResults(query, results, similarResults);
  }

  findSimilar(query) {
    // 간단한 유사도 검사 시뮬레이션
    const similar = [];

    this.sampleData.forEach(item => {
      const name = item.name.toLowerCase();
      const q = query.toLowerCase();

      // 첫 글자 같음
      if (name[0] === q[0] && name !== q) {
        similar.push({ ...item, reason: '첫 글자 유사' });
      }

      // 포함 관계
      if ((name.includes(q) || q.includes(name)) && name !== q) {
        similar.push({ ...item, reason: '문자열 포함' });
      }

      // 길이 유사 + 일부 글자 동일
      if (Math.abs(name.length - q.length) <= 1) {
        let match = 0;
        for (let i = 0; i < Math.min(name.length, q.length); i++) {
          if (name[i] === q[i]) match++;
        }
        if (match >= q.length * 0.5 && name !== q) {
          similar.push({ ...item, reason: '철자 유사' });
        }
      }
    });

    // 중복 제거
    return [...new Map(similar.map(item => [item.name, item])).values()];
  }

  renderResults(query, exactMatches, similarMatches) {
    const container = this.elements.searchResults;

    let html = '';

    // 등록 가능성 평가
    const hasExact = exactMatches.length > 0;
    const hasSimilar = similarMatches.length > 0;
    const hasClassConflict = exactMatches.some(m =>
      this.selectedClasses.length === 0 || m.classes.some(c => this.selectedClasses.includes(c))
    );

    let assessment = '';
    let assessmentColor = '';

    if (hasExact && hasClassConflict) {
      assessment = '등록 가능성 낮음 - 동일/유사 상표가 존재합니다';
      assessmentColor = '#ef4444';
    } else if (hasSimilar && this.selectedClasses.length > 0) {
      assessment = '주의 필요 - 유사 상표가 있어 거절될 수 있습니다';
      assessmentColor = '#eab308';
    } else if (hasExact && !hasClassConflict) {
      assessment = '등록 가능 - 다른 분류에서는 등록 가능할 수 있습니다';
      assessmentColor = '#22c55e';
    } else {
      assessment = '등록 가능성 높음 - 유사 상표가 발견되지 않았습니다';
      assessmentColor = '#22c55e';
    }

    html += `
      <div style="background: var(--bg-primary); border-radius: 12px; padding: 1rem; margin-bottom: 1rem;">
        <div style="font-weight: 600; color: ${assessmentColor}; font-size: 1.1rem;">${assessment}</div>
        <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 0.5rem;">
          검색어: "${query}" | 선택 분류: ${this.selectedClasses.length > 0 ? this.selectedClasses.map(c => c + '류').join(', ') : '전체'}
        </div>
      </div>
    `;

    // 정확히 일치하는 결과
    if (exactMatches.length > 0) {
      html += '<h4 style="font-weight: 600; margin-bottom: 0.5rem;">일치하는 상표</h4>';
      exactMatches.forEach(item => {
        html += this.renderResultCard(item);
      });
    }

    // 유사한 결과
    if (similarMatches.length > 0) {
      html += '<h4 style="font-weight: 600; margin: 1rem 0 0.5rem;">유사한 상표</h4>';
      similarMatches.forEach(item => {
        html += this.renderResultCard(item, item.reason);
      });
    }

    if (exactMatches.length === 0 && similarMatches.length === 0) {
      html += `
        <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
          <div style="font-size: 2rem; margin-bottom: 0.5rem;"></div>
          유사한 상표가 발견되지 않았습니다.<br>
          실제 등록 가능 여부는 KIPRIS에서 확인해주세요.
        </div>
      `;
    }

    container.innerHTML = html;
  }

  renderResultCard(item, reason = null) {
    const statusClass = item.status === 'registered' ? 'status-registered' :
                       item.status === 'pending' ? 'status-pending' : 'status-rejected';
    const statusText = item.status === 'registered' ? '등록' :
                      item.status === 'pending' ? '출원중' : '거절';

    return `
      <div class="result-card">
        <div class="result-header">
          <span class="result-name">${item.name}</span>
          <span class="result-status ${statusClass}">${statusText}</span>
        </div>
        <div class="result-details">
          <div>권리자: ${item.owner}</div>
          <div>분류: ${item.classes.map(c => c + '류').join(', ')}</div>
          <div>등록일: ${item.regDate}</div>
          ${reason ? `<div style="color: #eab308; margin-top: 0.25rem;">유사 사유: ${reason}</div>` : ''}
        </div>
      </div>
    `;
  }
}

// 전역 인스턴스 생성
const trademarkSearch = new TrademarkSearch();
window.TrademarkSearch = trademarkSearch;

// 전역 함수 (HTML onclick 호환)
function toggleClass(id) { trademarkSearch.toggleClass(id); }
function search() { trademarkSearch.search(); }

document.addEventListener('DOMContentLoaded', () => trademarkSearch.init());
