/**
 * 날씨별 짐 추천 - ToolBase 기반
 * 날씨에 맞는 여행 준비물 추천
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var WeatherPacking = class WeatherPacking extends ToolBase {
  constructor() {
    super('WeatherPacking');

    this.packingData = {
      base: {
        essential: ['여권/신분증', '지갑/카드', '휴대폰', '충전기', '상비약'],
        recommended: ['보조배터리', '이어폰', '여행용 파우치']
      },
      clothing: {
        hot: {
          essential: ['반팔 티셔츠', '반바지/치마', '샌들', '속옷'],
          recommended: ['민소매', '린넨 셔츠', '가벼운 원피스'],
          optional: ['수영복', '래쉬가드']
        },
        warm: {
          essential: ['반팔/긴팔 티셔츠', '얇은 바지', '운동화', '속옷'],
          recommended: ['가디건', '얇은 재킷', '선글라스'],
          optional: ['모자', '스카프']
        },
        mild: {
          essential: ['긴팔 티셔츠', '긴바지', '운동화', '속옷'],
          recommended: ['가벼운 재킷', '후드티', '긴양말'],
          optional: ['스웨터', '머플러']
        },
        cool: {
          essential: ['니트/스웨터', '두꺼운 바지', '부츠/운동화', '내복'],
          recommended: ['코트/재킷', '목도리', '장갑'],
          optional: ['비니', '핫팩']
        },
        cold: {
          essential: ['패딩/롱코트', '기모바지', '방한부츠', '내복', '두꺼운 양말'],
          recommended: ['방한 모자', '목도리', '장갑', '귀마개'],
          optional: ['핫팩', '방한 마스크', '핫팩 주머니']
        }
      },
      condition: {
        sunny: {
          essential: ['선크림'],
          recommended: ['선글라스', '모자/양산'],
          optional: ['쿨링 스프레이']
        },
        cloudy: {
          essential: [],
          recommended: ['우산 (접이식)'],
          optional: []
        },
        rainy: {
          essential: ['우산', '방수 재킷'],
          recommended: ['방수 신발', '방수 가방커버'],
          optional: ['여분 양말', '빨래 건조대']
        },
        snowy: {
          essential: ['방수 부츠', '방한장갑'],
          recommended: ['방수 재킷', '스노우 체인 (운전 시)'],
          optional: ['핫팩', '눈 제거용 브러시']
        },
        humid: {
          essential: ['데오드란트', '땀 흡수 속옷'],
          recommended: ['휴대용 선풍기', '쿨링 타월'],
          optional: ['여분 옷', '습기 제거제']
        },
        windy: {
          essential: ['바람막이'],
          recommended: ['립밤', '고정 클립'],
          optional: ['안경 고정끈', '머리끈']
        }
      },
      toiletries: {
        hot: {
          essential: ['선크림 SPF50+', '칫솔/치약'],
          recommended: ['애프터썬 로션', '세안제', '미스트'],
          optional: ['알로에 젤', '쿨링 마스크팩']
        },
        warm: {
          essential: ['선크림', '칫솔/치약', '세안제'],
          recommended: ['로션', '샴푸/린스'],
          optional: ['마스크팩']
        },
        mild: {
          essential: ['칫솔/치약', '세안제'],
          recommended: ['로션', '선크림', '샴푸/린스'],
          optional: ['핸드크림']
        },
        cool: {
          essential: ['칫솔/치약', '세안제', '보습 로션'],
          recommended: ['립밤', '핸드크림'],
          optional: ['바디로션', '보습 마스크']
        },
        cold: {
          essential: ['칫솔/치약', '보습 크림', '립밤'],
          recommended: ['핸드크림', '바디로션', '보습 미스트'],
          optional: ['페이스오일', '풋크림']
        }
      }
    };

    this.tempInfo = {
      hot: { icon: '', range: '30°C 이상', desc: '무더운 날씨' },
      warm: { icon: '', range: '20-30°C', desc: '따뜻한 날씨' },
      mild: { icon: '', range: '10-20°C', desc: '선선한 날씨' },
      cool: { icon: '', range: '0-10°C', desc: '쌀쌀한 날씨' },
      cold: { icon: '', range: '0°C 이하', desc: '추운 날씨' }
    };

    this.conditionInfo = {
      sunny: { icon: '', desc: '맑음' },
      cloudy: { icon: '', desc: '흐림' },
      rainy: { icon: '', desc: '비' },
      snowy: { icon: '', desc: '눈' },
      humid: { icon: '', desc: '습함' },
      windy: { icon: '', desc: '바람' }
    };

    this.currentList = {};
  }

  init() {
    this.initElements({
      temperature: 'temperature',
      condition: 'condition',
      weatherIcon: 'weatherIcon',
      weatherTemp: 'weatherTemp',
      weatherDesc: 'weatherDesc',
      packingList: 'packingList'
    });

    this.recommend();

    console.log('[WeatherPacking] 초기화 완료');
    return this;
  }

  recommend() {
    const temp = this.elements.temperature.value;
    const cond = this.elements.condition.value;

    const tempData = this.tempInfo[temp];
    const condData = this.conditionInfo[cond];

    this.elements.weatherIcon.textContent = `${tempData.icon}${condData.icon}`;
    this.elements.weatherTemp.textContent = tempData.range;
    this.elements.weatherDesc.textContent = `${tempData.desc}, ${condData.desc}`;

    this.currentList = {
      '기본 필수품': this.packingData.base,
      '의류': this.packingData.clothing[temp],
      '세면도구': this.packingData.toiletries[temp],
      '날씨 대비': this.packingData.condition[cond]
    };

    this.render();
  }

  render() {
    const container = this.elements.packingList;

    container.innerHTML = Object.entries(this.currentList).map(([category, items]) => {
      const allItems = [
        ...(items.essential || []).map(i => ({ name: i, priority: 'essential' })),
        ...(items.recommended || []).map(i => ({ name: i, priority: 'recommended' })),
        ...(items.optional || []).map(i => ({ name: i, priority: 'optional' }))
      ];

      if (allItems.length === 0) return '';

      return `
        <div class="packing-section">
          <div class="packing-title">${category}</div>
          <div class="packing-grid">
            ${allItems.map(item => `
              <div class="packing-item ${item.priority}">
                <span>${item.name}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }).join('');
  }

  exportList() {
    const temp = this.elements.temperature.value;
    const cond = this.elements.condition.value;
    const tempData = this.tempInfo[temp];
    const condData = this.conditionInfo[cond];

    let text = `날씨별 짐 추천\n`;
    text += `${'='.repeat(30)}\n`;
    text += `${tempData.icon} ${tempData.range} / ${condData.icon} ${condData.desc}\n\n`;

    Object.entries(this.currentList).forEach(([category, items]) => {
      const allItems = [
        ...(items.essential || []).map(i => `[필수] ${i}`),
        ...(items.recommended || []).map(i => `[권장] ${i}`),
        ...(items.optional || []).map(i => `[선택] ${i}`)
      ];

      if (allItems.length > 0) {
        text += `[${category}]\n`;
        allItems.forEach(item => {
          text += `  ${item}\n`;
        });
        text += '\n';
      }
    });

    this.copyToClipboard(text);
  }
}

// 전역 인스턴스 생성
const weatherPacking = new WeatherPacking();
window.WeatherPacking = weatherPacking;

document.addEventListener('DOMContentLoaded', () => weatherPacking.init());
