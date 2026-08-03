/* ============================================================
   Golf Lesson App — Cloud & Auth Integration Layer (cloud.js)
   ============================================================
   Handles authentication, session persistence, role-based access
   control (RBAC), and cloud synchronization with Supabase/Firebase.
   ============================================================ */

const CloudAuth = (function () {
  'use strict';

  const SESSION_KEY = 'golf_app_session';
  const CONFIG_KEY = 'golf_app_cloud_config';

  // Preset demo accounts for seamless multi-device testing & evaluation
  const DEMO_USERS = [
    {
      id: 'usr_admin',
      email: 'admin@golf.local',
      password: 'password123',
      name: '管理者（店舗オーナー）',
      role: 'admin', // admin: Full access to sales, KPIs, settings, export, all coaches
      coachName: null,
    },
    {
      id: 'usr_staff',
      email: 'staff@golf.local',
      password: 'password123',
      name: 'フロントスタッフ',
      role: 'staff', // staff: Can register sales & lessons, view schedule. Cannot view total financial KPIs/settings
      coachName: null,
    },
    {
      id: 'usr_sawada',
      email: 'sawada@golf.local',
      password: 'password123',
      name: '沢田 健一 コーチ',
      role: 'coach', // coach: Can view and manage only their own lessons & personal KPIs
      coachName: '沢田 健一',
    },
    {
      id: 'usr_higa',
      email: 'higa@golf.local',
      password: 'password123',
      name: '比嘉 真由美 コーチ',
      role: 'coach',
      coachName: '比嘉 真由美',
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
      if (user.role === 'coach') {
        window.location.href = 'coaches.html';
      } else {
        window.location.href = 'index.html';
      }
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

  // ─── Cloud Config (Supabase / Firebase Endpoint) ───

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

  // ─── Public API ───

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
