// شاشة المنجم: التعدين، المنطقة، الأهداف، الحفرة اليومية
import React from 'react';
import { t } from '../i18n.js';
import { num, short, percent, duration } from '../format.js';
import { Progress, Stat, Countdown } from './ui.jsx';
import { useTick } from '../hooks/useGame.js';

export default function MineTab({ game }) {
  const { player, actions, setModal, pushToast, busy } = game;
  useTick(1000);
  if (!player) return null;

  const dailyReady = player.daily.availableAt <= Date.now();
  const boostActive = player.power.boostActive;
  const nextRegion = player.goals.nextRegion;
  const nextMilestone = player.goals.nextMilestone;
  const regionProgress = nextRegion ? Math.min(player.stats.totalMined, nextRegion.unlockTotalMined) : 1;
  const event = player.power.event;

  const onDaily = async () => {
    const res = await actions.daily();
    if (res) setModal({ type: 'daily', payload: res.result });
  };

  const onBoost = async () => {
    const res = await actions.upgrade('boost', 1);
    if (res) pushToast(t('toasts.boost'), 'success');
  };

  return (
    <div>
      {event && (
        <div className="banner">
          <span className="em">{event.emoji}</span>
          <div className="grow">
            <b>{t('header.event')}: {event.name}</b>
            <div className="muted small">{event.desc}</div>
          </div>
        </div>
      )}

      <div className="card tight" data-tour="region-card">
        <div className="between">
          <div className="flex">
            <span style={{ fontSize: 26 }}>{player.region.emoji}</span>
            <div>
              <div className="title">{player.region.name} <span className="tag">×{player.region.mult}</span></div>
              <div className="desc">{player.region.tagline}</div>
              {player.region.specialty && (
                <div className="small muted mt8">
                  🎯 {player.region.specialty.specialty?.label} +{Math.round(player.region.specialty.specialty.value * 100)}%
                  {player.region.specialty.special ? ` · ⭐ ${player.region.specialty.special.label} +${Math.round(player.region.specialty.special.value * 100)}%` : ''}
                </div>
              )}
            </div>
          </div>
          <button className="btn small ghost" onClick={() => setModal({ type: 'region' })}>{t('mine.change')}</button>
        </div>
      </div>

      <div className="mine-stage">
        <button
          className={`mine-btn ${boostActive ? 'boost' : ''}`}
          onClick={(e) => game.tap(e)}
          aria-label={t('mine.tap')}
          title={t('mine.tapHint')}
          data-tour="mine-btn"
        >
          <span style={{ display: 'grid', placeItems: 'center' }}>
            <span>⛏️</span>
            <span className="sub">+{num(player.power.manual)} {boostActive ? '×2' : ''}</span>
          </span>
        </button>
        <div className="muted small mt8">{t('mine.tapHint')}</div>
      </div>

      <div className="stat-grid mt12">
        <Stat value={`⚡ ${short(player.power.manual)}`} label={t('header.power')} />
        <Stat value={`🤖 ${short(player.power.idlePerSec)}`} label={t('header.idle')} />
        <Stat value={`🧑‍🏭 ${num(player.workers)}`} label={t('upgrades.workers')} />
      </div>

      <div className="flex mt12" style={{ gap: 8 }}>
        <button className="btn primary grow" onClick={onDaily} disabled={!dailyReady || busy} data-tour="daily-btn">
          {dailyReady ? `🕳️ ${t('mine.dailyReady')}` : `🕳️ ${t('mine.dailyWait')} — ${duration(player.daily.availableAt - Date.now())}`}
        </button>
        <button
          className={`btn grow ${boostActive ? 'ghost' : 'success'}`}
          onClick={onBoost}
          disabled={busy || boostActive || player.gems < 5}
        >
          {boostActive ? `⚡ ${duration(player.power.boostUntil - Date.now())}` : `⚡ ${t('mine.boostBuy')} (5💎)`}
        </button>
      </div>

      <div className="card mt12">
        <h3 className="card-title">🎯 {t('mine.nextRegion')}</h3>
        {nextRegion ? (
          <>
            <div className="between mb8">
              <span>{nextRegion.emoji} {nextRegion.name}</span>
              <span className="muted small">{t('mine.unlockAt')} {short(nextRegion.unlockTotalMined)} · {t('mine.remaining')} {short(nextRegion.remaining)}</span>
            </div>
            <Progress value={regionProgress} max={nextRegion.unlockTotalMined} />
          </>
        ) : (
          <div className="muted small">🏅 وصلت لأعماق الهاوية — كل المناطق مفتوحة!</div>
        )}
        {nextMilestone && (
          <div className="mt12">
            <div className="between mb8">
              <span>{nextMilestone.emoji} {t('mine.nextMilestone')}: {nextMilestone.name}</span>
              <span className="muted small">{t('mine.remaining')} {short(nextMilestone.remaining)}</span>
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <h3 className="card-title">🤖 {t('mine.workerIncome')}</h3>
        <div className="row">
          <span className="emoji">📈</span>
          <div className="grow">
            <div className="title">{short(player.power.idlePerSec)} {t('header.coins')}/ث</div>
            <div className="desc">{t('mine.offlineCap', { hours: player.power.offlineCapHours })} — ارفع المخزن لسقف أعلى.</div>
          </div>
        </div>
        <div className="row">
          <span className="emoji">💎</span>
          <div className="grow">
            <div className="title">{percent(player.chances.gemPerTap)}</div>
            <div className="desc">{t('mine.gemsChance')} — بحد أقصى جوهرة كل دقيقة.</div>
          </div>
        </div>
        <div className="row">
          <span className="emoji">🏺</span>
          <div className="grow">
            <div className="title">{percent(player.chances.relicPerTap)}</div>
            <div className="desc">{t('mine.relicChance')} — بحد أقصى أثر كل ٢٫٥ دقيقة.</div>
          </div>
        </div>
      </div>

      <p className="muted small center">
        كل الأرقام أعلاه معلنة بشفافية، وتشمل مكافآت حدث الأسبوع. {t('help.footer')}
      </p>
    </div>
  );
}
