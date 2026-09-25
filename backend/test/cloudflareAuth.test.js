// ============================================================================
// اختبارات مصادقة Workers (Web Crypto) + توافقها مع مصادقة سيرفر Node.
// تضمن أن كل قواعد الأمان نفسها على المنصّتين، وأن توكنات Node تُقبل على Workers.
// ============================================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { verifyInitData, issueSessionToken, verifySessionToken } from '../../cloudflare/auth.js';
import { issueSessionToken as nodeIssue, verifySessionToken as nodeVerify } from '../src/auth.js';

const BOT_TOKEN = '123456789:AAtest-token-for-unit-tests-only-000000000';

function buildInitData({ authDate = Math.floor(Date.now() / 1000), user = { id: 42, first_name: 'عمار' } } = {}) {
  const params = new URLSearchParams();
  params.set('auth_date', String(authDate));
  params.set('query_id', 'AAExample');
  params.set('user', JSON.stringify(user));
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');
  const secret = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
  const hash = crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex');
  params.set('hash', hash);
  return params.toString();
}

test('Workers: يتحقق من initData صالح', async () => {
  const result = await verifyInitData(buildInitData(), BOT_TOKEN);
  assert.equal(result.ok, true);
  assert.equal(result.user.id, '42');
  assert.equal(result.user.firstName, 'عمار');
});

test('Workers: يرفض توقيع initData مُعدّلاً', async () => {
  const initData = buildInitData().replace('AAExample', 'AATampered');
  const result = await verifyInitData(initData, BOT_TOKEN);
  assert.equal(result.ok, false);
  assert.match(result.reason, /توقيع/);
});

test('Workers: يرفض initData منتهي الصلاحية', async () => {
  const old = Math.floor(Date.now() / 1000) - 7 * 24 * 3600;
  const result = await verifyInitData(buildInitData({ authDate: old }), BOT_TOKEN, { maxAgeSec: 3600 });
  assert.equal(result.ok, false);
  assert.match(result.reason, /صلاحية/);
});

test('Workers: توكن الجلسة يُصدَر ثم يُتحقق منه', async () => {
  const secret = 'test-secret';
  const token = await issueSessionToken(secret, { playerId: 'tg_1', mode: 'telegram', name: 'عمار' });
  const verified = await verifySessionToken(token, secret);
  assert.equal(verified.ok, true);
  assert.equal(verified.playerId, 'tg_1');
  assert.equal(verified.mode, 'telegram');
  assert.equal(verified.name, 'عمار');
});

test('توافق المنصّتين: توكن صادر من Node يُقبل على Workers', async () => {
  const secret = 'shared-secret';
  const token = nodeIssue(secret, { playerId: 'tg_9', mode: 'telegram', name: 'Ali' });
  const verified = await verifySessionToken(token, secret);
  assert.equal(verified.ok, true);
  assert.equal(verified.playerId, 'tg_9');
});

test('توافق المنصّتين: توكن صادر من Workers يُقبل على Node', async () => {
  const secret = 'shared-secret';
  const token = await issueSessionToken(secret, { playerId: 'tg_8', mode: 'telegram', name: 'Nora' });
  const verified = nodeVerify(token, secret);
  assert.equal(verified.ok, true);
  assert.equal(verified.playerId, 'tg_8');
});

test('Workers: يرفض توكن جلسة مُعدّلاً', async () => {
  const token = await issueSessionToken('secret-a', { playerId: 'tg_1' });
  const bad = `${token.split('.')[0]}.deadbeef`;
  const verified = await verifySessionToken(bad, 'secret-a');
  assert.equal(verified.ok, false);
});
