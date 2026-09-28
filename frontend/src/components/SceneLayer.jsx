// طبقة المشهد: رسمة SVG خاصة بالمنطقة + جزيئات محيطة + وَهج + تعتيم وسط الشاشة.
// عرض فقط، بلا تفاعل (pointer-events: none)، والمواضع ثابتة لتفادي أي اهتزاز.
import React from 'react';
import { DEFAULT_SCENE } from '../scenes.js';
import { artFor } from './scenes/index.js';

const PARTICLE_COUNT = 12;
// مواضع/تأخيرات ثابتة (لا عشوائية) حتى تكون الرسمة نفسها في كل مرة.
const SEEDS = [
  { x: 6, d: 0, s: 1.0, t: 15 }, { x: 17, d: 4.5, s: 0.7, t: 12 },
  { x: 28, d: 1.4, s: 1.2, t: 18 }, { x: 39, d: 6.0, s: 0.8, t: 14 },
  { x: 47, d: 2.6, s: 1.1, t: 16 }, { x: 56, d: 7.4, s: 0.9, t: 13 },
  { x: 64, d: 3.3, s: 1.3, t: 19 }, { x: 72, d: 5.2, s: 0.75, t: 12 },
  { x: 80, d: 8.1, s: 1.05, t: 17 }, { x: 87, d: 1.9, s: 0.85, t: 14 },
  { x: 93, d: 6.8, s: 1.15, t: 16 }, { x: 98, d: 3.9, s: 0.7, t: 13 },
];

export default function SceneLayer({ scene = DEFAULT_SCENE }) {
  const s = scene || DEFAULT_SCENE;
  const Art = artFor(s.id);
  return (
    <div
      className="scene"
      data-region={s.id}
      aria-hidden="true"
      style={{
        '--scene-accent': s.accent,
        '--scene-accent2': s.accent2,
        '--scene-sky': s.ground,
        '--scene-ground': s.ground,
        '--scene-fog': s.fog,
      }}
    >
      <Art />
      <div className={`scene-particles ${s.particle}`}>
        {SEEDS.slice(0, PARTICLE_COUNT).map((p, i) => {
          const twinkle = s.particle === 'star' || s.particle === 'sparkle';
          const fall = s.particle === 'snow';
          return (
            <i
              key={i}
              style={{
                left: `${p.x}%`,
                top: twinkle ? `${(10 + i * 7) % 76}%` : (fall ? '-5%' : undefined),
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
      <span className="scene-scrim" />
    </div>
  );
}
