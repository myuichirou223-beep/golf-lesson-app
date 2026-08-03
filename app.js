/* ============================================================
   eXGOLFLAB — Dashboard Logic (app.js v16 Tax & Multi-Menu Integration)
   ============================================================ */

(function () {
  'use strict';

  const G = GolfApp;
  let salesChartInstance = null;
  let coachChartInstance = null;

  // ─── KPI Cards ───

  function setCardValue(cardId, valueText, changePercent, isStaff, isHiddenForStaff = true) {
    const card = document.getElementById(cardId);
    if (!card) return;
    const valEl = card.querySelector('.kpi-value');
    const changeEl = card.querySelector('.kpi-change');

    if (valEl) {
      valEl.textContent = (isStaff && isHiddenForStaff) ? '****' : valueText;
    }

    if (changeEl) {
      if (isStaff && isHiddenForStaff) {
        changeEl.style.display = 'none';
      } else if (changePercent === null || changePercent === undefined) {
        changeEl.textContent = '前月比 —';
        changeEl.className = 'kpi-change neutral';
      } else if (changePercent > 0) {
        changeEl.textContent = `↑ +${changePercent}% 前月比`;
        changeEl.className = 'kpi-change positive';
      } else if (changePercent < 0) {
        changeEl.textContent = `↓ ${changePercent}% 前月比`;
        changeEl.className = 'kpi-change negative';
      } else {
        changeEl.textContent = '→ 0% 前月比';
        changeEl.className = 'kpi-change neutral';
      }
    }
  }

  function updateKPICards(year, month, userRole) {
    const isStaff = userRole === 'staff';
    const stats = G.calcMonthlyStats(year, month);

    const prevMonthDate = new Date(year, month - 1, 1);
    const prevStats = G.calcMonthlyStats(prevMonthDate.getFullYear(), prevMonthDate.getMonth());

    setCardValue('kpiMonthlyFee', G.formatCurrency(stats.monthlyFee), G.calcChange(stats.monthlyFee, prevStats.monthlyFee), isStaff);
    setCardValue('kpiTicket', G.formatCurrency(stats.ticketSales), G.calcChange(stats.ticketSales, prevStats.ticketSales), isStaff);
    setCardValue('kpiPractice', G.formatCurrency(stats.practiceSales || 0), G.calcChange(stats.practiceSales || 0, prevStats.practiceSales || 0), isStaff);
    setCardValue('kpiOther', G.formatCurrency(stats.otherSales), G.calcChange(stats.otherSales, prevStats.otherSales), isStaff);
    setCardValue('kpiTotal', G.formatCurrency(stats.total), G.calcChange(stats.total, prevStats.total), isStaff);
    setCardValue('kpiLessons', `${stats.lessonCount}回`, G.calcChange(stats.lessonCount, prevStats.lessonCount), isStaff, false);
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
            backgroundColor: '#555555',
            borderRadius: 4,
            borderSkipped: false,
            barPercentage: 0.7,
            categoryPercentage: 0.65,
          },
          {
            label: '練習利用',
            data: trend.map(t => t.practiceSales || 0),
            backgroundColor: '#1A6B3C',
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
      tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="empty-state-text">閲覧権限が制限されています</div></div></td></tr>`;
      return;
    }

    tbody.innerHTML = trend.map((t, i) => {
      const isLatest = i === trend.length - 1;
      return `
        <tr>
          <td>${t.label}</td>
          <td class="text-right">${G.formatCurrency(t.monthlyFee)}</td>
          <td class="text-right">${G.formatCurrency(t.ticketSales)}</td>
          <td class="text-right">${G.formatCurrency(t.practiceSales || 0)}</td>
          <td class="text-right">${G.formatCurrency(t.otherSales)}</td>
          <td class="text-right ${isLatest ? 'highlight-value' : ''}">${G.formatCurrency(t.total)}</td>
        </tr>`;
    }).join('');
  }

  function openEditSalesModal(id) {
    const sale = G.getSalesById(id);
    if (!sale) return;

    document.getElementById('editSalesId').value = sale.id;
    document.getElementById('editSalesDate').value = sale.date;
    document.getElementById('editSalesCustomer').value = sale.customerName || '';
    document.getElementById('editSalesType').value = sale.type || 'other';
    document.getElementById('editSalesPaymentMethod').value = sale.paymentMethod || 'cash';
    document.getElementById('editSalesAmount').value = sale.amount || 0;
    document.getElementById('editSalesDescription').value = sale.description || sale.menuNames?.join(', ') || sale.menuName || '';

    G.openModal('editSalesModal');
  }

  function handleSalesEdit(e) {
    e.preventDefault();
    const id = document.getElementById('editSalesId').value;
    const date = document.getElementById('editSalesDate').value;
    const customerName = document.getElementById('editSalesCustomer').value.trim();
    const type = document.getElementById('editSalesType').value;
    const paymentMethod = document.getElementById('editSalesPaymentMethod').value;
    const amount = Number(document.getElementById('editSalesAmount').value) || 0;
    const description = document.getElementById('editSalesDescription').value.trim();

    if (!id || !date) return;

    if (customerName) {
      G.saveCustomerName(customerName);
    }

    G.updateSales(id, {
      date,
      customerName,
      type,
      paymentMethod,
      amount,
      description,
      menuName: description,
    });

    G.closeModal('editSalesModal');
    refreshDashboard();
    G.showToast('売上データを更新しました');
  }

  function renderSalesDetailTable(year, month, isStaff) {
    const tbody = document.querySelector('#salesDetailTable tbody');
    if (!tbody) return;

    if (isStaff) {
      tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="empty-state-text">店舗アカウントでは売上明細は非表示です</div></div></td></tr>`;
      return;
    }

    const allSales = G.getSales();
    const monthlySales = G.filterByMonth(allSales, year, month)
      .sort((a, b) => b.date.localeCompare(a.date));

    if (monthlySales.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="empty-state-text">選択月の売上データがまだ登録されていません</div></div></td></tr>`;
      return;
    }

    tbody.innerHTML = monthlySales.map(s => {
      const menuText = s.menuName || s.menuNames?.join(', ') || s.description || '—';
      const payText = G.PAYMENT_METHODS[s.paymentMethod] || s.paymentMethod || '—';
      return `
        <tr>
          <td>${G.formatFullDate(s.date)}</td>
          <td><strong>${s.customerName || '未指定'}</strong></td>
          <td>${menuText}</td>
          <td><span class="role-badge badge-staff">${payText}</span></td>
          <td class="text-right highlight-value">${G.formatCurrency(s.amount)}</td>
          <td class="text-center">
            <button class="btn btn-outline btn-xs edit-sale-btn" data-id="${s.id}">編集</button>
            <button class="btn btn-outline btn-xs delete-sale-btn" data-id="${s.id}" style="color:#C62828; border-color:#FFCDD2;">削除</button>
          </td>
        </tr>`;
    }).join('');

    // Attach click events
    tbody.querySelectorAll('.edit-sale-btn').forEach(btn => {
      btn.addEventListener('click', () => openEditSalesModal(btn.dataset.id));
    });

    tbody.querySelectorAll('.delete-sale-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (confirm('この売上データを削除してもよろしいですか？')) {
          G.deleteSales(btn.dataset.id);
          refreshDashboard();
          G.showToast('売上データを削除しました');
        }
      });
    });
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
    renderSalesDetailTable(year, month, isStaff);
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
    let hasPractice = false;

    checkboxes.forEach(cb => {
      const card = cb.closest('.menu-checkbox-card');
      if (card) {
        const priceNet = parseInt(card.dataset.priceNet, 10) || 0;
        const name = card.dataset.menuName;
        totalNet += priceNet;
        selectedNames.push(name);

        if (name.includes('コース') || name.includes('月会費')) hasMonthly = true;
        else if (name.includes('チケット') || name.includes('都度払い') || name.includes('法人')) hasTicket = true;
        else if (name.includes('練習利用') || name.includes('練習')) hasPractice = true;
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
      else if (hasPractice) typeSelect.value = 'practice';
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
    const startTime = document.getElementById('lessonStartTime').value || '10:00';
    const endTime = document.getElementById('lessonEndTime').value || '11:00';
    const customerName = document.getElementById('lessonCustomer').value.trim();
    const coachName = document.getElementById('lessonCoach').value;
    const menuSelect = document.getElementById('lessonMenu');
    const menuId = menuSelect?.value;

    if (!date || !coachName) {
      alert('日付とコーチを選択してください');
      return;
    }

    let menu = G.getLessonMenuById(menuId) || G.getMenuById(menuId);
    let menuName = menu ? menu.name : (menuSelect ? menuSelect.options[menuSelect.selectedIndex]?.text.split('（')[0] : 'レッスン');
    let menuPrice = G.getLessonMenuUnitPrice(menuId, menuName);

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
      menuId: menu ? menu.id : G.generateId(),
      menuName,
      menuPrice,
    });

    G.saveLessons(lessons);
    G.closeModal('lessonModal');
    e.target.reset();
    refreshDashboard();
    G.showToast('レッスン実績を登録しました');
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
    function openSalesModalHandler() {
      G.populateSalesMenuCheckboxes('salesMenuCheckboxes');
      document.querySelectorAll('input[name="salesMenuSelect"]').forEach(cb => {
        cb.addEventListener('change', updateMultiMenuSalesTotal);
      });
      G.openModal('salesModal');
    }

    document.getElementById('addSalesBtn')?.addEventListener('click', openSalesModalHandler);
    document.getElementById('openSalesModalBtn')?.addEventListener('click', openSalesModalHandler);

    function openLessonModalHandler() {
      G.populateMenuDropdown('lessonMenu');
      G.populateCoachDropdown('lessonCoach');
      G.openModal('lessonModal');
    }

    document.getElementById('addLessonBtn')?.addEventListener('click', openLessonModalHandler);
    document.getElementById('openLessonModalBtn')?.addEventListener('click', openLessonModalHandler);
    document.getElementById('closeSalesModal')?.addEventListener('click', () => G.closeModal('salesModal'));
    document.getElementById('closeEditSalesModal')?.addEventListener('click', () => G.closeModal('editSalesModal'));
    document.getElementById('closeLessonModal')?.addEventListener('click', () => G.closeModal('lessonModal'));

    document.getElementById('salesForm')?.addEventListener('submit', handleSalesSubmit);
    document.getElementById('editSalesForm')?.addEventListener('submit', handleSalesEdit);
    document.getElementById('lessonForm')?.addEventListener('submit', handleLessonSubmit);

    G.setupModalClose();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
