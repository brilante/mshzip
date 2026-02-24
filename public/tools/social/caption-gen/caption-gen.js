/**
 * 캡션 생성기 - ToolBase 기반
 * SNS 게시물용 매력적인 캡션 생성
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var CaptionGen = class CaptionGen extends ToolBase {
  constructor() {
    super('CaptionGen');
    this.tone = 'casual';
    this.length = 'short';
    this.generatedCaptions = [];

    this.captionDB = {
      casual: {
        short: [
          '오늘도 좋은 하루 ',
          '이 순간을 기억하며',
          '소소한 행복 ',
          '일상의 한 조각',
          '그냥 좋아서 '
        ],
        medium: [
          '오늘 하루도 수고했어요 \n작은 것에도 감사하는 하루가 되길!',
          '이런 순간들이 모여 추억이 되는 거겠죠?\n오늘도 행복한 하루 보내세요 ',
          '바쁜 일상 속 잠시 멈춤.\n이런 여유가 필요했어요 '
        ],
        long: [
          '오늘 하루를 돌아보니 참 감사한 일들이 많았어요.\n\n바쁘게 살다 보면 놓치기 쉬운 것들,\n오늘은 천천히 느껴봤습니다.\n\n여러분의 오늘은 어땠나요? '
        ]
      },
      funny: {
        short: [
          '살찐 건 기분 탓 ',
          '금요일 = 진짜 나',
          '다이어트는 내일부터 ',
          '인생은 짧고 디저트는 달다 '
        ],
        medium: [
          '월요일: 존재하지 않았으면...\n금요일: 사랑해요 \n\n다들 공감하시죠? ',
          '오늘의 운동: 냉장고까지 왕복 10회 \n건강한 하루였습니다 '
        ],
        long: [
          '어제의 나: "내일부터 진짜 열심히 살아야지!"\n오늘의 나: *침대와 한 몸이 됨*\n\n이게 바로 인생이죠 뭐 \n\n다들 월요일 파이팅! '
        ]
      },
      inspiring: {
        short: [
          '오늘도 성장 중 ',
          '가능성은 무한대 ∞',
          '꿈을 향해 한 걸음 더 ',
          '나를 믿어요 '
        ],
        medium: [
          '실패는 성공의 어머니라고 하죠.\n오늘의 도전이 내일의 성장이 됩니다.\n\n포기하지 마세요! ',
          '작은 시작이 큰 변화를 만듭니다.\n오늘 당신의 한 걸음이 미래를 바꿔요 '
        ],
        long: [
          '3년 전의 저는 이 자리에 설 거라고 상상도 못했어요.\n\n매일 조금씩, 꾸준히 나아갔더니\n어느새 여기까지 왔네요.\n\n여러분도 할 수 있어요.\n포기하지 않으면 길이 열립니다 '
        ]
      },
      professional: {
        short: [
          '새로운 프로젝트 시작 ',
          '성과를 만들어갑니다',
          '팀워크의 힘 ',
          '목표 달성 '
        ],
        medium: [
          '오늘 중요한 미팅을 마쳤습니다.\n좋은 결과가 있기를 기대합니다.\n\n함께 해주신 모든 분들께 감사드립니다 ',
          '새로운 도전은 언제나 설레면서도 긴장되네요.\n최선을 다해 좋은 결과 만들어가겠습니다 '
        ],
        long: [
          '오늘 공유드릴 좋은 소식이 있습니다.\n\n6개월간의 노력 끝에 프로젝트가 성공적으로 마무리되었습니다.\n팀원 모두의 헌신과 노력 덕분입니다.\n\n앞으로도 더 좋은 결과로 보답하겠습니다.\n감사합니다 '
        ]
      },
      romantic: {
        short: [
          '너와 함께라면 어디든 ',
          '사랑해, 매일 더 ',
          '우리의 순간 ',
          '영원히 함께 '
        ],
        medium: [
          '당신과 함께하는 모든 순간이 선물이에요.\n오늘도 고마워요 \n\n앞으로도 함께해요 ',
          '처음 만난 그날처럼 여전히 설레요.\n매일 당신을 만나는 게 행복이에요 '
        ],
        long: [
          '우리가 함께한 시간들을 돌아보면\n정말 행복한 순간들뿐이에요.\n\n앞으로도 더 많은 추억을 만들어가요.\n당신과 함께라면 어떤 일이든 할 수 있어요.\n\n사랑해요 '
        ]
      },
      minimalist: {
        short: [
          '.',
          '순간',
          '여기, 지금',
          '—'
        ],
        medium: [
          '덜어내니 보이는 것들.\n비움의 미학.',
          '복잡한 세상 속\n단순함의 가치.'
        ],
        long: [
          '많은 것을 가지려 했던 시절이 있었다.\n\n이제는 안다.\n적을수록 풍요로워진다는 것을.\n\n비움으로 채워지는 삶.'
        ]
      },
      motivational: {
        short: [
          '할 수 있다 ',
          '시작이 반이다',
          '오늘도 전진 ',
          '포기는 없다 '
        ],
        medium: [
          '힘든 순간이 와도 포기하지 마세요.\n그 순간을 이겨내면 더 강해집니다 \n\n오늘도 파이팅!',
          '성공한 사람들의 공통점?\n실패해도 다시 일어났다는 것.\n\n당신도 할 수 있어요! '
        ],
        long: [
          '1년 전 오늘, 저는 모든 것을 포기하고 싶었습니다.\n\n하지만 한 걸음 더 나아갔고,\n그 한 걸음이 오늘의 저를 만들었어요.\n\n지금 힘드신 분들, 조금만 더 버텨보세요.\n분명 좋은 날이 올 거예요 '
        ]
      },
      poetic: {
        short: [
          '빛과 그림자 사이',
          '계절이 바뀌듯',
          '스쳐가는 바람처럼',
          '별이 되어'
        ],
        medium: [
          '하루가 저물어가는 시간,\n노을이 하늘을 물들입니다.\n\n이 순간의 아름다움을 가슴에 담아요.',
          '꽃잎이 떨어지듯\n시간은 흐르고\n우리는 그 안에서 피어납니다.'
        ],
        long: [
          '창밖으로 내리는 빗소리를 듣습니다.\n\n하늘이 세상을 씻어내고 있네요.\n비가 그치면 더 맑은 하늘이 펼쳐지겠죠.\n\n우리의 마음도 그렇게\n한 번쯤 씻겨 나가면 좋겠습니다.'
        ]
      }
    };

    this.emojiDB = {
      casual: ['', '', '', '', '', '', '', '', '', ''],
      funny: ['', '', '', '', '', '', '', '', '', ''],
      inspiring: ['', '', '', '', '', '', '', '', '', ''],
      professional: ['', '', '', '', '', '', '', '', '', ''],
      romantic: ['', '', '', '', '', '', '', '', '', ''],
      minimalist: ['·', '—', '○', '◦', '∞', '◇', '△', '□', '∙', ''],
      motivational: ['', '', '', '', '', '', '', '', '', ''],
      poetic: ['', '', '', '', '', '', '', '', '', '']
    };

    this.templates = {
      daily: '오늘 하루도 감사한 마음으로 ',
      food: '맛있는 건 언제나 옳다 ',
      travel: '여행은 또 다른 삶의 시작 ',
      selfie: '오늘의 나 ',
      quote: '"인생에서 가장 중요한 건 지금 이 순간이다"',
      announcement: '새로운 소식을 전해드립니다! '
    };
  }

  init() {
    this.initElements({
      topic: 'topic',
      captionList: 'captionList',
      captionOutput: 'captionOutput',
      emojiList: 'emojiList'
    });

    console.log('[CaptionGen] 초기화 완료');
    return this;
  }

  selectTone(tone) {
    this.tone = tone;
    document.querySelectorAll('.tone-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tone === tone);
    });
  }

  selectLength(length) {
    this.length = length;
    document.querySelectorAll('.length-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.length === length);
    });
  }

  generate() {
    const topic = this.elements.topic.value.trim();
    const captions = this.captionDB[this.tone][this.length];
    const emojis = this.emojiDB[this.tone];

    const selectedCaptions = this.shuffleArray([...captions]).slice(0, 3);

    if (topic) {
      selectedCaptions[0] = this.incorporateTopic(selectedCaptions[0], topic);
    }

    this.renderCaptions(selectedCaptions, emojis);
  }

  incorporateTopic(caption, topic) {
    const prefixes = [
      `${topic} \n\n`,
      `오늘의 ${topic} \n\n`,
      `${topic}에서 \n\n`
    ];
    return prefixes[Math.floor(Math.random() * prefixes.length)] + caption;
  }

  renderCaptions(captions, emojis) {
    this.elements.captionList.innerHTML = captions.map((caption, i) => `
      <div class="caption-card">
        <div class="caption-text">${caption}</div>
        <div class="caption-meta">
          <span>${caption.length}자</span>
          <div class="caption-actions">
            <span class="caption-action" onclick="captionGen.copy(${i})">복사</span>
            <span class="caption-action" onclick="captionGen.regenerate(${i})">재생성</span>
          </div>
        </div>
      </div>
    `).join('');

    this.elements.emojiList.innerHTML = emojis.map(emoji =>
      `<span class="emoji-item" onclick="captionGen.copyEmoji('${emoji}')">${emoji}</span>`
    ).join('');

    this.elements.captionOutput.style.display = 'block';
    this.generatedCaptions = captions;

    this.showToast('캡션 생성 완료!', 'success');
  }

  copy(index) {
    navigator.clipboard.writeText(this.generatedCaptions[index]);
    this.showToast('캡션이 복사되었습니다!', 'success');
  }

  copyEmoji(emoji) {
    navigator.clipboard.writeText(emoji);
    this.showToast('이모지 복사: ' + emoji, 'success');
  }

  regenerate(index) {
    const captions = this.captionDB[this.tone][this.length];
    const newCaption = captions[Math.floor(Math.random() * captions.length)];
    this.generatedCaptions[index] = newCaption;

    const cards = document.querySelectorAll('.caption-card');
    cards[index].querySelector('.caption-text').textContent = newCaption;
    cards[index].querySelector('.caption-meta span').textContent = newCaption.length + '자';

    this.showToast('캡션이 재생성되었습니다!', 'success');
  }

  useTemplate(type) {
    this.elements.topic.value = this.templates[type];
    this.showToast('템플릿이 적용되었습니다!', 'success');
  }

  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
}

// 전역 인스턴스 생성
const captionGen = new CaptionGen();
window.CaptionGen = captionGen;

document.addEventListener('DOMContentLoaded', () => captionGen.init());
