// التنسيقات العربية — أرقام لاتينية واضحة مع فواصل.
const numberFmt = new Intl.NumberFormat('en-US');

export function num(value) {
  const n = Number(value) || 0;
  return numberFmt.format(Math.round(n));
}

/** اختصار الأرقام الكبيرة بالعربية: 12.4 ألف / 3.1 مليون */
export function short(value) {
  const n = Number(value) || 0;
  const abs = Math.abs(n);
  if (abs < 10000) return num(n);
  if (abs < 1_000_000) return `${trim(n / 1000)} ألف`;
  if (abs < 1_000_000_000) return `${trim(n / 1_000_000)} مليون`;
  return `${trim(n / 1_000_000_000)} مليار`;
}

function trim(n) {
  const fixed = n >= 100 ? n.toFixed(0) : n >= 10 ? n.toFixed(1) : n.toFixed(1);
  return fixed.replace(/\.0+$/, '');
}

export function percent(value, digits = 2) {
  const p = (Number(value) || 0) * 100;
  const d = p < 1 ? Math.max(digits, 2) : p < 10 ? 1 : 0;
  return `${p.toFixed(d).replace(/\.0+$/, '')}%`;
}

export function duration(ms) {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (d > 0) return `${d} يوم${d > 1 ? '' : ''}${h ? ` و${h} س` : ''}`;
  if (h > 0) return `${h} س${m ? ` ${m} د` : ''}`;
  if (m > 0) return `${m} د${s && m < 5 ? ` ${s} ث` : ''}`;
  return `${s} ث`;
}

export function clock(ms) {
  const sec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function relativeTime(at, now = Date.now()) {
  const diff = now - at;
  if (diff < 60_000) return 'الآن';
  if (diff < 3600_000) return `قبل ${Math.floor(diff / 60_000)} د`;
  if (diff < 86400_000) return `قبل ${Math.floor(diff / 3600_000)} س`;
  return `قبل ${Math.floor(diff / 86400_000)} يوم`;
}

export function dateShort(ts) {
  try {
    return new Date(ts).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' });
  } catch {
    return '';
  }
}
