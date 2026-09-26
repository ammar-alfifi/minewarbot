// اختبارات قواعد اللعبة (معادلات، أسعار، غارات، ندرة)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  upgradeCost, workerCost, workerBatchCost, powerOf, collectionScore,
  stealAmount, raidSuccessChance, productionPerSec, raidFailureLoss,
  pickRelic, rollRarity, visitStreakAfter, visitDayReward,
  unlockedRegions, offlineCapHours, REGIONS, RELICS, RARITIES, RAID,
  rebirthThreshold, rebirthCores, rebirthConditions, legacyBonus, groupChestStatus,
  seasonRewardFor, regionOutputBonus, legacyRanks, SEASON_REWARDS, GROUP_GOAL, REBIRTH,
} from '../src/game/rules.js';

const basePlayer = (over = {}) => ({
  playerId: 'p1',
  coins: 1000, gems: 5, workers: 2, regionId: 'surface',
  equipment: { pickaxe: 3, lamp: 1, helmet: 1 },
  facilities: { cart: 1, smelter: 1, storage: 1 },
  relics: {}, boostUntil: 0,
  ...over,
});

test('أسعار الترقيات تتصاعد ولا تنكسر', () => {
  assert.equal(upgradeCost('pickaxe', 1), 50);
  assert.equal(upgradeCost('pickaxe', 2), 100);
  assert.ok(upgradeCost('pickaxe', 5) > upgradeCost('pickaxe', 4));
  assert.equal(workerCost(0), 100);
  assert.ok(workerBatchCost(0, 3) === workerCost(0) + workerCost(1) + workerCost(2));
  assert.ok(upgradeCost('storage', 4) > upgradeCost('storage', 1));
});

test('قوة التعدين والإنتاج تتبع المعادلات المعلنة', () => {
  const p = basePlayer();
  const power = powerOf(p, 0);
  // قوة يدوية = معول(3) × مسبك(1) × منطقة(1) — وحدث الأسبوع قد يعدّلها
  assert.equal(power.manualBase, 3);
  assert.equal(power.manual, 3 * (power.event.manualMult || 1));
  // إنتاج العامل = (1 + 0.25*(3-1)) = 1.5 لكل عامل، وعاملان = 3/ث × حدث الأسبوع
  assert.equal(power.workerEach, 1.5);
  assert.equal(power.idlePerSec, 3 * (power.event.idleMult || 1));
});

test('سقف الغياب ينمو مع المخزن ويبقى معقولاً', () => {
  const p = basePlayer();
  assert.equal(offlineCapHours(p), 8);
  p.facilities.storage = 4;
  assert.equal(offlineCapHours(p), 11);
});

test('المناطق تُفتح حسب مجموع التعدين', () => {
  assert.deepEqual(unlockedRegions(0), ['surface']);
  assert.deepEqual(unlockedRegions(1500), ['surface', 'coal']);
  assert.equal(unlockedRegions(4_000_000).length, REGIONS.length);
});

test('الغارة: غنيمة نسبية من المخزون مع مخزن محمي', () => {
  const attacker = basePlayer({ playerId: 'a', regionId: 'coal' });
  const target = basePlayer({ playerId: 'b', coins: 10_000 });
  // 12% من 10000 = 1200 (أقل من سقفَي الإنتاج ومن المخزون القابل للسرقة)
  assert.equal(stealAmount(attacker, target, false, 0), 1200);
  // من 1000: 12% = 120، والضحية تحتفظ بالمخزن المحمي (30%) وبأكثر
  const mid = basePlayer({ playerId: 'm', coins: 1000 });
  assert.equal(stealAmount(attacker, mid, false, 0), 120);
  // الثأر يضاعف النسبة ×1.25
  assert.equal(stealAmount(attacker, mid, true, 0), 150);
  // الفقير: 12% من 60 = 7 فقط
  const poor = basePlayer({ playerId: 'c', coins: 60 });
  assert.equal(stealAmount(attacker, poor, false, 0), 7);
});

test('مقياس الإنتاج ومخاطرة الفشل محسوبان في القواعد', () => {
  const p = basePlayer();
  assert.ok(productionPerSec(p, 0) >= 8, 'الإنتاج لا يقل عن سقف التعدين اليدوي (8/ث)');
  const rich = basePlayer({ coins: 100_000 });
  const loss = raidFailureLoss(rich, 0);
  assert.ok(loss > 0);
  assert.ok(loss <= Math.floor(100_000 * RAID.failureLossPct), 'الخسارة ضمن 10% من المخزون');
});

