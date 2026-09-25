// بديل SDK تيليجرام لاختبار العرض على السيرفر — لا نلمس SDK الأصلي ولا نحتاج DOM.
const noop = () => {};
const WebApp = {
  initData: '',
  initDataUnsafe: {},
  colorScheme: 'dark',
  version: '7.8',
  ready: noop,
  expand: noop,
  setHeaderColor: noop,
  setBackgroundColor: noop,
  disableVerticalSwipes: noop,
  onEvent: noop,
  offEvent: noop,
  HapticFeedback: { impactOccurred: noop, notificationOccurred: noop, selectionChanged: noop },
  showAlert: noop,
  showConfirm: noop,
  openTelegramLink: noop,
  openLink: noop,
  MainButton: { hide: noop, show: noop },
};
export default WebApp;
