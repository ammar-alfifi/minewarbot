// اختبارات محرك اللعبة — السيرفر هو المصدر الوحيد للحقيقة
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createJsonStore } from '../src/store.js';
import { createEngine, GameError } from '../src/game/engine.js';
import { REGIONS, REBIRTH, rebirthThreshold, manualRequirement, RUN_MINED_CAP, rebirthConditions } from '../src/game/rules.js';

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

// رفع مجموع التعدين فوق عتبة حماية المبتدئين حتى تصبح الغارات مسموحة
async function giveMined(store, playerId, mined = 20000) {
  await store.mutate((doc) => { doc.players[playerId].lifetime.totalMined = mined; });
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

test('التعدين اليدوي يرفع عدّاد الدورة اليدوي، والدخل الخامل لا يرفعه', async () => {
  const { engine, store, clock } = setup();
  await engine.session(who('tg_1'));
  await store.mutate((doc) => {
    const p = doc.players.tg_1;
    p.equipment.pickaxe = 20;
    p.workers = 20;
  });
  const before = (await engine.getState('tg_1')).player;
  assert.equal(before.rebirth.runManualMined, 0, 'يبدأ عدّاد التعدين اليدوي من الصفر');

  const m = await engine.mine('tg_1', 3, 'req_manual1');
  assert.equal(m.result.coins, 3 * before.power.manual);
  assert.equal(
    m.player.rebirth.runManualMined,
    before.rebirth.runManualMined + m.result.coins,
    'النقر اليدوي يرفع runManualMined بمقدار ما كُسب',
  );
  assert.equal(
    m.player.rebirth.runMined,
    before.rebirth.runMined + m.result.coins,
    'ويُحتسب كذلك في عدّاد الدورة العام',
  );

  // دخل العمّال الخامل يرفع عدّاد الدورة العام فقط، لا العدّاد اليدوي
  clock.t += HOUR;
  const after = (await engine.getState('tg_1')).player;
  assert.ok(after.rebirth.runMined > m.player.rebirth.runMined, 'الدخل الخامل يرفع عدّاد الدورة');
  assert.equal(after.rebirth.runManualMined, m.player.rebirth.runManualMined, 'الدخل الخامل لا يُحتسب تعديناً يدوياً');
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

test('الغارة: غنيمة نسبية، درع، إعادة غارة، وثأر', async () => {
  const { engine, store, clock } = setup({ rng: () => 0.01 });
  await engine.session(who('tg_1', 'المهاجم'));
  await engine.session(who('tg_2', 'الضحية'));
  await giveMined(store, 'tg_1');
  await giveMined(store, 'tg_2');
  await giveCoins(store, 'tg_1', 1000);
  await giveCoins(store, 'tg_2', 10000);

  const raid = await engine.raid('tg_1', 'tg_2', 'req_raid_01');
  assert.equal(raid.result.success, true);
  assert.equal(raid.result.stolen, 1200, '12% من مخزون الضحية (بحدّ سقفَي الإنتاج)');
  assert.equal(raid.player.coins, 2200);
  assert.equal((await engine.getState('tg_2')).player.coins, 8800, 'لم تُكسر أرضية المخزن المحمي');

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
  assert.equal(revenge.result.stolen, 330, 'الثأر يأخذ 125% من نسبة مخزون المهاجم');
  const logAfter = await engine.raidLog('tg_2');
  assert.equal(logAfter.incoming[0].canRevenge, false);
  assert.equal(logAfter.outgoing[0].revenge, true);
});

test('الغارة: الفشل يخسّر المهاجم ويعوّض الضحية', async () => {
  const { engine, store } = setup({ rng: () => 0.99 }); // فشل دائم
  await engine.session(who('tg_1'));
  await engine.session(who('tg_2'));
  await giveMined(store, 'tg_1');
  await giveMined(store, 'tg_2');
  await giveCoins(store, 'tg_1', 1000);
  await giveCoins(store, 'tg_2', 10000);

  const r = await engine.raid('tg_1', 'tg_2', 'req_fail_01');
  assert.equal(r.result.success, false);
  assert.ok(r.result.lost > 0, 'المهاجم خسر من مخزونه');
  assert.equal(r.player.coins, 1000 - r.result.lost);
  assert.equal(r.result.defenseReward, Math.floor(r.result.lost * 0.6), '٦٠٪ تعويض للضحية');
  const victim = await engine.getState('tg_2');
  assert.equal(victim.player.coins, 10000 + r.result.defenseReward, 'الضحية كسبت تعويض دفاع');
});

test('مؤشرات مراقبة الغارات: النجاح، الثأر، ومن لا يجد هدفاً', async () => {
  const { engine, store } = setup({ rng: () => 0.01 });
  await engine.session(who('tg_1', 'المهاجم'));
  await engine.session(who('tg_2', 'الضحية'));
  await giveMined(store, 'tg_1');
  await giveMined(store, 'tg_2');
  await giveCoins(store, 'tg_1', 1000);
  await giveCoins(store, 'tg_2', 10000);

  // لاعبان متكافئان ومؤهلان: كل واحد يجد هدفاً قريباً، ولا ثأر أو خسائر بعد.
  let s = await engine.stats();
  assert.equal(s.raids.eligible, 2);
  assert.equal(s.raids.targetless, 0, 'لاعبان متكافئان يجدان بعضهما');
  assert.equal(s.raids.targetlessShare, 0);
  assert.equal(s.raids.revenges, 0);
  assert.equal(s.raids.avgLoss, 0);

  await engine.raid('tg_1', 'tg_2', 'req_mon_01');
  await engine.raid('tg_2', 'tg_1', 'req_mon_02', { revenge: true });

  s = await engine.stats();
  assert.equal(s.raids.won, 2, 'غرّتان ناجحتان');
  assert.equal(s.raids.lost, 0);
  assert.equal(s.raids.raiders, 2, 'لاعبان دخلا الغارات');
  assert.equal(s.raids.revenges, 1, 'ثأر واحد مسجَّل في السجل');
  assert.equal(s.raids.winRate, 100);
});

test('مؤشر «من لا يجد هدفاً» يرصد اللاعب الوحيد، ومتوسط الخسارة يرصد الفشل', async () => {
  const { engine, store } = setup({ rng: () => 0.99 }); // فشل دائم
  await engine.session(who('tg_1'));
  await engine.session(who('tg_2'));
  await giveMined(store, 'tg_1');
  await giveMined(store, 'tg_2');
  await giveCoins(store, 'tg_1', 1000);
  await giveCoins(store, 'tg_2', 10000);

  const r = await engine.raid('tg_1', 'tg_2', 'req_mon_fail');
  assert.equal(r.result.success, false);
  const s = await engine.stats();
  assert.equal(s.raids.lost, 1);
  assert.equal(s.raids.avgLoss, r.result.lost, 'متوسط الخسارة يطابق خسارة الغارة الفاشلة');
  assert.equal(s.raids.winRate, 0);

  // لاعب مؤهل وحيد لا يجد هدفاً
  const lone = setup({ rng: () => 0.5 });
  await lone.engine.session(who('tg_solo'));
  await giveMined(lone.store, 'tg_solo');
  const solo = await lone.engine.stats();
  assert.equal(solo.raids.eligible, 1);
  assert.equal(solo.raids.targetless, 1, 'اللاعب الوحيد بلا هدف');
  assert.equal(solo.raids.targetlessShare, 100);
});

test('حماية المبتدئين: لا غارات تحت عتبة التعدين', async () => {
  const { engine, store } = setup({ rng: () => 0.01 });
  await engine.session(who('tg_new'));
  await engine.session(who('tg_old'));
  await giveMined(store, 'tg_old');
  await giveCoins(store, 'tg_new', 5000);
  await giveCoins(store, 'tg_old', 5000);

  await assert.rejects(
    engine.raid('tg_new', 'tg_old', 'req_prot_01'),
    (e) => e instanceof GameError && e.code === 'attacker_protected',
    'الجديد لا يهاجم',
  );
  await assert.rejects(
    engine.raid('tg_old', 'tg_new', 'req_prot_02'),
    (e) => e instanceof GameError && e.code === 'target_protected',
    'الجديد لا يُهاجَم',
  );
});

test('حد الغارات اليومية يحمي الاقتصاد', async () => {
  const { engine, store, clock } = setup({ rng: () => 0.01 });
  await engine.session(who('tg_att'));
  await giveMined(store, 'tg_att');
  await giveCoins(store, 'tg_att', 0);
  for (let i = 0; i < 9; i++) {
    const id = `tg_vic${i}`;
    await engine.session(who(id));
    await giveMined(store, id);
    await giveCoins(store, id, 5000);
  }
  for (let i = 0; i < 8; i++) {
    clock.t += 11 * 60 * 1000; // تجاوز مهلة الغارة
    const r = await engine.raid('tg_att', `tg_vic${i}`, `req_daily${i}a`);
    assert.equal(r.result.success, true, `غارة ${i} يجب أن تنجح`);
  }
  clock.t += 11 * 60 * 1000;
  await assert.rejects(
    engine.raid('tg_att', 'tg_vic8', 'req_daily8a'),
    (e) => e instanceof GameError && e.code === 'daily_cap',
    'سقف 8 محاولات يومياً',
  );
});

test('الغارة لا تلمس الجواهر ولا تُجرد الضحية', async () => {
  const { engine, store } = setup({ rng: () => 0.01 });
  await engine.session(who('tg_1'));
  await engine.session(who('tg_2'));
  await giveMined(store, 'tg_1');
  await giveMined(store, 'tg_2');
  await giveCoins(store, 'tg_1', 0);
  await giveCoins(store, 'tg_2', 1000);
  await store.mutate((doc) => { doc.players.tg_2.gems = 99; });
  const r = await engine.raid('tg_1', 'tg_2', 'req_poor_01');
  assert.equal(r.result.success, true);
  assert.equal(r.result.stolen, 120, '12% من 1000 (دون كسر المخزن المحمي)');
  const victim = await engine.getState('tg_2');
  assert.equal(victim.player.coins, 880, 'الضحية تحتفظ بـ70% على الأقل');
  assert.equal(victim.player.gems, 99, 'الجواهر لا تُسرق أبداً');
});

test('الحفرة اليومية مرة واحدة كل 24 ساعة وتُعطي درعاً', async () => {
  const { engine, clock } = setup({ rng: () => 0.01 });
  await engine.session(who('tg_1'));
  const r = await engine.dailyDig('tg_1', 'req_daily1');
  assert.equal(r.result.type, 'coins_small');
  assert.equal(r.result.shieldMs, 60 * 60 * 1000, 'درع يومي أقصر يُبقي الغارات ممكنة');
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
  // فتح المناطق يتبع تقدّم الدورة (runMined) لا المجموع مدى الحياة
  await store.mutate((doc) => { doc.players.tg_1.runMined = 9000; });
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

test('الدعوة تربط الصداقة حتى لو لعب الصديق من قبل (حساب قائم)', async () => {
  const { engine } = setup();
  // الصديق موجود مسبقاً (فتح اللعبة قبل أن يضغط رابط الدعوة)
  const friendBefore = (await engine.session(who('tg_old', 'الصديق القديم'))).player;
  assert.equal(friendBefore.stats.friends, 0);
  await engine.session(who('tg_1', 'الداعي'));
  const inviterBefore = (await engine.getState('tg_1')).player;

  const guest = await engine.session(who('tg_old', 'الصديق القديم'), 'ref_tg_1');
  assert.equal(guest.isNew, false, 'الصديق ليس جديداً — ومع ذلك يجب أن يُضاف');
  assert.equal(guest.player.stats.friends, 1, 'الرابط يربط الصداقة للحساب القائم');
  assert.equal(guest.player.gems, friendBefore.gems + 2, 'الصديق يكسب جواهر الترحيب مرة واحدة');

  const inviterAfter = (await engine.getState('tg_1')).player;
  assert.equal(inviterAfter.stats.friends, 1, 'الداعي يرى الصديق في رفاقه');
  assert.equal(inviterAfter.gems, inviterBefore.gems + 3, 'الداعي يكافأ عند أول ربط');
});

test('إعادة فتح رابط الدعوة لا تكرر الربط ولا المكافأة', async () => {
  const { engine } = setup();
  await engine.session(who('tg_1', 'الداعي'));
  await engine.session(who('tg_new', 'الصديق'), 'ref_tg_1');
  const inviterFirst = (await engine.getState('tg_1')).player;
  const friendFirst = (await engine.getState('tg_new')).player;

  await engine.session(who('tg_new', 'الصديق'), 'ref_tg_1');
  const inviterSecond = (await engine.getState('tg_1')).player;
  const friendSecond = (await engine.getState('tg_new')).player;

  assert.equal(inviterSecond.gems, inviterFirst.gems, 'لا مكافأة مكررة للداعي');
  assert.equal(friendSecond.gems, friendFirst.gems, 'لا مكافأة مكررة للصديق');
  assert.equal(friendSecond.stats.friends, 1, 'لا تكرار في قائمة الأصدقاء');
});

test('رابط الدعوة الذاتية لا يربط اللاعب بنفسه', async () => {
  const { engine } = setup();
  await engine.session(who('tg_1', 'الداعي'));
  const self = await engine.session(who('tg_1'), 'ref_tg_1');
  assert.equal(self.player.stats.friends, 0);
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

test('لاعب عائد بعد غياب الموسم يظهر بنقاطه فور أول كسب في الأسبوع الحالي', async () => {
  const { engine, store, clock } = setup();
  await engine.session(who('tg_1'));
  // نُبعد weekId الشخصي أسبوعين للخلف مع بقاء النقاط (حالة حساب خامل لم يشارك).
  await store.mutate((doc) => {
    const p = doc.players.tg_1;
    p.season = { weekId: Math.max(0, Math.floor(clock.t / (7 * 24 * 3600 * 1000)) - 2), score: 0 };
    p.gems = 0;
  });
  const before = await engine.getState('tg_1');
  assert.equal(before.player.season.weekId, Math.floor(clock.t / (7 * 24 * 3600 * 1000)), 'حالة اللاعب تعرض أسبوعه الحالي');
  assert.equal(before.player.season.endsAt, (before.player.season.weekId + 1) * 7 * 24 * 3600 * 1000, 'نهاية الموسم متسقة مع الأسبوع الحالي');

  const m = await engine.mine('tg_1', 5, 'req_season_return');
  assert.ok(m.player.season.score > 0, 'النقاط الجديدة تُحتسب في أسبوعه الحالي');
  const board = await engine.leaderboard('season', 'tg_1');
  const me = board.entries.find((e) => e.playerId === 'tg_1');
  assert.ok(me, 'اللاعب يظهر في ترتيب الموسم بعد أول كسب');
  assert.equal(me.score, m.player.season.score, 'النقاط المعروضة تطابق نقاط اللاعب');
});

test('بطاقة المتصدرين تعرض وسام البعث وعدد مرات البعث', async () => {
  const { engine, store } = setup();
  await engine.session(who('tg_1', 'باعث'));
  await store.mutate((doc) => { doc.players.tg_1.rebirthCount = 5; });
  const board = await engine.leaderboard('wealth', 'tg_1');
  const me = board.entries.find((e) => e.playerId === 'tg_1');
  assert.equal(me.rebirths, 5, 'عدد مرات البعث ظاهر اجتماعياً');
  assert.equal(me.badge.id, 'keeper', 'وسام البعث الصحيح حسب العدد');
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

test('حساب قديم بمخطط __v سابق يُطبَّع بالحقول الجديدة ولا ينهار', async () => {
  // حساب مخزّن بـ __v=2 (قبل إضافة Rebirth/الإرث/التجميل) — كان publicState ينهار عليه.
  const legacy = {
    tg_old: {
      __v: 2, playerId: 'tg_old', name: 'قديم', mode: 'telegram',
      coins: 5000, gems: 7, workers: 3, regionId: 'coal',
      equipment: { pickaxe: 5, lamp: 2, helmet: 1 },
      facilities: { cart: 2, smelter: 1, storage: 2 },
      lifetime: { totalMined: 20000, totalGems: 7, relicsFound: 0, raidsWon: 0, raidsLost: 0, raidsDefended: 0, bestStreak: 1, daysVisited: 1, seasonWins: 0, titles: ['novice'] },
      regionsUnlocked: ['surface', 'coal'],
      relics: {}, title: 'novice',
      dailyAt: 0, visitAt: 0, visitStreak: 0,
      milestonesClaimed: [], groupClaims: { weekId: 0, ids: [] }, groupChestWeek: -1,
      incoming: [], outgoing: [], raid: { lastAt: 0, attemptsToday: 0, day: 0, targets: {} },
      inviteGems: { day: 0, gems: 0 }, season: { weekId: 0, score: 0 }, notices: [], actionLog: [],
    },
  };
  const { engine } = setup({ seedFile: legacy });
  const s = await engine.session(who('tg_old', 'قديم'));
  assert.equal(s.isNew, false, 'لم يُعد إنشاء اللاعب');
  // الحقول الجديدة موجودة (تم التطبيع بلا فقدان التقدم)
  assert.ok(s.player.rebirth, 'بيانات البعث متاحة');
  assert.ok(Array.isArray(s.player.legacy.tracks), 'شجرة الإرث متاحة');
  assert.ok(Array.isArray(s.player.cosmetics.shop), 'متجر التجميل متاح');
  assert.ok(s.player.cosmetics.owned.length === 0, 'لا زينة مملوكة');
  assert.ok(s.player.region.specialty, 'تخصص المنطقة متاح');
  // التقدم القديم محفوظ
  assert.equal(s.player.coins >= 5000, true);
  assert.equal(s.player.gems, 7);
  assert.equal(s.player.workers, 3);
  assert.equal(s.player.stats.totalMined, 20000);
  // ونظل قادرين على التعدين بعده
  const m = await engine.mine('tg_old', 1, 'req_legacy_old1');
  assert.ok(m.result.coins > 0);
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

test('دخل العمّال لا يُهدر عند النداءات المتقاربة (أقل من ثانية) ولا تُهمل الكسور', async () => {
  const { engine, store, clock } = setup();
  await engine.session(who('tg_1'));
  await store.mutate((doc) => {
    const p = doc.players.tg_1;
    p.workers = 10;
    p.coins = 0;
    p.idleCarry = 0;
    p.lastTick = clock.t;
  });
  const rate = (await engine.getState('tg_1')).player.power.idlePerSec;
  assert.ok(rate > 0);
  let coins = 0;
  for (let i = 0; i < 8; i++) {
    clock.t += 250; // نقر/استطلاع سريع كل ربع ثانية
    coins = (await engine.getState('tg_1')).player.coins;
  }
  // مرّت ثانيتان كاملتان → يجب استلام كامل دخل العمّال بلا فقدان
  assert.equal(coins, rate * 2, 'لم يُهدر أي دخل عمال رغم النداءات السريعة');
});

test('إعادة استخدام requestId لعملية من نوع آخر لا تُقبل', async () => {
  const { engine, store } = setup();
  await engine.session(who('tg_1'));
  await giveCoins(store, 'tg_1', 1000);
  await engine.mine('tg_1', 1, 'req_shared_x');
  const up = await engine.upgrade('tg_1', 'pickaxe', 1, 'req_shared_x');
  assert.notEqual(up.replayed, true, 'الترقية تُنفَّذ ولا تُخلط بنتيجة التعدين');
  assert.equal(up.player.equipment.pickaxe, 2);
});

test('لوحة الصدارة لا تكشف آخر ظهور وتقرّب الغنيمة لأقرب 5', async () => {
  const { engine, store } = setup();
  await engine.session(who('tg_1'));
  await engine.session(who('tg_2'));
  await giveCoins(store, 'tg_2', 5000);
  const board = await engine.leaderboard('wealth', 'tg_1');
  for (const e of board.entries) {
    assert.equal(e.lastSeen, undefined, 'لا يُكشف lastSeen للخصوم');
    if (e.potentialLoot != null) assert.equal(e.potentialLoot % 5, 0, 'الغنيمة مقاربة لأقرب 5');
  }
});

test('تسجيل الخروج يُبطل توكن الجلسة عبر نسخة الجلسة', async () => {
  const { engine } = setup();
  const s = await engine.session(who('tg_1'));
  assert.equal(await engine.sessionValid('tg_1', s.sessionEpoch), true);
  const out = await engine.logout('tg_1');
  assert.equal(out.epoch, s.sessionEpoch + 1);
  assert.equal(await engine.sessionValid('tg_1', s.sessionEpoch), false, 'التوكن القديم أُبطل');
  assert.equal(await engine.sessionValid('tg_1', out.epoch), true);
});

test('دخل العمّال لا يرفع هدف الجماعة ولا نقاط الموسم (ضد تضخّم الخامل)', async () => {
  const { engine, store, clock } = setup();
  await engine.session(who('tg_1'));
  await store.mutate((doc) => {
    const p = doc.players.tg_1;
    p.workers = 2;
    p.lastTick = clock.t;
    p.lifetime.totalMined = 0;
    p.season.score = 0;
    doc.meta.group.contributed = 0;
    doc.meta.group.byPlayer = {};
  });
  clock.t += 10 * HOUR;
  await engine.getState('tg_1');
  const snap = await store.mutate((doc) => ({
    group: doc.meta.group.contributed,
    season: doc.players.tg_1.season.score,
    mined: doc.players.tg_1.lifetime.totalMined,
  }));
  assert.equal(snap.group, 0, 'الدخل السلبي لا يُحتسب لهدف الجماعة');
  assert.equal(snap.season, 0, 'الدخل السلبي لا يمنح نقاط موسم');
  assert.ok(snap.mined > 0, 'لكنه يرفع مجموع التعدين لفتح المناطق');
});

test('يُنظّف ضيوف المتصفح الفارغين المنقطعين (30+ يوماً) دون المساس بذوي التقدّم', async () => {
  const { engine, store, clock } = setup();
  const guest = { playerId: 'guest_stale', name: 'ضيف', photoUrl: null, mode: 'guest' };
  await engine.session(guest);
  const keeper = { playerId: 'guest_keeper', name: 'ضيف نشط', photoUrl: null, mode: 'guest' };
  await engine.session(keeper);
  await store.mutate((doc) => {
    const stale = doc.players.guest_stale;
    stale.coins = 0; stale.gems = 0; stale.workers = 0; stale.lifetime.totalMined = 0;
    stale.lastSeen = clock.t - 31 * 24 * HOUR;
    // الفارغ المنقطع فقط هو المرشّح
  });
  clock.t += 2 * HOUR; // لتجاوز حارس التنظيف الختامي الساعي
  await engine.leaderboard('wealth', null);
  assert.equal(await store.get('guest_stale'), null, 'الضيف الفارغ المنقطع يُنظّف');
  assert.ok(await store.get('guest_keeper'), 'الضيف صاحب الرصيد يبقى');
});

test('البعث يعيد تأسيس المنجم ويحوّل الإنجاز إلى نوى مع الحفاظ على السجل', async () => {
  const { engine, store } = setup();
  await engine.session(who('tg_1', 'باعث'));
  await store.mutate((doc) => {
    const p = doc.players.tg_1;
    p.equipment.pickaxe = 20;
    p.workers = 10;
    p.regionsUnlocked = REGIONS.map((r) => r.id);
    p.runMined = 50_000_000;
    p.runManualMined = 10_000_000;
    p.coins = 123456;
    p.gems = 40;
    p.relics = { fossil_shell: { count: 1, firstAt: 0 } };
    p.lifetime.totalMined = 60_000_000;
    p.lifetime.relicsFound = 1;
    p.season.score = 777;
  });
  const before = await engine.getState('tg_1');
  assert.equal(before.player.rebirth.eligible, true);
  assert.equal(before.player.rebirth.cores, 1);

  const res = await engine.rebirth('tg_1', 'req_rebrth1');
  assert.equal(res.result.cores, 1);
  assert.equal(res.result.rebirths, 1);
  assert.equal(res.player.coins, 0, 'يُصفّر رصيد الدورة');
  assert.equal(res.player.workers, 0);
  assert.equal(res.player.equipment.pickaxe, 1);
  assert.deepEqual(res.player.regionsUnlocked, ['surface']);
  assert.equal(res.player.rebirth.runMined, 0);
  assert.equal(res.player.rebirth.threshold, 150_000_000, 'العتبة التالية ×3');
  assert.equal(res.player.legacy.cores, 1, 'نواة واحدة عند 1× العتبة');
  // ما يبقى دائمًا
  assert.equal(res.player.gems, 40);
  assert.equal(res.player.relics.length, 1);
  assert.equal(res.player.stats.totalMined, 60_000_000);
  assert.equal(res.player.stats.rebirths, 1);
  assert.equal(res.player.season.score, 777);

  const replay = await engine.rebirth('tg_1', 'req_rebrth1');
  assert.equal(replay.replayed, true, 'لا يُنفَّذ البعث مرتين لنفس الطلب');
});

test('البعث يُرفض إذا نقص التعدين اليدوي (الدخل الخامل لا يكفي)', async () => {
  const { engine, store } = setup();
  await engine.session(who('tg_1'));
  await store.mutate((doc) => {
    const p = doc.players.tg_1;
    p.equipment.pickaxe = 20; p.workers = 10;
    p.regionsUnlocked = REGIONS.map((r) => r.id);
    p.runMined = 50_000_000; p.runManualMined = 0;
  });
  await assert.rejects(engine.rebirth('tg_1', 'req_rebrth2'), (e) => e.code === 'rebirth_not_ready');
});

test('حالة البعث تعرض عدد المناطق والعتبة القادمة من المصدر وتُحصّن شرط المناطق', async () => {
  const { engine, store } = setup();
  await engine.session(who('tg_1'));
  const clean = await engine.getState('tg_1');
  assert.equal(clean.player.rebirth.totalRegions, REGIONS.length, 'عدد المناطق من القواعد لا مثبّت في الواجهة');
  assert.equal(clean.player.rebirth.nextThreshold, REBIRTH.baseThreshold * REBIRTH.thresholdMult, 'العتبة القادمة مضاعفة القواعد');

  await store.mutate((doc) => {
    // ثمانية عناصر لكنها منطقة واحدة مكرّرة: لا يجوز أن يمرّ شرط «كل المناطق»
    doc.players.tg_1.regionsUnlocked = Array(REGIONS.length).fill('surface');
  });
  const st = await engine.getState('tg_1');
  assert.equal(st.player.rebirth.conditions.regions, false, 'التكرار لا يستوفي شرط كل المناطق');
  assert.equal(st.player.rebirth.cycleGoals.goals.find((g) => g.id === 'cyc_regions_8').progress, 1, 'تقدّم هدف المناطق يحسب الفريد فقط');
});

test('شرط التعدين اليدوي يتصاعد مع عتبة الدورة ويبقى نسبة ثابتة', async () => {
  // الدورة الأولى: الحد الأدنى المطلق (10M = 20% من 50M).
  assert.equal(manualRequirement(rebirthThreshold(0)), REBIRTH.manualThreshold);
  // الدورة الثانية: 20% من 150M = 30M، أكبر من الحد الأدنى.
  assert.equal(manualRequirement(rebirthThreshold(1)), 30_000_000);
  // الشرط يبقى دائماً 20% على الأقل من العتبة المتصاعدة.
  for (let c = 0; c < 8; c++) {
    const th = rebirthThreshold(c);
    const req = manualRequirement(th);
    assert.ok(req >= Math.floor(th * REBIRTH.manualShare), `نسبة الشرط اليدوي محفوظة في الدورة ${c + 1}`);
  }
  // الدخل الخامل لا يفي بشرط الدورة الثانية لو توقف العدّاد اليدوي.
  const idleOnly = { rebirthCount: 1, runMined: rebirthThreshold(1), runManualMined: REBIRTH.manualThreshold, equipment: { pickaxe: 20 }, workers: 10, regionsUnlocked: REGIONS.map((r) => r.id) };
  assert.equal(rebirthConditions(idleOnly).conditions.manual, false, 'الحد الأدنى المطلق وحده لا يكفي بعد الدورة الأولى');
});

test('عتبات البعث لا تتجاوز سقف العدّاد فتبقى الدورات قابلة للإنجاز', async () => {
  // العتبة تنمو ×3 والسقف 10^18: يجب أن تبقى دورة 11 (الحالية) ممكنة، وأن تسمح بأكثر من 15 دورة.
  assert.ok(rebirthThreshold(10) <= RUN_MINED_CAP, 'الدورة الحادية عشرة قابلة للإنجاز');
  assert.ok(rebirthThreshold(15) <= RUN_MINED_CAP, 'يوجد مجال لأكثر من 15 دورة');
  // مكافأة النوى الثلاث متاحة عند 4× العتبة في كل هذه الدورات.
  for (let c = 10; c < 15; c++) assert.ok(rebirthThreshold(c) * 4 <= RUN_MINED_CAP, `نوى 3× متاحة في دورة ${c + 1}`);
});

test('مكافآت النوى 1/2/3 عند 1×/2×/4× العتبة', async () => {
  const { engine } = setup();
  await engine.session(who('tg_1'));
  const th = rebirthThreshold(0);
  const st1 = rebirthConditions({ rebirthCount: 0, runMined: th, runManualMined: manualRequirement(th), equipment: { pickaxe: 20 }, workers: 10 });
  assert.equal(st1.cores, 1);
  const st2 = rebirthConditions({ rebirthCount: 0, runMined: th * 2, runManualMined: manualRequirement(th), equipment: { pickaxe: 20 }, workers: 10 });
  assert.equal(st2.cores, 2);
  const st3 = rebirthConditions({ rebirthCount: 0, runMined: th * 4, runManualMined: manualRequirement(th), equipment: { pickaxe: 20 }, workers: 10 });
  assert.equal(st3.cores, 3);
});

test('شجرة نوى الإرث: شراء بالأنوية بحدود المستويات', async () => {
  const { engine, store } = setup();
  await engine.session(who('tg_1'));
  await store.mutate((doc) => { doc.players.tg_1.legacyCores = 2; });
  const up = await engine.legacyUpgrade('tg_1', 'vein_memory', 'req_legcy1');
  assert.equal(up.result.rank, 1);
  assert.equal(up.player.legacy.cores, 1);
  assert.equal(up.player.legacy.tracks.find((t) => t.id === 'vein_memory').rank, 1);
  await engine.legacyUpgrade('tg_1', 'vein_memory', 'req_legcy2');
  await assert.rejects(engine.legacyUpgrade('tg_1', 'vein_memory', 'req_legcy3'), (e) => e.code === 'insufficient_cores');
  await assert.rejects(engine.legacyUpgrade('tg_1', 'nope', 'req_legcy4'), (e) => e.code === 'unknown_legacy_track');
});

test('أهداف الدورة: استلام مرة واحدة لكل دورة وإعادة تصفيرها مع البعث', async () => {
  const { engine, store } = setup();
  await engine.session(who('tg_1'));
  await store.mutate((doc) => {
    const p = doc.players.tg_1;
    p.runManualMined = 300000;
    p.runRelics = 3;
  });
  const state = await engine.getState('tg_1');
  const goal = state.player.rebirth.cycleGoals.goals.find((g) => g.id === 'cyc_manual_250k');
  assert.equal(goal.claimable, true, 'الهدف متاح بعد بلوغ الشرط');

  const beforeCoins = state.player.coins;
  const claim = await engine.claimCycleGoal('tg_1', 'cyc_manual_250k', 'req_cycle01');
  assert.ok(claim.result.reward.coins > 0);
  assert.equal(claim.player.coins, beforeCoins + claim.result.reward.coins);
  // المكافأة لا تحتسب تعدين دورة (كي لا تُسرّع شروط البعث)
  assert.equal(claim.player.rebirth.runMined, 0, 'مكافأة الهدف لا تدخل عدّاد الدورة');

  await assert.rejects(engine.claimCycleGoal('tg_1', 'cyc_manual_250k', 'req_cycle02'), (e) => e.code === 'already_claimed');
  await assert.rejects(engine.claimCycleGoal('tg_1', 'nope', 'req_cycle03'), (e) => e.code === 'unknown_cycle_goal');
  await assert.rejects(engine.claimCycleGoal('tg_1', 'cyc_regions_8', 'req_cycle04'), (e) => e.code === 'not_ready');

  // البعث يُصفّر أهداف الدورة (والعدّاد) ليعيدها قابلة للمطالبة في الدورة التالية
  await store.mutate((doc) => {
    const p = doc.players.tg_1;
    p.equipment.pickaxe = 20; p.workers = 10;
    p.regionsUnlocked = REGIONS.map((r) => r.id);
    p.runMined = 50_000_000; p.runManualMined = 10_000_000;
  });
  const reb = await engine.rebirth('tg_1', 'req_rebrn99');
  assert.equal(reb.player.rebirth.runRelics, 0, 'عدّاد آثار الدورة يُصفَّر');
  const reset = reb.player.rebirth.cycleGoals.goals.find((g) => g.id === 'cyc_manual_250k');
  assert.equal(reset.claimed, false, 'أهداف الدورة تُصفَّر مع البعث');
  assert.equal(reb.player.rebirth.badge.rebirths, 1, 'وسام البعث يظهر عند أول دورة');
});

test('متجر التجميل: شراء بالجواهر وتجهيز بلا تكرار', async () => {
  const { engine, store } = setup();
  await engine.session(who('tg_1'));
  await store.mutate((doc) => { doc.players.tg_1.gems = 100; });
  const buy = await engine.buyCosmetic('tg_1', 'frame_bronze', 'req_cosm01');
  assert.equal(buy.result.bought, true);
  assert.equal(buy.player.gems, 85);
  assert.equal(buy.player.cosmetics.equipped.frame, 'frame_bronze');
  const again = await engine.buyCosmetic('tg_1', 'frame_bronze', 'req_cosm02');
  assert.equal(again.result.bought, false, 'ملكه سابقاً فلا يُخصم مرة أخرى');
  assert.equal(again.player.gems, 85);
  await assert.rejects(engine.buyCosmetic('tg_1', 'camp_aurora', 'req_cosm03'), (e) => e.code === 'insufficient_gems');
});

test('تكرار مكافأة اليوم السابع يمنح عملات لا جواهر', async () => {
  const { engine, store, clock } = setup();
  await engine.session(who('tg_1'));
  await store.mutate((doc) => {
    const p = doc.players.tg_1;
    p.visitStreak = 7; p.visitGemsAt = clock.t; p.visitAt = clock.t - 25 * HOUR; p.gems = 0;
  });
  const s = await engine.getState('tg_1');
  assert.equal(s.visitReward.repeat, true);
  assert.equal(s.visitReward.gems, 0);
  assert.ok(s.visitReward.coins > 0, 'مكافأة عملات بديلة');
  assert.equal(s.player.gems, 0);
});

test('الصندوق الجماعي يشترط مساهمين كافيين عند تعدد اللاعبين', async () => {
  const { engine, store } = setup();
  await engine.session(who('tg_1'));
  await engine.session(who('tg_2'));
  await engine.session(who('tg_3'));
  // ثلاثة مساهمين لكن اثنان فقط بلغا الحد الأدنى (5,000)
  await store.mutate((doc) => {
    doc.meta.group.contributed = 300000;
    doc.meta.group.byPlayer = { tg_1: 290000, tg_2: 5000, tg_3: 100 };
    doc.players.tg_1.gems = 0;
  });
  const blocked = await engine.getState('tg_1');
  assert.equal(blocked.player.group.chest.eligible, false);
  assert.equal(blocked.player.gems, 0, 'لا صندوق بلا مساهمين كافيين');
  // رفع الثالث للحد الأدنى يكتمل الشرط
  await store.mutate((doc) => { doc.meta.group.byPlayer.tg_3 = 5000; });
  const ok = await engine.getState('tg_1');
  assert.equal(ok.player.group.chest.eligible, true);
  assert.equal(ok.player.gems, 3);
});
