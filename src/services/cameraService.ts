// Camera service for native photo capture

export interface CameraOptions {
  quality?: number; // 0-1
  maxWidth?: number;
  maxHeight?: number;
  format?: 'jpeg' | 'png' | 'webp';
}

class CameraService {
  private stream: MediaStream | null = null;

  async requestPermissions(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      return false;
    }
  }

  async capturePhoto(options: CameraOptions = {}): Promise<string> {
    const {
      quality = 0.8,
      maxWidth = 1920,
      maxHeight = 1080,
      format = 'jpeg'
    } = options;

    try {
      // Use real camera capture - never use file input (gallery)
      return await this.captureFromCamera(options);
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to capture photo');
    }
  }

  private async captureFromInput(options: CameraOptions): Promise<string> {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'environment';
      input.style.display = 'none';

      input.onchange = async (event) => {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (!file) {
          reject(new Error('No file selected'));
          return;
        }

        try {
          const resizedImage = await this.resizeImage(file, options);
          resolve(resizedImage);
        } catch (error) {
          reject(error);
        } finally {
          input.remove();
        }
      };

      input.oncancel = () => {
        input.remove();
        reject(new Error('Camera capture cancelled'));
      };

      document.body.appendChild(input);
      input.click();
    });
  }

  private async captureFromCamera(options: CameraOptions): Promise<string> {
    const { quality = 0.8, maxWidth = 1920, maxHeight = 1080, format = 'jpeg' } = options;

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: maxWidth },
          height: { ideal: maxHeight }
        }
      });

      const video = document.createElement('video');
      video.srcObject = this.stream;
      video.autoplay = true;
      video.muted = true;
      video.playsInline = true;

      await new Promise((resolve) => {
        video.onloadedmetadata = () => resolve(void 0);
      });

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      ctx.drawImage(video, 0, 0);

      // Stop the stream
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;

      return canvas.toDataURL(`image/${format}`, quality);
    } catch (error) {
      if (this.stream) {
        this.stream.getTracks().forEach(track => track.stop());
        this.stream = null;
      }
      throw error;
    }
  }

  private async resizeImage(file: File, options: CameraOptions): Promise<string> {
    const { quality = 0.8, maxWidth = 1920, maxHeight = 1080, format = 'jpeg' } = options;

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;

        // Calculate new dimensions
        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }

        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL(`image/${format}`, quality);
        resolve(dataUrl);
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }

  private isMobileDevice(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  stopCamera(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
  }
}

export const cameraService = new CameraService();