test('فرصة الغارة محدودة بين 25% و80%', () => {
  const weak = basePlayer({ playerId: 'w', equipment: { pickaxe: 1, lamp: 1, helmet: 1 } });
  const strong = basePlayer({ playerId: 's', equipment: { pickaxe: 50, lamp: 1, helmet: 1 }, regionId: 'abyss' });
  assert.ok(raidSuccessChance(weak, strong, false, 0) <= RAID.minSuccess + 0.29);
  const veryWeak = raidSuccessChance(weak, strong, false, 0);
  const veryStrong = raidSuccessChance(strong, weak, false, 0);
  assert.ok(veryWeak >= RAID.minSuccess);
  assert.ok(veryStrong <= RAID.maxSuccess);
  assert.ok(veryStrong > veryWeak);
  assert.ok(raidSuccessChance(weak, strong, true, 0) > veryWeak);
});

test('اختيار الآثار يحترم مجموعة المنطقة والتراجع عند غياب الندرة', () => {
  for (let i = 0; i < 200; i++) {
    const id = pickRelic('iron', () => i / 200);
    assert.ok(REGIONS.find((r) => r.id === 'iron').relics.includes(id), `${id} ليس من منجم الحديد`);
  }
  // لا يوجد أسطوري في منجم الحديد: يجب أن يعود بندرة متاحة
  const ironLegendary = REGIONS.find((r) => r.id === 'iron').relics.some((id) => RELICS[id].rarity === 'legendary');
  assert.equal(ironLegendary, false);
});

test('أوزان الندرة مجموعها 100 والنسب تصاعدية', () => {
  const total = Object.values(RARITIES).reduce((s, r) => s + r.weight, 0);
  assert.equal(total, 100);
  assert.ok(RARITIES.common.weight > RARITIES.rare.weight);
  assert.ok(RARITIES.legendary.value > RARITIES.epic.value);
});

test('مكافأة المجموعة تزيد بعدد الآثار الفريدة', () => {
  const empty = basePlayer();
  const withRelics = basePlayer({ relics: { fossil_shell: { count: 1, firstAt: 0 }, gold_bar: { count: 3, firstAt: 0 } } });
  assert.equal(collectionScore(empty), 0);
  assert.ok(collectionScore(withRelics) > 0);
});

test('سلسلة الزيارة ودّية: تتجدد بعد 48 ساعة وتحافظ على الأفضل', () => {
  const H = 3600_000;
  assert.equal(visitStreakAfter(0, 0, 1000), 1);
  assert.equal(visitStreakAfter(1000, 3, 1000 + 24 * H), 4);
  assert.equal(visitStreakAfter(1000, 7, 1000 + 24 * H), 7);
  assert.equal(visitStreakAfter(1000, 5, 1000 + 49 * H), 1);
});

test('مكافأة اليوم السابع: جواهر مرة كل أسبوع، وعملات في بقية الزيارات', () => {
  const W = 7 * 24 * 3600_000;
  const now = 10 * W;
  // أول يوم سابع: جواهر أصلية
  const first = visitDayReward(7, 0, now);
  assert.equal(first.repeat, false);
  assert.equal(first.reward.gems, 5);
  // زيارة قريبة بعدها: لا جواهر بل عملات
  const repeated = visitDayReward(7, now - 3600_000, now);
  assert.equal(repeated.repeat, true);
  assert.equal(repeated.reward.gems, 0);
  assert.ok(repeated.reward.coins > 0);
  // بعد مرور 7 أيام تعود الجواهر
  const weekly = visitDayReward(7, now - W - 1000, now);
  assert.equal(weekly.repeat, false);
  assert.equal(weekly.reward.gems, 5);
});

test('عتبات البعث تتصاعد ×5 ومكافأة النوى عند 1× و5× و25×', () => {
  assert.equal(rebirthThreshold(0), REBIRTH.baseThreshold);
  assert.equal(rebirthThreshold(1), REBIRTH.baseThreshold * 5);
  assert.equal(rebirthCores(0, 100), 0);
  assert.equal(rebirthCores(100, 100), 1);
  assert.equal(rebirthCores(500, 100), 2);
  assert.equal(rebirthCores(2500, 100), 3);
  assert.equal(rebirthCores(999999, 100), 3, 'سقف المكافأة 3 نوى');
});

