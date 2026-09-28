// نافذة سفلية موحّدة: مقبض سحب + إغلاق + سحب للأسفل للإغلاق.
// آمنة SSR: كل أحداث المؤشر تُربط عند العرض فقط ولا يُلمس window في الحساب.
import React, { useRef, useState } from 'react';
import { t } from '../i18n.js';
import { IcClose } from './icons.jsx';

export default function Sheet({ children, wide = false, onClose, title = null, closable = true }) {
  const [drag, setDrag] = useState(0);
  const startRef = useRef(null);

  if (!closable) {
    return (
      <div className="overlay">
        <div className={`sheet ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true">{children}</div>
      </div>
    );
  }

  const onDown = (e) => {
    startRef.current = { y: e.clientY, at: Date.now() };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
  };
  const onMove = (e) => {
    if (!startRef.current) return;
    setDrag(Math.max(0, e.clientY - startRef.current.y));
  };
  const onUp = (e) => {
    if (!startRef.current) return;
    const dy = Math.max(0, e.clientY - startRef.current.y);
    const dt = Date.now() - startRef.current.at;
    startRef.current = null;
    setDrag(0);
    if (dy > 120 || (dy > 44 && dt < 260)) onClose?.();
  };

  return (
    <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div
        className={`sheet ${wide ? 'wide' : ''} ${drag > 0 ? 'dragging' : ''}`}
        role="dialog"
        aria-modal="true"
        style={drag ? { transform: `translateY(${drag}px)`, transition: 'none' } : undefined}
      >
        <div
          className="sheet-grab"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
        >
          <span className="sheet-bar" />
          {title && <div className="sheet-title">{title}</div>}
        </div>
        {!title && closable && (
          <button className="sheet-close" onClick={onClose} aria-label={t('modals.close')}><IcClose size={18} /></button>
        )}
        {children}
      </div>
    </div>
  );
}
