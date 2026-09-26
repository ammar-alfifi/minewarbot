// ============================================================================
// قواعد اللعبة — كل المعادلات والأرقام هنا فقط.
// لا تُكرَّر هذه المعادلات في الواجهة: السيرفر يحسب ويرسل النتائج جاهزة.
// ============================================================================

export const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
export const HOUR_MS = 60 * 60 * 1000;
export const DAY_MS = 24 * HOUR_MS;

// ---------------------------------------------------------------------------
// الندرة والآثار
// ---------------------------------------------------------------------------

export const RARITIES = {
  common: { id: 'common', name: 'عادي', emoji: '⚪', color: '#94a3b8', weight: 60, value: 100, dupeGems: 1 },
  rare: { id: 'rare', name: 'نادر', emoji: '🔵', color: '#3b82f6', weight: 25, value: 300, dupeGems: 3 },
  epic: { id: 'epic', name: 'ملحمي', emoji: '🟣', color: '#a855f7', weight: 12, value: 900, dupeGems: 8 },
  legendary: { id: 'legendary', name: 'أسطوري', emoji: '🟡', color: '#f59e0b', weight: 3, value: 2500, dupeGems: 20 },
};

export const REGIONS = [
  {
    id: 'surface',
    name: 'المدخل الترابي',
    emoji: '🪨',
    tagline: 'هنا تبدأ كل حكاية منجم',
    unlockTotalMined: 0,
    coinMult: 1,
    gemChance: 0.0012,
    relicChance: 0.00022,
    theme: { from: '#8d6e63', to: '#5d4037' },
    relics: ['fossil_shell', 'old_coin', 'fish_teeth'],
  },
  {
    id: 'coal',
    name: 'نفق الفحم',
    emoji: '🖤',
    tagline: 'سوادٌ يلمع فيه العرق',
    unlockTotalMined: 1500,
    coinMult: 1.35,
    gemChance: 0.0014,
    relicChance: 0.00028,
    theme: { from: '#4b5563', to: '#1f2937' },
    relics: ['work_lantern', 'purple_seam'],
  },
  {
    id: 'crystal',
    name: 'كهف الكريستال',
    emoji: '💠',
    tagline: 'أضواء لها همس',
    unlockTotalMined: 8000,
    coinMult: 1.9,
    gemChance: 0.0018,
    relicChance: 0.00034,
    theme: { from: '#2563eb', to: '#1e3a8a' },
    relics: ['blue_shard', 'echo_gem', 'moon_tear'],
  },
  {
    id: 'iron',
    name: 'منجم الحديد',
    emoji: '⚙️',
    tagline: 'حديدٌ لا يعرف الكلل',
    unlockTotalMined: 30000,
    coinMult: 2.7,
    gemChance: 0.0021,
    relicChance: 0.00042,
    theme: { from: '#64748b', to: '#334155' },
    relics: ['iron_horseshoe', 'giant_nail'],
  },
  {
    id: 'goldcity',
    name: 'مدينة الذهب المفقودة',
    emoji: '🏛️',
    tagline: 'حضارة كاملة تحت الرمال',
    unlockTotalMined: 100000,
    coinMult: 3.8,
    gemChance: 0.0024,
    relicChance: 0.00052,
    theme: { from: '#d97706', to: '#92400e' },
    relics: ['ancient_bar', 'miner_crown', 'treasure_map'],
  },
  {
    id: 'lava',
    name: 'شقوق اللافا',
    emoji: '🌋',
    tagline: 'حيث ينبض قلب الأرض',
    unlockTotalMined: 350000,
    coinMult: 5.5,
    gemChance: 0.0028,
    relicChance: 0.00062,
    theme: { from: '#ea580c', to: '#7f1d1d' },
    relics: ['burnt_granite', 'flame_heart'],
  },
  {
    id: 'frost',
    name: 'الأعماق المتجمدة',
    emoji: '❄️',
    tagline: 'صمتٌ عمره آلاف السنين',
    unlockTotalMined: 1200000,
    coinMult: 8,
    gemChance: 0.0032,
    relicChance: 0.00074,
    theme: { from: '#0ea5e9', to: '#0c4a6e' },
    relics: ['ice_shard', 'winter_cry'],
  },
  {
    id: 'abyss',
    name: 'الهاوية الأبدية',
    emoji: '🌌',
    tagline: 'النهاية؟ أم البداية؟',
    unlockTotalMined: 4000000,
    coinMult: 12,
    gemChance: 0.0036,
    relicChance: 0.00088,
    theme: { from: '#7c3aed', to: '#1e1b4b' },
    relics: ['void_stone', 'abyss_eye', 'deep_star'],
  },
];

