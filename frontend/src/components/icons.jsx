// أيقونات SVG موحّدة (شبكة 24، currentColor) — بديل وظيفي عن الإيموجي في عناصر التحكم.
// الإيموجي يبقى لمحتوى اللعبة (الآثار، المناطق، المكافآت) حفاظاً على شخصيتها.
import React from 'react';

function Svg({ children, size = 20, className = '', strokeWidth = 2, ...rest }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`ic ${className}`}
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const IcCoin = (p) => (
  <Svg {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5v9M9.4 9.6c0-1 1.1-1.6 2.6-1.6s2.6.6 2.6 1.6c0 2.6-5.2 1.2-5.2 3.7 0 1 1.1 1.6 2.6 1.6s2.6-.6 2.6-1.6" /></Svg>
);
export const IcGem = (p) => (
  <Svg {...p}><path d="M6 3h12l3 5-9 13L3 8z" /><path d="M3 8h18M9 3l-1.5 5L12 21l4.5-13L15 3" /></Svg>
);
export const IcPickaxe = (p) => (
  <Svg {...p}><path d="M14 6l4 4" /><path d="M4.5 19.5 15.8 8.2" /><path d="M6 3.5c4.5-1 8.5.6 10.5 3.5M17 3.5C15.5 6 13 8 10 9.5" /></Svg>
);
export const IcSword = (p) => (
  <Svg {...p}><path d="M14.5 3.5 20.5 3.5 20.5 9.5 10 20 4 20 4 14z" /><path d="m13 6 5 5" /></Svg>
);
export const IcShield = (p) => (
  <Svg {...p}><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" /></Svg>
);
export const IcTrophy = (p) => (
  <Svg {...p}><path d="M8 4h8v5a4 4 0 0 1-8 0z" /><path d="M8 5H5v2a3 3 0 0 0 3 3M16 5h3v2a3 3 0 0 1-3 3" /><path d="M12 13v4M9 21h6M10 17h4" /></Svg>
);
export const IcCrown = (p) => (
  <Svg {...p}><path d="M3 8l4 4 5-7 5 7 4-4-2 11H5z" /></Svg>
);
export const IcChest = (p) => (
  <Svg {...p}><rect x="4" y="9" width="16" height="11" rx="2" /><path d="M4 12h16M12 3v6M9 6h6" /></Svg>
);
export const IcClose = (p) => (
  <Svg {...p}><path d="M6 6l12 12M18 6L6 18" /></Svg>
);
export const IcShare = (p) => (
  <Svg {...p}><circle cx="18" cy="5" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="19" r="2.5" /><path d="m8.2 10.8 7.6-4.3M8.2 13.2l7.6 4.3" /></Svg>
);
export const IcCopy = (p) => (
  <Svg {...p}><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M15 5H6a2 2 0 0 0-2 2v9" /></Svg>
);
export const IcHelp = (p) => (
  <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.6 2.6 0 1 1 3.6 2.4c-.7.4-1.1 1-1.1 1.8v.3" /><circle cx="12" cy="17" r=".6" fill="currentColor" /></Svg>
);
export const IcLock = (p) => (
  <Svg {...p}><rect x="5" y="10.5" width="14" height="10" rx="2.5" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /></Svg>
);
export const IcCheck = (p) => (
  <Svg {...p}><path d="M5 12.5 10 17l9-10" /></Svg>
);
export const IcClock = (p) => (
  <Svg {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5l3.5 2" /></Svg>
);
export const IcBolt = (p) => (
  <Svg {...p}><path d="M13 3 5 13.5h5.5L10.5 21 19 10.5h-5.5z" /></Svg>
);
export const IcTarget = (p) => (
  <Svg {...p}><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="3.5" /><path d="M12 3.5v3M12 17.5v3M3.5 12h3M17.5 12h3" /></Svg>
);
export const IcFlame = (p) => (
  <Svg {...p}><path d="M12 3c1 3 4 4 4 8a4 4 0 0 1-8 0c0-1.2.4-2 .8-2.7C9.6 9.8 11 9.5 12 3z" /><path d="M12 21a5 5 0 0 0 5-5" opacity=".6" /></Svg>
);
export const IcCompass = (p) => (
  <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5z" /></Svg>
);
