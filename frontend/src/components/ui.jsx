// عناصر واجهة صغيرة مشتركة
import React from 'react';
import { useTick } from '../hooks/useGame.js';
import { duration, num, percent } from '../format.js';

export function Progress({ value, max, kind = '' }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className={`progress ${kind}`} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <i style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Stat({ value, label, title }) {
  return (
    <div className="stat" title={title}>
      <div className="v">{value}</div>
      <div className="k">{label}</div>
    </div>
  );
}

export function Countdown({ at, prefix = '', suffix = '' }) {
  useTick(1000);
  const left = Math.max(0, at - Date.now());
  return <span>{prefix}{duration(left)}{suffix}</span>;
}

export function EffectText({ effect, id }) {
  if (!effect) return null;
  switch (id) {
    case 'pickaxe': return <>قوة الضربة: {num(effect.manualPower)}</>;
    case 'lamp': return <>فرص الاكتشاف: ×{Number(effect.findMult || 1).toFixed(2)}</>;
    case 'helmet': return <>امتصاص السرقة: {percent(effect.raidDefense || 0, 0)} · دفاع إضافي: {Math.round((effect.shieldBonusMs || 0) / 60000)} د</>;
    case 'cart': return <>إنتاج العمال: ×{Number(effect.workerMult || 1).toFixed(2)}</>;
    case 'smelter': return <>قوة يدوية: ×{Number(effect.manualMult || 1).toFixed(2)}</>;
    case 'storage': return <>سقف الجمع: {effect.offlineCapHours} ساعات</>;
    default: return null;
  }
}

export function RarityBadge({ rarity, rarities }) {
  const def = rarities?.[rarity];
  if (!def) return null;
  return <span className="tag" style={{ color: def.color, borderColor: `${def.color}88` }}>{def.emoji} {def.name}</span>;
}

/** نقاط مستوى بصرية: حتى 10 نقاط، ثم رقم مختصر للأعلى. */
export function LevelPips({ level = 0, max = 10 }) {
  if (!level) return null;
  if (level > max) return <span className="pips" aria-label={`${level}`}><span className="pips-num">×{level}</span></span>;
  return (
    <span className="pips" aria-label={`${level}`}>
      {Array.from({ length: max }).map((_, i) => <i key={i} className={i < level ? 'on' : ''} />)}
    </span>
  );
}

/** شريط سلسلة الزيارات (7 أيام) — يعتمد على visit.streak من السيرفر. */
export function StreakStrip({ streak = 0, ready = false, label = '' }) {
  const done = Math.max(0, Math.min(7, streak || 0));
  const today = Math.min(7, done + 1);
  return (
    <div className="streak" role="img" aria-label={label} title={label}>
      {Array.from({ length: 7 }).map((_, i) => {
        const n = i + 1;
        const isDone = n <= done;
        const isToday = ready && n === today;
        return (
          <span key={n} className={`streak-day ${isDone ? 'done' : ''} ${isToday ? 'today' : ''}`}>
            {isDone ? '✓' : n}
          </span>
        );
      })}
    </div>
  );
}
