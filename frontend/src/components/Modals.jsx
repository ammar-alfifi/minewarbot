// كل النوافذ المنبثقة في مكان واحد
import React from 'react';
import { t } from '../i18n.js';
import { num, short, duration, percent, dateShort } from '../format.js';
import { Progress } from './ui.jsx';
import { shareText } from '../telegram.js';

function Sheet({ children, wide = false, onClose }) {
  return (
    <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget && onClose) onClose(); }}>
      <div className={`sheet ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true">{children}</div>
    </div>
  );
}

const RARITY_ORDER = { legendary: 4, epic: 3, rare: 2, common: 1 };

export default function Modals({ game, catalog, onStartTour }) {
  const { modal, setModal, player, actions, pushToast, refreshBoard, refreshRaidLog, busy } = game;
  if (!modal || !player) return null;
  const close = () => setModal(null);

  if (modal.type === 'welcome') {
    return (
      <Sheet onClose={close}>
        <div className="big-emoji">⛏️</div>
        <div className="head">{t('modals.welcome')}</div>
        <div className="body">{t('modals.welcomeBody', { name: player.name })}<br /><span className="small muted">بعد الإغلاق ستبدأ جولة تعليمية قصيرة — ويمكنك إعادتها من زر «؟».</span></div>
        <button className="btn primary big" onClick={close}>{t('modals.continue')}</button>
      </Sheet>
    );
  }

  if (modal.type === 'offline') {
    const idle = modal.payload;
    return (
      <Sheet onClose={close}>
        <div className="big-emoji">🤖</div>
        <div className="head">{t('modals.offlineTitle')}</div>
        <div className="body">
          {t('modals.offlineBody', { seconds: duration(idle.seconds * 1000) })} <b style={{ color: 'var(--gold)' }}>{num(idle.coins)} 🪙</b>
        </div>
        <div className="card tight" style={{ textAlign: 'start' }}>
          <div className="small muted">{t('modals.offlineRate', { rate: num(idle.rate) })}</div>
          <div className="small muted mt8">
            {idle.capped ? `⚠️ ${t('modals.offlineCapped', { hours: idle.capHours })}` : `✅ لم يصل الجمع للسقف (${idle.capHours} ساعات).`}
          </div>
        </div>
        <button className="btn primary big" onClick={close}>{t('modals.continue')}</button>
      </Sheet>
    );
  }

  if (modal.type === 'discovery') {
    const { relic, isNew, dupeGems } = modal.payload;
    const rarity = catalog?.rarities?.[relic.rarity];
    const appLink = `https://t.me/${catalog?.botUsername || ''}`;
    return (
      <Sheet onClose={close}>
        <div className="head">{isNew ? `🎉 ${t('collection.relicFound')}` : `🏺 ${relic.name}`}</div>
        <div className="big-emoji">{relic.emoji}</div>
        <div className={`relic-card ${relic.rarity}`}>
          <div style={{ fontWeight: 900, fontSize: 18 }}>{relic.name}</div>
          <div className="small" style={{ color: rarity?.color, fontWeight: 700 }}>{rarity?.emoji} {rarity?.name}</div>
          <div className="flavor mt8">«{relic.flavor}»</div>
        </div>
        {!isNew && <div className="body">{t('collection.dupe', { g: dupeGems })}</div>}
        <div className="flex" style={{ gap: 8 }}>
          <button className="btn ghost grow" onClick={() => shareText(`${relic.emoji} اكتشفت «${relic.name}» (${rarity?.name}) في حرب المناجم!`, appLink)}>
            📤 {t('modals.share')}
          </button>
          <button className="btn primary grow" onClick={close}>{t('modals.continue')}</button>
        </div>
      </Sheet>
    );
  }

  if (modal.type === 'daily') {
    const r = modal.payload;
    let title = '🕳️ ' + t('modals.dailyTitle');
    let body = null;
    if (r.type === 'coins_small') { title = `🪙 ${t('modals.dailyCoins')}`; body = <>+{num(r.coins)} {t('header.coins')}</>; }
    if (r.type === 'gems') { title = `💎 ${t('modals.dailyGems')}`; body = <>+{r.gems} {t('header.gems')}</>; }
    if (r.type === 'relic') { title = `🏺 ${t('modals.dailyRelic')}`; body = <>{r.relic?.emoji} {r.relic?.name}{r.isNew ? '' : ` (${t('collection.dupe', { g: r.dupeGems })})`}</>; }
    if (r.type === 'boost') { title = `⚡ ${t('modals.dailyBoost')}`; body = <>×2 لمدة {duration(r.boostMs || 600000)}</>; }
    return (
      <Sheet onClose={close}>
        <div className="head">{title}</div>
        <div className="body">{body}</div>
        <div className="card tight">
          <div className="small">🛡️ {t('modals.shieldGranted', { time: duration(r.shieldMs || 0) })}</div>
        </div>
        <button className="btn primary big" onClick={close}>{t('modals.continue')}</button>
      </Sheet>
    );
  }

  if (modal.type === 'notice') {
    const notices = modal.payload;
    const render = (n) => {
      switch (n.type) {
        case 'visit': return `🎁 مكافأة الزيارة — اليوم ${n.data.day} من 7${n.data.coins ? ` · +${num(n.data.coins)} 🪙` : ''}${n.data.gems ? ` · +${n.data.gems} 💎` : ''}`;
        case 'welcome': return `👋 منحة ترحيب: +${num(n.data.coins)} 🪙`;
        case 'region': return `🌍 منطقة جديدة: ${n.data.region?.emoji} ${n.data.region?.name}`;
        case 'group_chest': return `🕳️ ${t('friends.chestReached', { g: n.data.gems })}`;
        case 'season_win': return `👑 فزت بموسم الأسبوع الماضي! (${num(n.data.score)} نقطة من ${n.data.total} لاعباً)`;
        case 'season_top': return `🥈 المركز ${n.data.rank} في موسم الأسبوع الماضي!`;
        case 'invite_reward': return `🎁 ${n.data.name} انضم بفضل دعوتك: +${n.data.gems} 💎`;
        default: return n.type;
      }
    };
    const closeNotices = async () => {
      await actions.dismissNotices(notices.map((n) => n.id));
      close();
    };
    return (
      <Sheet onClose={closeNotices} wide>
        <div className="head center">📰 {t('modals.noticeTitle')}</div>
        <div className="mt12">
          {notices.map((n) => <div key={n.id} className="row"><span className="emoji">✨</span><div className="grow small">{render(n)}</div></div>)}
        </div>
        <button className="btn primary big mt12" onClick={closeNotices}>{t('modals.continue')}</button>
      </Sheet>
    );
  }

  if (modal.type === 'raid') {
    const { entry, revenge } = modal.payload;
    const shielded = (entry.shieldUntil || 0) > Date.now();
    const onGo = async () => {
      close();
      const res = await actions.raid(entry.playerId, Boolean(revenge));
      if (res) {
        pushToast(res.result.message, res.result.success ? 'success' : 'error');
        refreshBoard();
        refreshRaidLog();
      }
    };
    return (
      <Sheet onClose={close}>
        <div className="head">⚔️ {t('modals.raidTitle', { name: entry.name })}</div>
        <div className="body">{t('friends.raidDetails')}</div>
        <div className="card tight" style={{ textAlign: 'start' }}>
          {entry.raidEstimate != null && <div className="small">🎯 {t('friends.estimate')}: <b>{entry.raidEstimate}%</b></div>}
          {entry.potentialLoot != null && entry.potentialLoot > 0 && <div className="small mt8">💰 {t('friends.loot')}: <b>{num(entry.potentialLoot)} 🪙</b></div>}
          {shielded && <div className="small mt8" style={{ color: 'var(--success)' }}>🛡️ الخصم محمي — لا يمكن الهجوم الآن.</div>}
        </div>
        <div className="flex" style={{ gap: 8 }}>
          <button className="btn ghost grow" onClick={close}>{t('modals.cancel')}</button>
          <button className="btn danger grow" disabled={busy || shielded} onClick={onGo}>{t('modals.raidGo')}</button>
        </div>
      </Sheet>
    );
  }

  if (modal.type === 'region') {
    const onPick = async (regionId) => {
      close();
      const res = await actions.switchRegion(regionId);
      if (res) pushToast(`${catalog.regions.find((r) => r.id === regionId)?.emoji} ${catalog.regions.find((r) => r.id === regionId)?.name}`, 'success');
    };
    return (
      <Sheet onClose={close} wide>
        <div className="head center">🌍 {t('mine.change')}</div>
        <p className="card-sub center">المنطقة تحدد مضاعف الإنتاج ومجموعة الآثار المحتملة.</p>
        {catalog.regions.map((region) => {
          const unlocked = player.regionsUnlocked.includes(region.id);
          const current = player.region.id === region.id;
          return (
            <div key={region.id} className={`row ${unlocked ? '' : 'muted'}`}>
              <span className="emoji">{region.emoji}</span>
              <div className="grow">
                <div className="title">
                  {region.name} <span className="tag">×{region.mult}</span>
                  {current && <span className="tag me">الحالية</span>}
                </div>
                <div className="desc">{unlocked ? region.tagline : `${t('mine.locked')} — ${t('mine.unlockAt')} ${short(region.unlockTotalMined)} 🪙`}</div>
                <div className="small muted mt8">آثار: {region.relics.map((id) => catalog.relics.find((r) => r.id === id)?.emoji).join(' ')}</div>
              </div>
              {unlocked && !current && (
                <button className="btn primary small" disabled={busy} onClick={() => onPick(region.id)}>اختيار</button>
              )}
            </div>
          );
        })}
        <button className="btn ghost big mt12" onClick={close}>{t('modals.close')}</button>
      </Sheet>
    );
  }

  if (modal.type === 'relic') {
    const { relic, count, firstAt, rarity } = modal.payload;
    return (
      <Sheet onClose={close}>
        <div className="big-emoji">{relic.emoji}</div>
        <div className="head">{relic.name}</div>
        <div className="small" style={{ color: rarity?.color, fontWeight: 700 }}>{rarity?.emoji} {rarity?.name}</div>
        <div className="relic-card">
          <div className="flavor">«{relic.flavor}»</div>
          <div className="small muted mt8">عدد النسخ: {num(count)} · أول اكتشاف: {dateShort(firstAt)}</div>
        </div>
        <button className="btn primary big" onClick={close}>{t('modals.close')}</button>
      </Sheet>
    );
  }

  if (modal.type === 'help') {
    return (
      <Sheet onClose={close} wide>
        <div className="head center">📖 {t('modals.helpTitle')}</div>
        <p className="card-sub">{t('help.intro')}</p>
        <ul className="body" style={{ paddingInlineStart: 18, textAlign: 'start' }}>
          {(Array.isArray(t('help.bullets')) ? t('help.bullets') : []).map((line, i) => <li key={i} className="small mt8">{line}</li>)}
        </ul>
        <p className="card-sub">🎲 {t('help.odds')}</p>
        <p className="card-sub">💰 لا يوجد شراء حقيقي: الجواهر تُجمع باللعب فقط.</p>
        <p className="card-sub">🔒 {t('help.footer')}</p>
        <button className="btn ghost big mt12" onClick={() => { close(); onStartTour?.(); }}>🎓 {t('tutorial.replay')}</button>
        <button className="btn ghost big mt8" onClick={() => { actions.logout?.(); }}>🚪 {t('modals.logout')}</button>
        <button className="btn primary big mt8" onClick={close}>{t('modals.close')}</button>
      </Sheet>
    );
  }

  return null;
}
