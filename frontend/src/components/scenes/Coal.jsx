// مشهد «نفق الفحم»: نفق بأقواس متعاقبة، دعائم خشبية، فانوس متهادٍ، وعرق فحم لامع.
import React from 'react';

export default function Coal() {
  return (
    <svg className="scene-svg" viewBox="0 0 400 800" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <radialGradient id="sc-coal-depth" cx="50%" cy="44%" r="62%">
          <stop offset="0%" stopColor="#313842" />
          <stop offset="52%" stopColor="#141821" />
          <stop offset="100%" stopColor="#05070a" />
        </radialGradient>
        <radialGradient id="sc-coal-lantern" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffdd9a" stopOpacity="0.8" />
          <stop offset="45%" stopColor="#ffb347" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#ff9d2e" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="sc-coal-beam" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4a3624" />
          <stop offset="100%" stopColor="#1c1510" />
        </linearGradient>
      </defs>

      <rect width="400" height="800" fill="url(#sc-coal-depth)" />

      {/* أقواس النفق تتعاقب في العمق */}
      <path d="M14 800 V380 Q200 168 386 380 V800" fill="none" stroke="#222831" strokeOpacity="0.5" strokeWidth="30" />
      <path d="M58 800 V424 Q200 246 342 424 V800" fill="none" stroke="#1a1f26" strokeWidth="26" />
      <path d="M100 800 V464 Q200 320 300 464 V800" fill="none" stroke="#12161c" strokeWidth="22" />
      <path d="M142 800 V508 Q200 398 258 508 V800" fill="none" stroke="#0b0e12" strokeWidth="18" />
      <ellipse cx="200" cy="566" rx="50" ry="72" fill="#030408" fillOpacity="0.6" />

      {/* دعائم خشبية */}
      <rect x="26" y="452" width="16" height="348" rx="4" fill="url(#sc-coal-beam)" />
      <rect x="358" y="452" width="16" height="348" rx="4" fill="url(#sc-coal-beam)" />
      <rect x="18" y="436" width="364" height="20" rx="5" fill="url(#sc-coal-beam)" />
      <path d="M26 452 L104 452 L104 476 L26 476 Z" fill="#241a12" opacity="0.85" />
      <path d="M374 452 L296 452 L296 476 L374 476 Z" fill="#241a12" opacity="0.85" />

      {/* عروق فحم لامعة */}
      <path d="M0 268 l58 34 -26 48 -32 -26 Z" fill="#1b2029" />
      <path d="M12 282 l22 14 -12 18 -16 -10 Z" fill="#3b4657" opacity="0.55" />
      <path d="M330 214 l52 30 -22 44 -30 -24 Z" fill="#1b2029" />
      <path d="M342 228 l20 12 -9 16 -14 -9 Z" fill="#3b4657" opacity="0.5" />
      <path d="M60 560 l40 24 -18 34 -24 -18 Z" fill="#12161c" />
      <path d="M300 600 l44 26 -20 36 -26 -20 Z" fill="#12161c" />

      {/* القضبان */}
      <rect x="168" y="700" width="64" height="7" rx="2" fill="#3c434e" />
      <rect x="174" y="718" width="52" height="6" rx="2" fill="#2a303a" />
      <path d="M150 700 h100 M150 724 h100" stroke="#2a303a" strokeWidth="4" opacity="0.7" />

      {/* الفانوس */}
      <circle className="fx-lantern-glow" cx="300" cy="238" r="70" fill="url(#sc-coal-lantern)" />
      <path d="M300 176 v22" stroke="#5b4636" strokeWidth="3" />
      <rect x="291" y="198" width="18" height="26" rx="3" fill="#c8862a" />
      <rect x="288" y="196" width="24" height="5" rx="2" fill="#5b4636" />
      <rect x="288" y="224" width="24" height="5" rx="2" fill="#5b4636" />
      <circle className="fx-lantern-flame" cx="300" cy="212" r="6" fill="#ffe9b0" />

      {/* الأرض */}
      <path d="M0 726 Q100 694 200 716 T400 704 L400 800 L0 800 Z" fill="#0a0c10" />
    </svg>
  );
}
