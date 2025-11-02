import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Camera, Upload, X, Loader2 } from 'lucide-react';
import { useSubmitWork } from '@/hooks/useApi';
import { useTenant } from '@/contexts/TenantContext';

const workEntrySchema = z.object({
  targetQuantity: z.number().min(1, 'Target quantity must be greater than 0'),
  achieved: z.number().min(0, 'Achieved quantity must be 0 or greater'),
  rejected: z.number().min(0, 'Rejected quantity must be 0 or greater'),
  reasonForLessProduction: z.string().optional(),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  photo: z.string().min(1, 'Photo is required'),
});

type WorkEntryFormData = z.infer<typeof workEntrySchema>;

interface WorkEntryFormProps {
  attendanceId: string;
  processId: string;
  productId: string;
  onSuccess?: () => void;
}

export const WorkEntryForm: React.FC<WorkEntryFormProps> = ({
  attendanceId,
  processId,
  productId,
  onSuccess,
}) => {
  const [photo, setPhoto] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isCameraLoading, setIsCameraLoading] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const { factoryId } = useTenant();
  const submitWork = useSubmitWork();
  
  const form = useForm<WorkEntryFormData>({
    resolver: zodResolver(workEntrySchema),
    defaultValues: {
      targetQuantity: 0,
      achieved: 0,
      rejected: 0,
      sizeCode: '',
      reasonForLessProduction: '',
      startTime: new Date().toISOString().slice(0, 16),
      endTime: new Date().toISOString().slice(0, 16),
      photo: '',
    },
  });

  // Ensure video plays when stream is ready
  useEffect(() => {
    if (videoRef.current && streamRef.current && isCapturing) {
      const video = videoRef.current;
      if (video.srcObject && video.paused) {
        video.play().catch((error) => {
          console.error('Error playing video in useEffect:', error);
        });
      }
    }
  }, [isCapturing, isVideoReady]);

  const startCamera = async () => {
    try {
      setCameraError(null);
      setIsCameraLoading(true);
      setIsCapturing(true);
      setIsVideoReady(false);

      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use rear camera on mobile
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });

      streamRef.current = stream;

      // Set stream to video element and wait for it to be ready
      if (videoRef.current) {
        const video = videoRef.current;
        video.srcObject = stream;
        
        // Timeout if video doesn't load within 10 seconds
        const timeoutId = setTimeout(() => {
          if (video && video.readyState < 2) {
            setIsCameraLoading(false);
            setCameraError('Camera took too long to initialize. Please try again.');
          }
        }, 10000);
        
        // Wait for video metadata to load and then play
        const handleLoadedMetadata = async () => {
          try {
            clearTimeout(timeoutId);
            // Explicitly play the video
            await video.play();
            setIsVideoReady(true);
            setIsCameraLoading(false);
          } catch (playError) {
            console.error('Error playing video:', playError);
            clearTimeout(timeoutId);
            setIsCameraLoading(false);
            setCameraError('Failed to start camera preview. Please try again.');
          }
        };

        video.onloadedmetadata = handleLoadedMetadata;
        video.onerror = () => {
          clearTimeout(timeoutId);
          throw new Error('Video element failed to load');
        };
        
        // Also try to play immediately in case metadata is already loaded
        if (video.readyState >= 1) {
          handleLoadedMetadata();
        }
      }
    } catch (error) {
      console.error('Camera access error:', error);
      setCameraError(
        error instanceof Error && error.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow camera access and try again.'
          : error instanceof Error && error.name === 'NotFoundError'
          ? 'No camera found. Please ensure your device has a camera.'
          : 'Failed to access camera. Please ensure your device has a camera and try again.'
      );
      setIsCapturing(false);
      setIsCameraLoading(false);
      setIsVideoReady(false);
      streamRef.current = null;
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) {
      setCameraError('Camera not initialized. Please try again.');
      return;
    }

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw current video frame to canvas
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }

      ctx.drawImage(video, 0, 0);

      // Convert canvas to base64 data URL
      const capturedPhoto = canvas.toDataURL('image/jpeg', 0.8);
      
      setPhoto(capturedPhoto);
      form.setValue('photo', capturedPhoto);

      // Stop camera stream
      stopCamera();
    } catch (error) {
      console.error('Photo capture error:', error);
      setCameraError('Failed to capture photo. Please try again.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
      // Remove event listeners
      videoRef.current.onloadedmetadata = null;
      videoRef.current.onerror = null;
    }

    setIsCapturing(false);
    setIsCameraLoading(false);
    setIsVideoReady(false);
    setCameraError(null);
  };

  const removePhoto = () => {
    setPhoto(null);
    form.setValue('photo', '');
  };

  const handleSubmit = async (data: WorkEntryFormData) => {
    try {
      await submitWork.mutateAsync({
        attendanceId,
        processId,
        productId,
        targetQuantity: data.targetQuantity,
        achieved: data.achieved,
        rejected: data.rejected,
        reasonForLessProduction: data.reasonForLessProduction,
        startTime: data.startTime,
        endTime: data.endTime,
        photo: data.photo,
      });
      
      // Reset form
      form.reset();
      setPhoto(null);
      onSuccess?.();
    } catch (error) {
      // Error submitting work entry
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5 text-primary" />
          Submit Work Entry
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Target Quantity */}
            <FormField
              control={form.control}
              name="targetQuantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target Quantity</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="Enter target quantity" 
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Time Range */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Time</FormLabel>
                    <FormControl>
                      <Input 
                        type="datetime-local" 
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Time</FormLabel>
                    <FormControl>
                      <Input 
                        type="datetime-local" 
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Production Numbers */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="achieved"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Achieved Quantity</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="0" 
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="rejected"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rejected Quantity</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="0" 
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>


            {/* Reason for Less Production */}
            <FormField
              control={form.control}
              name="reasonForLessProduction"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason for Less Production (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Machine breakdown, Late start, etc." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Photo Capture */}
            <div className="space-y-4">
              <FormLabel>Work Photo (Required)</FormLabel>
              
              {!photo && !isCapturing && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={startCamera}
                  className="w-full h-32 border-dashed border-2 flex flex-col gap-2"
                >
                  <Camera className="h-8 w-8 text-muted-foreground" />
                  <span>Tap to capture photo</span>
                  <span className="text-xs text-muted-foreground">Camera only - no gallery access</span>
                </Button>
              )}

              {isCapturing && (
                <div className="space-y-4">
                  {cameraError ? (
                    <div className="p-4 bg-destructive/10 border border-destructive rounded-lg">
                      <p className="text-sm text-destructive">{cameraError}</p>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={stopCamera}
                        className="mt-2 w-full"
                      >
                        Close
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="relative bg-black rounded-lg overflow-hidden">
                        {isCameraLoading && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
                            <div className="flex flex-col items-center gap-2">
                              <Loader2 className="h-8 w-8 animate-spin text-white" />
                              <p className="text-sm text-white">Starting camera...</p>
                            </div>
                          </div>
                        )}
                        <video
                          ref={videoRef}
                          className="w-full aspect-video object-cover"
                          autoPlay
                          playsInline
                          muted
                          style={{ minHeight: '300px' }}
                        />
                        <canvas ref={canvasRef} className="hidden" />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          onClick={capturePhoto}
                          disabled={isCameraLoading || !isVideoReady}
                          className="flex-1"
                        >
                          {isCameraLoading ? (
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
                          onClick={stopCamera}
                          disabled={isCameraLoading}
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {photo && (
                <div className="space-y-4">
                  <div className="relative">
                    <img
                      src={photo}
                      alt="Work photo"
                      className="w-full rounded-lg"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={removePhoto}
                      className="absolute top-2 right-2"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <Button 
              type="submit" 
              className="w-full" 
              disabled={submitWork.isPending || !photo}
              size="lg"
            >
              {submitWork.isPending ? 'Submitting...' : 'Submit Work Entry'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};