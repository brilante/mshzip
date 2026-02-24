/**
 * AI 챗봇 - ToolBase 기반
 * 다양한 AI 모델과 대화하기
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class AiChatTool extends ToolBase {
  constructor() {
    super('AiChatTool');
    this.selectedModel = 'gpt-4o-mini';
    this.messages = [];
    this.isProcessing = false;

    this.modelNames = {
      'gpt-4o-mini': 'GPT-4o Mini',
      'claude-3-haiku': 'Claude 3 Haiku',
      'gemini-2-flash': 'Gemini 2.0 Flash',
      'grok-3-mini': 'Grok 3 Mini'
    };

    // 데모용 AI 응답
    this.demoResponses = {
      greeting: [
        '안녕하세요! 무엇을 도와드릴까요? ',
        '반갑습니다! 오늘은 어떤 이야기를 나눠볼까요?',
        '안녕하세요! 궁금한 점이 있으시면 물어보세요.'
      ],
      weather: [
        '날씨에 대해 물어보셨네요! 현재 위치 정보가 없어서 정확한 날씨를 알려드리기 어렵지만, 오늘 하루도 좋은 날이 되길 바랍니다! ',
        '날씨 이야기네요! 창문 밖을 한번 보시는 게 가장 정확하겠지만, 오늘도 활기찬 하루 보내세요! '
      ],
      story: [
        '옛날 옛적에 작은 마을에 호기심 많은 아이가 살았어요. 어느 날 아이는 신비로운 숲에서 말하는 토끼를 만났답니다. 토끼는 아이에게 "용기를 가지면 어떤 꿈도 이룰 수 있어"라고 말했어요. 그 말을 들은 아이는 큰 용기를 얻어 마을의 영웅이 되었답니다. ',
        '재미있는 이야기를 들려드릴게요! 한 프로그래머가 있었는데, 버그를 찾다가 결국 버그가 기능이 되어버렸대요. 그래서 "버그가 아니라 기능입니다"라고 문서에 적었답니다. '
      ],
      coding: [
        '코딩 관련 도움이 필요하시군요! 어떤 프로그래밍 언어나 문제에 대해 도움이 필요하신가요? JavaScript, Python, 또는 다른 언어도 괜찮아요! ',
        '코딩 도움을 요청하셨네요! 구체적인 문제나 궁금한 점을 말씀해주시면 더 정확하게 도와드릴 수 있어요. 에러 메시지나 코드 조각이 있으면 공유해주세요! '
      ],
      todo: [
        '할 일 정리를 도와드릴게요! \n\n오늘의 할 일 목록:\n1. 가장 중요한 업무 먼저 처리하기\n2. 이메일 확인 및 답장\n3. 운동하기 (건강이 최고!)\n4. 독서 30분\n5. 내일 일정 미리 확인\n\n무엇을 추가하거나 수정할까요?',
        '할 일 정리해드릴게요!\n\n우선순위 높음\n- 긴급한 업무 처리\n\n일반 업무\n- 회의 참석\n- 문서 작성\n\n개인 관리\n- 운동\n- 휴식\n\n더 추가할 항목이 있으신가요?'
      ],
      default: [
        '흥미로운 질문이네요! 제가 알고 있는 바로는, 이 주제에 대해 다양한 관점이 있습니다. 더 구체적으로 알려주시면 자세히 설명해드릴 수 있어요.',
        '좋은 질문입니다! 이에 대해 제 생각을 말씀드리자면, 상황에 따라 다를 수 있지만 일반적으로는 여러 요소를 고려해야 합니다. 어떤 부분이 가장 궁금하신가요?',
        '네, 말씀해주신 내용을 이해했습니다. 이 주제는 꽤 흥미롭네요! 더 자세한 정보가 필요하시면 언제든 물어보세요. ',
        '그 부분에 대해 생각해보면, 여러 가지 접근 방법이 있을 것 같아요. 어떤 방향으로 진행하고 싶으신지 알려주시면 더 구체적으로 도와드릴 수 있습니다.'
      ]
    };
  }

  init() {
    this.initElements({
      chatInput: 'chatInput',
      chatMessages: 'chatMessages',
      welcomeMessage: 'welcomeMessage'
    });

    this.autoResizeInput();
    console.log('[AiChatTool] 초기화 완료');
    return this;
  }

  selectModel(model) {
    this.selectedModel = model;
    document.querySelectorAll('.model-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.model === model);
    });
    this.showToast(`${this.modelNames[model]} 모델로 변경됨`);
  }

  quickPrompt(text) {
    this.elements.chatInput.value = text;
    this.send();
  }

  handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  autoResizeInput() {
    const input = this.elements.chatInput;
    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    });
  }

  async send() {
    const input = this.elements.chatInput;
    const message = input.value.trim();

    if (!message || this.isProcessing) return;

    // 환영 메시지 제거
    const welcome = document.getElementById('welcomeMessage');
    if (welcome) welcome.remove();

    // 사용자 메시지 추가
    this.addMessage('user', message);
    input.value = '';
    input.style.height = 'auto';

    // AI 응답 생성
    this.isProcessing = true;
    this.showTypingIndicator();

    await this.delay(1000 + Math.random() * 1500);

    this.hideTypingIndicator();
    const response = this.generateResponse(message);
    this.addMessage('assistant', response);

    this.isProcessing = false;
  }

  addMessage(role, content) {
    const messagesDiv = this.elements.chatMessages;
    const messageEl = document.createElement('div');
    messageEl.className = `message ${role}`;

    const header = document.createElement('div');
    header.className = 'message-header';
    header.textContent = role === 'user' ? '나' : this.modelNames[this.selectedModel];

    const contentEl = document.createElement('div');
    contentEl.className = 'message-content';
    contentEl.textContent = content;

    messageEl.appendChild(header);
    messageEl.appendChild(contentEl);
    messagesDiv.appendChild(messageEl);

    this.messages.push({ role, content });
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }

  showTypingIndicator() {
    const messagesDiv = this.elements.chatMessages;
    const indicator = document.createElement('div');
    indicator.className = 'typing-indicator';
    indicator.id = 'typingIndicator';
    indicator.innerHTML = `
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
    `;
    messagesDiv.appendChild(indicator);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }

  hideTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) indicator.remove();
  }

  generateResponse(message) {
    const lowerMsg = message.toLowerCase();

    // 키워드 기반 응답 선택
    if (lowerMsg.includes('안녕') || lowerMsg.includes('하이') || lowerMsg.includes('hello')) {
      return this.randomPick(this.demoResponses.greeting);
    }
    if (lowerMsg.includes('날씨')) {
      return this.randomPick(this.demoResponses.weather);
    }
    if (lowerMsg.includes('이야기') || lowerMsg.includes('재미')) {
      return this.randomPick(this.demoResponses.story);
    }
    if (lowerMsg.includes('코딩') || lowerMsg.includes('프로그래밍') || lowerMsg.includes('코드')) {
      return this.randomPick(this.demoResponses.coding);
    }
    if (lowerMsg.includes('할 일') || lowerMsg.includes('정리') || lowerMsg.includes('todo')) {
      return this.randomPick(this.demoResponses.todo);
    }

    return this.randomPick(this.demoResponses.default);
  }

  randomPick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  clearChat() {
    this.messages = [];
    const messagesDiv = this.elements.chatMessages;
    messagesDiv.innerHTML = `
      <div class="welcome-message" id="welcomeMessage">
        <div class="welcome-icon"></div>
        <div class="welcome-title">AI 챗봇에 오신 것을 환영합니다!</div>
        <div>질문하거나 대화를 시작해보세요.</div>
        <div class="quick-prompts">
          <div class="quick-prompt" onclick="aiChatTool.quickPrompt('오늘 날씨가 어때?')">날씨 이야기</div>
          <div class="quick-prompt" onclick="aiChatTool.quickPrompt('재미있는 이야기 해줘')">이야기 해줘</div>
          <div class="quick-prompt" onclick="aiChatTool.quickPrompt('코딩 도움이 필요해')">코딩 도움</div>
          <div class="quick-prompt" onclick="aiChatTool.quickPrompt('오늘 할 일을 정리해줘')">할 일 정리</div>
        </div>
      </div>
    `;
    this.showToast('대화가 지워졌습니다.');
  }

  exportChat() {
    if (this.messages.length === 0) {
      this.showToast('내보낼 대화가 없습니다.', 'error');
      return;
    }

    const text = this.messages.map(m => {
      const role = m.role === 'user' ? '나' : this.modelNames[this.selectedModel];
      return `[${role}]\n${m.content}`;
    }).join('\n\n---\n\n');

    this.copyToClipboard(text);
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 전역 인스턴스 생성
const aiChatTool = new AiChatTool();
window.AIChat = aiChatTool;

document.addEventListener('DOMContentLoaded', () => aiChatTool.init());
console.log('[AiChatTool] 모듈 로드 완료');
