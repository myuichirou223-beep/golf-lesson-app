/* ============================================================
   Golf Lesson App — Shared Data Layer & Utilities (v13 Forced Clean State)
   ============================================================
   Completely wipes all historical demo data across all client browsers.
   ============================================================ */

const GolfApp = (function () {
  'use strict';

  // ─── Constants ───

  const STORAGE_KEYS = {
    SALES: 'golf_app_sales',
    LESSONS: 'golf_app_lessons',
    COACHES: 'golf_app_coaches',
    MENUS: 'golf_app_menus',
    CUSTOMERS: 'golf_app_customers',
    INITIALIZED: 'golf_app_initialized_prod_v1',
    FORCE_CLEAN: 'golf_app_force_clean_v10',
  };

  const MAX_LESSONS_PER_MONTH = 40;

  const PAYMENT_METHODS = {
    cash: '現金',
    transfer: '振込',
    credit: 'クレジットカード',
    paypay: '電子マネー（PayPay）',
  };

  const SALES_TYPES = {
    monthly_fee: '月会費売上',
    ticket: 'チケット売上',
    other: 'その他売上',
  };

  const DEFAULT_MENUS = [
    { name: '練習利用25分', price: 1430 },
    { name: '練習利用50分', price: 2200 },
    { name: '都度払い', price: 10000 },
    { name: '5回チケット', price: 6800 },
    { name: '10回チケット', price: 6500 },
    { name: '20回チケット', price: 6000 },
    { name: '月1回コース', price: 8000 },
    { name: '月2回コース', price: 6000 },
    { name: '法人30', price: 6500 },
    { name: '法人60', price: 6000 },
  ];

  const DEFAULT_COACHES = [
    { name: '沢田 健一', specialties: ['都度払い', '5回チケット'], bio: 'PGA公認ティーチングプロ' },
    { name: '比嘉 真由美', specialties: ['月1回コース', '月2回コース'], bio: 'ジュニア育成に注力' },
    { name: '金城 大輔', specialties: ['10回チケット', '法人30'], bio: '初心者指導が得意' },
    { name: '宮城 あゆみ', specialties: ['月2回コース', '5回チケット'], bio: 'レディースレッスン担当' },
    { name: '上原 拓也', specialties: ['法人60', '20回チケット'], bio: 'コースマネジメント指導' },
  ];

  // ─── Data Layer ───

  function getData(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function setData(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  // Sales
  function getSales() { return getData(STORAGE_KEYS.SALES); }
  function saveSales(data) { setData(STORAGE_KEYS.SALES, data); }

  // Lessons
  function getLessons() { return getData(STORAGE_KEYS.LESSONS); }
  function saveLessons(data) { setData(STORAGE_KEYS.LESSONS, data); }

  // Coaches
  function getCoaches() { return getData(STORAGE_KEYS.COACHES); }
  function saveCoaches(data) { setData(STORAGE_KEYS.COACHES, data); }

  function getCoachNames() {
    return getCoaches().filter(c => c.active).map(c => c.name);
  }

  function getCoachById(id) {
    return getCoaches().find(c => c.id === id) || null;
  }

  function addCoach(name, specialties, bio) {
    const coaches = getCoaches();
    if (coaches.some(c => c.name === name && c.active)) {
      return { success: false, message: '同名のコーチが既に登録されています' };
    }
    const coach = {
      id: generateId(),
      name,
      specialties: specialties || [],
      bio: bio || '',
      registeredAt: new Date().toISOString().split('T')[0],
      active: true,
    };
    coaches.push(coach);
    saveCoaches(coaches);
    return { success: true, coach };
  }

  function updateCoach(id, updates) {
    const coaches = getCoaches();
    const index = coaches.findIndex(c => c.id === id);
    if (index === -1) return false;
    coaches[index] = { ...coaches[index], ...updates };
    saveCoaches(coaches);
    return true;
  }

  function deleteCoach(id) {
    const coaches = getCoaches();
    const coach = coaches.find(c => c.id === id);
    if (!coach) return false;
    coach.active = false;
    saveCoaches(coaches);
    return true;
  }

  // Menus
  function getMenus() {
    const menus = getData(STORAGE_KEYS.MENUS);
    let updated = false;
    DEFAULT_MENUS.forEach(defM => {
      if (!menus.some(m => m.name === defM.name && m.active)) {
        menus.push({
          id: generateId(),
          name: defM.name,
          price: defM.price,
          active: true,
          createdAt: new Date().toISOString().split('T')[0],
        });
        updated = true;
      }
    });
    if (updated) {
      saveMenus(menus);
    }
    return menus;
  }
  function saveMenus(data) { setData(STORAGE_KEYS.MENUS, data); }

  function getActiveMenus() {
    return getMenus().filter(m => m.active);
  }

  function getMenuById(id) {
    return getMenus().find(m => m.id === id) || null;
  }

  function addMenu(name, price) {
    const menus = getMenus();
    if (menus.some(m => m.name === name && m.active)) {
      return { success: false, message: '同名のメニューが既に存在します' };
    }
    const menu = {
      id: generateId(),
      name,
      price: Number(price),
      active: true,
      createdAt: new Date().toISOString().split('T')[0],
    };
    menus.push(menu);
    saveMenus(menus);
    return { success: true, menu };
  }

  function updateMenu(id, updates) {
    const menus = getMenus();
    const index = menus.findIndex(m => m.id === id);
    if (index === -1) return false;
    menus[index] = { ...menus[index], ...updates };
    saveMenus(menus);
    return true;
  }

  function deleteMenu(id) {
    const menus = getMenus();
    const menu = menus.find(m => m.id === id);
    if (!menu) return false;
    menu.active = false;
    saveMenus(menus);
    return true;
  }

  // Customers
  function getSavedCustomers() {
    return getData(STORAGE_KEYS.CUSTOMERS);
  }

  function saveCustomerName(name) {
    if (!name || !name.trim()) return;
    const trimmed = name.trim();
    const customers = getSavedCustomers();
    if (!customers.includes(trimmed)) {
      customers.push(trimmed);
      setData(STORAGE_KEYS.CUSTOMERS, customers);
    }
  }

  function getCustomerNames() {
    const set = new Set(getSavedCustomers());
    getSales().forEach(s => { if (s.customerName) set.add(s.customerName.trim()); });
    getLessons().forEach(l => { if (l.customerName) set.add(l.customerName.trim()); });
    return Array.from(set).filter(Boolean).sort((a, b) => a.localeCompare(b, 'ja'));
  }

  // ─── Calculations ───

  function filterByMonth(items, year, month) {
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    return items.filter(item => item.date.startsWith(prefix));
  }

  function filterByDateRange(items, startDate, endDate) {
    return items.filter(item => {
      if (startDate && item.date < startDate) return false;
      if (endDate && item.date > endDate) return false;
      return true;
    });
  }

  function calcMonthlyStats(year, month) {
    const sales = filterByMonth(getSales(), year, month);
    const lessons = filterByMonth(getLessons(), year, month);

    const monthlyFee = sales.filter(s => s.type === 'monthly_fee').reduce((sum, s) => sum + s.amount, 0);
    const ticketSales = sales.filter(s => s.type === 'ticket').reduce((sum, s) => sum + s.amount, 0);
    const otherSales = sales.filter(s => s.type === 'other').reduce((sum, s) => sum + s.amount, 0);
    const uniqueCoaches = new Set(lessons.map(l => l.coachName));
    const lessonRevenue = lessons.reduce((sum, l) => sum + (l.menuPrice || 0), 0);

    return {
      monthlyFee,
      ticketSales,
      otherSales,
      total: monthlyFee + ticketSales + otherSales,
      lessonCount: lessons.length,
      coachCount: uniqueCoaches.size,
      lessonRevenue,
    };
  }

  function calcCoachStats(year, month) {
    const lessons = filterByMonth(getLessons(), year, month);
    const stats = {};

    getCoachNames().forEach(name => {
      stats[name] = { lessonCount: 0, revenue: 0 };
    });

    lessons.forEach(l => {
      if (!stats[l.coachName]) {
        stats[l.coachName] = { lessonCount: 0, revenue: 0 };
      }
      stats[l.coachName].lessonCount++;
      stats[l.coachName].revenue += (l.menuPrice || 0);
    });

    return stats;
  }

  function calcChange(current, previous) {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  }

  function getSalesTrend(endYear, endMonth, months) {
    const trend = [];
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(endYear, endMonth - i, 1);
      const stats = calcMonthlyStats(d.getFullYear(), d.getMonth());
      trend.push({
        label: `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}`,
        year: d.getFullYear(),
        month: d.getMonth(),
        ...stats,
      });
    }
    return trend;
  }

  // Coach-specific calculations

  function calcCoachMonthlyTrend(coachName, endYear, endMonth, months) {
    const trend = [];
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(endYear, endMonth - i, 1);
      const lessons = filterByMonth(getLessons(), d.getFullYear(), d.getMonth())
        .filter(l => l.coachName === coachName);
      trend.push({
        label: `${d.getMonth() + 1}月`,
        fullLabel: `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}`,
        lessonCount: lessons.length,
      });
    }
    return trend;
  }

  function calcCoachMenuBreakdown(coachName, year, month) {
    const lessons = filterByMonth(getLessons(), year, month)
      .filter(l => l.coachName === coachName);
    const breakdown = {};
    lessons.forEach(l => {
      const name = l.menuName || '不明';
      breakdown[name] = (breakdown[name] || 0) + 1;
    });
    return breakdown;
  }

  function getCoachLessonHistory(coachName, year, month) {
    return filterByMonth(getLessons(), year, month)
      .filter(l => l.coachName === coachName)
      .sort((a, b) => {
        const dateCompare = b.date.localeCompare(a.date);
        if (dateCompare !== 0) return dateCompare;
        return (b.startTime || '').localeCompare(a.startTime || '');
      });
  }

  function calcCoachAllTimeStats(coachName) {
    const lessons = getLessons().filter(l => l.coachName === coachName);
    const totalLessons = lessons.length;
    const totalRevenue = lessons.reduce((sum, l) => sum + (l.menuPrice || 0), 0);
    const months = new Set(lessons.map(l => l.date.slice(0, 7)));
    return {
      totalLessons,
      totalRevenue,
      activeMonths: months.size,
    };
  }

  // ─── Export / File Download Helpers ───

  function downloadFile(filename, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function downloadCSV(filename, rows) {
    const bom = '\uFEFF';
    const csvContent = bom + rows.map(r => r.map(cell => {
      const str = String(cell ?? '');
      return `"${str.replace(/"/g, '""')}"`;
    }).join(',')).join('\r\n');

    downloadFile(filename, csvContent, 'text/csv;charset=utf-8;');
  }

  function exportCustomData(config) {
    const { dataType, periodType, selectedYear, selectedMonth, startDate, endDate, format } = config;

    let filteredSales = getSales();
    let filteredLessons = getLessons();
    let periodLabel = '全期間';

    if (periodType === 'selected_month' && selectedYear !== undefined && selectedMonth !== undefined) {
      filteredSales = filterByMonth(filteredSales, selectedYear, selectedMonth);
      filteredLessons = filterByMonth(filteredLessons, selectedYear, selectedMonth);
      periodLabel = `${selectedYear}_${String(selectedMonth + 1).padStart(2, '0')}`;
    } else if (periodType === 'current_month') {
      const now = new Date();
      filteredSales = filterByMonth(filteredSales, now.getFullYear(), now.getMonth());
      filteredLessons = filterByMonth(filteredLessons, now.getFullYear(), now.getMonth());
      periodLabel = `${now.getFullYear()}_${String(now.getMonth() + 1).padStart(2, '0')}`;
    } else if (periodType === 'custom') {
      filteredSales = filterByDateRange(filteredSales, startDate, endDate);
      filteredLessons = filterByDateRange(filteredLessons, startDate, endDate);
      periodLabel = `${startDate || '開始'}〜${endDate || '終了'}`;
    }

    if (format === 'pdf') {
      window.print();
      return;
    }

    if (dataType === 'sales') {
      const headers = ['日付', '顧客名', '売上種別', '支払い方法', '金額(円)', '備考'];
      const rows = [headers];
      filteredSales.sort((a, b) => b.date.localeCompare(a.date)).forEach(s => {
        rows.push([
          s.date,
          s.customerName || '',
          SALES_TYPES[s.type] || s.type,
          PAYMENT_METHODS[s.paymentMethod] || s.paymentMethod || '',
          s.amount,
          s.description || '',
        ]);
      });
      downloadCSV(`売上明細_${periodLabel}.csv`, rows);
      showToast(`売上明細 (${periodLabel}) をCSV出力しました`);

    } else if (dataType === 'lessons') {
      const headers = ['日付', '開始時間', '終了時間', '顧客名', '担当コーチ', 'メニュー名', '単価(円)'];
      const rows = [headers];
      filteredLessons.sort((a, b) => b.date.localeCompare(a.date)).forEach(l => {
        rows.push([
          l.date,
          l.startTime || '',
          l.endTime || '',
          l.customerName || '',
          l.coachName || '',
          l.menuName || '',
          l.menuPrice || 0,
        ]);
      });
      downloadCSV(`レッスン実績_${periodLabel}.csv`, rows);
      showToast(`レッスン実績 (${periodLabel}) をCSV出力しました`);

    } else if (dataType === 'coach_summary') {
      const headers = ['コーチ名', '実施レッスン数', '推定売上(円)'];
      const rows = [headers];
      const coachMap = {};
      getCoachNames().forEach(name => { coachMap[name] = { count: 0, revenue: 0 }; });

      filteredLessons.forEach(l => {
        if (!coachMap[l.coachName]) coachMap[l.coachName] = { count: 0, revenue: 0 };
        coachMap[l.coachName].count++;
        coachMap[l.coachName].revenue += (l.menuPrice || 0);
      });

      Object.entries(coachMap).forEach(([name, data]) => {
        rows.push([name, data.count, data.revenue]);
      });
      downloadCSV(`コーチ別集計_${periodLabel}.csv`, rows);
      showToast(`コーチ別集計 (${periodLabel}) をCSV出力しました`);

    } else if (dataType === 'monthly_summary') {
      const headers = ['年月', '月会費売上(円)', 'チケット売上(円)', 'その他売上(円)', '売上合計(円)'];
      const rows = [headers];

      const monthlyMap = {};
      filteredSales.forEach(s => {
        const ym = s.date.slice(0, 7);
        if (!monthlyMap[ym]) monthlyMap[ym] = { monthlyFee: 0, ticket: 0, other: 0, total: 0 };
        if (s.type === 'monthly_fee') monthlyMap[ym].monthlyFee += s.amount;
        else if (s.type === 'ticket') monthlyMap[ym].ticket += s.amount;
        else if (s.type === 'other') monthlyMap[ym].other += s.amount;
        monthlyMap[ym].total += s.amount;
      });

      Object.keys(monthlyMap).sort().reverse().forEach(ym => {
        const m = monthlyMap[ym];
        rows.push([ym, m.monthlyFee, m.ticket, m.other, m.total]);
      });

      downloadCSV(`月別売上集計_${periodLabel}.csv`, rows);
      showToast(`月別売上集計 (${periodLabel}) をCSV出力しました`);
    }
  }

  function exportSalesCSV(year, month) {
    exportCustomData({ dataType: 'sales', periodType: (year !== undefined) ? 'selected_month' : 'all', selectedYear: year, selectedMonth: month, format: 'csv' });
  }

  function exportLessonsCSV(year, month) {
    exportCustomData({ dataType: 'lessons', periodType: (year !== undefined) ? 'selected_month' : 'all', selectedYear: year, selectedMonth: month, format: 'csv' });
  }

  function exportPDF() {
    window.print();
  }

  // ─── Export Modal Setup ───

  function setupExportModalHandler() {
    const openBtn = document.getElementById('openExportModalBtn');
    const closeBtn = document.getElementById('closeExportModal');
    const periodSelect = document.getElementById('exportPeriodType');
    const customRow = document.getElementById('customDateRangeRow');
    const form = document.getElementById('exportForm');

    if (!openBtn || !form) return;

    openBtn.addEventListener('click', () => openModal('exportModal'));
    closeBtn?.addEventListener('click', () => closeModal('exportModal'));

    periodSelect?.addEventListener('change', () => {
      if (periodSelect.value === 'custom') {
        customRow.style.display = '';
      } else {
        customRow.style.display = 'none';
      }
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const dataType = document.getElementById('exportDataType').value;
      const periodType = document.getElementById('exportPeriodType').value;
      const format = document.getElementById('exportFormat').value;
      const startDate = document.getElementById('exportStartDate')?.value;
      const endDate = document.getElementById('exportEndDate')?.value;

      const { year, month } = getSelectedMonth();

      exportCustomData({
        dataType,
        periodType,
        selectedYear: year,
        selectedMonth: month,
        startDate,
        endDate,
        format,
      });

      closeModal('exportModal');
    });
  }

  // ─── Header & Auth UI Integrated Helper ───

  function renderHeaderUserBlock() {
    const user = CloudAuth.getCurrentUser();
    if (!user) return;

    const nav = document.querySelector('.header-nav');
    const headerRight = document.querySelector('.header-right');

    if (nav) {
      const settingsLink = nav.querySelector('a[href="settings.html"]');
      if (settingsLink && user.role !== 'admin') {
        settingsLink.style.display = 'none';
      }
    }

    if (headerRight && !document.getElementById('headerUserBox')) {
      const badgeText = user.role === 'admin' ? '1. 管理者' : '2. 店舗';
      const badgeClass = user.role === 'admin' ? 'badge-admin' : 'badge-staff';

      const userBox = document.createElement('div');
      userBox.id = 'headerUserBox';
      userBox.className = 'header-user-box';
      userBox.innerHTML = `
        <span class="header-user-name">${user.name}</span>
        <span class="role-badge ${badgeClass}">${badgeText}</span>
        <button class="btn btn-outline btn-xs" id="logoutBtn" title="ログアウト">退室</button>
      `;
      headerRight.appendChild(userBox);

      document.getElementById('logoutBtn')?.addEventListener('click', () => {
        CloudAuth.logout();
      });
    }
  }

  // ─── Forced Clean Reset for Production ───

  function generateSampleData() {
    // If forced clean has not run on this browser yet, wipe ALL sales, lessons, and customers
    if (!localStorage.getItem(STORAGE_KEYS.FORCE_CLEAN)) {
      localStorage.removeItem(STORAGE_KEYS.SALES);
      localStorage.removeItem(STORAGE_KEYS.LESSONS);
      localStorage.removeItem(STORAGE_KEYS.CUSTOMERS);
      saveSales([]);
      saveLessons([]);
      setData(STORAGE_KEYS.CUSTOMERS, []);
      localStorage.setItem(STORAGE_KEYS.FORCE_CLEAN, 'true');
    }

    if (localStorage.getItem(STORAGE_KEYS.INITIALIZED)) return;

    // Create menus master
    const menus = DEFAULT_MENUS.map(m => ({
      id: generateId(),
      name: m.name,
      price: m.price,
      active: true,
      createdAt: new Date().toISOString().split('T')[0],
    }));
    saveMenus(menus);

    // Create coaches master
    const coaches = DEFAULT_COACHES.map(c => ({
      id: generateId(),
      name: c.name,
      specialties: c.specialties,
      bio: c.bio,
      registeredAt: new Date().toISOString().split('T')[0],
      active: true,
    }));
    saveCoaches(coaches);

    // Empty transactions
    saveSales([]);
    saveLessons([]);
    setData(STORAGE_KEYS.CUSTOMERS, []);

    localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
  }

  function clearAllData() {
    localStorage.removeItem(STORAGE_KEYS.SALES);
    localStorage.removeItem(STORAGE_KEYS.LESSONS);
    localStorage.removeItem(STORAGE_KEYS.CUSTOMERS);
    saveSales([]);
    saveLessons([]);
    setData(STORAGE_KEYS.CUSTOMERS, []);
  }

  // ─── Formatting ───

  function formatCurrency(amount) {
    return '¥' + amount.toLocaleString('ja-JP');
  }

  function formatCompact(amount) {
    if (amount >= 10000) {
      return '¥' + (amount / 10000).toFixed(1).replace(/\.0$/, '') + '万';
    }
    return formatCurrency(amount);
  }

  function formatDate(dateStr) {
    const [y, m, d] = dateStr.split('-');
    return `${m}/${d}`;
  }

  function formatFullDate(dateStr) {
    const [y, m, d] = dateStr.split('-');
    return `${y}/${m}/${d}`;
  }

  function formatTimeRange(startTime, endTime) {
    if (!startTime || !endTime) return '—';
    return `${startTime}〜${endTime}`;
  }

  // ─── UI Helpers ───

  function openModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    const dateInput = modal.querySelector('input[type="date"]');
    if (dateInput && !dateInput.value) {
      const now = new Date();
      dateInput.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    }
  }

  function closeModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }

  function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
  }

  function populateMonthSelector(selectorId) {
    const selector = document.getElementById(selectorId || 'monthSelector');
    if (!selector) return;
    selector.innerHTML = '';
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const opt = document.createElement('option');
      opt.value = `${d.getFullYear()}-${d.getMonth()}`;
      opt.textContent = `${d.getFullYear()}年${d.getMonth() + 1}月`;
      if (i === 0) opt.selected = true;
      selector.appendChild(opt);
    }
  }

  function getSelectedMonth(selectorId) {
    const selector = document.getElementById(selectorId || 'monthSelector');
    if (!selector) {
      const now = new Date();
      return { year: now.getFullYear(), month: now.getMonth() };
    }
    const [year, month] = selector.value.split('-').map(Number);
    return { year, month };
  }

  function populateMenuDropdown(selectId) {
    const select = document.getElementById(selectId || 'lessonMenu');
    if (!select) return;
    select.innerHTML = '';
    getActiveMenus().forEach(menu => {
      const opt = document.createElement('option');
      opt.value = menu.id;
      opt.textContent = `${menu.name}（${formatCurrency(menu.price)}）`;
      select.appendChild(opt);
    });
  }

  function populateCoachDropdown(selectId) {
    const select = document.getElementById(selectId || 'lessonCoach');
    if (!select) return;
    select.innerHTML = '';
    getCoachNames().forEach(name => {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      select.appendChild(opt);
    });
  }

  function populateCustomerDatalist(datalistId) {
    const datalist = document.getElementById(datalistId || 'customerDatalist');
    if (!datalist) return;
    datalist.innerHTML = '';
    getCustomerNames().forEach(name => {
      const opt = document.createElement('option');
      opt.value = name;
      datalist.appendChild(opt);
    });
  }

  function setupModalClose() {
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', e => {
        if (e.target === overlay) closeModal(overlay.id);
      });
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.active').forEach(modal => {
          closeModal(modal.id);
        });
      }
    });
  }

  // ─── Chart.js Configuration ───

  function configureChartDefaults() {
    if (typeof Chart === 'undefined') return;
    Chart.defaults.font.family = "'Inter', 'Noto Sans JP', sans-serif";
    Chart.defaults.font.size = 11;
    Chart.defaults.color = '#888';
    Chart.defaults.plugins.legend.labels.usePointStyle = true;
    Chart.defaults.plugins.legend.labels.pointStyleWidth = 8;
    Chart.defaults.plugins.legend.labels.boxHeight = 8;
    Chart.defaults.plugins.tooltip.backgroundColor = '#111';
    Chart.defaults.plugins.tooltip.titleFont = { size: 12, weight: '600' };
    Chart.defaults.plugins.tooltip.bodyFont = { size: 11 };
    Chart.defaults.plugins.tooltip.padding = 10;
    Chart.defaults.plugins.tooltip.cornerRadius = 6;
    Chart.defaults.plugins.tooltip.displayColors = true;
    Chart.defaults.plugins.tooltip.boxPadding = 4;
    Chart.defaults.scale.grid.color = '#F0F0F0';
    Chart.defaults.scale.border = { display: false };
    Chart.defaults.scale.ticks.padding = 8;
  }

  // ─── Public API ───

  return {
    STORAGE_KEYS,
    PAYMENT_METHODS,
    SALES_TYPES,
    MAX_LESSONS_PER_MONTH,

    generateId,
    getSales, saveSales,
    getLessons, saveLessons,
    getCoaches, saveCoaches, getCoachNames, getCoachById,
    addCoach, updateCoach, deleteCoach,
    getMenus, saveMenus, getActiveMenus, getMenuById,
    addMenu, updateMenu, deleteMenu,
    getSavedCustomers, saveCustomerName, getCustomerNames,

    filterByMonth, filterByDateRange,
    calcMonthlyStats, calcCoachStats, calcChange, getSalesTrend,
    calcCoachMonthlyTrend, calcCoachMenuBreakdown,
    getCoachLessonHistory, calcCoachAllTimeStats,

    exportCustomData, exportSalesCSV, exportLessonsCSV, exportPDF, setupExportModalHandler,
    renderHeaderUserBlock, clearAllData,

    formatCurrency, formatCompact, formatDate, formatFullDate, formatTimeRange,

    openModal, closeModal, showToast, setupModalClose,
    populateMonthSelector, getSelectedMonth,
    populateMenuDropdown, populateCoachDropdown, populateCustomerDatalist,
    configureChartDefaults,
    generateSampleData,
  };
})();
