// مشهد «شقوق اللافا»: صخور بازلتية، أنهار لافا متوهّجة، وهوابط من الأعلى.
import React from 'react';

export default function Lava() {
  return (
    <svg className="scene-svg" viewBox="0 0 400 800" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id="sc-lava-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3a0d08" />
          <stop offset="48%" stopColor="#220604" />
          <stop offset="100%" stopColor="#0d0202" />
        </linearGradient>
        <linearGradient id="sc-lava-flow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffe27a" />
          <stop offset="42%" stopColor="#ff7a1a" />
          <stop offset="100%" stopColor="#b81b0a" />
        </linearGradient>
        <radialGradient id="sc-lava-glow" cx="50%" cy="72%" r="62%">
          <stop offset="0%" stopColor="#ff8a2e" stopOpacity="0.75" />
          <stop offset="55%" stopColor="#e2401a" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#e2401a" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="sc-lava-lake" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="#fff0a8" />
          <stop offset="45%" stopColor="#ff8a1a" />
          <stop offset="100%" stopColor="#c21f08" />
        </radialGradient>
      </defs>

      <rect width="400" height="800" fill="url(#sc-lava-sky)" />

      {/* هوابط بازلتية */}
      <path d="M0 0 L400 0 L400 96 L340 150 L300 84 L250 160 L196 78 L150 158 L104 92 L60 150 L0 96 Z" fill="#1c0503" />
      {/* صخور جانبية */}
      <path d="M0 240 L70 200 L104 300 L64 400 L0 372 Z" fill="#250705" />
      <path d="M400 230 L330 196 L296 306 L338 412 L400 380 Z" fill="#250705" />
      <path d="M0 470 L56 436 L84 520 L40 596 L0 566 Z" fill="#1c0503" opacity="0.9" />
      <path d="M400 456 L348 424 L318 512 L360 592 L400 560 Z" fill="#1c0503" opacity="0.9" />

      {/* شقوق متوهّجة */}
      <path d="M120 300 L146 360 L128 424 L156 486 L138 548" fill="none" stroke="url(#sc-lava-flow)" strokeWidth="7" strokeLinecap="round" className="fx-lava-line" />
      <path d="M286 268 L262 330 L284 392 L256 452 L276 516" fill="none" stroke="url(#sc-lava-flow)" strokeWidth="6" strokeLinecap="round" className="fx-lava-line fx-delay" />
      <path d="M200 150 L186 214 L208 262" fill="none" stroke="#ff7a1a" strokeWidth="4" strokeLinecap="round" opacity="0.7" className="fx-lava-line" />

      {/* نهر لافا */}
      <path d="M-10 600 Q60 566 120 604 T250 596 T410 620 L410 700 Q250 660 120 690 T-10 676 Z" fill="url(#sc-lava-flow)" className="fx-lava" />

      <rect width="400" height="800" fill="url(#sc-lava-glow)" />

      {/* بحيرة لافا أمامية */}
      <path d="M0 700 Q100 674 200 700 T400 690 L400 800 L0 800 Z" fill="#180403" />
      <ellipse cx="200" cy="756" rx="150" ry="42" fill="url(#sc-lava-lake)" opacity="0.85" className="fx-lava" />
      <ellipse cx="200" cy="756" rx="150" ry="42" fill="none" stroke="#ffb066" strokeWidth="3" opacity="0.4" />

      {/* صخور أمامية */}
      <path d="M0 800 L0 740 L58 716 L104 768 L96 800 Z" fill="#0d0202" />
      <path d="M400 800 L400 736 L344 712 L300 766 L306 800 Z" fill="#0d0202" />
    </svg>
  );
}
