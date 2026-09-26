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

// ---------------------------------------------------------------------------
// تخصصات المناطق (المرحلة 3): كل منطقة تميل لنوع عائد مختلف، فالعمق ليس دائماً
// هو الأفضل. التخصص الأساسي +10% والمكافأة الخاصة لا تتجاوز +15%.
// ---------------------------------------------------------------------------

export const REGION_SPECIALTIES = {
  surface: {
    specialty: { key: 'gem', label: 'لمعان الاكتشاف', value: 0.10 },
    special: { key: 'relic', label: 'آثار المدخل', value: 0.10 },
  },
  coal: {
    specialty: { key: 'idle', label: 'كثافة العمّال', value: 0.10 },
    special: { key: 'manual', label: 'سواعد الفحم', value: 0.15 },
  },
  crystal: {
    specialty: { key: 'gem', label: 'شفافية الكريستال', value: 0.10 },
    special: { key: 'relic', label: 'صدى الآثار', value: 0.10 },
  },
  iron: {
    specialty: { key: 'manual', label: 'صلابة الحديد', value: 0.10 },
    special: { key: 'idle', label: 'آلات الحديد', value: 0.10 },
  },
  goldcity: {
    specialty: { key: 'idle', label: 'ورش المدينة', value: 0.10 },
    special: { key: 'gem', label: 'بريق الذهب', value: 0.10 },
  },
  lava: {
    specialty: { key: 'manual', label: 'ضربات اللافا', value: 0.10 },
    special: { key: 'relic', label: 'آثار محترقة', value: 0.15 },
  },
  frost: {
    specialty: { key: 'offline', label: 'سكون متجمد', value: 0.10 },
    special: { key: 'gem', label: 'بلورات الجليد', value: 0.10 },
  },
  abyss: {
    specialty: { key: 'relic', label: 'كنوز الهاوية', value: 0.10 },
    special: { key: 'idle', label: 'أيادٍ من الظل', value: 0.15 },
  },
};

export function regionSpecialty(regionId) {
  return REGION_SPECIALTIES[regionId] || null;
}

/** مجموع مكافأة نوع عائد معيّن في منطقة: التخصص الأساسي + المكافأة الخاصة. */
export function regionOutputBonus(regionId, key) {
  const s = REGION_SPECIALTIES[regionId];
  if (!s) return 0;
  let bonus = 0;
  if (s.specialty && s.specialty.key === key) bonus += s.specialty.value;
  if (s.special && s.special.key === key) bonus += s.special.value;
  return bonus;
}

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
  return FACILITIES.storage.effect(player.facilities.storage).offlineCapHours + legacyBonus(player).offlineHours;
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
  const legacy = legacyBonus(player);
  const regionManual = 1 + regionOutputBonus(region.id, 'manual');
  const regionIdle = 1 + regionOutputBonus(region.id, 'idle');

  const manualBase = (eq.manualPower || 1) * (fac.manualMult || 1) * region.coinMult * legacy.coinMult * legacy.manualMult * regionManual;
  const manual = manualBase * (event.manualMult || 1) * (boostActive ? BOOST.multiplier : 1);
  const workerEach = WORKER.baseRate(player.equipment.pickaxe) * (fac.workerMult || 1) * region.coinMult * legacy.coinMult;
  const idlePerSec = player.workers * workerEach * (event.idleMult || 1) * regionIdle;
  const findMult = eq.findMult || 1;

  return { manual, manualBase, workerEach, idlePerSec, findMult, boostActive, region, event, legacy };
}

export function findChances(player, now = Date.now()) {
  const { region, findMult } = powerOf(player, now);
  const event = eventOfWeek(now);
  const gemRegion = 1 + regionOutputBonus(region.id, 'gem');
  const relicRegion = 1 + regionOutputBonus(region.id, 'relic');
  return {
    gemPerTap: region.gemChance * findMult * (event.gemMult || 1) * gemRegion,
    relicPerTap: region.relicChance * findMult * (event.relicMult || 1) * relicRegion,
  };
}

