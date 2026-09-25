// ============================================================================
// محرك اللعبة — السلطة الكاملة للسيرفر.
// كل عملية (تعدين، شراء، غارة، اكتشاف) تُحسب هنا، والواجهة لا تقرر شيئاً.
// ============================================================================

import {
  RARITIES, REGIONS, RELICS, EQUIPMENT, FACILITIES, WORKER, BOOST,
  FINDS, EVENTS, eventOfWeek, weekId, dayId,
  OFFLINE, offlineCapHours, powerOf, findChances,
  upgradeCost, workerCost, workerBatchCost, upgradeBatchCost,
  regionById, regionIndex, pickRelic, collectionScore,
  RAID, raidSuccessChance, stealAmount,
  DAILY, VISIT_REWARDS, visitStreakAfter,
  MILESTONES, milestoneProgress, TITLES, GROUP_GOAL, REFERRAL,
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

export function createEngine({ store, botUsername = 'MineWarrBot', now = () => Date.now(), rng = Math.random }) {
  // -------------------------------------------------------------------------
  // تطبيع اللاعبين والترحيل من التخزين القديم
  // -------------------------------------------------------------------------

  function playerOf(doc, id) {
    const p = doc.players[id];
    if (!p) return null;
    if (p.__v === 2 && p.playerId === id) return p;
    return normalizePlayer(p, id);
  }

  function normalizePlayer(p, id) {
    const ts = p.updatedAt || now();
    const life = p.lifetime || {};
    p.__v = 2;
    p.playerId = id;
    p.name = String(p.name || 'منقّب').slice(0, 30);
    p.photoUrl = typeof p.photoUrl === 'string' ? p.photoUrl : null;
    p.mode = p.mode === 'guest' ? 'guest' : 'telegram';
    p.createdAt = p.createdAt || ts;
    p.lastSeen = p.lastSeen || ts;
    p.lastTick = p.lastTick || p.updatedAt || ts;
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
    p.regionsUnlocked = Array.isArray(p.regionsUnlocked) && p.regionsUnlocked.length
      ? p.regionsUnlocked.filter((r) => REGIONS.some((x) => x.id === r))
      : unlockedRegions(p.lifetime.totalMined);
    p.title = TITLES.some((t) => t.id === p.title) ? p.title : 'novice';
    if (!p.lifetime.titles.includes(p.title)) p.lifetime.titles.push(p.title);
    p.shieldUntil = saneNumber(p.shieldUntil, 0, 1e15);
    p.boostUntil = saneNumber(p.boostUntil, 0, 1e15);
    p.friends = Array.isArray(p.friends) ? [...new Set(p.friends.filter((f) => typeof f === 'string' && f !== id))].slice(0, REFERRAL.maxFriends) : [];
    p.referredBy = typeof p.referredBy === 'string' ? p.referredBy : null;
    p.notices = Array.isArray(p.notices) ? p.notices.slice(-20) : [];
    p.actionLog = Array.isArray(p.actionLog) ? p.actionLog.slice(-40) : [];
    p.dailyAt = saneNumber(p.dailyAt, 0, 1e15);
    p.visitAt = saneNumber(p.visitAt, 0, 1e15);
    p.visitStreak = clamp(saneNumber(p.visitStreak, 0, 7), 0, 7);
    p.lastGemAt = saneNumber(p.lastGemAt, 0, 1e15);
    p.lastRelicAt = saneNumber(p.lastRelicAt, 0, 1e15);
    p.milestonesClaimed = Array.isArray(p.milestonesClaimed) ? p.milestonesClaimed.filter((m) => MILESTONES.some((x) => x.id === m)) : [];
    p.groupClaims = p.groupClaims && typeof p.groupClaims === 'object' ? p.groupClaims : { weekId: weekId(ts), ids: [] };
    if (!Array.isArray(p.groupClaims.ids)) p.groupClaims.ids = [];
    p.groupChestWeek = saneNumber(p.groupChestWeek, -1, 1e9);
    p.incoming = Array.isArray(p.incoming) ? p.incoming.slice(-RAID.logLimit) : [];
    p.outgoing = Array.isArray(p.outgoing) ? p.outgoing.slice(-RAID.logLimit) : [];
    p.raid = p.raid && typeof p.raid === 'object' ? p.raid : {};
    p.raid.lastAt = saneNumber(p.raid.lastAt, 0, 1e15);
    p.raid.winsToday = saneNumber(p.raid.winsToday, 0, 100);
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
      raid: { lastAt: 0, winsToday: 0, day: dayId(ts), targets: {} },
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

  function maintenance(doc, ts) {
    const meta = ensureMeta(doc, ts);
    const wk = weekId(ts);

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
    }

    // هدف الجماعة الأسبوعي
    if (meta.group.weekId !== wk) {
      meta.group = { weekId: wk, contributed: 0, byPlayer: {} };
    }

    // الصندوق الجماعي عند بلوغ الهدف: مرة واحدة لكل مساهم في الأسبوع
    if (meta.group.contributed >= GROUP_GOAL.target) {
      for (const [id, contribution] of Object.entries(meta.group.byPlayer)) {
        if (!contribution || contribution <= 0) continue;
        const p = playerOf(doc, id);
        if (!p || p.groupChestWeek === wk) continue;
        p.groupChestWeek = wk;
        addGems(doc, p, GROUP_GOAL.chestGems, { ts, season: false });
        pushNotice(p, 'group_chest', { gems: GROUP_GOAL.chestGems, target: GROUP_GOAL.target, contribution }, ts);
      }
    }
    return meta;
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
    p.season.score += points;
    const meta = ensureMeta(doc, ts);
    meta.season.scores[p.playerId] = p.season.score;
  }

  function addCoins(doc, p, amount, ts, { mined = true } = {}) {
    const value = Math.floor(amount);
    if (value <= 0) return 0;
    p.coins = Math.min(1e15, p.coins + value);
    if (mined) {
      p.lifetime.totalMined += value;
      addSeason(doc, p, value, ts);
      const meta = ensureMeta(doc, ts);
      meta.group.contributed += value;
      meta.group.byPlayer[p.playerId] = (meta.group.byPlayer[p.playerId] || 0) + value;
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
    const elapsed = Math.max(0, (ts - (p.lastTick || ts)) / 1000);
    p.lastTick = ts;
    if (elapsed < 1) return null;
    const capHours = offlineCapHours(p);
    const effective = Math.min(elapsed, capHours * 3600);
    const rate = powerOf(p, ts).idlePerSec;
    const coins = Math.floor(rate * effective);
    if (coins > 0) addCoins(doc, p, coins, ts, { mined: true });
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
    const reward = VISIT_REWARDS[p.visitStreak - 1];
    if (!reward) return null;
    p.visitAt = ts;
    p.lifetime.daysVisited += 1;
    p.lifetime.bestStreak = Math.max(p.lifetime.bestStreak, p.visitStreak);
    const granted = { day: p.visitStreak, coins: 0, gems: 0 };
    if (reward.coins) granted.coins = addCoins(doc, p, reward.coins, ts, { mined: false });
    if (reward.gems) granted.gems = addGems(doc, p, reward.gems, { ts, season: false });
    pushNotice(p, 'visit', granted, ts);
    return granted;
  }

  function unlockRegions(doc, p, ts) {
    const unlocked = unlockedRegions(p.lifetime.totalMined);
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

  function replay(p, requestId, ts) {
    if (!requestId || !REQUEST_ID_RE.test(requestId)) return null;
    const entry = (p.actionLog || []).find((e) => e.id === requestId && ts - e.at < 60 * 60 * 1000);
    return entry ? entry.result : null;
  }

  function remember(p, requestId, type, result, ts) {
    if (!requestId || !REQUEST_ID_RE.test(requestId)) return;
    p.actionLog.push({ id: requestId, type, result, at: ts });
    p.actionLog = p.actionLog.filter((e) => ts - e.at < 60 * 60 * 1000).slice(-40);
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
    const today = dayId(ts);
    const winsToday = p.raid.day === dayId(ts) ? p.raid.winsToday : 0;
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
        winsToday,
        dailyCap: RAID.dailySuccessCap,
        shieldUntil: p.shieldUntil,
        stealPct: RAID.stealPct,
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
        chestClaimed: p.groupChestWeek === weekId(ts),
        chestGems: GROUP_GOAL.chestGems,
        tiers: GROUP_GOAL.tiers.map((t) => ({
          id: t.id, label: t.label, contribution: t.contribution, gems: t.gems,
          claimed: doneClaims.has(t.id),
          claimable: !doneClaims.has(t.id) && myContribution >= t.contribution,
        })),
      },
      milestones: milestoneStatus(p),
      season: { weekId: weekId(ts), score: p.season.score, endsAt: (p.season.weekId + 1) * 7 * 24 * 3600 * 1000 },
      lastSeason: p.lastSeason,
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
        wealthScore: Math.floor(p.coins + p.gems * 250),
        collectionScore: collectionScore(p),
        friends: p.friends.length,
      },
      goals: (() => {
        const nr = nextRegion(p.lifetime.totalMined);
        const nm = nextMilestone(p);
        return {
          nextRegion: nr ? { id: nr.id, name: nr.name, emoji: nr.emoji, unlockTotalMined: nr.unlockTotalMined, remaining: Math.max(0, nr.unlockTotalMined - p.lifetime.totalMined) } : null,
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
        relics: r.relics,
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
      raidRules: {
        cooldownMs: RAID.cooldownMs, dailySuccessCap: RAID.dailySuccessCap, stealPct: RAID.stealPct,
        minSuccess: RAID.minSuccess, maxSuccess: RAID.maxSuccess, shieldOnRaidMs: RAID.shieldOnRaidMs,
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

      // إحالة صديق: تربط الصداقة وتمنح مكافأة متبادلة (بسقف يومي)
      if (isNew && startParam) {
        const referrerId = parseReferral(startParam);
        const referrer = referrerId && referrerId !== p.playerId ? playerOf(doc, referrerId) : null;
        if (referrer) {
          linkFriends(referrer, p);
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

      if (!p.welcomeGift) {
        p.welcomeGift = true;
        addCoins(doc, p, 50, ts, { mined: false });
        pushNotice(p, 'welcome', { coins: 50 }, ts);
      }

      const upkeep = touch(doc, p, ts);
      return { player: publicState(doc, p, ts), isNew, mode: identity.mode, idle: upkeep.idle, visitReward: upkeep.visitReward, catalog: catalog() };
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

      const cached = replay(p, requestId, ts);
      if (cached) return { result: cached, player: publicState(doc, p, ts), replayed: true };

      const power = powerOf(p, ts);
      const chances = findChances(p, ts);
      const coins = Math.floor(power.manual * count);
      addCoins(doc, p, coins, ts, { mined: true });

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

      const cached = replay(p, requestId, ts);
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

      const cached = replay(attacker, requestId, ts);
      if (cached) return { result: cached, player: publicState(doc, attacker, ts), replayed: true };

      if (!targetId || typeof targetId !== 'string' || targetId === playerId) fail('هدف غير صالح', 400, 'bad_target');
      const target = playerOf(doc, targetId);
      if (!target) fail('اللاعب غير موجود', 404, 'target_not_found');
      touch(doc, target, ts);

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
        attacker.raid.winsToday = 0;
      }
      if (attacker.raid.winsToday >= RAID.dailySuccessCap) {
        fail(`بلغت حد ${RAID.dailySuccessCap} غارات ناجحة اليوم — عد غداً`, 429, 'daily_cap');
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
      attacker.raid.targets[targetId] = ts;
      // تنظيف سجل الأهداف القديم
      const targetEntries = Object.entries(attacker.raid.targets).filter(([, at]) => ts - at < 24 * 60 * 60 * 1000).slice(-60);
      attacker.raid.targets = Object.fromEntries(targetEntries);

      let stolen = 0;
      let message;
      if (success) {
        stolen = stealAmount(attacker, target, isRevenge, ts);
        if (stolen < RAID.minSteal) {
          message = 'الغارة نجحت لكن الخصم لا يملك ما يستحق النقل 🤷';
          entryBase.success = false;
          attacker.lifetime.raidsLost += 1;
        } else {
          target.coins -= stolen;
          addCoins(doc, attacker, stolen, ts, { mined: false });
          attacker.lifetime.raidsWon += 1;
          attacker.raid.winsToday += 1;
          target.lifetime.raidsDefended += 1;
          addSeason(doc, attacker, 200, ts);
          const shieldMs = RAID.shieldOnRaidMs + (EQUIPMENT.helmet.effect(target.equipment.helmet).shieldBonusMs || 0);
          target.shieldUntil = Math.min(ts + 8 * 60 * 60 * 1000, Math.max(target.shieldUntil, ts) + shieldMs);
          message = isRevenge
            ? `ثأر ناجح! استعدت ${stolen} عملة ⚔️`
            : `غنيمة! أخذت ${stolen} عملة من ${target.name} 🏆`;
          entryBase.amount = stolen;
          entryBase.revengeUntil = ts + RAID.revengeWindowMs;
        }
      } else {
        attacker.lifetime.raidsLost += 1;
        message = 'فشلت الغارة — الخصم كان مستعداً 🛡️';
      }

      const attackerEntry = { at: ts, opponentId: target.playerId, opponentName: target.name, opponentEmoji: regionById(target.regionId).emoji, success: entryBase.success, amount: stolen, revenge: isRevenge };
      attacker.outgoing = [...attacker.outgoing, attackerEntry].slice(-RAID.logLimit);
      target.incoming = [...target.incoming, entryBase].slice(-RAID.logLimit);
      if (isRevenge) {
        // علّم غارة الخصم في سجل المهاجم بأنه تم الرد عليها
        for (const e of attacker.incoming) {
          if (e.opponentId === target.playerId && e.success && !e.revenged) { e.revenged = true; break; }
        }
      }
      // الهدف يعرف أنه سُرق (في سجل الغارات) بدون إشعارات إجبارية
      const result = { success: entryBase.success, stolen, message, chance: Math.round(chance * 100), shieldUntil: target.shieldUntil };
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

      const cached = replay(p, requestId, ts);
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

      const cached = replay(p, requestId, ts);
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
  // المنطقة والألقاب
  // -------------------------------------------------------------------------

  async function switchRegion(playerId, regionId, requestId = null) {
    const ts = now();
    return store.mutate((doc) => {
      const p = playerOf(doc, playerId);
      if (!p) fail('لاعب غير معروف', 401, 'unknown_player');
      touch(doc, p, ts);
      const cached = replay(p, requestId, ts);
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
      const cached = replay(p, requestId, ts);
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
      isMe: p.playerId === viewerId,
      isFriend: viewerFriends.has(p.playerId),
      lastSeen: p.lastSeen,
      canRaid: p.playerId !== viewerId,
    };
    // تقديرات الغارة تُحسب على السيرفر — الواجهة لا تعرف المعادلات
    if (viewer && p.playerId !== viewerId) {
      entry.raidEstimate = Math.round(raidSuccessChance(viewer, p, false, ts) * 100);
      entry.potentialLoot = stealAmount(viewer, p, false, ts);
    }
    return entry;
  }

  async function leaderboard(scope = 'wealth', viewerId = null, limit = 50) {
    const ts = now();
    return store.mutate((doc) => {
      maintenance(doc, ts);
      const viewer = playerOf(doc, viewerId);
      const viewerFriends = new Set(viewer ? viewer.friends : []);
      const all = Object.keys(doc.players)
        .map((id) => playerOf(doc, id))
        .filter(Boolean);

      let scoreOf;
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

      const label = { wealth: 'الثروة', collection: 'المجموعة', season: 'الموسم', friends: 'رفاقي' }[scope] || 'الثروة';
      return {
        scope, label,
        entries: list.map(({ p, score }, i) => leaderboardEntry(p, i, score, viewer, viewerId, ts, viewerFriends)),
        total: all.length,
        weekId: weekId(ts),
      };
    }, { persist: false });
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
    const p = playerOf(store.read(), playerId);
    if (!p) fail('لاعب غير معروف', 401, 'unknown_player');
    const code = `${REFERRAL.prefix}${playerId}`;
    return {
      code,
      shareText: `⛏️ انضم لمنجمي في Mine War وتنافس معي! ${p.name} ينتظرك في الأعماق.`,
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
      const cached = replay(p, requestId, ts);
      if (cached) return { result: cached, player: publicState(doc, p, ts), replayed: true };
      p.tutorialDone = true;
      const result = { tutorialDone: true };
      remember(p, requestId, 'tutorial', result, ts);
      return { result, player: publicState(doc, p, ts) };
    });
  }

  async function clearNotices(playerId, ids = []) {    const ts = now();
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
  // إحصاءات صحية + أدوات اختبار
  // -------------------------------------------------------------------------

  function stats() {
    const doc = store.read();
    const players = Object.keys(doc.players || {}).length;
    return {
      players,
      weekId: weekId(now()),
      groupContributed: doc.meta?.group?.contributed || 0,
      event: eventOfWeek(now()).id,
    };
  }

  return {
    session, getState, mine, upgrade, raid, dailyDig, claim, switchRegion, setTitle,
    leaderboard, raidLog, invite, clearNotices, completeTutorial, catalog, stats,
    // للاختبارات فقط:
    _internals: { playerOf, normalizePlayer, applyIdle, publicState, touch },
  };
}
