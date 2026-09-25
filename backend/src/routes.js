// ============================================================================
// مسارات الـ API — رقيقة: مصادقة، تحقق من المدخلات، ثم نداء محرك اللعبة.
// ============================================================================

import { Router } from 'express';
import { verifyInitData, verifySessionToken, issueSessionToken, newGuestId } from './auth.js';
import { GameError } from './game/engine.js';
import { createLimiter, createTokenBucket } from './ratelimit.js';

const str = (v, max = 64) => (typeof v === 'string' ? v.slice(0, max) : '');
const REQUEST_ID_RE = /^[a-zA-Z0-9_-]{6,64}$/;

/** معرّف طلب صالح إلزامي لكل عملية تغيّر الحالة — يمنع التنفيذ المزدوج عند تكرار الشبكة. */
function requestIdOf(body) {
  const id = str(body?.requestId, 64);
  if (!REQUEST_ID_RE.test(id)) {
    throw new GameError('معرّف الطلب مفقود أو غير صالح — أعد المحاولة', 400, 'bad_request_id');
  }
  return id;
}

export function createApiRoutes({ engine, config }) {
  const router = Router();
  const ipLimiter = createLimiter({ windowMs: 60_000, max: 180 });
  const actionLimiter = createLimiter({ windowMs: 10_000, max: 80 });
  const mineBucket = createTokenBucket({ capacity: 30, refillPerSec: 8 });

  const guestTokenFor = (playerId, mode = 'guest', name = '', epoch = 0) =>
    issueSessionToken(config.sessionSecret, { playerId, mode, name, epoch });

  function displayName(user) {
    const full = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
    return (full || user.username || 'منقّب').slice(0, 30);
  }

  /**
   * يشتق هوية اللاعب من initData الموثّق، أو من توكن جلسة موقّع من السيرفر
   * (يُصدر بعد أول تحقق ناجح من تيليجرام — فلا ينكسر اللعب إذا تقادم auth_date).
   * لا يُقبل أي playerId من العميل.
   */
  async function resolveIdentity(req) {
    const initData = str(req.get('x-init-data') || req.body?.initData, 8192);
    let initError = null;
    if (initData) {
      const result = verifyInitData(initData, config.botToken, { maxAgeSec: config.initDataMaxAgeSec });
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
          viaInitData: true,
        };
      }
      initError = result.reason || 'تعذّر التحقق من تيليجرام';
    }

    const auth = str(req.get('authorization'), 600);
    if (auth.startsWith('Bearer ')) {
      const result = verifySessionToken(auth.slice(7), config.sessionSecret, { maxAgeMs: config.sessionMaxAgeMs });
      if (result.ok) {
        // نسخة الجلسة: تسجيل الخروج يرفعها فيُبطل كل التوكنات السابقة
        if (!(await engine.sessionValid(result.playerId, result.epoch))) {
          if (initError) throw new GameError(initError, 401, 'invalid_init_data');
          throw new GameError('انتهت الجلسة — أعد فتح التطبيق', 401, 'invalid_token');
        }
        return {
          identity: { playerId: result.playerId, name: result.name || null, photoUrl: null, mode: result.mode },
          startParam: null,
          viaInitData: false,
        };
      }
      if (initError) throw new GameError(initError, 401, 'invalid_init_data');
      throw new GameError(result.reason, 401, 'invalid_token');
    }

    if (initError) throw new GameError(initError, 401, 'invalid_init_data');
    return null;
  }

  async function requireIdentity(req) {
    const resolved = await resolveIdentity(req);
    if (!resolved) throw new GameError('سجّل الدخول أولاً (افتح التطبيق من تيليجرام)', 401, 'no_auth');
    return resolved;
  }

  const safe = (fn) => async (req, res, next) => {
    try {
      const data = await fn(req);
      res.json({ ok: true, ...data });
    } catch (err) {
      if (err instanceof GameError) {
        return res.status(err.status).json({ ok: false, error: err.message, code: err.code });
      }
      next(err);
    }
  };

  router.use((req, res, next) => {
    const limit = ipLimiter(req.ip || 'unknown');
    if (!limit.ok) return res.status(429).json({ ok: false, error: 'طلبات كثيرة — انتظر قليلاً', code: 'rate_limited' });
    next();
  });

  // ---- صحة الخدمة ----------------------------------------------------------
  router.get('/health', safe(async () => ({
    time: new Date().toISOString(),
    ...(await engine.stats()),
  })));

  // ---- الجلسة --------------------------------------------------------------
  router.post('/session', safe(async (req) => {
    let resolved = await resolveIdentity(req);
    let token = null;
    let identity;
    let startParam = null;

    if (resolved) {
      identity = { ...resolved.identity };
      // معرّف الدعوة قد يصل من initData أو من رابط الواجهة (?startapp=) —
      // الواجهة ترسله في الجسم دائماً، فنقبله كاحتياط حتى لا تفشل إضافة الأصدقاء.
      startParam = resolved.startParam || str(req.body?.startParam || req.query?.startapp, 64) || null;
      if (identity.mode === 'guest') {
        // اسم عرض اختياري للضيف (تطوير فقط)
        const nick = str(req.body?.nickname, 20).replace(/[\u0000-\u001f]/g, '').trim();
        if (nick) identity.name = nick;
      }
    } else if (config.allowGuest) {
      // وضع المتصفح للتطوير: هوية ضيف يصدرها السيرفر وموقّعة — لا يمكن انتحال لاعب آخر.
      const playerId = newGuestId();
      const nick = str(req.body?.nickname, 20).replace(/[\u0000-\u001f]/g, '').trim();
      identity = { playerId, name: nick || null, photoUrl: null, mode: 'guest' };
      startParam = str(req.body?.startParam || req.query?.startapp, 64) || null;
    } else {
      throw new GameError('افتح التطبيق من داخل تيليجرام', 401, 'telegram_required');
    }

    if (!identity.name) identity.name = 'منقّب ضيف';
    const result = await engine.session(identity, startParam);
    // توكن جلسة موقّع يحمل نسخة الجلسة: يبقى اللعب شغّالاً حتى لو تقادم initData،
    // ويمكن إبطاله بتسجيل الخروج.
    token = guestTokenFor(identity.playerId, identity.mode, identity.name, result.sessionEpoch);
    return { ...result, token, mode: identity.mode };
  }));

  // ---- الحالة --------------------------------------------------------------
  router.get('/state', safe(async (req) => {
    const { identity } = await requireIdentity(req);
    return engine.getState(identity.playerId);
  }));

  // ---- التعدين -------------------------------------------------------------
  router.post('/actions/mine', safe(async (req) => {
    const { identity } = await requireIdentity(req);
    const requestId = requestIdOf(req.body);
    const taps = Math.max(1, Math.min(25, Number(req.body?.taps) || 1));
    if (!actionLimiter(identity.playerId).ok) throw new GameError('هدّئ قليلاً ⛏️', 429, 'rate_limited');
    const bucket = mineBucket(identity.playerId, taps);
    if (!bucket.ok) throw new GameError('تعدين أسرع من اللازم — لحظة!', 429, 'mine_throttled');
    return engine.mine(identity.playerId, taps, requestId);
  }));

  // ---- الشراء والترقيات ----------------------------------------------------
  router.post('/actions/upgrade', safe(async (req) => {
    const { identity } = await requireIdentity(req);
    const requestId = requestIdOf(req.body);
    if (!actionLimiter(identity.playerId).ok) throw new GameError('محاولات كثيرة — انتظر لحظة', 429, 'rate_limited');
    return engine.upgrade(identity.playerId, str(req.body?.item, 32), Number(req.body?.amount) || 1, requestId);
  }));

  // ---- الغارات (متاحة بين كل اللاعبين بلا شرط صداقة) ----------------------
  router.post('/actions/raid', safe(async (req) => {
    const { identity } = await requireIdentity(req);
    const requestId = requestIdOf(req.body);
    if (!actionLimiter(identity.playerId).ok) throw new GameError('محاولات كثيرة — انتظر لحظة', 429, 'rate_limited');
    return engine.raid(identity.playerId, str(req.body?.targetId, 64), requestId, { revenge: Boolean(req.body?.revenge) });
  }));

  // ---- الحفرة اليومية ------------------------------------------------------
  router.post('/actions/daily', safe(async (req) => {
    const { identity } = await requireIdentity(req);
    const requestId = requestIdOf(req.body);
    if (!actionLimiter(identity.playerId).ok) throw new GameError('محاولات كثيرة — انتظر لحظة', 429, 'rate_limited');
    return engine.dailyDig(identity.playerId, requestId);
  }));

  // ---- المطالبات -----------------------------------------------------------
  router.post('/actions/claim', safe(async (req) => {
    const { identity } = await requireIdentity(req);
    const requestId = requestIdOf(req.body);
    if (!actionLimiter(identity.playerId).ok) throw new GameError('محاولات كثيرة — انتظر لحظة', 429, 'rate_limited');
    return engine.claim(identity.playerId, str(req.body?.kind, 16), str(req.body?.id, 32), requestId);
  }));

  // ---- المنطقة والألقاب ----------------------------------------------------
  router.post('/actions/region', safe(async (req) => {
    const { identity } = await requireIdentity(req);
    const requestId = requestIdOf(req.body);
    if (!actionLimiter(identity.playerId).ok) throw new GameError('محاولات كثيرة — انتظر لحظة', 429, 'rate_limited');
    return engine.switchRegion(identity.playerId, str(req.body?.regionId, 32), requestId);
  }));

  router.post('/actions/title', safe(async (req) => {
    const { identity } = await requireIdentity(req);
    const requestId = requestIdOf(req.body);
    if (!actionLimiter(identity.playerId).ok) throw new GameError('محاولات كثيرة — انتظر لحظة', 429, 'rate_limited');
    return engine.setTitle(identity.playerId, str(req.body?.titleId, 32), requestId);
  }));

  router.post('/actions/notices', safe(async (req) => {
    const { identity } = await requireIdentity(req);
    if (!actionLimiter(identity.playerId).ok) throw new GameError('محاولات كثيرة — انتظر لحظة', 429, 'rate_limited');
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.slice(0, 20).map((x) => str(x, 64)) : [];
    return engine.clearNotices(identity.playerId, ids);
  }));

  // ---- الجولة التعليمية (تُسجَّل مرة، ويمكن إعادتها من الواجهة) --------------
  router.post('/actions/tutorial', safe(async (req) => {
    const { identity } = await requireIdentity(req);
    const requestId = requestIdOf(req.body);
    if (!actionLimiter(identity.playerId).ok) throw new GameError('محاولات كثيرة — انتظر لحظة', 429, 'rate_limited');
    return engine.completeTutorial(identity.playerId, requestId);
  }));

  // ---- تسجيل الخروج: يُبطل كل التوكنات السابقة لهذا اللاعب ------------------
  router.post('/actions/logout', safe(async (req) => {
    const { identity } = await requireIdentity(req);
    return engine.logout(identity.playerId);
  }));

  // ---- لوحة الصدارة --------------------------------------------------------
  router.get('/leaderboard', safe(async (req) => {
    const { identity } = await requireIdentity(req);
    const scope = ['wealth', 'collection', 'season', 'friends'].includes(req.query?.scope) ? req.query.scope : 'wealth';
    const limit = Math.max(1, Math.min(100, Number(req.query?.limit) || 50));
    return engine.leaderboard(scope, identity.playerId, limit);
  }));

  router.get('/raidlog', safe(async (req) => {
    const { identity } = await requireIdentity(req);
    return engine.raidLog(identity.playerId);
  }));

  // ---- الدعوات -------------------------------------------------------------
  router.post('/invites', safe(async (req) => {
    const { identity } = await requireIdentity(req);
    return engine.invite(identity.playerId);
  }));

  // ---- الكاتالوج (محتوى ثابت للعرض) ---------------------------------------
  router.get('/catalog', (req, res) => {
    res.json({ ok: true, catalog: engine.catalog() });
  });

  return router;
}
