// ============================================================================
// Cloudflare Worker — يقدّم الواجهة المبنية + الـ API + webhook البوت من أصل واحد.
// لا سيرفر دائم: تيليجرام ينادي الـ webhook عند كل رسالة، والدوال تُنفَّذ عند الطلب.
// نفس محرك اللعبة (backend/src/game) — السلطة الكاملة للسيرفر بلا أي تغيير.
// ============================================================================

import { createEngine, GameError } from '../backend/src/game/engine.js';
import { createD1Store } from './store.d1.js';
import {
  resolveSessionSecret, verifyInitData, verifySessionToken,
  issueSessionToken, newGuestId,
} from './auth.js';
import { handleTelegramUpdate } from './telegram.js';
import { timingSafeEqualStr } from './crypto.js';

const str = (v, max = 64) => (typeof v === 'string' ? v.slice(0, max) : '');
const REQUEST_ID_RE = /^[a-zA-Z0-9_-]{6,64}$/;

/** معرّف طلب صالح إلزامي لكل عملية تغيّر الحالة (يمنع التنفيذ المزدوج). */
function requestIdOf(body) {
  const id = str(body?.requestId, 64);
  if (!REQUEST_ID_RE.test(id)) {
    throw new GameError('معرّف الطلب مفقود أو غير صالح — أعد المحاولة', 400, 'bad_request_id');
  }
  return id;
}

const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer',
};

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), { status, headers: { ...JSON_HEADERS, ...extra } });
}

function errorResponse(err) {
  if (err instanceof GameError) {
    return json({ ok: false, error: err.message, code: err.code }, err.status || 400);
  }
  console.error('worker error:', (err && err.stack) || err);
  return json({ ok: false, error: 'حدث خطأ في السيرفر — حاول لاحقاً', code: 'server_error' }, 500);
}

async function run(fn) {
  try {
    const data = await fn();
    return json({ ok: true, ...(data || {}) });
  } catch (err) {
    return errorResponse(err);
  }
}

function corsHeaders(request, env) {
  const origin = request.headers.get('origin');
  if (!origin) return {};
  const allowed = (env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim().replace(/\/+$/, '')).filter(Boolean);
  if (!allowed.includes(origin.replace(/\/+$/, ''))) return {};
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'Content-Type, Authorization, X-Init-Data, X-Admin-Secret',
    'access-control-max-age': '600',
    vary: 'Origin',
  };
}

function displayName(user) {
  const full = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  return (full || user.username || 'منقّب').slice(0, 30);
}

// ---- حدود معدّل عامة (best-effort داخل نسخة الـ isolate) --------------------
const ipHits = new Map();
const actionHits = new Map();
function hit(map, key, windowMs, max) {
  const now = Date.now();
  const entry = map.get(key);
  if (!entry || now - entry.start >= windowMs) {
    if (map.size > 5000) {
      for (const [k, v] of map) if (now - v.start >= windowMs) map.delete(k);
    }
    map.set(key, { start: now, count: 1 });
    return true;
  }
  entry.count += 1;
  return entry.count <= max;
}
function clientIp(request) {
  const direct = request.headers.get('cf-connecting-ip');
  if (direct) return direct;
  const fwd = request.headers.get('x-forwarded-for');
  return fwd ? fwd.split(',')[0].trim() : 'unknown';
}

