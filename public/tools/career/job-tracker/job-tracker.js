/**
 * 취업 활동 트래커 - ToolBase 기반
 * 지원 현황 관리
 * @created 2026-01-13
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var JobTracker = class JobTracker extends ToolBase {
  constructor() {
    super('JobTracker');
    this.jobs = [];
    this.filter = 'all';
  }

  init() {
    this.initElements({
      jobModal: 'jobModal',
      modalTitle: 'modalTitle',
      editIndex: 'editIndex',
      jobCompany: 'jobCompany',
      jobTitle: 'jobTitle',
      jobDate: 'jobDate',
      jobStatus: 'jobStatus',
      jobUrl: 'jobUrl',
      jobNotes: 'jobNotes',
      jobList: 'jobList',
      totalCount: 'totalCount',
      appliedCount: 'appliedCount',
      interviewCount: 'interviewCount',
      offerCount: 'offerCount',
      rejectedCount: 'rejectedCount'
    });

    this.loadJobs();
    this.render();
    // 오늘 날짜로 기본값 설정
    this.elements.jobDate.valueAsDate = new Date();

    // 모달 외부 클릭 시 닫기
    this.on(this.elements.jobModal, 'click', (e) => {
      if (e.target.id === 'jobModal') {
        this.hideModal();
      }
    });

    console.log('[JobTracker] 초기화 완료');
    return this;
  }

  loadJobs() {
    try {
      const saved = localStorage.getItem('jobTrackerData');
      if (saved) {
        this.jobs = JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load jobs:', e);
    }
  }

  saveJobs() {
    try {
      localStorage.setItem('jobTrackerData', JSON.stringify(this.jobs));
    } catch (e) {
      console.error('Failed to save jobs:', e);
    }
  }

  setFilter(filter) {
    this.filter = filter;
    document.querySelectorAll('.status-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.filter === filter);
    });
    this.renderJobList();
  }

  getFilteredJobs() {
    if (this.filter === 'all') return this.jobs;
    return this.jobs.filter(job => job.status === this.filter);
  }

  showAddModal() {
    this.elements.modalTitle.textContent = '지원 추가';
    this.elements.editIndex.value = '';
    this.elements.jobCompany.value = '';
    this.elements.jobTitle.value = '';
    this.elements.jobDate.valueAsDate = new Date();
    this.elements.jobStatus.value = 'applied';
    this.elements.jobUrl.value = '';
    this.elements.jobNotes.value = '';
    this.elements.jobModal.classList.add('show');
  }

  showEditModal(index) {
    const job = this.jobs[index];
    this.elements.modalTitle.textContent = '지원 수정';
    this.elements.editIndex.value = index;
    this.elements.jobCompany.value = job.company;
    this.elements.jobTitle.value = job.title;
    this.elements.jobDate.value = job.date;
    this.elements.jobStatus.value = job.status;
    this.elements.jobUrl.value = job.url || '';
    this.elements.jobNotes.value = job.notes || '';
    this.elements.jobModal.classList.add('show');
  }

  hideModal() {
    this.elements.jobModal.classList.remove('show');
  }

  saveJob() {
    const company = this.elements.jobCompany.value.trim();
    const title = this.elements.jobTitle.value.trim();
    const date = this.elements.jobDate.value;
    const status = this.elements.jobStatus.value;
    const url = this.elements.jobUrl.value.trim();
    const notes = this.elements.jobNotes.value.trim();
    const editIndex = this.elements.editIndex.value;

    if (!company || !title) {
      this.showToast('회사명과 직책은 필수입니다.', 'warning');
      return;
    }

    const jobData = {
      company,
      title,
      date,
      status,
      url,
      notes,
      updatedAt: new Date().toISOString()
    };

    if (editIndex !== '') {
      this.jobs[parseInt(editIndex)] = { ...this.jobs[parseInt(editIndex)], ...jobData };
      this.showToast('지원 내역이 수정되었습니다.', 'success');
    } else {
      jobData.createdAt = new Date().toISOString();
      this.jobs.unshift(jobData);
      this.showToast('지원 내역이 추가되었습니다!', 'success');
    }

    this.saveJobs();
    this.hideModal();
    this.render();
  }

  deleteJob(index) {
    if (confirm('이 지원 내역을 삭제하시겠습니까?')) {
      this.jobs.splice(index, 1);
      this.saveJobs();
      this.render();
      this.showToast('삭제되었습니다.', 'success');
    }
  }

  updateStatus(index, status) {
    this.jobs[index].status = status;
    this.jobs[index].updatedAt = new Date().toISOString();
    this.saveJobs();
    this.render();
  }

  render() {
    this.renderStats();
    this.renderJobList();
  }

  renderStats() {
    const counts = {
      total: this.jobs.length,
      applied: this.jobs.filter(j => j.status === 'applied').length,
      interview: this.jobs.filter(j => j.status === 'interview').length,
      offer: this.jobs.filter(j => j.status === 'offer').length,
      rejected: this.jobs.filter(j => j.status === 'rejected').length
    };

    this.elements.totalCount.textContent = counts.total;
    this.elements.appliedCount.textContent = counts.applied;
    this.elements.interviewCount.textContent = counts.interview;
    this.elements.offerCount.textContent = counts.offer;
    this.elements.rejectedCount.textContent = counts.rejected;
  }

  renderJobList() {
    const container = this.elements.jobList;
    const filtered = this.getFilteredJobs();

    if (filtered.length === 0) {
      container.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 2rem;">지원 내역이 없습니다</div>';
      return;
    }

    const statusLabels = {
      applied: '지원',
      interview: '면접',
      offer: '오퍼',
      rejected: '불합격'
    };

    container.innerHTML = filtered.map((job, i) => {
      // 실제 인덱스 찾기 (필터링 전)
      const realIndex = this.jobs.indexOf(job);
      return `
        <div class="job-card ${job.status}">
          <div class="job-header">
            <div>
              <div class="job-title">${job.title}</div>
              <div class="job-company">${job.company}</div>
            </div>
            <span class="status-badge ${job.status}">${statusLabels[job.status]}</span>
          </div>
          ${job.notes ? `<div style="font-size: 0.85rem; color: var(--text-secondary); margin: 0.5rem 0;">${job.notes}</div>` : ''}
          <div class="job-meta">
            <span>${job.date || '날짜 미정'}</span>
            ${job.url ? `<a href="${job.url}" target="_blank" style="color: var(--primary);">공고 보기</a>` : ''}
          </div>
          <div style="display: flex; gap: 0.5rem; margin-top: 0.75rem;">
            <select class="tool-input" style="flex: 1; padding: 0.25rem;" onchange="jobTracker.updateStatus(${realIndex}, this.value)">
              <option value="applied" ${job.status === 'applied' ? 'selected' : ''}>지원</option>
              <option value="interview" ${job.status === 'interview' ? 'selected' : ''}>면접</option>
              <option value="offer" ${job.status === 'offer' ? 'selected' : ''}>오퍼</option>
              <option value="rejected" ${job.status === 'rejected' ? 'selected' : ''}>불합격</option>
            </select>
            <button class="tool-btn tool-btn-secondary" onclick="jobTracker.showEditModal(${realIndex})" style="padding: 0.25rem 0.75rem;"></button>
            <button class="tool-btn tool-btn-secondary" onclick="jobTracker.deleteJob(${realIndex})" style="padding: 0.25rem 0.75rem;"></button>
          </div>
        </div>
      `;
    }).join('');
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const jobTracker = new JobTracker();
window.JobTracker = jobTracker;

document.addEventListener('DOMContentLoaded', () => jobTracker.init());