/** مضاعف دخل الغياب حسب تخصص المنطقة (يُطبَّق على دخل العمّال أثناء الغياب فقط). */
export function offlineIncomeMult(player) {
  return 1 + regionOutputBonus(regionById(player.regionId).id, 'offline');
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

// بعد إكمال سلسلة السبعة: مكافأة اليوم السابع (الجواهر) أسبوعية بحد واضح،
// وباقي الزيارات تمنح عملات فقط حتى لا تتضخم الجواهر بلا مصرف.
export const VISIT_REPEAT = {
  coins: 2500,
  note: 'بعد إكمال الأسبوع تتكرر جواهر اليوم السابع كل 7 أيام، وفي بقية الزيارات تحصل على عملات بدل الجواهر.',
};

export function visitDayReward(day, lastGemAt, now) {
  const reward = VISIT_REWARDS[Math.max(1, Math.min(7, day)) - 1] || VISIT_REWARDS[0];
  if (day < 7 || !reward.gems) return { reward, repeat: false };
  if (lastGemAt && now - lastGemAt < WEEK_MS) {
    return { reward: { day: 7, coins: VISIT_REPEAT.coins, gems: 0 }, repeat: true };
  }
  return { reward, repeat: false };
}

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
  desc: 'كل منقّب يضيف ما عدّنه يدوياً. عند بلوغ الهدف يحصل كل مساهم على صندوق جماعي.',
  chestGems: 3,
  // هدف يحتاج مساهمين متعددين: 3 على الأقل إن توفّروا، ولكل منهم 5,000 مساهمة.
  minContributors: 3,
  minContributionPerPlayer: 5000,
  tiers: [
    { id: 'g1', contribution: 1000, gems: 2, label: 'مساهم' },
    { id: 'g2', contribution: 10000, gems: 5, label: 'مساهم ذهبي' },
    { id: 'g3', contribution: 50000, gems: 12, label: 'عمود الجماعة' },
  ],
};

/**
 * حالة الصندوق الجماعي: الهدف الإجمالي + مساهمون كافيون كلٌّ بلغ الحد الأدنى.
 * إن كان عدد المساهمين أقل من 3 يُخفض المطلوب إلى min(3, عدد المساهمين) حتى
 * لا يصبح الصندوق مستحيلاً في مجتمع صغير.
 */
export function groupChestStatus(group) {
  const byPlayer = (group && group.byPlayer) || {};
  const contributors = Object.entries(byPlayer).filter(([, c]) => Number(c) > 0);
  const capable = contributors.filter(([, c]) => Number(c) >= GROUP_GOAL.minContributionPerPlayer);
  const required = Math.min(GROUP_GOAL.minContributors, Math.max(1, contributors.length));
  const targetReached = Number(group?.contributed || 0) >= GROUP_GOAL.target;
  return {
    targetReached,
    contributors: contributors.length,
    capable: capable.length,
    required,
    minContribution: GROUP_GOAL.minContributionPerPlayer,
    eligible: targetReached && capable.length >= required,
  };
}

// ---------------------------------------------------------------------------
// جوائز الموسم — مشاركة وتتويج "أفضل 10%" وبطل الأسبوع (شكلية بالجواهر القليلة)
// ---------------------------------------------------------------------------

export const SEASON_REWARDS = {
  participationScore: 5000,
  participationGems: 2,
  topPct: 0.1,
  topGems: 5,
  winnerGems: 10,
  note: 'جائزة مشاركة عند 5,000 نقطة، وتتويج لأفضل 10%، وجائزة خاصة للأول. لا تمنح نوى بعث ولا أرقاماً تصنع تضخماً.',
};

/** يحدد جائزة مركز موحّد حسب الترتيب (0-based) وعدد المشاركين. */
export function seasonRewardFor(rankIndex, participantCount) {
  if (rankIndex === 0) return { kind: 'winner', gems: SEASON_REWARDS.winnerGems };
  const topCount = Math.max(1, Math.ceil(participantCount * SEASON_REWARDS.topPct));
  if (rankIndex < topCount) return { kind: 'top', gems: SEASON_REWARDS.topGems };
  return null;
}

// ---------------------------------------------------------------------------
// بعث المنجم — Rebirth: الحلقة الطويلة بعد فتح كل المناطق
// ---------------------------------------------------------------------------

