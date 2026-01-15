import React from 'react';

export interface TouchPoint {
  x: number;
  y: number;
  time: number;
}

export interface SwipeGesture {
  direction: 'left' | 'right' | 'up' | 'down';
  velocity: number;
  distance: number;
}

export interface PinchGesture {
  scale: number;
  centerX: number;
  centerY: number;
}

export class GestureManager {
  private element: HTMLElement;
  private startPoint: TouchPoint | null = null;
  private endPoint: TouchPoint | null = null;
  private lastTouchPoint: TouchPoint | null = null;
  private touches: Touch[] = [];
  private initialPinchDistance: number = 0;
  
  private onSwipe?: (gesture: SwipeGesture) => void;
  private onTap?: (point: TouchPoint) => void;
  private onLongPress?: (point: TouchPoint) => void;
  private onPinch?: (gesture: PinchGesture) => void;
  private onDoubleTap?: (point: TouchPoint) => void;
  
  private longPressTimer: number | null = null;
  private tapCount = 0;
  private lastTapTime = 0;
  private doubleTapDelay = 300;
  private longPressDelay = 500;
  private swipeThreshold = 50;
  private velocityThreshold = 0.3;

  constructor(element: HTMLElement) {
    this.element = element;
    this.attachEventListeners();
  }

  private attachEventListeners() {
    this.element.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    this.element.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    this.element.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
    this.element.addEventListener('touchcancel', this.handleTouchCancel.bind(this), { passive: false });
  }

