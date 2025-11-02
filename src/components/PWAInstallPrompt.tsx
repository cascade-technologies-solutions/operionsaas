import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, X, Smartphone, Monitor } from 'lucide-react';
import { toast } from 'sonner';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    const checkInstallStatus = () => {
      // Check if running in standalone mode (PWA installed)
      const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || 
                               (window.navigator as any).standalone === true;
      setIsStandalone(isStandaloneMode);
      setIsInstalled(isStandaloneMode);

      // Check if iOS device
      const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      setIsIOS(isIOSDevice);


      // Don't show prompt if already installed
      if (isStandaloneMode) {
        setShowInstallPrompt(false);
        return;
      }

      // Check if user has previously dismissed the prompt
      const dismissed = localStorage.getItem('pwa-install-dismissed');
      if (dismissed) {
        const dismissTime = parseInt(dismissed);
        const daysSinceDismiss = (Date.now() - dismissTime) / (1000 * 60 * 60 * 24);
        
        // Show again after 7 days
        if (daysSinceDismiss < 7) {
          setShowInstallPrompt(false);
          return;
        }
      }

      // Show prompt after a delay (only for authenticated users)
      const timer = setTimeout(() => {
        setShowInstallPrompt(true);
      }, 3000); // Show after 3 seconds

      return () => clearTimeout(timer);
    };

    checkInstallStatus();

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    // Listen for appinstalled event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
      toast.success('App installed successfully! You can now access it from your home screen.');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // For iOS devices, show manual installation instructions
      if (isIOS) {
        toast.info('To install this app on iOS, tap the Share button and select "Add to Home Screen"');
        return;
      }
      return;
    }

    try {
      // Show the install prompt
      await deferredPrompt.prompt();
      
      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        toast.success('Installing app...');
      } else {
        toast.info('Installation cancelled');
        // Remember that user dismissed the prompt
        localStorage.setItem('pwa-install-dismissed', Date.now().toString());
      }
      
      // Clear the deferred prompt
      setDeferredPrompt(null);
      setShowInstallPrompt(false);
    } catch (error) {
      toast.error('Failed to show install prompt');
    }
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
    // Remember that user dismissed the prompt
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  // Don't show if already installed or prompt is dismissed
  if (isInstalled || !showInstallPrompt) {
    return null;
  }

  return (
    <Card className="mb-6 border-blue-200 bg-blue-50/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Download className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg text-blue-900">Install Operion App</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="h-8 w-8 p-0 text-blue-600 hover:text-blue-800"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <CardDescription className="text-blue-700">
          Install the app for faster access and offline functionality
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-blue-100">
              <Smartphone className="h-8 w-8 text-blue-600" />
              <div>
                <h4 className="font-medium text-blue-900">Mobile Access</h4>
                <p className="text-sm text-blue-700">Quick access from your home screen</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-blue-100">
              <Monitor className="h-8 w-8 text-blue-600" />
              <div>
                <h4 className="font-medium text-blue-900">Offline Support</h4>
                <p className="text-sm text-blue-700">Works even without internet connection</p>
              </div>
            </div>
          </div>
          
          {isIOS ? (
            <div className="p-4 bg-white rounded-lg border border-blue-100">
              <h4 className="font-medium text-blue-900 mb-2">Install on iOS:</h4>
              <ol className="text-sm text-blue-700 space-y-1">
                <li>1. Tap the Share button <span className="inline-block w-4 h-4 bg-blue-200 rounded mx-1">⎋</span> in Safari</li>
                <li>2. Scroll down and tap "Add to Home Screen"</li>
                <li>3. Tap "Add" to confirm</li>
              </ol>
            </div>
          ) : deferredPrompt ? (
            <Button 
              onClick={handleInstallClick}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Download className="h-4 w-4 mr-2" />
              Install App
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="p-4 bg-white rounded-lg border border-blue-100">
                <h4 className="font-medium text-blue-900 mb-2">Install Instructions:</h4>
                <div className="text-sm text-blue-700 space-y-2">
                  <p><strong>Chrome/Edge:</strong> Look for the install icon in the address bar</p>
                  <p><strong>Firefox:</strong> Click the menu button and select "Install"</p>
                  <p><strong>Mobile:</strong> Use "Add to Home Screen" from browser menu</p>
                </div>
              </div>
              <Button 
                onClick={() => {
                  toast.info('Look for the install icon in your browser\'s address bar or menu');
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Download className="h-4 w-4 mr-2" />
                Show Install Instructions
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
