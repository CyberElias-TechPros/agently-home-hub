import { AdConfig, AdPerformance, AdSettings, AdAnalytics } from '@/types/ad-management';

class AdManager {
  private settings: AdSettings;
  private adConfigs: AdConfig[] = [];
  private performanceData: AdPerformance[] = [];
  private isInitialized = false;

  constructor() {
    this.settings = {
      isEnabled: true,
      adNetwork: 'google-adsense',
      adSenseClientId: 'ca-pub-9117572925263537',
      adSenseSlotId: '7966964742',
      adBlockDetection: true,
      revenueSharing: {
        enabled: true,
        percentage: 70,
        threshold: 10
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      // Load ad configurations
      await this.loadAdConfigs();
      
      // Initialize ad networks
      await this.initializeAdNetworks();
      
      // Start performance tracking
      this.startPerformanceTracking();
      
      this.isInitialized = true;
      console.log('Ad Manager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Ad Manager:', error);
    }
  }

  private async loadAdConfigs() {
    // Load from localStorage or API
    const savedConfigs = localStorage.getItem('ad_configs');
    if (savedConfigs) {
      this.adConfigs = JSON.parse(savedConfigs);
    } else {
      // Default ad configurations
      this.adConfigs = [
        {
          id: 'ad-top-banner',
          name: 'Top Banner Ad',
          adType: 'banner',
          adUnitId: 'top-banner',
          adClient: 'ca-pub-9117572925263537',
          slotId: '7966964742',
          width: '100vw',
          height: 320,
          position: 'top',
          targeting: {
            pageTypes: ['home', 'properties', 'property-detail'],
            userTypes: ['all'],
            deviceTypes: ['mobile', 'desktop'],
            geographic: ['NG', 'US', 'UK'],
            keywords: ['real estate', 'rental', 'property'],
            customParams: {}
          },
          status: 'active',
          priority: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'ad-sidebar',
          name: 'Sidebar Ad',
          adType: 'sidebar',
          adUnitId: 'sidebar-ad',
          adClient: 'ca-pub-9117572925263537',
          slotId: '7966964742',
          width: 300,
          height: 600,
          position: 'sidebar',
          targeting: {
            pageTypes: ['properties', 'property-detail', 'dashboard'],
            userTypes: ['all'],
            deviceTypes: ['desktop'],
            geographic: ['NG', 'US', 'UK'],
            keywords: ['real estate', 'investment', 'housing'],
            customParams: {}
          },
          status: 'active',
          priority: 2,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'ad-interstitial',
          name: 'Interstitial Ad',
          adType: 'interstitial',
          adUnitId: 'interstitial',
          adClient: 'ca-pub-9117572925263537',
          slotId: '7966964742',
          width: '100vw',
          height: '100vh',
          position: 'inline',
          targeting: {
            pageTypes: ['property-detail'],
            userTypes: ['guest'],
            deviceTypes: ['mobile'],
            geographic: ['NG', 'US', 'UK'],
            keywords: ['real estate', 'rental'],
            customParams: {}
          },
          status: 'active',
          priority: 3,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];
      localStorage.setItem('ad_configs', JSON.stringify(this.adConfigs));
    }
  }

  private async initializeAdNetworks() {
    if (this.settings.adNetwork === 'google-adsense') {
      await this.initializeGoogleAdSense();
    }
  }

  private async initializeGoogleAdSense() {
    return new Promise((resolve) => {
      // Load Google AdSense script
      const script = document.createElement('script');
      script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9117572925263537';
      script.async = true;
      script.crossOrigin = 'anonymous';
      
      script.onload = () => {
        // Initialize ads
        try {
          (window as any).adsbygoogle = (window as any).adsbygoogle || [];
          (window as any).adsbygoogle.push({});
        } catch (e) {
          console.warn('AdSense initialization warning:', e);
        }
        resolve(true);
      };
      
      script.onerror = () => {
        console.error('Failed to load AdSense script');
        resolve(false);
      };
      
      document.head.appendChild(script);
    });
  }

  private startPerformanceTracking() {
    // Track impressions
    this.trackImpressions();
    
    // Track clicks
    this.trackClicks();
    
    // Save performance data periodically
    setInterval(() => {
      this.savePerformanceData();
    }, 30000); // Every 30 seconds
  }

  private trackImpressions() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          this.recordImpression(entry.target.id);
        }
      });
    });

    // Observe all ad containers
    document.querySelectorAll('[data-ad-container]').forEach((container) => {
      observer.observe(container);
    });
  }

  private trackClicks() {
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      const adContainer = target.closest('[data-ad-container]');
      if (adContainer) {
        this.recordClick(adContainer.id);
      }
    });
  }

  private recordImpression(adId: string) {
    const existing = this.performanceData.find(p => p.adId === adId && p.date === this.getCurrentDate());
    if (existing) {
      existing.impressions++;
      existing.ctr = existing.clicks / existing.impressions;
    } else {
      this.performanceData.push({
        adId,
        impressions: 1,
        clicks: 0,
        ctr: 0,
        revenue: 0,
        ecpm: 0,
        date: this.getCurrentDate()
      });
    }
  }

  private recordClick(adId: string) {
    const existing = this.performanceData.find(p => p.adId === adId && p.date === this.getCurrentDate());
    if (existing) {
      existing.clicks++;
      existing.ctr = existing.clicks / existing.impressions;
    }
  }

  private getCurrentDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  private savePerformanceData() {
    localStorage.setItem('ad_performance', JSON.stringify(this.performanceData));
  }

  getAdConfig(pageType: string, position: string): AdConfig | null {
    const eligibleAds = this.adConfigs.filter(config => 
      config.status === 'active' &&
      config.targeting.pageTypes.includes(pageType) &&
      config.position === position
    );

    if (eligibleAds.length === 0) return null;

    // Sort by priority and return the highest priority
    eligibleAds.sort((a, b) => b.priority - a.priority);
    return eligibleAds[0];
  }

  getAnalytics(): AdAnalytics {
    const today = this.getCurrentDate();
    const todayData = this.performanceData.filter(p => p.date === today);
    
    const totalImpressions = todayData.reduce((sum, p) => sum + p.impressions, 0);
    const totalClicks = todayData.reduce((sum, p) => sum + p.clicks, 0);
    const totalRevenue = todayData.reduce((sum, p) => sum + p.revenue, 0);
    
    const avgCtr = totalImpressions > 0 ? totalClicks / totalImpressions : 0;
    const avgEcpm = totalImpressions > 0 ? (totalRevenue / totalImpressions) * 1000 : 0;

    return {
      totalRevenue,
      totalImpressions,
      totalClicks,
      avgCtr,
      avgEcpm,
      topPerformingAds: todayData.sort((a, b) => b.revenue - a.revenue).slice(0, 5),
      revenueByPage: {},
      revenueByTime: []
    };
  }

  isAdBlockDetected(): boolean {
    if (!this.settings.adBlockDetection) return false;
    
    // Simple ad block detection
    const testAd = document.createElement('div');
    testAd.innerHTML = ' ';
    testAd.className = 'adsbox';
    testAd.style.height = '1px';
    document.body.appendChild(testAd);
    
    const isBlocked = testAd.offsetHeight === 0;
    document.body.removeChild(testAd);
    
    return isBlocked;
  }

  getSettings(): AdSettings {
    return this.settings;
  }

  updateSettings(settings: Partial<AdSettings>) {
    this.settings = { ...this.settings, ...settings, updatedAt: new Date().toISOString() };
    localStorage.setItem('ad_settings', JSON.stringify(this.settings));
  }

  getAdConfigs(): AdConfig[] {
    return this.adConfigs;
  }

  updateAdConfig(config: AdConfig) {
    const index = this.adConfigs.findIndex(c => c.id === config.id);
    if (index > -1) {
      this.adConfigs[index] = { ...config, updatedAt: new Date().toISOString() };
    } else {
      this.adConfigs.push({ ...config, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
    localStorage.setItem('ad_configs', JSON.stringify(this.adConfigs));
  }

  deleteAdConfig(id: string) {
    this.adConfigs = this.adConfigs.filter(c => c.id !== id);
    localStorage.setItem('ad_configs', JSON.stringify(this.adConfigs));
  }
}

// Export singleton instance
export const adManager = new AdManager();