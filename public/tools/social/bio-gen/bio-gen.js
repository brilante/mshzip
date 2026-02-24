/**
 * 프로필 바이오 생성기 - ToolBase 기반
 * SNS 프로필에 맞는 매력적인 바이오 작성
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var BioGen = class BioGen extends ToolBase {
  constructor() {
    super('BioGen');
    this.platform = 'instagram';
    this.style = 'professional';
    this.generatedBios = [];

    this.charLimits = {
      instagram: 150,
      twitter: 160,
      tiktok: 80,
      linkedin: 220
    };

    this.templates = {
      professional: {
        instagram: [
          '{role} | {interests} 전문가\n{location}\nDM for collaboration',
          '{role}\n{interests}\n링크트리 확인하세요!',
          '{name} | {role}\n{interests} 콘텐츠 제작\n비즈니스 문의 DM'
        ],
        twitter: [
          '{role} | {interests} 덕후 | 새로운 인사이트 공유 중',
          '{name} • {role} • {interests}에 대해 이야기합니다',
          '{interests} 전문 {role} | 질문은 DM으로'
        ],
        tiktok: [
          '{role} {interests}\n팔로우 해주세요!',
          '{interests} 콘텐츠 \n{role}'
        ],
        linkedin: [
          '{role} | {interests} 분야에서 {experience}년+ 경험\n새로운 기회와 네트워킹에 열려 있습니다.\n함께 성장해요!',
          '{name}\n{role} | {interests} 전문가\n비즈니스 협업 및 네트워킹 환영합니다.'
        ]
      },
      creative: {
        instagram: [
          '{interests}로 세상을 물들이는 중\n{role}\n창작의 순간을 함께해요',
          '{role} | 일상에서 영감을 찾습니다\n{interests} \n새로운 작업 준비 중'
        ],
        twitter: [
          '{interests}에 빠진 {role} | 매일 새로운 것을 만듭니다 ',
          '창작하는 {role} | {interests} | 영감은 어디에나'
        ],
        tiktok: [
          '{role}\n{interests} 크리에이터',
          '{interests} 아트 \n창작하는 재미'
        ],
        linkedin: [
          '{role} | 창의적인 {interests} 솔루션을 만듭니다\n혁신적인 아이디어로 문제를 해결합니다.'
        ]
      },
      casual: {
        instagram: [
          '{interests} 좋아하는 평범한 {role} \n일상 기록 중 \nDM 환영해요!',
          '그냥 {role} \n{interests} | 맛집 | 일상\n소통해요~'
        ],
        twitter: [
          '{interests} 좋아하는 {role} | 일상 트윗 | 소통 환영',
          '평범한 {role}의 비평범한 일상 | {interests}'
        ],
        tiktok: [
          '{role} 브이로그 \n{interests} 일상',
          '그냥 {interests} 좋아함'
        ],
        linkedin: [
          '{role}로 일하고 있습니다.\n{interests}에 관심이 많아요.\n편하게 연락 주세요!'
        ]
      },
      funny: {
        instagram: [
          '{interests} 중독자 \n{role}인 척하는 중\n피드는 진지함 주의 ',
          '프로 {interests}러\n아마추어 {role}\n인생은 짧고 {interests}는 달다 '
        ],
        twitter: [
          '{role}인데 {interests}밖에 모름 | 트위터 중독자 | 팔로우하면 행운이?',
          '낮에는 {role}, 밤에는 {interests} 덕후 '
        ],
        tiktok: [
          '{interests} 바보 \n{role} 맞음',
          '웃기려고 하는 중'
        ],
        linkedin: [
          '{role} | {interests} 애호가\n진지한 척 하지만 사실 {interests}가 제일 좋아요 '
        ]
      },
      minimalist: {
        instagram: [
          '{role}\n{interests}',
          '{name} · {role}',
          '{interests} ·'
        ],
        twitter: [
          '{role}. {interests}.',
          '{interests}',
          '{name} | {role}'
        ],
        tiktok: [
          '{role}',
          '{interests}'
        ],
        linkedin: [
          '{role}\n{interests}'
        ]
      },
      emoji: {
        instagram: [
          '{name}\n{role}\n{interests}\n{location}\nLink below!',
          '{role} \n{interests}\nDaily posts\nDM me!'
        ],
        twitter: [
          '{name} | {role} | {interests} | Global',
          '{role} | {interests} | Growth mindset'
        ],
        tiktok: [
          '{role} \n{interests}',
          '{interests}\n{role}'
        ],
        linkedin: [
          '{name}\n{role}\n{interests} 전문\n연락 환영'
        ]
      }
    };
  }

  init() {
    this.initElements({
      name: 'name',
      role: 'role',
      interests: 'interests',
      bioList: 'bioList',
      bioOutput: 'bioOutput'
    });

    console.log('[BioGen] 초기화 완료');
    return this;
  }

  selectPlatform(platform) {
    this.platform = platform;
    document.querySelectorAll('.platform-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.platform === platform);
    });
  }

  selectStyle(style) {
    this.style = style;
    document.querySelectorAll('.style-chip').forEach(chip => {
      chip.classList.toggle('active', chip.dataset.style === style);
    });
  }

  generate() {
    const name = this.elements.name.value.trim() || '나';
    const role = this.elements.role.value.trim() || '크리에이터';
    const interestsRaw = this.elements.interests.value.trim();
    const interests = interestsRaw ? interestsRaw.split(',').map(i => i.trim()).slice(0, 3).join(' • ') : '일상';

    const templates = this.templates[this.style][this.platform] || this.templates[this.style].instagram;
    const limit = this.charLimits[this.platform];

    const bios = templates.map(template => {
      return template
        .replace(/{name}/g, name)
        .replace(/{role}/g, role)
        .replace(/{interests}/g, interests)
        .replace(/{location}/g, 'Seoul, Korea')
        .replace(/{experience}/g, '5');
    });

    this.renderBios(bios, limit);
  }

  renderBios(bios, limit) {
    this.elements.bioList.innerHTML = bios.map((bio, i) => {
      const charCount = bio.length;
      let countClass = '';
      if (charCount > limit) countClass = 'over';
      else if (charCount > limit * 0.9) countClass = 'warning';

      return `
        <div class="bio-card">
          <div class="bio-preview">${bio}</div>
          <div class="bio-meta">
            <span class="char-count ${countClass}">${charCount}/${limit}자</span>
            <div class="bio-actions">
              <span class="bio-action" onclick="bioGen.copy(${i})">복사</span>
            </div>
          </div>
        </div>
      `;
    }).join('');

    this.elements.bioOutput.style.display = 'block';
    this.generatedBios = bios;

    this.showToast(`${bios.length}개 바이오 생성 완료!`, 'success');
  }

  copy(index) {
    navigator.clipboard.writeText(this.generatedBios[index]);
    this.showToast('바이오가 복사되었습니다!', 'success');
  }
}

// 전역 인스턴스 생성
const bioGen = new BioGen();
window.BioGen = bioGen;

document.addEventListener('DOMContentLoaded', () => bioGen.init());
