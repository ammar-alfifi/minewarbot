// عدّاد تصاعدي ناعم للأرقام — يعمل بلا DOM عند العرض على السيرفر (يبدأ من القيمة النهائية).
// كل الحركة في useEffect، لذا اختبار العرض SSR يمرّ بلا مشاكل.
import React, { useEffect, useRef, useState } from 'react';

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

export default function CountUp({ value, format = (v) => String(v), duration = 520, className = '' }) {
  const target = Number(value) || 0;
  const [display, setDisplay] = useState(target);
  const fromRef = useRef(target);
  const rafRef = useRef(0);

  useEffect(() => {
    const from = fromRef.current;
    const to = Number(value) || 0;
    if (from === to) return undefined;
    const start = now();
    let cancelled = false;
    const tick = () => {
      const p = Math.min(1, (now() - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(from + (to - from) * eased);
      if (p < 1 && !cancelled) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
        setDisplay(to);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      fromRef.current = to;
    };
  }, [value, duration]);

  return <span className={`count-up ${className}`}>{format(Math.round(display))}</span>;
}