export const REBIRTH = {
  name: 'بعث المنجم',
  emoji: '🌅',
  baseThreshold: 50_000_000,       // تعدين الدورة الأولى
  manualThreshold: 10_000_000,     // الحد الأدنى المطلق للتعدين اليدوي
  manualShare: 0.2,                // وكحد أدنى: 20% من عتبة الدورة (يحفظ معنى الشرط مع تصاعد العتبات)
  thresholdMult: 3,                // كل دورة = ×3 (تصاعد أبطأ من السقف الثقيل: دورات أكثر قابلة للإنجاز)
  minPickaxe: 20,
  minWorkers: 10,
  coresThresholdMult: 2,           // الأساس=1 نواة، 2×=2 نوى، 4×=3 نوى
  maxCores: 3,
  // بداية متقدّمة للدورة الجديدة: معول وعمّال متدرّجان حسب عدد مرات البعث،
  // حتى لا يبدأ اللاعب من الصفر التام بعد كل بعث (تخفّف ألم إعادة البناء).
  headStart: { pickaxePerRebirth: 1, maxPickaxe: 10, workersPerRebirth: 1, maxWorkers: 5 },
  keepNote: 'يبقى دائماً: الآثار والمجموعة، الجواهر، الألقاب، الأصدقاء والإحالات، مجموع التعدين مدى الحياة، الإنجازات، سجل المواسم، مساهمة الجماعة، وسجل الغارات. لا تُصفَّر مؤقتات الحفرة اليومية وسلسلة الزيارة والدرع.',
  resetNote: 'يُصفَّر لبدء منجم جديد: العملات، مستويات المعدات والمرافق، المنطقة الحالية والمناطق المفتوحة في الدورة، وعدّادا تعدين الدورة — وتبدأ الدورة الجديدة بمعول وعمّال متدرّجين حسب عدد مرات البعث.',
};

/** عتبة تعدين الدورة رقم cycles (نمو هندسي ×thresholdMult). */
export function rebirthThreshold(cycles) {
  return REBIRTH.baseThreshold * Math.pow(REBIRTH.thresholdMult, Math.max(0, Math.floor(cycles) || 0));
}

/**
 * شرط التعدين اليدوي النشط للدورة: نسبة من عتبة الدورة بحد أدنى مطلق.
 * يمنع أن يصبح الدخل الخامل وحده كافياً في الدورات المتأخرة.
 */
export function manualRequirement(threshold) {
  return Math.max(REBIRTH.manualThreshold, Math.floor(threshold * REBIRTH.manualShare));
}

/** مكافأة النوى: 1 عند العتبة، 2 عند 2×، 3 عند 4× — بسقف 3. */
export function rebirthCores(runMined, threshold) {
  const ratio = threshold > 0 ? Number(runMined || 0) / threshold : 0;
  if (ratio >= Math.pow(REBIRTH.coresThresholdMult, 2)) return 3; // 4×
  if (ratio >= REBIRTH.coresThresholdMult) return 2;               // 2×
  if (ratio >= 1) return 1;
  return 0;
}

/**
 * بداية الدورة الجديدة بعد n بعث: معول وعمّال متدرّجان بسقف نصف شروط البعث،
 * فيبقى للبعث عائد ملموس ويخفّ ألم إعادة البناء من الصفر.
 */
export function rebirthHeadStart(rebirths) {
  const n = Math.max(0, Math.floor(Number(rebirths) || 0));
  const hs = REBIRTH.headStart;
  return {
    pickaxe: Math.min(hs.maxPickaxe, 1 + n * hs.pickaxePerRebirth),
    workers: Math.min(hs.maxWorkers, n * hs.workersPerRebirth),
  };
}

/** سقف عدّاد تعدين الدورة: يكفي لإنجاز أكبر عدد دورات مقصود بحد النوى. */
export const RUN_MINED_CAP = 1e18;

