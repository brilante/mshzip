/**
 * 해시태그 생성기 - ToolBase 기반
 * SNS 플랫폼별 최적의 해시태그 생성
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var HashtagGen = class HashtagGen extends ToolBase {
  constructor() {
    super('HashtagGen');
    this.platform = 'instagram';
    this.category = 'general';
    this.generatedTags = [];

    this.hashtagDB = {
      instagram: {
        general: ['instagood', 'photooftheday', 'instagram', 'love', 'instadaily', 'instalike', 'picoftheday', 'follow', 'like4like', 'followme'],
        travel: ['travel', 'travelgram', 'instatravel', 'traveling', 'wanderlust', 'vacation', 'travelphotography', 'trip', 'adventure', 'explore', 'traveltheworld', 'travelblogger'],
        food: ['food', 'foodie', 'foodporn', 'instafood', 'yummy', 'delicious', 'foodstagram', 'foodphotography', 'eating', 'homemade', 'tasty', 'foodlover'],
        fashion: ['fashion', 'style', 'ootd', 'fashionblogger', 'fashionista', 'streetstyle', 'outfit', 'stylish', 'fashionstyle', 'instafashion', 'lookbook', 'whatiwore'],
        fitness: ['fitness', 'gym', 'workout', 'fit', 'motivation', 'fitnessmotivation', 'training', 'health', 'fitfam', 'bodybuilding', 'exercise', 'healthy'],
        beauty: ['beauty', 'makeup', 'skincare', 'beautiful', 'cosmetics', 'makeuplover', 'beautyblogger', 'selfcare', 'glam', 'beautytips', 'makeupaddict', 'skincareroutine'],
        tech: ['tech', 'technology', 'gadgets', 'innovation', 'coding', 'programming', 'developer', 'software', 'startup', 'digital', 'ai', 'techlife'],
        business: ['business', 'entrepreneur', 'success', 'motivation', 'marketing', 'startup', 'money', 'businessowner', 'entrepreneurlife', 'hustle', 'goals', 'leadership']
      },
      tiktok: {
        general: ['fyp', 'foryou', 'foryoupage', 'viral', 'trending', 'tiktok', 'tiktokviral', 'xyzbca', 'fypシ', 'viralvideo'],
        travel: ['traveltiktok', 'travellife', 'explore', 'wanderlust', 'vacation', 'roadtrip', 'adventure', 'travelgram', 'trip', 'destination'],
        food: ['foodtiktok', 'foodie', 'recipe', 'cooking', 'yummy', 'mukbang', 'easyrecipe', 'homecooking', 'foodreview', 'delicious'],
        fashion: ['fashiontiktok', 'ootd', 'style', 'outfit', 'grwm', 'fashion', 'styleinspo', 'outfitideas', 'trendy', 'fashiontrends'],
        fitness: ['fitnesstiktok', 'workout', 'gym', 'fitness', 'exercise', 'gains', 'healthylifestyle', 'fitcheck', 'workoutroutine', 'motivation'],
        beauty: ['beautytiktok', 'makeup', 'skincare', 'grwm', 'beautyhacks', 'makeuptutorial', 'skincareroutine', 'glowup', 'beautytips', 'glow'],
        tech: ['techtok', 'tech', 'coding', 'programming', 'learnontiktok', 'developer', 'techreview', 'gadgets', 'softwareengineer', 'ai'],
        business: ['businesstiktok', 'entrepreneur', 'smallbusiness', 'moneytok', 'sidehustle', 'finance', 'investing', 'businessowner', 'startup', 'success']
      },
      twitter: {
        general: ['trending', 'viral', 'followme', 'twittertrends', 'retweet'],
        travel: ['travel', 'wanderlust', 'vacation', 'adventure', 'explore'],
        food: ['food', 'foodie', 'cooking', 'recipe', 'yummy'],
        fashion: ['fashion', 'style', 'ootd', 'streetstyle', 'fashionweek'],
        fitness: ['fitness', 'gym', 'workout', 'health', 'motivation'],
        beauty: ['beauty', 'makeup', 'skincare', 'selfcare', 'beautytips'],
        tech: ['tech', 'coding', 'ai', 'programming', 'startup'],
        business: ['business', 'entrepreneur', 'marketing', 'success', 'leadership']
      },
      youtube: {
        general: ['youtube', 'youtuber', 'subscribe', 'video', 'vlog'],
        travel: ['travelvlog', 'travel', 'vacation', 'roadtrip', 'adventure'],
        food: ['mukbang', 'foodvlog', 'recipe', 'cooking', 'foodreview'],
        fashion: ['fashionvlog', 'haul', 'ootd', 'grwm', 'lookbook'],
        fitness: ['workout', 'fitnessvlog', 'gym', 'homeworkout', 'exercise'],
        beauty: ['beautyvlog', 'makeup', 'tutorial', 'grwm', 'skincare'],
        tech: ['techreview', 'unboxing', 'gadgets', 'technology', 'howto'],
        business: ['businesstips', 'entrepreneur', 'howto', 'tutorial', 'success']
      }
    };

    this.trending = [
      '#2026트렌드', '#일상', '#소통', '#맞팔', '#선팔',
      '#데일리룩', '#오늘의코디', '#먹스타그램', '#맛집투어',
      '#주말', '#일상스타그램', '#좋아요', '#팔로우'
    ];
  }

  init() {
    this.initElements({
      keyword: 'keyword',
      hashtagList: 'hashtagList',
      hashtagOutput: 'hashtagOutput',
      totalCount: 'totalCount',
      charCount: 'charCount',
      reachScore: 'reachScore',
      trendingList: 'trendingList'
    });

    this.renderTrending();

    console.log('[HashtagGen] 초기화 완료');
    return this;
  }

  selectPlatform(platform) {
    this.platform = platform;
    document.querySelectorAll('.platform-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.platform === platform);
    });
  }

  selectCategory(category) {
    this.category = category;
    document.querySelectorAll('.category-chip').forEach(chip => {
      chip.classList.toggle('active', chip.dataset.category === category);
    });
  }

  generate() {
    const keyword = this.elements.keyword.value.trim();
    const baseTags = this.hashtagDB[this.platform][this.category] || this.hashtagDB[this.platform].general;

    let tags = [...baseTags];

    if (keyword) {
      const keywordTags = keyword.split(/[,\s]+/).filter(k => k.length > 0);
      keywordTags.forEach(k => {
        tags.push(k.toLowerCase().replace(/[^a-z0-9가-힣]/g, ''));
        tags.push(k.toLowerCase() + 'gram');
        tags.push(k.toLowerCase() + 'life');
      });
    }

    const limits = { instagram: 30, tiktok: 5, twitter: 3, youtube: 15 };
    tags = [...new Set(tags)].slice(0, limits[this.platform]);

    this.generatedTags = tags;
    this.renderHashtags(tags);
  }

  renderHashtags(tags) {
    this.elements.hashtagList.innerHTML = tags.map(tag =>
      `<span class="hashtag-item" onclick="hashtagGen.copyTag(this, '${tag}')">#${tag}</span>`
    ).join('');

    this.elements.hashtagOutput.style.display = 'block';
    this.elements.totalCount.textContent = tags.length;
    this.elements.charCount.textContent = tags.map(t => '#' + t).join(' ').length;
    this.elements.reachScore.textContent = Math.min(100, tags.length * 3 + Math.floor(Math.random() * 20));

    this.showToast(`${tags.length}개 해시태그 생성 완료!`, 'success');
  }

  copyTag(el, tag) {
    navigator.clipboard.writeText('#' + tag);
    el.classList.add('copied');
    setTimeout(() => el.classList.remove('copied'), 1000);
    this.showToast('복사됨: #' + tag, 'success');
  }

  copyAll() {
    const allTags = this.generatedTags.map(t => '#' + t).join(' ');
    navigator.clipboard.writeText(allTags);
    this.showToast('전체 해시태그 복사 완료!', 'success');
  }

  renderTrending() {
    this.elements.trendingList.innerHTML = this.trending.map(tag =>
      `<span class="trending-item" onclick="hashtagGen.copyTrending('${tag}')">${tag}</span>`
    ).join('');
  }

  copyTrending(tag) {
    navigator.clipboard.writeText(tag);
    this.showToast('복사됨: ' + tag, 'success');
  }
}

// 전역 인스턴스 생성
const hashtagGen = new HashtagGen();
window.HashtagGen = hashtagGen;

document.addEventListener('DOMContentLoaded', () => hashtagGen.init());
