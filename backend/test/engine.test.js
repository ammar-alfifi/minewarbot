// اختبارات محرك اللعبة — السيرفر هو المصدر الوحيد للحقيقة
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createJsonStore } from '../src/store.js';
import { createEngine, GameError } from '../src/game/engine.js';

const HOUR = 3600_000;

function setup({ rng = () => 0.999, seedFile = null } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'minewarr-'));
  const file = path.join(dir, 'players.json');
  if (seedFile) fs.writeFileSync(file, JSON.stringify(seedFile));
  const store = createJsonStore({ file });
  const clock = { t: 1_700_000_000_000 };
  const engine = createEngine({ store, rng, now: () => clock.t, botUsername: 'MineWarrBot' });
  return { engine, store, clock, file, dir };
}

const who = (playerId, name = 'منقّب') => ({ playerId, name, photoUrl: null, mode: 'telegram' });

async function giveCoins(store, playerId, coins) {
  await store.mutate((doc) => { doc.players[playerId].coins = coins; });
}

test('الجلسة تنشئ لاعباً بمنحة ترحيب ومكافأة أول زيارة', async () => {
  const { engine } = setup();
  const s = await engine.session(who('tg_1', 'أحمد'));
  assert.equal(s.isNew, true);
  assert.equal(s.mode, 'telegram');
  assert.ok(s.player.coins >= 150, `expected >=150 got ${s.player.coins}`);
  assert.equal(s.player.region.id, 'surface');
  const types = new Set(s.player.notices.map((n) => n.type));
  assert.ok(types.has('welcome') && types.has('visit'));

  const again = await engine.session(who('tg_1', 'أحمد'));
  assert.equal(again.isNew, false);
  assert.equal(again.player.coins, s.player.coins, 'لا تُمنح مكافأة الزيارة مرتين في نفس اليوم');
});

test('التعدين يُحتسب مرة واحدة لكل requestId ويحدّث الإحصاءات والهدف الجماعي', async () => {
  const { engine, store } = setup();
  await engine.session(who('tg_1'));
  const before = (await engine.getState('tg_1')).player;

  const r1 = await engine.mine('tg_1', 5, 'req_mine_01');
  assert.equal(r1.result.coins, 5 * before.power.manual);
  const after = r1.player;
  assert.equal(after.coins, before.coins + r1.result.coins);
  assert.equal(after.stats.totalMined, r1.result.coins);
  assert.equal(after.season.score >= r1.result.coins, true);
  assert.equal(after.group.myContribution, r1.result.coins);

  const r2 = await engine.mine('tg_1', 5, 'req_mine_01');
  assert.equal(r2.replayed, true);
  const state = await engine.getState('tg_1');
  assert.equal(state.player.coins, after.coins, 'إعادة الإرسال لا تضاعف المكافأة');
  const group = await store.mutate((doc) => doc.meta.group.contributed);
  assert.equal(group, r1.result.coins);
  const seasonMeta = await store.mutate((doc) => doc.meta.season.scores['tg_1']);
  assert.equal(seasonMeta, after.season.score, 'نقاط الموسم تُسجَّل للأرشفة الأسبوعية');
});

test('التعدين يرفض اللاعب غير المسجل', async () => {
  const { engine } = setup();
  await assert.rejects(engine.mine('ghost', 1, 'req_ghost1'), (e) => e instanceof GameError && e.status === 401);
});

test('الترقية تخصم التكلفة بدقة وترفض عند نقص العملات', async () => {
  const { engine, store } = setup();
  await engine.session(who('tg_1'));
  await giveCoins(store, 'tg_1', 1000);

  const r = await engine.upgrade('tg_1', 'pickaxe', 1, 'req_upg_01');
  assert.equal(r.result.cost, 50);
  assert.equal(r.player.coins, 950);
  assert.equal(r.player.equipment.pickaxe, 2);
  assert.equal(r.player.power.manual, 2);

  await assert.rejects(
    engine.upgrade('tg_1', 'pickaxe', 25, 'req_upg_02'),
    (e) => e instanceof GameError && e.status === 400 && e.code === 'insufficient_coins',
  );
  await assert.rejects(
    engine.upgrade('tg_1', 'nesquick', 1, 'req_upg_03'),
    (e) => e instanceof GameError && e.code === 'unknown_upgrade',
  );
});

