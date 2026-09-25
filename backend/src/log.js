// ============================================================================
// تسجيل آمن — ينقّي أي توكن قد يظهر في رسائل الأخطاء قبل طباعتها.
// توكن تيليجرام يظهر غالباً في شكل رابط: https://api.telegram.org/bot123:ABC/getMe
// ============================================================================

const TOKEN_PATTERN = /bot\d{6,}:[A-Za-z0-9_-]{10,}/g;

export function redact(value) {
  const text = typeof value === 'string'
    ? value
    : value?.stack || value?.message || String(value);
  return text.replace(TOKEN_PATTERN, 'bot<TOKEN>');
}

export function logError(label, err) {
  console.error(label, redact(err));
}

export function logInfo(label, message) {
  console.log(label, redact(message));
}
