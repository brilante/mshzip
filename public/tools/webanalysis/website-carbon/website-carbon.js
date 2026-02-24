/**
 * 웹사이트 탄소발자국 계산기 - ToolBase 기반
 * CO2 배출량 추정
 * @created 2026-01-13
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class WebsiteCarbonTool extends ToolBase {
  constructor() {
    super('WebsiteCarbonTool');

    // 탄소 계산 상수
    this.constants = {
      // kWh당 CO2 (글로벌 평균, g)
      carbonIntensity: 442,
      // GB당 에너지 사용량 (kWh) - 데이터 전송
      energyPerGB: 0.81,
      // 데이터센터 비율
      datacenterRatio: 0.14,
      // 네트워크 비율
      networkRatio: 0.15,
      // 사용자 기기 비율
      deviceRatio: 0.71,
      // 그린 호스팅 감소율
      greenHostingReduction: 0.09,
      // 캐싱 효과 (재방문율 가정 25%)
      cachingEffects: {
        'no': 1,
        'partial': 0.9,
        'full': 0.75
      }
    };
  }

  init() {
    this.initElements({
      pageSize: 'pageSize',
      htmlInput: 'htmlInput',
      monthlyViews: 'monthlyViews',
      greenHosting: 'greenHosting',
      caching: 'caching',
      resultSection: 'resultSection',
      carbonGrade: 'carbonGrade',
      carbonPerView: 'carbonPerView',
      carbonMonthly: 'carbonMonthly',
      carbonYearly: 'carbonYearly',
      carKm: 'carKm',
      treesNeeded: 'treesNeeded',
      lightbulbHours: 'lightbulbHours',
      phoneCharges: 'phoneCharges',
      transferBar: 'transferBar',
      datacenterBar: 'datacenterBar',
      deviceBar: 'deviceBar',
      transferCarbon: 'transferCarbon',
      datacenterCarbon: 'datacenterCarbon',
      deviceCarbon: 'deviceCarbon',
      suggestionsSection: 'suggestionsSection',
      suggestionsList: 'suggestionsList'
    });

    console.log('[WebsiteCarbonTool] 초기화 완료');
    return this;
  }

  switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.toggle('active', content.id === tab + 'Tab');
    });
  }

  calculate() {
    const activeTab = document.querySelector('.tab-content.active').id;
    let pageSizeKB;

    if (activeTab === 'manualTab') {
      pageSizeKB = parseFloat(this.elements.pageSize.value);
      if (!pageSizeKB || pageSizeKB <= 0) {
        this.showToast('페이지 크기를 입력해주세요.', 'error');
        return;
      }
    } else {
      const html = this.elements.htmlInput.value;
      if (!html) {
        this.showToast('HTML 코드를 입력해주세요.', 'error');
        return;
      }
      pageSizeKB = this.estimatePageSize(html);
      this.elements.pageSize.value = Math.round(pageSizeKB);
    }

    const monthlyViews = parseInt(this.elements.monthlyViews.value) || 10000;
    const greenHosting = this.elements.greenHosting.value === 'yes';
    const caching = this.elements.caching.value;

    const results = this.calculateCarbon(pageSizeKB, monthlyViews, greenHosting, caching);
    this.renderResults(results);
  }

  estimatePageSize(html) {
    // HTML 크기 측정
    const htmlSize = new Blob([html]).size / 1024;

    // 리소스 추정 (이미지, CSS, JS 등)
    const imgCount = (html.match(/<img/gi) || []).length;
    const scriptCount = (html.match(/<script/gi) || []).length;
    const linkCount = (html.match(/<link/gi) || []).length;

    // 평균 리소스 크기 추정
    const estimatedImages = imgCount * 150; // 이미지당 평균 150KB
    const estimatedScripts = scriptCount * 50; // 스크립트당 평균 50KB
    const estimatedStyles = linkCount * 30; // CSS당 평균 30KB

    return htmlSize + estimatedImages + estimatedScripts + estimatedStyles;
  }

  calculateCarbon(pageSizeKB, monthlyViews, greenHosting, caching) {
    const pageSizeGB = pageSizeKB / (1024 * 1024);
    const cachingFactor = this.constants.cachingEffects[caching];

    // 월간 데이터 전송량 (GB)
    const monthlyDataGB = pageSizeGB * monthlyViews * cachingFactor;

    // 에너지 사용량 (kWh)
    const totalEnergy = monthlyDataGB * this.constants.energyPerGB;

    // 탄소 배출량 계산 (g)
    let datacenterCarbon = totalEnergy * this.constants.datacenterRatio * this.constants.carbonIntensity;
    const networkCarbon = totalEnergy * this.constants.networkRatio * this.constants.carbonIntensity;
    const deviceCarbon = totalEnergy * this.constants.deviceRatio * this.constants.carbonIntensity;

    // 그린 호스팅 적용
    if (greenHosting) {
      datacenterCarbon *= this.constants.greenHostingReduction;
    }

    const totalCarbonG = datacenterCarbon + networkCarbon + deviceCarbon;
    const carbonPerView = totalCarbonG / monthlyViews;
    const yearlyCarbon = totalCarbonG * 12;

    // 등급 계산
    const grade = this.calculateGrade(carbonPerView);

    return {
      carbonPerView,
      monthlyCarbon: totalCarbonG,
      yearlyCarbon,
      grade,
      breakdown: {
        transfer: networkCarbon,
        datacenter: datacenterCarbon,
        device: deviceCarbon
      },
      comparisons: this.calculateComparisons(yearlyCarbon),
      suggestions: this.generateSuggestions(pageSizeKB, greenHosting, caching, grade)
    };
  }

  calculateGrade(carbonPerView) {
    // g CO2 per view 기준
    if (carbonPerView < 0.2) return 'A';
    if (carbonPerView < 0.4) return 'B';
    if (carbonPerView < 0.6) return 'C';
    if (carbonPerView < 0.8) return 'D';
    return 'E';
  }

  calculateComparisons(yearlyCarbonG) {
    const yearlyCarbonKg = yearlyCarbonG / 1000;

    return {
      // 자동차 1km당 약 120g CO2
      carKm: Math.round(yearlyCarbonG / 120),
      // 나무 1그루 연간 약 21kg CO2 흡수
      treesNeeded: Math.round((yearlyCarbonKg / 21) * 100) / 100,
      // LED 전구 1시간당 약 5g CO2
      lightbulbHours: Math.round(yearlyCarbonG / 5),
      // 스마트폰 1회 충전당 약 8g CO2
      phoneCharges: Math.round(yearlyCarbonG / 8)
    };
  }

  generateSuggestions(pageSizeKB, greenHosting, caching, grade) {
    const suggestions = [];

    // 페이지 크기 기반 제안
    if (pageSizeKB > 3000) {
      suggestions.push({
        icon: '',
        title: '이미지 최적화',
        desc: '이미지를 WebP 형식으로 변환하고 적절한 크기로 조절하세요',
        impact: '최대 50% 감소'
      });
    }

    if (pageSizeKB > 2000) {
      suggestions.push({
        icon: '',
        title: 'JavaScript 번들 최적화',
        desc: '코드 분할과 트리 쉐이킹으로 불필요한 코드를 제거하세요',
        impact: '최대 30% 감소'
      });
    }

    // 그린 호스팅 제안
    if (!greenHosting) {
      suggestions.push({
        icon: '',
        title: '그린 호스팅 사용',
        desc: '재생 에너지를 사용하는 호스팅 서비스로 전환하세요',
        impact: '최대 91% 감소'
      });
    }

    // 캐싱 제안
    if (caching === 'no') {
      suggestions.push({
        icon: '',
        title: '브라우저 캐싱 적용',
        desc: '정적 리소스에 적절한 캐시 헤더를 설정하세요',
        impact: '최대 25% 감소'
      });
    }

    // 일반적인 제안
    if (grade !== 'A') {
      suggestions.push({
        icon: '',
        title: 'CDN 사용',
        desc: '전 세계 CDN을 통해 데이터 전송 거리를 줄이세요',
        impact: '최대 20% 감소'
      });

      suggestions.push({
        icon: '',
        title: 'Gzip/Brotli 압축',
        desc: '서버 응답을 압축하여 전송 데이터를 줄이세요',
        impact: '최대 70% 감소'
      });
    }

    if (pageSizeKB > 1500) {
      suggestions.push({
        icon: '',
        title: '지연 로딩 적용',
        desc: '이미지와 동영상에 lazy loading을 적용하세요',
        impact: '초기 로드 50% 감소'
      });
    }

    return suggestions.slice(0, 5); // 최대 5개
  }

  renderResults(results) {
    this.elements.resultSection.style.display = 'block';

    // 등급 표시
    const carbonScore = document.querySelector('.carbon-score');
    carbonScore.className = `carbon-score grade-${results.grade.toLowerCase()}`;
    this.elements.carbonGrade.textContent = results.grade;

    // 탄소 수치
    this.elements.carbonPerView.textContent = results.carbonPerView.toFixed(2) + 'g';
    this.elements.carbonMonthly.textContent = (results.monthlyCarbon / 1000).toFixed(2) + 'kg';
    this.elements.carbonYearly.textContent = (results.yearlyCarbon / 1000).toFixed(2) + 'kg';

    // 비교 지표
    this.elements.carKm.textContent = results.comparisons.carKm.toLocaleString();
    this.elements.treesNeeded.textContent = results.comparisons.treesNeeded;
    this.elements.lightbulbHours.textContent = results.comparisons.lightbulbHours.toLocaleString();
    this.elements.phoneCharges.textContent = results.comparisons.phoneCharges.toLocaleString();

    // 상세 분석 바
    const total = results.breakdown.transfer + results.breakdown.datacenter + results.breakdown.device;
    const transferPct = (results.breakdown.transfer / total) * 100;
    const datacenterPct = (results.breakdown.datacenter / total) * 100;
    const devicePct = (results.breakdown.device / total) * 100;

    this.elements.transferBar.style.width = transferPct + '%';
    this.elements.datacenterBar.style.width = datacenterPct + '%';
    this.elements.deviceBar.style.width = devicePct + '%';

    this.elements.transferCarbon.textContent = results.breakdown.transfer.toFixed(1) + 'g';
    this.elements.datacenterCarbon.textContent = results.breakdown.datacenter.toFixed(1) + 'g';
    this.elements.deviceCarbon.textContent = results.breakdown.device.toFixed(1) + 'g';

    // 개선 제안
    const suggestionsEl = this.elements.suggestionsList;
    if (results.suggestions.length > 0) {
      this.elements.suggestionsSection.style.display = 'block';
      suggestionsEl.innerHTML = results.suggestions.map(s => `
        <div class="suggestion-item">
          <span class="suggestion-icon">${s.icon}</span>
          <div class="suggestion-content">
            <div class="suggestion-title">${s.title}</div>
            <div class="suggestion-desc">${s.desc}</div>
          </div>
          <span class="suggestion-impact">${s.impact}</span>
        </div>
      `).join('');
    } else {
      this.elements.suggestionsSection.style.display = 'none';
    }

    // 결과 영역으로 스크롤
    this.elements.resultSection.scrollIntoView({ behavior: 'smooth' });
  }
}

// 전역 인스턴스 생성
const websiteCarbonTool = new WebsiteCarbonTool();
window.WebsiteCarbon = websiteCarbonTool;

document.addEventListener('DOMContentLoaded', () => websiteCarbonTool.init());
