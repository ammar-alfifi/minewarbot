// شاشة المنجم: التعدين، المنطقة، الأهداف، الحفرة اليومية
import React, { useRef, useState } from 'react';
import { t } from '../i18n.js';
import { num, short, percent, duration } from '../format.js';
import { Progress, Stat, Countdown, StreakStrip } from './ui.jsx';
import { useTick } from '../hooks/useGame.js';

// شظايا ثابتة الاتجاه (بلا عشوائية) حتى تكون الحركة نفسها في كل ضربة.
const DEBRIS = [
  { dx: -34, dy: -30, d: 0 }, { dx: 30, dy: -36, d: 30 }, { dx: -22, dy: 18, d: 50 },
  { dx: 26, dy: 22, d: 15 }, { dx: -6, dy: -44, d: 60 }, { dx: 8, dy: 34, d: 40 },
];
let burstSeq = 0;

export default function MineTab({ game }) {
  const { player, actions, setModal, pushToast, busy, pending, catalog } = game;
  const [crack, setCrack] = useState(0);
  const [bursts, setBursts] = useState([]);
  const [shake, setShake] = useState(false);
  const streakRef = useRef(0);
  const resetRef = useRef(null);
  useTick(1000);
  if (!player) return null;

  const onTap = (e) => {
    game.tap(e);
    // تكسّر الصخرة تدريجياً مع النقر المتواصل (تجميلي فقط).
    streakRef.current += 1;
    const level = Math.min(3, Math.floor(streakRef.current / 4));
    setCrack(level);
    if (level === 3) {
      setShake(true);
      setTimeout(() => setShake(false), 220);
    }
    const id = ++burstSeq;
    setBursts((list) => [...list.slice(-4), { id }]);
    setTimeout(() => setBursts((list) => list.filter((b) => b.id !== id)), 700);
    if (resetRef.current) clearTimeout(resetRef.current);
    resetRef.current = setTimeout(() => { streakRef.current = 0; setCrack(0); }, 1400);
  };


  const dailyReady = player.daily.availableAt <= Date.now();
  const boostActive = player.power.boostActive;
  const regions = catalog?.regions || [];
  const stageIndex = Math.max(1, regions.findIndex((r) => r.id === player.region.id) + 1);
  const stageTotal = regions.length || 8;
  const nextRegion = player.goals.nextRegion;
  const nextMilestone = player.goals.nextMilestone;
  // شريط المنطقة القادمة يتبع عدّاد الدورة نفسه الذي يفتح المناطق، لا مجموع الحياة.
  const regionProgress = nextRegion ? Math.min(player.rebirth?.runMined ?? player.stats.totalMined, nextRegion.unlockTotalMined) : 1;
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
              <div className="stage-pill">🎬 {t('mine.stage', { n: stageIndex, total: stageTotal })}</div>
              <div className="title">{player.region.name} <span className="tag">×{player.region.mult}</span></div>
              <div className="desc">{player.region.tagline}</div>
              {player.region.specialty && (
                <div className="small muted mt8">
                  🎯 {t('regionBonus.' + player.region.specialty.specialty?.key)} +{Math.round(player.region.specialty.specialty.value * 100)}%
                  {player.region.specialty.special ? ` · ⭐ ${t('regionBonus.' + player.region.specialty.special.key)} +${Math.round(player.region.specialty.special.value * 100)}%` : ''}
                </div>
              )}
            </div>
          </div>
          <button className="btn small ghost" onClick={() => setModal({ type: 'region' })}>{t('mine.change')}</button>
        </div>
      </div>

      <div className={`mine-stage ${shake ? 'shake' : ''}`}>
        <div className="mine-fx-wrap">
          {pending > 0 && <span className="mine-pending" aria-hidden />}
          {bursts.map((b) => (
            <React.Fragment key={b.id}>
              <span className="mine-shock" aria-hidden />
              {DEBRIS.map((d, i) => (
                <span key={i} className="mine-debris" aria-hidden style={{ '--dx': `${d.dx}px`, '--dy': `${d.dy}px`, '--d': `${d.d}ms` }} />
              ))}
            </React.Fragment>
          ))}
          <button
            className={`mine-btn ${boostActive ? 'boost' : ''} cracks-${crack}`}
            onClick={onTap}
            aria-label={t('mine.tap')}
            title={t('mine.tapHint')}
            data-tour="mine-btn"
          >
            <span className="mine-cracks" aria-hidden />
            <span className="mine-label">
              <span className="mine-pick" aria-hidden>⛏️</span>
              <span className="mine-sub">+{num(player.power.manual)} {boostActive ? '×2' : ''}</span>
            </span>
          </button>
        </div>
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

      <StreakStrip
        streak={player.visit?.streak || 0}
        ready={dailyReady}
        label={`${t('mine.streak')}: ${player.visit?.streak || 0}/7`}
      />

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
