import { isPushSupported, getIOSVersion, isInStandaloneMode } from './deviceDetection';

/**
 * Request notification permission from user.
 * On iOS: only works if app is installed to home screen (iOS 16.4+)
 */
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!isPushSupported()) {
    console.warn('Push not supported. Is the app installed to home screen?');
    return false;
  }

  const iosVersion = getIOSVersion();
  if (iosVersion !== null && iosVersion < 16) {
    console.warn('Push notifications require iOS 16.4+');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission === 'denied') {
    console.warn('Notification permission denied by user');
    return false;
  }

  // Request permission
  const permission = await Notification.requestPermission();
  return permission === 'granted';
};

/**
 * Subscribe to push notifications via your backend
 * @param vapidPublicKey - VAPID public key from your push service
 */
export const subscribeToPush = async (vapidPublicKey: string): Promise<PushSubscription | null> => {
  try {
    const granted = await requestNotificationPermission();
    if (!granted) return null;

    const registration = await navigator.serviceWorker.ready;

    // Convert VAPID key
    const convertedKey = urlBase64ToUint8Array(vapidPublicKey);

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedKey,
    });

    console.log('Push subscription:', JSON.stringify(subscription));

    // TODO: Send subscription object to your backend
    // await sendSubscriptionToServer(subscription);

    return subscription;
  } catch (err) {
    console.error('Push subscription failed:', err);
    return null;
  }
};

/**
 * Get current push subscription
 */
export const getPushSubscription = async (): Promise<PushSubscription | null> => {
  try {
    const registration = await navigator.serviceWorker.ready;
    return await registration.pushManager.getSubscription();
  } catch (err) {
    console.error('Failed to get push subscription:', err);
    return null;
  }
};

/**
 * Unsubscribe from push notifications
 */
export const unsubscribeFromPush = async (): Promise<boolean> => {
  try {
    const subscription = await getPushSubscription();
    if (subscription) {
      await subscription.unsubscribe();
      // TODO: Remove subscription from your backend
      // await removeSubscriptionFromServer(subscription);
      return true;
    }
    return false;
  } catch (err) {
    console.error('Failed to unsubscribe:', err);
    return false;
  }
};

/**
 * Check notification permission status
 */
export const getNotificationPermission = (): NotificationPermission => {
  if (!('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
};

/**
 * Show a local notification (for testing)
 */
export const showLocalNotification = async (title: string, options?: NotificationOptions): Promise<void> => {
  if (!isInStandaloneMode()) {
    console.warn('Local notifications only work in standalone mode');
    return;
  }

  if (Notification.permission !== 'granted') {
    console.warn('Notification permission not granted');
    return;
  }

  const registration = await navigator.serviceWorker.ready;
  await registration.showNotification(title, {
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-96.png',
    ...options,
  });
};

// Helper: VAPID key conversion
function urlBase64ToUint8Array(base64String: string): BufferSource {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer as ArrayBuffer;
}
