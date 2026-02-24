/**
 * 근로계약서 생성기 - ToolBase 기반
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class EmploymentContract extends ToolBase {
  constructor() {
    super('EmploymentContract');
  }

  init() {
    this.initElements({
      companyName: 'companyName',
      ceoName: 'ceoName',
      employeeName: 'employeeName',
      position: 'position',
      startDate: 'startDate',
      endDate: 'endDate',
      workPlace: 'workPlace',
      jobDesc: 'jobDesc',
      workHours: 'workHours',
      breakTime: 'breakTime',
      salary: 'salary',
      payDay: 'payDay',
      preview: 'preview'
    });

    const today = new Date();
    this.elements.startDate.value = today.toISOString().split('T')[0];

    console.log('[EmploymentContract] 초기화 완료');
    return this;
  }

  generate() {
    const companyName = this.elements.companyName.value || '[회사명]';
    const ceoName = this.elements.ceoName.value || '[대표자]';
    const employeeName = this.elements.employeeName.value || '[근로자]';
    const position = this.elements.position.value || '[직위]';
    const startDate = this.elements.startDate.value;
    const endDate = this.elements.endDate.value;
    const workPlace = this.elements.workPlace.value || '[근무지]';
    const jobDesc = this.elements.jobDesc.value || '[업무내용]';
    const workHours = this.elements.workHours.value || '09:00 ~ 18:00';
    const breakTime = this.elements.breakTime.value || '12:00 ~ 13:00';
    const salary = this.elements.salary.value || 0;
    const payDay = this.elements.payDay.value || '매월 25일';

    const startDateStr = startDate ? new Date(startDate).toLocaleDateString('ko-KR') : '[시작일]';
    const endDateStr = endDate ? new Date(endDate).toLocaleDateString('ko-KR') : '정함이 없음';
    const contractType = endDate ? '기간제' : '정규직';
    const salaryFormatted = parseInt(salary).toLocaleString();

    const html = `<h1>근 로 계 약 서</h1>

<p>${companyName} (이하 "사업주")와 ${employeeName} (이하 "근로자")는 다음과 같이 근로계약을 체결한다.</p>

<h2>제1조 (근로계약기간)</h2>
<p>• 계약 형태: ${contractType}</p>
<p>• 시작일: ${startDateStr}</p>
<p>• 종료일: ${endDateStr}</p>

<h2>제2조 (근무 장소)</h2>
<p>${workPlace}</p>

<h2>제3조 (업무 내용)</h2>
<p>${jobDesc}</p>
<p>• 담당 부서/직위: ${position}</p>

<h2>제4조 (근로시간)</h2>
<p>• 근무시간: ${workHours} (휴게시간 제외 실 근로 8시간)</p>
<p>• 휴게시간: ${breakTime}</p>
<p>• 근무일: 주 5일 (월요일 ~ 금요일)</p>
<p>• 주휴일: 매주 토요일, 일요일</p>

<h2>제5조 (임금)</h2>
<p>• 월 급여: 금 ${salaryFormatted}원 (세전)</p>
<p>• 급여일: ${payDay}</p>
<p>• 지급방법: 근로자 명의의 예금계좌 입금</p>

<h2>제6조 (연차유급휴가)</h2>
<p>연차유급휴가는 근로기준법에서 정하는 바에 따라 부여한다.</p>

<h2>제7조 (사회보험 적용)</h2>
<p>사업주는 관계 법령이 정하는 바에 따라 고용보험, 산재보험, 국민연금, 건강보험에 근로자를 가입시킨다.</p>

<h2>제8조 (근로계약서 교부)</h2>
<p>사업주는 본 계약 체결 시 본 계약서를 사본하여 근로자에게 교부한다.</p>

<h2>제9조 (기타)</h2>
<p>본 계약에 명시되지 않은 사항은 근로기준법에 따른다.</p>

<p style="text-align: center; margin-top: 30px;">${new Date().toLocaleDateString('ko-KR')}</p>

<div class="signature-area">
  <div class="signature-box">
    <p><strong>(사업주)</strong></p>
    <p>사업장명: ${companyName}</p>
    <p>대표자: ${ceoName}</p>
    <div class="signature-line">(인)</div>
  </div>
  <div class="signature-box">
    <p><strong>(근로자)</strong></p>
    <p>성명: ${employeeName}</p>
    <p>주소:</p>
    <div class="signature-line">(서명)</div>
  </div>
</div>`;

    this.elements.preview.innerHTML = html;
    this.showToast('근로계약서가 생성되었습니다', 'success');
  }

  copyText() {
    const text = this.elements.preview.innerText;
    this.copyToClipboard(text);
  }

  print() {
    window.print();
  }
}

// 전역 인스턴스 생성
const employmentContract = new EmploymentContract();
window.EmploymentContract = employmentContract;

// 전역 함수 (HTML onclick 호환)
function generate() { employmentContract.generate(); }
function copyText() { employmentContract.copyText(); }
function print() { employmentContract.print(); }

document.addEventListener('DOMContentLoaded', () => employmentContract.init());
