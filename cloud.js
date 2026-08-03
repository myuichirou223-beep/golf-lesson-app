/* ============================================================
   Golf Lesson App — Cloud & Auth Integration Layer (cloud.js)
   ============================================================ */

const CloudAuth = (function () {
  'use strict';

  const SESSION_KEY = 'golf_app_session';
  const CONFIG_KEY = 'golf_app_cloud_config';

  // Simplified to 2 main roles: 1. 管理者 (admin), 2. 店舗 (shop)
  const DEMO_USERS = [
    {
      id: 'usr_admin',
      email: 'admin@golf.local',
      password: 'password123',
      name: '管理者（オーナー・責任者）',
      role: 'admin', // Full access to sales, KPIs, summaries, exports, settings
      coachName: null,
    },
    {
      id: 'usr_shop',
      email: 'shop@golf.local',
      password: 'password123',
      name: '店舗（現場・受付用）',
      role: 'shop', // Input sales & lessons, view schedules & coach counts
      coachName: null,
    },
  ];

  // ─── Session Management ───

  function getCurrentUser() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function setCurrentUser(user) {
    if (user) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  }

  function login(email, password) {
    const user = DEMO_USERS.find(u => u.email.toLowerCase() === email.toLowerCase().trim() && u.password === password);
    if (!user) {
      return { success: false, message: 'メールアドレスまたはパスワードが正しくありません。' };
    }
    const sessionUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      coachName: user.coachName,
      loginAt: new Date().toISOString(),
    };
    setCurrentUser(sessionUser);
    return { success: true, user: sessionUser };
  }

  function logout() {
    setCurrentUser(null);
    window.location.href = 'login.html';
  }

  function requireAuth(allowedRoles) {
    const user = getCurrentUser();
    if (!user) {
      window.location.href = 'login.html';
      return null;
    }
    if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
      alert('このページにアクセスする権限がありません。');
      window.location.href = 'index.html';
      return null;
    }
    return user;
  }

  function getDemoUsers() {
    return DEMO_USERS.map(u => ({
      email: u.email,
      password: u.password,
      name: u.name,
      role: u.role,
      coachName: u.coachName,
    }));
  }

  function getCloudConfig() {
    try {
      const raw = localStorage.getItem(CONFIG_KEY);
      return raw ? JSON.parse(raw) : { enabled: false, provider: 'supabase', url: '', apiKey: '' };
    } catch {
      return { enabled: false, provider: 'supabase', url: '', apiKey: '' };
    }
  }

  function saveCloudConfig(config) {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  }

  return {
    getCurrentUser,
    login,
    logout,
    requireAuth,
    getDemoUsers,
    getCloudConfig,
    saveCloudConfig,
  };
})();
