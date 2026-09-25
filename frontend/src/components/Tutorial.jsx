// الجولة التعليمية: تظهر عند أول دخول وتُعاد من زر «؟».
// تُبرز العناصر الفعلية (spotlight) مع بطاقة شرح، وتنتقل بين التبويبات تلقائياً.
import React, { useCallback, useEffect, useState } from 'react';
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

export default function Tutorial({ onFinish, onSkip, setTab }) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState(null);
  const step = TUTORIAL_STEPS[index];
  const last = index === TUTORIAL_STEPS.length - 1;

  // ننتقل للتبويب المناسب لكل خطوة
  useEffect(() => {
    if (setTab) setTab(step.tab);
  }, [index, step.tab, setTab]);

  // إبراز العنصر المستهدف مع إعادة القياس عند تغيّر المقاس أو محتوى الصفحة
  useEffect(() => {
    let cancelled = false;
    let tries = 0;
    const timers = [];

    const measure = () => {
      if (cancelled) return;
      const el = step.target && typeof document !== 'undefined'
        ? document.querySelector(`[data-tour="${step.target}"]`)
        : null;
      if (!el) {
        if (step.target && tries < 10) {
          tries += 1;
          timers.push(setTimeout(measure, 100));
          return;
        }
        setRect(null);
        return;
      }
      try { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch { try { el.scrollIntoView(); } catch {} }
      timers.push(setTimeout(() => {
        if (cancelled) return;
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) {
          setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
        } else {
          setRect(null);
        }
      }, 300));
    };

    setRect(null);
    measure();
    const onResize = () => measure();
    window.addEventListener('resize', onResize);
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      window.removeEventListener('resize', onResize);
    };
  }, [index, step.target]);

  // منع تمرير الخلفية
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, []);

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

  const below = rect ? rect.top + rect.height / 2 < (typeof window !== 'undefined' ? window.innerHeight : 800) / 2 : true;
  const spotStyle = rect ? {
    position: 'fixed',
    top: Math.max(0, rect.top - PAD),
    left: Math.max(0, rect.left - PAD),
    width: rect.width + PAD * 2,
    height: rect.height + PAD * 2,
    borderRadius: 18,
    border: '2px solid var(--gold)',
    boxShadow: '0 0 0 9999px rgba(0,0,0,0.74)',
    pointerEvents: 'none',
    zIndex: 130,
  } : null;

  const cardStyle = rect ? {
    position: 'fixed',
    zIndex: 131,
    left: 12,
    right: 12,
    margin: '0 auto',
    maxWidth: 460,
    ...(below
      ? { top: Math.min((window.innerHeight || 800) - 210, rect.top + rect.height + PAD + 14) }
      : { bottom: Math.min((window.innerHeight || 800) - 150, (window.innerHeight || 800) - rect.top + PAD + 14) }),
  } : undefined;

  return (
    <div className="tour-root" role="dialog" aria-modal="true" aria-label={t('tutorial.replay')}>
      {spotStyle ? <div style={spotStyle} aria-hidden /> : <div className="tour-veil" aria-hidden />}
      <div className={`tour-card ${rect ? '' : 'centered'}`} style={cardStyle}>
        <div className="between">
          <span className="tag">{t('tutorial.step', { n: index + 1, total: TUTORIAL_STEPS.length })}</span>
          <button className="btn small ghost" onClick={onSkip}>{t('tutorial.skip')}</button>
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
