/**
 * Device detection utilities for iOS PWA functionality
 */

/**
 * Detect if user is on iOS (iPhone, iPad, or iPod)
 */
export const isIOS = (): boolean => {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    // iPad on iOS 13+ reports as MacIntel
    (navigator.userAgent.includes('Mac') && 'ontouchend' in document)
  );
};

/**
 * Detect if running in Safari (not Chrome/Firefox on iOS)
 */
export const isSafari = (): boolean => {
  return (
    /Safari/.test(navigator.userAgent) &&
    !/Chrome|CriOS|FxiOS/.test(navigator.userAgent)
  );
};

/**
 * Detect if app is already installed (running in standalone mode)
 */
export const isInStandaloneMode = (): boolean => {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
};

/**
 * Detect iOS version
 * Returns the major version number or null if not iOS
 */
export const getIOSVersion = (): number | null => {
  const match = navigator.userAgent.match(/OS (\d+)_(\d+)/);
  if (match) {
    return parseInt(match[1], 10);
  }
  return null;
};

/**
 * Check if push notifications are supported
 * On iOS: requires iOS 16.4+ and app must be installed to home screen
 */
export const isPushSupported = (): boolean => {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window &&
    isInStandaloneMode()
  );
};

/**
 * Check if the device supports all PWA features
 */
export const isPWASupported = (): boolean => {
  return 'serviceWorker' in navigator && 'PushManager' in window;
};

/**
 * Get display mode of the app
 */
export const getDisplayMode = (): string => {
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return 'standalone';
  }
  if (window.matchMedia('(display-mode: minimal-ui)').matches) {
    return 'minimal-ui';
  }
  if (window.matchMedia('(display-mode: fullscreen)').matches) {
    return 'fullscreen';
  }
  return 'browser';
};
