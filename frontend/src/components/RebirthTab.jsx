// شاشة بعث المنجم (Rebirth): شروط الدورة، ما يُصفَّر وما يبقى، شجرة نوى الإرث، وأهداف الدورة.
import React from 'react';
import { t } from '../i18n.js';
import { num, short } from '../format.js';
import { Progress, Stat } from './ui.jsx';

function ConditionRow({ ok, label, detail }) {
  return (
    <div className={`row ${ok ? '' : 'muted'}`}>
      <span className="emoji">{ok ? '✅' : '⬜'}</span>
      <div className="grow">
        <div className="title">{label}</div>
        {detail && <div className="desc">{detail}</div>}
      </div>
    </div>
  );
}

export default function RebirthTab({ game }) {
  const { player, actions, busy, setModal } = game;
  if (!player?.rebirth || !player?.legacy) return null;

  const rb = player.rebirth;
  const legacy = player.legacy;
  const c = rb.conditions;
  // عدد المناطق والعتبة القادمة من المصدر (rules/engine) لا مثبّتان في الواجهة.
  const totalRegions = rb.totalRegions || (game.catalog?.regions?.length ?? player.regionsUnlocked.length);
  const runPct = Math.min(100, rb.threshold > 0 ? (rb.runMined / rb.threshold) * 100 : 0);
  const manualPct = Math.min(100, (rb.runManualMined / rb.manualThreshold) * 100);

  // المتبقي لكل شرط — صياغة واضحة تساعد اللاعب على معرفة خطوته التالية.
  const remaining = [];
  const regionsLeft = Math.max(0, totalRegions - player.regionsUnlocked.length);
  if (regionsLeft) remaining.push(t('rebirth.remainingRegions', { n: regionsLeft }));
  const runLeft = Math.max(0, rb.threshold - rb.runMined);
  if (runLeft) remaining.push(t('rebirth.remainingRun', { n: short(runLeft) }));
  const manualLeft = Math.max(0, rb.manualThreshold - rb.runManualMined);
  if (manualLeft) remaining.push(t('rebirth.remainingManual', { n: short(manualLeft) }));
  const pickLeft = Math.max(0, rb.minPickaxe - player.equipment.pickaxe);
  if (pickLeft) remaining.push(t('rebirth.remainingPickaxe', { n: num(pickLeft) }));
  const workersLeft = Math.max(0, rb.minWorkers - player.workers);
  if (workersLeft) remaining.push(t('rebirth.remainingWorkers', { n: num(workersLeft) }));

  const cycle = rb.cycleGoals || { goals: [], claimed: 0, total: 0 };
  const onGoal = (goal) => actions.cycleGoal(goal.id);
  const onLegacy = (track) => actions.legacy(track.id);

  return (
    <div>
      <div className="card">
        <h3 className="card-title">🌅 {t('rebirth.title')}</h3>
        <p className="card-sub">{t('rebirth.subtitle')}</p>
        <div className="stat-grid">
          <Stat value={num(rb.count)} label={t('rebirth.cycle')} />
          <Stat value={short(rb.threshold)} label={t('rebirth.threshold')} />
          <Stat value={`${legacy.cores} ✨`} label={t('rebirth.coresNow')} />
        </div>
        <div className="row mt8">
          <span className="emoji">{rb.badge?.emoji || '🌱'}</span>
          <div className="grow">
            <div className="title">{t('rebirth.badge')}: {rb.badge?.name || '🌱'}</div>
            <div className="desc">
              {rb.nextBadge
                ? t('rebirth.nextBadge', { n: rb.nextBadge.remaining })
                : t('rebirth.badgeMaxed')}
            </div>
          </div>
        </div>
        {rb.seeded && <p className="card-sub">🎁 {t('rebirth.seeded')}</p>}
      </div>

      <div className="card">
        <div className="between mb8">
          <span className="small">⛏️ {t('rebirth.runMined')}</span>
          <span className="small muted">{short(rb.runMined)} / {short(rb.threshold)}</span>
        </div>
        <Progress value={runPct} max={100} />
        <div className="between mt12 mb8">
          <span className="small">✊ {t('rebirth.runManual')}</span>
          <span className="small muted">{short(rb.runManualMined)} / {short(rb.manualThreshold)}</span>
        </div>
        <Progress value={manualPct} max={100} />
      </div>

      <div className="card">
        <h3 className="card-title">🎯 {t('rebirth.conditions')}</h3>
        <ConditionRow ok={c.regions} label={t('rebirth.condRegions')} detail={`${player.regionsUnlocked.length}/${totalRegions}`} />
        <ConditionRow ok={c.runMined} label={t('rebirth.condRun')} detail={`${short(rb.runMined)} / ${short(rb.threshold)}`} />
        <ConditionRow ok={c.manual} label={t('rebirth.condManual')} detail={`${short(rb.runManualMined)} / ${short(rb.manualThreshold)}`} />
        <ConditionRow ok={c.pickaxe} label={`${t('rebirth.condPickaxe')} (${rb.minPickaxe})`} detail={`المعول: ${player.equipment.pickaxe}`} />
        <ConditionRow ok={c.workers} label={`${t('rebirth.condWorkers')} (${rb.minWorkers})`} detail={`${t('upgrades.workers')}: ${num(player.workers)}`} />

        <div className="card tight mt12" style={{ textAlign: 'start' }}>
          <div className="small"><b>🧭 {t('rebirth.remainingTitle')}</b></div>
          {remaining.length
            ? <ul className="small muted" style={{ margin: '6px 0 0', paddingInlineStart: 18 }}>{remaining.map((line, i) => <li key={i}>{line}</li>)}</ul>
            : <div className="small" style={{ color: 'var(--success)' }}>{t('rebirth.remainingAll')}</div>}
        </div>

        {rb.eligible ? (
          <>
            <div className="card tight mt12" style={{ textAlign: 'center' }}>
              <div className="small">{t('rebirth.cores')}: <b>{rb.cores} ✨</b></div>
              <div className="small muted mt8">{t('rebirth.nextThreshold', { n: short(rb.nextThreshold) })}</div>
            </div>
            <button className="btn primary big mt8" disabled={busy} onClick={() => setModal({ type: 'rebirth' })}>
              ✨ {t('rebirth.doRebirth')}
            </button>
          </>
        ) : (
          <p className="card-sub center mt8">⏳ {t('rebirth.notReady')}</p>
        )}
      </div>

      <div className="card">
        <div className="between mb8">
          <span className="card-title">🏁 {t('rebirth.cycleGoalsTitle')}</span>
          <span className="small muted">{t('rebirth.cycleGoalsProgress', { done: cycle.claimed, total: cycle.total })}</span>
        </div>
        <p className="card-sub">{t('rebirth.cycleGoalsHint')}</p>
        {(cycle.goals || []).map((goal) => (
          <div key={goal.id} className={`row ${goal.claimed ? 'muted' : ''}`}>
            <span className="emoji">{goal.emoji}</span>
            <div className="grow">
              <div className="title">{goal.name}</div>
              <div className="desc">
                {short(goal.progress)} / {short(goal.threshold)}
                {' · '}
                {goal.reward?.coins ? t('rebirth.cycleGoalReward', { coins: short(goal.reward.coins) }) : ''}
              </div>
            </div>
            {goal.claimed ? (
              <span className="tag">{t('rebirth.cycleGoalClaimed')}</span>
            ) : goal.claimable ? (
              <button className="btn small success" disabled={busy} onClick={() => onGoal(goal)}>
                {t('rebirth.cycleGoalClaim')}
              </button>
            ) : (
              <span className="tag">{t('rebirth.cycleGoalLocked')}</span>
            )}
          </div>
        ))}
      </div>

      <div className="card">
        <h3 className="card-title">🧬 {t('rebirth.legacyTitle')}</h3>
        <p className="card-sub">{t('rebirth.legacyHint', { cost: legacy.cost })}</p>
        {legacy.tracks.map((tr) => (
          <div key={tr.id} className="row">
            <span className="emoji">{tr.emoji}</span>
            <div className="grow">
              <div className="title">
                {tr.name} <span className="tag">✨ {tr.rank}/{tr.maxRank}</span>
              </div>
              <div className="desc">{tr.desc}</div>
            </div>
            {tr.maxed ? (
              <span className="tag">{t('rebirth.maxed')}</span>
            ) : (
              <button className="btn small success" disabled={busy || !tr.canBuy} onClick={() => onLegacy(tr)} title={tr.canBuy ? '' : t('rebirth.noCores')}>
                ✨ {legacy.cost}
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="card">
        <h3 className="card-title">♻️ {t('rebirth.resetTitle')}</h3>
        <p className="card-sub">{rb.resetNote}</p>
        <h3 className="card-title mt12">🔒 {t('rebirth.keepTitle')}</h3>
        <p className="card-sub">{rb.keepNote}</p>
      </div>
    </div>
  );
}