test('شراء الحماسة بالجواهر فقط ويتراكم الوقت', async () => {
  const { engine, store } = setup();
  await engine.session(who('tg_1'));
  await store.mutate((doc) => { doc.players.tg_1.gems = 12; });
  const r1 = await engine.upgrade('tg_1', 'boost', 1, 'req_bost_01');
  assert.equal(r1.player.gems, 7);
  const r2 = await engine.upgrade('tg_1', 'boost', 1, 'req_bost_02');
  assert.equal(r2.player.gems, 2);
  assert.ok(r2.player.power.boostUntil > r1.player.power.boostUntil);
  assert.equal(r2.player.power.boostActive, true);
});

test('الغارة: سقف، درع، إعادة غارة، وثأر', async () => {
  const { engine, store, clock } = setup({ rng: () => 0.01 });
  await engine.session(who('tg_1', 'المهاجم'));
  await engine.session(who('tg_2', 'الضحية'));
  await giveCoins(store, 'tg_1', 1000);
  await giveCoins(store, 'tg_2', 10000);

  const raid = await engine.raid('tg_1', 'tg_2', 'req_raid_01');
  assert.equal(raid.result.success, true);
  assert.equal(raid.result.stolen, 100, 'السقف: 100 + 40*فهرس المنطقة');
  assert.equal(raid.player.coins, 1100);

  await assert.rejects(
    engine.raid('tg_1', 'tg_2', 'req_raid_02'),
    (e) => e instanceof GameError && e.status === 423 && e.code === 'shielded',
    'الضحية صارت محمية',
  );

  const logBefore = await engine.raidLog('tg_2');
  assert.equal(logBefore.incoming[0].canRevenge, true, 'الضحية تستطيع الثأر');
  assert.ok(logBefore.shieldUntil > clock.t);

  const revenge = await engine.raid('tg_2', 'tg_1', 'req_rev__01', { revenge: true });
  assert.equal(revenge.result.success, true);
  assert.equal(revenge.result.stolen, 68, 'الثأر يأخذ 125% من النسبة');
  const logAfter = await engine.raidLog('tg_2');
  assert.equal(logAfter.incoming[0].canRevenge, false);
  assert.equal(logAfter.outgoing[0].revenge, true);
});

test('حد الغارات اليومية يحمي الاقتصاد', async () => {
  const { engine, store, clock } = setup({ rng: () => 0.01 });
  await engine.session(who('tg_att'));
  await giveCoins(store, 'tg_att', 0);
  for (let i = 0; i < 6; i++) {
    const id = `tg_vic${i}`;
    await engine.session(who(id));
    await giveCoins(store, id, 5000);
  }
  await giveCoins(store, 'tg_att', 0);
  for (let i = 0; i < 5; i++) {
    clock.t += 11 * 60 * 1000; // تجاوز مهلة الغارة
    const r = await engine.raid('tg_att', `tg_vic${i}`, `req_daily${i}a`);
    assert.equal(r.result.success, true, `غارة ${i} يجب أن تنجح`);
  }
  clock.t += 11 * 60 * 1000;
  await assert.rejects(
    engine.raid('tg_att', 'tg_vic5', 'req_daily5a'),
    (e) => e instanceof GameError && e.code === 'daily_cap',
  );
});