/** شروط أهلية البعث للدورة الحالية. */
export function rebirthConditions(player) {
  const threshold = rebirthThreshold(player.rebirthCount || 0);
  const manualThreshold = manualRequirement(threshold);
  // نعدّ المناطق الفريدة الصالحة فقط، فلا يخدع التكرار/المعرّفات القديمة شرط «كل المناطق».
  const regionsSet = new Set((player.regionsUnlocked || []).filter((r) => REGIONS.some((x) => x.id === r)));
  const allRegions = regionsSet.size >= REGIONS.length;
  const cond = {
    regions: allRegions,
    runMined: Number(player.runMined || 0) >= threshold,
    manual: Number(player.runManualMined || 0) >= manualThreshold,
    pickaxe: (player.equipment?.pickaxe || 1) >= REBIRTH.minPickaxe,
    workers: (player.workers || 0) >= REBIRTH.minWorkers,
  };
  return {
    threshold,
    manualThreshold,
    conditions: cond,
    eligible: Object.values(cond).every(Boolean),
    cores: rebirthCores(player.runMined, threshold),
  };
}

/** ترحيل محافظ: هل يستحق حساب قديم أهلية بعث أولى مكافئة عند الإطلاق؟ */
export function qualifiesForRebirthSeed(player) {
  return Number(player.lifetime?.totalMined || 0) >= REBIRTH.baseThreshold
    && (player.regionsUnlocked || []).length >= REGIONS.length
    && (player.equipment?.pickaxe || 1) >= REBIRTH.minPickaxe
    && (player.workers || 0) >= REBIRTH.minWorkers;
}

/** التعدين اليدوي الممنوح لحساب قديم عند الترحيل = شرط الدورة الأولى. */
export function seedManualMined() {
  return manualRequirement(rebirthThreshold(0));
}

// ---------------------------------------------------------------------------
// أهداف الدورة (Cycle Goals) — أهداف اختيارية تُصفَّر مع كل بعث فتعطي كل دورة
// اتجاهًا واضحًا. مكافأتها عملات مؤقتة (تساعد على تجهيز الدورة) بلا نوى ولا
// جواهر، فلا تنشئ تضخّمًا دائمًا ولا تتجاوز سرعة الدورة الطبيعية.
// ---------------------------------------------------------------------------

export const CYCLE_GOALS = [
  { id: 'cyc_manual_250k', type: 'runManualMined', threshold: 250000, name: 'ربع مليون باليد', emoji: '✊', reward: { coins: 3000 } },
  { id: 'cyc_regions_5', type: 'regionsUnlocked', threshold: 5, name: 'خمس مناطق في الدورة', emoji: '🧭', reward: { coins: 5000 } },
  { id: 'cyc_relics_3', type: 'runRelics', threshold: 3, name: 'ثلاثة آثار في الدورة', emoji: '🏺', reward: { coins: 7000 } },
  { id: 'cyc_pickaxe_15', type: 'pickaxe', threshold: 15, name: 'معول بمستوى 15', emoji: '⛏️', reward: { coins: 6000 } },
  { id: 'cyc_manual_2m', type: 'runManualMined', threshold: 2000000, name: 'مليونان باليد', emoji: '💪', reward: { coins: 12000 } },
  { id: 'cyc_regions_8', type: 'regionsUnlocked', threshold: 8, name: 'كل المناطق في الدورة', emoji: '🌌', reward: { coins: 20000 } },
];

export function cycleGoalProgress(player, type) {
  switch (type) {
    case 'runManualMined': return Math.floor(Number(player.runManualMined || 0));
    case 'runMined': return Math.floor(Number(player.runMined || 0));
    case 'regionsUnlocked': return new Set((player.regionsUnlocked || []).filter((r) => REGIONS.some((x) => x.id === r))).size;
    case 'pickaxe': return player.equipment?.pickaxe || 1;
    case 'workers': return player.workers || 0;
    case 'runRelics': return Math.floor(Number(player.runRelics || 0));
    default: return 0;
  }
}

// ---------------------------------------------------------------------------
// أوسمة البعث — شكلية بحتة تُعرض حسب عدد مرات البعث، بلا أي قوة إضافية.
// ---------------------------------------------------------------------------

export const REBIRTH_BADGES = [
  { rebirths: 0, id: 'seed', name: 'بذرة', emoji: '🌱' },
  { rebirths: 1, id: 'sprout', name: 'باعث', emoji: '🌅' },
  { rebirths: 3, id: 'veteran', name: 'باعث مخضرم', emoji: '🧬' },
  { rebirths: 5, id: 'keeper', name: 'حارس الإرث', emoji: '🏛️' },
  { rebirths: 10, id: 'eternal', name: 'خالد البعث', emoji: '♾️' },
];