export const RELICS = {
  fossil_shell: { id: 'fossil_shell', name: 'صدفة متحجرة', emoji: '🐚', rarity: 'common', region: 'surface', flavor: 'كان هنا بحرٌ قبل أن يصير حجراً.' },
  old_coin: { id: 'old_coin', name: 'عملة قديمة', emoji: '🪙', rarity: 'common', region: 'surface', flavor: 'عليها وجهٌ لا يعرفه أحد.' },
  fish_teeth: { id: 'fish_teeth', name: 'أسنان سمك غريب', emoji: '🦈', rarity: 'rare', region: 'surface', flavor: 'حادة رغم ملايين السنين.' },
  work_lantern: { id: 'work_lantern', name: 'فانوس عامل', emoji: '🏮', rarity: 'common', region: 'coal', flavor: 'ما زال يشتعل وكأن صاحبه عاد.' },
  purple_seam: { id: 'purple_seam', name: 'عرق أرجواني', emoji: '🟣', rarity: 'rare', region: 'coal', flavor: 'فحمٌ لم يره أحد من قبل.' },
  blue_shard: { id: 'blue_shard', name: 'شظية زرقاء', emoji: '🔷', rarity: 'rare', region: 'crystal', flavor: 'تطنّ إذا اقتربت منها.' },
  echo_gem: { id: 'echo_gem', name: 'جوهرة الصدى', emoji: '🔮', rarity: 'epic', region: 'crystal', flavor: 'تردّ صوتك بعد ثانية كاملة.' },
  moon_tear: { id: 'moon_tear', name: 'دمعة القمر', emoji: '🌙', rarity: 'legendary', region: 'crystal', flavor: 'سقطت ذات ليلة ولم تنكسر.' },
  iron_horseshoe: { id: 'iron_horseshoe', name: 'حدوة حصان', emoji: '🧲', rarity: 'common', region: 'iron', flavor: 'حظٌّ من زمن الفرسان.' },
  giant_nail: { id: 'giant_nail', name: 'مسمار العملاق', emoji: '📌', rarity: 'rare', region: 'iron', flavor: 'أطول من ذراعك.' },
  ancient_bar: { id: 'ancient_bar', name: 'سبيكة القدامى', emoji: '🧱', rarity: 'rare', region: 'goldcity', flavor: 'نقشها لم يُقرأ بعد.' },
  miner_crown: { id: 'miner_crown', name: 'تاج المنجم', emoji: '👑', rarity: 'epic', region: 'goldcity', flavor: 'كان ملكاً قبل أن يصير أسطورة.' },
  treasure_map: { id: 'treasure_map', name: 'خريطة الكنز', emoji: '🗺️', rarity: 'legendary', region: 'goldcity', flavor: 'تدلّ على مكان لم يُحفر بعد.' },
  burnt_granite: { id: 'burnt_granite', name: 'جرانيت محروق', emoji: '🪨', rarity: 'common', region: 'lava', flavor: 'ما زال دافئاً.' },
  flame_heart: { id: 'flame_heart', name: 'قلب اللهب', emoji: '🔥', rarity: 'epic', region: 'lava', flavor: 'ينبض ببطءٍ مخيف.' },
  ice_shard: { id: 'ice_shard', name: 'بلورة جليد', emoji: '🧊', rarity: 'rare', region: 'frost', flavor: 'لا تذوب مهما فعلت.' },
  winter_cry: { id: 'winter_cry', name: 'صرخة الشتاء', emoji: '🌬️', rarity: 'epic', region: 'frost', flavor: 'تسمعها في صوت الريح.' },
  void_stone: { id: 'void_stone', name: 'حجر الفراغ', emoji: '⚫', rarity: 'common', region: 'abyss', flavor: 'يمتص الضوء من حوله.' },
  abyss_eye: { id: 'abyss_eye', name: 'عين الهاوية', emoji: '👁️', rarity: 'epic', region: 'abyss', flavor: 'تنظر إليك عندما تغمض عينك.' },
  deep_star: { id: 'deep_star', name: 'نجمة الأعماق', emoji: '⭐', rarity: 'legendary', region: 'abyss', flavor: 'نجمة سقطت ولم تتوقف بعد.' },
};

