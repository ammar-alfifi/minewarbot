// مشهد «مدينة الذهب المفقودة»: شمس صحراوية، معبد بأعمدة، قوس مكسور، وكثبان ذهبية.
import React from 'react';

const STEPS = [0, 1, 2, 3, 4];

export default function GoldCity() {
  return (
    <svg className="scene-svg" viewBox="0 0 400 800" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id="sc-gold-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d8a548" />
          <stop offset="46%" stopColor="#8a5518" />
          <stop offset="100%" stopColor="#33200a" />
        </linearGradient>
        <radialGradient id="sc-gold-sun" cx="50%" cy="22%" r="40%">
          <stop offset="0%" stopColor="#fff3c8" stopOpacity="0.95" />
          <stop offset="50%" stopColor="#ffd06a" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#ffb347" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="sc-gold-column" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#f6d488" />
          <stop offset="48%" stopColor="#c9932e" />
          <stop offset="100%" stopColor="#7a4f13" />
        </linearGradient>
        <linearGradient id="sc-gold-sand" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d9a94e" />
          <stop offset="100%" stopColor="#5c3a10" />
        </linearGradient>
      </defs>

      <rect width="400" height="800" fill="url(#sc-gold-sky)" />
      <circle cx="200" cy="180" r="180" fill="url(#sc-gold-sun)" />

      {/* هرم متدرّج بعيد */}
      <g opacity="0.6">
        {STEPS.map((i) => (
          <rect key={i} x={120 + i * 16} y={452 - i * 26} width={160 - i * 32} height="26" fill="#a06a1e" opacity={0.5 + i * 0.06} />
        ))}
      </g>
      {/* أهرام بعيدة صغيرة */}
      <path d="M22 470 L58 404 L94 470 Z" fill="#7a4f13" opacity="0.55" />
      <path d="M312 476 L344 416 L376 476 Z" fill="#7a4f13" opacity="0.5" />

      {/* قوس مكسور */}
      <path d="M84 560 Q200 452 316 560" fill="none" stroke="url(#sc-gold-column)" strokeWidth="20" strokeLinecap="round" />
      <path d="M84 560 V676 M316 560 V676" stroke="url(#sc-gold-column)" strokeWidth="20" strokeLinecap="round" />
      <path d="M244 476 l30 -18 12 22 -28 16 Z" fill="#c9932e" opacity="0.85" />

      {/* أعمدة المعبد */}
      <g className="fx-shine">
        <rect x="126" y="548" width="26" height="150" rx="4" fill="url(#sc-gold-column)" />
        <rect x="116" y="536" width="46" height="16" rx="3" fill="#e8bd63" />
        <rect x="116" y="690" width="46" height="14" rx="3" fill="#a06a1e" />
        <rect x="248" y="548" width="26" height="150" rx="4" fill="url(#sc-gold-column)" />
        <rect x="238" y="536" width="46" height="16" rx="3" fill="#e8bd63" />
        <rect x="238" y="690" width="46" height="14" rx="3" fill="#a06a1e" />
      </g>
      {/* نقش عمود */}
      <path d="M134 574 v104 M144 574 v104 M256 574 v104 M266 574 v104" stroke="#7a4f13" strokeWidth="2" opacity="0.5" />

      {/* بوّابة مظلمة */}
      <path d="M168 700 v-70 q32 -40 64 0 v70 Z" fill="#2a1806" />
      <path d="M180 700 v-58 q20 -26 40 0 v58 Z" fill="#0d0702" />

      {/* كثبان رملية */}
      <path d="M0 672 Q90 620 190 664 T400 646 L400 800 L0 800 Z" fill="url(#sc-gold-sand)" />
      <path d="M0 726 Q120 690 240 724 T400 708 L400 800 L0 800 Z" fill="#7a4f13" opacity="0.7" />
      <path d="M0 772 Q140 742 280 772 T400 758 L400 800 L0 800 Z" fill="#3a2408" opacity="0.85" />

      {/* لمعات ذهبية مبعثرة */}
      <path d="M62 712 l4 10 10 4 -10 4 -4 10 -4 -10 -10 -4 10 -4 Z" fill="#ffe9a8" opacity="0.8" />
      <path d="M330 700 l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3 Z" fill="#ffe9a8" opacity="0.7" />
    </svg>
  );
}
