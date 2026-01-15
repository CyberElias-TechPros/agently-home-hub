import React, { useEffect, useRef, useState } from 'react';
import { adManager } from '@/lib/ad-manager';
import { AdConfig } from '@/types/ad-management';

interface AdContainerProps {
  pageType: string;
  position: 'top' | 'bottom' | 'sidebar' | 'inline' | 'header';
  className?: string;
  style?: React.CSSProperties;
}

export default function AdContainer({ pageType, position, className = '', style = {} }: AdContainerProps) {
  const [adConfig, setAdConfig] = useState<AdConfig | null>(null);
  const [isAdBlockDetected, setIsAdBlockDetected] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const initializeAd = async () => {
      // Check if ad blocking is detected
      const detected = adManager.isAdBlockDetected();
      setIsAdBlockDetected(detected);

      if (detected) {
        console.log('Ad blocker detected, showing alternative content');
        return;
      }

      // Get appropriate ad configuration
      const config = adManager.getAdConfig(pageType, position);
      if (config) {
        setAdConfig(config);
        
        // Wait for AdSense to be ready
        await waitForAdSense();
        
        // Load the ad
        loadAd(config);
      }
    };

    initializeAd();
  }, [pageType, position]);

  const waitForAdSense = (): Promise<void> => {
    return new Promise((resolve) => {
      const checkAdSense = () => {
        if ((window as any).adsbygoogle) {
          resolve();
        } else {
          setTimeout(checkAdSense, 100);
        }
      };
      checkAdSense();
    });
  };

  const loadAd = (config: AdConfig) => {
    if (!containerRef.current) return;

    // Clear existing content
    containerRef.current.innerHTML = '';

    // Create ad element
    const adElement = document.createElement('ins');
    adElement.className = 'adsbygoogle';
    adElement.style.display = 'block';
    adElement.style.width = config.width === '100vw' ? '100%' : `${config.width}px`;
    adElement.style.height = config.height === '100vh' ? '100%' : `${config.height}px`;
    adElement.style.margin = '0 auto';
    adElement.style.textAlign = 'center';
    
    // Set data attributes
    adElement.setAttribute('data-ad-client', config.adClient);
    adElement.setAttribute('data-ad-slot', config.slotId);
    adElement.setAttribute('data-ad-format', 'auto');
    adElement.setAttribute('data-full-width-responsive', 'true');
    adElement.setAttribute('data-adtest', 'false');

    containerRef.current.appendChild(adElement);

    try {
      // Request ad
      (window as any).adsbygoogle.push({});
      setIsLoaded(true);
      console.log(`Ad loaded successfully for ${config.name}`);
    } catch (error) {
      console.error('Failed to load ad:', error);
      setIsLoaded(false);
    }
  };

  const handleRefreshAd = () => {
    if (adConfig) {
      loadAd(adConfig);
    }
  };

  const getContainerStyle = () => {
    const baseStyle: React.CSSProperties = {
      margin: '16px 0',
      textAlign: 'center',
      ...style
    };

    switch (position) {
      case 'top':
        return { ...baseStyle, marginBottom: '24px' };
      case 'bottom':
        return { ...baseStyle, marginTop: '24px' };
      case 'sidebar':
        return { 
          ...baseStyle, 
          width: '300px',
          height: '600px',
          margin: '16px auto'
        };
      case 'inline':
        return { ...baseStyle, margin: '24px 0' };
      case 'header':
        return { 
          ...baseStyle, 
          width: '100%',
          height: '90px',
          marginBottom: '16px'
        };
      default:
        return baseStyle;
    }
  };

  if (isAdBlockDetected) {
    return (
      <div 
        className={`ad-blocker-notice ${className}`}
        style={{
          ...getContainerStyle(),
          border: '2px dashed #ccc',
          borderRadius: '8px',
          padding: '16px',
          backgroundColor: '#f8f9fa',
          color: '#6c757d',
          fontSize: '14px'
        }}
      >
        <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
          📺 Ad Content
        </div>
        <div>
          To support our platform and access premium content, please consider disabling your ad blocker for this site.
        </div>
        <div style={{ marginTop: '8px', fontSize: '12px', opacity: 0.7 }}>
          Ads help us provide free access to quality real estate services
        </div>
      </div>
    );
  }

  if (!adConfig) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      data-ad-container={true}
      data-ad-page-type={pageType}
      data-ad-position={position}
      className={`ad-container ${className}`}
      style={getContainerStyle()}
    >
      {!isLoaded && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: adConfig.height === '100vh' ? '100%' : `${adConfig.height}px`,
          width: adConfig.width === '100vw' ? '100%' : `${adConfig.width}px`,
          backgroundColor: '#f8f9fa',
          border: '1px dashed #dee2e6',
          borderRadius: '4px'
        }}>
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '8px' }}>
              Loading ad content...
            </div>
            <div style={{ fontSize: '10px', color: '#adb5bd' }}>
              Sponsored content
            </div>
          </div>
        </div>
      )}
    </div>
  );
}