// ============================================================================
// اختبارات مستودع D1 — بمحاكي بسيط لـ D1 (بلا شبكة) يتحقق من:
// الحفظ/القراءة، الحفظ الذرّي مع إعادة المحاولة عند التعارض، persist=false،
// والاستبدال الإداري.
// ============================================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import { createD1Store } from '../../cloudflare/store.d1.js';
import { FakeD1 } from './helpers/fakeD1.js';

const player = (id, coins) => ({ playerId: id, name: id, coins });

test('D1: يحفظ أول تعديل ثم يستعيده (INSERT ثم SELECT)', async () => {
  const store = createD1Store(new FakeD1());
  await store.mutate((doc) => {
    doc.players.a = player('a', 10);
  });
  const doc = await store.snapshot();
  assert.equal(doc.players.a.coins, 10);
  assert.equal(await store.get('a').then((p) => p.coins), 10);
  assert.equal(await store.get('missing'), null);
});

test('D1: التعديلات المتتابعة تتراكم ويزيد rev', async () => {
  const db = new FakeD1();
  const store = createD1Store(db);
  await store.mutate((doc) => { doc.players.a = player('a', 10); });
  await store.mutate((doc) => { doc.players.a.coins += 5; });
  const doc = await store.snapshot();
  assert.equal(doc.players.a.coins, 15);
  assert.equal(db.row.rev, 2);
});

test('D1: عند تعارض الكتابة يُعيد المحاولة بلا فقدان تحديث', async () => {
  const db = new FakeD1();
  const store = createD1Store(db);
  await store.mutate((doc) => { doc.players.a = player('a', 10); });
  db.conflicts = 2; // أول محاولتين تفشلان (كأن نسخة أخرى كتبت)
  await store.mutate((doc) => { doc.players.a.coins += 7; });
  const doc = await store.snapshot();
  assert.equal(doc.players.a.coins, 17);
  assert.equal(db.row.rev, 2);
});

test('D1: persist=false لا يكتب على القاعدة', async () => {
  const db = new FakeD1();
  const store = createD1Store(db);
  await store.mutate((doc) => { doc.players.a = player('a', 10); });
  const before = db.row.rev;
  await store.mutate((doc) => { doc.players.a.coins = 999; }, { persist: false });
  assert.equal(db.row.rev, before);
  assert.equal((await store.snapshot()).players.a.coins, 10);
});

test('D1: الاستبدال الإداري يستبدل الحالة كاملة', async () => {
  const store = createD1Store(new FakeD1());
  await store.mutate((doc) => { doc.players.old = player('old', 1); });
  await store.replace({ players: { b: player('b', 42) }, meta: { group: { contributed: 5 } } });
  const doc = await store.snapshot();
  assert.equal(doc.players.old, undefined);
  assert.equal(doc.players.b.coins, 42);
  assert.equal(doc.meta.group.contributed, 5);
});
