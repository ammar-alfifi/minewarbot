// اختبارات المصادقة: HMAC لـ initData وتوكنات الضيوف
import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { verifyInitData, issueGuestToken, verifyGuestToken, newGuestId } from '../src/auth.js';

const TOKEN = '123456:TEST-TOKEN-FOR-UNIT-TESTS';

function makeInitData({ token = TOKEN, authDate = Math.floor(Date.now() / 1000), user = { id: 42, first_name: 'أحمد', username: 'ahmed' }, extra = {} } = {}) {
  const params = new URLSearchParams({
    auth_date: String(authDate),
    query_id: 'AAA',
    user: JSON.stringify(user),
    ...extra,
  });
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');
  const secret = crypto.createHmac('sha256', 'WebAppData').update(token).digest();
  const hash = crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex');
  params.set('hash', hash);
  return params.toString();
}

test('initData سليم يُقبل ويُرجع المستخدم', () => {
  const result = verifyInitData(makeInitData(), TOKEN);
  assert.equal(result.ok, true);
  assert.equal(result.user.id, '42');
  assert.equal(result.user.firstName, 'أحمد');
});

test('initData قديم يُرفض (منع replay)', () => {
  const old = Math.floor(Date.now() / 1000) - 25 * 3600;
  const result = verifyInitData(makeInitData({ authDate: old }), TOKEN);
  assert.equal(result.ok, false);
  assert.match(result.reason, /صلاحية/);
});

test('initData معدّل أو بتوكن خاطئ يُرفض', () => {
  const good = makeInitData();
  const tampered = good.replace('AAA', 'BBB');
  assert.equal(verifyInitData(tampered, TOKEN).ok, false);
  assert.equal(verifyInitData(good, '123456:OTHER-TOKEN').ok, false);
});

test('توكن الضيف يوقّع ويُتحقق منه ولا يقبل التزوير', () => {
  const id = newGuestId();
  const token = issueGuestToken('secret', { playerId: id });
  const ok = verifyGuestToken(token, 'secret');
  assert.equal(ok.ok, true);
  assert.equal(ok.playerId, id);
  assert.equal(verifyGuestToken(token, 'other-secret').ok, false);
  const [payload] = token.split('.');
  const forged = `${payload}.AAAA`;
  assert.equal(verifyGuestToken(forged, 'secret').ok, false);
});

test('توكن ضيف منتهي الصلاحية يُرفض', () => {
  const token = issueGuestToken('secret', { playerId: 'guest_x', now: Date.now() - 40 * 24 * 3600 * 1000 });
  assert.equal(verifyGuestToken(token, 'secret').ok, false);
});
