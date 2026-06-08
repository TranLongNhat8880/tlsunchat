import { registerSW } from 'virtual:pwa-register';

export const registerPwaUpdate = () => {
  registerSW({
    immediate: true,
    onNeedRefresh() {
      window.location.reload();
    },
    onOfflineReady() {
      console.info('PWA offline cache is ready');
    },
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;

      window.setInterval(() => {
        registration.update();
      }, 60 * 60 * 1000);
    }
  });
};
