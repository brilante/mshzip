/**
 * 품종 정보 - ToolBase 기반
 * 반려동물 품종별 특성 안내
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var BreedInfo = class BreedInfo extends ToolBase {
  constructor() {
    super('BreedInfo');
    this.currentType = 'dog';

    this.breeds = {
      dog: [
        {
          name: '골든 리트리버', origin: '영국', icon: '',
          size: '대형', weight: '25-34kg', lifespan: '10-12년',
          exercise: 5, grooming: 4, friendly: 5, trainable: 5,
          traits: ['온순함', '애교많음', '사람좋아함', '수영좋아함'],
          note: '털빠짐이 많아 주기적인 브러싱 필요. 고관절 이형성증 주의.'
        },
        {
          name: '푸들', origin: '독일/프랑스', icon: '',
          size: '소~대형', weight: '2-32kg', lifespan: '12-15년',
          exercise: 4, grooming: 5, friendly: 4, trainable: 5,
          traits: ['지능높음', '털빠짐적음', '알러지프렌들리', '활발함'],
          note: '정기적인 미용 필수. 분리불안 경향이 있을 수 있음.'
        },
        {
          name: '말티즈', origin: '지중해', icon: '',
          size: '소형', weight: '3-4kg', lifespan: '12-15년',
          exercise: 2, grooming: 5, friendly: 4, trainable: 3,
          traits: ['애교많음', '활발함', '경계심', '털빠짐적음'],
          note: '눈물자국 관리 필요. 슬개골 탈구 주의.'
        },
        {
          name: '시바 이누', origin: '일본', icon: '',
          size: '중형', weight: '8-11kg', lifespan: '13-16년',
          exercise: 4, grooming: 3, friendly: 3, trainable: 2,
          traits: ['독립적', '청결함', '경계심강함', '충성스러움'],
          note: '독립적 성격으로 훈련에 인내 필요. 털갈이 시즌에 털빠짐 심함.'
        },
        {
          name: '비글', origin: '영국', icon: '',
          size: '중형', weight: '9-11kg', lifespan: '12-15년',
          exercise: 5, grooming: 2, friendly: 5, trainable: 3,
          traits: ['활발함', '후각뛰어남', '사교적', '장난기많음'],
          note: '식탐이 강해 체중관리 필요. 짖음이 많을 수 있음.'
        },
        {
          name: '포메라니안', origin: '독일', icon: '',
          size: '소형', weight: '1.5-3kg', lifespan: '12-16년',
          exercise: 2, grooming: 4, friendly: 3, trainable: 3,
          traits: ['활발함', '경계심', '자신감', '애교많음'],
          note: '털빠짐 많음. 작은 체구지만 대담한 성격.'
        },
        {
          name: '웰시 코기', origin: '영국', icon: '',
          size: '중형', weight: '10-14kg', lifespan: '12-15년',
          exercise: 4, grooming: 3, friendly: 4, trainable: 4,
          traits: ['활발함', '지능높음', '목축본능', '애교많음'],
          note: '허리 건강 주의. 목축견 특성상 발꿈치 물기 습성 있을 수 있음.'
        },
        {
          name: '진돗개', origin: '한국', icon: '',
          size: '중형', weight: '18-23kg', lifespan: '12-15년',
          exercise: 4, grooming: 2, friendly: 2, trainable: 3,
          traits: ['충성심', '용맹함', '영리함', '독립적'],
          note: '한 주인에게 충성. 낯선 사람에게 경계심 강함.'
        }
      ],
      cat: [
        {
          name: '코리안 숏헤어', origin: '한국', icon: '',
          size: '중형', weight: '3-5kg', lifespan: '15-20년',
          exercise: 3, grooming: 2, friendly: 4, trainable: 3,
          traits: ['건강함', '적응력좋음', '독립적', '영리함'],
          note: '건강하고 적응력이 뛰어남. 초보자에게 추천.'
        },
        {
          name: '페르시안', origin: '이란', icon: '',
          size: '중형', weight: '3-5kg', lifespan: '10-17년',
          exercise: 2, grooming: 5, friendly: 4, trainable: 2,
          traits: ['온순함', '조용함', '애정표현', '여유로움'],
          note: '매일 브러싱 필수. 눈물자국과 호흡기 관리 필요.'
        },
        {
          name: '러시안 블루', origin: '러시아', icon: '',
          size: '중형', weight: '3-6kg', lifespan: '15-20년',
          exercise: 3, grooming: 2, friendly: 3, trainable: 4,
          traits: ['수줍음', '조용함', '충성스러움', '지능높음'],
          note: '낯선 환경에 적응 시간 필요. 규칙적인 생활 선호.'
        },
        {
          name: '브리티시 숏헤어', origin: '영국', icon: '',
          size: '중형', weight: '4-8kg', lifespan: '12-17년',
          exercise: 2, grooming: 2, friendly: 4, trainable: 3,
          traits: ['온순함', '독립적', '조용함', '건강함'],
          note: '체중관리 필요. 심장병(비대성심근병증) 정기검진 권장.'
        },
        {
          name: '스코티시 폴드', origin: '스코틀랜드', icon: '',
          size: '중형', weight: '3-6kg', lifespan: '11-14년',
          exercise: 2, grooming: 2, friendly: 5, trainable: 3,
          traits: ['애교많음', '온순함', '사람좋아함', '조용함'],
          note: '접힌 귀 유전자로 인한 관절 문제 주의. 정기 검진 필요.'
        },
        {
          name: '먼치킨', origin: '미국', icon: '',
          size: '소형', weight: '2-4kg', lifespan: '12-15년',
          exercise: 3, grooming: 2, friendly: 4, trainable: 3,
          traits: ['활발함', '호기심많음', '사교적', '장난기많음'],
          note: '짧은 다리로 인한 척추 문제 가능성. 높은 곳 점프 어려움.'
        },
        {
          name: '랙돌', origin: '미국', icon: '',
          size: '대형', weight: '4-9kg', lifespan: '12-17년',
          exercise: 2, grooming: 4, friendly: 5, trainable: 4,
          traits: ['온순함', '느긋함', '애정표현', '안기기좋아함'],
          note: '안으면 힘을 빼는 특성. 실내 생활 권장.'
        },
        {
          name: '벵갈', origin: '미국', icon: '',
          size: '중형', weight: '4-7kg', lifespan: '12-16년',
          exercise: 5, grooming: 2, friendly: 4, trainable: 4,
          traits: ['활동적', '영리함', '호기심', '물좋아함'],
          note: '높은 운동량 필요. 캣타워와 놀이 시간 충분히 제공.'
        }
      ]
    };
  }

  init() {
    this.initElements({
      searchInput: 'searchInput',
      breedGrid: 'breedGrid',
      detailPanel: 'detailPanel',
      detailIcon: 'detailIcon',
      detailTitle: 'detailTitle',
      detailSubtitle: 'detailSubtitle',
      infoGrid: 'infoGrid',
      traitsList: 'traitsList',
      noteText: 'noteText'
    });

    this.render();

    console.log('[BreedInfo] 초기화 완료');
    return this;
  }

  setType(type) {
    this.currentType = type;
    document.querySelectorAll('.type-tab').forEach(tab => {
      tab.classList.toggle('active', tab.textContent.includes(type === 'dog' ? '강아지' : '고양이'));
    });
    this.elements.searchInput.value = '';
    this.elements.detailPanel.style.display = 'none';
    this.render();
  }

  search(query) {
    this.render(query.toLowerCase());
  }

  render(filter = '') {
    const breeds = this.breeds[this.currentType].filter(breed =>
      breed.name.toLowerCase().includes(filter) || breed.origin.toLowerCase().includes(filter)
    );

    this.elements.breedGrid.innerHTML = breeds.map(breed => `
      <div class="breed-card" onclick="breedInfo.showDetail('${breed.name}')">
        <div class="breed-icon">${breed.icon}</div>
        <div class="breed-name">${breed.name}</div>
        <div class="breed-origin">${breed.origin}</div>
      </div>
    `).join('');
  }

  showDetail(name) {
    const breed = this.breeds[this.currentType].find(b => b.name === name);
    if (!breed) return;

    this.elements.detailIcon.textContent = breed.icon;
    this.elements.detailTitle.textContent = breed.name;
    this.elements.detailSubtitle.textContent = `${breed.origin} | ${breed.size} | ${breed.weight}`;

    this.elements.infoGrid.innerHTML = `
      <div class="info-item">
        <div class="info-label">평균 수명</div>
        <div class="info-value">${breed.lifespan}</div>
      </div>
      <div class="info-item">
        <div class="info-label">체중</div>
        <div class="info-value">${breed.weight}</div>
      </div>
      <div class="info-item">
        <div class="info-label">운동량</div>
        <div class="rating-bar"><div class="rating-fill" style="width: ${breed.exercise * 20}%"></div></div>
      </div>
      <div class="info-item">
        <div class="info-label">미용 관리</div>
        <div class="rating-bar"><div class="rating-fill" style="width: ${breed.grooming * 20}%"></div></div>
      </div>
      <div class="info-item">
        <div class="info-label">친화력</div>
        <div class="rating-bar"><div class="rating-fill" style="width: ${breed.friendly * 20}%"></div></div>
      </div>
      <div class="info-item">
        <div class="info-label">훈련성</div>
        <div class="rating-bar"><div class="rating-fill" style="width: ${breed.trainable * 20}%"></div></div>
      </div>
    `;

    this.elements.traitsList.innerHTML = breed.traits.map(trait =>
      `<span class="trait-tag">${trait}</span>`
    ).join('');

    this.elements.noteText.textContent = breed.note;
    this.elements.detailPanel.style.display = 'block';
  }
}

// 전역 인스턴스 생성
const breedInfo = new BreedInfo();
window.BreedInfo = breedInfo;

// 전역 함수 (HTML onclick 호환)
function setType(type) { breedInfo.setType(type); }
function search(query) { breedInfo.search(query); }

document.addEventListener('DOMContentLoaded', () => breedInfo.init());
