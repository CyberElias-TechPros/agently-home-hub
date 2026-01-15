interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export class PWAManager {
  private deferredPrompt: BeforeInstallPromptEvent | null = null;
  private isInstallable = false;
  private isInstalled = false;

  constructor() {
    this.init();
  }

  private init() {
    // Listen for beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e as BeforeInstallPromptEvent;
      this.isInstallable = true;
      console.log('PWA: Install prompt ready');
    });

    // Check if app is already installed
    this.checkInstalledStatus();

    // Listen for app installed event
    window.addEventListener('appinstalled', () => {
      this.isInstalled = true;
      this.isInstallable = false;
      console.log('PWA: App installed successfully');
    });

    // Listen for online/offline events
    window.addEventListener('online', () => {
      console.log('PWA: App is online');
      this.showNetworkStatus(true);
    });

    window.addEventListener('offline', () => {
      console.log('PWA: App is offline');
      this.showNetworkStatus(false);
    });
  }

  private checkInstalledStatus() {
    // Check if running in standalone mode
    if (window.matchMedia('(display-mode: standalone)').matches) {
      this.isInstalled = true;
      console.log('PWA: App is running in standalone mode');
    }

    // Check if installed via navigator.standalone (iOS)
    if ('standalone' in navigator && (navigator as any).standalone) {
      this.isInstalled = true;
      console.log('PWA: App is installed (iOS)');
    }
  }

  public async install(): Promise<boolean> {
    if (!this.deferredPrompt || this.isInstalled) {
      return false;
    }

    try {
      await this.deferredPrompt.prompt();
      const { outcome } = await this.deferredPrompt.userChoice;
      
      this.deferredPrompt = null;
      this.isInstallable = false;

      if (outcome === 'accepted') {
        console.log('PWA: User accepted install prompt');
        return true;
      } else {
        console.log('PWA: User dismissed install prompt');
        return false;
      }
    } catch (error) {
      console.error('PWA: Install failed', error);
      return false;
    }
  }

  public canInstall(): boolean {
    return this.isInstallable && !this.isInstalled;
  }

  public isAppInstalled(): boolean {
    return this.isInstalled;
  }

  public async requestNotificationPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('PWA: Notifications not supported');
      return 'denied';
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    if (Notification.permission === 'denied') {
      return 'denied';
    }

    try {
      const permission = await Notification.requestPermission();
      console.log('PWA: Notification permission:', permission);
      return permission;
    } catch (error) {
      console.error('PWA: Failed to request notification permission', error);
      return 'denied';
    }
  }

  public async subscribeToPushNotifications(): Promise<PushSubscription | null> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('PWA: Push notifications not supported');
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(process.env.VITE_VAPID_PUBLIC_KEY || '') as any
      });

      console.log('PWA: Push subscription successful');
      return subscription;
    } catch (error) {
      console.error('PWA: Failed to subscribe to push notifications', error);
      return null;
    }
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }

    return outputArray;
  }

  private showNetworkStatus(isOnline: boolean) {
    // Create or update network status indicator
    let statusElement = document.getElementById('network-status');
    
    if (!statusElement) {
      statusElement = document.createElement('div');
      statusElement.id = 'network-status';
      statusElement.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        padding: 8px;
        text-align: center;
        font-size: 14px;
        font-weight: 500;
        z-index: 9999;
        transition: all 0.3s ease;
      `;
      document.body.appendChild(statusElement);
    }

    if (isOnline) {
      statusElement.textContent = 'Back online';
      statusElement.style.backgroundColor = '#10b981';
      statusElement.style.color = 'white';
      
      setTimeout(() => {
        statusElement.style.display = 'none';
      }, 3000);
    } else {
      statusElement.textContent = 'You are offline';
      statusElement.style.backgroundColor = '#ef4444';
      statusElement.style.color = 'white';
      statusElement.style.display = 'block';
    }
  }

  public async cachePage(url: string): Promise<void> {
    if (!('serviceWorker' in navigator)) {
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      await fetch(url);
      
      // Trigger service worker to cache the page
      registration.active?.postMessage({
        type: 'CACHE_URLS',
        urls: [url]
      });
      
      console.log('PWA: Page cached:', url);
    } catch (error) {
      console.error('PWA: Failed to cache page', error);
    }
  }

  public async clearCache(): Promise<void> {
    if (!('serviceWorker' in navigator)) {
      return;
    }

    try {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
      
      console.log('PWA: All caches cleared');
    } catch (error) {
      console.error('PWA: Failed to clear cache', error);
    }
  }

  public getInstallPrompt(): BeforeInstallPromptEvent | null {
    return this.deferredPrompt;
  }

  public getDeviceInfo() {
    return {
      isStandalone: window.matchMedia('(display-mode: standalone)').matches,
      isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent),
      isAndroid: /Android/.test(navigator.userAgent),
      isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
      isInstalled: this.isInstalled,
      canInstall: this.canInstall()
    };
  }
}

// Create singleton instance
export const pwaManager = new PWAManager();

// Export types
export type { BeforeInstallPromptEvent };
