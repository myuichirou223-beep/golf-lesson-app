/* ============================================================
   Settings Page — Logic (v12 with Account Credential Editing)
   ============================================================ */

(function () {
  'use strict';

  const G = GolfApp;
  let deleteTargetId = null;

  // ─── Account Settings ───

  function populateAccountForms() {
    const users = CloudAuth.getUsers();

    const adminUser = users.find(u => u.role === 'admin');
    if (adminUser) {
      document.getElementById('adminEmailInput').value = adminUser.email;
      document.getElementById('adminPasswordInput').value = adminUser.password;
    }

    const shopUser = users.find(u => u.role === 'shop');
    if (shopUser) {
      document.getElementById('shopEmailInput').value = shopUser.email;
      document.getElementById('shopPasswordInput').value = shopUser.password;
    }
  }

  function handleAdminAccountSubmit(e) {
    e.preventDefault();
    const email = document.getElementById('adminEmailInput').value;
    const password = document.getElementById('adminPasswordInput').value;

    const result = CloudAuth.updateUserCredentials('admin', email, password);
    if (!result.success) {
      G.showToast(result.message);
      return;
    }
    G.showToast('管理者アカウントの認証情報を更新しました');
  }

  function handleShopAccountSubmit(e) {
    e.preventDefault();
    const email = document.getElementById('shopEmailInput').value;
    const password = document.getElementById('shopPasswordInput').value;

    const result = CloudAuth.updateUserCredentials('shop', email, password);
    if (!result.success) {
      G.showToast(result.message);
      return;
    }
    G.showToast('店舗アカウントの認証情報を更新しました');
  }

  // ─── Menu List ───

  function renderMenuList() {
    const list = document.getElementById('menuList');
    const countEl = document.getElementById('menuCount');
    if (!list) return;

    const menus = G.getActiveMenus();
    if (countEl) countEl.textContent = `${menus.length}件`;

    if (menus.length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-text">メニューが登録されていません<br>「＋ メニュー追加」から追加してください</div>
        </div>`;
      return;
    }

    list.innerHTML = menus.map(menu => `
      <div class="menu-item" data-menu-id="${menu.id}">
        <div class="menu-item-info">
          <span class="menu-item-name">${menu.name}</span>
          <span class="menu-item-price">${G.formatCurrency(menu.price)}</span>
        </div>
        <div class="menu-item-actions">
          <button class="btn btn-outline btn-sm edit-menu-btn" data-id="${menu.id}">編集</button>
          <button class="btn btn-danger-outline btn-sm delete-menu-btn" data-id="${menu.id}">削除</button>
        </div>
      </div>
    `).join('');

    list.querySelectorAll('.edit-menu-btn').forEach(btn => {
      btn.addEventListener('click', () => openEditMenu(btn.dataset.id));
    });
    list.querySelectorAll('.delete-menu-btn').forEach(btn => {
      btn.addEventListener('click', () => openDeleteConfirm(btn.dataset.id));
    });
  }

  // ─── Add Menu ───

  function handleAddMenu(e) {
    e.preventDefault();
    const name = document.getElementById('menuName').value.trim();
    const price = parseInt(document.getElementById('menuPrice').value, 10);

    if (!name || isNaN(price) || price < 0) return;

    const result = G.addMenu(name, price);
    if (!result.success) {
      G.showToast(result.message);
      return;
    }

    G.closeModal('addMenuModal');
    e.target.reset();
    renderMenuList();
    G.showToast(`「${name}」を追加しました`);
  }

  // ─── Edit Menu ───

  function openEditMenu(id) {
    const menu = G.getMenuById(id);
    if (!menu) return;

    document.getElementById('editMenuId').value = menu.id;
    document.getElementById('editMenuName').value = menu.name;
    document.getElementById('editMenuPrice').value = menu.price;
    G.openModal('editMenuModal');
  }

  function handleEditMenu(e) {
    e.preventDefault();
    const id = document.getElementById('editMenuId').value;
    const name = document.getElementById('editMenuName').value.trim();
    const price = parseInt(document.getElementById('editMenuPrice').value, 10);

    if (!id || !name || isNaN(price) || price < 0) return;

    const oldMenu = G.getMenuById(id);
    if (oldMenu) {
      const lessons = G.getLessons();
      let updated = false;
      lessons.forEach(l => {
        if (l.menuId === id) {
          l.menuName = name;
          l.menuPrice = price;
          updated = true;
        }
      });
      if (updated) G.saveLessons(lessons);
    }

    G.updateMenu(id, { name, price });
    G.closeModal('editMenuModal');
    renderMenuList();
    G.showToast('メニューを更新しました');
  }

  // ─── Delete Menu ───

  function openDeleteConfirm(id) {
    const menu = G.getMenuById(id);
    if (!menu) return;
    deleteTargetId = id;

    document.getElementById('deleteConfirmText').textContent =
      `「${menu.name}（${G.formatCurrency(menu.price)}）」を削除しますか？`;
    G.openModal('deleteConfirmModal');
  }

  function handleDeleteMenu() {
    if (!deleteTargetId) return;

    G.deleteMenu(deleteTargetId);
    G.closeModal('deleteConfirmModal');
    deleteTargetId = null;
    renderMenuList();
    G.showToast('メニューを削除しました');
  }

  // ─── Data Reset ───

  function handleResetData() {
    Object.values(G.STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });

    G.generateSampleData();
    G.closeModal('resetConfirmModal');
    renderMenuList();
    G.showToast('データをリセットしました');
  }

  // ─── Init ───

  function init() {
    const currentUser = CloudAuth.requireAuth(['admin']);
    if (!currentUser) return;

    G.generateSampleData();
    G.renderHeaderUserBlock();

    populateAccountForms();
    renderMenuList();

    document.getElementById('adminAccountForm')?.addEventListener('submit', handleAdminAccountSubmit);
    document.getElementById('shopAccountForm')?.addEventListener('submit', handleShopAccountSubmit);

    document.getElementById('addMenuBtn')?.addEventListener('click', () => G.openModal('addMenuModal'));
    document.getElementById('closeAddMenuModal')?.addEventListener('click', () => G.closeModal('addMenuModal'));
    document.getElementById('closeEditMenuModal')?.addEventListener('click', () => G.closeModal('editMenuModal'));
    document.getElementById('closeDeleteModal')?.addEventListener('click', () => G.closeModal('deleteConfirmModal'));
    document.getElementById('cancelDeleteBtn')?.addEventListener('click', () => G.closeModal('deleteConfirmModal'));
    document.getElementById('closeResetModal')?.addEventListener('click', () => G.closeModal('resetConfirmModal'));
    document.getElementById('cancelResetBtn')?.addEventListener('click', () => G.closeModal('resetConfirmModal'));

    document.getElementById('addMenuForm')?.addEventListener('submit', handleAddMenu);
    document.getElementById('editMenuForm')?.addEventListener('submit', handleEditMenu);
    document.getElementById('confirmDeleteBtn')?.addEventListener('click', handleDeleteMenu);
    document.getElementById('resetDataBtn')?.addEventListener('click', () => G.openModal('resetConfirmModal'));
    document.getElementById('confirmResetBtn')?.addEventListener('click', handleResetData);

    G.setupModalClose();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
