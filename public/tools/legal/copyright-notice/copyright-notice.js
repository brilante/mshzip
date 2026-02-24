/**
 * 저작권 고지 생성기 - ToolBase 기반
 * 저작권 표시 및 라이선스 생성
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var CopyrightNotice = class CopyrightNotice extends ToolBase {
  constructor() {
    super('CopyrightNotice');
    this.selectedLicense = 'all-rights';
    this.selectedFormat = 'text';

    this.licenses = {
      'all-rights': {
        name: 'All Rights Reserved',
        text: (holder, year, work) =>
          `Copyright © ${year} ${holder}. All Rights Reserved.${work ? `\n\n${work}에 대한 모든 권리는 ${holder}에게 있습니다.\n무단 복제, 배포, 수정을 금합니다.` : ''}`,
        html: (holder, year, work) =>
          `<p>&copy; ${year} ${holder}. All Rights Reserved.</p>${work ? `\n<p>${work}에 대한 모든 권리는 ${holder}에게 있습니다.<br>무단 복제, 배포, 수정을 금합니다.</p>` : ''}`,
        markdown: (holder, year, work) =>
          `© ${year} ${holder}. All Rights Reserved.${work ? `\n\n*${work}에 대한 모든 권리는 ${holder}에게 있습니다.*\n*무단 복제, 배포, 수정을 금합니다.*` : ''}`
      },
      'cc-by': {
        name: 'CC BY 4.0',
        text: (holder, year, work) =>
          `${work ? `${work}\n` : ''}Copyright © ${year} ${holder}\n\nThis work is licensed under the Creative Commons Attribution 4.0 International License.\nTo view a copy of this license, visit http://creativecommons.org/licenses/by/4.0/`,
        html: (holder, year, work) =>
          `${work ? `<p><strong>${work}</strong></p>\n` : ''}<p>&copy; ${year} ${holder}</p>\n<p>This work is licensed under a <a rel="license" href="http://creativecommons.org/licenses/by/4.0/">Creative Commons Attribution 4.0 International License</a>.</p>`,
        markdown: (holder, year, work) =>
          `${work ? `**${work}**\n\n` : ''}© ${year} ${holder}\n\nThis work is licensed under [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/)`
      },
      'cc-by-sa': {
        name: 'CC BY-SA 4.0',
        text: (holder, year, work) =>
          `${work ? `${work}\n` : ''}Copyright © ${year} ${holder}\n\nThis work is licensed under the Creative Commons Attribution-ShareAlike 4.0 International License.\nTo view a copy of this license, visit http://creativecommons.org/licenses/by-sa/4.0/`,
        html: (holder, year, work) =>
          `${work ? `<p><strong>${work}</strong></p>\n` : ''}<p>&copy; ${year} ${holder}</p>\n<p>This work is licensed under a <a rel="license" href="http://creativecommons.org/licenses/by-sa/4.0/">Creative Commons Attribution-ShareAlike 4.0 International License</a>.</p>`,
        markdown: (holder, year, work) =>
          `${work ? `**${work}**\n\n` : ''}© ${year} ${holder}\n\nThis work is licensed under [CC BY-SA 4.0](http://creativecommons.org/licenses/by-sa/4.0/)`
      },
      'cc-by-nc': {
        name: 'CC BY-NC 4.0',
        text: (holder, year, work) =>
          `${work ? `${work}\n` : ''}Copyright © ${year} ${holder}\n\nThis work is licensed under the Creative Commons Attribution-NonCommercial 4.0 International License.\nTo view a copy of this license, visit http://creativecommons.org/licenses/by-nc/4.0/`,
        html: (holder, year, work) =>
          `${work ? `<p><strong>${work}</strong></p>\n` : ''}<p>&copy; ${year} ${holder}</p>\n<p>This work is licensed under a <a rel="license" href="http://creativecommons.org/licenses/by-nc/4.0/">Creative Commons Attribution-NonCommercial 4.0 International License</a>.</p>`,
        markdown: (holder, year, work) =>
          `${work ? `**${work}**\n\n` : ''}© ${year} ${holder}\n\nThis work is licensed under [CC BY-NC 4.0](http://creativecommons.org/licenses/by-nc/4.0/)`
      },
      'mit': {
        name: 'MIT License',
        text: (holder, year, work) =>
          `MIT License\n\nCopyright (c) ${year} ${holder}\n\nPermission is hereby granted, free of charge, to any person obtaining a copy\nof this software and associated documentation files (the "Software"), to deal\nin the Software without restriction, including without limitation the rights\nto use, copy, modify, merge, publish, distribute, sublicense, and/or sell\ncopies of the Software, and to permit persons to whom the Software is\nfurnished to do so, subject to the following conditions:\n\nThe above copyright notice and this permission notice shall be included in all\ncopies or substantial portions of the Software.\n\nTHE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR\nIMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,\nFITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE\nAUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER\nLIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,\nOUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE\nSOFTWARE.`,
        html: (holder, year) =>
          `<h3>MIT License</h3>\n<p>Copyright &copy; ${year} ${holder}</p>\n<p>Permission is hereby granted, free of charge, to any person obtaining a copy of this software...</p>\n<p><em>(전문은 텍스트 형식을 사용하세요)</em></p>`,
        markdown: (holder, year) =>
          `# MIT License\n\nCopyright © ${year} ${holder}\n\nPermission is hereby granted, free of charge...\n\n*(See full text for complete license)*`
      },
      'apache': {
        name: 'Apache License 2.0',
        text: (holder, year, work) =>
          `Copyright ${year} ${holder}\n\nLicensed under the Apache License, Version 2.0 (the "License");\nyou may not use this file except in compliance with the License.\nYou may obtain a copy of the License at\n\n    http://www.apache.org/licenses/LICENSE-2.0\n\nUnless required by applicable law or agreed to in writing, software\ndistributed under the License is distributed on an "AS IS" BASIS,\nWITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.\nSee the License for the specific language governing permissions and\nlimitations under the License.`,
        html: (holder, year) =>
          `<p>Copyright ${year} ${holder}</p>\n<p>Licensed under the <a href="http://www.apache.org/licenses/LICENSE-2.0">Apache License, Version 2.0</a></p>`,
        markdown: (holder, year) =>
          `Copyright ${year} ${holder}\n\nLicensed under the [Apache License, Version 2.0](http://www.apache.org/licenses/LICENSE-2.0)`
      }
    };
  }

  init() {
    this.initElements({
      holderName: 'holderName',
      copyrightYear: 'copyrightYear',
      workName: 'workName',
      noticePreview: 'noticePreview'
    });

    this.elements.copyrightYear.value = new Date().getFullYear();

    console.log('[CopyrightNotice] 초기화 완료');
    return this;
  }

  selectLicense(license) {
    this.selectedLicense = license;
    document.querySelectorAll('.license-option').forEach(opt => {
      opt.classList.toggle('selected', opt.dataset.license === license);
    });
  }

  setFormat(format) {
    this.selectedFormat = format;
    document.querySelectorAll('.format-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.format === format);
    });
  }

  generate() {
    const holder = this.elements.holderName.value.trim();
    const year = this.elements.copyrightYear.value.trim();
    const work = this.elements.workName.value.trim();

    if (!holder) {
      this.showToast('저작권자명을 입력해주세요', 'error');
      return;
    }

    if (!year) {
      this.showToast('저작권 년도를 입력해주세요', 'error');
      return;
    }

    const license = this.licenses[this.selectedLicense];
    const notice = license[this.selectedFormat](holder, year, work);

    this.elements.noticePreview.textContent = notice;
    this.showToast('저작권 고지가 생성되었습니다', 'success');
  }

  copy() {
    const notice = this.elements.noticePreview.textContent;
    if (notice === '저작권 정보를 입력하고 생성 버튼을 클릭하세요') {
      this.showToast('먼저 저작권 고지를 생성해주세요', 'error');
      return;
    }
    this.copyToClipboard(notice);
  }
}

// 전역 인스턴스 생성
const copyrightNotice = new CopyrightNotice();
window.CopyrightNotice = copyrightNotice;

// 전역 함수 (HTML onclick 호환)
function selectLicense(license) { copyrightNotice.selectLicense(license); }
function setFormat(format) { copyrightNotice.setFormat(format); }
function generate() { copyrightNotice.generate(); }
function copy() { copyrightNotice.copy(); }

document.addEventListener('DOMContentLoaded', () => copyrightNotice.init());
