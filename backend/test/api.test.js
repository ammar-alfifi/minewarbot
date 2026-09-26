// اختبارات تكامل الـ API عبر HTTP
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createJsonStore } from '../src/store.js';
import { createEngine } from '../src/game/engine.js';
import { createApp } from '../src/app.js';

const BOT_TOKEN = '123456:API-TEST-TOKEN';

function makeInitData(user = { id: 777, first_name: 'سالم' }, authDate = Math.floor(Date.now() / 1000)) {
  const params = new URLSearchParams({ auth_date: String(authDate), user: JSON.stringify(user) });
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');
  const secret = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
  params.set('hash', crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex'));
  return params.toString();
}

let ctx;

before(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'minewarr-api-'));
  const store = createJsonStore({ file: path.join(dir, 'players.json') });
  const engine = createEngine({ store, now: () => Date.now(), rng: () => 0.999 });
  const config = {
    isProd: false,
    botToken: BOT_TOKEN,
    botUsername: 'MineWarrBot',
    frontendUrl: 'http://localhost:5173',
    allowedOrigins: ['http://localhost:5173'],
    sessionSecret: 'api-test-secret',
    initDataMaxAgeSec: 24 * 3600,
    allowGuest: true,
    serveFrontend: false,
    trustProxy: false,
  };
  const app = createApp({ engine, config });
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  ctx = {
    server,
    url: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
});

after(async () => {
  await ctx.close();
});

