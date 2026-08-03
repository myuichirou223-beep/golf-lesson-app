/* ============================================================
   Coaches Page — Logic (v11 with RBAC)
   ============================================================ */

(function () {
  'use strict';

  const G = GolfApp;

  let selectedCoachId = null;
  let coachLessonChartInstance = null;
  let coachTypeChartInstance = null;

  // ─── Dynamic Specialty Checkboxes (from menus) ───

  function populateSpecialtyCheckboxes(containerId, checkedValues) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const menus = G.getActiveMenus();
    const checked = checkedValues || [];
    container.innerHTML = menus.map(m => `
      <label class="checkbox-label">
        <input type="checkbox" name="${containerId}_cb" value="${m.name}" ${checked.includes(m.name) ? 'checked' : ''}>
        <span>${m.name}</span>
      </label>
    `).join('');
  }

  // ─── Coach List ───

  function renderCoachList() {
    const grid = document.getElementById('coachGrid');
    const countEl = document.getElementById('coachCount');
    if (!grid) return;

    const currentUser = CloudAuth.getCurrentUser();
    let coaches = G.getCoaches().filter(c => c.active);

    // If logged in as coach, filter to only show self
    if (currentUser && currentUser.role === 'coach') {
      coaches = coaches.filter(c => c.name === currentUser.coachName);
    }

    if (countEl) countEl.textContent = `${coaches.length}名`;

    if (coaches.length === 0) {
      grid.innerHTML = `
        <div class="coach-empty-card">
          <div class="empty-state">
            <div class="empty-state-text">コーチが登録されていません<br>「＋ コーチ登録」から追加してください</div>
          </div>
        </div>`;
      return;
    }

    const { year, month } = G.getSelectedMonth();
    const coachStats = G.calcCoachStats(year, month);

    grid.innerHTML = coaches.map(coach => {
      const stats = coachStats[coach.name] || { lessonCount: 0 };
      const isSelected = coach.id === selectedCoachId;
      return `
        <div class="coach-card ${isSelected ? 'selected' : ''}" data-coach-id="${coach.id}" role="button" tabindex="0">
          <div class="coach-card-top">
            <div class="coach-avatar-md">${coach.name.charAt(0)}</div>
            <div class="coach-card-info">
              <span class="coach-card-name">${coach.name}</span>
              <span class="coach-card-specialty">${(coach.specialties || []).slice(0, 2).join('・') || '—'}</span>
            </div>
          </div>
          <div class="coach-card-stats">
            <div class="coach-card-stat">
              <span class="coach-stat-value">${stats.lessonCount}</span>
              <span class="coach-stat-label">今月レッスン数</span>
            </div>
          </div>
        </div>`;
    }).join('');

    grid.querySelectorAll('.coach-card').forEach(card => {
      card.addEventListener('click', () => selectCoach(card.dataset.coachId));
      card.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectCoach(card.dataset.coachId); }
      });
    });
  }

  function selectCoach(coachId) {
    selectedCoachId = coachId;
    document.querySelectorAll('.coach-card').forEach(c => c.classList.toggle('selected', c.dataset.coachId === coachId));
    document.getElementById('coachDetailSection').style.display = '';
    document.getElementById('coachEmptyDetail').style.display = 'none';
    renderCoachDetail();
  }

  // ─── Coach Detail ───

  function renderCoachDetail() {
    if (!selectedCoachId) return;
    const coach = G.getCoachById(selectedCoachId);
    if (!coach) return;

    const currentUser = CloudAuth.getCurrentUser();
    const isCoachRole = currentUser && currentUser.role === 'coach';

    // Hide edit/delete actions if not admin
    const actionsEl = document.querySelector('.coach-info-actions');
    if (actionsEl) {
      actionsEl.style.display = (currentUser && currentUser.role === 'admin') ? '' : 'none';
    }

    const { year, month } = G.getSelectedMonth();

    document.getElementById('coachAvatar').textContent = coach.name.charAt(0);
    document.getElementById('coachDetailName').textContent = coach.name;
    document.getElementById('coachSince').textContent = `登録: ${coach.registeredAt}`;
    document.getElementById('coachBio').textContent = coach.bio || '';
    document.getElementById('coachSpecialties').textContent = (coach.specialties || []).join(' / ') || '未設定';

    // KPIs
    const stats = G.calcCoachStats(year, month);
    const s = stats[coach.name] || { lessonCount: 0 };
    const utilization = Math.min(Math.round((s.lessonCount / G.MAX_LESSONS_PER_MONTH) * 100), 100);
    const allTime = G.calcCoachAllTimeStats(coach.name);

    const prevDate = new Date(year, month - 1, 1);
    const prevStats = G.calcCoachStats(prevDate.getFullYear(), prevDate.getMonth());
    const ps = prevStats[coach.name] || { lessonCount: 0 };
    const prevUtil = Math.min(Math.round((ps.lessonCount / G.MAX_LESSONS_PER_MONTH) * 100), 100);

    updateKPI('coachKpiLessons', `${s.lessonCount}回`, G.calcChange(s.lessonCount, ps.lessonCount));
    updateKPI('coachKpiUtilization', `${utilization}%`, G.calcChange(utilization, prevUtil));
    updateKPI('coachKpiTotal', `${allTime.totalLessons}回`, null);

    renderCoachLessonChart(coach.name, year, month);
    renderCoachMenuChart(coach.name, year, month);
    renderLessonHistory(coach.name, year, month);
  }

  function updateKPI(cardId, valueText, changePercent) {
    const card = document.getElementById(cardId);
    if (!card) return;
    card.querySelector('.kpi-value').textContent = valueText;
    const changeEl = card.querySelector('.kpi-change');
    if (changePercent === null || changePercent === undefined) {
      changeEl.textContent = '全期間'; changeEl.className = 'kpi-change neutral';
    } else if (changePercent > 0) {
      changeEl.textContent = `↑ ${changePercent}%`; changeEl.className = 'kpi-change positive';
    } else if (changePercent < 0) {
      changeEl.textContent = `↓ ${Math.abs(changePercent)}%`; changeEl.className = 'kpi-change negative';
    } else {
      changeEl.textContent = '→ 0%'; changeEl.className = 'kpi-change neutral';
    }
  }

  // ─── Charts ───

  function renderCoachLessonChart(coachName, year, month) {
    const ctx = document.getElementById('coachLessonChart');
    if (!ctx) return;
    if (coachLessonChartInstance) coachLessonChartInstance.destroy();

    const trend = G.calcCoachMonthlyTrend(coachName, year, month, 6);

    coachLessonChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: trend.map(t => t.label),
        datasets: [{
          label: 'レッスン数',
          data: trend.map(t => t.lessonCount),
          backgroundColor: trend.map((_, i) => i === trend.length - 1 ? '#1A6B3C' : '#DDDDDD'),
          borderRadius: 4, borderSkipped: false, barPercentage: 0.6,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: true,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => `${c.parsed.y}回` } } },
        scales: { x: { grid: { display: false } }, y: { beginAtZero: true, ticks: { stepSize: 5 } } },
      },
    });
  }

  function renderCoachMenuChart(coachName, year, month) {
    const ctx = document.getElementById('coachTypeChart');
    if (!ctx) return;
    if (coachTypeChartInstance) coachTypeChartInstance.destroy();

    const breakdown = G.calcCoachMenuBreakdown(coachName, year, month);
    const labels = Object.keys(breakdown);
    const data = Object.values(breakdown);
    const hasData = data.some(v => v > 0);

    if (!hasData || labels.length === 0) {
      coachTypeChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: { labels: ['データなし'], datasets: [{ data: [1], backgroundColor: ['#F0F0F0'], borderWidth: 0 }] },
        options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { display: false }, tooltip: { enabled: false } } },
      });
      return;
    }

    const palette = ['#333333', '#666666', '#888888', '#AAAAAA', '#BBBBBB', '#1A6B3C', '#DDDDDD'];

    coachTypeChartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{ data, backgroundColor: palette.slice(0, labels.length), borderWidth: 2, borderColor: '#FFFFFF' }],
      },
      options: {
        responsive: true, maintainAspectRatio: true, cutout: '60%',
        plugins: {
          legend: { position: 'bottom', labels: { padding: 12, font: { size: 10 } } },
          tooltip: {
            callbacks: {
              label: c => {
                const total = c.dataset.data.reduce((a, b) => a + b, 0);
                return `${c.label}: ${c.parsed}回 (${Math.round((c.parsed / total) * 100)}%)`;
              },
            },
          },
        },
      },
    });
  }

  // ─── Lesson History ───

  function renderLessonHistory(coachName, year, month) {
    const tbody = document.querySelector('#lessonHistoryTable tbody');
    const countEl = document.getElementById('lessonHistoryCount');
    if (!tbody) return;

    const history = G.getCoachLessonHistory(coachName, year, month);
    if (countEl) countEl.textContent = `${history.length}件`;

    if (history.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><div class="empty-state-text">この月のレッスン履歴はありません</div></div></td></tr>`;
      return;
    }

    tbody.innerHTML = history.map(l => `
      <tr>
        <td>${G.formatDate(l.date)}</td>
        <td>${G.formatTimeRange(l.startTime, l.endTime)}</td>
        <td>${l.customerName || '—'}</td>
        <td><span class="lesson-type-badge">${l.menuName || '—'}</span></td>
        <td class="text-right">${G.formatCurrency(l.menuPrice || 0)}</td>
      </tr>
    `).join('');
  }

  // ─── Coach Registration ───

  function handleCoachRegister(e) {
    e.preventDefault();
    const name = document.getElementById('coachNameInput').value.trim();
    if (!name) return;
    const specialties = Array.from(document.querySelectorAll('#specialtiesGroup input:checked')).map(cb => cb.value);
    const bio = document.getElementById('coachBioInput').value.trim();

    const result = G.addCoach(name, specialties, bio);
    if (!result.success) { G.showToast(result.message); return; }

    G.closeModal('coachModal');
    e.target.reset();
    renderCoachList();
    G.showToast(`${name} を登録しました`);
  }

  // ─── Coach Edit ───

  function openEditModal() {
    if (!selectedCoachId) return;
    const coach = G.getCoachById(selectedCoachId);
    if (!coach) return;

    document.getElementById('editCoachId').value = coach.id;
    document.getElementById('editCoachName').value = coach.name;
    document.getElementById('editCoachBioInput').value = coach.bio || '';
    populateSpecialtyCheckboxes('editSpecialtiesGroup', coach.specialties || []);
    G.openModal('editCoachModal');
  }

  function handleCoachEdit(e) {
    e.preventDefault();
    const id = document.getElementById('editCoachId').value;
    const name = document.getElementById('editCoachName').value.trim();
    if (!id || !name) return;

    const specialties = Array.from(document.querySelectorAll('#editSpecialtiesGroup input:checked')).map(cb => cb.value);
    const bio = document.getElementById('editCoachBioInput').value.trim();

    const oldCoach = G.getCoachById(id);
    if (oldCoach && oldCoach.name !== name) {
      const lessons = G.getLessons();
      lessons.forEach(l => { if (l.coachName === oldCoach.name) l.coachName = name; });
      G.saveLessons(lessons);
    }

    G.updateCoach(id, { name, specialties, bio });
    G.closeModal('editCoachModal');
    renderCoachList();
    renderCoachDetail();
    G.showToast('コーチ情報を更新しました');
  }

  // ─── Coach Delete ───

  function openDeleteConfirm() {
    if (!selectedCoachId) return;
    const coach = G.getCoachById(selectedCoachId);
    if (!coach) return;
    document.getElementById('deleteConfirmText').textContent = `「${coach.name}」を削除しますか？\nレッスン履歴データは保持されます。`;
    G.openModal('deleteConfirmModal');
  }

  function handleCoachDelete() {
    if (!selectedCoachId) return;
    G.deleteCoach(selectedCoachId);
    G.closeModal('deleteConfirmModal');
    selectedCoachId = null;
    document.getElementById('coachDetailSection').style.display = 'none';
    document.getElementById('coachEmptyDetail').style.display = '';
    renderCoachList();
    G.showToast('コーチを削除しました');
  }

  // ─── Refresh ───

  function refreshAll() {
    renderCoachList();
    if (selectedCoachId) renderCoachDetail();
  }

  // ─── Init ───

  function init() {
    const currentUser = CloudAuth.requireAuth(['admin', 'shop']);
    if (!currentUser) return;

    G.generateSampleData();
    G.configureChartDefaults();
    G.populateMonthSelector();
    G.renderHeaderUserBlock();

    // Hide Add Coach button for non-admins
    const addBtn = document.getElementById('addCoachBtn');
    if (addBtn && currentUser.role !== 'admin') {
      addBtn.style.display = 'none';
    }

    populateSpecialtyCheckboxes('specialtiesGroup');

    renderCoachList();

    let coaches = G.getCoaches().filter(c => c.active);
    if (currentUser.role === 'coach') {
      const selfCoach = coaches.find(c => c.name === currentUser.coachName);
      if (selfCoach) selectCoach(selfCoach.id);
    } else if (coaches.length > 0) {
      selectCoach(coaches[0].id);
    }

    G.setupExportModalHandler();

    document.getElementById('monthSelector')?.addEventListener('change', refreshAll);
    document.getElementById('addCoachBtn')?.addEventListener('click', () => {
      populateSpecialtyCheckboxes('specialtiesGroup');
      G.openModal('coachModal');
    });
    document.getElementById('closeCoachModal')?.addEventListener('click', () => G.closeModal('coachModal'));
    document.getElementById('closeEditCoachModal')?.addEventListener('click', () => G.closeModal('editCoachModal'));
    document.getElementById('closeDeleteModal')?.addEventListener('click', () => G.closeModal('deleteConfirmModal'));
    document.getElementById('cancelDeleteBtn')?.addEventListener('click', () => G.closeModal('deleteConfirmModal'));

    document.getElementById('coachForm')?.addEventListener('submit', handleCoachRegister);
    document.getElementById('editCoachForm')?.addEventListener('submit', handleCoachEdit);
    document.getElementById('editCoachBtn')?.addEventListener('click', openEditModal);
    document.getElementById('deleteCoachBtn')?.addEventListener('click', openDeleteConfirm);
    document.getElementById('confirmDeleteBtn')?.addEventListener('click', handleCoachDelete);

    G.setupModalClose();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
