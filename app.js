/* ============================================================
   Dashboard Page — Logic (v11 with RBAC)
   ============================================================ */

(function () {
  'use strict';

  const G = GolfApp;

  let salesChartInstance = null;
  let coachChartInstance = null;

  // ─── KPI ───

  function updateKPI(cardId, value, changePercent, isMasked) {
    const card = document.getElementById(cardId);
    if (!card) return;
    const valueEl = card.querySelector('.kpi-value');
    const changeEl = card.querySelector('.kpi-change');

    if (isMasked) {
      valueEl.textContent = '***';
      changeEl.textContent = '非表示';
      changeEl.className = 'kpi-change neutral';
      return;
    }

    const isCurrency = ['kpiMonthlyFee', 'kpiTicket', 'kpiOther', 'kpiTotal'].includes(cardId);
    valueEl.textContent = isCurrency ? G.formatCompact(value) : value;

    if (changePercent === null || changePercent === undefined) {
      changeEl.textContent = '—';
      changeEl.className = 'kpi-change neutral';
    } else if (changePercent > 0) {
      changeEl.textContent = `↑ ${changePercent}%`;
      changeEl.className = 'kpi-change positive';
    } else if (changePercent < 0) {
      changeEl.textContent = `↓ ${Math.abs(changePercent)}%`;
      changeEl.className = 'kpi-change negative';
    } else {
      changeEl.textContent = '→ 0%';
      changeEl.className = 'kpi-change neutral';
    }
  }

  function updateKPICards(year, month, userRole) {
    const isStaff = userRole === 'staff';
    const current = G.calcMonthlyStats(year, month);
    const prevDate = new Date(year, month - 1, 1);
    const previous = G.calcMonthlyStats(prevDate.getFullYear(), prevDate.getMonth());

    updateKPI('kpiMonthlyFee', current.monthlyFee, G.calcChange(current.monthlyFee, previous.monthlyFee), isStaff);
    updateKPI('kpiTicket', current.ticketSales, G.calcChange(current.ticketSales, previous.ticketSales), isStaff);
    updateKPI('kpiOther', current.otherSales, G.calcChange(current.otherSales, previous.otherSales), isStaff);
    updateKPI('kpiTotal', current.total, G.calcChange(current.total, previous.total), isStaff);
    updateKPI('kpiLessons', current.lessonCount, G.calcChange(current.lessonCount, previous.lessonCount), false);
  }

  // ─── Charts ───

  function renderSalesChart(trend, isStaff) {
    const ctx = document.getElementById('salesChart');
    if (!ctx) return;
    if (salesChartInstance) salesChartInstance.destroy();

    if (isStaff) {
      ctx.parentElement.innerHTML = `<h2 class="card-title">売上推移</h2><div class="empty-state"><div class="empty-state-text">閲覧権限が制限されています</div></div>`;
      return;
    }

    salesChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: trend.map(t => t.label),
        datasets: [
          {
            label: '月会費',
            data: trend.map(t => t.monthlyFee),
            backgroundColor: '#333333',
            borderRadius: 4,
            borderSkipped: false,
            barPercentage: 0.7,
            categoryPercentage: 0.65,
          },
          {
            label: 'チケット',
            data: trend.map(t => t.ticketSales),
            backgroundColor: '#888888',
            borderRadius: 4,
            borderSkipped: false,
            barPercentage: 0.7,
            categoryPercentage: 0.65,
          },
          {
            label: 'その他',
            data: trend.map(t => t.otherSales),
            backgroundColor: '#DDDDDD',
            borderRadius: 4,
            borderSkipped: false,
            barPercentage: 0.7,
            categoryPercentage: 0.65,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        interaction: { intersect: false, mode: 'index' },
        plugins: {
          legend: { position: 'top', align: 'end' },
          tooltip: {
            callbacks: { label: ctx => ctx.dataset.label + ': ' + G.formatCurrency(ctx.parsed.y) },
          },
        },
        scales: {
          x: { grid: { display: false } },
          y: { beginAtZero: true, ticks: { callback: v => G.formatCompact(v) } },
        },
      },
    });
  }

  function renderCoachChart(coachStats) {
    const ctx = document.getElementById('coachChart');
    if (!ctx) return;
    if (coachChartInstance) coachChartInstance.destroy();

    const entries = Object.entries(coachStats).sort((a, b) => b[1].lessonCount - a[1].lessonCount);
    const names = entries.map(([n]) => n);
    const counts = entries.map(([, s]) => s.lessonCount);
    const maxCount = Math.max(...counts, 1);
    const colors = counts.map(c => (c === maxCount ? '#1A6B3C' : '#DDDDDD'));

    coachChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: names,
        datasets: [{
          label: 'レッスン数',
          data: counts,
          backgroundColor: colors,
          borderRadius: 4,
          borderSkipped: false,
          barPercentage: 0.6,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        indexAxis: 'y',
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx => ctx.parsed.x + '回' } },
        },
        scales: {
          x: { beginAtZero: true, ticks: { stepSize: 5 } },
          y: { grid: { display: false } },
        },
      },
    });
  }

  // ─── Tables ───

  function renderCoachTable(coachStats) {
    const tbody = document.querySelector('#coachTable tbody');
    if (!tbody) return;

    const entries = Object.entries(coachStats).sort((a, b) => b[1].lessonCount - a[1].lessonCount);

    if (entries.length === 0 || entries.every(([, s]) => s.lessonCount === 0)) {
      tbody.innerHTML = `<tr><td colspan="3"><div class="empty-state"><div class="empty-state-text">この月のレッスンデータはありません</div></div></td></tr>`;
      return;
    }

    tbody.innerHTML = entries.map(([name, stats]) => {
      const utilization = Math.min(Math.round((stats.lessonCount / G.MAX_LESSONS_PER_MONTH) * 100), 100);
      const isHigh = utilization >= 70;
      return `
        <tr>
          <td><div class="coach-name-cell"><div class="coach-avatar">${name.charAt(0)}</div>${name}</div></td>
          <td class="text-right">${stats.lessonCount}回</td>
          <td>
            <div class="utilization-bar">
              <div class="utilization-track"><div class="utilization-fill ${isHigh ? 'high' : ''}" style="width:${utilization}%"></div></div>
              <span class="utilization-text">${utilization}%</span>
            </div>
          </td>
        </tr>`;
    }).join('');
  }

  function renderSalesTable(trend, isStaff) {
    const tbody = document.querySelector('#salesTable tbody');
    if (!tbody) return;

    if (isStaff) {
      tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><div class="empty-state-text">閲覧権限が制限されています</div></div></td></tr>`;
      return;
    }

    tbody.innerHTML = trend.map((t, i) => {
      const isLatest = i === trend.length - 1;
      return `
        <tr>
          <td>${t.label}</td>
          <td class="text-right">${G.formatCurrency(t.monthlyFee)}</td>
          <td class="text-right">${G.formatCurrency(t.ticketSales)}</td>
          <td class="text-right">${G.formatCurrency(t.otherSales)}</td>
          <td class="text-right ${isLatest ? 'highlight-value' : ''}">${G.formatCurrency(t.total)}</td>
        </tr>`;
    }).join('');
  }

  // ─── Refresh ───

  function refreshDashboard() {
    const currentUser = CloudAuth.getCurrentUser();
    const userRole = currentUser ? currentUser.role : 'admin';
    const isStaff = userRole === 'staff';

    const { year, month } = G.getSelectedMonth();
    updateKPICards(year, month, userRole);
    const trend = G.getSalesTrend(year, month, 6);
    renderSalesChart(trend, isStaff);
    renderSalesTable(trend, isStaff);
    const coachStats = G.calcCoachStats(year, month);
    renderCoachChart(coachStats);
    renderCoachTable(coachStats);
    G.populateCustomerDatalist('customerDatalist');
  }

  // ─── Event Handlers ───

  function handleSalesSubmit(e) {
    e.preventDefault();
    const date = document.getElementById('salesDate').value;
    const customerName = document.getElementById('salesCustomer').value.trim();
    const type = document.getElementById('salesType').value;
    const paymentMethod = document.getElementById('salesPaymentMethod').value;
    const amount = parseInt(document.getElementById('salesAmount').value, 10);
    const description = document.getElementById('salesDescription').value;
    if (!date || !type || !paymentMethod || isNaN(amount) || amount <= 0) return;

    if (customerName) {
      G.saveCustomerName(customerName);
    }

    const sales = G.getSales();
    sales.push({
      id: G.generateId(),
      date,
      customerName,
      type,
      paymentMethod,
      amount,
      description: description || (type === 'monthly_fee' ? '月会費' : type === 'ticket' ? 'チケット' : 'その他売上'),
    });
    G.saveSales(sales);
    G.closeModal('salesModal');
    e.target.reset();
    refreshDashboard();
    G.showToast('売上を登録しました');
  }

  function handleLessonSubmit(e) {
    e.preventDefault();
    const date = document.getElementById('lessonDate').value;
    const startTime = document.getElementById('lessonStartTime').value;
    const endTime = document.getElementById('lessonEndTime').value;
    const customerName = document.getElementById('lessonCustomer').value.trim();
    const coachName = document.getElementById('lessonCoach').value;
    const menuId = document.getElementById('lessonMenu').value;

    if (!date || !startTime || !endTime || !coachName || !menuId) return;

    const menu = G.getMenuById(menuId);
    if (!menu) return;

    if (customerName) {
      G.saveCustomerName(customerName);
    }

    const lessons = G.getLessons();
    lessons.push({
      id: G.generateId(),
      date,
      startTime,
      endTime,
      customerName,
      coachName,
      menuId: menu.id,
      menuName: menu.name,
      menuPrice: menu.price,
    });
    G.saveLessons(lessons);
    G.closeModal('lessonModal');
    e.target.reset();
    refreshDashboard();
    G.showToast('レッスンを登録しました');
  }

  // ─── Init ───

  function init() {
    const currentUser = CloudAuth.requireAuth(['admin', 'shop']);
    if (!currentUser) return;

    G.generateSampleData();
    G.configureChartDefaults();
    G.populateMonthSelector();
    G.populateCoachDropdown();
    G.populateMenuDropdown();
    G.populateCustomerDatalist('customerDatalist');
    G.renderHeaderUserBlock();

    refreshDashboard();

    G.setupExportModalHandler();

    document.getElementById('monthSelector')?.addEventListener('change', refreshDashboard);
    document.getElementById('addSalesBtn')?.addEventListener('click', () => {
      G.populateCustomerDatalist('customerDatalist');
      G.openModal('salesModal');
    });
    document.getElementById('addLessonBtn')?.addEventListener('click', () => {
      G.populateCustomerDatalist('customerDatalist');
      G.openModal('lessonModal');
    });
    document.getElementById('closeSalesModal')?.addEventListener('click', () => G.closeModal('salesModal'));
    document.getElementById('closeLessonModal')?.addEventListener('click', () => G.closeModal('lessonModal'));
    document.getElementById('salesForm')?.addEventListener('submit', handleSalesSubmit);
    document.getElementById('lessonForm')?.addEventListener('submit', handleLessonSubmit);
    G.setupModalClose();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
