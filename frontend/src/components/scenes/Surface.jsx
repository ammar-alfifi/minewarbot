// مشهد «المدخل الترابي»: سماء مفتوحة، تلال ترابية، ومدخل منجم خشبي.
import React from 'react';

export default function Surface() {
  return (
    <svg className="scene-svg" viewBox="0 0 400 800" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id="sc-surface-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#cdad7f" />
          <stop offset="48%" stopColor="#8d6e63" />
          <stop offset="100%" stopColor="#3a291d" />
        </linearGradient>
        <radialGradient id="sc-surface-sun" cx="50%" cy="16%" r="46%">
          <stop offset="0%" stopColor="#ffeec2" stopOpacity="0.95" />
          <stop offset="55%" stopColor="#ffcf7a" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#ffcf7a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="sc-surface-hill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7c5a44" />
          <stop offset="100%" stopColor="#432f22" />
        </linearGradient>
        <linearGradient id="sc-surface-ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6d4c36" />
          <stop offset="100%" stopColor="#2e2016" />
        </linearGradient>
        <linearGradient id="sc-surface-tunnel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1a120a" />
          <stop offset="100%" stopColor="#000000" />
        </linearGradient>
      </defs>

      <rect width="400" height="800" fill="url(#sc-surface-sky)" />
      <rect width="400" height="800" fill="url(#sc-surface-sun)" />

      {/* تلال بعيدة */}
      <path d="M0 430 L60 356 L124 420 L192 336 L262 414 L332 352 L400 418 L400 640 L0 640 Z" fill="#6b4d3a" opacity="0.72" />
      <path d="M0 474 L82 408 L162 466 L244 398 L322 462 L400 414 L400 680 L0 680 Z" fill="url(#sc-surface-hill)" opacity="0.9" />

      {/* مدخل المنجم داخل تلّ */}
      <path d="M108 660 Q200 512 292 660 Z" fill="#4a3427" />
      <path d="M152 660 Q200 566 248 660 Z" fill="url(#sc-surface-tunnel)" />
      <rect x="146" y="576" width="11" height="86" rx="3" fill="#7a5230" />
      <rect x="243" y="576" width="11" height="86" rx="3" fill="#7a5230" />
      <rect x="128" y="562" width="144" height="15" rx="4" fill="#8a5f38" />
      <rect x="122" y="560" width="18" height="74" rx="3" fill="#6b4628" opacity="0.7" />
      <rect x="294" y="500" width="14" height="20" rx="3" fill="#8a5f38" />
      {/* قضبان العربة */}
      <rect x="172" y="656" width="56" height="6" rx="2" fill="#5b4636" />
      <rect x="178" y="670" width="44" height="5" rx="2" fill="#3f3226" />

      {/* الأرض */}
      <path d="M0 646 Q100 616 200 638 T400 626 L400 800 L0 800 Z" fill="url(#sc-surface-ground)" />

      {/* حجارة وعشب */}
      <path d="M34 700 l28 -15 28 15 -11 24 -34 0 Z" fill="#5a4130" />
      <path d="M318 694 l24 -13 25 13 -9 21 -31 0 Z" fill="#5a4130" opacity="0.92" />
      <path d="M98 744 l17 -10 17 10 -7 15 -20 0 Z" fill="#43301f" />
      <path d="M58 668 q4 -16 10 -21 M65 668 q1 -13 7 -18" stroke="#7c8a4a" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <path d="M330 660 q4 -16 10 -21 M337 660 q1 -13 7 -18" stroke="#7c8a4a" strokeWidth="2.4" fill="none" strokeLinecap="round" opacity="0.8" />
      <path d="M282 730 q4 -14 9 -18 M288 730 q1 -12 6 -16" stroke="#7c8a4a" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.65" />

      {/* حافة أمامية داكنة */}
      <path d="M0 764 Q80 722 162 760 T400 742 L400 800 L0 800 Z" fill="#1d140d" opacity="0.9" />
    </svg>
  );
}