export const ALL_RELICS = Object.values(RELICS);

// ---------------------------------------------------------------------------
// الترقيات: معدات (يدوي) + مرافق (تلقائي) + عمّال
// ---------------------------------------------------------------------------

export const EQUIPMENT = {
  pickaxe: {
    id: 'pickaxe', group: 'equipment', name: 'المعول', emoji: '⛏️',
    desc: 'قلب التعدين اليدوي. كل مستوى +1 قوة ضربة.',
    baseCost: 50, costMult: 2.0, maxLevel: 50, resource: 'coins',
    effect: (lvl) => ({ manualPower: lvl }),
  },
  lamp: {
    id: 'lamp', group: 'equipment', name: 'المصباح', emoji: '🏮',
    desc: 'ضوءٌ أفضل = اكتشافات أكثر. +12% لكل مستوى لفرص الجواهر والآثار.',
    baseCost: 120, costMult: 1.9, maxLevel: 20, resource: 'coins',
    effect: (lvl) => ({ findMult: 1 + 0.12 * (lvl - 1) }),
  },
  helmet: {
    id: 'helmet', group: 'equipment', name: 'الخوذة', emoji: '⛑️',
    desc: 'حماية في الغارات: -4% من المسروق و+20 دقيقة درع لكل مستوى (بحد أقصى 50%).',
    baseCost: 90, costMult: 1.85, maxLevel: 20, resource: 'coins',
    effect: (lvl) => ({ raidDefense: Math.min(0.5, 0.04 * (lvl - 1)), shieldBonusMs: 20 * 60 * 1000 * (lvl - 1) }),
  },
};

export const FACILITIES = {
  cart: {
    id: 'cart', group: 'facilities', name: 'عربة النقل', emoji: '🛒',
    desc: 'ترفع إنتاج كل عامل +25% لكل مستوى.',
    baseCost: 350, costMult: 2.0, maxLevel: 30, resource: 'coins',
    effect: (lvl) => ({ workerMult: 1 + 0.25 * (lvl - 1) }),
  },
  smelter: {
    id: 'smelter', group: 'facilities', name: 'المسبك', emoji: '🏭',
    desc: 'يصقل خامك: +15% قوة تعدين يدوي لكل مستوى.',
    baseCost: 800, costMult: 2.3, maxLevel: 30, resource: 'coins',
    effect: (lvl) => ({ manualMult: 1 + 0.15 * (lvl - 1) }),
  },
  storage: {
    id: 'storage', group: 'facilities', name: 'المخزن', emoji: '🏗️',
    desc: 'يخزّن عمل عمالك أثناء غيابك: +ساعة واحدة للحد الأقصى لكل مستوى.',
    baseCost: 600, costMult: 2.4, maxLevel: 4, resource: 'coins',
    effect: (lvl) => ({ offlineCapHours: 8 + (lvl - 1) }),
  },
};

