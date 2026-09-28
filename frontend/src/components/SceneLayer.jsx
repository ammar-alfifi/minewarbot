// طبقة المشهد: خلفية SVG طبقية + جزيئات محيطة بلون المنطقة الحالية.
// عرض فقط، بلا تفاعل (pointer-events: none)، والمواضع ثابتة لتفادي أي اهتزاز.
import React from 'react';
import { DEFAULT_SCENE } from '../scenes.js';

const PARTICLE_COUNT = 9;
// مواضع/تأخيرات ثابتة (لا عشوائية) حتى تكون الرسمة نفسها في كل مرة.
const SEEDS = [
  { x: 8, d: 0, s: 1.0, t: 15 }, { x: 21, d: 4.5, s: 0.7, t: 12 },
  { x: 34, d: 1.4, s: 1.2, t: 18 }, { x: 47, d: 6.0, s: 0.8, t: 14 },
  { x: 58, d: 2.6, s: 1.1, t: 16 }, { x: 69, d: 7.4, s: 0.9, t: 13 },
  { x: 79, d: 3.3, s: 1.3, t: 19 }, { x: 88, d: 5.2, s: 0.75, t: 12 },
  { x: 95, d: 8.1, s: 1.05, t: 17 },
];

export default function SceneLayer({ scene = DEFAULT_SCENE }) {
  const s = scene || DEFAULT_SCENE;
  return (
    <div
      className="scene"
      aria-hidden="true"
      style={{
        '--scene-accent': s.accent,
        '--scene-accent2': s.accent2,
        '--scene-sky': s.sky,
        '--scene-ground': s.ground,
      }}
    >
      <svg className="scene-svg" viewBox="0 0 400 800" preserveAspectRatio="xMidYMax slice">
        <defs>
          <linearGradient id="sceneSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={s.accent2} stopOpacity="0.42" />
            <stop offset="52%" stopColor={s.sky} stopOpacity="0.12" />
            <stop offset="100%" stopColor={s.sky} stopOpacity="0" />
          </linearGradient>
          <linearGradient id="sceneFar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={s.accent} stopOpacity="0.16" />
            <stop offset="100%" stopColor={s.accent} stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="400" height="800" fill="url(#sceneSky)" />
        {/* جبال بعيدة */}
        <path d="M0 300 L70 210 L140 290 L210 195 L290 285 L350 225 L400 290 L400 800 L0 800 Z" fill="url(#sceneFar)" />
        {/* تلال قريبة */}
        <path d="M0 430 L90 350 L180 425 L270 335 L360 420 L400 380 L400 800 L0 800 Z" fill={s.accent} opacity="0.08" />
        {/* أرض */}
        <path d="M0 560 Q100 520 200 555 T400 540 L400 800 L0 800 Z" fill={s.ground} opacity="0.22" />
      </svg>

      <div className={`scene-particles ${s.particle}`}>
        {SEEDS.slice(0, PARTICLE_COUNT).map((p, i) => {
          const twinkle = s.particle === 'star' || s.particle === 'sparkle';
          const fall = s.particle === 'snow';
          return (
            <i
              key={i}
              style={{
                left: `${p.x}%`,
                top: twinkle ? `${(12 + i * 8) % 74}%` : (fall ? '-5%' : undefined),
                animationDelay: `${p.d}s`,
                animationDuration: `${p.t}s`,
                width: `${(p.s * 4).toFixed(1)}px`,
                height: `${(p.s * 4).toFixed(1)}px`,
                background: s.particles[i % s.particles.length],
              }}
            />
          );
        })}
      </div>

      <span className="scene-glow" />
    </div>
  );
}
