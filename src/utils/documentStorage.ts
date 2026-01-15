export interface DocumentFile {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  uploadedAt: Date;
  uploadedBy: string;
  metadata?: Record<string, any>;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface StorageConfig {
  provider: 'aws' | 'cloudinary' | 'local';
  bucket?: string;
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  cloudName?: string;
  uploadPreset?: string;
}

export class DocumentStorage {
  private config: StorageConfig;
  private isConfigured = false;

  constructor(config: StorageConfig) {
    this.config = config;
    this.validateConfig();
  }

  private validateConfig() {
    if (this.config.provider === 'aws') {
      this.isConfigured = !!(this.config.bucket && this.config.region && 
        this.config.accessKeyId && this.config.secretAccessKey);
    } else if (this.config.provider === 'cloudinary') {
      this.isConfigured = !!(this.config.cloudName && this.config.uploadPreset);
    } else {
      this.isConfigured = true; // Local storage always works
    }
  }

  public async uploadFile(
    file: File, 
    folder: string = 'documents',
    onProgress?: (progress: UploadProgress) => void
  ): Promise<DocumentFile> {
    if (!this.isConfigured) {
      throw new Error('Storage not properly configured');
    }

    switch (this.config.provider) {
      case 'aws':
        return this.uploadToAWS(file, folder, onProgress);
      case 'cloudinary':
        return this.uploadToCloudinary(file, folder, onProgress);
      default:
        return this.uploadToLocal(file, folder, onProgress);
    }
  }

  private async uploadToAWS(
    file: File, 
    folder: string, 
    onProgress?: (progress: UploadProgress) => void
  ): Promise<DocumentFile> {
    // This would use AWS SDK in production
    // For now, simulate upload with progress
    const documentFile: DocumentFile = {
      id: this.generateId(),
      name: file.name,
      type: file.type,
      size: file.size,
      url: `https://${this.config.bucket}.s3.${this.config.region}.amazonaws.com/${folder}/${file.name}`,
      uploadedAt: new Date(),
      uploadedBy: 'current-user',
      metadata: {
        folder,
        originalName: file.name
      }
    };

    // Simulate upload progress
    if (onProgress) {
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 20;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
        }
        onProgress({
          loaded: Math.round((progress / 100) * file.size),
          total: file.size,
          percentage: Math.round(progress)
        });
      }, 200);
    }

    // Simulate upload delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    return documentFile;
  }

  private async uploadToCloudinary(
    file: File, 
    folder: string, 
    onProgress?: (progress: UploadProgress) => void
  ): Promise<DocumentFile> {
    // This would use Cloudinary SDK in production
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', this.config.uploadPreset!);
    formData.append('folder', folder);

    // Simulate upload progress
    if (onProgress) {
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 25;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
        }
        onProgress({
          loaded: Math.round((progress / 100) * file.size),
          total: file.size,
          percentage: Math.round(progress)
        });
      }, 150);
    }

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));

    const documentFile: DocumentFile = {
      id: this.generateId(),
      name: file.name,
      type: file.type,
      size: file.size,
      url: `https://res.cloudinary.com/${this.config.cloudName}/image/upload/${folder}/${file.name}`,
      uploadedAt: new Date(),
      uploadedBy: 'current-user',
      metadata: {
        folder,
        originalName: file.name
      }
    };

    return documentFile;
  }

  private async uploadToLocal(
    file: File, 
    folder: string, 
    onProgress?: (progress: UploadProgress) => void
  ): Promise<DocumentFile> {
    // For local development, create object URL
    const documentFile: DocumentFile = {
      id: this.generateId(),
      name: file.name,
      type: file.type,
      size: file.size,
      url: URL.createObjectURL(file),
      uploadedAt: new Date(),
      uploadedBy: 'current-user',
      metadata: {
        folder,
        originalName: file.name,
        isLocal: true
      }
    };

    // Simulate upload progress
    if (onProgress) {
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 30;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
        }
        onProgress({
          loaded: Math.round((progress / 100) * file.size),
          total: file.size,
          percentage: Math.round(progress)
        });
      }, 100);
    }

    // Simulate upload delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    return documentFile;
  }

  public async deleteFile(fileId: string): Promise<boolean> {
    try {
      // In production, this would call the respective storage API
      console.log(`Deleting file: ${fileId}`);
      return true;
    } catch (error) {
      console.error('Failed to delete file:', error);
      return false;
    }
  }

  public async downloadFile(file: DocumentFile): Promise<void> {
    try {
      if (file.metadata?.isLocal) {
        // Handle local file download
        const a = document.createElement('a');
        a.href = file.url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        // Handle remote file download
        const response = await fetch(file.url);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Failed to download file:', error);
      throw error;
    }
  }

  public async getFilePreview(file: DocumentFile): Promise<string> {
    try {
      if (this.isImageFile(file.type)) {
        return file.url;
      } else if (this.isPdfFile(file.type)) {
        // For PDFs, return thumbnail or viewer URL
        return file.url;
      } else {
        // For other files, return icon or placeholder
        return this.getFileIcon(file.type);
      }
    } catch (error) {
      console.error('Failed to get file preview:', error);
      return '/placeholder-document.png';
    }
  }

  private isImageFile(type: string): boolean {
    return type.startsWith('image/');
  }

  private isPdfFile(type: string): boolean {
    return type === 'application/pdf';
  }

  private getFileIcon(type: string): string {
    const iconMap: Record<string, string> = {
      'application/pdf': '/icons/pdf.png',
      'application/msword': '/icons/word.png',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '/icons/word.png',
      'application/vnd.ms-excel': '/icons/excel.png',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '/icons/excel.png',
      'text/plain': '/icons/text.png',
      'application/zip': '/icons/zip.png',
      'application/x-rar-compressed': '/icons/zip.png'
    };

    return iconMap[type] || '/icons/file.png';
  }

  public formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  public validateFile(file: File, allowedTypes?: string[], maxSize?: number): {
    isValid: boolean;
    error?: string;
  } {
    // Check file type
    if (allowedTypes && allowedTypes.length > 0) {
      const isAllowed = allowedTypes.some(type => 
        file.type === type || file.type.startsWith(type)
      );
      if (!isAllowed) {
        return {
          isValid: false,
          error: `File type ${file.type} is not allowed`
        };
      }
    }

    // Check file size
    if (maxSize && file.size > maxSize) {
      return {
        isValid: false,
        error: `File size exceeds maximum allowed size of ${this.formatFileSize(maxSize)}`
      };
    }

    return { isValid: true };
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  public async generateThumbnail(file: File): Promise<string> {
    return new Promise((resolve) => {
      if (this.isImageFile(file.type)) {
        const reader = new FileReader();
        reader.onload = (e) => {
          resolve(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        resolve(this.getFileIcon(file.type));
      }
    });
  }
}

// Default configurations
export const storageConfigs = {
  aws: {
    provider: 'aws' as const,
    bucket: process.env.VITE_AWS_BUCKET || '',
    region: process.env.VITE_AWS_REGION || 'us-east-1',
    accessKeyId: process.env.VITE_AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.VITE_AWS_SECRET_ACCESS_KEY || ''
  },
  cloudinary: {
    provider: 'cloudinary' as const,
    cloudName: process.env.VITE_CLOUDINARY_CLOUD_NAME || '',
    uploadPreset: process.env.VITE_CLOUDINARY_UPLOAD_PRESET || ''
  },
  local: {
    provider: 'local' as const
  }
};

// Create default storage instance
export const documentStorage = new DocumentStorage(
  process.env.VITE_STORAGE_PROVIDER === 'aws' ? storageConfigs.aws :
  process.env.VITE_STORAGE_PROVIDER === 'cloudinary' ? storageConfigs.cloudinary :
  storageConfigs.local
);
