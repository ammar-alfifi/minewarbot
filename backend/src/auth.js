// ============================================================================
// المصادقة — التحقق من Telegram initData + جلسات الضيوف (تطوير محلي فقط).
// Docs: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
// ============================================================================

import crypto from 'node:crypto';

/**
 * يتحقق من initData القادم من تيليجرام عبر HMAC، ويرفض القيم القديمة (auth_date).
 * @returns {{ok: true, user: object, authDate: number, startParam: string|null} |
 *           {ok: false, reason: string}}
 */
export function verifyInitData(initData, botToken, { maxAgeSec = 24 * 3600, now = Date.now() } = {}) {
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

  const secret = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const calculated = crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex');

  const a = Buffer.from(calculated, 'hex');
  const b = Buffer.from(hash, 'hex');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
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

const b64url = (buf) => Buffer.from(buf).toString('base64url');

function sign(payload, secret) {
  return crypto.createHmac('sha256', secret).update(payload).digest('base64url');
}

/** توكن جلسة موقّع من السيرفر: يحمل هوية مشتقة من initData الموثّق أو من وضع الضيف. */
export function issueSessionToken(secret, { playerId, mode = 'guest', name = '', now = Date.now() }) {
  const payload = b64url(JSON.stringify({ p: playerId, m: mode, n: String(name || '').slice(0, 30), iat: now }));
  return `${payload}.${sign(payload, secret)}`;
}

export function verifySessionToken(token, secret, { maxAgeMs = 30 * 24 * 3600 * 1000, now = Date.now() } = {}) {
  if (!token || typeof token !== 'string' || token.length > 512) return { ok: false, reason: 'توكن مفقود' };
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return { ok: false, reason: 'توكن غير صالح' };
  const expected = sign(payload, secret);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return { ok: false, reason: 'توكن غير صالح' };
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!data.p || typeof data.p !== 'string') return { ok: false, reason: 'توكن ناقص' };
    if (now - Number(data.iat || 0) > maxAgeMs) return { ok: false, reason: 'انتهت صلاحية الجلسة' };
    return {
      ok: true,
      playerId: data.p,
      mode: data.m === 'telegram' ? 'telegram' : 'guest',
      name: typeof data.n === 'string' ? data.n : '',
    };
  } catch {
    return { ok: false, reason: 'توكن تالف' };
  }
}

/** توكن ضيف (توافقية): نفس بنية توكن الجلسة مع وضع الضيف. */
export function issueGuestToken(secret, { playerId, now = Date.now() }) {
  return issueSessionToken(secret, { playerId, mode: 'guest', now });
}

export function verifyGuestToken(token, secret, opts = {}) {
  const result = verifySessionToken(token, secret, opts);
  if (!result.ok) return result;
  return { ok: true, playerId: result.playerId };
}

export function newGuestId() {
  return `guest_${crypto.randomBytes(6).toString('hex')}`;
}
