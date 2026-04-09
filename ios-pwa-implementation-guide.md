# iOS PWA Implementation Guide
### Auto Home Screen Prompt + App Logo + Push Notifications

> **Target Stack:** React (CRA / Vite / Next.js) + Capacitor  
> **Target Platform:** iOS Safari (iPhone / iPad)  
> **Goal:** Detect iOS Safari → Show "Add to Home Screen" banner → Register app logo → Request push notification permission

---

## Table of Contents

1. [Overview & How It Works on iOS](#1-overview)
2. [Web App Manifest Setup](#2-manifest)
3. [App Icons (Logo) Setup](#3-icons)
4. [Service Worker Registration](#4-service-worker)
5. [iOS Safari Detection](#5-ios-detection)
6. [Custom "Add to Home Screen" Prompt Component](#6-prompt-component)
7. [Push Notification Permission Request](#7-push-notifications)
8. [Wiring It All Together in App.jsx](#8-wiring)
9. [iOS Limitations to Know](#9-limitations)
10. [Testing Checklist](#10-checklist)

---

## 1. Overview & How It Works on iOS {#1-overview}

Unlike Android, iOS **does not support** the native `beforeinstallprompt` event. You cannot programmatically trigger the "Add to Home Screen" dialog. Instead:

- You must **detect iOS Safari manually**
- Show a **custom UI banner** with instructions (e.g., "Tap Share → Add to Home Screen")
- The user manually adds it
- Once installed, the app launches in **standalone fullscreen mode** (no browser chrome)

Push notifications on iOS PWA require **iOS 16.4+** and the app **must be installed** to home screen first.

---

## 2. Web App Manifest Setup {#2-manifest}

Create `public/manifest.json`:

```json
{
  "name": "Your App Name",
  "short_name": "AppName",
  "description": "Your app description",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#000000",
  "orientation": "portrait",
  "icons": [
    {
      "src": "/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-96x96.png",
      "sizes": "96x96",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-128x128.png",
      "sizes": "128x128",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-144x144.png",
      "sizes": "144x144",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-152x152.png",
      "sizes": "152x152",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-384x384.png",
      "sizes": "384x384",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

Link in `public/index.html`:

```html
<head>
  <!-- PWA Manifest -->
  <link rel="manifest" href="/manifest.json" />

  <!-- iOS Specific Meta Tags -->
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <meta name="apple-mobile-web-app-title" content="AppName" />
  <meta name="mobile-web-app-capable" content="yes" />
  <meta name="theme-color" content="#000000" />

  <!-- iOS Apple Touch Icons (REQUIRED for home screen logo) -->
  <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon-180x180.png" />
  <link rel="apple-touch-icon" sizes="152x152" href="/icons/apple-touch-icon-152x152.png" />
  <link rel="apple-touch-icon" sizes="144x144" href="/icons/apple-touch-icon-144x144.png" />
  <link rel="apple-touch-icon" sizes="120x120" href="/icons/apple-touch-icon-120x120.png" />
  <link rel="apple-touch-icon" sizes="114x114" href="/icons/apple-touch-icon-114x114.png" />
  <link rel="apple-touch-icon" sizes="76x76" href="/icons/apple-touch-icon-76x76.png" />
  <link rel="apple-touch-icon" sizes="72x72" href="/icons/apple-touch-icon-72x72.png" />

  <!-- iOS Splash Screens (optional but recommended) -->
  <link rel="apple-touch-startup-image" href="/splash/apple-splash-2048-2732.png" media="(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2)" />
  <link rel="apple-touch-startup-image" href="/splash/apple-splash-1668-2388.png" media="(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2)" />
  <link rel="apple-touch-startup-image" href="/splash/apple-splash-1290-2796.png" media="(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)" />
  <link rel="apple-touch-startup-image" href="/splash/apple-splash-1179-2556.png" media="(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)" />
</head>
```

---

## 3. App Icons (Logo) Setup {#3-icons}

### Required Icon Sizes

Place all icons inside `public/icons/`:

| File | Size | Used For |
|------|------|----------|
| `icon-192x192.png` | 192×192 | Android / PWA standard |
| `icon-512x512.png` | 512×512 | Android / PWA standard |
| `apple-touch-icon-180x180.png` | 180×180 | iOS Home Screen (primary) |
| `apple-touch-icon-152x152.png` | 152×152 | iPad |
| `apple-touch-icon-144x144.png` | 144×144 | iPad Retina |
| `apple-touch-icon-120x120.png` | 120×120 | iPhone |
| `apple-touch-icon-114x114.png` | 114×114 | iPhone Retina |
| `apple-touch-icon-76x76.png` | 76×76 | iPad non-Retina |

### Quick Generation (using sharp or pwa-asset-generator)

```bash
# Install pwa-asset-generator
npm install -g pwa-asset-generator

# Generate all icons + splash screens from your logo
npx pwa-asset-generator ./src/assets/logo.png ./public/icons \
  --index ./public/index.html \
  --manifest ./public/manifest.json \
  --background "#ffffff" \
  --padding "15%"
```

> **Important:** iOS does NOT round the icons automatically — iOS clips them to a rounded square shape. Make sure your logo has some padding and doesn't go edge-to-edge.

---

## 4. Service Worker Registration {#4-service-worker}

Create `public/sw.js`:

```javascript
const CACHE_NAME = 'app-cache-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
];

// Install
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch (cache first, then network)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});

// Push Notification Handler
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'New Notification';
  const options = {
    body: data.body || '',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-96x96.png',
    data: { url: data.url || '/' },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification Click Handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === event.notification.data.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data.url);
      }
    })
  );
});
```

Register the service worker in `src/index.jsx` or `src/main.jsx`:

```javascript
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => console.log('SW registered:', reg.scope))
      .catch((err) => console.error('SW registration failed:', err));
  });
}
```

---

## 5. iOS Safari Detection {#5-ios-detection}

Create `src/utils/deviceDetection.js`:

```javascript
/**
 * Detect if user is on iOS
 */
