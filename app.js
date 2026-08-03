/* ============================================================
   eXGOLFLAB — Dashboard Logic (app.js v16 Tax & Multi-Menu Integration)
   ============================================================ */

(function () {
  'use strict';

  const G = GolfApp;
  let salesChartInstance = null;
  let coachChartInstance = null;

  // ─── KPI Cards ───

  function updateKPICards(year, month, userRole) {
    const isStaff = userRole === 'staff';
    const stats = G.calcMonthlyStats(year, month);

    const prevMonthDate = new Date(year, month - 1, 1);
    const prevStats = G.calcMonthlyStats(prevMonthDate.getFullYear(), prevMonthDate.getMonth());

    const totalEl = document.getElementById('kpiTotalSales');
    const totalChangeEl = document.getElementById('kpiTotalSalesChange');
    if (totalEl) {
      totalEl.textContent = isStaff ? '****' : G.formatCurrency(stats.total);
    }
    if (totalChangeEl) {
      if (isStaff) {
        totalChangeEl.style.display = 'none';
      } else {
        const change = G.calcChange(stats.total, prevStats.total);
        totalChangeEl.style.display = '';
        totalChangeEl.className = `kpi-change ${change >= 0 ? 'up' : 'down'}`;
        totalChangeEl.textContent = `${change >= 0 ? '+' : ''}${change}% 前月比`;
      }
    }

    const lessonEl = document.getElementById('kpiLessonCount');
    const lessonChangeEl = document.getElementById('kpiLessonCountChange');
    if (lessonEl) lessonEl.textContent = `${stats.lessonCount}回`;
    if (lessonChangeEl) {
      const change = G.calcChange(stats.lessonCount, prevStats.lessonCount);
      lessonChangeEl.className = `kpi-change ${change >= 0 ? 'up' : 'down'}`;
      lessonChangeEl.textContent = `${change >= 0 ? '+' : ''}${change}% 前月比`;
    }

    const coachEl = document.getElementById('kpiActiveCoaches');
    if (coachEl) coachEl.textContent = `${stats.coachCount}名`;

    const revEl = document.getElementById('kpiEstimatedRevenue');
    if (revEl) {
      revEl.textContent = isStaff ? '****' : G.formatCurrency(stats.lessonRevenue);
    }
  }

  // ─── Charts & Tables ───

  function renderSalesChart(trend, isStaff) {
    const ctx = document.getElementById('salesChart');
    if (!ctx) return;

    if (salesChartInstance) salesChartInstance.destroy();

    if (isStaff) {
      const parent = ctx.parentElement;
      if (parent) {
        parent.innerHTML = '<div class="empty-state"><div class="empty-state-text">店舗アカウントでは売上グラフは非表示です</div></div>';
      }
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
            backgroundColor: '#111111',
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
          barPercentage: 0.5,
        }],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: { label: ctx => `実施回数: ${ctx.parsed.x}回` },
          },
        },
        scales: {
          x: { beginAtZero: true, ticks: { stepSize: 5 } },
          y: { grid: { display: false } },
        },
      },
    });
  }

  function renderCoachTable(coachStats) {
    const tbody = document.querySelector('#coachTable tbody');
    if (!tbody) return;

    const entries = Object.entries(coachStats).sort((a, b) => b[1].lessonCount - a[1].lessonCount);
    if (entries.length === 0) {
      tbody.innerHTML = `<tr><td colspan="3"><div class="empty-state"><div class="empty-state-text">データがありません</div></div></td></tr>`;
      return;
    }

    const maxCount = Math.max(...entries.map(([, s]) => s.lessonCount), 1);

    tbody.innerHTML = entries.map(([name, stats]) => {
      const utilization = Math.round((stats.lessonCount / G.MAX_LESSONS_PER_MONTH) * 100);
      const isHigh = stats.lessonCount === maxCount;
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
    updateTaxToggleUI();
  }

  // ─── Tax Mode Toggle ───

  function updateTaxToggleUI() {
    const isIncl = G.isTaxInclusiveMode();
    const btnExcl = document.getElementById('taxModeExcl');
    const btnIncl = document.getElementById('taxModeIncl');
    if (btnExcl && btnIncl) {
      if (isIncl) {
        btnExcl.classList.remove('active');
        btnIncl.classList.add('active');
      } else {
        btnExcl.classList.add('active');
        btnIncl.classList.remove('active');
      }
    }
  }

  // ─── Multi-Menu Sales Calculation ───

  function updateMultiMenuSalesTotal() {
    const checkboxes = document.querySelectorAll('input[name="salesMenuSelect"]:checked');
    let totalNet = 0;
    const selectedNames = [];
    let hasMonthly = false;
    let hasTicket = false;

    checkboxes.forEach(cb => {
      const card = cb.closest('.menu-checkbox-card');
      if (card) {
        const priceNet = parseInt(card.dataset.priceNet, 10) || 0;
        const name = card.dataset.menuName;
        totalNet += priceNet;
        selectedNames.push(name);

        if (name.includes('コース') || name.includes('月会費')) hasMonthly = true;
        if (name.includes('チケット') || name.includes('都度払い') || name.includes('法人')) hasTicket = true;
      }
    });

    const totalIncl = G.calcTaxAmount(totalNet);

    // Auto set sales amount (Net)
    const amountInput = document.getElementById('salesAmount');
    if (amountInput) {
      amountInput.value = totalNet > 0 ? totalNet : '';
    }

    // Auto update live sum badge
    const liveTotal = document.getElementById('salesLiveTotal');
    if (liveTotal) {
      liveTotal.innerHTML = `選択合計: <strong>税別 ¥${totalNet.toLocaleString('ja-JP')}</strong> <small>（税込10% ¥${totalIncl.toLocaleString('ja-JP')}）</small>`;
    }

    // Auto update sales description
    const descInput = document.getElementById('salesDescription');
    if (descInput) {
      descInput.value = selectedNames.join(', ');
    }

    // Auto update sales type classification
    const typeSelect = document.getElementById('salesType');
    if (typeSelect) {
      if (hasMonthly) typeSelect.value = 'monthly_fee';
      else if (hasTicket) typeSelect.value = 'ticket';
      else if (selectedNames.length > 0) typeSelect.value = 'other';
    }
  }

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

    const checkboxes = document.querySelectorAll('input[name="salesMenuSelect"]:checked');
    const selectedMenuIds = Array.from(checkboxes).map(cb => cb.value);
    const selectedMenuNames = Array.from(checkboxes).map(cb => cb.closest('.menu-checkbox-card')?.dataset.menuName).filter(Boolean);

    const sales = G.getSales();
    sales.push({
      id: G.generateId(),
      date,
      customerName,
      type,
      paymentMethod,
      amount, // Always stored as net price for precision
      menuIds: selectedMenuIds,
      menuNames: selectedMenuNames,
      description: description || selectedMenuNames.join(', ') || (type === 'monthly_fee' ? '月会費' : type === 'ticket' ? 'チケット' : 'その他売上'),
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
    G.populateMenuDropdown('lessonMenu');
    G.populateCoachDropdown('lessonCoach');
    G.populateCustomerDatalist('customerDatalist');
    G.renderHeaderUserBlock();
    G.setupExportModalHandler();

    refreshDashboard();

    document.getElementById('monthSelector')?.addEventListener('change', refreshDashboard);

    // Tax Mode Toggle Handlers
    document.getElementById('taxModeExcl')?.addEventListener('click', () => {
      G.setTaxInclusiveMode(false);
      refreshDashboard();
    });
    document.getElementById('taxModeIncl')?.addEventListener('click', () => {
      G.setTaxInclusiveMode(true);
      refreshDashboard();
    });

    // Open Sales Modal Setup
    document.getElementById('openSalesModalBtn')?.addEventListener('click', () => {
      G.populateSalesMenuCheckboxes('salesMenuCheckboxes');
      document.querySelectorAll('input[name="salesMenuSelect"]').forEach(cb => {
        cb.addEventListener('change', updateMultiMenuSalesTotal);
      });
      G.openModal('salesModal');
    });

    document.getElementById('openLessonModalBtn')?.addEventListener('click', () => G.openModal('lessonModal'));
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
