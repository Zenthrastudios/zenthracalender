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
    <div className="fixed bottom-0 left-0 right-0 z-[9999] flex flex-col items-center px-4 pb-3 pointer-events-none">
      <div className="bg-white/97 backdrop-blur-xl rounded-2xl p-4 flex items-center gap-3 shadow-lg pointer-events-auto w-full max-w-md">
        {/* App Icon */}
        <img
          src="/icons/apple-touch-icon-180x180.png"
          alt="App Icon"
          className="w-14 h-14 rounded-xl flex-shrink-0"
        />

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-base font-bold text-black m-0">Add to Home Screen</p>
          <p className="text-sm text-gray-600 mt-1 leading-snug">
            Tap{' '}
            <span className="inline-block bg-[#007aff] text-white rounded px-1.5 py-0.5 text-xs font-bold">
              <svg className="inline w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16.5 9.5l-4-4v14.17h-1V5.5l-4 4-.71-.71 5.21-5.21 5.21 5.21-.71.71z"/>
              </svg>
            </span>
            {' '}then <strong>"Add to Home Screen"</strong> to install
          </p>
        </div>

        {/* Dismiss */}
        <button 
          onClick={handleDismiss} 
          className="flex-shrink-0 p-2 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Arrow pointing to Safari share button */}
      <div className="flex justify-center mt-1">
        <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[10px] border-t-white/97" />
      </div>
    </div>
  );
};

export default IOSInstallBanner;
