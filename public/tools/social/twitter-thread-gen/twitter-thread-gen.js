/**
 * 트위터 스레드 생성기 - ToolBase 기반
 * 긴 텍스트를 트윗 스레드로 분할
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var TwitterThread = class TwitterThread extends ToolBase {
  constructor() {
    super('TwitterThread');
    this.maxLength = 280;
    this.tweets = [];
  }

  init() {
    this.initElements({
      inputText: 'inputText',
      username: 'username',
      threadPreview: 'threadPreview'
    });

    console.log('[TwitterThread] 초기화 완료');
    return this;
  }

  generate() {
    const text = this.elements.inputText.value;
    const username = this.elements.username.value || '@user';

    if (!text.trim()) {
      this.elements.threadPreview.innerHTML = '';
      this.tweets = [];
      return;
    }

    this.tweets = this.splitIntoTweets(text);
    this.renderPreview(username);
  }

  splitIntoTweets(text) {
    const tweets = [];
    const sentences = text.split(/(?<=[.!?])\s+/);
    let currentTweet = '';

    for (const sentence of sentences) {
      if (sentence.length > this.maxLength - 10) {
        if (currentTweet) {
          tweets.push(currentTweet.trim());
          currentTweet = '';
        }
        const words = sentence.split(' ');
        for (const word of words) {
          if ((currentTweet + ' ' + word).length > this.maxLength - 10) {
            tweets.push(currentTweet.trim());
            currentTweet = word;
          } else {
            currentTweet += (currentTweet ? ' ' : '') + word;
          }
        }
      } else if ((currentTweet + ' ' + sentence).length > this.maxLength - 10) {
        tweets.push(currentTweet.trim());
        currentTweet = sentence;
      } else {
        currentTweet += (currentTweet ? ' ' : '') + sentence;
      }
    }

    if (currentTweet.trim()) {
      tweets.push(currentTweet.trim());
    }

    return tweets.map((tweet, i) => {
      if (tweets.length > 1) {
        return `${tweet} (${i + 1}/${tweets.length})`;
      }
      return tweet;
    });
  }

  renderPreview(username) {
    const displayName = username.replace('@', '');

    this.elements.threadPreview.innerHTML = this.tweets.map((tweet, i) => {
      const length = tweet.length;
      let counterClass = '';
      if (length > this.maxLength) counterClass = 'error';
      else if (length > this.maxLength - 20) counterClass = 'warning';

      return `
        <div class="tweet-card">
          <div class="tweet-header">
            <div class="tweet-avatar">${displayName.charAt(0).toUpperCase()}</div>
            <div>
              <div class="tweet-name">${displayName}</div>
              <div class="tweet-handle">${username}</div>
            </div>
            <span class="thread-number">${i + 1}/${this.tweets.length}</span>
          </div>
          <div class="tweet-content">${this.escapeHtml(tweet)}</div>
          <div class="tweet-counter ${counterClass}">${length}/${this.maxLength}</div>
        </div>
      `;
    }).join('');
  }

  escapeHtml(text) {
    return text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  copyAll() {
    if (this.tweets.length === 0) {
      this.showToast('복사할 스레드가 없습니다', 'error');
      return;
    }

    const text = this.tweets.join('\n\n---\n\n');
    this.copyToClipboard(text);
    this.showToast(`${this.tweets.length}개 트윗 복사됨!`, 'success');
  }
}

// 전역 인스턴스 생성
const twitterThread = new TwitterThread();
window.TwitterThread = twitterThread;

document.addEventListener('DOMContentLoaded', () => twitterThread.init());
