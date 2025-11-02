
export interface CameraOptions {
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
  facingMode?: 'user' | 'environment';
  format?: 'jpeg' | 'png' | 'webp';
}

export interface CameraCaptureResult {
  success: boolean;
  data?: string; // base64 image data
  error?: string;
  metadata?: {
    width: number;
    height: number;
    size: number; // in bytes
    format: string;
  };
}

class CameraService {
  private stream: MediaStream | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private canvasElement: HTMLCanvasElement | null = null;

  /**
   * Check if camera is available on the device
   */
  async isCameraAvailable(): Promise<boolean> {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return false;
      }
      
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      return videoDevices.length > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get available camera devices
   */
  async getAvailableCameras(): Promise<MediaDeviceInfo[]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter(device => device.kind === 'videoinput');
    } catch (error) {
      return [];
    }
  }

  /**
   * Initialize camera stream
   */
  async initializeCamera(options: CameraOptions = {}): Promise<boolean> {
    try {
      const {
        facingMode = 'environment',
        maxWidth = 1920,
        maxHeight = 1080
      } = options;

      // Stop any existing stream
      await this.stopCamera();

      // Request camera access
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: maxWidth },
          height: { ideal: maxHeight },
          aspectRatio: { ideal: 16 / 9 }
        }
      });

      // Create video element
      this.videoElement = document.createElement('video');
      this.videoElement.srcObject = this.stream;
      this.videoElement.autoplay = true;
      this.videoElement.muted = true;
      this.videoElement.playsInline = true;

      // Create canvas element
      this.canvasElement = document.createElement('canvas');

      // Wait for video to be ready
      await new Promise<void>((resolve, reject) => {
        if (!this.videoElement) {
          reject(new Error('Video element not created'));
          return;
        }

        this.videoElement.onloadedmetadata = () => {
          if (this.videoElement && this.canvasElement) {
            this.canvasElement.width = this.videoElement.videoWidth;
            this.canvasElement.height = this.videoElement.videoHeight;
            resolve();
          }
        };

        this.videoElement.onerror = () => {
          reject(new Error('Video element failed to load'));
        };

        // Timeout after 10 seconds
        setTimeout(() => reject(new Error('Camera initialization timeout')), 10000);
      });

      return true;
    } catch (error) {
      await this.stopCamera();
      return false;
    }
  }

  /**
   * Capture photo from camera
   */
  async capturePhoto(options: CameraOptions = {}): Promise<CameraCaptureResult> {
    try {
      const {
        quality = 0.8,
        format = 'jpeg',
        maxWidth = 1920,
        maxHeight = 1080
      } = options;

      // Check if camera is initialized
      if (!this.videoElement || !this.canvasElement) {
        return {
          success: false,
          error: 'Camera not initialized. Call initializeCamera() first.'
        };
      }

      const video = this.videoElement;
      const canvas = this.canvasElement;

      // Ensure canvas dimensions match video (may have changed)
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw current video frame to canvas
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return {
          success: false,
          error: 'Failed to get canvas context'
        };
      }

      ctx.drawImage(video, 0, 0);

      // Calculate dimensions if resizing needed
      let finalWidth = canvas.width;
      let finalHeight = canvas.height;

      if (finalWidth > maxWidth || finalHeight > maxHeight) {
        const ratio = Math.min(maxWidth / finalWidth, maxHeight / finalHeight);
        finalWidth = Math.round(finalWidth * ratio);
        finalHeight = Math.round(finalHeight * ratio);

        // Create a new canvas with resized dimensions
        const resizedCanvas = document.createElement('canvas');
        resizedCanvas.width = finalWidth;
        resizedCanvas.height = finalHeight;
        const resizedCtx = resizedCanvas.getContext('2d');
        
        if (resizedCtx) {
          resizedCtx.drawImage(canvas, 0, 0, finalWidth, finalHeight);
          const dataUrl = resizedCanvas.toDataURL(`image/${format}`, quality);
          const size = Math.round((dataUrl.length * 3) / 4);
          
          return {
            success: true,
            data: dataUrl,
            metadata: {
              width: finalWidth,
              height: finalHeight,
              size,
              format: `image/${format}`
            }
          };
        }
      }

      // Convert canvas to base64 data URL
      const dataUrl = canvas.toDataURL(`image/${format}`, quality);
      const size = Math.round((dataUrl.length * 3) / 4);

      return {
        success: true,
        data: dataUrl,
        metadata: {
          width: finalWidth,
          height: finalHeight,
          size,
          format: `image/${format}`
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Stop camera stream and cleanup
   */
  async stopCamera(): Promise<void> {
    try {
      if (this.stream) {
        this.stream.getTracks().forEach(track => track.stop());
        this.stream = null;
      }

      if (this.videoElement) {
        this.videoElement.srcObject = null;
        this.videoElement = null;
      }

      this.canvasElement = null;
    } catch (error) {
      // Error stopping camera
    }
  }

  /**
   * Get current camera status
   */
  getCameraStatus(): {
    isInitialized: boolean;
    isStreaming: boolean;
    hasVideoElement: boolean;
  } {
    return {
      isInitialized: !!(this.stream && this.videoElement && this.canvasElement),
      isStreaming: !!(this.stream && this.videoElement && !this.videoElement.paused),
      hasVideoElement: !!this.videoElement
    };
  }

  /**
   * Compress image data to reduce size
   */
  async compressImage(
    dataUrl: string,
    maxWidth: number = 1920,
    maxHeight: number = 1080,
    quality: number = 0.8
  ): Promise<string> {
    return new Promise((resolve, reject) => {
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
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }

        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = dataUrl;
    });
  }
}

export const cameraService = new CameraService();