export const isIOS = () => {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    // iPad on iOS 13+ reports as MacIntel
    (navigator.userAgent.includes('Mac') && 'ontouchend' in document)
  );
};

/**
 * Detect if running in Safari (not Chrome/Firefox on iOS)
 */
export const isSafari = () => {
  return (
    /Safari/.test(navigator.userAgent) &&
    !/Chrome|CriOS|FxiOS/.test(navigator.userAgent)
  );
};

/**
 * Detect if app is already installed (running in standalone mode)
 */
export const isInStandaloneMode = () => {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
};

/**
 * Detect iOS version
 */
export const getIOSVersion = () => {
  const match = navigator.userAgent.match(/OS (\d+)_(\d+)/);
  if (match) {
    return parseInt(match[1], 10);
  }
  return null;
};

/**
 * Check if push notifications are supported (iOS 16.4+, standalone only)
 */
export const isPushSupported = () => {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window &&
    isInStandaloneMode()
  );
};
```

---

## 6. Custom "Add to Home Screen" Prompt Component {#6-prompt-component}

Create `src/components/IOSInstallBanner.jsx`:

```jsx
import React, { useState, useEffect } from 'react';
import { isIOS, isSafari, isInStandaloneMode } from '../utils/deviceDetection';

const STORAGE_KEY = 'ios_install_banner_dismissed';

