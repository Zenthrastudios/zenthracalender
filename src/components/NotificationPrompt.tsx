import { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { isInStandaloneMode, isPushSupported } from '@/utils/deviceDetection';
import { subscribeToPush } from '@/utils/pushNotifications';

// VAPID public key for push notifications
const VAPID_PUBLIC_KEY = 'BKXh-uKDv0tEQ1YmKTIJzU6H_BQJdWOou-6-FCiFCNh1HWsEOLE9ik8QJVtKmpVHRo1lYVcXZctsAnQENdDLclQ';

interface NotificationPromptProps {
  vapidPublicKey?: string;
}

const NotificationPrompt = ({ vapidPublicKey = VAPID_PUBLIC_KEY }: NotificationPromptProps) => {
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
    
    if (!vapidPublicKey) {
      console.warn('VAPID public key not configured');
      return;
    }
    
    const sub = await subscribeToPush(vapidPublicKey);
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
    <div className="fixed inset-0 z-[9999] flex items-end justify-center p-5 bg-black/50">
      <div className="bg-white rounded-2xl p-7 w-full max-w-sm text-center shadow-xl">
        {/* Close button */}
        <button 
          onClick={handleDeny}
          className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
        
        {/* Icon */}
        <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center">
          <Bell className="w-8 h-8 text-white" />
        </div>
        
        <h3 className="text-lg font-bold text-black mb-2">Stay Updated</h3>
        <p className="text-sm text-gray-600 mb-6 leading-relaxed">
          Get notified about new updates, bookings, and special offers.
        </p>
        
        <div className="flex gap-3">
          <button 
            onClick={handleDeny} 
            className="flex-1 py-3 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Not Now
          </button>
          <button 
            onClick={handleAllow} 
            className="flex-1 py-3 px-4 rounded-xl bg-[#007aff] text-sm font-semibold text-white hover:bg-[#0066d6] transition-colors"
          >
            Allow
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationPrompt;
