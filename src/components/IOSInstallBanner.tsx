import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { isIOS, isSafari, isInStandaloneMode } from '@/utils/deviceDetection';

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
      const timer = setTimeout(() => setShowBanner(true), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[9999] px-4 pb-3 pointer-events-none">
      <div className="pointer-events-auto mx-auto w-full max-w-md overflow-hidden rounded-2xl border border-zinc-700/80 bg-zinc-950/95 shadow-2xl backdrop-blur-xl">
        <div className="h-1.5 w-full bg-gradient-to-r from-cyan-400 via-indigo-500 to-fuchsia-500" />

        <div className="p-4">
          <div className="mb-3 flex items-start gap-3">
            <img
              src="/icons/apple-touch-icon-180x180.png"
              alt="App Icon"
              className="h-12 w-12 rounded-xl border border-zinc-700"
            />

            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-zinc-300">Install Intimatecare App</p>
              <p className="text-base font-bold text-white">Add to Home Screen</p>
              <p className="mt-0.5 text-xs text-zinc-400">Takes 10 seconds. You'll get full-screen app experience and notifications.</p>
            </div>

            <button
              onClick={handleDismiss}
              className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-2 rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 text-xs text-zinc-300">
            <div className="flex items-start gap-2">
              <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-[10px] font-bold text-blue-300">1</span>
              <p>
                Tap the Safari <strong className="text-white">Share</strong> button
                <span className="mx-1 inline-flex items-center rounded bg-blue-500 px-1.5 py-0.5 text-[10px] font-bold text-white">↑</span>
                at the bottom.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-[10px] font-bold text-blue-300">2</span>
              <p><strong className="text-white">Scroll down</strong> in the menu to find options.</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-[10px] font-bold text-blue-300">3</span>
              <p>Tap <strong className="text-white">Add to Home Screen</strong> → then tap <strong className="text-white">Add</strong>.</p>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            className="mt-3 w-full rounded-xl bg-white px-3 py-2.5 text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-100"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};

export default IOSInstallBanner;
