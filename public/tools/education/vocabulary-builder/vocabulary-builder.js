/**
 * 어휘 빌더 - ToolBase 기반
 * 단어장 및 학습
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class VocabularyBuilder extends ToolBase {
  constructor() {
    super('VocabularyBuilder');
    this.words = [];
    this.currentLearnIdx = 0;
    this.currentReviewIdx = 0;
    this.showingAnswer = false;
  }

  init() {
    this.initElements({
      wordInput: 'wordInput',
      meaningInput: 'meaningInput',
      exampleInput: 'exampleInput',
      categoryInput: 'categoryInput',
      addWord: 'addWord',
      totalWords: 'totalWords',
      todayLearned: 'todayLearned',
      learnCard: 'learnCard',
      learnWord: 'learnWord',
      learnMeaning: 'learnMeaning',
      learnExample: 'learnExample',
      knowBtn: 'knowBtn',
      dontKnowBtn: 'dontKnowBtn',
      reviewCard: 'reviewCard',
      reviewWord: 'reviewWord',
      reviewMeaning: 'reviewMeaning',
      reviewExample: 'reviewExample',
      reviewKnow: 'reviewKnow',
      reviewAgain: 'reviewAgain',
      searchWord: 'searchWord',
      filterCategory: 'filterCategory',
      knownCount: 'knownCount',
      unknownCount: 'unknownCount',
      wordList: 'wordList'
    });

    this.loadData();
    this.setupEvents();
    this.renderList();

    console.log('[VocabularyBuilder] 초기화 완료');
    return this;
  }

  loadData() {
    try {
      const saved = localStorage.getItem('vocabulary');
      if (saved) {
        this.words = JSON.parse(saved);
      }
    } catch (e) {}
  }

  saveData() {
    localStorage.setItem('vocabulary', JSON.stringify(this.words));
  }

  setupEvents() {
    // Tabs
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(tab.dataset.tab).classList.add('active');

        if (tab.dataset.tab === 'learn') this.initLearn();
        if (tab.dataset.tab === 'review') this.initReview();
        if (tab.dataset.tab === 'list') this.renderList();
      });
    });

    this.elements.addWord.addEventListener('click', () => this.addWord());
    this.elements.learnCard.addEventListener('click', () => this.flipLearnCard());
    this.elements.knowBtn.addEventListener('click', () => this.markKnow());
    this.elements.dontKnowBtn.addEventListener('click', () => this.markDontKnow());
    this.elements.reviewCard.addEventListener('click', () => this.flipReviewCard());
    this.elements.reviewKnow.addEventListener('click', () => this.reviewMarkKnow());
    this.elements.reviewAgain.addEventListener('click', () => this.initReview());
    this.elements.searchWord.addEventListener('input', () => this.renderList());
    this.elements.filterCategory.addEventListener('change', () => this.renderList());
  }

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  addWord() {
    const word = this.elements.wordInput.value.trim();
    const meaning = this.elements.meaningInput.value.trim();
    const example = this.elements.exampleInput.value.trim();
    const category = this.elements.categoryInput.value.trim();

    if (!word || !meaning) {
      alert('단어와 뜻을 입력하세요');
      return;
    }

    this.words.push({
      id: Date.now(),
      word,
      meaning,
      example,
      category,
      known: false,
      reviewCount: 0,
      lastReview: null
    });

    this.saveData();
    this.showToast('단어가 추가되었습니다!', 'success');

    this.elements.wordInput.value = '';
    this.elements.meaningInput.value = '';
    this.elements.exampleInput.value = '';
  }

  initLearn() {
    this.elements.totalWords.textContent = this.words.length;
    this.elements.todayLearned.textContent = this.words.filter(w => {
      if (!w.lastReview) return false;
      const today = new Date().toDateString();
      return new Date(w.lastReview).toDateString() === today;
    }).length;

    if (this.words.length > 0) {
      this.currentLearnIdx = Math.floor(Math.random() * this.words.length);
      this.showLearnCard();
    }
  }

  showLearnCard() {
    const word = this.words[this.currentLearnIdx];
    if (!word) return;

    this.elements.learnWord.textContent = word.word;
    this.elements.learnMeaning.textContent = word.meaning;
    this.elements.learnExample.textContent = word.example || '';

    document.querySelector('#learnCard .word-front').classList.remove('hidden');
    document.querySelector('#learnCard .word-back').classList.add('hidden');
    this.showingAnswer = false;
  }

  flipLearnCard() {
    if (!this.showingAnswer) {
      document.querySelector('#learnCard .word-front').classList.add('hidden');
      document.querySelector('#learnCard .word-back').classList.remove('hidden');
      this.showingAnswer = true;
    }
  }

  markKnow() {
    if (this.words.length === 0) return;
    this.words[this.currentLearnIdx].known = true;
    this.words[this.currentLearnIdx].lastReview = new Date().toISOString();
    this.saveData();
    this.nextLearnWord();
  }

  markDontKnow() {
    if (this.words.length === 0) return;
    this.words[this.currentLearnIdx].known = false;
    this.words[this.currentLearnIdx].reviewCount++;
    this.words[this.currentLearnIdx].lastReview = new Date().toISOString();
    this.saveData();
    this.nextLearnWord();
  }

  nextLearnWord() {
    this.currentLearnIdx = Math.floor(Math.random() * this.words.length);
    this.showLearnCard();
    this.initLearn();
  }

  initReview() {
    const unknownWords = this.words.filter(w => !w.known);
    if (unknownWords.length > 0) {
      this.currentReviewIdx = this.words.indexOf(unknownWords[Math.floor(Math.random() * unknownWords.length)]);
      this.showReviewCard();
    } else {
      this.elements.reviewWord.textContent = '복습할 단어가 없습니다';
      this.elements.reviewMeaning.textContent = '';
      this.elements.reviewExample.textContent = '';
    }
  }

  showReviewCard() {
    const word = this.words[this.currentReviewIdx];
    if (!word) return;

    this.elements.reviewWord.textContent = word.word;
    this.elements.reviewMeaning.textContent = word.meaning;
    this.elements.reviewExample.textContent = word.example || '';

    document.querySelector('#reviewCard .word-front').classList.remove('hidden');
    document.querySelector('#reviewCard .word-back').classList.add('hidden');
  }

  flipReviewCard() {
    document.querySelector('#reviewCard .word-front').classList.add('hidden');
    document.querySelector('#reviewCard .word-back').classList.remove('hidden');
  }

  reviewMarkKnow() {
    if (this.words.length === 0) return;
    this.words[this.currentReviewIdx].known = true;
    this.saveData();
    this.initReview();
  }

  renderList() {
    const search = this.elements.searchWord.value.toLowerCase();
    const category = this.elements.filterCategory.value;

    const filtered = this.words.filter(w => {
      const matchSearch = w.word.toLowerCase().includes(search) || w.meaning.toLowerCase().includes(search);
      const matchCategory = !category || w.category === category;
      return matchSearch && matchCategory;
    });

    this.elements.knownCount.textContent = this.words.filter(w => w.known).length;
    this.elements.unknownCount.textContent = this.words.filter(w => !w.known).length;

    // Update category filter
    const categories = [...new Set(this.words.map(w => w.category).filter(Boolean))];
    this.elements.filterCategory.innerHTML =
      '<option value="">전체 카테고리</option>' +
      categories.map(c => `<option value="${this.escapeHtml(c)}">${this.escapeHtml(c)}</option>`).join('');

    this.elements.wordList.innerHTML = filtered.map(w => `
      <div class="word-item ${w.known ? 'known' : 'unknown'}">
        <div class="word-item-content">
          <div class="word-item-word">${this.escapeHtml(w.word)}</div>
          <div class="word-item-meaning">${this.escapeHtml(w.meaning)}</div>
          <div class="word-item-category">${this.escapeHtml(w.category || '미분류')}</div>
        </div>
        <button onclick="vocabularyBuilder.deleteWord(${w.id})">삭제</button>
      </div>
    `).join('');
  }

  deleteWord(id) {
    if (confirm('이 단어를 삭제하시겠습니까?')) {
      this.words = this.words.filter(w => w.id !== id);
      this.saveData();
      this.renderList();
    }
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const vocabularyBuilder = new VocabularyBuilder();
window.VocabularyBuilder = vocabularyBuilder;

document.addEventListener('DOMContentLoaded', () => vocabularyBuilder.init());
