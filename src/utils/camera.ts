import React from 'react';

export interface CameraOptions {
  facingMode?: 'user' | 'environment';
  width?: number;
  height?: number;
  quality?: number;
}

export interface CapturedImage {
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
  timestamp: number;
}

export class CameraManager {
  private stream: MediaStream | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private canvasElement: HTMLCanvasElement | null = null;
  private isInitialized = false;

  constructor() {
    this.setupElements();
  }

  private setupElements() {
    // Create hidden video element for camera stream
    this.videoElement = document.createElement('video');
    this.videoElement.style.display = 'none';
    this.videoElement.autoplay = true;
    this.videoElement.playsInline = true;
    document.body.appendChild(this.videoElement);

    // Create hidden canvas element for image capture
    this.canvasElement = document.createElement('canvas');
    this.canvasElement.style.display = 'none';
    document.body.appendChild(this.canvasElement);
  }

  public async initialize(options: CameraOptions = {}): Promise<boolean> {
    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: options.facingMode || 'environment',
          width: { ideal: options.width || 1920 },
          height: { ideal: options.height || 1080 }
        },
        audio: false
      };

      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (this.videoElement) {
        this.videoElement.srcObject = this.stream;
        await this.videoElement.play();
        this.isInitialized = true;
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Camera initialization failed:', error);
      return false;
    }
  }

  public async captureImage(options: { quality?: number } = {}): Promise<CapturedImage | null> {
    if (!this.isInitialized || !this.videoElement || !this.canvasElement) {
      console.error('Camera not initialized');
      return null;
    }

    try {
      const video = this.videoElement;
      const canvas = this.canvasElement;
      const context = canvas.getContext('2d');
      
      if (!context) return null;

      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert to blob
      const quality = options.quality || 0.8;
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/jpeg', quality);
      });

      if (!blob) return null;

      // Create data URL
      const dataUrl = canvas.toDataURL('image/jpeg', quality);

      return {
        blob,
        dataUrl,
        width: canvas.width,
        height: canvas.height,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Image capture failed:', error);
      return null;
    }
  }

  public async switchCamera(): Promise<boolean> {
    const currentFacingMode = this.getCurrentFacingMode();
    const newFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
    
    await this.stop();
    return await this.initialize({ facingMode: newFacingMode });
  }

  private getCurrentFacingMode(): 'user' | 'environment' {
    const track = this.stream?.getVideoTracks()[0];
    const settings = track?.getSettings();
    return (settings?.facingMode as 'user' | 'environment') || 'environment';
  }

  public getStream(): MediaStream | null {
    return this.stream;
  }

  public getVideoElement(): HTMLVideoElement | null {
    return this.videoElement;
  }

  public isReady(): boolean {
    return this.isInitialized;
  }

  public async stop(): Promise<void> {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    
    if (this.videoElement) {
      this.videoElement.srcObject = null;
    }
    
    this.isInitialized = false;
  }

  public destroy(): void {
    this.stop();
    
    if (this.videoElement) {
      document.body.removeChild(this.videoElement);
      this.videoElement = null;
    }
    
    if (this.canvasElement) {
      document.body.removeChild(this.canvasElement);
      this.canvasElement = null;
    }
  }
}

// Camera utility functions
export const cameraUtils = {
  // Check if camera is available
  isCameraAvailable(): boolean {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  },

  // Get available cameras
  async getAvailableCameras(): Promise<MediaDeviceInfo[]> {
    if (!this.isCameraAvailable()) return [];

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter(device => device.kind === 'videoinput');
    } catch (error) {
      console.error('Failed to enumerate cameras:', error);
      return [];
    }
  },

  // Check camera permissions
  async checkCameraPermission(): Promise<PermissionState> {
    if (!navigator.permissions) return 'prompt';

    try {
      const permission = await navigator.permissions.query({ name: 'camera' as PermissionName });
      return permission.state;
    } catch (error) {
      console.error('Failed to check camera permission:', error);
      return 'prompt';
    }
  },

  // Request camera permission
  async requestCameraPermission(): Promise<boolean> {
    if (!this.isCameraAvailable()) return false;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: false 
      });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      console.error('Camera permission denied:', error);
      return false;
    }
  },

  // Pick image from gallery
  async pickImageFromGallery(): Promise<File | null> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'environment';
      
      input.onchange = (event) => {
        const file = (event.target as HTMLInputElement).files?.[0] || null;
        resolve(file);
      };
      
      input.oncancel = () => resolve(null);
      
      input.click();
    });
  },

  // Compress image
  async compressImage(
    file: File, 
    options: { maxWidth?: number; maxHeight?: number; quality?: number } = {}
  ): Promise<File> {
    const { maxWidth = 1920, maxHeight = 1080, quality = 0.8 } = options;

    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;
        
        if (width > maxWidth) {
          height = (maxWidth / width) * height;
          width = maxWidth;
        }
        
        if (height > maxHeight) {
          width = (maxHeight / height) * width;
          height = maxHeight;
        }

        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now()
            });
            resolve(compressedFile);
          } else {
            resolve(file);
          }
        }, 'image/jpeg', quality);
      };

      img.onerror = () => resolve(file);
      img.src = URL.createObjectURL(file);
    });
  },

  // Extract EXIF data from image
  async extractExifData(file: File): Promise<any> {
    try {
      // This is a simplified version - in production, you'd use a library like exif-js
      return {
        fileName: file.name,
        fileSize: file.size,
        lastModified: file.lastModified,
        type: file.type
      };
    } catch (error) {
      console.error('Failed to extract EXIF data:', error);
      return null;
    }
  }
};

// React hook for camera functionality
export function useCamera(options: CameraOptions = {}) {
  const [cameraManager] = React.useState(() => new CameraManager());
  const [isInitialized, setIsInitialized] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    return () => {
      cameraManager.destroy();
    };
  }, [cameraManager]);

  const initialize = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const success = await cameraManager.initialize(options);
      setIsInitialized(success);
      
      if (!success) {
        setError('Failed to initialize camera');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Camera initialization failed');
    } finally {
      setIsLoading(false);
    }
  }, [cameraManager, options]);

  const captureImage = React.useCallback(async (captureOptions?: { quality?: number }) => {
    if (!isInitialized) {
      setError('Camera not initialized');
      return null;
    }

    try {
      return await cameraManager.captureImage(captureOptions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to capture image');
      return null;
    }
  }, [cameraManager, isInitialized]);

  const switchCamera = React.useCallback(async () => {
    if (!isInitialized) {
      setError('Camera not initialized');
      return false;
    }

    try {
      const success = await cameraManager.switchCamera();
      if (!success) {
        setError('Failed to switch camera');
      }
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to switch camera');
      return false;
    }
  }, [cameraManager, isInitialized]);

  const stop = React.useCallback(async () => {
    await cameraManager.stop();
    setIsInitialized(false);
  }, [cameraManager]);

  return {
    cameraManager,
    isInitialized,
    isLoading,
    error,
    initialize,
    captureImage,
    switchCamera,
    stop
  };
}
