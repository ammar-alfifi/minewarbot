// غلاف آمن حول Telegram WebApp SDK — كل شيء يعمل بتراجع رشيق خارج تيليجرام.
import WebApp from '@twa-dev/sdk';

export const tg = WebApp;

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
