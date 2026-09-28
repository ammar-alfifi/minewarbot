// حالة فارغة موحّدة: رسمة SVG خفيفة + نص + دعوة فعل اختيارية.
import React from 'react';

const ART = {
  relics: (
    <>
      <path d="M12 3l4 6-4 12-4-12z" fill="currentColor" opacity=".18" />
      <path d="M12 3l4 6-4 12-4-12z" />
      <path d="M4 9h16" opacity=".5" />
    </>
  ),
  friends: (
    <>
      <circle cx="9" cy="9" r="3" />
      <circle cx="17" cy="10" r="2.4" opacity=".6" />
      <path d="M3.5 19c.6-3 2.8-4.5 5.5-4.5S14 16 14.6 19" />
      <path d="M15.5 15c1.8.2 3.2 1.3 3.7 3.4" opacity=".6" />
    </>
  ),
  log: (
    <>
      <path d="M6 3.5h9l4 4v13H6z" />
      <path d="M15 3.5v4h4M9 12h7M9 16h5" opacity=".7" />
    </>
  ),
  trophies: (
    <>
      <path d="M8 4h8v5a4 4 0 0 1-8 0z" />
      <path d="M8 5H4.5v2A3.5 3.5 0 0 0 8 10.5M16 5h3.5v2A3.5 3.5 0 0 1 16 10.5" opacity=".7" />
      <path d="M12 13v4M9 21h6M10 17h4" opacity=".7" />
    </>
  ),
  locked: (
    <>
      <rect x="5" y="10.5" width="14" height="10" rx="2.5" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
      <circle cx="12" cy="15.5" r="1.4" fill="currentColor" />
    </>
  ),
};

export default function EmptyState({ art = 'relics', text, action = null, compact = false }) {
  return (
    <div className={`empty ${compact ? 'compact' : ''}`}>
      <svg viewBox="0 0 24 24" width="52" height="52" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {ART[art] || ART.relics}
      </svg>
      <p className="empty-text muted small">{text}</p>
      {action}
    </div>
  );
}
