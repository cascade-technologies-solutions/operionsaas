import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, X, Loader2 } from 'lucide-react';

interface CameraCaptureProps {
  onCapture: (photoDataUrl: string) => void;
  onCancel?: () => void;
  className?: string;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({
  onCapture,
  onCancel,
  className = '',
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsReady(false);
    setIsLoading(false);
  }, []);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      setIsLoading(true);
      setIsReady(false);

      // Request camera with mobile-friendly constraints
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Rear camera on mobile
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      streamRef.current = stream;

      if (!videoRef.current) {
        throw new Error('Video element not found');
      }

      const video = videoRef.current;
      video.srcObject = stream;

      // Wait for video metadata
      const handleLoadedMetadata = async () => {
        try {
          // Play video immediately
          await video.play();
          setIsReady(true);
          setIsLoading(false);
        } catch (playError) {
          console.error('Video play error:', playError);
          setIsLoading(false);
          setError('Failed to start camera. Please try again.');
          
          // Retry after short delay
          setTimeout(async () => {
            try {
              if (video && video.readyState >= 2 && video.paused) {
                await video.play();
                setIsReady(true);
                setIsLoading(false);
              }
            } catch (retryError) {
              console.error('Retry failed:', retryError);
              setError('Camera preview failed. Please check permissions.');
            }
          }, 300);
        }
      };

      // If metadata already loaded, play immediately
      if (video.readyState >= 1) {
        await handleLoadedMetadata();
      } else {
        video.onloadedmetadata = handleLoadedMetadata;
      }

      // Handle video errors
      video.onerror = () => {
        setIsLoading(false);
        setError('Camera failed to initialize.');
      };

    } catch (err: any) {
      console.error('Camera access error:', err);
      setIsLoading(false);
      setIsReady(false);
      
      if (err.name === 'NotAllowedError') {
        setError('Camera permission denied. Please allow camera access in browser settings.');
      } else if (err.name === 'NotFoundError') {
        setError('No camera found on this device.');
      } else {
        setError('Failed to access camera. Please try again.');
      }
    }
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !isReady) {
      return;
    }

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }

      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw current video frame to canvas
      ctx.drawImage(video, 0, 0);

      // Convert to base64 JPEG
      const photoDataUrl = canvas.toDataURL('image/jpeg', 0.85);
      
      // Stop camera and call onCapture
      stopCamera();
      onCapture(photoDataUrl);
    } catch (err) {
      console.error('Photo capture error:', err);
      setError('Failed to capture photo. Please try again.');
    }
  }, [isReady, onCapture, stopCamera]);

  // Auto-start camera when component mounts
  useEffect(() => {
    startCamera();
  }, [startCamera]);

  const handleCancel = () => {
    stopCamera();
    onCancel?.();
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {error ? (
        <div className="p-4 bg-destructive/10 border border-destructive rounded-lg space-y-2">
          <p className="text-sm text-destructive">{error}</p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={startCamera}
              size="sm"
              className="flex-1"
            >
              Retry
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              size="sm"
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="relative rounded-lg overflow-hidden bg-black">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-white" />
                  <p className="text-sm text-white">Starting camera...</p>
                </div>
              </div>
            )}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-auto"
              style={{
                display: 'block',
                width: '100%',
                height: 'auto',
                maxHeight: '400px',
                objectFit: 'contain'
              }}
            />
            <canvas ref={canvasRef} className="hidden" />
          </div>
          
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={capturePhoto}
              disabled={isLoading || !isReady}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <Camera className="h-4 w-4 mr-2" />
                  Capture Photo
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isLoading}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

