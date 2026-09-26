// ============================================================================
// محرك اللعبة — السلطة الكاملة للسيرفر.
// كل عملية (تعدين، شراء، غارة، اكتشاف) تُحسب هنا، والواجهة لا تقرر شيئاً.
// ============================================================================

import {
  RARITIES, REGIONS, RELICS, EQUIPMENT, FACILITIES, WORKER, BOOST,
  FINDS, EVENTS, eventOfWeek, weekId, dayId, DAY_MS, HOUR_MS, WEEK_MS,
  OFFLINE, offlineCapHours, offlineIncomeMult, powerOf, findChances,
  upgradeCost, workerCost, workerBatchCost, upgradeBatchCost,
  regionById, regionSpecialty, pickRelic, collectionScore,
  RAID, raidSuccessChance, stealAmount, productionPerSec, raidFailureLoss, raidSeasonPoints,
  DAILY, VISIT_REWARDS, visitStreakAfter, VISIT_REPEAT, visitDayReward,
  MILESTONES, milestoneProgress, TITLES, GROUP_GOAL, groupChestStatus, REFERRAL,
  SEASON_REWARDS, seasonRewardFor,
  REBIRTH, rebirthThreshold, rebirthCores, rebirthConditions, qualifiesForRebirthSeed, RUN_MINED_CAP, seedManualMined,
  CYCLE_GOALS, cycleGoalProgress, REBIRTH_BADGES, rebirthBadge,
  LEGACY_TRACKS, LEGACY_COST, legacyRanks, COSMETICS,
  unlockedRegions, nextRegion, nextMilestone, saneNumber,
} from './rules.js';

export class GameError extends Error {
  constructor(message, status = 400, code = 'game_error') {
    super(message);
    this.name = 'GameError';
    this.status = status;
    this.code = code;
  }
}

const fail = (msg, status = 400, code = 'game_error') => {
  throw new GameError(msg, status, code);
};

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const REQUEST_ID_RE = /^[a-zA-Z0-9_-]{6,64}$/;
// سقف حساب «من لا يجد هدفاً» في مؤشرات الصحة (تكلفة تربيعية) — يُترك null فوقه.
const RAID_STATS_NEARBY_CAP = 600;