// ---- حدّ تعدين بسيط لكل نسخة (best-effort على الـ Edge) ----------------------
const mineState = new Map();
function mineAllowed(playerId, taps) {
  if (mineState.size > 5000) mineState.clear();
  const now = Date.now();
  const s = mineState.get(playerId) || { tokens: 30, ts: now };
  s.tokens = Math.min(30, s.tokens + ((now - s.ts) / 1000) * 8);
  s.ts = now;
  if (s.tokens < taps) {
    mineState.set(playerId, s);
    return false;
  }
  s.tokens -= taps;
  mineState.set(playerId, s);
  return true;
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

async function resolveIdentity(request, config, body, engine) {
  const initData = str(request.headers.get('x-init-data') || body?.initData, 8192);
  let initError = null;
  if (initData) {
    const result = await verifyInitData(initData, config.botToken, { maxAgeSec: config.initDataMaxAgeSec });
    if (result.ok) {
      return {
        identity: {
          playerId: `tg_${result.user.id}`,
          name: displayName(result.user),
          photoUrl: result.user.photoUrl,
          languageCode: result.user.languageCode,
          mode: 'telegram',
        },
        startParam: result.startParam,
      };
    }
    initError = result.reason || 'تعذّر التحقق من تيليجرام';
  }

  const auth = str(request.headers.get('authorization'), 600);
  if (auth.startsWith('Bearer ')) {
    const result = await verifySessionToken(auth.slice(7), config.sessionSecret, { maxAgeMs: config.sessionMaxAgeMs });
    if (result.ok) {
      // نسخة الجلسة: تسجيل الخروج يرفعها فيُبطل كل التوكنات السابقة
      if (!(await engine.sessionValid(result.playerId, result.epoch))) {
        throw new GameError(initError || 'انتهت الجلسة — أعد فتح التطبيق', 401, initError ? 'invalid_init_data' : 'invalid_token');
      }
      return {
        identity: { playerId: result.playerId, name: result.name || null, photoUrl: null, mode: result.mode },
        startParam: null,
      };
    }
    throw new GameError(initError || result.reason, 401, initError ? 'invalid_init_data' : 'invalid_token');
  }

  if (initError) throw new GameError(initError, 401, 'invalid_init_data');
  return null;
}

function requireIdentity(resolved) {
  if (!resolved) throw new GameError('سجّل الدخول أولاً (افتح التطبيق من تيليجرام)', 401, 'no_auth');
  if (!hit(actionHits, resolved.identity.playerId, 10_000, 80)) {
    throw new GameError('محاولات كثيرة — انتظر لحظة', 429, 'rate_limited');
  }
  return resolved;
}

async function handleImport(request, env, store, body) {
  const secret = (env.ADMIN_SECRET || '').trim();
  if (!secret) return json({ ok: false, error: 'ADMIN_SECRET غير مضبوط', code: 'no_admin_secret' }, 403);
  if (!timingSafeEqualStr(request.headers.get('x-admin-secret') || '', secret)) {
    return json({ ok: false, error: 'غير مصرّح', code: 'forbidden' }, 403);
  }
  if (!body || typeof body !== 'object') return json({ ok: false, error: 'جسم غير صالح', code: 'bad_body' }, 400);
  await store.replace(body);
  return json({ ok: true, players: Object.keys(body.players || {}).length });
}

async function handleApi(request, env, ctx, url) {
  if (!env.DB) {
    return json({ ok: false, error: 'قاعدة D1 غير مربوطة — أضف الربط DB من إعدادات المشروع', code: 'no_db' }, 503);
  }

  const sessionSecret = await resolveSessionSecret(env);
  const config = {
    botToken: (env.BOT_TOKEN || '').trim(),
    botUsername: (env.BOT_USERNAME || 'MineWarrBot').replace(/^@/, ''),
    sessionSecret,
    initDataMaxAgeSec: Number(env.INIT_DATA_MAX_AGE_SEC) || 24 * 3600,
    sessionMaxAgeMs: Number(env.SESSION_MAX_AGE_MS) || 7 * 24 * 3600 * 1000,
    allowGuest: env.ALLOW_GUEST === 'true',
  };
  const store = createD1Store(env.DB);
  const engine = createEngine({ store, botUsername: config.botUsername });

  const pathname = url.pathname.replace(/\/+$/, '') || '/api';
  const method = request.method;
  if (Number(request.headers.get('content-length') || 0) > 64 * 1024) {
    return json({ ok: false, error: 'الطلب كبير جداً', code: 'payload_too_large' }, 413);
  }
  if (!hit(ipHits, clientIp(request), 60_000, 180)) {
    return json({ ok: false, error: 'طلبات كثيرة — انتظر قليلاً', code: 'rate_limited' }, 429);
  }
  const body = method === 'POST' ? await readJson(request) : null;

  // ---- صحة الخدمة ----------------------------------------------------------
  if (pathname === '/api/health' && method === 'GET') {
    return json({ ok: true, time: new Date().toISOString(), ...(await engine.stats()) });
  }

  // ---- الكاتالوج -----------------------------------------------------------
  if (pathname === '/api/catalog' && method === 'GET') {
    return json({ ok: true, catalog: engine.catalog() });
  }

  // ---- webhook البوت -------------------------------------------------------
  if (pathname === '/api/telegram/webhook' && method === 'POST') {
    const secret = (env.WEBHOOK_SECRET || '').trim();
    if (secret && !timingSafeEqualStr(request.headers.get('x-telegram-bot-api-secret-token') || '', secret)) {
      return json({ ok: false, error: 'unauthorized', code: 'forbidden' }, 401);
    }
    if (body) {
      const baseUrl = ((env.APP_URL || '').trim().replace(/\/+$/, '')) || url.origin;
      // نردّ على تيليجرام فوراً ثم نكمل العمل في الخلفية
      ctx.waitUntil(handleTelegramUpdate(body, { config, engine, baseUrl }));
    }
    return json({ ok: true });
  }

  // ---- استيراد إداري (نقل بيانات اللابتوب إلى D1) --------------------------
  if (pathname === '/api/admin/import' && method === 'POST') {
    return handleImport(request, env, store, body);
  }

  // ---- الجلسة --------------------------------------------------------------
  if (pathname === '/api/session' && method === 'POST') {
    return run(async () => {
      const resolved = await resolveIdentity(request, config, body, engine);
      let identity;
      let startParam = null;

      if (resolved) {
        identity = { ...resolved.identity };
        // معرّف الدعوة قد يصل من initData أو من رابط الواجهة (?startapp=) —
        // الواجهة ترسله في الجسم دائماً، فنقبله كاحتياط حتى لا تفشل إضافة الأصدقاء.
        startParam = resolved.startParam || str(body?.startParam || url.searchParams.get('startapp'), 64) || null;
        if (identity.mode === 'guest') {
          const nick = str(body?.nickname, 20).replace(/[\u0000-\u001f]/g, '').trim();
          if (nick) identity.name = nick;
        }
      } else if (config.allowGuest) {
        const playerId = newGuestId();
        const nick = str(body?.nickname, 20).replace(/[\u0000-\u001f]/g, '').trim();
        identity = { playerId, name: nick || null, photoUrl: null, mode: 'guest' };
        startParam = str(body?.startParam || url.searchParams.get('startapp'), 64) || null;
      } else {
        throw new GameError('افتح التطبيق من داخل تيليجرام', 401, 'telegram_required');
      }

      if (!identity.name) identity.name = 'منقّب ضيف';
      const result = await engine.session(identity, startParam);
      const token = await issueSessionToken(config.sessionSecret, {
        playerId: identity.playerId,
        mode: identity.mode,
        name: identity.name,
        epoch: result.sessionEpoch,
      });
      return { ...result, token, mode: identity.mode };
    });
  }

  // ---- الحالة --------------------------------------------------------------
  if (pathname === '/api/state' && method === 'GET') {
    return run(async () => {
      const { identity } = requireIdentity(await resolveIdentity(request, config, null, engine));
      return engine.getState(identity.playerId);
    });
  }

  // ---- التعدين -------------------------------------------------------------
  if (pathname === '/api/actions/mine' && method === 'POST') {
    return run(async () => {
      const { identity } = requireIdentity(await resolveIdentity(request, config, body, engine));
      const taps = Math.max(1, Math.min(25, Number(body?.taps) || 1));
      if (!mineAllowed(identity.playerId, taps)) throw new GameError('تعدين أسرع من اللازم — لحظة!', 429, 'mine_throttled');
      return engine.mine(identity.playerId, taps, requestIdOf(body));
    });
  }

  // ---- الترقيات ------------------------------------------------------------
  if (pathname === '/api/actions/upgrade' && method === 'POST') {
    return run(async () => {
      const { identity } = requireIdentity(await resolveIdentity(request, config, body, engine));
      return engine.upgrade(identity.playerId, str(body?.item, 32), Number(body?.amount) || 1, requestIdOf(body));
    });
  }

  // ---- الغارات -------------------------------------------------------------
  if (pathname === '/api/actions/raid' && method === 'POST') {
    return run(async () => {
      const { identity } = requireIdentity(await resolveIdentity(request, config, body, engine));
      return engine.raid(identity.playerId, str(body?.targetId, 64), requestIdOf(body), { revenge: Boolean(body?.revenge) });
    });
  }

  // ---- الحفرة اليومية ------------------------------------------------------
  if (pathname === '/api/actions/daily' && method === 'POST') {
    return run(async () => {
      const { identity } = requireIdentity(await resolveIdentity(request, config, body, engine));
      return engine.dailyDig(identity.playerId, requestIdOf(body));
    });
  }

  // ---- المطالبات -----------------------------------------------------------
  if (pathname === '/api/actions/claim' && method === 'POST') {
    return run(async () => {
      const { identity } = requireIdentity(await resolveIdentity(request, config, body, engine));
      return engine.claim(identity.playerId, str(body?.kind, 16), str(body?.id, 32), requestIdOf(body));
    });
  }

  // ---- المنطقة والألقاب ----------------------------------------------------
  if (pathname === '/api/actions/region' && method === 'POST') {
    return run(async () => {
      const { identity } = requireIdentity(await resolveIdentity(request, config, body, engine));
      return engine.switchRegion(identity.playerId, str(body?.regionId, 32), requestIdOf(body));
    });
  }

  if (pathname === '/api/actions/title' && method === 'POST') {
    return run(async () => {
      const { identity } = requireIdentity(await resolveIdentity(request, config, body, engine));
      return engine.setTitle(identity.playerId, str(body?.titleId, 32), requestIdOf(body));
    });
  }

  if (pathname === '/api/actions/notices' && method === 'POST') {
    return run(async () => {
      const { identity } = requireIdentity(await resolveIdentity(request, config, body, engine));
      const ids = Array.isArray(body?.ids) ? body.ids.slice(0, 20).map((x) => str(x, 64)) : [];
      return engine.clearNotices(identity.playerId, ids);
    });
  }

  // ---- الجولة التعليمية ----------------------------------------------------
  if (pathname === '/api/actions/tutorial' && method === 'POST') {
    return run(async () => {
      const { identity } = requireIdentity(await resolveIdentity(request, config, body, engine));
      return engine.completeTutorial(identity.playerId, requestIdOf(body));
    });
  }

  // ---- لوحة الصدارة --------------------------------------------------------
  if (pathname === '/api/leaderboard' && method === 'GET') {
    return run(async () => {
      const { identity } = requireIdentity(await resolveIdentity(request, config, null, engine));
      const requested = url.searchParams.get('scope');
      const scope = ['wealth', 'collection', 'season', 'friends', 'nearby'].includes(requested) ? requested : 'wealth';
      const limit = Math.max(1, Math.min(100, Number(url.searchParams.get('limit')) || 50));
      return engine.leaderboard(scope, identity.playerId, limit);
    });
  }

  if (pathname === '/api/raidlog' && method === 'GET') {
    return run(async () => {
      const { identity } = requireIdentity(await resolveIdentity(request, config, null, engine));
      return engine.raidLog(identity.playerId);
    });
  }

  // ---- الدعوات -------------------------------------------------------------
  if (pathname === '/api/invites' && method === 'POST') {
    return run(async () => {
      const { identity } = requireIdentity(await resolveIdentity(request, config, body, engine));
      return engine.invite(identity.playerId);
    });
  }

  // ---- تسجيل الخروج: يُبطل كل التوكنات السابقة لهذا اللاعب ------------------
  if (pathname === '/api/actions/logout' && method === 'POST') {
    return run(async () => {
      const { identity } = requireIdentity(await resolveIdentity(request, config, body, engine));
      return engine.logout(identity.playerId);
    });
  }

  return json({ ok: false, error: 'مسار غير موجود', code: 'not_found' }, 404);
}

async function serveAssets(request, env) {
  if (!env.ASSETS) {
    return new Response('الواجهة غير مبنية — نفّذ npm run build قبل النشر', { status: 500 });
  }
  const res = await env.ASSETS.fetch(request);
  if (res.status !== 404 || !['GET', 'HEAD'].includes(request.method)) return res;
  // SPA fallback: أي مسار غير موجود يُعاد إلى index.html
  const index = await env.ASSETS.fetch(new URL('/index.html', request.url).toString(), { method: 'GET' });
  if (index.status >= 400) return res;
  return new Response(index.body, { status: 200, headers: index.headers });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const cors = corsHeaders(request, env);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    if (url.pathname === '/api' || url.pathname.startsWith('/api/')) {
      const res = await handleApi(request, env, ctx, url);
      const headers = new Headers(res.headers);
      for (const [k, v] of Object.entries(cors)) headers.set(k, v);
      return new Response(res.body, { status: res.status, headers });
    }

    return serveAssets(request, env);
  },
};
