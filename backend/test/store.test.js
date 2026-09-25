// اختبارات طبقة التخزين: JSON و SQLite بنفس الواجهة والسلوك
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createJsonStore } from '../src/store.js';
import { createSqliteStore } from '../src/store.sqlite.js';

const STORES = [
  { label: 'JSON', factory: createJsonStore, fileName: 'players.json' },
  { label: 'SQLite', factory: createSqliteStore, fileName: 'minewarr.db' },
];

function tempFile(name) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'minewarr-store-'));
  return { dir, file: path.join(dir, name) };
}

for (const { label, factory, fileName } of STORES) {
  test(`تخزين ${label}: يحفظ ويستعيد اللاعبين والبيانات العامة`, async () => {
    const { dir, file } = tempFile(fileName);
    const store = factory({ file });
    try {
      await store.mutate((doc) => {
        doc.players.p1 = { playerId: 'p1', name: 'أ', coins: 100 };
        doc.meta = { group: { weekId: 1, contributed: 50, byPlayer: { p1: 50 } } };
      });
      await store.idle();

      const second = factory({ file });
      assert.equal(second.read().players.p1.coins, 100, 'اللاعب محفوظ');
      assert.equal(second.read().meta.group.contributed, 50, 'البيانات العامة محفوظة');

      await second.mutate((doc) => { doc.players.p1.coins = 250; doc.players.p2 = { playerId: 'p2', coins: 1 }; });
      await second.mutate((doc) => { delete doc.players.p2; });
      await second.idle();
      second.close?.();

      const third = factory({ file });
      assert.equal(third.read().players.p1.coins, 250, 'التحديث محفوظ');
      assert.equal(third.read().players.p2, undefined, 'الحذف محفوظ');
      third.close?.();
    } finally {
      store.close?.();
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test(`تخزين ${label}: persist=false لا يكتب على القرص`, async () => {
    const { dir, file } = tempFile(fileName);
    const store = factory({ file });
    try {
      await store.mutate((doc) => { doc.players.p1 = { playerId: 'p1', coins: 10 }; });
      await store.mutate((doc) => { doc.players.p1.coins = 999; }, { persist: false });
      await store.idle();
      const reloaded = factory({ file });
      assert.equal(reloaded.read().players.p1.coins, 10, 'التغيير غير المحفوظ لا يظهر');
      reloaded.close?.();
    } finally {
      store.close?.();
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test(`تخزين ${label}: التعديلات المتزامنة تُنفَّذ بالتسلسل`, async () => {
    const { dir, file } = tempFile(fileName);
    const store = factory({ file });
    try {
      await store.mutate((doc) => { doc.meta = { counter: 0 }; });
      await Promise.all(Array.from({ length: 60 }, () => (
        store.mutate((doc) => { doc.meta.counter += 1; }, { persist: false })
      )));
      assert.equal(store.read().meta.counter, 60, 'لا سباقات على البيانات');
    } finally {
      store.close?.();
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
}

test('ترحيل تخزين JSON القديم إلى المخطط الجديد', async () => {
  const { dir, file } = tempFile('players.json');
  try {
    fs.writeFileSync(file, JSON.stringify({
      u1: { playerId: 'u1', name: 'عمار', gold: 530, gems: 3, pickaxe: 2, workers: 1, totalMined: 500, updatedAt: 1_700_000_000_000 },
    }));
    const store = createJsonStore({ file });
    const doc = store.read();
    assert.equal(doc.version, 2);
    assert.equal(doc.players.u1.gold, 530, 'البيانات القديمة محفوظة للترحيل لاحقاً');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