test('شروط البعث تجمع المناطق والتعدين اليدوي والمعدات', () => {
  const ready = {
    rebirthCount: 0, runMined: REBIRTH.baseThreshold, runManualMined: REBIRTH.manualThreshold,
    regionsUnlocked: REGIONS.map((r) => r.id), equipment: { pickaxe: REBIRTH.minPickaxe },
    workers: REBIRTH.minWorkers,
  };
  assert.equal(rebirthConditions(ready).eligible, true);
  // الدخل الخامل وحده لا يكفي: التعدين اليدوي ناقص
  const idleOnly = { ...ready, runManualMined: 0 };
  assert.equal(rebirthConditions(idleOnly).eligible, false);
  assert.equal(rebirthConditions(idleOnly).conditions.manual, false);
});

test('تخصصات المناطق تغيّر العائد ولا تجمع كل المكافآت في الأعمق', () => {
  // منطقة يدوية ومنطقة عمالية تعطيان مكافأتين مختلفتين
  assert.ok(regionOutputBonus('iron', 'manual') > 0);
  assert.equal(regionOutputBonus('iron', 'gem'), 0);
  assert.ok(regionOutputBonus('goldcity', 'idle') > 0);
  // كل تخصص لا يزيد عن 10% والمكافأة الخاصة عن 15%
  for (const r of REGIONS) {
    const s = regionOutputBonus(r.id, 'manual') + regionOutputBonus(r.id, 'idle');
    assert.ok(s <= 0.25, `مكافآت ${r.id} مرتفعة`);
  }
});

test('شجرة الإرث دائمة ومحدودة بالمستويات المعلنة', () => {
  const none = legacyBonus({ legacy: {} });
  assert.equal(none.coinMult, 1);
  assert.equal(none.manualMult, 1);
  assert.equal(none.offlineHours, 0);
  const maxed = legacyBonus({ legacy: { vein_memory: 4, digger_hand: 4, lineage_vault: 2 } });
  assert.ok(Math.abs(maxed.coinMult - 1.2) < 1e-9);
  assert.ok(Math.abs(maxed.manualMult - 1.2) < 1e-9);
  assert.equal(maxed.offlineHours, 2);
  // القيم الزائدة تُقصّ عند الحد
  assert.deepEqual(legacyRanks({ legacy: { vein_memory: 99, digger_hand: 99, lineage_vault: 99 } }), { vein_memory: 4, digger_hand: 4, lineage_vault: 2 });
});

test('الصندوق الجماعي يتطلب مساهمين متعددين كلٌّ بلغ الحد الأدنى', () => {
  const solo = groupChestStatus({ contributed: GROUP_GOAL.target, byPlayer: { a: GROUP_GOAL.target } });
  assert.equal(solo.eligible, true, 'مساهم واحد قادر يكفي في مجتمع صغير');
  assert.equal(solo.required, 1);

  const many = groupChestStatus({ contributed: GROUP_GOAL.target, byPlayer: { a: 100000, b: 100000, c: 50000 } });
  assert.equal(many.required, 3);
  assert.equal(many.capable, 3);
  assert.equal(many.eligible, true);

  const weak = groupChestStatus({ contributed: GROUP_GOAL.target, byPlayer: { a: 245000, b: 2500, c: 2500 } });
  assert.equal(weak.capable, 1);
  assert.equal(weak.eligible, false, 'لا يكفي الهدف الإجمالي بلا 3 مساهمين قادرين');

  const partial = groupChestStatus({ contributed: 100, byPlayer: { a: 100 } });
  assert.equal(partial.eligible, false, 'الهدف الإجمالي شرط أيضاً');
});

test('جوائز الموسم: مشاركة وتتويج للأول وأفضل 10%', () => {
  assert.equal(seasonRewardFor(0, 100).kind, 'winner');
  assert.equal(seasonRewardFor(0, 100).gems, SEASON_REWARDS.winnerGems);
  assert.equal(seasonRewardFor(3, 100).kind, 'top');
  assert.equal(seasonRewardFor(50, 100), null);
});