  private handleTouchStart(event: TouchEvent) {
    event.preventDefault();
    
    this.touches = Array.from(event.touches);
    const touch = event.touches[0];
    
    if (touch) {
      this.startPoint = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now()
      };
      
      this.lastTouchPoint = { ...this.startPoint };
      
      // Handle pinch gesture
      if (event.touches.length === 2) {
        this.initialPinchDistance = this.getDistance(event.touches[0], event.touches[1]);
      }
      
      // Start long press timer
      this.longPressTimer = window.setTimeout(() => {
        if (this.startPoint && this.onLongPress) {
          this.onLongPress(this.startPoint);
        }
      }, this.longPressDelay);
    }
  }

  private handleTouchMove(event: TouchEvent) {
    event.preventDefault();
    
    const touch = event.touches[0];
    if (!touch || !this.startPoint) return;
    
    const currentPoint = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    };
    
    // Cancel long press if moved too much
    const distance = this.getDistanceBetweenPoints(this.startPoint, currentPoint);
    if (distance > 10) {
      this.cancelLongPress();
    }
    
    // Handle pinch gesture
    if (event.touches.length === 2 && this.onPinch) {
      const currentDistance = this.getDistance(event.touches[0], event.touches[1]);
      const scale = currentDistance / this.initialPinchDistance;
      
      const centerX = (event.touches[0].clientX + event.touches[1].clientX) / 2;
      const centerY = (event.touches[0].clientY + event.touches[1].clientY) / 2;
      
      this.onPinch({ scale, centerX, centerY });
    }
    
    this.lastTouchPoint = currentPoint;
  }

  private handleTouchEnd(event: TouchEvent) {
    event.preventDefault();
    
    this.cancelLongPress();
    
    const touch = event.changedTouches[0];
    if (!touch || !this.startPoint) return;
    
    this.endPoint = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    };
    
    const distance = this.getDistanceBetweenPoints(this.startPoint, this.endPoint);
    const duration = this.endPoint.time - this.startPoint.time;
    const velocity = distance / duration;
    
    // Detect swipe
    if (distance > this.swipeThreshold && velocity > this.velocityThreshold) {
      const direction = this.getSwipeDirection();
      if (direction && this.onSwipe) {
        this.onSwipe({
          direction,
          velocity,
          distance
        });
      }
    } else if (distance < 10) {
      // Detect tap
      this.handleTap(this.endPoint);
    }
    
    this.reset();
  }

  private handleTouchCancel(event: TouchEvent) {
    event.preventDefault();
    this.cancelLongPress();
    this.reset();
  }

  private handleTap(point: TouchPoint) {
    const now = Date.now();
    
    // Check for double tap
    if (now - this.lastTapTime < this.doubleTapDelay) {
      this.tapCount++;
      if (this.tapCount === 2 && this.onDoubleTap) {
        this.onDoubleTap(point);
        this.tapCount = 0;
      }
    } else {
      this.tapCount = 1;
      if (this.onTap) {
        this.onTap(point);
      }
    }
    
    this.lastTapTime = now;
  }

  private getSwipeDirection(): SwipeGesture['direction'] | null {
    if (!this.startPoint || !this.endPoint) return null;
    
    const dx = this.endPoint.x - this.startPoint.x;
    const dy = this.endPoint.y - this.startPoint.y;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    
    if (absDx > absDy) {
      return dx > 0 ? 'right' : 'left';
    } else {
      return dy > 0 ? 'down' : 'up';
    }
  }

  private getDistanceBetweenPoints(p1: TouchPoint, p2: TouchPoint): number {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private getDistance(touch1: Touch, touch2: Touch): number {
    const dx = touch2.clientX - touch1.clientX;
    const dy = touch2.clientY - touch1.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private cancelLongPress() {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  private reset() {
    this.startPoint = null;
    this.endPoint = null;
    this.lastTouchPoint = null;
    this.touches = [];
    this.initialPinchDistance = 0;
  }

  // Public methods for setting callbacks
  public onSwipeGesture(callback: (gesture: SwipeGesture) => void) {
    this.onSwipe = callback;
    return this;
  }

  public onTapGesture(callback: (point: TouchPoint) => void) {
    this.onTap = callback;
    return this;
  }

  public onLongPressGesture(callback: (point: TouchPoint) => void) {
    this.onLongPress = callback;
    return this;
  }

  public onPinchGesture(callback: (gesture: PinchGesture) => void) {
    this.onPinch = callback;
    return this;
  }

  public onDoubleTapGesture(callback: (point: TouchPoint) => void) {
    this.onDoubleTap = callback;
    return this;
  }

  public destroy() {
    this.element.removeEventListener('touchstart', this.handleTouchStart.bind(this));
    this.element.removeEventListener('touchmove', this.handleTouchMove.bind(this));
    this.element.removeEventListener('touchend', this.handleTouchEnd.bind(this));
    this.element.removeEventListener('touchcancel', this.handleTouchCancel.bind(this));
    this.cancelLongPress();
    this.reset();
  }
}

// React hook for gestures
export function useGestures(
  elementRef: React.RefObject<HTMLElement>,
  options: {
    onSwipe?: (gesture: SwipeGesture) => void;
    onTap?: (point: TouchPoint) => void;
    onLongPress?: (point: TouchPoint) => void;
    onPinch?: (gesture: PinchGesture) => void;
    onDoubleTap?: (point: TouchPoint) => void;
  }
) {
  React.useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const gestureManager = new GestureManager(element);
    
    if (options.onSwipe) gestureManager.onSwipeGesture(options.onSwipe);
    if (options.onTap) gestureManager.onTapGesture(options.onTap);
    if (options.onLongPress) gestureManager.onLongPressGesture(options.onLongPress);
    if (options.onPinch) gestureManager.onPinchGesture(options.onPinch);
    if (options.onDoubleTap) gestureManager.onDoubleTapGesture(options.onDoubleTap);

    return () => {
      gestureManager.destroy();
    };
  }, [elementRef, options]);
}

// Utility functions for common mobile interactions
export const mobileUtils = {
  // Check if device is mobile
  isMobile(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  },

  // Check if device supports touch
  isTouchDevice(): boolean {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  },

  // Get safe area insets for notched displays
  getSafeAreaInsets() {
    const style = getComputedStyle(document.documentElement);
    return {
      top: parseInt(style.getPropertyValue('--safe-area-inset-top') || '0'),
      right: parseInt(style.getPropertyValue('--safe-area-inset-right') || '0'),
      bottom: parseInt(style.getPropertyValue('--safe-area-inset-bottom') || '0'),
      left: parseInt(style.getPropertyValue('--safe-area-inset-left') || '0')
    };
  },

  // Vibrate device
  vibrate(pattern: number | number[] = 100): boolean {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
      return true;
    }
    return false;
  },

  // Share content using Web Share API
  async shareContent(data: ShareData): Promise<boolean> {
    if ('share' in navigator) {
      try {
        await navigator.share(data);
        return true;
      } catch (error) {
        console.error('Share failed:', error);
        return false;
      }
    }
    return false;
  },

  // Copy to clipboard
  async copyToClipboard(text: string): Promise<boolean> {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        return true;
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        return true;
      }
    } catch (error) {
      console.error('Copy failed:', error);
      return false;
    }
  }
};
