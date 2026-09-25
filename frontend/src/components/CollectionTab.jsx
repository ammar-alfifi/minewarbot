// شاشة المجموعة: الآثار، المناطق، الألقاب، الإنجازات، الموسم
import React from 'react';
import { t } from '../i18n.js';
import { num, short, percent, dateShort } from '../format.js';
import { Progress, Stat } from './ui.jsx';
import { duration } from '../format.js';
import { useTick } from '../hooks/useGame.js';

export default function CollectionTab({ game, catalog }) {
  const { player, actions, busy, pushToast, setModal } = game;
  useTick(1000);
  if (!player || !catalog) return null;

  const owned = Object.fromEntries(player.relics.map((r) => [r.id, r]));
  const rarities = catalog.rarities;
  const claimable = player.milestones.filter((m) => m.claimable);

  const onClaimMilestone = async (m) => {
    const res = await actions.claim('milestone', m.id);
    if (res) {
      const r = res.result.reward || {};
      if (r.relic) {
        setModal({ type: 'discovery', payload: { relic: r.relic, isNew: r.relicIsNew, dupeGems: 0 } });
      } else {
        pushToast(`🎁 ${r.coins ? `${num(r.coins)} 🪙 ` : ''}${r.gems ? `${r.gems} 💎` : ''}`, 'success');
      }
    }
  };

  const onTitle = async (title) => {
    const res = await actions.setTitle(title.id);
    if (res) pushToast(res.result.bought ? `${title.emoji} ${title.name}` : t('collection.equipped'), 'success');
  };

  const seasonEnd = (player.season.weekId + 1) * 7 * 24 * 3600 * 1000;

  return (
    <div>
      <div className="card">
        <h3 className="card-title">📊 {t('collection.stats')}</h3>
        <div className="stat-grid">
          <Stat value={short(player.stats.totalMined)} label={t('collection.statNames.totalMined')} />
          <Stat value={num(player.stats.totalGems)} label={t('collection.statNames.totalGems')} />
          <Stat value={`${player.stats.uniqueRelics}/${player.stats.totalRelics}`} label={t('collection.statNames.uniqueRelics')} />
          <Stat value={num(player.stats.raidsWon)} label={t('collection.statNames.raidsWon')} />
          <Stat value={`${player.stats.bestStreak}/7`} label={t('collection.statNames.bestStreak')} />
          <Stat value={num(player.stats.daysVisited)} label={t('collection.statNames.daysVisited')} />
        </div>
        <div className="row mt8">
          <span className="emoji">🌍</span>
          <div className="grow">
            <div className="title">{player.regionsUnlocked.length}/{catalog.regions.length} {t('collection.regions')}</div>
            <div className="desc">{catalog.regions.map((r) => (player.regionsUnlocked.includes(r.id) ? r.emoji : '🔒')).join(' ')}</div>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="card-title">🏆 {t('collection.season')}</h3>
        <div className="between">
          <span className="small">🎯 {t('collection.seasonScore')}: <b>{short(player.season.score)}</b></span>
          <span className="small muted">ينتهي بعد {duration(seasonEnd - Date.now())}</span>
        </div>
        <div className="row">
          <span className="emoji">👑</span>
          <div className="grow">
            <div className="title">{player.stats.seasonWins} {t('collection.seasonWins')}</div>
            {player.lastSeason ? (
              <div className="desc">{t('collection.lastSeason', { rank: player.lastSeason.rank, total: player.lastSeason.total })} — {short(player.lastSeason.score)} نقطة</div>
            ) : (
              <div className="desc">تُحفظ جوائز المواسم السابقة في إحصاءاتك الدائمة.</div>
            )}
          </div>
        </div>
        <p className="card-sub">نقاط الموسم: كل عملة تعدّنها +1، الجوهرة +250، الأثر +500، والغارة الناجحة +200. تُصفَّر أسبوعياً وتبقى إنجازاتك الدائمة.</p>
      </div>

      <div className="card">
        <h3 className="card-title">👑 {t('collection.titles')}</h3>
        {catalog.titles.map((title) => {
          const isOwned = (player.titlesOwned || []).includes(title.id);
          const isEquipped = player.title.id === title.id;
          const locked = (title.reqRelics && player.stats.relicsFound < title.reqRelics)
            || (title.reqRaids && player.stats.raidsWon < title.reqRaids)
            || (title.reqRegions && player.regionsUnlocked.length < title.reqRegions);
          return (
            <div key={title.id} className="row">
              <span className="emoji">{title.emoji}</span>
              <div className="grow">
                <div className="title">{title.name} {isEquipped && <span className="tag me">{t('collection.equipped')}</span>}</div>
                <div className="desc">{title.desc || (title.cost > 0 ? `${title.cost} 💎` : '')}</div>
              </div>
              {isOwned ? (
                <button className="btn small ghost" disabled={busy || isEquipped} onClick={() => onTitle(title)}>{t('collection.equip')}</button>
              ) : (
                <button className="btn small success" disabled={busy || locked || player.gems < title.cost} onClick={() => onTitle(title)} title={locked ? t('collection.locked') : ''}>
                  {locked ? `🔒 ${t('collection.locked')}` : `💎 ${title.cost}`}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="card">
        <h3 className="card-title">🎖️ {t('collection.milestones')}</h3>
        {player.milestones.map((m) => (
          <div key={m.id} className={`row ${m.claimed ? 'muted' : ''}`}>
            <span className="emoji">{m.emoji}</span>
            <div className="grow">
              <div className="title">{m.name}</div>
              <div className="desc">{short(m.progress)} / {short(m.threshold)} · مكافأة: {m.reward.coins ? `${short(m.reward.coins)} 🪙 ` : ''}{m.reward.gems ? `${m.reward.gems} 💎` : ''}{m.reward.relic ? ' + 🏺' : ''}</div>
              <div className="mt8"><Progress value={m.progress} max={m.threshold} /></div>
            </div>
            {m.claimed ? (
              <span className="tag">{t('collection.claimed')}</span>
            ) : m.claimable ? (
              <button className="btn success small" disabled={busy} onClick={() => onClaimMilestone(m)}>{t('collection.claim')}</button>
            ) : null}
          </div>
        ))}
      </div>

      <div className="card">
        <h3 className="card-title">🏺 {t('collection.relics')}</h3>
        {player.relics.length === 0 && <p className="muted small">{t('collection.empty')}</p>}
        {catalog.regions.map((region) => {
          const regionRelics = region.relics.map((id) => catalog.relics.find((r) => r.id === id)).filter(Boolean);
          const foundHere = regionRelics.filter((r) => owned[r.id]).length;
          return (
            <div key={region.id} className="mt12">
              <div className="between mb8">
                <span className="small">{region.emoji} {region.name}</span>
                <span className="small muted">{foundHere}/{regionRelics.length}</span>
              </div>
              <div className="relic-grid">
                {regionRelics.map((relic) => {
                  const mine = owned[relic.id];
                  return (
                    <button
                      key={relic.id}
                      className={`relic ${mine ? relic.rarity : 'locked'}`}
                      title={mine ? relic.name : t('collection.undiscovered')}
                      onClick={() => {
                        if (mine) setModal({ type: 'relic', payload: { relic, count: mine.count, firstAt: mine.firstAt, rarity: rarities[relic.rarity] } });
                        else pushToast('لم تكتشف هذا الأثر بعد — عدّن في هذه المنطقة!');
                      }}
                    >
                      {mine ? relic.emoji : '❔'}
                      {mine && mine.count > 1 && <span className="count">×{mine.count}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
        <p className="card-sub">
          الأثر المكرر يتحول تلقائياً إلى جواهر. المجموع الحالي: {player.stats.collectionScore} نقطة مجموعة.
        </p>
      </div>
    </div>
  );
}
