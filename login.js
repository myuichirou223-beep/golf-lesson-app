/* ============================================================
   Login Page — Logic (login.js)
   ============================================================ */

(function () {
  'use strict';

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
