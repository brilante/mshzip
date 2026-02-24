/**
 * 반려동물 비만도 계산기 - ToolBase 기반
 * BCS (Body Condition Score) 기반 체형 평가
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class PetBmiCalc extends ToolBase {
  constructor() {
    super('PetBmiCalc');
    this.bcsData = {
      1: { label: '심한 저체중', desc: '갈비뼈, 척추, 골반이 쉽게 보임. 근육량 감소.' },
      2: { label: '저체중', desc: '갈비뼈가 쉽게 만져지고 보임. 허리 곡선이 뚜렷함.' },
      3: { label: '약간 저체중', desc: '갈비뼈가 쉽게 만져짐. 지방이 거의 없음.' },
      4: { label: '이상적', desc: '갈비뼈가 약간의 지방층 아래 만져짐. 허리 곡선 명확.' },
      5: { label: '이상적', desc: '갈비뼈가 적절한 지방층 아래 만져짐. 균형 잡힌 체형.' },
      6: { label: '약간 과체중', desc: '갈비뼈가 만져지나 지방층이 있음. 허리 곡선 감소.' },
      7: { label: '과체중', desc: '갈비뼈 만지기 어려움. 복부 지방 축적. 허리 곡선 불명확.' },
      8: { label: '비만', desc: '갈비뼈 만지기 매우 어려움. 복부 팽창. 지방 침착 심함.' },
      9: { label: '고도비만', desc: '갈비뼈 전혀 만져지지 않음. 지방이 심하게 축적.' }
    };
  }

  init() {
    this.initElements({
      currentWeight: 'currentWeight',
      idealWeight: 'idealWeight',
      bcsScore: 'bcsScore',
      bcsLabel: 'bcsLabel',
      bcsDesc: 'bcsDesc',
      weightDiff: 'weightDiff',
      obesityRate: 'obesityRate',
      targetWeight: 'targetWeight',
      tipList: 'tipList'
    });

    this.calculate();

    console.log('[PetBmiCalc] 초기화 완료');
    return this;
  }

  calculate() {
    const currentWeight = parseFloat(this.elements.currentWeight.value);
    const idealWeight = parseFloat(this.elements.idealWeight.value);

    if (!currentWeight || !idealWeight || currentWeight <= 0 || idealWeight <= 0) {
      this.showDefault();
      return;
    }

    // 비만도 계산 (%)
    const obesityRate = ((currentWeight - idealWeight) / idealWeight) * 100;

    // BCS 추정 (1-9 스케일)
    let bcs;
    if (obesityRate <= -30) bcs = 1;
    else if (obesityRate <= -20) bcs = 2;
    else if (obesityRate <= -10) bcs = 3;
    else if (obesityRate <= -5) bcs = 4;
    else if (obesityRate <= 5) bcs = 5;
    else if (obesityRate <= 15) bcs = 6;
    else if (obesityRate <= 25) bcs = 7;
    else if (obesityRate <= 40) bcs = 8;
    else bcs = 9;

    const data = this.bcsData[bcs];

    // 결과 표시
    this.elements.bcsScore.textContent = bcs;
    this.elements.bcsLabel.textContent = data.label;
    this.elements.bcsDesc.textContent = data.desc;

    // 색상 설정
    if (bcs >= 4 && bcs <= 5) {
      this.elements.bcsScore.style.color = '#22c55e';
    } else if (bcs <= 3 || bcs >= 7) {
      this.elements.bcsScore.style.color = '#ef4444';
    } else {
      this.elements.bcsScore.style.color = '#eab308';
    }

    // BCS 스케일 업데이트
    document.querySelectorAll('.bcs-dot').forEach((dot, idx) => {
      dot.classList.toggle('active', idx + 1 === bcs);
    });

    // 체중 분석
    const weightDiff = currentWeight - idealWeight;
    this.elements.weightDiff.textContent = `${weightDiff > 0 ? '+' : ''}${weightDiff.toFixed(1)} kg`;
    this.elements.weightDiff.style.color = weightDiff > 0 ? '#ef4444' : weightDiff < 0 ? '#eab308' : '#22c55e';

    this.elements.obesityRate.textContent = `${obesityRate > 0 ? '+' : ''}${obesityRate.toFixed(1)}%`;
    this.elements.obesityRate.style.color = obesityRate > 10 ? '#ef4444' : obesityRate < -10 ? '#eab308' : '#22c55e';

    // 목표 체중 (BCS 5 기준)
    this.elements.targetWeight.textContent = `${idealWeight.toFixed(1)} kg`;

    // 관리 팁 업데이트
    this.updateTips(bcs, obesityRate);
  }

  showDefault() {
    this.elements.bcsScore.textContent = '-';
    this.elements.bcsLabel.textContent = '체중을 입력하세요';
    this.elements.bcsDesc.textContent = '현재 체중과 이상 체중을 입력하면 비만도를 계산합니다';
    this.elements.bcsScore.style.color = 'var(--primary)';

    this.elements.weightDiff.textContent = '-';
    this.elements.obesityRate.textContent = '-';
    this.elements.targetWeight.textContent = '-';

    document.querySelectorAll('.bcs-dot').forEach(dot => dot.classList.remove('active'));
  }

  updateTips(bcs, obesityRate) {
    let tips = [];

    if (bcs <= 3) {
      tips = [
        '수의사와 상담하여 저체중 원인을 파악하세요',
        '고칼로리, 고단백 사료로 변경을 고려하세요',
        '식욕 부진이 있다면 건강 검진을 받으세요',
        '급여량을 10-15% 증가시켜 보세요'
      ];
    } else if (bcs >= 4 && bcs <= 5) {
      tips = [
        '현재 체중을 잘 유지하고 있습니다',
        '규칙적인 운동과 균형 잡힌 식단을 유지하세요',
        '정기적으로 체중을 측정하여 관리하세요',
        '간식은 일일 칼로리의 10% 이내로 제한하세요'
      ];
    } else if (bcs === 6) {
      tips = [
        '간식 급여량을 줄여보세요',
        '산책 시간을 10-15분 늘려보세요',
        '사료 급여량을 5-10% 감량하세요',
        '저칼로리 간식으로 대체하세요'
      ];
    } else {
      tips = [
        '수의사와 체중 감량 계획을 상담하세요',
        '급여량을 15-20% 감량하세요',
        '체중 관리용 사료로 변경을 권장합니다',
        '운동량을 점진적으로 늘리세요',
        '간식을 최소화하고 채소로 대체하세요'
      ];
    }

    this.elements.tipList.innerHTML = tips.map(tip => `<li>${tip}</li>`).join('');
  }
}

// 전역 인스턴스 생성
const petBmiCalc = new PetBmiCalc();
window.PetBmiCalc = petBmiCalc;

// 전역 함수 (HTML onclick 호환)
function calculate() { petBmiCalc.calculate(); }

document.addEventListener('DOMContentLoaded', () => petBmiCalc.init());
