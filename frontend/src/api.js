// عميل الـ API — يرفق هوية تيليجرام أو توكن الضيف مع كل طلب.
import { getInitData } from './telegram.js';

/** يحدد عنوان الـ API حسب بيئة التشغيل:
 *  - VITE_API_URL إن وُجد (نشر الواجهة منفصلة).
 *  - تطوير Vite (منفذ 5173/4173) → الباكند على المنفذ 3001.
 *  - غير ذلك → نفس أصل الصفحة (الباكند يقدّم الواجهة، ويعمل خلف أي نطاق/نفق). */
function resolveApiBase() {
  const configured = import.meta.env.VITE_API_URL;
  if (configured && String(configured).trim()) return String(configured).trim().replace(/\/+$/, '');
  try {
    const loc = window.location;
    if (/^https?:$/.test(loc.protocol)) {
      if (loc.port === '5173' || loc.port === '4173') {
        return `${loc.protocol}//${loc.hostname}:3001`;
      }
      return loc.origin;
    }
  } catch {}
  return 'http://localhost:3001';
}

const API_BASE = resolveApiBase();
const TOKEN_KEY = 'minewarr.session.v1';
const LEGACY_GUEST_KEY = 'minewarr.guest.v1';
const NICK_KEY = 'minewarr.nick.v1';

export class ApiError extends Error {
  constructor(message, code = 'error', status = 0) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

export function getSessionToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || localStorage.getItem(LEGACY_GUEST_KEY) || '';
  } catch { return ''; }
}
export function setSessionToken(token) {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.removeItem(LEGACY_GUEST_KEY);
    } else {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(LEGACY_GUEST_KEY);
    }
  } catch {}
}
export function getNickname() {
  try { return localStorage.getItem(NICK_KEY) || ''; } catch { return ''; }
}
export function setNickname(name) {
  try { name ? localStorage.setItem(NICK_KEY, name) : localStorage.removeItem(NICK_KEY); } catch {}
}

export function newRequestId() {
  try {
    if (crypto.randomUUID) return crypto.randomUUID().replace(/-/g, '').slice(0, 24);
  } catch {}
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

async function request(path, { method = 'GET', body = null, timeoutMs = 15000 } = {}) {
  const headers = { Accept: 'application/json' };
  const initData = getInitData();
  if (initData) headers['X-Init-Data'] = initData;
  const token = getSessionToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== null) headers['Content-Type'] = 'application/json';

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body === null ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    if (err?.name === 'AbortError') throw new ApiError('السيرفر تأخر بالرد — حاول مرة أخرى', 'timeout');
    throw new ApiError('تعذّر الاتصال بالسيرفر — تأكد أنه يعمل', 'network');
  }
  clearTimeout(timer);

  let data = null;
  try { data = await res.json(); } catch {}
  if (!res.ok || (data && data.ok === false)) {
    throw new ApiError(data?.error || `خطأ ${res.status}`, data?.code || 'http_error', res.status);
  }
  return data;
}

export const api = {
  base: API_BASE,
  session: (payload = {}) => request('/api/session', { method: 'POST', body: payload }),
  state: () => request('/api/state'),
  mine: (taps, requestId) => request('/api/actions/mine', { method: 'POST', body: { taps, requestId } }),
  upgrade: (item, amount, requestId) => request('/api/actions/upgrade', { method: 'POST', body: { item, amount, requestId } }),
  raid: (targetId, requestId, revenge = false) => request('/api/actions/raid', { method: 'POST', body: { targetId, requestId, revenge } }),
  daily: (requestId) => request('/api/actions/daily', { method: 'POST', body: { requestId } }),
  claim: (kind, id, requestId) => request('/api/actions/claim', { method: 'POST', body: { kind, id, requestId } }),
  region: (regionId, requestId) => request('/api/actions/region', { method: 'POST', body: { regionId, requestId } }),
  title: (titleId, requestId) => request('/api/actions/title', { method: 'POST', body: { titleId, requestId } }),
  clearNotices: (ids = []) => request('/api/actions/notices', { method: 'POST', body: { ids } }),
  tutorialDone: (requestId) => request('/api/actions/tutorial', { method: 'POST', body: { requestId } }),
  leaderboard: (scope = 'wealth', limit = 50) => request(`/api/leaderboard?scope=${encodeURIComponent(scope)}&limit=${limit}`),
  raidLog: () => request('/api/raidlog'),
  invite: () => request('/api/invites', { method: 'POST', body: {} }),
  health: () => request('/api/health'),
};
