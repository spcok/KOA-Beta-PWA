import React, { useEffect, useState } from 'react';
import { Download } from 'lucide-react';

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

  if (isInstalled || !deferredPrompt) {
    return null;
  }

  return (
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
  );
};

export default PwaManager;
