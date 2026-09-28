// مشهد «كهف الكريستال»: أعمدة بلّورية متوهّجة، أعمدة ضوء من الأعلى، وأرضية تعكس الضوء.
import React from 'react';

export default function Crystal() {
  return (
    <svg className="scene-svg" viewBox="0 0 400 800" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id="sc-crystal-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0a2a5e" />
          <stop offset="55%" stopColor="#123a7a" />
          <stop offset="100%" stopColor="#061836" />
        </linearGradient>
        <radialGradient id="sc-crystal-glow" cx="50%" cy="38%" r="58%">
          <stop offset="0%" stopColor="#9fe8ff" stopOpacity="0.42" />
          <stop offset="100%" stopColor="#9fe8ff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="sc-crystal-c" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#c8f4ff" />
          <stop offset="45%" stopColor="#3fa8f5" />
          <stop offset="100%" stopColor="#1b3fa0" />
        </linearGradient>
        <linearGradient id="sc-crystal-c2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e4f8ff" />
          <stop offset="100%" stopColor="#2b6fd6" />
        </linearGradient>
      </defs>

      <rect width="400" height="800" fill="url(#sc-crystal-sky)" />
      <rect width="400" height="800" fill="url(#sc-crystal-glow)" />

      {/* أعمدة ضوء */}
      <path d="M150 0 L118 340 L196 350 L188 0 Z" fill="#c8f0ff" opacity="0.1" />
      <path d="M258 0 L292 300 L340 288 L316 0 Z" fill="#c8f0ff" opacity="0.06" />
      <path d="M60 0 L52 220 L96 226 L96 0 Z" fill="#c8f0ff" opacity="0.05" />

      {/* بلورات السقف */}
      <path d="M64 0 l22 84 -18 12 -18 -66 Z" fill="url(#sc-crystal-c)" opacity="0.85" />
      <path d="M300 0 l26 96 -20 14 -22 -74 Z" fill="url(#sc-crystal-c2)" opacity="0.8" />
      <path d="M200 0 l14 58 -12 8 -12 -46 Z" fill="url(#sc-crystal-c)" opacity="0.6" />

      {/* مجموعة بلورات يسار */}
      <g className="fx-shine">
        <path d="M42 700 L78 520 L104 540 L82 700 Z" fill="url(#sc-crystal-c)" />
        <path d="M104 700 L128 560 L150 578 L134 700 Z" fill="url(#sc-crystal-c2)" opacity="0.9" />
        <path d="M18 700 L40 596 L58 610 L44 700 Z" fill="url(#sc-crystal-c)" opacity="0.75" />
      </g>

      {/* مجموعة بلورات يمين */}
      <g className="fx-shine fx-delay">
        <path d="M356 700 L320 500 L294 522 L316 700 Z" fill="url(#sc-crystal-c)" />
        <path d="M300 700 L276 552 L252 570 L268 700 Z" fill="url(#sc-crystal-c2)" opacity="0.9" />
        <path d="M384 700 L362 588 L344 602 L358 700 Z" fill="url(#sc-crystal-c)" opacity="0.7" />
      </g>

      {/* بلورة مركزية بعيدة */}
      <path d="M200 470 L222 380 L244 470 Z" fill="#8fe0ff" opacity="0.35" />
      <path d="M178 486 L192 414 L208 486 Z" fill="#5fc8ff" opacity="0.28" />

      {/* أرضية بلّورية */}
      <path d="M0 690 Q100 660 200 682 T400 668 L400 800 L0 800 Z" fill="#08203f" />
      <path d="M120 706 L150 790 L96 790 Z" fill="#3fa8f5" opacity="0.16" />
      <path d="M280 702 L312 792 L252 792 Z" fill="#3fa8f5" opacity="0.14" />
      <path d="M200 700 L222 780 L178 780 Z" fill="#9fe8ff" opacity="0.1" />
    </svg>
  );
}
