/* ============================================================
   Golf Lesson App — Cloud & Auth Integration Layer (cloud.js)
   ============================================================ */

const CloudAuth = (function () {
  'use strict';

  const SESSION_KEY = 'golf_app_session';
  const CONFIG_KEY = 'golf_app_cloud_config';
  const ACCOUNTS_KEY = 'golf_app_user_accounts';

  const DEFAULT_USERS = [
    {
      id: 'usr_admin',
      email: 'admin@golf.local',
      password: 'password123',
      name: '管理者（オーナー・責任者）',
      role: 'admin',
      coachName: null,
    },
    {
      id: 'usr_shop',
      email: 'shop@golf.local',
      password: 'password123',
      name: '店舗（現場・受付用）',
      role: 'shop',
      coachName: null,
    },
  ];

  function getUsers() {
    try {
      const raw = localStorage.getItem(ACCOUNTS_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(DEFAULT_USERS));
    return DEFAULT_USERS;
  }

  function saveUsers(users) {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(users));
  }

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
    const users = getUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase().trim() && u.password === password);
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
    return getUsers().map(u => ({
      email: u.email,
      password: u.password,
      name: u.name,
      role: u.role,
      coachName: u.coachName,
    }));
  }

  function updateUserCredentials(role, newEmail, newPassword) {
    const users = getUsers();
    const index = users.findIndex(u => u.role === role);
    if (index === -1) return { success: false, message: '対象のアカウントが見つかりません。' };

    const trimmedEmail = newEmail.trim();
    if (!trimmedEmail || !newPassword) {
      return { success: false, message: 'メールアドレスとパスワードを入力してください。' };
    }

    // Check duplicate
    if (users.some((u, i) => i !== index && u.email.toLowerCase() === trimmedEmail.toLowerCase())) {
      return { success: false, message: 'そのメールアドレスは既に他のアカウントで使用されています。' };
    }

    users[index].email = trimmedEmail;
    users[index].password = newPassword;
    saveUsers(users);

    // Update active session if changing current user
    const current = getCurrentUser();
    if (current && current.role === role) {
      current.email = trimmedEmail;
      setCurrentUser(current);
    }

    return { success: true, user: users[index] };
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
    getUsers,
    updateUserCredentials,
    getCloudConfig,
    saveCloudConfig,
  };
})();