export const WORKER = {
  id: 'worker', group: 'workers', name: 'عامل تعدين', emoji: '🧑‍🏭',
  baseCost: 100, costMult: 1.7, maxCount: 200,
  // إنتاج العامل يتأثر بمستوى المعول والعربة ومضاعف المنطقة
  baseRate: (pickaxeLevel) => 1 + 0.25 * (pickaxeLevel - 1),
};

export const BOOST = {
  id: 'boost', name: 'حماسة المنقّب', emoji: '⚡',
  desc: 'ضاعف قوة التعدين اليدوي لمدة 10 دقائق. المكافأة والدعم فقط — لا شراء حقيقي.',
  costGems: 5, durationMs: 10 * 60 * 1000, multiplier: 2,
};

export const GEM_SHOP = { boost: BOOST };

// ---------------------------------------------------------------------------
// العثور النادر: معدلات شفافة + مهلة بين الاكتشافات
// ---------------------------------------------------------------------------

export const FINDS = {
  gemCooldownMs: 60 * 1000,      // لا أكثر من جوهرة كل دقيقة
  relicCooldownMs: 150 * 1000,   // ولا أكثر من أثر كل دقيقتين ونصف
  gemMinGems: 1,
  gemMaxGems: 1,
};

// ---------------------------------------------------------------------------
// أحداث الأسبوع — تدور تلقائياً حسب رقم الأسبوع (نفس الحدث لكل اللاعبين)
// ---------------------------------------------------------------------------

export const EVENTS = [
  { id: 'rich_veins', name: 'عروق غنية', emoji: '💠', desc: 'إنتاج العمال +50% هذا الأسبوع', idleMult: 1.5 },
  { id: 'gem_rush', name: 'اندفاع الجواهر', emoji: '✨', desc: 'فرصة العثور على الجواهر مضاعفة', gemMult: 2 },
  { id: 'relic_season', name: 'موسم الآثار', emoji: '🏺', desc: 'فرصة اكتشاف الآثار مضاعفة', relicMult: 2 },
  { id: 'fast_hands', name: 'أيادٍ سريعة', emoji: '💪', desc: 'قوة التعدين اليدوي +25%', manualMult: 1.25 },
];

export function eventOfWeek(ts) {
  return EVENTS[Math.floor(ts / WEEK_MS) % EVENTS.length];
}

export function weekId(ts) {
  return Math.floor(ts / WEEK_MS);
}

export function dayId(ts) {
  return Math.floor(ts / DAY_MS);
}

// ---------------------------------------------------------------------------
// العمل دون اتصال (Offline) — شفاف وبسقف واضح
// ---------------------------------------------------------------------------

export const OFFLINE = {
  baseCapHours: 8,
  note: 'يعمل عمالك وأنت بعيد، حتى سقف المخزن. الباقي لا يُحتسب — بلا خداع أو عدّادات وهمية.',
};

export function offlineCapHours(player) {
  return FACILITIES.storage.effect(player.facilities.storage).offlineCapHours;
}

export function applyUpgrades(target, upgrades) {
  const goods = {};
  for (const [id, level] of Object.entries(upgrades)) {
    if (target[id]) Object.assign(goods, target[id].effect(level));
  }
  return goods;
}

// ---------------------------------------------------------------------------
// القوة والإنتاج
// ---------------------------------------------------------------------------

export function regionById(id) {
  return REGIONS.find((r) => r.id === id) || REGIONS[0];
}

export function regionIndex(id) {
  const i = REGIONS.findIndex((r) => r.id === id);
  return i < 0 ? 0 : i;
}

