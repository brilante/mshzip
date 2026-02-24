/**
 * 랜덤 이름 생성기 - ToolBase 기반
 * 한국어/영어/일본어 랜덤 이름 생성
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class RandomNameGenerator extends ToolBase {
  constructor() {
    super('RandomNameGenerator');
    this.language = 'korean';
    this.gender = 'all';
    this.favorites = JSON.parse(localStorage.getItem('favoriteNames') || '[]');
    this.generatedNames = [];

    this.names = {
      korean: {
        male: {
          first: ['민준', '서준', '도윤', '예준', '시우', '하준', '주원', '지호', '지후', '준서', '준우', '현우', '도현', '지훈', '건우', '우진', '선우', '서진', '연우', '유준'],
          last: ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권', '황', '안', '송', '류', '홍']
        },
        female: {
          first: ['서윤', '서연', '지우', '서현', '민서', '하은', '하윤', '윤서', '지유', '채원', '수아', '지아', '수빈', '다은', '예은', '예린', '유진', '수민', '지민', '채은'],
          last: ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권', '황', '안', '송', '류', '홍']
        }
      },
      english: {
        male: {
          first: ['James', 'John', 'Robert', 'Michael', 'William', 'David', 'Richard', 'Joseph', 'Thomas', 'Charles', 'Daniel', 'Matthew', 'Anthony', 'Mark', 'Donald', 'Steven', 'Paul', 'Andrew', 'Joshua', 'Kenneth'],
          last: ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin']
        },
        female: {
          first: ['Mary', 'Patricia', 'Jennifer', 'Linda', 'Barbara', 'Elizabeth', 'Susan', 'Jessica', 'Sarah', 'Karen', 'Lisa', 'Nancy', 'Betty', 'Margaret', 'Sandra', 'Ashley', 'Kimberly', 'Emily', 'Donna', 'Michelle'],
          last: ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin']
        }
      },
      japanese: {
        male: {
          first: ['하루토', '소타', '미나토', '유토', '하루키', '렌', '유마', '소라', '리쿠', '아오이', '유이토', '히나타', '가이토', '아사히', '유키', '타쿠미', '카이', '쇼타', '타이가', '켄토'],
          last: ['사토', '스즈키', '다카하시', '다나카', '이토', '야마모토', '와타나베', '나카무라', '코바야시', '가토']
        },
        female: {
          first: ['히마리', '히나', '유이', '미오', '사쿠라', '이치카', '아오이', '린', '코코나', '유나', '메이', '하나', '에마', '미유', '하루', '니코', '쇼코', '유카', '레이', '아야'],
          last: ['사토', '스즈키', '다카하시', '다나카', '이토', '야마모토', '와타나베', '나카무라', '코바야시', '가토']
        }
      }
    };
  }

  init() {
    this.initElements({
      count: 'count',
      generateBtn: 'generateBtn',
      copyAllBtn: 'copyAllBtn',
      clearFavBtn: 'clearFavBtn',
      nameList: 'nameList',
      favoritesList: 'favoritesList'
    });

    this.setupEvents();
    this.renderFavorites();

    console.log('[RandomNameGenerator] 초기화 완료');
    return this;
  }

  setupEvents() {
    document.querySelectorAll('.lang-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.language = e.target.dataset.lang;
      });
    });

    document.querySelectorAll('.gender-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.gender-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.gender = e.target.dataset.gender;
      });
    });

    this.elements.generateBtn.addEventListener('click', () => this.generate());
    this.elements.copyAllBtn.addEventListener('click', () => this.copyAll());
    this.elements.clearFavBtn.addEventListener('click', () => this.clearFavorites());
  }

  generate() {
    const count = parseInt(this.elements.count.value) || 5;
    this.generatedNames = [];

    for (let i = 0; i < count; i++) {
      const gender = this.gender === 'all'
        ? (Math.random() > 0.5 ? 'male' : 'female')
        : this.gender;

      const data = this.names[this.language][gender];
      const first = data.first[Math.floor(Math.random() * data.first.length)];
      const last = data.last[Math.floor(Math.random() * data.last.length)];

      const fullName = this.language === 'korean' || this.language === 'japanese'
        ? last + first
        : first + ' ' + last;

      this.generatedNames.push({ name: fullName, gender });
    }

    this.renderNames();
  }

  renderNames() {
    this.elements.nameList.innerHTML = this.generatedNames.map((item, index) => `
      <div class="name-item" style="animation-delay: ${index * 0.05}s">
        <span class="name">${this.escapeHtml(item.name)}</span>
        <div class="actions">
          <button onclick="randomName.copyName('${this.escapeHtml(item.name)}')" title="복사"></button>
          <button onclick="randomName.toggleFavorite('${this.escapeHtml(item.name)}')"
                  class="${this.favorites.includes(item.name) ? 'favorited' : ''}" title="즐겨찾기"></button>
        </div>
      </div>
    `).join('');
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  copyName(name) {
    navigator.clipboard.writeText(name).then(() => {
      this.showToast('복사되었습니다!');
    });
  }

  copyAll() {
    const allNames = this.generatedNames.map(n => n.name).join('\n');
    navigator.clipboard.writeText(allNames).then(() => {
      this.showToast('전체 복사되었습니다!');
    });
  }

  toggleFavorite(name) {
    const index = this.favorites.indexOf(name);
    if (index === -1) {
      this.favorites.push(name);
    } else {
      this.favorites.splice(index, 1);
    }
    localStorage.setItem('favoriteNames', JSON.stringify(this.favorites));
    this.renderNames();
    this.renderFavorites();
  }

  renderFavorites() {
    if (this.favorites.length === 0) {
      this.elements.favoritesList.innerHTML = '<p style="color:#999;">즐겨찾기가 없습니다</p>';
      this.elements.clearFavBtn.style.display = 'none';
    } else {
      this.elements.favoritesList.innerHTML = this.favorites.map(name => `
        <span class="favorite-tag">
          ${this.escapeHtml(name)}
          <button onclick="randomName.toggleFavorite('${this.escapeHtml(name)}')">&times;</button>
        </span>
      `).join('');
      this.elements.clearFavBtn.style.display = 'block';
    }
  }

  clearFavorites() {
    if (confirm('즐겨찾기를 모두 삭제하시겠습니까?')) {
      this.favorites = [];
      localStorage.removeItem('favoriteNames');
      this.renderNames();
      this.renderFavorites();
    }
  }
}

// 전역 인스턴스 생성
const randomName = new RandomNameGenerator();
window.RandomNameGenerator = randomName;

document.addEventListener('DOMContentLoaded', () => randomName.init());
