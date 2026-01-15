// Ad Management Types

export interface AdConfig {
  id: string;
  name: string;
  adType: 'banner' | 'sidebar' | 'interstitial' | 'native' | 'video';
  adUnitId: string;
  adClient: string;
  slotId: string;
  width: number | '100vw';
  height: number | '100vh';
  position: 'top' | 'bottom' | 'sidebar' | 'inline' | 'header';
  targeting: AdTargeting;
  status: 'active' | 'paused' | 'draft';
  priority: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdTargeting {
  pageTypes: string[];
  userTypes: string[];
  deviceTypes: string[];
  geographic: string[];
  keywords: string[];
  customParams: Record<string, string>;
}

export interface AdPerformance {
  adId: string;
  impressions: number;
  clicks: number;
  ctr: number;
  revenue: number;
  ecpm: number;
  date: string;
}

export interface AdCampaign {
  id: string;
  name: string;
  budget: number;
  dailyBudget: number;
  startDate: string;
  endDate: string;
  status: 'active' | 'paused' | 'completed';
  ads: string[];
  targeting: AdTargeting;
  createdAt: string;
  updatedAt: string;
}

export interface AdPlacement {
  id: string;
  page: string;
  position: string;
  adConfigId: string;
  priority: number;
  isActive: boolean;
}

export interface AdSettings {
  isEnabled: boolean;
  adNetwork: 'google-adsense' | 'custom' | 'multiple';
  adSenseClientId: string;
  adSenseSlotId: string;
  adBlockDetection: boolean;
  revenueSharing: {
    enabled: boolean;
    percentage: number;
    threshold: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface AdAnalytics {
  totalRevenue: number;
  totalImpressions: number;
  totalClicks: number;
  avgCtr: number;
  avgEcpm: number;
  topPerformingAds: AdPerformance[];
  revenueByPage: Record<string, number>;
  revenueByTime: Array<{ date: string; revenue: number }>;
}