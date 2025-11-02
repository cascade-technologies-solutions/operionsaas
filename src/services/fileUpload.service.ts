// File Upload Service with compression and validation
import { apiClient } from './api/client';
import { errorService } from './errorHandling.service';

interface UploadOptions {
  maxSize?: number; // in bytes
  allowedTypes?: string[];
  compress?: boolean;
  quality?: number; // 0-1 for image compression
  maxWidth?: number;
  maxHeight?: number;
}

interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

interface UploadResult {
  url: string;
  publicId?: string;
  size: number;
  type: string;
  name: string;
}

class FileUploadService {
  private defaultOptions: UploadOptions = {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    compress: true,
    quality: 0.8,
    maxWidth: 1920,
    maxHeight: 1080,
  };

  async uploadFile(
    file: File,
    endpoint: string,
    options: UploadOptions = {},
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> {
    try {
      const opts = { ...this.defaultOptions, ...options };
      
      // Validate file
      this.validateFile(file, opts);
      
      // Compress if needed
      let processedFile = file;
      if (opts.compress && file.type.startsWith('image/')) {
        processedFile = await this.compressImage(file, opts);
      }
      
      // Create form data
      const formData = new FormData();
      formData.append('file', processedFile);
      
      // Upload with progress tracking
      return await this.uploadWithProgress(endpoint, formData, onProgress);
    } catch (error) {
      throw errorService.handleError(error, {
        context: 'FileUpload',
        showToast: true,
      });
    }
  }

  async uploadMultiple(
    files: File[],
    endpoint: string,
    options: UploadOptions = {},
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult[]> {
    try {
      const opts = { ...this.defaultOptions, ...options };
      const formData = new FormData();
      
      // Process and add all files
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        this.validateFile(file, opts);
        
        let processedFile = file;
        if (opts.compress && file.type.startsWith('image/')) {
          processedFile = await this.compressImage(file, opts);
        }
        
        formData.append('files', processedFile);
      }
      
      // Upload all files
      return await this.uploadWithProgress(endpoint, formData, onProgress);
    } catch (error) {
      throw errorService.handleError(error, {
        context: 'MultipleFileUpload',
        showToast: true,
      });
    }
  }

  async uploadBase64(
    base64Data: string,
    filename: string,
    endpoint: string,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    try {
      // Convert base64 to blob
      const blob = this.base64ToBlob(base64Data);
      const file = new File([blob], filename, { type: blob.type });
      
      return this.uploadFile(file, endpoint, options);
    } catch (error) {
      throw errorService.handleError(error, {
        context: 'Base64Upload',
        showToast: true,
      });
    }
  }

  private validateFile(file: File, options: UploadOptions) {
    // Check file size
    if (options.maxSize && file.size > options.maxSize) {
      throw new Error(`File size exceeds maximum of ${this.formatBytes(options.maxSize)}`);
    }
    
    // Check file type
    if (options.allowedTypes && !options.allowedTypes.includes(file.type)) {
      throw new Error(`File type ${file.type} is not allowed`);
    }
  }

  private async compressImage(file: File, options: UploadOptions): Promise<File> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const img = new Image();
        
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }
          
          // Calculate new dimensions
          let { width, height } = img;
          const maxWidth = options.maxWidth || 1920;
          const maxHeight = options.maxHeight || 1080;
          
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width *= ratio;
            height *= ratio;
          }
          
          canvas.width = width;
          canvas.height = height;
          
          // Draw and compress
          ctx.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name, {
                  type: file.type,
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              } else {
                reject(new Error('Failed to compress image'));
              }
            },
            file.type,
            options.quality || 0.8
          );
        };
        
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target?.result as string;
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }

  private async uploadWithProgress(
    endpoint: string,
    formData: FormData,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      // Track progress
      if (onProgress) {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            onProgress({
              loaded: e.loaded,
              total: e.total,
              percentage: Math.round((e.loaded / e.total) * 100),
            });
          }
        });
      }
      
      // Handle completion
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch (error) {
            reject(new Error('Invalid server response'));
          }
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      });
      
      // Handle errors
      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed'));
      });
      
      xhr.addEventListener('abort', () => {
        reject(new Error('Upload cancelled'));
      });
      
      // Prepare request
      const url = `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}${endpoint}`;
      xhr.open('POST', url);
      
      // Add auth header
      const { token } = useAuthStore.getState();
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }
      
      // Send request
      xhr.send(formData);
    });
  }

  private base64ToBlob(base64: string): Blob {
    const parts = base64.split(',');
    const contentType = parts[0].match(/:(.*?);/)?.[1] || 'application/octet-stream';
    const raw = atob(parts[1]);
    const rawLength = raw.length;
    const uInt8Array = new Uint8Array(rawLength);
    
    for (let i = 0; i < rawLength; ++i) {
      uInt8Array[i] = raw.charCodeAt(i);
    }
    
    return new Blob([uInt8Array], { type: contentType });
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  // Generate thumbnail URL for images
  getThumbnailUrl(url: string, width = 200, height = 200): string {
    // This would be implemented based on your CDN/storage service
    // Example for Cloudinary:
    // return url.replace('/upload/', `/upload/w_${width},h_${height},c_thumb/`);
    return url;
  }
}

export const fileUploadService = new FileUploadService();

import { useAuthStore } from '@/stores/authStore';