test('الغارة لا تلمس الجواهر ولا تُجرد الضحية', async () => {
  const { engine, store } = setup({ rng: () => 0.01 });
  await engine.session(who('tg_1'));
  await engine.session(who('tg_2'));
  await giveCoins(store, 'tg_1', 0);
  await giveCoins(store, 'tg_2', 60);
  await store.mutate((doc) => { doc.players.tg_2.gems = 99; });
  // 60 عملة: السقف يسمح بـ 5% = 3 < الحد الأدنى 5 → لا غنيمة
  const r = await engine.raid('tg_1', 'tg_2', 'req_poor_01');
  assert.equal(r.result.success, false);
  const victim = await engine.getState('tg_2');
  assert.equal(victim.player.coins, 60);
  assert.equal(victim.player.gems, 99, 'الجواهر لا تُسرق أبداً');
});

test('الحفرة اليومية مرة واحدة كل 24 ساعة وتُعطي درعاً', async () => {
  const { engine, clock } = setup({ rng: () => 0.01 });
  await engine.session(who('tg_1'));
  const r = await engine.dailyDig('tg_1', 'req_daily1');
  assert.equal(r.result.type, 'coins_small');
  assert.ok(r.result.shieldMs >= 4 * 3600 * 1000);
  assert.ok(r.player.raid.shieldUntil > clock.t);

  await assert.rejects(engine.dailyDig('tg_1', 'req_daily2'), (e) => e.code === 'daily_cooldown');
  clock.t += 24 * 3600 * 1000 + 1000;
  const r2 = await engine.dailyDig('tg_1', 'req_daily3');
  assert.equal(r2.result.type, 'coins_small');
});

test('أرباح الغياب محسوبة من وقت السيرفر وبسقف المخزن', async () => {
  const { engine, store, clock } = setup();
  await engine.session(who('tg_1'));
  await store.mutate((doc) => {
    const p = doc.players.tg_1;
    p.workers = 2;
    p.lastTick = clock.t - 10 * HOUR; // غياب 10 ساعات والسقف 8
  });
  const state = await engine.getState('tg_1');
  assert.equal(state.idle.capped, true);
  assert.equal(state.idle.seconds, 8 * 3600);
  assert.equal(state.idle.coins, 2 * 8 * 3600, 'عاملان × 8 ساعات');
  // المخزن المستوى 2 يرفع السقف إلى 9 ساعات
  await store.mutate((doc) => {
    const p = doc.players.tg_1;
    p.facilities.storage = 2;
    p.lastTick = clock.t - 10 * HOUR;
  });
  const state2 = await engine.getState('tg_1');
  assert.equal(state2.idle.seconds, 9 * 3600);
});

test('استلام الإنجاز مرة واحدة وعلى أساس التقدم الحقيقي', async () => {
  const { engine, store } = setup();
  await engine.session(who('tg_1'));
  await assert.rejects(engine.claim('tg_1', 'milestone', 'mined_1k', 'req_clam_00'), (e) => e.code === 'not_ready');
  await store.mutate((doc) => { doc.players.tg_1.lifetime.totalMined = 1500; });
  const r = await engine.claim('tg_1', 'milestone', 'mined_1k', 'req_clam_01');
  assert.equal(r.result.reward.coins, 250);
  assert.equal(r.result.reward.gems, 1);
  await assert.rejects(engine.claim('tg_1', 'milestone', 'mined_1k', 'req_clam_02'), (e) => e.code === 'already_claimed');
});

test('فتح المناطق تلقائياً مع التقدم ويُختار الأحدث', async () => {
  const { engine, store } = setup();
  await engine.session(who('tg_1'));
  await store.mutate((doc) => { doc.players.tg_1.lifetime.totalMined = 9000; });
  const state = await engine.getState('tg_1');
  assert.deepEqual(state.player.regionsUnlocked, ['surface', 'coal', 'crystal']);
  assert.equal(state.player.region.id, 'crystal');
  await assert.rejects(engine.switchRegion('tg_1', 'abyss', 'req_rgn__01'), (e) => e.code === 'region_locked');
  const ok = await engine.switchRegion('tg_1', 'coal', 'req_rgn__02');
  assert.equal(ok.result.regionId, 'coal');
});

