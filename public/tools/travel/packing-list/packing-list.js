/**
 * 여행 짐 체크리스트 - ToolBase 기반
 * 여행 유형별 짐 체크리스트
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var PackingList = class PackingList extends ToolBase {
  constructor() {
    super('PackingList');
    this.currentType = 'business';
    this.checkedItems = {};

    this.templates = {
      business: {
        '필수 서류': ['여권', '항공권/e티켓', '호텔 예약 확인서', '명함', '회의 자료', '노트북/태블릿'],
        '의류': ['정장/비즈니스 캐주얼', '셔츠/블라우스', '속옷/양말', '잠옷', '운동복', '구두/편한 신발'],
        '세면도구': ['칫솔/치약', '면도기', '샴푸/린스', '스킨케어', '헤어드라이어'],
        '전자기기': ['노트북 충전기', '휴대폰 충전기', '멀티탭', '이어폰', '보조배터리'],
        '기타': ['지갑/현금', '신용카드', '우산', '상비약', '안경/렌즈']
      },
      beach: {
        '필수 서류': ['여권', '항공권/e티켓', '호텔 예약 확인서', '여행자 보험'],
        '의류': ['수영복', '비치웨어', '샌들', '선글라스', '모자', '가벼운 옷', '속옷'],
        '해변용품': ['선크림 SPF50+', '비치타올', '방수팩', '스노클링 장비', '비치백'],
        '세면도구': ['칫솔/치약', '샴푸/린스', '애프터썬 로션', '알로에 젤'],
        '전자기기': ['방수 카메라', '휴대폰 충전기', '보조배터리'],
        '기타': ['상비약', '벌레퇴치제', '현금/카드']
      },
      city: {
        '필수 서류': ['여권', '항공권/e티켓', '호텔 예약 확인서', '지도/가이드북'],
        '의류': ['편한 옷', '걷기 좋은 신발', '가벼운 재킷', '속옷/양말', '잠옷'],
        '세면도구': ['칫솔/치약', '세안용품', '스킨케어'],
        '전자기기': ['카메라', '휴대폰 충전기', '보조배터리', '이어폰'],
        '기타': ['가이드북', '현금/카드', '에코백', '우산', '상비약']
      },
      hiking: {
        '필수 서류': ['신분증', '등산로 지도', '비상연락처'],
        '의류': ['등산복 상/하의', '등산화', '등산 양말', '방풍재킷', '모자', '장갑'],
        '등산장비': ['배낭', '등산스틱', '헤드랜턴', '물통', '돗자리'],
        '식량': ['행동식', '에너지바', '물 2L 이상', '비상식량'],
        '안전용품': ['구급약품', '호루라기', '나침반', '우의', '손난로'],
        '기타': ['선글라스', '선크림', '휴지', '비닐봉지']
      },
      winter: {
        '필수 서류': ['여권', '항공권/e티켓', '호텔 예약 확인서'],
        '의류': ['패딩/코트', '니트/스웨터', '기모 바지', '내복', '방한 모자', '목도리', '장갑', '방한 부츠'],
        '스키장비': ['스키복', '고글', '넥워머', '방한장갑', '핫팩'],
        '세면도구': ['칫솔/치약', '보습 크림', '립밤', '핸드크림'],
        '전자기기': ['카메라', '휴대폰 충전기', '보조배터리'],
        '기타': ['상비약', '현금/카드', '방한용품']
      },
      family: {
        '필수 서류': ['여권 (전원)', '항공권/e티켓', '호텔 예약 확인서', '의료보험 카드', '비상연락처'],
        '아이용품': ['기저귀/물티슈', '분유/이유식', '젖병', '아기 옷', '장난감', '유모차'],
        '의류': ['가족 의류', '여분 옷', '신발', '잠옷'],
        '세면도구': ['가족 세면도구', '아기 샴푸', '아기 로션'],
        '건강/안전': ['상비약', '아기 약', '체온계', '밴드', '손소독제'],
        '기타': ['스낵/간식', '물/음료', '카시트', '엔터테인먼트']
      }
    };
  }

  init() {
    this.initElements({
      checkedCount: 'checkedCount',
      totalCount: 'totalCount',
      progressPercent: 'progressPercent',
      progressFill: 'progressFill',
      checklistSection: 'checklistSection'
    });

    this.loadCheckedItems();
    this.render();

    console.log('[PackingList] 초기화 완료');
    return this;
  }

  loadCheckedItems() {
    try {
      const saved = localStorage.getItem('packing-list-checked');
      if (saved) {
        this.checkedItems = JSON.parse(saved);
      }
    } catch (e) {}
  }

  saveCheckedItems() {
    localStorage.setItem('packing-list-checked', JSON.stringify(this.checkedItems));
  }

  selectType(type) {
    this.currentType = type;
    document.querySelectorAll('.trip-type').forEach(el => {
      el.classList.toggle('selected', el.dataset.type === type);
    });
    this.render();
  }

  toggleItem(category, item) {
    const key = `${this.currentType}-${category}-${item}`;
    this.checkedItems[key] = !this.checkedItems[key];
    this.saveCheckedItems();
    this.render();
  }

  checkAll() {
    const template = this.templates[this.currentType];
    Object.entries(template).forEach(([category, items]) => {
      items.forEach(item => {
        const key = `${this.currentType}-${category}-${item}`;
        this.checkedItems[key] = true;
      });
    });
    this.saveCheckedItems();
    this.render();
  }

  uncheckAll() {
    const template = this.templates[this.currentType];
    Object.entries(template).forEach(([category, items]) => {
      items.forEach(item => {
        const key = `${this.currentType}-${category}-${item}`;
        this.checkedItems[key] = false;
      });
    });
    this.saveCheckedItems();
    this.render();
  }

  exportList() {
    const template = this.templates[this.currentType];
    let text = `여행 짐 체크리스트 (${this.currentType})\n${'='.repeat(30)}\n\n`;

    Object.entries(template).forEach(([category, items]) => {
      text += `[${category}]\n`;
      items.forEach(item => {
        const key = `${this.currentType}-${category}-${item}`;
        const checked = this.checkedItems[key] ? '' : '';
        text += `${checked} ${item}\n`;
      });
      text += '\n';
    });

    this.copyToClipboard(text);
  }

  render() {
    const template = this.templates[this.currentType];
    let total = 0;
    let checked = 0;

    Object.entries(template).forEach(([category, items]) => {
      items.forEach(item => {
        total++;
        const key = `${this.currentType}-${category}-${item}`;
        if (this.checkedItems[key]) checked++;
      });
    });

    const percent = total > 0 ? Math.round((checked / total) * 100) : 0;

    this.elements.checkedCount.textContent = checked;
    this.elements.totalCount.textContent = total;
    this.elements.progressPercent.textContent = `${percent}%`;
    this.elements.progressFill.style.width = `${percent}%`;

    const section = this.elements.checklistSection;
    section.innerHTML = Object.entries(template).map(([category, items]) => {
      const categoryChecked = items.filter(item => {
        const key = `${this.currentType}-${category}-${item}`;
        return this.checkedItems[key];
      }).length;

      return `
        <div class="checklist-category">
          <div class="category-header">
            <div class="category-title">${category}</div>
            <div class="category-progress">${categoryChecked}/${items.length}</div>
          </div>
          <div class="checklist-items">
            ${items.map(item => {
              const key = `${this.currentType}-${category}-${item}`;
              const isChecked = this.checkedItems[key];
              return `
                <label class="checklist-item ${isChecked ? 'checked' : ''}">
                  <input type="checkbox" ${isChecked ? 'checked' : ''} onchange="packingList.toggleItem('${category}', '${item}')">
                  ${item}
                </label>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }).join('');
  }
}

// 전역 인스턴스 생성
const packingList = new PackingList();
window.PackingList = packingList;

document.addEventListener('DOMContentLoaded', () => packingList.init());
