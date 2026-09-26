// اختبارات قواعد اللعبة (معادلات، أسعار، غارات، ندرة)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  upgradeCost, workerCost, workerBatchCost, powerOf, collectionScore,
  stealAmount, raidSuccessChance, productionPerSec, raidFailureLoss,
  pickRelic, rollRarity, visitStreakAfter,
  unlockedRegions, offlineCapHours, REGIONS, RELICS, RARITIES, RAID,
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
