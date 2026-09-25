/**
 * اختبار عرض الواجهة (SSR Smoke):
 * 1) يشغّل الباكند الحقيقي على منفذ مؤقت ببيانات معزولة.
 * 2) ينشئ لاعب ضيف ويلعب جولة قصيرة (تعدين، حفرة يومية، لوحة، دعوة).
 * 3) يعرض كل شاشات React على السيرفر بالبيانات الفعلية القادمة من الـ API.
 * يفشل الاختبار إذا انهار أي مكوّن أو اختفى نص أساسي.
 *
 * التشغيل: npm run test:render --prefix frontend
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

// ------------------------- بيئة الاختبار: لا DOM مطلوب -------------------------
// نستبدل SDK تيليجرام ببديل بسيط عبر alias في Vite أدناه.
const noop = () => {};
const here = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(here, '..', '..', 'backend');
const importBackend = (relative) => import(pathToFileURL(path.join(backendRoot, relative)).href);

const React = (await import('react')).default;
const { renderToString } = await import('react-dom/server');
const { createServer: createViteServer } = await import('vite');

const failures = [];
const ok = (label) => console.log(`✅ ${label}`);
const bad = (label, err) => { failures.push(label); console.error(`❌ ${label}`, err?.message || err || ''); };

// ------------------------------ الباكند ------------------------------
const { createJsonStore } = await importBackend('src/store.js');
const { createEngine } = await importBackend('src/game/engine.js');
const { createApp } = await importBackend('src/app.js');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'minewarr-render-'));
const store = createJsonStore({ file: path.join(dir, 'players.json') });
const engine = createEngine({ store, rng: () => 0.999 });
const config = {
  isProd: false, botToken: '', botUsername: 'MineWarrBot', frontendUrl: 'http://localhost:5173',
  allowedOrigins: [], sessionSecret: 'render-smoke', initDataMaxAgeSec: 86400,
  allowGuest: true, serveFrontend: false, trustProxy: false,
};
const app = createApp({ engine, config });
const server = await new Promise((resolve) => { const s = app.listen(0, () => resolve(s)); });
const base = `http://127.0.0.1:${server.address().port}`;

const post = async (p, body, token) => {
  const res = await fetch(base + p, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body || {}),
  });
  return res.json();
};
const get = async (p, token) => {
  const res = await fetch(base + p, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  return res.json();
};

// --------------------------- جولة لعب قصيرة ---------------------------
const session = await post('/api/session', { nickname: 'لاعب الاختبار' });
const token = session.token;
if (!session.ok || !token) bad('إنشاء جلسة ضيف');
const mine = await post('/api/actions/mine', { taps: 20, requestId: 'render_mine_01' }, token);
const daily = await post('/api/actions/daily', { requestId: 'render_daily_1' }, token);
const upgrade = await post('/api/actions/upgrade', { item: 'pickaxe', amount: 1, requestId: 'render_upg_01' }, token);
const board = await get('/api/leaderboard?scope=global', token);
const raidLog = await get('/api/raidlog', token);
const invite = await post('/api/invites', {}, token);
const state = await get('/api/state', token);
const catalog = state.catalog;
const player = state.player;

const game = {
  status: 'ready', fatal: null, player, catalog, mode: 'guest', busy: false,
  pending: 0, displayCoins: player.coins, displayGems: player.gems,
  toasts: [], floats: [], modal: null,
  setModal: noop, tap: noop, pushToast: noop, recoverAuth: noop, changeNickname: noop, run: noop,
  board: { scope: 'global', entries: board.entries, total: board.total, label: board.label },
  boardLoading: false,
  raidLog: { incoming: raidLog.incoming, outgoing: raidLog.outgoing, shieldUntil: raidLog.shieldUntil },
  invite,
  actions: {
    upgrade: noop, daily: noop, claim: noop, switchRegion: noop, setTitle: noop, raid: noop,
    dismissNotices: async () => {},
  },
  refreshBoard: noop, refreshRaidLog: noop, loadInvite: noop,
};

// ------------------------------ الواجهة ------------------------------
const vite = await createViteServer({
  root: path.resolve(here, '..'),
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
  resolve: {
    alias: { '@twa-dev/sdk': path.join(here, 'sdk-stub.mjs') },
  },
  optimizeDeps: { noDiscovery: true },
});
const load = (p) => vite.ssrLoadModule(p);

try {
  const MineTab = (await load('/src/components/MineTab.jsx')).default;
  const UpgradesTab = (await load('/src/components/UpgradesTab.jsx')).default;
  const FriendsTab = (await load('/src/components/FriendsTab.jsx')).default;
  const CollectionTab = (await load('/src/components/CollectionTab.jsx')).default;
  const Modals = (await load('/src/components/Modals.jsx')).default;
  const Header = (await load('/src/components/Header.jsx')).default;
  const TutorialModule = await load('/src/components/Tutorial.jsx');
  const Tutorial = TutorialModule.default;
  const TUTORIAL_STEPS = TutorialModule.TUTORIAL_STEPS;

  const render = (Component, props, label, needles = []) => {
    try {
      const html = renderToString(React.createElement(Component, props));
      const missing = needles.filter((n) => !html.includes(n));
      if (!html || html.length < 50) return bad(`${label}: مخرجات فارغة`);
      if (missing.length) return bad(`${label}: نصوص ناقصة (${missing.join(', ')})`);
      ok(`${label} (${html.length} حرف)`);
    } catch (err) {
      bad(label, err);
    }
  };

  render(Header, { game, onHelp: noop, onOpenTab: noop, onEditName: noop }, 'الترويسة', ['حرب المناجم', player.name, player.region.name]);
  render(MineTab, { game }, 'شاشة المنجم', ['عدّن', player.region.name, 'المنطقة القادمة']);
  render(UpgradesTab, { game, catalog }, 'شاشة الترقيات', ['المعدات', 'العمّال', 'المرافق']);
  render(FriendsTab, { game, catalog }, 'شاشة الأصدقاء', ['الحفرة الجماعية', 'دعوة صديق']);
  render(CollectionTab, { game, catalog }, 'شاشة المجموعة', ['الآثار', 'الألقاب', 'الإنجازات والمكافآت']);

  // النوافذ المنبثقة بكل أنواعها
  const rarity = catalog.rarities[catalog.relics[0].rarity];
  const modals = [
    ['welcome', {}],
    ['offline', { coins: 1234, seconds: 7200, capped: false, capHours: 8, rate: 2 }],
    ['discovery', { relic: catalog.relics[0], isNew: true, dupeGems: 0 }],
    ['daily', { type: 'coins_small', coins: 150, shieldMs: 4 * 3600 * 1000 }],
    ['notice', [{ id: 'n1', type: 'visit', data: { day: 2, coins: 100 }, at: Date.now() }]],
    ['raid', { entry: { playerId: 'x', name: 'خصم', raidEstimate: 55, potentialLoot: 40, shieldUntil: 0 }, revenge: false }],
    ['region', {}],
    ['relic', { relic: catalog.relics[0], count: 2, firstAt: Date.now(), rarity }],
    ['help', {}],
  ];
  for (const [type, payload] of modals) {
    render(Modals, { game: { ...game, modal: { type, payload } }, catalog }, `النافذة: ${type}`);
  }

  render(Tutorial, { onFinish: noop, onSkip: noop, setTab: noop }, 'الجولة التعليمية', ['الخطوة 1 من', 'تخطٍ', 'أهلاً بك في منجمك']);
  if (Array.isArray(TUTORIAL_STEPS) && TUTORIAL_STEPS.length >= 8) ok(`الجولة: ${TUTORIAL_STEPS.length} خطوات`);
  else bad('عدد خطوات الجولة غير كافٍ');

  // هندسة البطاقة والبقعة: لا تخرجان عن الشاشة مهما كان موضع العنصر (سبب تعلّق الخطوة الأخيرة سابقاً)
  const { cardTopFor, spotStyleFor } = TutorialModule;
  const vh = 800;
  const farBelow = { top: 2400, left: 20, width: 320, height: 600 };
  const topFar = cardTopFor(farBelow);
  if (topFar >= 12 && topFar <= vh - 250 - 12 + 1) ok(`موضع البطاقة لعنصر بعيد: ${Math.round(topFar)}px (داخل الشاشة)`);
  else bad(`موضع البطاقة خارج الشاشة: ${topFar}`);
  const spotFar = spotStyleFor(farBelow);
  if (spotFar.height >= 24 && spotFar.height <= vh) ok('بقعة الضوء مقيّدة بارتفاع الشاشة');
  else bad('بقعة الضوء غير مقيّدة');
  const nearTop = { top: 60, left: 10, width: 200, height: 80 };
  if (cardTopFor(nearTop) > nearTop.top + nearTop.height) ok('البطاقة تُعرض أسفل العنصر عند وجود متسع');
  else bad('تموضع البطاقة أسفل العنصر غير صحيح');

  // حالة بوابة الحماية: نصوص أساسية موجودة في الترجمة
  if (!catalog || catalog.regions.length !== 8) bad('الكاتالوج يصل من السيرفر');
  else ok(`الكاتالوج: ${catalog.regions.length} مناطق، ${catalog.relics.length} آثار`);
  if (!upgrade.ok && upgrade.code !== 'insufficient_coins') bad('الترقية تعمل أو تُرفض بوضوح');
  else ok('استجابة الترقية سليمة');
  if (!mine.ok || typeof mine.result.coins !== 'number') bad('التعدين يعيد نتيجة رقمية');
  else ok(`التعدين: +${mine.result.coins} عملة`);
  if (!daily.ok) bad('الحفرة اليومية');
  else ok(`الحفرة اليومية: ${daily.result.label}`);

  // اختيار عنوان الـ API حسب بيئة التشغيل (المشكلة التي منعت الفتح داخل تيليجرام)
  const checkApiBase = async (label, location, expected) => {
    globalThis.window = { location };
    try {
      const mod = await load(`/src/api.js?case=${encodeURIComponent(label)}`);
      if (mod.api.base === expected) ok(`عنوان API (${label}) = ${expected}`);
      else bad(`عنوان API (${label}): ${mod.api.base} بدل ${expected}`);
    } catch (err) {
      bad(`عنوان API (${label})`, err);
    }
  };
  await checkApiBase('تطوير Vite', { protocol: 'http:', hostname: 'localhost', port: '5173', origin: 'http://localhost:5173' }, 'http://localhost:3001');
  await checkApiBase('نفق/إنتاج', { protocol: 'https:', hostname: 'x.trycloudflare.com', port: '', origin: 'https://x.trycloudflare.com' }, 'https://x.trycloudflare.com');
} finally {
  await vite.close();
  await new Promise((resolve) => server.close(resolve));
  await store.idle();
}

if (failures.length) {
  console.error(`\n💥 فشل اختبار العرض (${failures.length}):`, failures.join(' | '));
  process.exit(1);
}
console.log('\n🏁 اختبار عرض الواجهة ناجح بالكامل');