const post = (pathname, body, headers = {}) => fetch(`${ctx.url}${pathname}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', ...headers },
  body: JSON.stringify(body || {}),
});
const get = (pathname, headers = {}) => fetch(`${ctx.url}${pathname}`, { headers });

test('فحص الصحة يعمل دون مصادقة', async () => {
  const res = await get('/api/health');
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.ok, true);
  assert.ok(data.players >= 0);
  assert.ok(data.raids && typeof data.raids === 'object', 'مؤشرات الغارات متاحة للرصد');
  assert.equal(typeof data.raids.revenges, 'number');
  assert.equal(typeof data.raids.avgLoss, 'number');
});

test('جلسة الضيف تصدر توكن وتفتح الحالة', async () => {
  const res = await post('/api/session', {});
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.ok, true);
  assert.equal(data.mode, 'guest');
  assert.ok(data.token, 'توكن الضيف موجود');
  assert.ok(data.player.playerId.startsWith('guest_'));

  const state = await get('/api/state', { Authorization: `Bearer ${data.token}` });
  assert.equal(state.status, 200);
  const stateData = await state.json();
  assert.equal(stateData.ok, true);
  assert.ok(stateData.catalog.regions.length >= 8);
  ctx.guestToken = data.token;
});

test('الطلبات بدون مصادقة أو بتوكن مزوّر تُرفض', async () => {
  const noAuth = await get('/api/state');
  assert.equal(noAuth.status, 401);
  const bad = await get('/api/state', { Authorization: 'Bearer forged.token' });
  assert.equal(bad.status, 401);
});

test('التعدين عبر HTTP يستخدم قوة اللاعب ويعيد الحالة الرسمية', async () => {
  const res = await post('/api/actions/mine', { taps: 4, requestId: 'req_http_01' }, { Authorization: `Bearer ${ctx.guestToken}` });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.ok, true);
  assert.equal(data.result.coins, 4);
  assert.ok(data.player.coins >= data.result.coins);
  // إعادة نفس الطلب لا تضاعف الرصيد
  const again = await post('/api/actions/mine', { taps: 4, requestId: 'req_http_01' }, { Authorization: `Bearer ${ctx.guestToken}` });
  const againData = await again.json();
  assert.equal(againData.replayed, true);
  assert.equal(againData.player.coins, data.player.coins);
});

test('الترقية عند نقص العملات ترجع رسالة عربية واضحة', async () => {
  const res = await post('/api/actions/upgrade', { item: 'pickaxe', amount: 25, requestId: 'req_http_02' }, { Authorization: `Bearer ${ctx.guestToken}` });
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.equal(data.ok, false);
  assert.equal(data.code, 'insufficient_coins');
  assert.match(data.error, /تحتاج/);
});

test('مسارات الحفرة اليومية والألقاب تعمل عبر HTTP', async () => {
  const daily = await post('/api/actions/daily', { requestId: 'req_http_03' }, { Authorization: `Bearer ${ctx.guestToken}` });
  assert.equal(daily.status, 200);
  const title = await post('/api/actions/title', { titleId: 'novice', requestId: 'req_http_04' }, { Authorization: `Bearer ${ctx.guestToken}` });
  assert.equal(title.status, 200);
  const titleData = await title.json();
  assert.equal(titleData.player.title.id, 'novice');
});

test('لوحة الصدارة تعرض اللاعب وتحترم النطاقات', async () => {
  const res = await get('/api/leaderboard?scope=wealth&limit=10', { Authorization: `Bearer ${ctx.guestToken}` });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.ok, true);
  assert.equal(data.scope, 'wealth');
  assert.ok(data.entries.some((e) => e.isMe));
  const friends = await get('/api/leaderboard?scope=friends', { Authorization: `Bearer ${ctx.guestToken}` });
  const friendsData = await friends.json();
  assert.ok(friendsData.entries.length >= 1);
});

test('الدعوات تعيد رابطاً قابلاً للمشاركة', async () => {
  const res = await post('/api/invites', {}, { Authorization: `Bearer ${ctx.guestToken}` });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(data.botLink.includes('t.me/MineWarrBot'));
  assert.ok(data.code.startsWith('ref_'));
});

test('إضافة الأصدقاء تعمل عندما يصل معرّف الدعوة من رابط الواجهة لا من initData', async () => {
  const inviter = makeInitData({ id: 4242, first_name: 'الداعي' });
  const created = await post('/api/session', { initData: inviter });
  assert.equal(created.status, 200);

  // الصديق الجديد: initData بلا start_param، لكن الواجهة ترسل المعرّف في الجسم
  const friend = makeInitData({ id: 4243, first_name: 'الصديق' });
  const res = await post('/api/session', { initData: friend, startParam: 'ref_tg_4242' });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.player.playerId, 'tg_4243');
  assert.equal(data.player.stats.friends, 1, 'الرابط يربط الصداقة حتى دون start_param في initData');

  const state = await get('/api/state', { 'X-Init-Data': inviter });
  const stateData = await state.json();
  assert.equal(stateData.player.stats.friends, 1, 'الداعي يرى الصديق في رفاقه');
});

test('جلسة تيليجرام الموثقة تُشتق منها الهوية ولا يُقبل playerId من العميل', async () => {
  const initData = makeInitData({ id: 777, first_name: 'سالم' });
  const res = await post('/api/session', {
    initData,
    // محاولة انتحال هوية لاعب آخر — يجب تجاهلها كلياً
    playerId: 'tg_1',
    name: 'مهاجم',
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.mode, 'telegram');
  assert.equal(data.player.playerId, 'tg_777');
  assert.equal(data.player.name, 'سالم');

  const state = await get('/api/state', { 'X-Init-Data': initData });
  assert.equal(state.status, 200);
  const stateData = await state.json();
  assert.equal(stateData.player.playerId, 'tg_777');
});

test('initData قديم أو معدّل يُرفض عبر HTTP', async () => {
  const old = makeInitData({ id: 888, first_name: 'قديم' }, Math.floor(Date.now() / 1000) - 30 * 3600);
  const res = await post('/api/session', { initData: old });
  assert.equal(res.status, 401);

  const tampered = makeInitData({ id: 999, first_name: 'معدّل' }).replace('auth_date', 'auth_dat3');
  const res2 = await post('/api/session', { initData: tampered });
  assert.equal(res2.status, 401);
});

test('توكن الجلسة يبقى صالحاً حتى لو تقادم initData', async () => {
  const initData = makeInitData({ id: 555, first_name: 'نور' });
  const res = await post('/api/session', { initData });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(data.token, 'يُصدر توكن جلسة بعد التحقق من تيليجرام');

  // نستخدم التوكن وحده كما لو أن initData تقادم
  const state = await get('/api/state', { Authorization: `Bearer ${data.token}` });
  assert.equal(state.status, 200);
  const stateData = await state.json();
  assert.equal(stateData.player.playerId, 'tg_555');
  assert.equal(stateData.player.mode, 'telegram');

  const forged = await get('/api/state', { Authorization: 'Bearer eyJ4.zzz' });
  assert.equal(forged.status, 401);
});

test('حماية الجسم: JSON تالف يرجع 400 واضحاً', async () => {
  const res = await fetch(`${ctx.url}/api/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{not json',
  });
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.equal(data.code, 'bad_json');
});

test('الطلبات التي تغيّر الحالة تتطلب requestId صالحاً', async () => {
  const res = await post('/api/actions/mine', { taps: 1 }, { Authorization: `Bearer ${ctx.guestToken}` });
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.equal(data.code, 'bad_request_id');
});

test('تسجيل الخروج يُبطل التوكن السابق عبر HTTP', async () => {
  const created = await post('/api/session', {});
  const { token } = await created.json();
  const before = await get('/api/state', { Authorization: `Bearer ${token}` });
  assert.equal(before.status, 200);
  const out = await post('/api/actions/logout', {}, { Authorization: `Bearer ${token}` });
  assert.equal(out.status, 200);
  const after = await get('/api/state', { Authorization: `Bearer ${token}` });
  assert.equal(after.status, 401, 'التوكن أُبطل بعد تسجيل الخروج');
});