test('الألقاب: شراء مرة واحدة بالجواهر مع شروط، والتجهيز مجاني', async () => {
  const { engine, store } = setup();
  await engine.session(who('tg_1'));
  await store.mutate((doc) => { doc.players.tg_1.gems = 100; });
  const buy = await engine.setTitle('tg_1', 'gemkeeper', 'req_titl_01');
  assert.equal(buy.result.bought, true);
  assert.equal(buy.player.gems, 65);
  assert.equal(buy.player.title.id, 'gemkeeper');
  const equip = await engine.setTitle('tg_1', 'novice', 'req_titl_02');
  assert.equal(equip.result.bought, false);
  assert.equal(equip.result.cost, 0);
  await assert.rejects(engine.setTitle('tg_1', 'relic_hunter', 'req_titl_03'), (e) => e.code === 'title_locked');
});

test('الدعوة تربط الصداقة وتمنح مكافآت متبادلة', async () => {
  const { engine } = setup();
  await engine.session(who('tg_1', 'الداعي'));
  const before = (await engine.getState('tg_1')).player;
  const guest = await engine.session({ ...who('tg_new', 'الصديق'), playerId: 'tg_new' }, 'ref_tg_1');
  assert.equal(guest.isNew, true);
  const after = (await engine.getState('tg_1')).player;
  assert.equal(after.gems, before.gems + 3);
  assert.equal(after.stats.friends, 1);
  const friend = await engine.getState('tg_new');
  assert.equal(friend.player.stats.friends, 1);
});

test('لوحة الصدارة: ثروة ومجموعة وموسم ورفاق', async () => {
  const { engine, store } = setup();
  await engine.session(who('tg_a', 'أ'));
  await engine.session(who('tg_b', 'ب'));
  await engine.session(who('tg_c', 'ج'));
  await store.mutate((doc) => {
    doc.players.tg_a.coins = 100; doc.players.tg_a.gems = 1;
    doc.players.tg_b.coins = 50; doc.players.tg_b.gems = 2; // ثروة 550
    doc.players.tg_c.coins = 10;
    doc.players.tg_c.relics = { fossil_shell: { count: 2, firstAt: 0 } };
    doc.players.tg_c.season.score = 999;
    doc.players.tg_a.friends = ['tg_c'];
    doc.players.tg_c.friends = ['tg_a'];
  });
  const wealth = await engine.leaderboard('wealth', 'tg_a');
  assert.deepEqual(wealth.entries.map((e) => e.playerId).slice(0, 3), ['tg_b', 'tg_a', 'tg_c']);
  const collector = await engine.leaderboard('collection', 'tg_a');
  assert.equal(collector.entries[0].playerId, 'tg_c');
  const season = await engine.leaderboard('season', 'tg_a');
  assert.equal(season.entries[0].playerId, 'tg_c');
  const friends = await engine.leaderboard('friends', 'tg_a');
  assert.deepEqual(new Set(friends.entries.map((e) => e.playerId)), new Set(['tg_a', 'tg_c']));
  assert.equal(wealth.entries.find((e) => e.isMe).playerId, 'tg_a');
});

test('الصندوق الجماعي يُمنح تلقائياً للمساهمين عند بلوغ الهدف', async () => {
  const { engine, store } = setup();
  await engine.session(who('tg_1'));
  await engine.mine('tg_1', 25, 'req_grp_01');
  await store.mutate((doc) => {
    doc.meta.group.contributed = 300000;
    doc.meta.group.byPlayer.tg_1 = 300000;
    doc.players.tg_1.gems = 0;
  });
  const state = await engine.getState('tg_1');
  assert.equal(state.player.gems, 3);
  assert.ok(state.player.notices.some((n) => n.type === 'group_chest'));
  const state2 = await engine.getState('tg_1');
  assert.equal(state2.player.gems, 3, 'الصندوق مرة واحدة في الأسبوع');
});

