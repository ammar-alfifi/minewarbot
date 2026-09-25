// ============================================================================
// محدّدات المعدل — حماية بسيطة دون اعتماديات خارجية.
// ============================================================================

/** حدّ عام لكل IP/مفتاح خلال نافذة زمنية. */
export function createLimiter({ windowMs = 60_000, max = 60 } = {}) {
  const hits = new Map();
  return function limit(key) {
    const now = Date.now();
    const entry = hits.get(key);
    if (!entry || now - entry.start >= windowMs) {
      if (hits.size > 5000) {
        for (const [k, v] of hits) if (now - v.start >= windowMs) hits.delete(k);
      }
      hits.set(key, { start: now, count: 1 });
      return { ok: true, remaining: max - 1 };
    }
    entry.count += 1;
    if (entry.count > max) {
      return { ok: false, retryAfterMs: windowMs - (now - entry.start) };
    }
    return { ok: true, remaining: max - entry.count };
  };
}

/** دلو عملات: يسمح بدفعات سريعة (نقر متتابع) مع متوسط ثابت. */
export function createTokenBucket({ capacity = 30, refillPerSec = 8 } = {}) {
  const buckets = new Map(); // key -> {tokens, at}
  return function take(key, amount = 1) {
    const now = Date.now();
    let b = buckets.get(key);
    if (!b) {
      if (buckets.size > 5000) {
        for (const [k, v] of buckets) if (now - v.at > 10 * 60_000) buckets.delete(k);
      }
      b = { tokens: capacity, at: now };
      buckets.set(key, b);
    }
    const elapsed = (now - b.at) / 1000;
    b.tokens = Math.min(capacity, b.tokens + elapsed * refillPerSec);
    b.at = now;
    if (b.tokens < amount) {
      const needed = amount - b.tokens;
      return { ok: false, retryAfterMs: Math.ceil((needed / refillPerSec) * 1000) };
    }
    b.tokens -= amount;
    return { ok: true, tokens: b.tokens };
  };
}