const IOSInstallBanner = () => {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const alreadyDismissed = localStorage.getItem(STORAGE_KEY);
    const shouldShow =
      isIOS() &&
      isSafari() &&
      !isInStandaloneMode() &&
      !alreadyDismissed;

    if (shouldShow) {
      // Small delay so page loads first
      const timer = setTimeout(() => setShowBanner(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.banner}>
        {/* App Icon */}
        <img
          src="/icons/apple-touch-icon-180x180.png"
          alt="App Icon"
          style={styles.appIcon}
        />

        {/* Text */}
        <div style={styles.textBlock}>
          <p style={styles.title}>Add to Home Screen</p>
          <p style={styles.subtitle}>
            Tap{' '}
            <span style={styles.shareIcon}>⬆</span>
            {' '}then <strong>"Add to Home Screen"</strong> to install this app
          </p>
        </div>

        {/* Dismiss */}
        <button onClick={handleDismiss} style={styles.closeButton}>
          ✕
        </button>
      </div>

      {/* Arrow pointing to Safari share button at bottom */}
      <div style={styles.arrowWrapper}>
        <div style={styles.arrow} />
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '0 16px 12px',
    pointerEvents: 'none',
  },
  banner: {
    background: 'rgba(255,255,255,0.97)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    borderRadius: '16px',
    padding: '14px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    boxShadow: '0 4px 30px rgba(0,0,0,0.15)',
    pointerEvents: 'all',
    width: '100%',
    maxWidth: '400px',
  },
  appIcon: {
    width: '52px',
    height: '52px',
    borderRadius: '12px',
    flexShrink: 0,
  },
  textBlock: {
    flex: 1,
  },
  title: {
    margin: 0,
    fontSize: '15px',
    fontWeight: '700',
    color: '#000',
  },
  subtitle: {
    margin: '4px 0 0',
    fontSize: '13px',
    color: '#555',
    lineHeight: 1.4,
  },
  shareIcon: {
    display: 'inline-block',
    background: '#007aff',
    color: '#fff',
    borderRadius: '4px',
    padding: '0 4px',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '16px',
    color: '#999',
    cursor: 'pointer',
    padding: '4px 8px',
    flexShrink: 0,
  },
  arrowWrapper: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: '4px',
  },
  arrow: {
    width: 0,
    height: 0,
    borderLeft: '10px solid transparent',
    borderRight: '10px solid transparent',
    borderTop: '10px solid rgba(255,255,255,0.97)',
  },
};

export default IOSInstallBanner;
```

---

## 7. Push Notification Permission Request {#7-push-notifications}

Create `src/utils/pushNotifications.js`:

```javascript
import { isPushSupported, getIOSVersion } from './deviceDetection';

/**
 * Request notification permission from user.
 * On iOS: only works if app is installed to home screen (iOS 16.4+)
 */
export const requestNotificationPermission = async () => {
  if (!isPushSupported()) {
    console.warn('Push not supported. Is the app installed to home screen?');
    return false;
  }

  const iosVersion = getIOSVersion();
  if (iosVersion && iosVersion < 16) {
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
 * Replace VAPID_PUBLIC_KEY with your actual key
 */
export const subscribeToPush = async (vapidPublicKey) => {
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

// Helper: VAPID key conversion
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}
```

Create `src/components/NotificationPrompt.jsx`:

```jsx
import React, { useState, useEffect } from 'react';
import { isInStandaloneMode, isPushSupported } from '../utils/deviceDetection';
import { subscribeToPush } from '../utils/pushNotifications';

const VAPID_PUBLIC_KEY = 'YOUR_VAPID_PUBLIC_KEY_HERE'; // Replace this

const NotificationPrompt = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const alreadyAsked = localStorage.getItem('push_permission_asked');
    if (isInStandaloneMode() && isPushSupported() && !alreadyAsked) {
      // Wait 5 seconds after install before asking
      const timer = setTimeout(() => setShow(true), 5000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAllow = async () => {
    localStorage.setItem('push_permission_asked', 'true');
    setShow(false);
    const sub = await subscribeToPush(VAPID_PUBLIC_KEY);
    if (sub) {
      console.log('Subscribed to push:', sub);
      // Send sub to your backend here
    }
  };

  const handleDeny = () => {
    localStorage.setItem('push_permission_asked', 'true');
    setShow(false);
  };

  if (!show) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.card}>
        <img
          src="/icons/icon-192x192.png"
          alt="App Icon"
          style={styles.icon}
        />
        <h3 style={styles.title}>Stay Updated</h3>
        <p style={styles.body}>
          Get notified about new updates, orders, and offers.
        </p>
        <div style={styles.buttons}>
          <button onClick={handleDeny} style={styles.denyBtn}>Not Now</button>
          <button onClick={handleAllow} style={styles.allowBtn}>Allow</button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    zIndex: 9999,
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    padding: '20px',
  },
  card: {
    background: '#fff',
    borderRadius: '20px',
    padding: '28px 24px',
    width: '100%',
    maxWidth: '380px',
    textAlign: 'center',
  },
  icon: {
    width: '64px',
    height: '64px',
    borderRadius: '16px',
    marginBottom: '16px',
  },
  title: {
    margin: '0 0 8px',
    fontSize: '18px',
    fontWeight: '700',
    color: '#000',
  },
  body: {
    margin: '0 0 24px',
    fontSize: '14px',
    color: '#555',
    lineHeight: 1.5,
  },
  buttons: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
  },
  denyBtn: {
    flex: 1,
    padding: '12px',
    borderRadius: '12px',
    border: '1px solid #ddd',
    background: '#f5f5f5',
    fontSize: '15px',
    cursor: 'pointer',
    fontWeight: '600',
    color: '#333',
  },
  allowBtn: {
    flex: 1,
    padding: '12px',
    borderRadius: '12px',
    border: 'none',
    background: '#007aff',
    fontSize: '15px',
    cursor: 'pointer',
    fontWeight: '600',
    color: '#fff',
  },
};

