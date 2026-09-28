// مشهد «الأعماق المتجمدة»: شفق قطبي، نوازل جليدية، شلال متجمّد، وبحيرة صقيعية.
import React from 'react';

const STARS = [
  { x: 40, y: 60, r: 1.6 }, { x: 96, y: 120, r: 1.2 }, { x: 150, y: 54, r: 1.8 },
  { x: 214, y: 96, r: 1.3 }, { x: 272, y: 48, r: 1.5 }, { x: 330, y: 110, r: 1.1 },
  { x: 368, y: 66, r: 1.7 }, { x: 70, y: 210, r: 1.2 }, { x: 300, y: 190, r: 1.4 },
];

export default function Frost() {
  return (
    <svg className="scene-svg" viewBox="0 0 400 800" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id="sc-frost-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0d3a5e" />
          <stop offset="52%" stopColor="#0a2740" />
          <stop offset="100%" stopColor="#04121c" />
        </linearGradient>
        <linearGradient id="sc-frost-aurora" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7dffd4" stopOpacity="0" />
          <stop offset="50%" stopColor="#7de8ff" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#a78bfa" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="sc-frost-ice" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#dcf5ff" />
          <stop offset="55%" stopColor="#7fc4e8" />
          <stop offset="100%" stopColor="#2b6f96" />
        </linearGradient>
        <linearGradient id="sc-frost-lake" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#9fe0f5" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#0a3550" />
        </linearGradient>
      </defs>

      <rect width="400" height="800" fill="url(#sc-frost-sky)" />

      {/* شفق قطبي */}
      <g className="fx-aurora">
        <path d="M-40 150 Q100 60 200 140 T440 120 L440 214 Q300 158 200 208 T-40 240 Z" fill="url(#sc-frost-aurora)" />
        <path d="M-40 250 Q120 170 240 236 T440 214 L440 292 Q280 250 180 300 T-40 330 Z" fill="url(#sc-frost-aurora)" opacity="0.7" />
      </g>

      {/* نجوم */}
      {STARS.map((s, i) => <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#eaffff" opacity="0.7" />)}

      {/* جبال جليدية بعيدة */}
      <path d="M0 430 L70 330 L138 424 L206 322 L286 428 L348 350 L400 420 L400 560 L0 560 Z" fill="#1a4a68" opacity="0.85" />
      <path d="M0 476 L92 396 L176 470 L266 386 L346 462 L400 424 L400 600 L0 600 Z" fill="#123a54" opacity="0.9" />

      {/* شلال متجمّد */}
      <path d="M182 300 Q170 400 186 500 Q200 560 214 500 Q230 400 218 300 Z" fill="url(#sc-frost-ice)" opacity="0.65" className="fx-shine" />
      <path d="M192 320 Q186 420 196 512 M208 322 Q214 420 204 512" stroke="#ffffff" strokeWidth="2" fill="none" opacity="0.45" />

      {/* نوازل من السقف */}
      <path d="M0 0 L400 0 L400 74 L352 150 L318 66 L268 158 L222 72 L176 152 L130 74 L86 146 L44 70 L0 138 Z" fill="#0a2436" />
      <path d="M60 0 l10 70 -18 0 Z" fill="url(#sc-frost-ice)" opacity="0.7" />
      <path d="M150 0 l12 92 -22 0 Z" fill="url(#sc-frost-ice)" opacity="0.65" />
      <path d="M250 0 l12 96 -22 0 Z" fill="url(#sc-frost-ice)" opacity="0.65" />
      <path d="M338 0 l10 74 -18 0 Z" fill="url(#sc-frost-ice)" opacity="0.6" />

      {/* صخور جليدية جانبية */}
      <path d="M0 620 L40 556 L92 604 L78 700 L0 700 Z" fill="#0d2f45" />
      <path d="M400 610 L356 552 L304 600 L320 700 L400 700 Z" fill="#0d2f45" />

      {/* بحيرة صقيعية */}
      <path d="M0 676 Q100 646 200 670 T400 656 L400 800 L0 800 Z" fill="#06283c" />
      <path d="M0 700 Q100 672 200 694 T400 682 L400 800 L0 800 Z" fill="url(#sc-frost-lake)" />
      <path d="M60 730 l60 -8 M150 754 l70 -9 M250 730 l64 -8" stroke="#cdeeff" strokeWidth="2" opacity="0.3" strokeLinecap="round" />
    </svg>
  );
}