export function powerOf(player, now = Date.now()) {
  const eq = applyUpgrades(EQUIPMENT, player.equipment);
  const fac = applyUpgrades(FACILITIES, player.facilities);
  const region = regionById(player.regionId);
  const event = eventOfWeek(now);
  const boostActive = player.boostUntil > now;

  const manualBase = (eq.manualPower || 1) * (fac.manualMult || 1) * region.coinMult;
  const manual = manualBase * (event.manualMult || 1) * (boostActive ? BOOST.multiplier : 1);
  const workerEach = WORKER.baseRate(player.equipment.pickaxe) * (fac.workerMult || 1) * region.coinMult;
  const idlePerSec = player.workers * workerEach * (event.idleMult || 1);
  const findMult = eq.findMult || 1;

  return { manual, manualBase, workerEach, idlePerSec, findMult, boostActive, region, event };
}

export function findChances(player, now = Date.now()) {
  const { region, findMult } = powerOf(player, now);
  const event = eventOfWeek(now);
  return {
    gemPerTap: region.gemChance * findMult * (event.gemMult || 1),
    relicPerTap: region.relicChance * findMult * (event.relicMult || 1),
  };
}

// ---------------------------------------------------------------------------
// الأسعار
// ---------------------------------------------------------------------------

export function upgradeCost(id, level) {
  const def = EQUIPMENT[id] || FACILITIES[id];
  if (!def) throw new Error('unknown upgrade: ' + id);
  return Math.floor(def.baseCost * Math.pow(def.costMult, level - 1));
}

export function workerCost(count) {
  return Math.floor(WORKER.baseCost * Math.pow(WORKER.costMult, count));
}

export function workerBatchCost(count, amount) {
  let total = 0;
  for (let i = 0; i < amount; i++) total += workerCost(count + i);
  return total;
}

export function upgradeBatchCost(id, level, amount) {
  let total = 0;
  for (let i = 0; i < amount; i++) total += upgradeCost(id, level + i);
  return total;
}

// ---------------------------------------------------------------------------
// الآثار: احتساب القيمة والاختيار العشوائي
// ---------------------------------------------------------------------------

export function relicValue(id) {
  const r = RELICS[id];
  return r ? RARITIES[r.rarity].value : 0;
}

export function collectionScore(player) {
  let score = 0;
  for (const [id, entry] of Object.entries(player.relics || {})) {
    score += Math.min(entry.count, 5) * relicValue(id) + (entry.count > 1 ? 50 : 0);
  }
  return score + Object.keys(player.relics || {}).length * 25;
}

export function rollRarity(rng = Math.random) {
  const total = Object.values(RARITIES).reduce((s, r) => s + r.weight, 0);
  let roll = rng() * total;
  for (const r of Object.values(RARITIES)) {
    roll -= r.weight;
    if (roll <= 0) return r;
  }
  return RARITIES.common;
}

/** يختار أثراً من منطقة معينة مع تراجع للندرة الأقل إن لم يتوفر في المجموعة. */
export function pickRelic(regionId, rng = Math.random) {
  const region = regionById(regionId);
  const order = ['legendary', 'epic', 'rare', 'common'];
  let rarity = rollRarity(rng).id;
  for (let i = order.indexOf(rarity); i < order.length; i++) {
    const pool = region.relics.filter((id) => RELICS[id].rarity === order[i]);
    if (pool.length) return pool[Math.floor(rng() * pool.length)];
  }
  return region.relics[0];
}

// ---------------------------------------------------------------------------
// الغارات
// ---------------------------------------------------------------------------

