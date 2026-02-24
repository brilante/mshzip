/**
 * EPUB 리더 - ToolBase 기반
 * 전자책 뷰어
 * @created 2026-01-13
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var EpubReader = class EpubReader extends ToolBase {
  constructor() {
    super('EpubReader');
    this.chapters = [];
    this.currentChapter = 0;
    this.fontSize = 16;
    this.sampleBook = {
      title: '어린 왕자 (발췌)',
      chapters: [
        {
          title: '헌사',
          content: `<h1>어린 왕자</h1>
<h2>헌사</h2>
<p>레옹 베르트에게</p>
<p>어린이 여러분, 이 책을 어른에게 바치는 것을 용서해 주세요. 중대한 이유가 있습니다. 이 어른은 내가 세상에서 가지고 있는 가장 좋은 친구입니다.</p>
<p>또 하나의 이유가 있습니다. 이 어른은 어린이를 위한 책도 이해할 수 있습니다. 어린이였던 적이 있는 어른들에게 바칩니다. 모든 어른들은 처음에는 어린이였습니다. 하지만 그것을 기억하는 어른은 거의 없습니다.</p>`
        },
        {
          title: '제1장',
          content: `<h2>제1장</h2>
<p>내가 여섯 살이었을 때, 나는 「체험한 이야기들」이라는 제목의 원시림에 관한 책에서 멋진 그림을 본 적이 있습니다. 그것은 보아뱀이 맹수를 삼키는 그림이었습니다.</p>
<p>그 책에는 이렇게 쓰여 있었습니다. "보아뱀은 먹이를 씹지 않고 통째로 삼킵니다. 그런 다음에는 움직일 수 없어서 여섯 달 동안 잠을 자면서 소화시킵니다."</p>
<p>나는 그때 정글의 모험에 대해 많이 생각했습니다. 그리고 색연필로 내 첫 번째 그림을 그렸습니다.</p>`
        },
        {
          title: '제2장',
          content: `<h2>제2장</h2>
<p>그렇게 나는 혼자서 살았습니다. 진정으로 이야기할 상대가 없이. 그러다가 6년 전 사하라 사막에서 비행기가 고장 났습니다.</p>
<p>엔진에 무엇인가 고장이 났던 것입니다. 그리고 정비사도 승객도 없었기 때문에 나는 혼자서 어려운 수리를 해내야만 했습니다. 그것은 나에게 생사가 걸린 문제였습니다. 겨우 일주일 정도 마실 물밖에 없었으니까요.</p>
<p>첫날 밤 나는 사람 사는 곳에서 천 마일이나 떨어진 모래 위에서 잠들었습니다. 큰 바다 한가운데 뗏목 위에 난파된 사람보다 더 외로웠습니다.</p>`
        }
      ]
    };
  }

  init() {
    this.initElements({
      uploadZone: 'uploadZone',
      uploadPanel: 'uploadPanel',
      tocPanel: 'tocPanel',
      readerPanel: 'readerPanel',
      bookTitle: 'bookTitle',
      tocList: 'tocList',
      readerContent: 'readerContent',
      readerContainer: 'readerContainer',
      pageInfo: 'pageInfo',
      fontSizeDisplay: 'fontSizeDisplay'
    });

    this.setupDragDrop();
    this.loadSettings();

    console.log('[EpubReader] 초기화 완료');
    return this;
  }

  setupDragDrop() {
    const uploadZone = this.elements.uploadZone;

    this.on(uploadZone, 'dragover', (e) => {
      e.preventDefault();
      uploadZone.classList.add('dragover');
    });

    this.on(uploadZone, 'dragleave', () => {
      uploadZone.classList.remove('dragover');
    });

    this.on(uploadZone, 'drop', (e) => {
      e.preventDefault();
      uploadZone.classList.remove('dragover');
      const file = e.dataTransfer.files[0];
      if (file) this.processFile(file);
    });
  }

  loadSettings() {
    try {
      const saved = localStorage.getItem('epubReaderSettings');
      if (saved) {
        const settings = JSON.parse(saved);
        this.fontSize = settings.fontSize || 16;
        this.updateFontSize();
      }
    } catch (e) {}
  }

  saveSettings() {
    localStorage.setItem('epubReaderSettings', JSON.stringify({
      fontSize: this.fontSize
    }));
  }

  handleFile(event) {
    const file = event.target.files[0];
    if (file) this.processFile(file);
  }

  processFile(file) {
    const extension = file.name.split('.').pop().toLowerCase();

    if (extension === 'txt') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target.result;
        this.loadTextContent(file.name, content);
      };
      reader.readAsText(file);
    } else if (extension === 'epub') {
      alert('EPUB 파일 지원을 위해서는 JSZip 라이브러리가 필요합니다.\nTXT 파일을 사용하거나 샘플 문서를 확인해주세요.');
    } else {
      alert('지원하지 않는 파일 형식입니다.');
    }
  }

  loadTextContent(filename, content) {
    const title = filename.replace(/\.[^/.]+$/, '');
    const paragraphs = content.split(/\n\n+/).filter(p => p.trim());

    const chapters = [];
    let currentChapter = { title: '시작', content: '' };
    let charCount = 0;
    let chapterNum = 1;

    paragraphs.forEach(para => {
      const trimmed = para.trim();
      if (charCount > 1000) {
        chapters.push(currentChapter);
        chapterNum++;
        currentChapter = { title: `${chapterNum}장`, content: '' };
        charCount = 0;
      }
      currentChapter.content += `<p>${trimmed}</p>`;
      charCount += trimmed.length;
    });

    if (currentChapter.content) {
      chapters.push(currentChapter);
    }

    this.chapters = chapters;
    this.currentChapter = 0;
    this.showReader(title);
  }

  loadSample() {
    this.chapters = this.sampleBook.chapters;
    this.currentChapter = 0;
    this.showReader(this.sampleBook.title);
  }

  showReader(title) {
    this.elements.uploadPanel.style.display = 'none';
    this.elements.tocPanel.style.display = 'block';
    this.elements.readerPanel.style.display = 'block';
    this.elements.bookTitle.textContent = title;

    this.renderToc();
    this.renderChapter();
    this.updateFontSize();
  }

  renderToc() {
    this.elements.tocList.innerHTML = this.chapters.map((chapter, index) => `
      <div class="toc-item ${index === this.currentChapter ? 'active' : ''}" onclick="epubReader.goToChapter(${index})">
        ${chapter.title}
      </div>
    `).join('');
  }

  renderChapter() {
    this.elements.readerContent.innerHTML = this.chapters[this.currentChapter].content;
    this.elements.pageInfo.textContent = `${this.currentChapter + 1} / ${this.chapters.length}`;
    this.renderToc();
    this.elements.readerContainer.scrollTop = 0;
  }

  goToChapter(index) {
    if (index >= 0 && index < this.chapters.length) {
      this.currentChapter = index;
      this.renderChapter();
    }
  }

  prevChapter() {
    if (this.currentChapter > 0) {
      this.currentChapter--;
      this.renderChapter();
    }
  }

  nextChapter() {
    if (this.currentChapter < this.chapters.length - 1) {
      this.currentChapter++;
      this.renderChapter();
    }
  }

  changeFontSize(delta) {
    this.fontSize = Math.max(12, Math.min(28, this.fontSize + delta));
    this.updateFontSize();
    this.saveSettings();
  }

  updateFontSize() {
    this.elements.readerContent.style.fontSize = `${this.fontSize}px`;
    this.elements.fontSizeDisplay.textContent = `${this.fontSize}px`;
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const epubReader = new EpubReader();
window.EpubReader = epubReader;

document.addEventListener('DOMContentLoaded', () => epubReader.init());
