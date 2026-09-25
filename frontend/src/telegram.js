import WebApp from '@twa-dev/sdk';

// يهيئ Telegram WebApp ويرجع بيانات المستخدم
export function initTelegram() {
  const tg = WebApp;
  tg.ready();
  tg.expand();
  return tg;
}

export function getUser() {
  return WebApp.initDataUnsafe?.user || null;
}

export function getInitData() {
  return WebApp.initData || '';
}