export const RAID = {
  cooldownMs: 10 * 60 * 1000,
  dailyAttempts: 8,               // 8 محاولات/يوم (الفشل يُحسب) — كل محاولة قرار
  perTargetCooldownMs: 15 * 60 * 1000,
  baseSuccess: 0.5,
  minSuccess: 0.15,
  maxSuccess: 0.9,
  powerSwing: 0.35,               // أثر فارق القوة على فرصة النجاح (أوسع من قبل)
  // الغنيمة: نسبة من مخزون الضحية بسقفَين مرتبطَين بالإنتاج — لا رقم ثابت
  vaultPct: 0.3,                  // مخزون محمي لا يُلمس أبداً
  sharePct: 0.12,                 // نسبة المخزون القابلة للسرقة
  victimLootSeconds: 15 * 60,     // ≤ 15 دقيقة من إنتاج الضحية
  attackerLootSeconds: 60 * 60,   // ≤ 60 دقيقة من إنتاج المهاجم
  // مخاطرة المهاجم عند الفشل (قرار حقيقي بدل رمية مجانية)
  failureLossPct: 0.1,            // 10% من مخزونه
  failureLossSeconds: 10 * 60,    // ≤ 10 دقائق من إنتاجه
  failureVaultPct: 0.2,           // لا يهبط تحت 20% من مخزونه
  defenseRewardShare: 0.6,        // 60% من الخسارة تعويض للضحية، والباقي يُحرق (مصرف عملات)
  revengeStealMult: 1.25,
  revengeSuccessBonus: 0.1,
  revengeWindowMs: 24 * 60 * 60 * 1000,
  shieldOnRaidMs: 60 * 60 * 1000, // درع أقصر: الغارات تبقى ممكنة
  shieldCapMs: 4 * 60 * 60 * 1000,
  minDefenderBalance: 50,
  minSteal: 5,
  logLimit: 20,
  newPlayerProtectionMined: 10000, // حماية المبتدئين: لا يهاجمون ولا يُهاجَمون قبل هذه العتبة
  seasonBasePoints: 250,           // نقاط موسم أساسية للغارة الناجحة
  seasonMaxBonus: 1500,            // + مكافأة حسب الغنيمة (تصل الغارات بسباق الموسم)
};

/** أقصى إنتاج لحظي معقول (عملة/ث): دخل العمّال + سقف التعدين اليدوي المستدام (8/ث). */
export function productionPerSec(player, now = Date.now()) {
  const power = powerOf(player, now);
  return power.idlePerSec + 8 * power.manualBase;
}

export function raidSuccessChance(attacker, target, isRevenge = false, now = Date.now()) {
  const a = powerOf(attacker, now).manual;
  const d = powerOf(target, now).manual;
  const swing = a + d > 0 ? (a - d) / (a + d) : 0;
  let chance = RAID.baseSuccess + swing * RAID.powerSwing + (isRevenge ? RAID.revengeSuccessBonus : 0);
  chance = Math.max(RAID.minSuccess, Math.min(RAID.maxSuccess, chance));
  return chance;
}

/** الغنيمة المحتملة عند نجاح الغارة — تتناسب مع اقتصاد الطرفين لا مع رقم ثابت. */
export function stealAmount(attacker, target, isRevenge = false, now = Date.now()) {
  const def = applyUpgrades(EQUIPMENT, target.equipment).raidDefense || 0;
  const bank = target.coins || 0;
  const vault = Math.floor(bank * RAID.vaultPct);
  const spendable = Math.max(0, bank - vault);
  const fromBank = Math.floor(bank * RAID.sharePct);
  const byVictim = Math.floor(productionPerSec(target, now) * RAID.victimLootSeconds);
  const byAttacker = Math.floor(productionPerSec(attacker, now) * RAID.attackerLootSeconds);
  let amount = Math.min(fromBank, spendable, byVictim, byAttacker);
  if (isRevenge) amount = Math.floor(amount * RAID.revengeStealMult);
  amount = Math.floor(amount * (1 - def));
  return Math.max(0, Math.min(amount, spendable));
}

/** خسارة المهاجم عند فشل الغارة — تُلغى في الثأر. */
export function raidFailureLoss(attacker, now = Date.now()) {
  const bank = attacker.coins || 0;
  const floor = Math.floor(bank * RAID.failureVaultPct);
  const spendable = Math.max(0, bank - floor);
  const loss = Math.min(
    Math.floor(bank * RAID.failureLossPct),
    Math.floor(productionPerSec(attacker, now) * RAID.failureLossSeconds),
  );
  return Math.max(0, Math.min(loss, spendable));
}

