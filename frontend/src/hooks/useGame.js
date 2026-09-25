// إدارة حالة اللعبة: جلسة، حالة رسمية من السيرفر، نقر مجمّع، نوافذ وتوستات.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api, ApiError, getSessionToken, setSessionToken, getNickname, setNickname, newRequestId } from '../api.js';
import { initTelegram, isTelegram, getStartParam, haptic } from '../telegram.js';

let floatSeq = 0;

// السيرفر يقبل 25 نقرة كحد أقصى في الطلب الواحد — نجمع النقرات محلياً ونجزّئها.
const MAX_TAPS_PER_FLUSH = 25;
const MAX_PENDING_TAPS = 40;

export function useGame() {
  const [status, setStatus] = useState('loading');
  const [fatal, setFatal] = useState(null);
  const [player, setPlayer] = useState(null);
  const [catalog, setCatalog] = useState(null);
  const [mode, setMode] = useState('guest');
  const [pending, setPending] = useState(0);
  const [busy, setBusy] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [floats, setFloats] = useState([]);
  const [modal, setModal] = useState(null);
  const [board, setBoard] = useState({ scope: 'friends', entries: [], total: 0, label: '' });
  const [boardLoading, setBoardLoading] = useState(false);
  const [raidLog, setRaidLog] = useState({ incoming: [], outgoing: [], shieldUntil: 0 });
  const [invite, setInvite] = useState(null);

  const stateRef = useRef(null);
  const pendingRef = useRef(0);
  const inFlight = useRef(false);
  const flushTimer = useRef(null);
  const busyRef = useRef(false);
  const seenOffline = useRef(false);
  const dismissedNotices = useRef(new Set());
  const modalRef = useRef(null);
  modalRef.current = modal;

  // تحديث عدد النقرات غير المؤكّدة (يغذّي عدّاد العملات المتفائل).
  const setPendingCount = useCallback((next) => {
    pendingRef.current = Math.max(0, Math.min(MAX_PENDING_TAPS, Math.floor(next) || 0));
    setPending(pendingRef.current);
    return pendingRef.current;
  }, []);

  const pushToast = useCallback((message, kind = '') => {
    const id = ++floatSeq;
    setToasts((list) => [...list.slice(-3), { id, message, kind }]);
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 2600);
  }, []);

  const spawnFloat = useCallback((x, y, text, kind = 'coins') => {
    const id = ++floatSeq;
    setFloats((list) => [...list.slice(-14), { id, x, y, text, kind }]);
    setTimeout(() => setFloats((list) => list.filter((f) => f.id !== id)), 950);
  }, []);

  const applyServerState = useCallback((payload, { initial = false } = {}) => {
    if (payload.player) {
      setPlayer(payload.player);
      stateRef.current = payload.player;
      const notices = (payload.player.notices || []).filter((n) => !dismissedNotices.current.has(n.id));
      if (notices.length && !modalRef.current) setModal({ type: 'notice', payload: notices });
    }
    if (payload.catalog) setCatalog(payload.catalog);
    if (payload.idle && payload.idle.coins > 0 && !seenOffline.current && (initial || payload.idle.seconds >= 600)) {
      seenOffline.current = true;
      setModal({ type: 'offline', payload: payload.idle });
    }
    if (payload.visitReward && payload.visitReward.day > 1) {
      pushToast(`🎁 مكافأة الزيارة: اليوم ${payload.visitReward.day} من 7`, 'success');
    }
    if (payload.result && payload.result.relic) {
      haptic('success');
      setModal({
        type: 'discovery',
        payload: {
          relic: payload.result.relic,
          isNew: payload.result.relicIsNew,
          dupeGems: payload.result.dupeGems || 0,
        },
      });
    } else if (payload.result && payload.result.gems > 0 && !payload.result.relic) {
      haptic('success');
      pushToast(`💎 +${payload.result.gems} جوهرة!`, 'success');
    }
  }, [pushToast]);

  const bootstrap = useCallback(async () => {
    initTelegram();
    try {
      let payload = null;
      const startParam = getStartParam();
      if (!isTelegram() && getSessionToken()) {
        try {
          payload = await api.state();
          setMode('guest');
        } catch (err) {
          if (err instanceof ApiError && (err.status === 401 || err.code === 'invalid_token')) {
            setSessionToken('');
          } else {
            throw err;
          }
        }
      }
      if (!payload) {
        const body = { startParam };
        const nick = getNickname();
        if (!isTelegram() && nick) body.nickname = nick;
        const session = await api.session(body);
        if (session.token) setSessionToken(session.token);
        setMode(session.mode);
        payload = session;
        if (session.isNew) setTimeout(() => setModal({ type: 'welcome', payload: session }), 500);
      }
      applyServerState(payload, { initial: true });
      setStatus('ready');
    } catch (err) {
      setFatal(err?.message || 'تعذّر تشغيل اللعبة');
      setStatus('fatal');
    }
  }, [applyServerState]);

  useEffect(() => { bootstrap(); }, [bootstrap]);

  const recoverAuth = useCallback(async () => {
    setSessionToken('');
    setStatus('loading');
    setFatal(null);
    await bootstrap();
  }, [bootstrap]);

  // ---------------------------- النقر المجمّع ----------------------------

  const scheduleFlush = useCallback((delay = 300) => {
    if (flushTimer.current) return;
    flushTimer.current = setTimeout(() => {
      flushTimer.current = null;
      flushTaps();
    }, delay);
  }, []);

  const flushTaps = useCallback(async () => {
    if (inFlight.current) return;
    const total = pendingRef.current;
    if (total <= 0) return;
    const count = Math.min(total, MAX_TAPS_PER_FLUSH);
    inFlight.current = true;
    try {
      const res = await api.mine(count, newRequestId());
      applyServerState(res);
      // نطرح ما أكّده السيرفر فقط — تبقى بقية النقرات ظاهرة فلا يهبط العدّاد.
      setPendingCount(pendingRef.current - count);
    } catch (err) {
      const retryable = err instanceof ApiError && ['network', 'timeout', 'mine_throttled', 'rate_limited'].includes(err.code);
      if (err instanceof ApiError && err.status === 401) {
        setPendingCount(0);
        recoverAuth();
      } else if (retryable) {
        // الطلب لم يُنفَّذ — نُبقي النقرات لمحاولة تالية (بلا فقدان للعملات).
      } else {
        // خطأ غير قابل لإعادة المحاولة: نُسقط النقرات غير المؤكّدة (لم تُحتسب على السيرفر).
        setPendingCount(pendingRef.current - count);
        pushToast(err?.message || 'تعذّر التعدين', 'error');
      }
    } finally {
      inFlight.current = false;
      if (pendingRef.current > 0) scheduleFlush(350);
    }
  }, [applyServerState, pushToast, recoverAuth, scheduleFlush, setPendingCount]);

  const tap = useCallback((event, times = 1) => {
    const s = stateRef.current;
    if (!s || status !== 'ready') return;
    const accepted = Math.min(times, MAX_PENDING_TAPS - pendingRef.current);
    if (accepted <= 0) return;
    pendingRef.current += accepted;
    setPending(pendingRef.current);
    haptic('light');
    const manual = s.power.manual;
    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2 - 60;
    if (event) {
      try {
        const rect = event.currentTarget.getBoundingClientRect();
        x = rect.left + rect.width / 2 + (Math.random() * 60 - 30);
        y = rect.top + rect.height * 0.25 + (Math.random() * 30 - 15);
      } catch {}
    }
    spawnFloat(x, y, `+${manual * accepted}`, 'coins');
    scheduleFlush(280);
  }, [status, scheduleFlush, spawnFloat]);

  // تحديث دوري + عند العودة للتطبيق
  useEffect(() => {
    if (status !== 'ready') return;
    const refresh = async () => {
      try {
        const res = await api.state();
        applyServerState(res);
        const log = await api.raidLog();
        setRaidLog(log);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) recoverAuth();
      }
    };
    const interval = setInterval(refresh, 25000);
    const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [status, applyServerState, recoverAuth]);

  // ------------------------------- الأوامر -------------------------------

  const run = useCallback(async (fn, { hapticKind = 'medium', silentErrors = false } = {}) => {
    if (busyRef.current) return null;
    busyRef.current = true;
    setBusy(true);
    try {
      await flushTaps();
      const res = await fn();
      applyServerState(res);
      haptic(hapticKind);
      return res;
    } catch (err) {
      haptic('error');
      if (!silentErrors) pushToast(err?.message || 'تعذّر تنفيذ العملية', 'error');
      if (err instanceof ApiError && err.status === 401) recoverAuth();
      return null;
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, [applyServerState, flushTaps, pushToast, recoverAuth]);

  const actions = useMemo(() => ({
    upgrade: (item, amount = 1) => run(() => api.upgrade(item, amount, newRequestId()), { hapticKind: 'medium' }),
    daily: () => run(() => api.daily(newRequestId()), { hapticKind: 'heavy' }),
    claim: (kind, id) => run(() => api.claim(kind, id, newRequestId())),
    switchRegion: (regionId) => run(() => api.region(regionId, newRequestId())),
    setTitle: (titleId) => run(() => api.title(titleId, newRequestId())),
    raid: (targetId, revenge = false) => run(() => api.raid(targetId, newRequestId(), revenge), { hapticKind: 'heavy' }),
    dismissNotices: async (ids) => {
      ids.forEach((id) => dismissedNotices.current.add(id));
      try {
        const res = await api.clearNotices(ids);
        if (res.player) { setPlayer(res.player); stateRef.current = res.player; }
      } catch {}
    },
    tutorialDone: () => run(() => api.tutorialDone(newRequestId()), { silentErrors: true, hapticKind: 'light' }),
  }), [run]);

  const refreshBoard = useCallback(async (scope = board.scope) => {
    setBoardLoading(true);
    try {
      const res = await api.leaderboard(scope, 50);
      setBoard({ scope, entries: res.entries, total: res.total, label: res.label });
    } catch (err) {
      pushToast(err?.message || 'تعذّر تحميل اللوحة', 'error');
    } finally {
      setBoardLoading(false);
    }
  }, [board.scope, pushToast]);

  const refreshRaidLog = useCallback(async () => {
    try {
      const res = await api.raidLog();
      setRaidLog(res);
    } catch {}
  }, []);

  const loadInvite = useCallback(async () => {
    try {
      const res = await api.invite();
      setInvite(res);
      return res;
    } catch (err) {
      pushToast(err?.message || 'تعذّر إنشاء الدعوة', 'error');
      return null;
    }
  }, [pushToast]);

  const changeNickname = useCallback(async (name) => {
    const clean = String(name || '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, 20);
    if (!clean) return;
    setNickname(clean);
    try {
      const session = await api.session({ nickname: clean });
      if (session.token) setSessionToken(session.token);
      setMode(session.mode);
      applyServerState(session);
      pushToast('تم تحديث الاسم', 'success');
    } catch (err) {
      pushToast(err?.message || 'تعذّر تحديث الاسم', 'error');
    }
  }, [applyServerState, pushToast]);

  const nickname = useMemo(() => (mode === 'guest' ? getNickname() : ''), [mode]);

  const displayCoins = (player?.coins || 0) + pending * (player?.power?.manual || 0);
  const displayGems = player?.gems || 0;

  return {
    status, fatal, player, catalog, mode, busy, nickname,
    pending, displayCoins, displayGems,
    toasts, floats, modal, setModal,
    board, boardLoading, raidLog, invite,
    tap, run, actions, pushToast, recoverAuth, changeNickname,
    refreshBoard, refreshRaidLog, loadInvite,
  };
}

/** مؤقّت لإعادة الرسم كل فترة (لعدّادات التنازلي). */
export function useTick(intervalMs = 1000) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
}
