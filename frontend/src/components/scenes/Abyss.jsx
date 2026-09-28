// مشهد «الهاوية الأبدية»: سديم بنفسجي، نجوم، بوّابة مظلمة، وصخور معلّقة.
import React from 'react';

const STARS = [
  { x: 30, y: 52, r: 1.5 }, { x: 78, y: 130, r: 1 }, { x: 128, y: 70, r: 1.7 },
  { x: 186, y: 120, r: 1.1 }, { x: 240, y: 62, r: 1.4 }, { x: 296, y: 132, r: 1 },
  { x: 352, y: 78, r: 1.6 }, { x: 48, y: 240, r: 1.2 }, { x: 356, y: 262, r: 1.1 },
  { x: 96, y: 356, r: 1.3 }, { x: 312, y: 372, r: 1.2 }, { x: 210, y: 200, r: 1.9 },
  { x: 60, y: 500, r: 1.1 }, { x: 342, y: 512, r: 1.3 }, { x: 170, y: 590, r: 1 },
];
const FLOATERS = [
  { x: 48, y: 250, s: 0.9, d: 0 }, { x: 340, y: 300, s: 1.1, d: 2 }, { x: 90, y: 470, s: 0.8, d: 3.4 },
  { x: 300, y: 520, s: 1, d: 1.2 },
];

export default function Abyss() {
  return (
    <svg className="scene-svg" viewBox="0 0 400 800" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id="sc-abyss-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#160a34" />
          <stop offset="52%" stopColor="#0c0620" />
          <stop offset="100%" stopColor="#03020c" />
        </linearGradient>
        <radialGradient id="sc-abyss-nebula" cx="50%" cy="40%" r="55%">
          <stop offset="0%" stopColor="#a855f7" stopOpacity="0.42" />
          <stop offset="45%" stopColor="#6d28d9" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#4c1d95" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="sc-abyss-nebula2" cx="30%" cy="66%" r="46%">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="sc-abyss-portal" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#000000" stopOpacity="0.95" />
          <stop offset="62%" stopColor="#2a1250" stopOpacity="0.85" />
          <stop offset="88%" stopColor="#a855f7" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#c084fc" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="sc-abyss-rock" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3b2168" />
          <stop offset="100%" stopColor="#140a2c" />
        </linearGradient>
        <radialGradient id="sc-abyss-core" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f3e8ff" stopOpacity="0.8" />
          <stop offset="58%" stopColor="#c084fc" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#c084fc" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="400" height="800" fill="url(#sc-abyss-sky)" />
      <rect width="400" height="800" fill="url(#sc-abyss-nebula2)" />
      <rect width="400" height="800" fill="url(#sc-abyss-nebula)" className="fx-nebula" />

      {/* نجوم */}
      {STARS.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#f3e8ff" className="fx-twinkle" style={{ animationDelay: `${(i % 5) * 0.6}s` }} />
      ))}

      {/* البوّابة المظلمة */}
      <g className="fx-portal">
        <circle cx="200" cy="360" r="150" fill="url(#sc-abyss-portal)" />
        <circle cx="200" cy="360" r="96" fill="none" stroke="#c084fc" strokeWidth="2.5" opacity="0.55" />
        <circle cx="200" cy="360" r="120" fill="none" stroke="#7c3aed" strokeWidth="1.5" opacity="0.35" />
        <ellipse cx="200" cy="360" rx="56" ry="36" fill="url(#sc-abyss-core)" />
      </g>

      {/* صخور معلّقة */}
      {FLOATERS.map((f, i) => (
        <g key={i} className="fx-float" style={{ animationDelay: `${f.d}s` }}>
          <g transform={`translate(${f.x} ${f.y}) scale(${f.s})`}>
            <path d="M-16 0 L-6 -13 L10 -9 L16 4 L4 14 L-12 11 Z" fill="url(#sc-abyss-rock)" />
            <path d="M-6 -13 L10 -9 L4 14 L-12 11 Z" fill="#4c2a80" opacity="0.6" />
          </g>
        </g>
      ))}

      {/* شقوق أرضية متوهّجة */}
      <path d="M60 640 L110 700 L90 760 M300 640 L256 708 L282 764" fill="none" stroke="#a855f7" strokeWidth="3" opacity="0.5" strokeLinecap="round" />

      {/* أرضية الهاوية */}
      <path d="M0 690 Q100 660 200 684 T400 668 L400 800 L0 800 Z" fill="#07041a" />
      <path d="M0 726 Q110 694 220 724 T400 710 L400 800 L0 800 Z" fill="#04030f" />
      <ellipse cx="200" cy="770" rx="170" ry="34" fill="#7c3aed" opacity="0.14" />
    </svg>
  );
}