/** نقاط الموسم للغارة الناجحة: أساس ثابت + مكافأة نسبية من الغنيمة. */
export function raidSeasonPoints(loot, attacker, now = Date.now()) {
  const prod = Math.max(1, productionPerSec(attacker, now));
  const bonus = Math.min(RAID.seasonMaxBonus, Math.floor((loot / prod) * 2));
  return RAID.seasonBasePoints + bonus;
}

// ---------------------------------------------------------------------------
// الحفرة اليومية + مكافأة الزيارة + الدرع
// ---------------------------------------------------------------------------

export const DAILY = {
  cooldownMs: 24 * 60 * 60 * 1000,
  shieldMs: 60 * 60 * 1000,
  visitGapMs: 48 * 60 * 60 * 1000,
  rewards: [
    { id: 'coins_small', label: 'عملات', weight: 55 },
    { id: 'gems', label: 'جواهر', weight: 25 },
    { id: 'relic', label: 'أثر', weight: 15 },
    { id: 'boost', label: 'حماسة', weight: 5 },
  ],
  coinsBase: 150,
  gemsMin: 1,
  gemsMax: 2,
  boostMs: 10 * 60 * 1000,
};

export const VISIT_REWARDS = [
  { day: 1, coins: 100, gems: 0 },
  { day: 2, coins: 250, gems: 0 },
  { day: 3, coins: 0, gems: 1 },
  { day: 4, coins: 700, gems: 0 },
  { day: 5, coins: 0, gems: 2 },
  { day: 6, coins: 1500, gems: 0 },
  { day: 7, coins: 0, gems: 5 },
];

export function visitStreakAfter(lastVisitAt, currentStreak, now) {
  if (!lastVisitAt) return 1;
  const gap = now - lastVisitAt;
  if (gap >= DAILY.visitGapMs) return 1; // إعادة ودّية بلا عقاب: تحفظ أفضل سلسلة في الإنجازات
  return Math.min(7, (currentStreak || 0) + 1);
}

// ---------------------------------------------------------------------------
// إنجازات ومكافآت (تُطالب يدوياً)
// ---------------------------------------------------------------------------

export const MILESTONES = [
  { id: 'mined_1k', type: 'totalMined', threshold: 1000, name: 'أول ألف', emoji: '🪙', reward: { coins: 250, gems: 1 } },
  { id: 'mined_10k', type: 'totalMined', threshold: 10000, name: 'عشرة آلاف', emoji: '💰', reward: { coins: 1500, gems: 2 } },
  { id: 'mined_100k', type: 'totalMined', threshold: 100000, name: 'مئة ألف', emoji: '🏆', reward: { coins: 10000, gems: 5 } },
  { id: 'mined_1m', type: 'totalMined', threshold: 1000000, name: 'مليونير المنجم', emoji: '💎', reward: { coins: 50000, gems: 12 } },
  { id: 'relic_1', type: 'relicsFound', threshold: 1, name: 'أول اكتشاف', emoji: '🏺', reward: { gems: 2 } },
  { id: 'relic_5', type: 'relicsFound', threshold: 5, name: 'جامع صغير', emoji: '📚', reward: { gems: 6, relic: true } },
  { id: 'relic_10', type: 'relicsFound', threshold: 10, name: 'عشرة كنوز', emoji: '🗃️', reward: { gems: 15, relic: true } },
  { id: 'relic_20', type: 'relicsFound', threshold: 20, name: 'المجموعة الكاملة', emoji: '🌟', reward: { gems: 40, relic: true } },
  { id: 'region_4', type: 'regionsUnlocked', threshold: 4, name: 'منقّب جاد', emoji: '🧭', reward: { gems: 8 } },
  { id: 'region_8', type: 'regionsUnlocked', threshold: 8, name: 'عمق مطلق', emoji: '🌌', reward: { gems: 30 } },
  { id: 'raid_3', type: 'raidsWon', threshold: 3, name: 'قرصان مبتدئ', emoji: '⚔️', reward: { gems: 3 } },
  { id: 'raid_15', type: 'raidsWon', threshold: 15, name: 'رعب النفق', emoji: '🏴‍☠️', reward: { gems: 10 } },
  { id: 'streak_7', type: 'bestStreak', threshold: 7, name: 'أسبوع كامل', emoji: '📅', reward: { gems: 10 } },
];

