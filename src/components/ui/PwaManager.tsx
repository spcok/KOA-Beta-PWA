import React, { useEffect, useState } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

const PwaManager: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(() => {
    if (typeof window === 'undefined') return false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
  });

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered: ' + r);
    },
    onRegisterError(error) {
      console.log('SW registration error', error);
    },
  });

  useEffect(() => {
    // Handle the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    // Handle the appinstalled event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      console.log('PWA was installed');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  return (
    <>
      {needRefresh && (
        <div className="fixed top-0 left-0 right-0 z-[10000] bg-indigo-600 text-white p-4 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3">
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span className="font-medium text-sm">A new version of the app is available.</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => updateServiceWorker(true)}
              className="bg-white text-indigo-600 px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-50 transition-colors"
            >
              Update Now
            </button>
            <button
              onClick={() => setNeedRefresh(false)}
              className="bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-800 transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
      
      {(!isInstalled && deferredPrompt) && (
        <div className="fixed bottom-6 right-6 z-[9999]">
          <button
            onClick={handleInstallClick}
            className="bg-blue-600 text-white px-4 py-3 rounded-xl shadow-2xl hover:bg-blue-700 font-medium flex items-center gap-2 transition-all transform hover:scale-105 active:scale-95 animate-bounce"
            id="pwa-install-button"
          >
            <Download className="w-5 h-5" />
            <span>Install App</span>
          </button>
        </div>
      )}
    </>
  );
};

export default PwaManager;