test('الجولة التعليمية: تظهر مرة واحدة وتُسجَّل على السيرفر', async () => {
  const { engine } = setup();
  const s = await engine.session(who('tg_1'));
  assert.equal(s.player.tutorialDone, false, 'لاعب جديد يرى الجولة');
  const done = await engine.completeTutorial('tg_1', 'req_tour_01');
  assert.equal(done.player.tutorialDone, true);
  const again = await engine.getState('tg_1');
  assert.equal(again.player.tutorialDone, true, 'لا تظهر تلقائياً بعد الإكمال');
  const replay = await engine.completeTutorial('tg_1', 'req_tour_01');
  assert.equal(replay.replayed, true, 'إعادة الطلب لا تُنفَّذ مرتين');
});

test('مكافآت الهدف الجماعي تُطالب حسب المساهمة', async () => {
  const { engine, store, clock } = setup();
  await engine.session(who('tg_1'));
  await store.mutate((doc) => {
    doc.meta.group.byPlayer.tg_1 = 1500;
    doc.players.tg_1.gems = 0;
  });
  const notReady = await assert.rejects(engine.claim('tg_1', 'group', 'g2', 'req_grp_02'), (e) => e.code === 'not_ready');
  const ok = await engine.claim('tg_1', 'group', 'g1', 'req_grp_03');
  assert.equal(ok.result.reward.gems, 2);
  await assert.rejects(engine.claim('tg_1', 'group', 'g1', 'req_grp_04'), (e) => e.code === 'already_claimed');
  // أسبوع جديد = مكافآت جديدة
  clock.t += 7 * 24 * HOUR + 1000;
  await engine.getState('tg_1'); // يفعّل تدوير الأسبوع
  await store.mutate((doc) => { doc.meta.group.byPlayer.tg_1 = 2000; doc.meta.group.contributed = 5000; });
  const again = await engine.claim('tg_1', 'group', 'g1', 'req_grp_05');
  assert.equal(again.result.reward.gems, 2);
});

test('ترحيل بيانات النسخة القديمة (gold/pickaxe) دون فقدان التقدم', async () => {
  const legacy = {
    u1: { playerId: 'u1', name: 'عمار', gold: 530, gems: 3, pickaxe: 2, workers: 1, totalMined: 500, updatedAt: 1_700_000_000_000 },
  };
  const { engine } = setup({ seedFile: legacy });
  const s = await engine.session(who('u1', 'عمار'));
  assert.equal(s.isNew, false);
  // 530 القديمة + 50 منحة ترحيب + 100 أول زيارة
  assert.equal(s.player.coins, 680);
  assert.equal(s.player.gems, 3);
  assert.equal(s.player.equipment.pickaxe, 2);
  assert.equal(s.player.workers, 1);
  assert.equal(s.player.stats.totalMined, 500);
});

test('كشف الآثار يمنع التكرار خلال المهلة ويمنح جواهر للمكرر', async () => {
  // rng منخفض دائماً: كل ضربة اكتشاف، لكن المهلة تحمي الاقتصاد
  const { engine, store } = setup({ rng: () => 0.00001 });
  await engine.session(who('tg_1'));
  const first = await engine.mine('tg_1', 10, 'req_find_01');
  assert.ok(first.result.relic, 'أول اكتشاف أثر');
  assert.equal(first.result.relicIsNew, true);
  assert.ok(first.result.gems >= 1, 'جوهرة مع الاكتشاف');
  const second = await engine.mine('tg_1', 10, 'req_find_02');
  assert.equal(second.result.relic, null, 'المهلة تمنع اكتشافاً ثانياً فوراً');
  await store.mutate((doc) => { doc.players.tg_1.lastGemAt = 0; doc.players.tg_1.lastRelicAt = 0; });
  const third = await engine.mine('tg_1', 10, 'req_find_03');
  assert.ok(third.result.relic, 'بعد انتهاء المهلة يمكن اكتشاف نفس الأثر');
  assert.equal(third.result.relicIsNew, false, 'أثر مكرر');
  assert.ok(third.result.dupeGems >= 1);
});
