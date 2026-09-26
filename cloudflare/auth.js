// ============================================================================
// المصادقة على Workers — تحقّق initData + توكنات جلسة موقّعة (Web Crypto).
// نفس بنية backend/src/auth.js تماماً (متوافقة مع توكنات أصدرها سيرفر Node).
// ============================================================================

import {
  hmacSha256, hmacSha256Hex, hmacSha256Base64url,
  sha256Hex, timingSafeEqualStr, randomHex,
  utf8ToBase64url, base64urlToUtf8,
} from './crypto.js';

const enc = new TextEncoder();

// ذاكرة داخل النسخة (isolate) لتفادي إعادة اشتقاق السر في كل طلب
let secretCache = new Map();

/** سرّ الجلسات: SESSION_SECRET إن وُجد، وإلا مُشتق من التوكن (مطابق لسيرفر Node). */
export async function resolveSessionSecret(env) {
  const explicit = (env.SESSION_SECRET || '').trim();
  if (explicit) return explicit;
  const token = (env.BOT_TOKEN || '').trim();
  if (!token) return randomHex(32);
  if (secretCache.has(token)) return secretCache.get(token);
  const derived = await sha256Hex(`minewarr:v1:${token}`);
  secretCache = new Map([[token, derived]]);
  return derived;
}

/**
 * يتحقق من initData القادم من تيليجرام عبر HMAC ويرفض القيم القديمة (auth_date).
 * @returns {Promise<{ok:true,user:object,authDate:number,startParam:string|null}|{ok:false,reason:string}>}
 */
export async function verifyInitData(initData, botToken, { maxAgeSec = 24 * 3600, now = Date.now() } = {}) {
  if (!initData || typeof initData !== 'string') return { ok: false, reason: 'initData مفقود' };
  if (!botToken) return { ok: false, reason: 'BOT_TOKEN غير مضبوط على السيرفر' };
  if (initData.length > 8192) return { ok: false, reason: 'initData كبير جداً' };

  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash || !/^[a-f0-9]{64}$/i.test(hash)) return { ok: false, reason: 'hash غير صالح' };
  params.delete('hash');

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');

  const secret = await hmacSha256(enc.encode('WebAppData'), botToken);
  const calculated = await hmacSha256Hex(secret, dataCheckString);
  if (!timingSafeEqualStr(calculated, hash.toLowerCase())) {
    return { ok: false, reason: 'توقيع initData غير صحيح' };
  }

  const authDate = Number(params.get('auth_date') || 0);
  if (!authDate || now / 1000 - authDate > maxAgeSec) {
    return { ok: false, reason: 'انتهت صلاحية الجلسة، أعد فتح التطبيق من تيليجرام' };
  }

  let user = null;
  try {
    user = JSON.parse(params.get('user') || 'null');
  } catch {
    return { ok: false, reason: 'بيانات المستخدم غير صالحة' };
  }
  if (!user || !user.id) return { ok: false, reason: 'لا يوجد مستخدم في initData' };

  return {
    ok: true,
    user: {
      id: String(user.id),
      firstName: String(user.first_name || '').slice(0, 40),
      lastName: String(user.last_name || '').slice(0, 40),
      username: String(user.username || '').slice(0, 32),
      languageCode: String(user.language_code || 'ar').slice(0, 10),
      photoUrl: typeof user.photo_url === 'string' && /^https:\/\//.test(user.photo_url) ? user.photo_url : null,
    },
    authDate,
    startParam: params.get('start_param') || null,
  };
}

async function sign(payload, secret) {
  return hmacSha256Base64url(enc.encode(secret), payload);
}

/** توكن جلسة موقّع: يحمل هوية مشتقة من initData الموثّق أو من وضع الضيف. */
export async function issueSessionToken(secret, { playerId, mode = 'guest', name = '', epoch = 0, now = Date.now() }) {
  const payload = utf8ToBase64url(JSON.stringify({ p: playerId, m: mode, n: String(name || '').slice(0, 30), e: Number(epoch) || 0, iat: now }));
  return `${payload}.${await sign(payload, secret)}`;
}

export async function verifySessionToken(token, secret, { maxAgeMs = 30 * 24 * 3600 * 1000, now = Date.now() } = {}) {
  if (!token || typeof token !== 'string' || token.length > 512) return { ok: false, reason: 'توكن مفقود' };
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return { ok: false, reason: 'توكن غير صالح' };
  const expected = await sign(payload, secret);
  if (!timingSafeEqualStr(sig, expected)) return { ok: false, reason: 'توكن غير صالح' };
  try {
    const data = JSON.parse(base64urlToUtf8(payload));
    if (!data.p || typeof data.p !== 'string') return { ok: false, reason: 'توكن ناقص' };
    if (now - Number(data.iat || 0) > maxAgeMs) return { ok: false, reason: 'انتهت صلاحية الجلسة' };
    return {
      ok: true,
      playerId: data.p,
      mode: data.m === 'telegram' ? 'telegram' : 'guest',
      name: typeof data.n === 'string' ? data.n : '',
      epoch: Number(data.e) || 0,
    };
  } catch {
    return { ok: false, reason: 'توكن تالف' };
  }
}

export function newGuestId() {
  return `guest_${randomHex(6)}`;
}
