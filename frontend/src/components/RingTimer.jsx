// حلقة عدّ تنازلي: تُظهر ما تبقّى من مدة (بوست، درع، مهلة غارة) بصرياً.
import React from 'react';
import { useTick } from '../hooks/useGame.js';

export default function RingTimer({ until, total, size = 34, stroke = 3, color = 'var(--gold)', label = '', children = null }) {
  useTick(1000);
  const left = Math.max(0, (until || 0) - Date.now());
  const indeterminate = !(total > 0);
  const pct = indeterminate ? 0 : Math.max(0, Math.min(1, left / total));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <span className="ring-timer" style={{ width: size, height: size, '--ring-color': color }} title={label}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="color-mix(in srgb, currentColor 22%, transparent)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeLinecap="round"
          className={indeterminate ? 'ring-spin' : ''}
          strokeDasharray={indeterminate ? `${c * 0.28} ${c * 0.72}` : c}
          strokeDashoffset={indeterminate ? 0 : c * (1 - pct)}
          transform={indeterminate ? undefined : `rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span className="ring-timer-core">{children}</span>
    </span>
  );
}
