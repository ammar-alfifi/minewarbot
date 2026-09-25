// ============================================================================
// اختبار تكاملي لمحوّل Cloudflare Worker: نداء fetch الحقيقي على محاكي D1 —
// جلسة عبر initData، توكن، تعدين، حالة، صحة، كاتالوج، حماية webhook والإدارة.
// ============================================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import worker from '../../cloudflare/worker.js';
import { FakeD1, fakeAssets } from './helpers/fakeD1.js';

const BOT_TOKEN = '123456789:AAtest-token-for-unit-tests-only-000000000';
const ORIGIN = 'https://minewarrbot.example.workers.dev';

function buildInitData(user = { id: 42, first_name: 'عمار' }, startParam = null) {
  const params = new URLSearchParams();
  params.set('auth_date', String(Math.floor(Date.now() / 1000)));
  params.set('query_id', 'AAExample');
  params.set('user', JSON.stringify(user));
  if (startParam) params.set('start_param', startParam);
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');
  const secret = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
  params.set('hash', crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex'));
  return params.toString();
}

function makeEnv(overrides = {}) {
  return {
    DB: new FakeD1(),
    ASSETS: fakeAssets,
    BOT_TOKEN,
    BOT_USERNAME: 'MineWarrBot',
    INIT_DATA_MAX_AGE_SEC: '86400',
    ...overrides,
  };
}

const ctx = { waitUntil(p) { return p; }, passThroughOnException() {} };

async function call(env, path, { method = 'GET', body, initData, token, headers = {} } = {}) {
  const h = { ...headers };
  if (body !== undefined) h['content-type'] = 'application/json';
  if (initData) h['x-init-data'] = initData;
  if (token) h.authorization = `Bearer ${token}`;
  const request = new Request(`${ORIGIN}${path}`, {
    method,
    headers: h,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const res = await worker.fetch(request, env, ctx);
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* غير JSON */ }
  return { status: res.status, json, text };
}

test('Worker: يدخل بجلسة تيليجرام ويعدّن ويقرأ الحالة (تكامل كامل)', async () => {
  const env = makeEnv();

  const session = await call(env, '/api/session', { method: 'POST', initData: buildInitData() });
  assert.equal(session.status, 200);
  assert.equal(session.json.ok, true);
  assert.equal(session.json.mode, 'telegram');
  assert.ok(session.json.token);
  assert.equal(session.json.player.playerId, 'tg_42');

  const state1 = await call(env, '/api/state', { token: session.json.token });
  assert.equal(state1.status, 200);
  const coinsBefore = state1.json.player.coins;

  const mine = await call(env, '/api/actions/mine', {
    method: 'POST',
    token: session.json.token,
    body: { taps: 3, requestId: 'req_test_0001' },
  });
  assert.equal(mine.status, 200);
  assert.equal(mine.json.ok, true);
  assert.ok(mine.json.player.coins > coinsBefore);

  const health = await call(env, '/api/health');
  assert.equal(health.status, 200);
  assert.equal(health.json.ok, true);
  assert.ok(health.json.players >= 1);

  const catalog = await call(env, '/api/catalog');
  assert.equal(catalog.json.ok, true);
  assert.ok(catalog.json.catalog);
});

test('Worker: يرفض الطلبات بلا مصادقة', async () => {
  const env = makeEnv();
  const res = await call(env, '/api/state');
  assert.equal(res.status, 401);
  assert.equal(res.json.code, 'no_auth');

  const session = await call(env, '/api/session', { method: 'POST' });
  assert.equal(session.status, 401);
  assert.equal(session.json.code, 'telegram_required');
});

test('Worker: إضافة الأصدقاء تعمل بمعرّف الدعوة من جسم الطلب (رابط ?startapp)', async () => {
  const env = makeEnv();
  await call(env, '/api/session', { method: 'POST', initData: buildInitData({ id: 101, first_name: 'الداعي' }) });

  const friend = await call(env, '/api/session', {
    method: 'POST',
    initData: buildInitData({ id: 102, first_name: 'الصديق' }),
    body: { startParam: 'ref_tg_101' },
  });
  assert.equal(friend.status, 200);
  assert.equal(friend.json.player.stats.friends, 1);

  const inviter = await call(env, '/api/session', {
    method: 'POST',
    initData: buildInitData({ id: 101, first_name: 'الداعي' }),
  });
  assert.equal(inviter.json.player.stats.friends, 1);
});

test('Worker: يحمي نقطة الـ webhook بالسر', async () => {
  const env = makeEnv({ WEBHOOK_SECRET: 'hook-secret' });
  const bad = await call(env, '/api/telegram/webhook', { method: 'POST', body: { update_id: 1 } });
  assert.equal(bad.status, 401);

  const good = await call(env, '/api/telegram/webhook', {
    method: 'POST',
    body: { update_id: 1 },
    headers: { 'x-telegram-bot-api-secret-token': 'hook-secret' },
  });
  assert.equal(good.status, 200);
  assert.equal(good.json.ok, true);
});

test('Worker: الاستيراد الإداري محميّ ويعمل عند صحة السر', async () => {
  const env = makeEnv({ ADMIN_SECRET: 'admin-secret' });
  const denied = await call(env, '/api/admin/import', { method: 'POST', body: { players: {} } });
  assert.equal(denied.status, 403);

  const imported = await call(env, '/api/admin/import', {
    method: 'POST',
    body: { players: { tg_7: { playerId: 'tg_7', name: 'سالم', coins: 123 } }, meta: {} },
    headers: { 'x-admin-secret': 'admin-secret' },
  });
  assert.equal(imported.status, 200);
  assert.equal(imported.json.players, 1);

  const doc = await env.DB.prepare('SELECT data FROM state WHERE id = 1').first();
  assert.match(doc.data, /سالم/);
});

test('Worker: يخدم الواجهة على المسارات غير الـ API', async () => {
  const env = makeEnv();
  const res = await worker.fetch(new Request(`${ORIGIN}/some/spa/route`), env, ctx);
  assert.equal(res.status, 200);
  assert.match(await res.text(), /Mine War/);
});

test('Worker: يعيد 503 بوضوح عند غياب ربط D1', async () => {
  const env = makeEnv({ DB: undefined });
  const res = await call(env, '/api/health');
  assert.equal(res.status, 503);
  assert.equal(res.json.code, 'no_db');
});
