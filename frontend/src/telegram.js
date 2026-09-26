// غلاف آمن حول Telegram WebApp SDK — كل شيء يعمل بتراجع رشيق خارج تيليجرام.
//
// تنبيه مهم: حزمة @twa-dev/sdk تقرأ window.Telegram.WebApp وقت تحميل الوحدة،
// فإن لم يكن سكربت تيليجرام قد اكتمل (أو حجبه المتصفح)، يرمي استثناءً يُسقط
// التطبيق كاملاً قبل أن يبدأ React. لذلك لا نعتمد عليها في الوصول للـ SDK،
// بل نقرأ النافذة بتأخير (lazy) مع بديل آمن.

const FALLBACK = {
  initData: '',
  initDataUnsafe: {},
  colorScheme: 'dark',
  version: '',
  ready() {},
  expand() {},
  setHeaderColor() {},
  setBackgroundColor() {},
  disableVerticalSwipes() {},
  onEvent() {},
  offEvent() {},
  HapticFeedback: { impactOccurred() {}, notificationOccurred() {}, selectionChanged() {} },
  showAlert(_msg, cb) { try { if (typeof window !== 'undefined' && window.alert) window.alert(String(_msg)); } catch {} cb?.(); },
  showConfirm(_msg, cb) { cb?.(true); },
  openTelegramLink() {},
  openLink() {},
  MainButton: { hide() {}, show() {} },
};

/** يعيد كائن WebApp الحقيقي إن توفّر، وإلا بديلاً آمناً — بلا أي استثناء. */
function resolveWebApp() {
  try {
    const w = globalThis.window;
    const real = w && w.Telegram && w.Telegram.WebApp;
    if (real) return real;
  } catch {
    // متصفح عادي أو SDK محجوب: نتجاهل بهدوء
  }
  return FALLBACK;
}

// وكيل يقرأ الكائن الحقيقي عند كل وصول، فيبقى صالحاً حتى لو تأخر تحميل السكربت
// أو اكتمل بعد تركيب React (مشكلة سبّبت تعذّر فتح المنجم سابقاً).
export const tg = new Proxy(FALLBACK, {
  get(_target, prop) {
    const real = resolveWebApp();
    const value = real[prop];
    return typeof value === 'function' ? value.bind(real) : value;
  },
  has(_target, prop) {
    return prop in resolveWebApp();
  },
});

let initialized = false;

export function initTelegram() {
  if (initialized) return tg;
  initialized = true;
  try {
    tg.ready();
    tg.expand();
    tg.setHeaderColor?.('secondary_bg_color');
    tg.setBackgroundColor?.('bg_color');
    tg.disableVerticalSwipes?.();
    document.documentElement.dataset.tgTheme = tg.colorScheme || 'dark';
    tg.onEvent?.('themeChanged', () => {
      document.documentElement.dataset.tgTheme = tg.colorScheme || 'dark';
    });
  } catch {
    // متصفح عادي: نتجاهل بهدوء
  }
  return tg;
}

export function isTelegram() {
  try {
    return Boolean(tg.initData && tg.initData.length > 0);
  } catch {
    return false;
  }
}

export function getInitData() {
  try {
    return tg.initData || '';
  } catch {
    return '';
  }
}

export function getTelegramUser() {
  try {
    return tg.initDataUnsafe?.user || null;
  } catch {
    return null;
  }
}

/** معامل بدء التطبيق: من initData (startapp) أو من رابط الويب. */
export function getStartParam() {
  try {
    const fromTg = tg.initDataUnsafe?.start_param;
    if (fromTg) return fromTg;
  } catch {}
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get('startapp') || params.get('start') || null;
  } catch {
    return null;
  }
}

export function haptic(kind = 'light') {
  try {
    const h = tg.HapticFeedback;
    if (!h) return;
    if (kind === 'success' || kind === 'error' || kind === 'warning') h.notificationOccurred(kind);
    else h.impactOccurred(kind);
  } catch {}
}

export function showAlert(message) {
  return new Promise((resolve) => {
    try {
      if (tg.showAlert) return tg.showAlert(String(message), () => resolve());
    } catch {}
    try {
      window.alert(message);
    } catch {}
    resolve();
  });
}

export function showConfirm(message) {
  return new Promise((resolve) => {
    try {
      if (tg.showConfirm) return tg.showConfirm(String(message), (ok) => resolve(Boolean(ok)));
    } catch {}
    resolve(window.confirm(message));
  });
}

export function shareText(text, url) {
  const shareLink = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
  try {
    if (tg.openTelegramLink) return tg.openTelegramLink(shareLink);
  } catch {}
  try {
    window.open(shareLink, '_blank', 'noopener');
  } catch {}
  return undefined;
}

export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function openExternal(url) {
  try {
    if (tg.openLink) return tg.openLink(url);
  } catch {}
  try {
    window.open(url, '_blank', 'noopener');
  } catch {}
  return undefined;
}
