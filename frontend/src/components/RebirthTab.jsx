// شاشة بعث المنجم (Rebirth): شروط الدورة، ما يُصفَّر وما يبقى، وشجرة نوى الإرث.
import React from 'react';
import { t } from '../i18n.js';
import { num, short, duration } from '../format.js';
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
  const runPct = Math.min(100, rb.threshold > 0 ? (rb.runMined / rb.threshold) * 100 : 0);
  const manualPct = Math.min(100, (rb.runManualMined / rb.manualThreshold) * 100);

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
        <ConditionRow ok={c.regions} label={t('rebirth.condRegions')} detail={`${player.regionsUnlocked.length}/8`} />
        <ConditionRow ok={c.runMined} label={t('rebirth.condRun')} detail={`${short(rb.runMined)} / ${short(rb.threshold)}`} />
        <ConditionRow ok={c.manual} label={t('rebirth.condManual')} detail={`${short(rb.runManualMined)} / ${short(rb.manualThreshold)}`} />
        <ConditionRow ok={c.pickaxe} label={`${t('rebirth.condPickaxe')} (${rb.minPickaxe})`} detail={`المعول: ${player.equipment.pickaxe}`} />
        <ConditionRow ok={c.workers} label={`${t('rebirth.condWorkers')} (${rb.minWorkers})`} detail={`${t('upgrades.workers')}: ${num(player.workers)}`} />
        {rb.eligible ? (
          <>
            <div className="card tight mt12" style={{ textAlign: 'center' }}>
              <div className="small">{t('rebirth.cores')}: <b>{rb.cores} ✨</b></div>
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