export function milestoneProgress(player, type) {
  switch (type) {
    case 'totalMined': return player.lifetime.totalMined;
    case 'relicsFound': return player.lifetime.relicsFound;
    case 'regionsUnlocked': return player.regionsUnlocked.length;
    case 'raidsWon': return player.lifetime.raidsWon;
    case 'bestStreak': return player.lifetime.bestStreak;
    default: return 0;
  }
}

// ---------------------------------------------------------------------------
// الألقاب (تجميلية بالجواهر فقط)
// ---------------------------------------------------------------------------

export const TITLES = [
  { id: 'novice', name: 'حفّار مبتدئ', emoji: '⛏️', cost: 0, desc: 'اللقب الافتراضي لكل من يبدأ الرحلة.' },
  { id: 'prospector', name: 'منقّب ماهر', emoji: '🔎', cost: 15, desc: 'لعيونٍ تعرف قيمة الحجر.' },
  { id: 'gemkeeper', name: 'حارس الجواهر', emoji: '💎', cost: 35, desc: 'لمن جمع لمعاناً كفاية.' },
  { id: 'relic_hunter', name: 'صيّاد الآثار', emoji: '🏺', cost: 60, reqRelics: 8, desc: 'يتطلب 8 آثار.' },
  { id: 'raid_master', name: 'سيد الغارات', emoji: '⚔️', cost: 50, reqRaids: 10, desc: 'يتطلب 10 غارات ناجحة.' },
  { id: 'depth_lord', name: 'سيّد الأعماق', emoji: '🌌', cost: 100, reqRegions: 7, desc: 'يتطلب الوصول للمنطقة السابعة.' },
];

// ---------------------------------------------------------------------------
// هدف الجماعة الأسبوعي (الحفرة الجماعية)
// ---------------------------------------------------------------------------

export const GROUP_GOAL = {
  target: 250000,
  name: 'الحفرة الجماعية',
  emoji: '🕳️',
  desc: 'كل منقّب يضيف ما عدّنه. عند بلوغ الهدف يحصل كل مساهم على صندوق جماعي.',
  chestGems: 3,
  tiers: [
    { id: 'g1', contribution: 1000, gems: 2, label: 'مساهم' },
    { id: 'g2', contribution: 10000, gems: 5, label: 'مساهم ذهبي' },
    { id: 'g3', contribution: 50000, gems: 12, label: 'عمود الجماعة' },
  ],
};

// ---------------------------------------------------------------------------
// الإحالات
// ---------------------------------------------------------------------------

export const REFERRAL = {
  inviterGems: 3,
  inviteeGems: 2,
  dailyCapGems: 10,
  maxFriends: 100,
  prefix: 'ref_',
};

// ---------------------------------------------------------------------------
// عتبات المناطق
// ---------------------------------------------------------------------------

export function unlockedRegions(totalMined) {
  return REGIONS.filter((r) => totalMined >= r.unlockTotalMined).map((r) => r.id);
}

export function nextRegion(totalMined) {
  return REGIONS.find((r) => totalMined < r.unlockTotalMined) || null;
}

export function nextMilestone(player) {
  const done = new Set(player.milestonesClaimed || []);
  return MILESTONES.find((m) => !done.has(m.id)) || null;
}

// ---------------------------------------------------------------------------
// فحص القيم قبل حفظ أي شيء (حماية من بيانات فاسدة)
// ---------------------------------------------------------------------------

export function saneNumber(value, fallback = 0, max = Number.MAX_SAFE_INTEGER) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.min(Math.floor(n), max);
}