export function createEngine({ store, botUsername = 'MineWarrBot', now = () => Date.now(), rng = Math.random }) {
  // -------------------------------------------------------------------------
  // تطبيع اللاعبين والترحيل من التخزين القديم
  // -------------------------------------------------------------------------

  // رقم مخطط اللاعب. يُرفع عند إضافة حقول جديدة إلزامية (مثل Rebirth/الإرث/التجميل)
  // حتى تُطبَّع الحسابات القائمة من جديد — وإلا بقيت بلا الحقول الجديدة وانهىر publicState.
  const PLAYER_SCHEMA = 4;

  function playerOf(doc, id) {
    const p = doc.players[id];
    if (!p) return null;
    if (p.__v === PLAYER_SCHEMA && p.playerId === id) return p;
    return normalizePlayer(p, id);
  }

  function normalizePlayer(p, id) {
    const ts = p.updatedAt || now();
    const life = p.lifetime || {};
    // هل هذه أول مرة يُطبَّع فيها الحساب بعد إطلاق نظام البعث؟
    const hadRebirthField = p.rebirthCount !== undefined;
    p.__v = PLAYER_SCHEMA;
    p.playerId = id;
    p.name = String(p.name || 'منقّب').slice(0, 30);
    p.photoUrl = typeof p.photoUrl === 'string' ? p.photoUrl : null;
    p.mode = p.mode === 'guest' ? 'guest' : 'telegram';
    p.createdAt = p.createdAt || ts;
    p.lastSeen = p.lastSeen || ts;
    p.lastTick = p.lastTick || p.updatedAt || ts;
    // كسر العملة المتبقّي من دخل العمّال، حتى لا يُهدر التقريب مع كل نداء
    p.idleCarry = Number.isFinite(Number(p.idleCarry)) ? Math.min(Math.max(Number(p.idleCarry), 0), 1) : 0;
    // نسخة الجلسة: تزداد عند تسجيل الخروج فتُبطل كل التوكنات الصادرة قبلها
    p.sessionEpoch = saneNumber(p.sessionEpoch, 0, 1e9);
    p.coins = saneNumber(p.coins ?? p.gold, 0, 1e15);
    p.gems = saneNumber(p.gems, 0, 1e7);
    const eq = p.equipment || {};
    p.equipment = {
      pickaxe: clamp(saneNumber(eq.pickaxe ?? p.pickaxe, 1, 50) || 1, 1, EQUIPMENT.pickaxe.maxLevel),
      lamp: clamp(saneNumber(eq.lamp, 1, 20) || 1, 1, EQUIPMENT.lamp.maxLevel),
      helmet: clamp(saneNumber(eq.helmet, 1, 20) || 1, 1, EQUIPMENT.helmet.maxLevel),
    };
    const fac = p.facilities || {};
    p.facilities = {
      cart: clamp(saneNumber(fac.cart, 1, 30) || 1, 1, FACILITIES.cart.maxLevel),
      smelter: clamp(saneNumber(fac.smelter, 1, 30) || 1, 1, FACILITIES.smelter.maxLevel),
      storage: clamp(saneNumber(fac.storage, 1, 4) || 1, 1, FACILITIES.storage.maxLevel),
    };
    p.workers = saneNumber(p.workers, 0, WORKER.maxCount);
    // عدّادات دورة البعث (Rebirth) وشجرة الإرث الدائمة
    p.rebirthCount = saneNumber(p.rebirthCount, 0, 1e6);
    p.runMined = saneNumber(p.runMined, 0, RUN_MINED_CAP);
    p.runManualMined = saneNumber(p.runManualMined, 0, RUN_MINED_CAP);
    // عدّاد آثار الدورة (لأهداف الدورة) — يُصفَّر مع البعث.
    p.runRelics = saneNumber(p.runRelics, 0, 1e6);
    p.cycleGoalsClaimed = Array.isArray(p.cycleGoalsClaimed)
      ? p.cycleGoalsClaimed.filter((g) => CYCLE_GOALS.some((x) => x.id === g))
      : [];
    p.legacyCores = saneNumber(p.legacyCores, 0, 1e6);
    p.rebirthSeeded = Boolean(p.rebirthSeeded);
    const leg = p.legacy || {};
    p.legacy = {
      vein_memory: clamp(saneNumber(leg.vein_memory, 0, LEGACY_TRACKS.vein_memory.maxRank), 0, LEGACY_TRACKS.vein_memory.maxRank),
      digger_hand: clamp(saneNumber(leg.digger_hand, 0, LEGACY_TRACKS.digger_hand.maxRank), 0, LEGACY_TRACKS.digger_hand.maxRank),
      lineage_vault: clamp(saneNumber(leg.lineage_vault, 0, LEGACY_TRACKS.lineage_vault.maxRank), 0, LEGACY_TRACKS.lineage_vault.maxRank),
    };
    // وقت آخر مكافأة جواهر لليوم السابع (لجعل تكرارها أسبوعياً بحد واضح)
    p.visitGemsAt = saneNumber(p.visitGemsAt, 0, 1e15);
    // متجر التجميل: ملكية وتجهيز — لا يمنح أي قوة تنافسية
    const cos = p.cosmetics && typeof p.cosmetics === 'object' ? p.cosmetics : {};
    const ownedCosmetics = Array.isArray(cos.owned) ? cos.owned.filter((cid) => COSMETICS.some((c) => c.id === cid)) : [];
    p.cosmetics = { owned: ownedCosmetics, equipped: {} };
    for (const c of COSMETICS) {
      const eq = cos.equipped && cos.equipped[c.type];
      p.cosmetics.equipped[c.type] = ownedCosmetics.includes(eq) ? eq : null;
    }
    p.totalMinedLegacy = saneNumber(p.totalMined, 0, 1e15);
    p.lifetime = {
      totalMined: saneNumber(life.totalMined ?? p.totalMined, 0, 1e15),
      totalGems: saneNumber(life.totalGems, 0, 1e9),
      relicsFound: saneNumber(life.relicsFound, 0, 1e6),
      raidsWon: saneNumber(life.raidsWon, 0, 1e6),
      raidsLost: saneNumber(life.raidsLost, 0, 1e6),
      raidsDefended: saneNumber(life.raidsDefended, 0, 1e6),
      bestStreak: saneNumber(life.bestStreak, 1, 7) || 1,
      daysVisited: saneNumber(life.daysVisited, 1, 1e5) || 1,
      seasonWins: saneNumber(life.seasonWins, 0, 1e4),
      titles: Array.isArray(life.titles) && life.titles.length ? life.titles.filter((t) => TITLES.some((x) => x.id === t)) : ['novice'],
    };
    if (!p.lifetime.titles.length) p.lifetime.titles = ['novice'];
    p.regionId = REGIONS.some((r) => r.id === p.regionId) ? p.regionId : REGIONS[0].id;
    p.relics = p.relics && typeof p.relics === 'object' && !Array.isArray(p.relics) ? p.relics : {};
    for (const [rid, entry] of Object.entries(p.relics)) {
      if (!RELICS[rid]) { delete p.relics[rid]; continue; }
      p.relics[rid] = {
        count: saneNumber(entry && entry.count, 1, 1e6) || 1,
        firstAt: saneNumber(entry && entry.firstAt, ts, 1e15) || ts,
      };
    }
    // المناطق تتتبع تقدّم الدورة (runMined)، مع احتياط lifetime للحسابات القديمة جداً.
    // نُنقّي المعرفات المكرّرة/غير الصالحة حتى لا يخدع العدّاد شرطَ «كل المناطق».
    const storedRegions = Array.isArray(p.regionsUnlocked)
      ? [...new Set(p.regionsUnlocked.filter((r) => REGIONS.some((x) => x.id === r)))]
      : [];
    p.regionsUnlocked = storedRegions.length
      ? storedRegions
      : unlockedRegions(hadRebirthField ? p.runMined : p.lifetime.totalMined);
    p.title = TITLES.some((t) => t.id === p.title) ? p.title : 'novice';
    if (!p.lifetime.titles.includes(p.title)) p.lifetime.titles.push(p.title);
    p.shieldUntil = saneNumber(p.shieldUntil, 0, 1e15);
    p.boostUntil = saneNumber(p.boostUntil, 0, 1e15);
    p.friends = Array.isArray(p.friends) ? [...new Set(p.friends.filter((f) => typeof f === 'string' && f !== id))].slice(0, REFERRAL.maxFriends) : [];
    p.referredBy = typeof p.referredBy === 'string' ? p.referredBy : null;
    p.notices = Array.isArray(p.notices) ? p.notices.slice(-20) : [];
    p.actionLog = Array.isArray(p.actionLog) ? p.actionLog.slice(-100) : [];
    p.dailyAt = saneNumber(p.dailyAt, 0, 1e15);
    p.visitAt = saneNumber(p.visitAt, 0, 1e15);
    p.visitStreak = clamp(saneNumber(p.visitStreak, 0, 7), 0, 7);
    p.lastGemAt = saneNumber(p.lastGemAt, 0, 1e15);
    p.lastRelicAt = saneNumber(p.lastRelicAt, 0, 1e15);
    // ترحيل محافظ للحسابات القائمة عند الإطلاق: من حقّق شروط المناطق والترقيات
    // يحصل على أهلية بعث أولى مكافئة (نعترف بالجهد السابق دون ادّعاء سجل يدوي وهمي).
    if (!hadRebirthField && qualifiesForRebirthSeed(p)) {
      p.runMined = Math.min(p.lifetime.totalMined, rebirthThreshold(0));
      p.runManualMined = seedManualMined();
      p.rebirthSeeded = true;
    }
    p.milestonesClaimed = Array.isArray(p.milestonesClaimed) ? p.milestonesClaimed.filter((m) => MILESTONES.some((x) => x.id === m)) : [];
    p.groupClaims = p.groupClaims && typeof p.groupClaims === 'object' ? p.groupClaims : { weekId: weekId(ts), ids: [] };
    if (!Array.isArray(p.groupClaims.ids)) p.groupClaims.ids = [];
    p.groupChestWeek = saneNumber(p.groupChestWeek, -1, 1e9);
    p.incoming = Array.isArray(p.incoming) ? p.incoming.slice(-RAID.logLimit) : [];
    p.outgoing = Array.isArray(p.outgoing) ? p.outgoing.slice(-RAID.logLimit) : [];
    p.raid = p.raid && typeof p.raid === 'object' ? p.raid : {};
    p.raid.lastAt = saneNumber(p.raid.lastAt, 0, 1e15);
    // ترحيل: كان يُحتسب النجاح فقط (winsToday)؛ صار سقف الغارات على المحاولات.
    p.raid.attemptsToday = saneNumber(p.raid.attemptsToday ?? p.raid.winsToday, 0, 1000);
    if (p.raid.winsToday !== undefined) delete p.raid.winsToday;
    p.raid.day = saneNumber(p.raid.day, dayId(ts), 1e9);
    p.raid.targets = p.raid.targets && typeof p.raid.targets === 'object' ? p.raid.targets : {};
    p.inviteGems = p.inviteGems && typeof p.inviteGems === 'object' ? p.inviteGems : { day: dayId(ts), gems: 0 };
    p.season = p.season && typeof p.season === 'object' ? p.season : { weekId: weekId(ts), score: 0 };
    p.season.score = saneNumber(p.season.score, 0, 1e15);
    p.lastSeason = p.lastSeason || null;
    p.welcomeGift = Boolean(p.welcomeGift);
    p.tutorialDone = Boolean(p.tutorialDone);
    delete p.totalMinedLegacy;
    delete p.updatedAt;
    delete p.gold;
    delete p.pickaxe;
    return p;
  }

  function freshPlayer({ id, name, photoUrl, mode, ts }) {
    const region = REGIONS[0];
    const p = normalizePlayer({
      playerId: id,
      name,
      photoUrl,
      mode,
      createdAt: ts,
      lastSeen: ts,
      lastTick: ts,
      idleCarry: 0,
      sessionEpoch: 0,
      coins: 0,
      gems: 0,
      equipment: { pickaxe: 1, lamp: 1, helmet: 1 },
      facilities: { cart: 1, smelter: 1, storage: 1 },
      workers: 0,
      regionId: region.id,
      regionsUnlocked: [region.id],
      relics: {},
      lifetime: { totalMined: 0, totalGems: 0, relicsFound: 0, raidsWon: 0, raidsLost: 0, raidsDefended: 0, bestStreak: 1, daysVisited: 0, seasonWins: 0, titles: ['novice'] },
      title: 'novice',
      dailyAt: 0,
      visitAt: 0,
      visitStreak: 0,
      milestonesClaimed: [],
      groupClaims: { weekId: weekId(ts), ids: [] },
      groupChestWeek: -1,
      incoming: [],
      outgoing: [],
      raid: { lastAt: 0, attemptsToday: 0, day: dayId(ts), targets: {} },
      inviteGems: { day: dayId(ts), gems: 0 },
      season: { weekId: weekId(ts), score: 0 },
      lastSeason: null,
      welcomeGift: false,
      tutorialDone: false,
      notices: [],
      actionLog: [],
    }, id);
    return p;
  }

  // -------------------------------------------------------------------------
  // الصيانة الدورية: المواسم، هدف الجماعة، الصندوق الجماعي
  // -------------------------------------------------------------------------

  function ensureMeta(doc, ts) {
    const meta = doc.meta || (doc.meta = {});
    if (!meta.season || typeof meta.season !== 'object') meta.season = { weekId: weekId(ts), scores: {} };
    if (!meta.season.scores || typeof meta.season.scores !== 'object') meta.season.scores = {};
    if (!Array.isArray(meta.seasons)) meta.seasons = [];
    if (!meta.group || typeof meta.group !== 'object') meta.group = { weekId: weekId(ts), contributed: 0, byPlayer: {} };
    if (!meta.group.byPlayer || typeof meta.group.byPlayer !== 'object') meta.group.byPlayer = {};
    return meta;
  }

  /**
   * الصيانة الدورية: تدوير الموسم/هدف المجموعة/الصندوق + تنظيف الضيوف التائهين.
   * تُرجع true إذا غيّرت شيئاً يحتاج تثبيتاً على المخزن الدائم (تُستخدم في leaderboard).
   */
  function maintenance(doc, ts) {
    const meta = ensureMeta(doc, ts);
    const wk = weekId(ts);
    let changed = false;

    // نهاية الموسم: أرشفة النتائج وحفظ الإنجاز الدائم
    if (meta.season.weekId !== wk) {
      const prev = meta.season;
      const sorted = Object.entries(prev.scores || {}).sort((a, b) => b[1] - a[1]);
      if (sorted.length) {
        meta.seasons = [...meta.seasons, {
          weekId: prev.weekId,
          winnerId: sorted[0][0],
          winnerScore: sorted[0][1],
          participants: sorted.length,
        }].slice(-6);
        sorted.forEach(([id, score], idx) => {
          const p = playerOf(doc, id);
          if (!p) return;
          p.lastSeason = { weekId: prev.weekId, rank: idx + 1, score, total: sorted.length };
          // جوائز نهاية الموسم: تتويج للأول/أفضل 10% + جائزة مشاركة عند العتبة.
          const podium = seasonRewardFor(idx, sorted.length);
          const participation = score >= SEASON_REWARDS.participationScore ? SEASON_REWARDS.participationGems : 0;
          const gems = Math.max(podium ? podium.gems : 0, participation);
          if (gems > 0) {
            addGems(doc, p, gems, { ts, season: false });
            p.lastSeason.reward = { kind: podium ? podium.kind : 'participation', gems };
            pushNotice(p, 'season_reward', { weekId: prev.weekId, rank: idx + 1, gems, kind: p.lastSeason.reward.kind }, ts);
          }
          if (idx === 0) {
            p.lifetime.seasonWins += 1;
            pushNotice(p, 'season_win', { weekId: prev.weekId, rank: 1, score, total: sorted.length }, ts);
          } else if (idx < 3) {
            pushNotice(p, 'season_top', { weekId: prev.weekId, rank: idx + 1, score, total: sorted.length }, ts);
          }
          p.season = { weekId: wk, score: 0 };
        });
      }
      meta.season = { weekId: wk, scores: {} };
      changed = true;
    }

    // هدف الجماعة الأسبوعي
    if (meta.group.weekId !== wk) {
      meta.group = { weekId: wk, contributed: 0, byPlayer: {} };
      changed = true;
    }

    // الصندوق الجماعي عند بلوغ الهدف الإجمالي وتوفّر مساهمين كافيين: مرة لكل مساهم أسبوعياً
    const chest = groupChestStatus(meta.group);
    if (chest.eligible) {
      for (const [id, contribution] of Object.entries(meta.group.byPlayer)) {
        if (!contribution || contribution <= 0) continue;
        const p = playerOf(doc, id);
        if (!p || p.groupChestWeek === wk) continue;
        p.groupChestWeek = wk;
        addGems(doc, p, GROUP_GOAL.chestGems, { ts, season: false });
        pushNotice(p, 'group_chest', { gems: GROUP_GOAL.chestGems, target: GROUP_GOAL.target, contribution }, ts);
        changed = true;
      }
    }

    // تنظيف ضيوف التطوير الفارغين المنقطعين (مرة كل ساعة على الأكثر — لا يمسّ تيليجرام)
    if (!meta.lastPrune || ts - meta.lastPrune >= HOUR_MS) {
      meta.lastPrune = ts;
      if (pruneStaleGuests(doc, ts)) changed = true;
    }

    return changed;
  }

  /** يحذف حسابات الضيوف بلا أي تقدّم ومنقطعة منذ 30 يوماً (بقايا فتحات المتصفح). */
  function pruneStaleGuests(doc, ts) {
    const CUTOFF = 30 * DAY_MS;
    let pruned = false;
    for (const [id, raw] of Object.entries(doc.players)) {
      if (!raw || raw.mode !== 'guest') continue;
      const lastSeen = Number(raw.lastSeen) || Number(raw.createdAt) || 0;
      if (ts - lastSeen < CUTOFF) continue;
      const coins = Number(raw.coins) || 0;
      const gems = Number(raw.gems) || 0;
      const workers = Number(raw.workers) || 0;
      const totalMined = (raw.lifetime && Number(raw.lifetime.totalMined)) || Number(raw.totalMined) || 0;
      const relics = raw.relics && typeof raw.relics === 'object' ? Object.keys(raw.relics).length : 0;
      const friends = Array.isArray(raw.friends) ? raw.friends.length : 0;
      if (coins > 0 || gems > 0 || workers > 0 || totalMined > 0 || relics > 0 || friends > 0) continue;
      delete doc.players[id];
      pruned = true;
    }
    return pruned;
  }

  // -------------------------------------------------------------------------
  // أدوات اللاعب
  // -------------------------------------------------------------------------

  function pushNotice(p, type, data, ts) {
    p.notices.push({ id: `${type}_${ts}_${Math.floor(rng() * 1e4)}`, type, data, at: ts });
    if (p.notices.length > 20) p.notices = p.notices.slice(-20);
  }

  function addSeason(doc, p, points, ts) {
    if (!points) return;
    // لاعب عائد بعد غياب: نسخة أسبوعه قديمة، فنبدأ أسبوعه عند أول نقاط جديدة
    // حتى لا تضيع نقاطه في الترتيب ولا تختلط بنقاط موسم سابق.
    const wk = weekId(ts);
    if (p.season.weekId !== wk) p.season = { weekId: wk, score: 0 };
    p.season.score += points;
    const meta = ensureMeta(doc, ts);
    meta.season.scores[p.playerId] = p.season.score;
  }

  function addCoins(doc, p, amount, ts, { mined = true, manual = false, season = true, group = true } = {}) {
    const value = Math.floor(amount);
    if (value <= 0) return 0;
    p.coins = Math.min(1e15, p.coins + value);
    if (mined) {
      p.lifetime.totalMined += value;
      // عدّاد الدورة: يفتح المناطق ويؤهّل للبعث. التعدين اليدوي يُحتسب منفصلاً.
      p.runMined = Math.min(RUN_MINED_CAP, (p.runMined || 0) + value);
      if (manual) p.runManualMined = Math.min(RUN_MINED_CAP, (p.runManualMined || 0) + value);
      if (season) addSeason(doc, p, value, ts);
      if (group) {
        const meta = ensureMeta(doc, ts);
        meta.group.contributed += value;
        meta.group.byPlayer[p.playerId] = (meta.group.byPlayer[p.playerId] || 0) + value;
      }
    }
    return value;
  }

  function addGems(doc, p, amount, { ts = now(), season = true } = {}) {
    const value = Math.floor(amount);
    if (value <= 0) return 0;
    p.gems = Math.min(1e7, p.gems + value);
    p.lifetime.totalGems += value;
    if (season) addSeason(doc, p, value * 250, ts);
    return value;
  }

  function grantRelic(doc, p, relicId, ts) {
    const def = RELICS[relicId];
    if (!def) return null;
    const existing = p.relics[relicId];
    p.lastRelicAt = ts;
    p.runRelics = Math.min(1e6, (p.runRelics || 0) + 1);
    if (existing) {
      existing.count += 1;
      const dupeGems = RARITIES[def.rarity].dupeGems;
      addGems(doc, p, dupeGems, { ts });
      addSeason(doc, p, 500, ts);
      p.lifetime.relicsFound += 1;
      return { relic: def, isNew: false, dupeGems };
    }
    p.relics[relicId] = { count: 1, firstAt: ts };
    p.lifetime.relicsFound += 1;
    addSeason(doc, p, 500, ts);
    return { relic: def, isNew: true, dupeGems: 0 };
  }

  function applyIdle(doc, p, ts) {
    const anchor = p.lastTick || ts;
    const elapsed = Math.max(0, (ts - anchor) / 1000);
    // لا نُقدّم وقت آخر احتساب قبل مرور ثانية كاملة: سابقاً كان أي نداء أقصر من
    // ثانية (نقر سريع) يُصفّر دخل العمّال تماماً لأن lastTick كان يتقدّم دائماً.
    if (elapsed < 1) return null;
    p.lastTick = ts;

    const capHours = offlineCapHours(p);
    const effective = Math.min(elapsed, capHours * 3600);
    const rate = powerOf(p, ts).idlePerSec * offlineIncomeMult(p);
    // نُرحّل كسر العملة المتبقّي بدل إهداره في التقريب عند كل نداء.
    const exact = rate * effective + (p.idleCarry || 0);
    const coins = Math.floor(exact);
    p.idleCarry = Math.min(Math.max(exact - coins, 0), 1);
    // يمنح دخل العمّال عملات ويرفع مجموع التعدين (فتُفتح المناطق)، لكنه لا يضخّم
    // هدف الجماعة الأسبوعي ولا نقاط الموسم حتى لا يحصد اللاعب الخامل السباق.
    if (coins > 0) addCoins(doc, p, coins, ts, { mined: true, season: false, group: false });
    return {
      coins,
      seconds: Math.floor(effective),
      capped: elapsed > capHours * 3600,
      capHours,
      rate,
    };
  }

  function grantVisitIfDue(doc, p, ts) {
    if (p.visitAt && ts - p.visitAt < DAILY.cooldownMs) return null;
    p.visitStreak = visitStreakAfter(p.visitAt, p.visitStreak, ts);
    // اليوم السابع يدخل في دورة أسبوعية: جواهره مرة كل 7 أيام، وباقي الزيارات عملات.
    const { reward, repeat } = visitDayReward(p.visitStreak, p.visitGemsAt, ts);
    if (!reward) return null;
    p.visitAt = ts;
    p.lifetime.daysVisited += 1;
    p.lifetime.bestStreak = Math.max(p.lifetime.bestStreak, p.visitStreak);
    if (reward.gems && !repeat) p.visitGemsAt = ts;
    const granted = { day: p.visitStreak, coins: 0, gems: 0, repeat: Boolean(repeat) };
    if (reward.coins) granted.coins = addCoins(doc, p, reward.coins, ts, { mined: false });
    if (reward.gems) granted.gems = addGems(doc, p, reward.gems, { ts, season: false });
    pushNotice(p, 'visit', granted, ts);
    return granted;
  }

  function unlockRegions(doc, p, ts) {
    // فتح المناطق يتبع تقدّم الدورة (runMined) لا المجموع مدى الحياة.
    const unlocked = unlockedRegions(p.runMined);
    const fresh = unlocked.filter((id) => !p.regionsUnlocked.includes(id));
    if (!fresh.length) return [];
    p.regionsUnlocked = unlocked;
    const newest = fresh[fresh.length - 1];
    p.regionId = newest;
    pushNotice(p, 'region', { regionId: newest, region: REGIONS.find((r) => r.id === newest) }, ts);
    return fresh;
  }

  function touch(doc, p, ts, { visit = true } = {}) {
    maintenance(doc, ts);
    p.lastSeen = ts;
    const idle = applyIdle(doc, p, ts);
    const visitReward = visit ? grantVisitIfDue(doc, p, ts) : null;
    const regions = unlockRegions(doc, p, ts);
    return { idle, visitReward, regions };
  }

  // -------------------------------------------------------------------------
  // تكرار الطلبات (Idempotency) — نفس requestId لا يُنفَّذ مرتين
  // -------------------------------------------------------------------------

  function replay(p, requestId, type, ts) {
    if (!requestId || !REQUEST_ID_RE.test(requestId)) return null;
    // المطابقة تشمل نوع العملية: إعادة استخدام نفس المعرّف لعملية أخرى لا تُقبل.
    const entry = (p.actionLog || []).find((e) => e.id === requestId && e.type === type && ts - e.at < 60 * 60 * 1000);
    return entry ? entry.result : null;
  }

  function remember(p, requestId, type, result, ts) {
    if (!requestId || !REQUEST_ID_RE.test(requestId)) return;
    p.actionLog.push({ id: requestId, type, result, at: ts });
    p.actionLog = p.actionLog.filter((e) => ts - e.at < 60 * 60 * 1000).slice(-100);
  }

  // -------------------------------------------------------------------------
  // الحالة العامة والكاتالوج (لا أسرار ولا معادلات للعميل)
  // -------------------------------------------------------------------------

  function milestoneStatus(p) {
    const done = new Set(p.milestonesClaimed);
    return MILESTONES.map((m) => {
      const progress = milestoneProgress(p, m.type);
      return {
        id: m.id, name: m.name, emoji: m.emoji, type: m.type, threshold: m.threshold,
        progress: Math.min(progress, m.threshold),
        claimable: !done.has(m.id) && progress >= m.threshold,
        claimed: done.has(m.id),
        reward: m.reward,
      };
    });
  }

  function cycleGoalState(p) {
    const done = new Set(p.cycleGoalsClaimed || []);
    return CYCLE_GOALS.map((g) => {
      const progress = cycleGoalProgress(p, g.type);
      return {
        id: g.id, name: g.name, emoji: g.emoji, type: g.type, threshold: g.threshold,
        progress: Math.min(progress, g.threshold),
        claimable: !done.has(g.id) && progress >= g.threshold,
        claimed: done.has(g.id),
        reward: g.reward,
      };
    });
  }

  function upgradeState(p) {
    const out = {};
    for (const def of [...Object.values(EQUIPMENT), ...Object.values(FACILITIES)]) {
      const level = p[def.group === 'equipment' ? 'equipment' : 'facilities'][def.id];
      out[def.id] = {
        id: def.id, kind: def.group, level,
        maxLevel: def.maxLevel,
        maxed: level >= def.maxLevel,
        cost: level >= def.maxLevel ? null : upgradeCost(def.id, level),
        cost10: level >= def.maxLevel ? null : upgradeBatchCost(def.id, level, Math.min(10, def.maxLevel - level)),
        effect: def.effect(level),
        nextEffect: level >= def.maxLevel ? null : def.effect(level + 1),
      };
    }
    out.worker = {
      id: 'worker', kind: 'workers', count: p.workers, maxCount: WORKER.maxCount,
      maxed: p.workers >= WORKER.maxCount,
      cost: p.workers >= WORKER.maxCount ? null : workerCost(p.workers),
      cost10: p.workers >= WORKER.maxCount ? null : workerBatchCost(p.workers, Math.min(10, WORKER.maxCount - p.workers)),
      rate: powerOf(p, now()).workerEach,
    };
    out.boost = {
      id: 'boost', kind: 'gems', cost: BOOST.costGems, activeUntil: p.boostUntil,
      active: p.boostUntil > now(), canAfford: p.gems >= BOOST.costGems,
    };
    return out;
  }

  function publicState(doc, p, ts) {
    const power = powerOf(p, ts);
    const chances = findChances(p, ts);
    const capHours = offlineCapHours(p);
    const attemptsToday = p.raid.day === dayId(ts) ? p.raid.attemptsToday : 0;
    const protectedNew = p.lifetime.totalMined < RAID.newPlayerProtectionMined;
    const doneClaims = new Set((p.groupClaims.weekId === weekId(ts) ? p.groupClaims.ids : []));
    const group = ensureMeta(doc, ts).group;
    const myContribution = group.byPlayer[p.playerId] || 0;

    return {
      playerId: p.playerId,
      name: p.name,
      photoUrl: p.photoUrl,
      mode: p.mode,
      title: { id: p.title, ...(TITLES.find((t) => t.id === p.title) || TITLES[0]) },
      titlesOwned: [...p.lifetime.titles],
      coins: p.coins,
      gems: p.gems,
      workers: p.workers,
      equipment: { ...p.equipment },
      facilities: { ...p.facilities },
      region: {
        id: power.region.id, name: power.region.name, emoji: power.region.emoji,
        tagline: power.region.tagline, mult: power.region.coinMult, theme: power.region.theme,
        specialty: regionSpecialty(power.region.id),
      },
      regionsUnlocked: [...p.regionsUnlocked],
      relics: Object.entries(p.relics).map(([id, e]) => ({ id, count: e.count, firstAt: e.firstAt })),
      power: {
        manual: Math.floor(power.manual),
        manualExact: power.manual,
        idlePerSec: Math.floor(power.idlePerSec),
        workerEach: Math.floor(power.workerEach * 10) / 10,
        regionMult: power.region.coinMult,
        boostActive: power.boostActive,
        boostUntil: p.boostUntil,
        offlineCapHours: capHours,
        event: { id: power.event.id, name: power.event.name, emoji: power.event.emoji, desc: power.event.desc },
      },
      chances: {
        gemPerTap: chances.gemPerTap,
        relicPerTap: chances.relicPerTap,
        gemCooldownMs: FINDS.gemCooldownMs,
        relicCooldownMs: FINDS.relicCooldownMs,
      },
      upgrades: upgradeState(p),
      daily: {
        availableAt: p.dailyAt + DAILY.cooldownMs,
        available: ts - p.dailyAt >= DAILY.cooldownMs,
        cooldownMs: DAILY.cooldownMs,
        shieldMs: DAILY.shieldMs,
        rewards: DAILY.rewards.map((r) => ({ id: r.id, label: r.label, weight: r.weight })),
      },
      visit: {
        streak: p.visitStreak,
        best: p.lifetime.bestStreak,
        nextAt: p.visitAt + DAILY.cooldownMs,
        rewards: VISIT_REWARDS,
      },
      raid: {
        cooldownUntil: p.raid.lastAt + RAID.cooldownMs,
        cooldownMs: RAID.cooldownMs,
        attemptsToday,
        dailyCap: RAID.dailyAttempts,
        shieldUntil: p.shieldUntil,
        shieldCapMs: RAID.shieldCapMs,
        sharePct: RAID.sharePct,
        vaultPct: RAID.vaultPct,
        lossOnFail: protectedNew ? 0 : raidFailureLoss(p, ts),
        protected: protectedNew,
        protectionMined: RAID.newPlayerProtectionMined,
        perTargetCooldownMs: RAID.perTargetCooldownMs,
        revengeWindowMs: RAID.revengeWindowMs,
      },
      group: {
        weekId: weekId(ts),
        name: GROUP_GOAL.name,
        emoji: GROUP_GOAL.emoji,
        target: GROUP_GOAL.target,
        contributed: group.contributed,
        myContribution,
        chestReached: group.contributed >= GROUP_GOAL.target,
        chest: groupChestStatus(group),
        chestClaimed: p.groupChestWeek === weekId(ts),
        chestGems: GROUP_GOAL.chestGems,
        tiers: GROUP_GOAL.tiers.map((t) => ({
          id: t.id, label: t.label, contribution: t.contribution, gems: t.gems,
          claimed: doneClaims.has(t.id),
          claimable: !doneClaims.has(t.id) && myContribution >= t.contribution,
        })),
      },
      milestones: milestoneStatus(p),
      season: {
        weekId: weekId(ts), score: p.season.score,
        endsAt: (weekId(ts) + 1) * 7 * 24 * 3600 * 1000,
        rewards: SEASON_REWARDS,
      },
      lastSeason: p.lastSeason,
      rebirth: (() => {
        const st = rebirthConditions(p);
        const badge = rebirthBadge(p.rebirthCount);
        const goals = cycleGoalState(p);
        return {
          name: REBIRTH.name, emoji: REBIRTH.emoji,
          count: p.rebirthCount,
          threshold: st.threshold,
          runMined: p.runMined,
          runManualMined: p.runManualMined,
          runRelics: p.runRelics,
          manualThreshold: st.manualThreshold,
          manualBaseThreshold: REBIRTH.manualThreshold,
          manualShare: REBIRTH.manualShare,
          minPickaxe: REBIRTH.minPickaxe,
          minWorkers: REBIRTH.minWorkers,
          totalRegions: REGIONS.length,
          nextThreshold: rebirthThreshold((p.rebirthCount || 0) + 1),
          conditions: st.conditions,
          eligible: st.eligible,
          cores: st.cores,
          maxCores: REBIRTH.maxCores,
          seeded: p.rebirthSeeded,
          badge: badge.current,
          nextBadge: badge.next,
          cycleGoals: {
            total: goals.length,
            claimed: goals.filter((g) => g.claimed).length,
            allClaimed: goals.every((g) => g.claimed),
            goals,
          },
          keepNote: REBIRTH.keepNote,
          resetNote: REBIRTH.resetNote,
        };
      })(),
      legacy: (() => {
        const ranks = legacyRanks(p);
        return {
          cores: p.legacyCores,
          spent: Object.values(ranks).reduce((s, n) => s + n, 0),
          cost: LEGACY_COST,
          tracks: Object.values(LEGACY_TRACKS).map((t) => ({
            id: t.id, name: t.name, emoji: t.emoji, desc: t.desc, maxRank: t.maxRank,
            rank: ranks[t.id], maxed: ranks[t.id] >= t.maxRank,
            canBuy: p.legacyCores >= LEGACY_COST && ranks[t.id] < t.maxRank,
          })),
        };
      })(),
      cosmetics: {
        // حماية صريحة: حساب قادم بمخطط قديم لا يُسقط الرد (بدل 500 غير مفهوم).
        owned: [...(p.cosmetics?.owned || [])],
        equipped: { ...(p.cosmetics?.equipped || {}) },
        shop: COSMETICS.map((c) => ({
          id: c.id, type: c.type, name: c.name, emoji: c.emoji, cost: c.cost, desc: c.desc,
          owned: p.cosmetics.owned.includes(c.id),
        })),
      },
      tutorialDone: p.tutorialDone,
      stats: {
        totalMined: p.lifetime.totalMined,
        totalGems: p.lifetime.totalGems,
        relicsFound: p.lifetime.relicsFound,
        uniqueRelics: Object.keys(p.relics).length,
        totalRelics: Object.keys(RELICS).length,
        raidsWon: p.lifetime.raidsWon,
        raidsDefended: p.lifetime.raidsDefended,
        seasonWins: p.lifetime.seasonWins,
        bestStreak: p.lifetime.bestStreak,
        daysVisited: p.lifetime.daysVisited,
        rebirths: p.rebirthCount,
        legacyCores: p.legacyCores,
        wealthScore: Math.floor(p.coins + p.gems * 250),
        collectionScore: collectionScore(p),
        friends: p.friends.length,
      },
      goals: (() => {
        const nr = nextRegion(p.runMined);
        const nm = nextMilestone(p);
        return {
          nextRegion: nr ? { id: nr.id, name: nr.name, emoji: nr.emoji, unlockTotalMined: nr.unlockTotalMined, remaining: Math.max(0, nr.unlockTotalMined - p.runMined) } : null,
          nextMilestone: nm ? { id: nm.id, name: nm.name, emoji: nm.emoji, remaining: Math.max(0, nm.threshold - milestoneProgress(p, nm.type)) } : null,
        };
      })(),
      notices: p.notices.slice(-10),
      serverNow: ts,
    };
  }

  function catalog() {
    return {
      regions: REGIONS.map((r) => ({
        id: r.id, name: r.name, emoji: r.emoji, tagline: r.tagline,
        unlockTotalMined: r.unlockTotalMined, mult: r.coinMult, theme: r.theme,
        relics: r.relics, specialty: regionSpecialty(r.id),
      })),
      relics: Object.values(RELICS).map((r) => ({
        id: r.id, name: r.name, emoji: r.emoji, rarity: r.rarity, region: r.region, flavor: r.flavor,
      })),
      rarities: RARITIES,
      upgrades: [...Object.values(EQUIPMENT), ...Object.values(FACILITIES), WORKER].map((d) => ({
        id: d.id, group: d.group, name: d.name, emoji: d.emoji, desc: d.desc,
        maxLevel: d.maxLevel ?? d.maxCount ?? null,
        baseCost: d.baseCost, costMult: d.costMult, resource: d.resource || 'coins',
      })),
      boost: { id: BOOST.id, name: BOOST.name, emoji: BOOST.emoji, desc: BOOST.desc, costGems: BOOST.costGems, durationMs: BOOST.durationMs },
      events: EVENTS,
      currentEvent: eventOfWeek(now()),
      titles: TITLES,
      milestones: MILESTONES.map((m) => ({ id: m.id, name: m.name, emoji: m.emoji, type: m.type, threshold: m.threshold, reward: m.reward })),
      groupGoal: GROUP_GOAL,
      cosmetics: COSMETICS,
      rebirthRules: {
        name: REBIRTH.name, emoji: REBIRTH.emoji,
        baseThreshold: REBIRTH.baseThreshold, manualThreshold: REBIRTH.manualThreshold,
        manualShare: REBIRTH.manualShare,
        thresholdMult: REBIRTH.thresholdMult, minPickaxe: REBIRTH.minPickaxe,
        minWorkers: REBIRTH.minWorkers, maxCores: REBIRTH.maxCores,
        keepNote: REBIRTH.keepNote, resetNote: REBIRTH.resetNote,
      },
      legacyTracks: Object.values(LEGACY_TRACKS),
      seasonRewards: SEASON_REWARDS,
      visitRepeat: VISIT_REPEAT,
      raidRules: {
        cooldownMs: RAID.cooldownMs, dailyAttempts: RAID.dailyAttempts, sharePct: RAID.sharePct,
        vaultPct: RAID.vaultPct, minSuccess: RAID.minSuccess, maxSuccess: RAID.maxSuccess,
        shieldOnRaidMs: RAID.shieldOnRaidMs, shieldCapMs: RAID.shieldCapMs,
        failureLossPct: RAID.failureLossPct, newPlayerProtectionMined: RAID.newPlayerProtectionMined,
        revengeWindowMs: RAID.revengeWindowMs, minDefenderBalance: RAID.minDefenderBalance,
      },
      offline: { ...OFFLINE, baseCapHours: OFFLINE.baseCapHours },
      referral: { inviterGems: REFERRAL.inviterGems, inviteeGems: REFERRAL.inviteeGems, dailyCapGems: REFERRAL.dailyCapGems },
      botUsername,
    };
  }

  // -------------------------------------------------------------------------
  // الجلسة واللاعب
  // -------------------------------------------------------------------------

  async function session(identity, startParam = null) {
    const ts = now();
    return store.mutate((doc) => {
      maintenance(doc, ts);
      let p = playerOf(doc, identity.playerId);
      let isNew = false;
      if (!p) {
        p = freshPlayer({ id: identity.playerId, name: identity.name, photoUrl: identity.photoUrl, mode: identity.mode, ts });
        doc.players[p.playerId] = p;
        isNew = true;
      } else {
        p.name = identity.name || p.name;
        if (identity.photoUrl) p.photoUrl = identity.photoUrl;
        p.mode = identity.mode;
      }

      // إحالة صديق: تربط الصداقة وتمنح مكافأة متبادلة (بسقف يومي).
      // نربط الصداقة حتى للحسابات القائمة وليس للجديد فقط: كثير من اللاعبين يفتحون
      // اللعبة أولاً ثم يدخلون من رابط الدعوة، وكان الربط يُشترط به isNew فيفشل دائماً.
      // الربط والمكافأة يتمّان مرة واحدة لكل زوج (referredBy)، وبدون إحالة ذاتية.
      if (startParam) {
        const referrerId = parseReferral(startParam);
        const referrer = referrerId && referrerId !== p.playerId ? playerOf(doc, referrerId) : null;
        const alreadyLinked = referrer ? p.friends.includes(referrer.playerId) : false;
        const freeToLink = !p.referredBy || p.referredBy === referrer?.playerId;
        if (referrer && !alreadyLinked && freeToLink) {
          linkFriends(referrer, p);
          // المكافآت مرة واحدة فقط عند أول ربط حقيقي (لا تتكرر بإعادة فتح الرابط).
          if (!p.referredBy) {
            if (referrer.inviteGems.day !== dayId(ts)) referrer.inviteGems = { day: dayId(ts), gems: 0 };
            const reward = Math.min(REFERRAL.inviterGems, REFERRAL.dailyCapGems - referrer.inviteGems.gems);
            if (reward > 0) {
              referrer.inviteGems.gems += reward;
              addGems(doc, referrer, reward, { ts, season: false });
              pushNotice(referrer, 'invite_reward', { gems: reward, name: p.name }, ts);
            }
            p.referredBy = referrer.playerId;
            addGems(doc, p, REFERRAL.inviteeGems, { ts, season: false });
          }
        }
      }

      if (!p.welcomeGift) {
        p.welcomeGift = true;
        addCoins(doc, p, 50, ts, { mined: false });
        pushNotice(p, 'welcome', { coins: 50 }, ts);
      }

      const upkeep = touch(doc, p, ts);
      return { player: publicState(doc, p, ts), isNew, mode: identity.mode, idle: upkeep.idle, visitReward: upkeep.visitReward, catalog: catalog(), sessionEpoch: p.sessionEpoch };
    });
  }

  function parseReferral(value) {
    if (typeof value !== 'string' || !value.startsWith(REFERRAL.prefix)) return null;
    const id = value.slice(REFERRAL.prefix.length);
    return /^[a-zA-Z0-9_-]{2,40}$/.test(id) ? id : null;
  }

  function linkFriends(a, b) {
    if (!a.friends.includes(b.playerId)) a.friends.push(b.playerId);
    if (!b.friends.includes(a.playerId)) b.friends.push(a.playerId);
    a.friends = a.friends.slice(-REFERRAL.maxFriends);
    b.friends = b.friends.slice(-REFERRAL.maxFriends);
  }

  async function getState(playerId) {
    const ts = now();
    return store.mutate((doc) => {
      const p = playerOf(doc, playerId);
      if (!p) fail('لاعب غير معروف', 401, 'unknown_player');
      const upkeep = touch(doc, p, ts);
      return { player: publicState(doc, p, ts), idle: upkeep.idle, visitReward: upkeep.visitReward, catalog: catalog() };
    });
  }

  // -------------------------------------------------------------------------
  // التعدين
  // -------------------------------------------------------------------------

  async function mine(playerId, taps = 1, requestId = null) {
    const ts = now();
    const count = clamp(Math.floor(Number(taps) || 0), 1, 25);
    return store.mutate((doc) => {
      const p = playerOf(doc, playerId);
      if (!p) fail('لاعب غير معروف', 401, 'unknown_player');
      touch(doc, p, ts);

      const cached = replay(p, requestId, 'mine', ts);
      if (cached) return { result: cached, player: publicState(doc, p, ts), replayed: true };

      const power = powerOf(p, ts);
      const chances = findChances(p, ts);
      const coins = Math.floor(power.manual * count);
      // التعدين النقر/اليدوي النشط: يُحتسب في عدّاد الدورة اليدوي (شرط البعث).
      addCoins(doc, p, coins, ts, { mined: true, manual: true });

      let gemResult = null;
      let relicResult = null;

      for (let i = 0; i < count; i++) {
        if (!gemResult && ts - p.lastGemAt > FINDS.gemCooldownMs && rng() < chances.gemPerTap) {
          const gems = FINDS.gemMinGems + Math.floor(rng() * (FINDS.gemMaxGems - FINDS.gemMinGems + 1));
          p.lastGemAt = ts;
          addGems(doc, p, gems, { ts });
          gemResult = { gems };
        }
        if (!relicResult && ts - p.lastRelicAt > FINDS.relicCooldownMs && rng() < chances.relicPerTap) {
          const relicId = pickRelic(p.regionId, rng);
          relicResult = grantRelic(doc, p, relicId, ts);
        }
      }

      const result = { coins, gems: gemResult ? gemResult.gems : 0, relic: relicResult ? { ...relicResult.relic } : null, relicIsNew: relicResult ? relicResult.isNew : false, dupeGems: relicResult ? relicResult.dupeGems : 0 };
      remember(p, requestId, 'mine', result, ts);
      return { result, player: publicState(doc, p, ts) };
    });
  }

  // -------------------------------------------------------------------------
  // الترقيات
  // -------------------------------------------------------------------------

  async function upgrade(playerId, item, amount = 1, requestId = null) {
    const ts = now();
    const qty = clamp(Math.floor(Number(amount) || 1), 1, 25);
    return store.mutate((doc) => {
      const p = playerOf(doc, playerId);
      if (!p) fail('لاعب غير معروف', 401, 'unknown_player');
      touch(doc, p, ts);

      const cached = replay(p, requestId, `upgrade:${item}`, ts);
      if (cached) return { result: cached, player: publicState(doc, p, ts), replayed: true };

      let result;
      if (item === 'boost') {
        if (p.gems < BOOST.costGems) fail(`تحتاج ${BOOST.costGems} جواهر لتشغيل الحماسة`, 400, 'insufficient_gems');
        p.gems -= BOOST.costGems;
        p.boostUntil = Math.max(p.boostUntil, ts) + BOOST.durationMs;
        result = { item, kind: 'gems', cost: BOOST.costGems, resource: 'gems', boostUntil: p.boostUntil };
      } else if (item === 'worker') {
        if (p.workers >= WORKER.maxCount) fail('وصلت للحد الأقصى من العمال', 400, 'max_level');
        const maxQty = Math.min(qty, WORKER.maxCount - p.workers);
        const cost = workerBatchCost(p.workers, maxQty);
        if (p.coins < cost) fail(`تحتاج ${cost} عملة — ينقصك ${cost - p.coins}`, 400, 'insufficient_coins');
        p.coins -= cost;
        p.workers += maxQty;
        result = { item, kind: 'workers', amount: maxQty, count: p.workers, cost, resource: 'coins' };
      } else {
        const def = EQUIPMENT[item] || FACILITIES[item];
        if (!def) fail('ترقية غير معروفة', 400, 'unknown_upgrade');
        const bucket = def.group === 'equipment' ? p.equipment : p.facilities;
        const level = bucket[item];
        if (level >= def.maxLevel) fail('هذه الترقية وصلت للحد الأقصى', 400, 'max_level');
        const maxQty = Math.min(qty, def.maxLevel - level);
        const cost = upgradeBatchCost(item, level, maxQty);
        if (p.coins < cost) fail(`تحتاج ${cost} عملة — ينقصك ${cost - p.coins}`, 400, 'insufficient_coins');
        p.coins -= cost;
        bucket[item] = level + maxQty;
        result = { item, kind: def.group, amount: maxQty, level: bucket[item], cost, resource: 'coins' };
      }

      remember(p, requestId, `upgrade:${item}`, result, ts);
      return { result, player: publicState(doc, p, ts) };
    });
  }

  // -------------------------------------------------------------------------
  // الغارات
  // -------------------------------------------------------------------------

  function todayKey(ts) {
    return dayId(ts);
  }

  async function raid(playerId, targetId, requestId = null, { revenge = false } = {}) {
    const ts = now();
    return store.mutate((doc) => {
      const attacker = playerOf(doc, playerId);
      if (!attacker) fail('لاعب غير معروف', 401, 'unknown_player');
      touch(doc, attacker, ts);

      const cached = replay(attacker, requestId, 'raid', ts);
      if (cached) return { result: cached, player: publicState(doc, attacker, ts), replayed: true };

      if (!targetId || typeof targetId !== 'string' || targetId === playerId) fail('هدف غير صالح', 400, 'bad_target');
      const target = playerOf(doc, targetId);
      if (!target) fail('اللاعب غير موجود', 404, 'target_not_found');
      touch(doc, target, ts);

      // حماية المبتدئين: من لم يتعدَّ عتبة التعدين لا يهاجم ولا يُهاجَم (عدا الثأر)
      if (!revenge && attacker.lifetime.totalMined < RAID.newPlayerProtectionMined) {
        fail('تحتاج مزيداً من التعدين قبل بدء الغارات', 403, 'attacker_protected');
      }
      if (!revenge && target.lifetime.totalMined < RAID.newPlayerProtectionMined) {
        fail('هذا اللاعب جديد وما زال محمياً 🛡️', 403, 'target_protected');
      }

      // إعادة الغارة مسموحة ضمن نافذة زمنية حتى لو كان المهاجم محمياً،
      // لأنها حق طبيعي للهدف الذي سُرق منه (سجل المهاجم contains الضربة التي تلقاها).
      let isRevenge = false;
      if (revenge) {
        const entry = attacker.incoming.find((e) => e.opponentId === target.playerId && e.success && !e.revenged && ts < e.revengeUntil);
        isRevenge = Boolean(entry);
        if (!isRevenge) fail('لا يمكن الرد الآن — لا توجد غارة أخيرة عليك من هذا اللاعب', 400, 'no_revenge');
      }

      if (!isRevenge && target.shieldUntil > ts) {
        const mins = Math.ceil((target.shieldUntil - ts) / 60000);
        fail(`الخصم محمي الآن 🛡️ (${mins} دقيقة متبقية)`, 423, 'shielded');
      }
      if (ts - attacker.raid.lastAt < RAID.cooldownMs) {
        const secs = Math.ceil((RAID.cooldownMs - (ts - attacker.raid.lastAt)) / 1000);
        fail(`استرح قليلاً — الغارة التالية بعد ${secs} ثانية`, 429, 'raid_cooldown');
      }
      if (attacker.raid.day !== todayKey(ts)) {
        attacker.raid.day = todayKey(ts);
        attacker.raid.attemptsToday = 0;
      }
      if (attacker.raid.attemptsToday >= RAID.dailyAttempts) {
        fail(`بلغت حد ${RAID.dailyAttempts} محاولات اليوم — عد غداً`, 429, 'daily_cap');
      }
      const targetAt = attacker.raid.targets[targetId] || 0;
      if (!isRevenge && ts - targetAt < RAID.perTargetCooldownMs) {
        const mins = Math.ceil((RAID.perTargetCooldownMs - (ts - targetAt)) / 60000);
        fail(`لا تُكرر الغارة على نفس اللاعب قبل ${mins} دقيقة`, 429, 'target_cooldown');
      }
      if (target.coins < RAID.minDefenderBalance) {
        fail('الخصم شبه مفلس — لا شيء يستحق المخاطرة 😅', 400, 'target_broke');
      }

      const chance = raidSuccessChance(attacker, target, isRevenge, ts);
      const success = rng() < chance;
      // سجل الضحية يشير إلى المهاجم (من هاجمني)
      const entryBase = {
        at: ts,
        opponentId: attacker.playerId,
        opponentName: attacker.name,
        opponentEmoji: regionById(attacker.regionId).emoji,
        success,
        amount: 0,
        revenge: isRevenge,
        revengeUntil: ts + RAID.revengeWindowMs,
        revenged: false,
      };

      attacker.raid.lastAt = ts;
      attacker.raid.attemptsToday += 1;
      attacker.raid.targets[targetId] = ts;
      // تنظيف سجل الأهداف القديم
      const targetEntries = Object.entries(attacker.raid.targets).filter(([, at]) => ts - at < 24 * 60 * 60 * 1000).slice(-60);
      attacker.raid.targets = Object.fromEntries(targetEntries);
      // الهجوم يكسر درعك: لا تحتمي وتغزو في الوقت نفسه
      attacker.shieldUntil = 0;

      let stolen = 0;
      let lost = 0;
      let defenseReward = 0;
      let won = false;
      let message;
      if (success) {
        stolen = stealAmount(attacker, target, isRevenge, ts);
        if (stolen >= RAID.minSteal) {
          won = true;
          target.coins -= stolen;
          addCoins(doc, attacker, stolen, ts, { mined: false });
          attacker.lifetime.raidsWon += 1;
          target.lifetime.raidsDefended += 1;
          addSeason(doc, attacker, raidSeasonPoints(stolen, attacker, ts), ts);
          const shieldMs = RAID.shieldOnRaidMs + (EQUIPMENT.helmet.effect(target.equipment.helmet).shieldBonusMs || 0);
          target.shieldUntil = Math.min(ts + RAID.shieldCapMs, Math.max(target.shieldUntil, ts) + shieldMs);
          message = isRevenge
            ? `ثأر ناجح! استعدت ${stolen} عملة ⚔️`
            : `غنيمة! أخذت ${stolen} عملة من ${target.name} 🏆`;
        } else {
          message = 'الغارة نجحت لكن الخصم لا يملك ما يستحق النقل 🤷';
        }
      }
      if (!won) {
        attacker.lifetime.raidsLost += 1;
        if (!isRevenge && !success) {
          // مخاطرة حقيقية: خسارة من مخزون المهاجم، 60% منها تعويض للضحية والباقي يُحرق
          lost = raidFailureLoss(attacker, ts);
          if (lost > 0) {
            attacker.coins -= lost;
            defenseReward = Math.floor(lost * RAID.defenseRewardShare);
            if (defenseReward > 0) addCoins(doc, target, defenseReward, ts, { mined: false });
            message = `فشلت الغارة — خسرت ${lost} عملة وتعويض دفاع ${defenseReward} 🛡️`;
          } else {
            message = 'فشلت الغارة — الخصم كان مستعداً 🛡️';
          }
        } else if (isRevenge) {
          message = 'فشل الثأر — بلا خسارة هذه المرة 🛡️';
        }
      }
      entryBase.success = won;
      entryBase.amount = stolen;
      entryBase.loss = lost;
      entryBase.defenseReward = defenseReward;

      const attackerEntry = { at: ts, opponentId: target.playerId, opponentName: target.name, opponentEmoji: regionById(target.regionId).emoji, success: won, amount: stolen, lost, revenge: isRevenge };
      attacker.outgoing = [...attacker.outgoing, attackerEntry].slice(-RAID.logLimit);
      target.incoming = [...target.incoming, entryBase].slice(-RAID.logLimit);
      if (isRevenge) {
        // علّم غارة الخصم في سجل المهاجم بأنه تم الرد عليها
        for (const e of attacker.incoming) {
          if (e.opponentId === target.playerId && e.success && !e.revenged) { e.revenged = true; break; }
        }
      }
      // الهدف يعرف أنه سُرق (في سجل الغارات) بدون إشعارات إجبارية
      const result = { success: won, stolen, lost, defenseReward, message, chance: Math.round(chance * 100), shieldUntil: target.shieldUntil, attemptsToday: attacker.raid.attemptsToday, dailyCap: RAID.dailyAttempts };
      remember(attacker, requestId, 'raid', result, ts);
      return { result, player: publicState(doc, attacker, ts), target: { playerId: target.playerId, name: target.name, shieldUntil: target.shieldUntil } };
    });
  }

  // -------------------------------------------------------------------------
  // الاكتشاف اليومي
  // -------------------------------------------------------------------------

  async function dailyDig(playerId, requestId = null) {
    const ts = now();
    return store.mutate((doc) => {
      const p = playerOf(doc, playerId);
      if (!p) fail('لاعب غير معروف', 401, 'unknown_player');
      touch(doc, p, ts);

      const cached = replay(p, requestId, 'daily', ts);
      if (cached) return { result: cached, player: publicState(doc, p, ts), replayed: true };

      if (ts - p.dailyAt < DAILY.cooldownMs) {
        const mins = Math.ceil((DAILY.cooldownMs - (ts - p.dailyAt)) / 60000);
        fail(`حفرة اليوم التالية بعد ${mins} دقيقة`, 429, 'daily_cooldown');
      }
      p.dailyAt = ts;

      const total = DAILY.rewards.reduce((s, r) => s + r.weight, 0);
      let roll = rng() * total;
      let picked = DAILY.rewards[0];
      for (const r of DAILY.rewards) { roll -= r.weight; if (roll <= 0) { picked = r; break; } }

      const region = regionById(p.regionId);
      const result = { type: picked.id, label: picked.label };
      if (picked.id === 'coins_small') {
        result.coins = addCoins(doc, p, Math.floor(DAILY.coinsBase * region.coinMult), ts, { mined: false });
      } else if (picked.id === 'gems') {
        result.gems = addGems(doc, p, DAILY.gemsMin + Math.floor(rng() * (DAILY.gemsMax - DAILY.gemsMin + 1)), { ts, season: false });
      } else if (picked.id === 'relic') {
        const found = grantRelic(doc, p, pickRelic(p.regionId, rng), ts);
        result.relic = { ...found.relic };
        result.isNew = found.isNew;
        result.dupeGems = found.dupeGems;
      } else if (picked.id === 'boost') {
        p.boostUntil = Math.max(p.boostUntil, ts) + DAILY.boostMs;
        result.boostMs = DAILY.boostMs;
        result.boostUntil = p.boostUntil;
      }

      // درع قصير يُكتسب باللعب العادي
      const shieldMs = DAILY.shieldMs;
      p.shieldUntil = Math.min(ts + 8 * 60 * 60 * 1000, Math.max(p.shieldUntil, ts) + shieldMs);
      result.shieldMs = shieldMs;
      result.shieldUntil = p.shieldUntil;

      remember(p, requestId, 'daily', result, ts);
      return { result, player: publicState(doc, p, ts) };
    });
  }

  // -------------------------------------------------------------------------
  // المطالبات (إنجازات + جماعة)
  // -------------------------------------------------------------------------

  async function claim(playerId, kind, id, requestId = null) {
    const ts = now();
    return store.mutate((doc) => {
      const p = playerOf(doc, playerId);
      if (!p) fail('لاعب غير معروف', 401, 'unknown_player');
      touch(doc, p, ts);

      const cached = replay(p, requestId, `claim:${kind}:${id}`, ts);
      if (cached) return { result: cached, player: publicState(doc, p, ts), replayed: true };

      let result;
      if (kind === 'milestone') {
        const def = MILESTONES.find((m) => m.id === id);
        if (!def) fail('إنجاز غير معروف', 400, 'unknown_milestone');
        if (p.milestonesClaimed.includes(id)) fail('استلمت هذه المكافأة مسبقاً', 400, 'already_claimed');
        if (milestoneProgress(p, def.type) < def.threshold) fail('لم تصل للهدف بعد', 400, 'not_ready');
        p.milestonesClaimed.push(id);
        result = { kind, id, reward: {} };
        if (def.reward.coins) result.reward.coins = addCoins(doc, p, def.reward.coins, ts, { mined: false });
        if (def.reward.gems) result.reward.gems = addGems(doc, p, def.reward.gems, { ts, season: false });
        if (def.reward.relic) {
          const found = grantRelic(doc, p, pickRelic(p.regionId, rng), ts);
          result.reward.relic = { ...found.relic };
          result.reward.relicIsNew = found.isNew;
        }
      } else if (kind === 'group') {
        const tier = GROUP_GOAL.tiers.find((t) => t.id === id);
        if (!tier) fail('مكافأة غير معروفة', 400, 'unknown_tier');
        const meta = ensureMeta(doc, ts);
        if (p.groupClaims.weekId !== weekId(ts)) p.groupClaims = { weekId: weekId(ts), ids: [] };
        if (p.groupClaims.ids.includes(id)) fail('استلمت هذه المكافأة هذا الأسبوع', 400, 'already_claimed');
        const contribution = meta.group.byPlayer[p.playerId] || 0;
        if (contribution < tier.contribution) fail(`تحتاج مساهمة ${tier.contribution} عملة في الهدف الجماعي`, 400, 'not_ready');
        p.groupClaims.ids.push(id);
        result = { kind, id, reward: { gems: addGems(doc, p, tier.gems, { ts, season: false }) } };
      } else {
        fail('نوع مطالبة غير معروف', 400, 'unknown_claim');
      }

      remember(p, requestId, `claim:${kind}:${id}`, result, ts);
      return { result, player: publicState(doc, p, ts) };
    });
  }

  // -------------------------------------------------------------------------
  // أهداف الدورة: تُطالَب مرة واحدة لكل دورة وتُصفَّر مع البعث
  // -------------------------------------------------------------------------

  async function claimCycleGoal(playerId, goalId, requestId = null) {
    const ts = now();
    return store.mutate((doc) => {
      const p = playerOf(doc, playerId);
      if (!p) fail('لاعب غير معروف', 401, 'unknown_player');
      touch(doc, p, ts);

      const cached = replay(p, requestId, `cycle:${goalId}`, ts);
      if (cached) return { result: cached, player: publicState(doc, p, ts), replayed: true };

      const def = CYCLE_GOALS.find((g) => g.id === goalId);
      if (!def) fail('هدف دورة غير معروف', 400, 'unknown_cycle_goal');
      if ((p.cycleGoalsClaimed || []).includes(def.id)) fail('استلمت هذا الهدف في هذه الدورة', 400, 'already_claimed');
      if (cycleGoalProgress(p, def.type) < def.threshold) fail('لم تصل لهذا الهدف بعد', 400, 'not_ready');

      p.cycleGoalsClaimed.push(def.id);
      const result = { goalId: def.id, reward: {} };
      // مكافأة عملات فقط بلا احتساب تعدين/موسم/جماعة حتى لا تُسرّع شروط البعث.
      if (def.reward.coins) result.reward.coins = addCoins(doc, p, def.reward.coins, ts, { mined: false });
      if (def.reward.gems) result.reward.gems = addGems(doc, p, def.reward.gems, { ts, season: false });

      remember(p, requestId, `cycle:${def.id}`, result, ts);
      return { result, player: publicState(doc, p, ts) };
    });
  }

  // -------------------------------------------------------------------------
  // المنطقة والألقاب
  // -------------------------------------------------------------------------

  async function switchRegion(playerId, regionId, requestId = null) {
    const ts = now();
    return store.mutate((doc) => {
      const p = playerOf(doc, playerId);
      if (!p) fail('لاعب غير معروف', 401, 'unknown_player');
      touch(doc, p, ts);
      const cached = replay(p, requestId, 'region', ts);
      if (cached) return { result: cached, player: publicState(doc, p, ts), replayed: true };
      if (!p.regionsUnlocked.includes(regionId)) fail('المنطقة غير مفتوحة بعد', 403, 'region_locked');
      p.regionId = regionId;
      const result = { regionId, region: REGIONS.find((r) => r.id === regionId) };
      remember(p, requestId, 'region', result, ts);
      return { result, player: publicState(doc, p, ts) };
    });
  }

  async function setTitle(playerId, titleId, requestId = null) {
    const ts = now();
    return store.mutate((doc) => {
      const p = playerOf(doc, playerId);
      if (!p) fail('لاعب غير معروف', 401, 'unknown_player');
      touch(doc, p, ts);
      const cached = replay(p, requestId, 'title', ts);
      if (cached) return { result: cached, player: publicState(doc, p, ts), replayed: true };
      const def = TITLES.find((t) => t.id === titleId);
      if (!def) fail('لقب غير معروف', 400, 'unknown_title');
      let bought = false;
      if (!p.lifetime.titles.includes(titleId)) {
        if (def.reqRelics && p.lifetime.relicsFound < def.reqRelics) fail(`يتطلب ${def.reqRelics} آثار`, 400, 'title_locked');
        if (def.reqRaids && p.lifetime.raidsWon < def.reqRaids) fail(`يتطلب ${def.reqRaids} غارات ناجحة`, 400, 'title_locked');
        if (def.reqRegions && p.regionsUnlocked.length < def.reqRegions) fail(`يتطلب الوصول للمنطقة ${def.reqRegions}`, 400, 'title_locked');
        if (p.gems < def.cost) fail(`تحتاج ${def.cost} جوهرة لهذا اللقب`, 400, 'insufficient_gems');
        p.gems -= def.cost;
        p.lifetime.titles.push(titleId);
        bought = true;
      }
      p.title = titleId;
      const result = { titleId, bought, cost: bought ? def.cost : 0 };
      remember(p, requestId, 'title', result, ts);
      return { result, player: publicState(doc, p, ts) };
    });
  }

  // -------------------------------------------------------------------------
  // بعث المنجم (Rebirth) وشجرة نوى الإرث ومتجر التجميل
  // -------------------------------------------------------------------------

  async function rebirth(playerId, requestId = null) {
    const ts = now();
    return store.mutate((doc) => {
      const p = playerOf(doc, playerId);
      if (!p) fail('لاعب غير معروف', 401, 'unknown_player');
      touch(doc, p, ts);

      const cached = replay(p, requestId, 'rebirth', ts);
      if (cached) return { result: cached, player: publicState(doc, p, ts), replayed: true };

      const st = rebirthConditions(p);
      if (!st.eligible) fail('لم تتحقق شروط البعث بعد', 400, 'rebirth_not_ready');

      const cores = st.cores;
      const fromCount = p.rebirthCount;
      const before = { totalMined: p.lifetime.totalMined, relics: Object.keys(p.relics).length, gems: p.gems };

      // يُصفَّر تطور المنجم الجاري فقط؛ كل السجل والعلاقات والمجموعة تبقى.
      p.coins = 0;
      p.workers = 0;
      p.idleCarry = 0;
      p.equipment = { pickaxe: 1, lamp: 1, helmet: 1 };
      p.facilities = { cart: 1, smelter: 1, storage: 1 };
      p.regionId = REGIONS[0].id;
      p.regionsUnlocked = [REGIONS[0].id];
      p.runMined = 0;
      p.runManualMined = 0;
      p.runRelics = 0;
      p.cycleGoalsClaimed = [];
      p.rebirthCount = saneNumber(p.rebirthCount, 0, 1e6) + 1;
      p.legacyCores = saneNumber(p.legacyCores, 0, 1e6) + cores;
      p.lastTick = ts;

      const result = {
        rebirths: p.rebirthCount, cores, legacyCores: p.legacyCores,
        threshold: rebirthThreshold(p.rebirthCount), kept: before,
      };
      pushNotice(p, 'rebirth', result, ts);
      remember(p, requestId, 'rebirth', result, ts);
      return { result, player: publicState(doc, p, ts) };
    });
  }

  async function legacyUpgrade(playerId, trackId, requestId = null) {
    const ts = now();
    return store.mutate((doc) => {
      const p = playerOf(doc, playerId);
      if (!p) fail('لاعب غير معروف', 401, 'unknown_player');
      touch(doc, p, ts);
      const cached = replay(p, requestId, `legacy:${trackId}`, ts);
      if (cached) return { result: cached, player: publicState(doc, p, ts), replayed: true };

      const def = LEGACY_TRACKS[trackId];
      if (!def) fail('مسار إرث غير معروف', 400, 'unknown_legacy_track');
      const rank = p.legacy[trackId] || 0;
      if (rank >= def.maxRank) fail('هذا المسار وصل للحد الأقصى', 400, 'max_level');
      if (p.legacyCores < LEGACY_COST) fail('لا تملك نوى إرث كافية', 400, 'insufficient_cores');
      p.legacyCores -= LEGACY_COST;
      p.legacy[trackId] = rank + 1;
      const result = { trackId, rank: p.legacy[trackId], cost: LEGACY_COST, legacyCores: p.legacyCores };
      remember(p, requestId, `legacy:${trackId}`, result, ts);
      return { result, player: publicState(doc, p, ts) };
    });
  }

  async function buyCosmetic(playerId, cosmeticId, requestId = null) {
    const ts = now();
    return store.mutate((doc) => {
      const p = playerOf(doc, playerId);
      if (!p) fail('لاعب غير معروف', 401, 'unknown_player');
      touch(doc, p, ts);
      const cached = replay(p, requestId, `cosmetic:${cosmeticId}`, ts);
      if (cached) return { result: cached, player: publicState(doc, p, ts), replayed: true };

      const def = COSMETICS.find((c) => c.id === cosmeticId);
      if (!def) fail('زينة غير معروفة', 400, 'unknown_cosmetic');
      let bought = false;
      if (!p.cosmetics.owned.includes(def.id)) {
        if (p.gems < def.cost) fail(`تحتاج ${def.cost} جوهرة لهذه الزينة`, 400, 'insufficient_gems');
        p.gems -= def.cost;
        p.cosmetics.owned.push(def.id);
        bought = true;
      }
      // التجهيز الاختياري: نفس النوع يُستبدل
      p.cosmetics.equipped[def.type] = def.id;
      const result = { cosmeticId: def.id, type: def.type, bought, cost: bought ? def.cost : 0 };
      remember(p, requestId, `cosmetic:${cosmeticId}`, result, ts);
      return { result, player: publicState(doc, p, ts) };
    });
  }

  // -------------------------------------------------------------------------
  // لوحة الصدارة وسجل الغارات والدعوات والإشعارات
  // -------------------------------------------------------------------------

  function leaderboardEntry(p, index, score, viewer, viewerId, ts, viewerFriends) {
    const entry = {
      rank: index + 1,
      playerId: p.playerId,
      name: p.name,
      photoUrl: p.photoUrl,
      mode: p.mode,
      title: { id: p.title, ...(TITLES.find((t) => t.id === p.title) || TITLES[0]) },
      regionEmoji: regionById(p.regionId).emoji,
      regionName: regionById(p.regionId).name,
      score,
      relics: Object.keys(p.relics).length,
      shieldUntil: p.shieldUntil,
      manualPower: Math.floor(powerOf(p, ts).manual),
      rebirths: p.rebirthCount || 0,
      badge: rebirthBadge(p.rebirthCount || 0).current,
      isMe: p.playerId === viewerId,
      isFriend: viewerFriends.has(p.playerId),
      protected: p.lifetime.totalMined < RAID.newPlayerProtectionMined,
      canRaid: p.playerId !== viewerId
        && p.lifetime.totalMined >= RAID.newPlayerProtectionMined
        && (!viewer || viewer.lifetime.totalMined >= RAID.newPlayerProtectionMined),
    };
    // تقديرات الغارة تُحسب على السيرفر — الواجهة لا تعرف المعادلات.
    // الغنيمة متاحة للجميع بلا صداقة، وتُقارب لأقرب 5 حتى لا تكشف رصيد الخصم بدقة.
    if (viewer && p.playerId !== viewerId) {
      entry.raidEstimate = Math.round(raidSuccessChance(viewer, p, false, ts) * 100);
      const loot = stealAmount(viewer, p, false, ts);
      entry.potentialLoot = Math.round(loot / 5) * 5;
      entry.potentialLootSeconds = Math.round(loot / Math.max(1, productionPerSec(viewer, ts)));
    }
    return entry;
  }

  // أهداف قريبة متكافئة (0.5×–2× من إنتاجك) بلا شرط صداقة — تُعاد قائمة المنافسين المؤهلين
  function nearbyPool(all, viewer, ts) {
    if (!viewer) return [];
    if (viewer.lifetime.totalMined < RAID.newPlayerProtectionMined) return [];
    const myProd = productionPerSec(viewer, ts);
    return all.filter((p) => {
      if (p.playerId === viewer.playerId) return false;
      if (p.lifetime.totalMined < RAID.newPlayerProtectionMined) return false;
      const prod = productionPerSec(p, ts);
      return prod >= myProd * 0.5 && prod <= myProd * 2;
    });
  }

  async function leaderboard(scope = 'wealth', viewerId = null, limit = 50) {
    const ts = now();
    let changed = false;
    const result = await store.mutate((doc) => {
      changed = maintenance(doc, ts);
      const viewer = playerOf(doc, viewerId);
      const viewerFriends = new Set(viewer ? viewer.friends : []);
      const all = Object.keys(doc.players)
        .map((id) => playerOf(doc, id))
        .filter(Boolean);

      // أهداف قريبة: مواجهات متكافئة (0.5×–2× من إنتاجك) بلا شرط صداقة
      if (scope === 'nearby') {
        const pool = nearbyPool(all, viewer, ts);
        const picked = pool
          .map((p) => ({ p, r: rng() }))
          .sort((a, b) => a.r - b.r)
          .slice(0, clamp(limit, 1, 8))
          .map(({ p }) => p);
        return {
          scope, label: 'أهداف قريبة',
          entries: picked.map((p, i) => leaderboardEntry(p, i, 0, viewer, viewerId, ts, viewerFriends)),
          total: all.length,
          weekId: weekId(ts),
        };
      }

      let scoreOf;
      // النقاط تُحتسب فقط لمن نسخته تطابق الأسبوع الحالي (اللاعبون العائدون يبدأ موسمهم عند أول كسب).
      if (scope === 'season') scoreOf = (p) => (p.season.weekId === weekId(ts) ? p.season.score : 0);
      else if (scope === 'collection') scoreOf = (p) => collectionScore(p);
      else scoreOf = (p) => Math.floor(p.coins + p.gems * 250);

      let list = all;
      if (scope === 'friends') {
        list = all.filter((p) => viewer && (viewerFriends.has(p.playerId) || p.playerId === viewerId));
      }
      list = list
        .map((p) => ({ p, score: scoreOf(p) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, clamp(limit, 1, 100));

      const label = { wealth: 'الثروة', collection: 'المجموعة', season: 'الموسم', friends: 'رفاقي', nearby: 'أهداف قريبة' }[scope] || 'الثروة';
      return {
        scope, label,
        entries: list.map(({ p, score }, i) => leaderboardEntry(p, i, score, viewer, viewerId, ts, viewerFriends)),
        total: all.length,
        weekId: weekId(ts),
      };
    }, { persist: false });
    // لا نكتب الوثيقة عند كل قراءة؛ نُثبّت فقط إذا حدث تدوير موسم/هدف/تنظيف فعلياً.
    if (changed) await store.mutate((doc) => { maintenance(doc, ts); }, { persist: true });
    return result;
  }

  async function raidLog(playerId) {
    const ts = now();
    return store.mutate((doc) => {
      const p = playerOf(doc, playerId);
      if (!p) fail('لاعب غير معروف', 401, 'unknown_player');
      touch(doc, p, ts);
      const enrich = (e, isIncoming) => ({
        ...e,
        canRevenge: isIncoming && e.success && !e.revenged && ts < e.revengeUntil,
        opponent: e.opponentId ? { playerId: e.opponentId, name: e.opponentName, emoji: e.opponentEmoji } : null,
      });
      return {
        incoming: [...p.incoming].reverse().map((e) => enrich(e, true)),
        outgoing: [...p.outgoing].reverse().map((e) => enrich(e, false)),
        shieldUntil: p.shieldUntil,
      };
    });
  }

  async function invite(playerId) {
    // get() موحّد عبر المستودعات (متزامن محلياً، async على D1) — بلا قراءة كاملة للوثيقة
    const raw = await store.get(playerId);
    if (!raw) fail('لاعب غير معروف', 401, 'unknown_player');
    const code = `${REFERRAL.prefix}${playerId}`;
    return {
      code,
      shareText: `⛏️ انضم لمنجمي في Mine War وتنافس معي! ${raw.name || 'منقّب'} ينتظرك في الأعماق.`,
      botLink: `https://t.me/${botUsername}?start=${encodeURIComponent(code)}`,
      appLink: `https://t.me/${botUsername}?startapp=${encodeURIComponent(code)}`,
    };
  }

  /** يسجّل إكمال/تخطي الجولة التعليمية حتى لا تظهر تلقائياً مرة أخرى (قابلة للإعادة يدوياً). */
  async function completeTutorial(playerId, requestId = null) {
    const ts = now();
    return store.mutate((doc) => {
      const p = playerOf(doc, playerId);
      if (!p) fail('لاعب غير معروف', 401, 'unknown_player');
      const cached = replay(p, requestId, 'tutorial', ts);
      if (cached) return { result: cached, player: publicState(doc, p, ts), replayed: true };
      p.tutorialDone = true;
      const result = { tutorialDone: true };
      remember(p, requestId, 'tutorial', result, ts);
      return { result, player: publicState(doc, p, ts) };
    });
  }

  async function clearNotices(playerId, ids = []) {
    const ts = now();
    return store.mutate((doc) => {
      const p = playerOf(doc, playerId);
      if (!p) fail('لاعب غير معروف', 401, 'unknown_player');
      if (Array.isArray(ids) && ids.length) {
        const set = new Set(ids);
        p.notices = p.notices.filter((n) => !set.has(n.id));
      } else {
        p.notices = [];
      }
      return { ok: true, player: publicState(doc, p, ts) };
    });
  }

  // -------------------------------------------------------------------------
  // الجلسات: تحقق من النسخة الحالية + تسجيل الخروج (إبطال التوكنات)
  // -------------------------------------------------------------------------

  /** هل التوكن الصادر بهذه النسخة ما زال صالحاً؟ (تسجيل الخروج يرفع النسخة). */
  async function sessionValid(playerId, epoch) {
    const raw = await store.get(playerId);
    if (!raw) return false;
    const current = Number.isFinite(Number(raw.sessionEpoch)) ? Math.floor(Number(raw.sessionEpoch)) : 0;
    return current === (Number(epoch) || 0);
  }

  /** يرفع نسخة الجلسة فيُبطل كل التوكنات السابقة لهذا اللاعب. */
  async function logout(playerId) {
    const ts = now();
    return store.mutate((doc) => {
      const p = playerOf(doc, playerId);
      if (!p) fail('لاعب غير معروف', 401, 'unknown_player');
      p.sessionEpoch = saneNumber(p.sessionEpoch, 0, 1e9) + 1;
      p.lastSeen = ts;
      return { epoch: p.sessionEpoch };
    });
  }

  // -------------------------------------------------------------------------
  // إحصاءات صحية + أدوات اختبار
  // -------------------------------------------------------------------------

  async function stats() {
    const doc = await store.snapshot();
    const ts = now();
    const all = Object.keys(doc.players || {})
      .map((id) => playerOf(doc, id))
      .filter(Boolean);
    const players = all.length;
    // مؤشرات مراقبة الغارات (المرحلة 5): تُعرض في /api/health دون كشف حسابات.
    let raidsWon = 0, raidsLost = 0, raiders = 0, active = 0;
    let revenges = 0, lossTotal = 0, lossCount = 0;
    for (const p of all) {
      const life = p.lifetime || {};
      raidsWon += Number(life.raidsWon) || 0;
      raidsLost += Number(life.raidsLost) || 0;
      if ((Number(life.raidsWon) || 0) > 0) raiders += 1;
      if ((Number(p.lastSeen) || 0) > ts - 7 * DAY_MS) active += 1;
      // مرات الثأر ومتوسط الخسارة من سجل الغارات الصادر (محدود بطول السجل)
      for (const e of Array.isArray(p.outgoing) ? p.outgoing : []) {
        if (e && e.revenge) revenges += 1;
        const lost = Number(e && e.lost) || 0;
        if (lost > 0) { lossTotal += lost; lossCount += 1; }
      }
    }
    // نسبة المؤهلين للغزو ممن لا يجدون هدفاً قريباً متكافئاً — لأعداد معقولة فقط.
    let targetless = null, targetlessShare = null;
    const eligible = all.filter((p) => (Number(p.lifetime?.totalMined) || 0) >= RAID.newPlayerProtectionMined);
    if (eligible.length && eligible.length <= RAID_STATS_NEARBY_CAP) {
      targetless = eligible.filter((p) => nearbyPool(all, p, ts).length === 0).length;
      targetlessShare = Math.round((targetless / eligible.length) * 100);
    }
    return {
      players,
      activeWeek: active,
      weekId: weekId(ts),
      groupContributed: doc.meta?.group?.contributed || 0,
      event: eventOfWeek(ts).id,
      raids: {
        won: raidsWon,
        lost: raidsLost,
        raiders,
        raiderShare: active ? Math.round((raiders / active) * 100) : null,
        winRate: raidsWon + raidsLost ? Math.round((raidsWon / (raidsWon + raidsLost)) * 100) : null,
        revenges,
        avgLoss: lossCount ? Math.round(lossTotal / lossCount) : 0,
        eligible: eligible.length,
        targetless,
        targetlessShare,
      },
    };
  }

  return {
    session, getState, mine, upgrade, raid, dailyDig, claim, switchRegion, setTitle,
    rebirth, legacyUpgrade, buyCosmetic, claimCycleGoal,
    leaderboard, raidLog, invite, clearNotices, completeTutorial, catalog, stats,
    sessionValid, logout,
    // للاختبارات فقط:
    _internals: { playerOf, normalizePlayer, applyIdle, publicState, touch },
  };
}
