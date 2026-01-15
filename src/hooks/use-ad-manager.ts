import { useEffect, useState, useCallback } from 'react';
import { adManager } from '@/lib/ad-manager';
import { AdConfig, AdAnalytics, AdSettings } from '@/types/ad-management';

export function useAdManager() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [adBlockDetected, setAdBlockDetected] = useState(false);
  const [analytics, setAnalytics] = useState<AdAnalytics | null>(null);
  const [settings, setSettings] = useState<AdSettings | null>(null);
  const [adConfigs, setAdConfigs] = useState<AdConfig[]>([]);

  const initialize = useCallback(async () => {
    if (isInitialized) return;

    try {
      await adManager.initialize();
      setIsInitialized(true);
      
      // Load initial data
      setSettings(adManager.getSettings());
      setAdConfigs(adManager.getAdConfigs());
      setAnalytics(adManager.getAnalytics());
      
      // Check for ad blocker
      const detected = adManager.isAdBlockDetected();
      setAdBlockDetected(detected);
    } catch (error) {
      console.error('Failed to initialize ad manager:', error);
    }
  }, [isInitialized]);

  const refreshAnalytics = useCallback(() => {
    if (isInitialized) {
      setAnalytics(adManager.getAnalytics());
    }
  }, [isInitialized]);

  const updateSettings = useCallback((newSettings: Partial<AdSettings>) => {
    if (isInitialized) {
      adManager.updateSettings(newSettings);
      setSettings(adManager.getSettings());
    }
  }, [isInitialized]);

  const updateAdConfig = useCallback((config: AdConfig) => {
    if (isInitialized) {
      adManager.updateAdConfig(config);
      setAdConfigs(adManager.getAdConfigs());
    }
  }, [isInitialized]);

  const deleteAdConfig = useCallback((id: string) => {
    if (isInitialized) {
      adManager.deleteAdConfig(id);
      setAdConfigs(adManager.getAdConfigs());
    }
  }, [isInitialized]);

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Auto-refresh analytics every 30 seconds
  useEffect(() => {
    if (!isInitialized) return;

    const interval = setInterval(() => {
      refreshAnalytics();
    }, 30000);

    return () => clearInterval(interval);
  }, [isInitialized, refreshAnalytics]);

  return {
    isInitialized,
    adBlockDetected,
    analytics,
    settings,
    adConfigs,
    initialize,
    refreshAnalytics,
    updateSettings,
    updateAdConfig,
    deleteAdConfig
  };
}

export function useAdConfig(pageType: string, position: 'top' | 'bottom' | 'sidebar' | 'inline' | 'header') {
  const [adConfig, setAdConfig] = useState<AdConfig | null>(null);

  useEffect(() => {
    const config = adManager.getAdConfig(pageType, position);
    setAdConfig(config);
  }, [pageType, position]);

  return adConfig;
}