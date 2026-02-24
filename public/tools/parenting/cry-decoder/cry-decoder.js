/**
 * 울음 해석기 - ToolBase 기반
 * 아기 울음 원인 파악 도우미
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var CryDecoder = class CryDecoder extends ToolBase {
  constructor() {
    super('CryDecoder');
    this.selectedType = null;
    this.logs = [];

    this.cryData = {
      hungry: {
        title: '배고픔',
        desc: '규칙적이고 리듬있는 울음입니다. 손을 입으로 가져가거나 젖을 찾는 행동을 보일 수 있습니다.',
        solutions: [
          '수유 시간인지 확인하세요',
          '모유 또는 분유를 먹이세요',
          '먹이기 전 트림을 시켜주세요',
          '수유 후에도 울면 추가 수유를 고려하세요'
        ]
      },
      tired: {
        title: '피곤함/졸림',
        desc: '보채듯 징징거리는 울음입니다. 눈을 비비거나 하품을 하고, 귀나 머리를 잡아당기기도 합니다.',
        solutions: [
          '조용하고 어두운 환경을 만들어주세요',
          '부드럽게 안아서 흔들어주세요',
          '자장가나 백색소음을 틀어주세요',
          '규칙적인 수면 스케줄을 유지하세요'
        ]
      },
      diaper: {
        title: '기저귀 교체 필요',
        desc: '갑자기 울기 시작하며 불편해하는 모습입니다. 기저귀 발진이 있을 수 있습니다.',
        solutions: [
          '기저귀 상태를 확인하세요',
          '깨끗한 기저귀로 교체하세요',
          '발진이 있으면 연고를 바르세요',
          '피부를 완전히 말린 후 기저귀를 채우세요'
        ]
      },
      pain: {
        title: '불편함/통증',
        desc: '날카롭고 갑작스러운 울음입니다. 몸을 움츠리거나 특정 부위를 만지면 더 울 수 있습니다.',
        solutions: [
          '체온을 측정하세요 (38°C 이상시 병원 방문)',
          '옷이 조이거나 불편하지 않은지 확인하세요',
          '머리카락이 손가락에 감기지 않았는지 확인하세요',
          '증상이 지속되면 소아과를 방문하세요'
        ]
      },
      attention: {
        title: '관심/안아달라',
        desc: '울다가 멈추다가를 반복합니다. 눈을 마주치면 잠시 멈추거나 안으면 그치는 경우가 많습니다.',
        solutions: [
          '아기를 안아주세요',
          '눈을 맞추고 말을 걸어주세요',
          '스킨십을 늘려주세요',
          '아기와 함께 놀아주세요'
        ]
      },
      colic: {
        title: '영아산통',
        desc: '매일 비슷한 시간(주로 저녁)에 격렬하게 울며, 주먹을 쥐고 다리를 배쪽으로 끌어당깁니다.',
        solutions: [
          '아기를 엎드려 안아 배를 가볍게 눌러주세요',
          '따뜻한 물수건을 배에 대주세요',
          '자전거 타기 동작으로 다리를 움직여주세요',
          '3개월 전후로 자연스럽게 호전됩니다'
        ]
      },
      hot: {
        title: '더움',
        desc: '땀을 흘리고 얼굴이 붉어지며 불편해합니다. 목이나 등에 땀띠가 생길 수 있습니다.',
        solutions: [
          '옷을 한 겹 벗겨주세요',
          '실내 온도를 22-24°C로 맞추세요',
          '통풍이 잘 되는 옷을 입혀주세요',
          '수분 섭취를 늘려주세요'
        ]
      },
      cold: {
        title: '추움',
        desc: '손발이 차갑고 피부가 창백할 수 있습니다. 몸을 웅크리는 모습을 보입니다.',
        solutions: [
          '옷을 한 겹 더 입혀주세요',
          '담요로 감싸주세요',
          '실내 온도를 확인하세요',
          '손발을 따뜻하게 해주세요'
        ]
      }
    };
  }

  init() {
    this.initElements({
      resultTitle: 'resultTitle',
      resultDesc: 'resultDesc',
      resultPanel: 'resultPanel',
      solutionList: 'solutionList',
      solutionSection: 'solutionSection',
      logList: 'logList'
    });

    this.loadLogs();
    this.renderLogs();

    console.log('[CryDecoder] 초기화 완료');
    return this;
  }

  loadLogs() {
    const saved = localStorage.getItem('cryLogs');
    if (saved) {
      this.logs = JSON.parse(saved);
    }
  }

  saveLogs() {
    localStorage.setItem('cryLogs', JSON.stringify(this.logs));
  }

  select(type) {
    this.selectedType = type;

    // UI 업데이트
    document.querySelectorAll('.cry-option').forEach(opt => {
      opt.classList.toggle('selected', opt.dataset.type === type);
    });

    // 결과 표시
    const data = this.cryData[type];
    if (data) {
      this.elements.resultTitle.textContent = data.title;
      this.elements.resultDesc.textContent = data.desc;
      this.elements.resultPanel.classList.add('show');

      // 솔루션 표시
      this.elements.solutionList.innerHTML = data.solutions.map((sol, i) => `
        <li>
          <span class="solution-num">${i + 1}</span>
          <span class="solution-text">${sol}</span>
        </li>
      `).join('');
      this.elements.solutionSection.style.display = 'block';

      // 로그 추가
      this.addLog(type, data.title);
    }
  }

  addLog(type, title) {
    this.logs.unshift({
      type,
      title: title.replace(/^[^\s]+\s/, ''), // 이모지 제거
      time: new Date().toISOString()
    });

    // 최근 20개만 유지
    if (this.logs.length > 20) {
      this.logs = this.logs.slice(0, 20);
    }

    this.saveLogs();
    this.renderLogs();
  }

  renderLogs() {
    if (this.logs.length === 0) {
      this.elements.logList.innerHTML = '<div class="log-empty">기록이 없습니다</div>';
      return;
    }

    this.elements.logList.innerHTML = this.logs.slice(0, 5).map(log => {
      const time = new Date(log.time);
      const timeStr = `${time.getMonth() + 1}/${time.getDate()} ${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`;
      return `<div class="log-item">
        <span>${log.title}</span>
        <span style="color: var(--text-secondary);">${timeStr}</span>
      </div>`;
    }).join('');
  }

  clearLog() {
    if (confirm('울음 기록을 모두 삭제할까요?')) {
      this.logs = [];
      this.saveLogs();
      this.renderLogs();
      this.showToast('기록이 삭제되었습니다', 'success');
    }
  }
}

// 전역 인스턴스 생성
const cryDecoder = new CryDecoder();
window.CryDecoder = cryDecoder;

// 전역 함수 (HTML onclick 호환)
function select(type) { cryDecoder.select(type); }
function clearLog() { cryDecoder.clearLog(); }

document.addEventListener('DOMContentLoaded', () => cryDecoder.init());
