// الجولة التعليمية: تظهر عند أول دخول وتُعاد من زر «؟».
// تُبرز العناصر الفعلية (spotlight) مع بطاقة شرح، وتنتقل بين التبويبات تلقائياً.
// ملاحظة تصميم: البطاقة دائماً داخل حدود الشاشة (لا تعتمد على موضع قد يكون خارجها)،
// مع زر خروج ثابت يضمن عدم "التعلّق" في أي حالة.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { t } from '../i18n.js';

export const TUTORIAL_STEPS = [
  { id: 'welcome', icon: '⛏️', tab: 'mine', target: null },
  { id: 'resources', icon: '🪙', tab: 'mine', target: 'resources' },
  { id: 'mine', icon: '⚡', tab: 'mine', target: 'mine-btn' },
  { id: 'regions', icon: '🌍', tab: 'mine', target: 'region-card' },
  { id: 'daily', icon: '🕳️', tab: 'mine', target: 'daily-btn' },
  { id: 'workers', icon: '🧑‍🏭', tab: 'upgrades', target: 'workers-card' },
  { id: 'friends', icon: '🤝', tab: 'friends', target: 'leaderboard' },
  { id: 'collection', icon: '🏺', tab: 'collection', target: 'relics' },
];

const PAD = 8;
const CARD_EST_HEIGHT = 250; // ارتفاع تقديري للبطاقة لاختيار موضع آمن
const EDGE = 12;

function viewportHeight() {
  return typeof window !== 'undefined' ? window.innerHeight || 800 : 800;
}

/** موضع البطاقة: أسفل العنصر إن وُجد متسع، ثم أعلاه، وإلا ملتصقة بأسفل الشاشة — دائماً داخل الشاشة. */
export function cardTopFor(rect) {
  const vh = viewportHeight();
  const safeMax = Math.max(EDGE, vh - CARD_EST_HEIGHT - EDGE);
  if (!rect) return null;
  const spaceBelow = vh - (rect.top + rect.height);
  const spaceAbove = rect.top;
  if (spaceBelow >= CARD_EST_HEIGHT + 24) return Math.max(EDGE, Math.min(rect.top + rect.height + PAD + 16, safeMax));
  if (spaceAbove >= CARD_EST_HEIGHT + 24) return Math.max(EDGE, Math.min(rect.top - PAD - 16 - CARD_EST_HEIGHT, safeMax));
  return safeMax; // ملتصقة بأسفل الشاشة
}

/** بقعة الضوء داخل حدود الشاشة المرئية فقط. */
export function spotStyleFor(rect) {
  if (!rect) return null;
  const vh = viewportHeight();
  const top = Math.max(0, rect.top - PAD);
  const left = Math.max(0, rect.left - PAD);
  const height = Math.max(24, Math.min(rect.height + PAD * 2, vh - top - PAD));
  return {
    position: 'fixed',
    top,
    left,
    width: Math.max(24, rect.width + PAD * 2),
    height,
    borderRadius: 18,
    border: '2px solid var(--gold)',
    boxShadow: '0 0 0 9999px rgba(0,0,0,0.74)',
    pointerEvents: 'none',
    zIndex: 130,
  };
}

export default function Tutorial({ onFinish, onSkip, setTab }) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState(null);
  const step = TUTORIAL_STEPS[index];
  const last = index === TUTORIAL_STEPS.length - 1;
  const rectRef = useRef(null);

  // ننتقل للتبويب المناسب لكل خطوة
  useEffect(() => {
    if (setTab) setTab(step.tab);
  }, [index, step.tab, setTab]);

  // قياس العنصر المستهدف: تمرير إليه ثم قياس مع إعادة محاولة، ومتابعة التمرير
  useEffect(() => {
    let cancelled = false;
    let tries = 0;
    const timers = [];
    let raf = 0;
    const update = () => {
      if (typeof requestAnimationFrame !== 'function') return measureNow();
      if (raf) return;
      raf = requestAnimationFrame(() => { raf = 0; measureNow(); });
    };
    const measureNow = () => {
      const el = rectRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setRect(r.width > 0 && r.height > 0
        ? { top: r.top, left: r.left, width: r.width, height: r.height }
        : null);
    };

    const find = () => {
      if (cancelled) return;
      const el = step.target && typeof document !== 'undefined'
        ? document.querySelector(`[data-tour="${step.target}"]`)
        : null;
      if (!el) {
        if (step.target && tries < 12) { tries += 1; timers.push(setTimeout(find, 100)); return; }
        rectRef.current = null;
        setRect(null);
        return;
      }
      rectRef.current = el;
      try { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch { try { el.scrollIntoView(); } catch {} }
      timers.push(setTimeout(update, 120));
      timers.push(setTimeout(update, 350));
      timers.push(setTimeout(update, 650));
    };

    setRect(null);
    find();
    const onViewport = () => update();
    window.addEventListener('scroll', onViewport, true);
    window.addEventListener('resize', onViewport);
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      if (raf && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(raf);
      rectRef.current = null;
      window.removeEventListener('scroll', onViewport, true);
      window.removeEventListener('resize', onViewport);
    };
  }, [index, step.target]);

  const next = useCallback(() => {
    if (last) onFinish();
    else setIndex((i) => Math.min(TUTORIAL_STEPS.length - 1, i + 1));
  }, [last, onFinish]);
  const prev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onSkip();
      else if (e.key === 'Enter') next();
      else if (e.key === 'ArrowLeft') next();       // RTL: يسار = التالي
      else if (e.key === 'ArrowRight') prev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev, onSkip]);

  const spot = spotStyleFor(rect);
  const top = cardTopFor(rect);

  return (
    <div className="tour-root" role="dialog" aria-modal="true" aria-label={t('tutorial.replay')}>
      {spot ? <div style={spot} aria-hidden /> : <div className="tour-veil" aria-hidden />}

      {/* زر خروج ثابت — يضمن عدم التعلّق حتى لو كان العنصر المستهدف بعيداً */}
      <button className="tour-exit" onClick={onSkip} aria-label={t('tutorial.skip')}>✕ {t('tutorial.skip')}</button>

      <div
        className={`tour-card ${rect ? '' : 'centered'}`}
        style={rect ? { position: 'fixed', zIndex: 131, left: EDGE, right: EDGE, margin: '0 auto', maxWidth: 460, top } : undefined}
      >
        <div className="between">
          <span className="tag">{t('tutorial.step', { n: index + 1, total: TUTORIAL_STEPS.length })}</span>
          <span className="small muted">{step.icon}</span>
        </div>
        <div className="tour-icon" aria-hidden>{step.icon}</div>
        <div className="tour-title">{t(`tutorial.${step.id}Title`)}</div>
        <div className="tour-body">{t(`tutorial.${step.id}Body`)}</div>
        <div className="tour-dots" aria-hidden>
          {TUTORIAL_STEPS.map((s, i) => <i key={s.id} className={i === index ? 'on' : ''} />)}
        </div>
        <div className="flex" style={{ gap: 8 }}>
          {index > 0 && <button className="btn ghost grow" onClick={prev}>{t('tutorial.prev')}</button>}
          <button className="btn primary grow" onClick={next}>{last ? t('tutorial.start') : t('tutorial.next')}</button>
        </div>
      </div>
    </div>
  );
}