/** الوسام الحالي بحسب عدد مرات البعث + الوسام التالي وكم بقي له. */
export function rebirthBadge(count) {
  const n = Math.max(0, Math.floor(Number(count) || 0));
  let current = REBIRTH_BADGES[0];
  let next = null;
  for (const b of REBIRTH_BADGES) {
    if (n >= b.rebirths) current = b;
    else { next = b; break; }
  }
  return {
    current,
    next: next ? { ...next, remaining: next.rebirths - n } : null,
  };
}

// ---------------------------------------------------------------------------
// شجرة نوى الإرث — دائمة ومحدودة (كل رتبة = نواة واحدة)
// ---------------------------------------------------------------------------

export const LEGACY_COST = 1;

export const LEGACY_TRACKS = {
  vein_memory: {
    id: 'vein_memory', name: 'ذاكرة العروق', emoji: '🪨', maxRank: 4,
    desc: '+8% على عوائد العملات من التعدين والعمال لكل رتبة.',
    perRank: { coinMult: 0.08 },
  },
  digger_hand: {
    id: 'digger_hand', name: 'يد المنقّب', emoji: '✊', maxRank: 4,
    desc: '+8% على عوائد التعدين اليدوي فقط لكل رتبة.',
    perRank: { manualMult: 0.08 },
  },
  lineage_vault: {
    id: 'lineage_vault', name: 'مخزن السلالة', emoji: '🏗️', maxRank: 2,
    desc: '+1 ساعة إلى حد الدخل غير المتصل لكل رتبة.',
    perRank: { offlineHours: 1 },
  },
};

export function legacyBonus(player) {
  const legacy = (player && player.legacy) || {};
  const vein = clampRank(legacy.vein_memory, LEGACY_TRACKS.vein_memory.maxRank);
  const hand = clampRank(legacy.digger_hand, LEGACY_TRACKS.digger_hand.maxRank);
  const vault = clampRank(legacy.lineage_vault, LEGACY_TRACKS.lineage_vault.maxRank);
  return {
    ranks: { vein_memory: vein, digger_hand: hand, lineage_vault: vault },
    coinMult: 1 + vein * LEGACY_TRACKS.vein_memory.perRank.coinMult,
    manualMult: 1 + hand * LEGACY_TRACKS.digger_hand.perRank.manualMult,
    offlineHours: vault * LEGACY_TRACKS.lineage_vault.perRank.offlineHours,
  };
}

export function legacyRanks(player) {
  const bonus = legacyBonus(player);
  return bonus.ranks;
}

function clampRank(value, max) {
  const n = Math.floor(Number(value) || 0);
  return Math.max(0, Math.min(max, n));
}

// ---------------------------------------------------------------------------
// متجر التجميل — مصارف جواهر اختيارية لا تمنح تفوقاً تنافسياً
// ---------------------------------------------------------------------------

export const COSMETICS = [
  { id: 'frame_bronze', type: 'frame', name: 'إطار برونزي', emoji: '🟤', cost: 15, desc: 'إطار ملفك الشخصي بلون النحاس.' },
  { id: 'frame_silver', type: 'frame', name: 'إطار فضي', emoji: '⚪', cost: 30, desc: 'إطار ملفك الشخصي بلون الفضة.' },
  { id: 'frame_gold', type: 'frame', name: 'إطار ذهبي', emoji: '🟡', cost: 60, desc: 'إطار ملفك الشخصي بلون الذهب.' },
  { id: 'strike_spark', type: 'strike', name: 'أثر ضربة متلألئ', emoji: '✨', cost: 45, desc: 'شكل ضربة مختلف عند التعدين.' },
  { id: 'camp_lantern', type: 'camp', name: 'فانوس المخيم', emoji: '🏮', cost: 80, desc: 'زينة نادرة لمخيمك.' },
  { id: 'camp_aurora', type: 'camp', name: 'شفق المخيم', emoji: '🌌', cost: 150, desc: 'زينة أندر لمخيمك.' },
];

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
