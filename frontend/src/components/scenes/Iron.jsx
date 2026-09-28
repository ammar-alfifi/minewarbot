// مشهد «منجم الحديد»: أعمدة فولاذية، ترس دوّار، أنابيب، وقضبان عربة.
import React from 'react';

const TEETH = Array.from({ length: 14 });
const RIVETS = [
  { x: 48, y: 120 }, { x: 48, y: 300 }, { x: 48, y: 480 }, { x: 48, y: 660 },
  { x: 352, y: 120 }, { x: 352, y: 300 }, { x: 352, y: 480 }, { x: 352, y: 660 },
];
const PLATE_HOLES = Array.from({ length: 6 });

export default function Iron() {
  return (
    <svg className="scene-svg" viewBox="0 0 400 800" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id="sc-iron-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2a3644" />
          <stop offset="55%" stopColor="#161f2b" />
          <stop offset="100%" stopColor="#0a0f16" />
        </linearGradient>
        <linearGradient id="sc-iron-steel" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#8b98a8" />
          <stop offset="50%" stopColor="#5b6a7d" />
          <stop offset="100%" stopColor="#39434f" />
        </linearGradient>
        <linearGradient id="sc-iron-beam" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6b7a8d" />
          <stop offset="100%" stopColor="#2b3440" />
        </linearGradient>
        <radialGradient id="sc-iron-spark" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffdd9a" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#ffb347" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="400" height="800" fill="url(#sc-iron-sky)" />

      {/* أعمدة فولاذية جانبية */}
      <rect x="24" y="0" width="32" height="800" fill="url(#sc-iron-steel)" opacity="0.5" />
      <rect x="344" y="0" width="32" height="800" fill="url(#sc-iron-steel)" opacity="0.5" />
      {RIVETS.map((r, i) => <circle key={i} cx={r.x} cy={r.y} r="3.4" fill="#c3ccd8" opacity="0.5" />)}

      {/* عارضات أفقية مثقّبة */}
      <rect x="0" y="92" width="400" height="20" fill="url(#sc-iron-beam)" opacity="0.5" />
      <rect x="0" y="694" width="400" height="22" fill="url(#sc-iron-beam)" opacity="0.5" />
      {PLATE_HOLES.map((_, i) => <circle key={i} cx={40 + i * 64} cy={738} r="3" fill="#0a0f16" opacity="0.8" />)}

      {/* ترس دوّار */}
      <g transform="translate(200 336)">
        <g className="fx-spin">
          {TEETH.map((_, i) => (
            <rect key={i} x="-8" y="-106" width="16" height="28" rx="3" fill="#4a5666"
              transform={`rotate(${(360 / TEETH.length) * i})`} />
          ))}
          <circle r="90" fill="none" stroke="#3b4655" strokeWidth="22" />
          <circle r="58" fill="#1b222c" stroke="#5b6a7d" strokeWidth="6" />
          <path d="M-58 0 h116 M0 -58 v116" stroke="#3b4655" strokeWidth="12" />
          <circle r="16" fill="#5b6a7d" />
        </g>
      </g>

      {/* أنابيب ومنافذ */}
      <path d="M0 176 H118 Q150 176 150 208 V256" fill="none" stroke="#4a5666" strokeWidth="14" strokeLinecap="round" />
      <path d="M400 214 H300 Q270 214 270 246 V304" fill="none" stroke="#4a5666" strokeWidth="12" strokeLinecap="round" />
      <circle cx="150" cy="256" r="12" fill="#5b6a7d" />
      <circle cx="270" cy="304" r="10" fill="#5b6a7d" />

      {/* شرارة لحام */}
      <circle className="fx-lantern-glow" cx="292" cy="252" r="52" fill="url(#sc-iron-spark)" />

      {/* قضبان العربة */}
      <rect x="148" y="686" width="104" height="7" rx="2" fill="#5b6a7d" opacity="0.6" />
      <rect x="156" y="704" width="88" height="6" rx="2" fill="#3b4655" opacity="0.6" />

      {/* أرضية معدنية */}
      <path d="M0 730 Q100 706 200 726 T400 714 L400 800 L0 800 Z" fill="#0d131a" />
    </svg>
  );
}
