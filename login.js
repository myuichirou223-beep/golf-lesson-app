/* ============================================================
   Login Page — Logic (login.js)
   ============================================================ */

(function () {
  'use strict';

  function renderDemoLoginButtons() {
    const container = document.getElementById('demoButtons');
    if (!container) return;

    const demoUsers = CloudAuth.getDemoUsers();
    container.innerHTML = demoUsers.map(u => {
      const badgeText = u.role === 'admin' ? '1. 管理者' : '2. 店舗';
      const badgeClass = u.role === 'admin' ? 'badge-admin' : 'badge-staff';
      return `
        <button type="button" class="demo-btn" data-email="${u.email}" data-pass="${u.password}">
          <div class="demo-btn-left">
            <span class="demo-btn-name">${u.name}</span>
            <span class="demo-btn-email">${u.email}</span>
          </div>
          <span class="role-badge ${badgeClass}">${badgeText}</span>
        </button>
      `;
    }).join('');

    container.querySelectorAll('.demo-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.getElementById('emailInput').value = btn.dataset.email;
        document.getElementById('passwordInput').value = btn.dataset.pass;
        submitLogin(btn.dataset.email, btn.dataset.pass);
      });
    });
  }

  function submitLogin(email, password) {
    const errorEl = document.getElementById('loginErrorMessage');
    errorEl.style.display = 'none';

    const result = CloudAuth.login(email, password);
    if (!result.success) {
      errorEl.textContent = result.message;
      errorEl.style.display = 'block';
      return;
    }

    window.location.href = 'index.html';
  }

  function init() {
    const currentUser = CloudAuth.getCurrentUser();
    if (currentUser) {
      window.location.href = 'index.html';
      return;
    }

    renderDemoLoginButtons();

    document.getElementById('loginForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('emailInput').value;
      const password = document.getElementById('passwordInput').value;
      submitLogin(email, password);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