export default NotificationPrompt;
```

---

## 8. Wiring It All Together in App.jsx {#8-wiring}

```jsx
import React from 'react';
import IOSInstallBanner from './components/IOSInstallBanner';
import NotificationPrompt from './components/NotificationPrompt';

function App() {
  return (
    <div className="App">
      {/* Your app content */}

      {/* iOS PWA Prompts */}
      <IOSInstallBanner />
      <NotificationPrompt />
    </div>
  );
}

export default App;
```

---

## 9. iOS Limitations to Know {#9-limitations}

| Feature | iOS Support | Notes |
|---------|------------|-------|
| Add to Home Screen | ✅ Manual only | Cannot auto-trigger — user must tap Share → Add |
| Standalone Fullscreen | ✅ Yes | Works after install |
| App Icon on Home Screen | ✅ Yes | Requires `apple-touch-icon` meta tags |
| Push Notifications | ⚠️ iOS 16.4+ only | App MUST be installed first |
| Background Sync | ❌ No | Not supported on iOS |
| `beforeinstallprompt` | ❌ No | Android only |
| Notification Badge Count | ❌ No | Not supported on iOS PWA |
| Camera / Mic in PWA | ✅ Yes | Works in standalone mode |

---

## 10. Testing Checklist {#10-checklist}

```
[ ] manifest.json is accessible at /manifest.json
[ ] All icon files exist in /public/icons/
[ ] apple-touch-icon meta tags are in index.html
[ ] apple-mobile-web-app-capable meta tag is set to "yes"
[ ] Service worker registers without errors (check console)
[ ] Test on real iPhone in Safari (not Chrome, not simulator)
[ ] Banner appears after 2 seconds if not installed
[ ] After installing to home screen, app opens in fullscreen
[ ] App logo appears correctly on home screen
[ ] Splash screen shows on launch (iOS 16+)
[ ] Notification prompt shows only after install
[ ] Push permission dialog appears in Safari
[ ] Test push delivery from your backend
[ ] Banner doesn't show again after dismiss (localStorage check)
```

---

## Generate VAPID Keys (for push backend)

```bash
npm install web-push -g
web-push generate-vapid-keys
```

Use the public key in `NotificationPrompt.jsx` and keep the private key in your backend server for sending pushes.

---

*Last updated: April 2026 | Tested on iOS 16.4, 17, 18*
