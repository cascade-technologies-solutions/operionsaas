import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Camera, Loader2, AlertCircle } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { workEntryService, machineService } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { WorkEntry as WorkEntryType, Process, Machine } from '@/types';

// Type for populated WorkEntry from backend
interface PopulatedWorkEntry extends Omit<WorkEntryType, 'processId'> {
  processId: Process;
  machineId?: string;
  machineCode?: string;
}

// Type for backend response
interface WorkEntryResponse {
  data?: WorkEntryType | PopulatedWorkEntry;
  success?: boolean;
  message?: string;
  status?: number;
}

// Type guard function
function isValidWorkEntry(data: unknown): data is WorkEntryType | PopulatedWorkEntry {
  return data !== null && typeof data === 'object' && ('_id' in data || 'id' in data);
}

// Helper function to get work entry ID
function getWorkEntryId(workEntry: WorkEntryType | PopulatedWorkEntry): string {
  return (workEntry as { _id?: string; id: string })._id || workEntry.id;
}

const WorkEntry: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  
  // Add error boundary state
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [achievedQuantity, setAchievedQuantity] = useState('');
  const [rejectedQuantity, setRejectedQuantity] = useState('');
  const [reasonForLessProduction, setReasonForLessProduction] = useState('');
  const [photo, setPhoto] = useState<string>('');
  const [currentWorkEntry, setCurrentWorkEntry] = useState<WorkEntryType | PopulatedWorkEntry | null>(null);
  const [photoError, setPhotoError] = useState('');
  const [machines, setMachines] = useState<Machine[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isCameraLoading, setIsCameraLoading] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    loadCurrentWorkEntry();
    loadMachines();
  }, []);

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

  // Refresh work entry data when component comes into focus
  useEffect(() => {
    const handleFocus = () => {
      loadCurrentWorkEntry();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  // Load machines for machine name lookup
  const loadMachines = async () => {
    try {
      const response = await machineService.getMachines();
      const machinesData = response.data?.machines || response.data || [];
      if (Array.isArray(machinesData)) {
        setMachines(machinesData);
      } else {
        setMachines([]);
      }
    } catch (error) {
      // Failed to load machines
    }
  };


  // Get machine name by ID
  const getMachineNameById = (machineId: string) => {
    if (!machineId) return 'Not selected';
    const machine = machines.find(m => m._id === machineId);
    return machine ? machine.name : 'Unknown Machine';
  };


  // Auto-refresh every 30 seconds to check for new work entries
  useEffect(() => {
    const interval = setInterval(() => {
      if (!currentWorkEntry) {
        loadCurrentWorkEntry();
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [currentWorkEntry]);

  const loadCurrentWorkEntry = async () => {
    try {
      // Loading current work entry
      setInitialLoading(true);
      // Get the current active work entry for the employee
      const response = await workEntryService.getActiveWorkEntry();
      
      // Handle both wrapped and unwrapped responses
      const workEntryData = response.data || response;
      
      if (isValidWorkEntry(workEntryData)) {
        // Found active work entry
        setCurrentWorkEntry(workEntryData);
        toast.success('Active work entry loaded successfully!');
      } else {
        // No active work entry found
        setCurrentWorkEntry(null);
      }
    } catch (error) {
      // Failed to load current work entry
      setError('Failed to load work entry data. Please try again.');
      toast.error('Failed to load work entry data. Please try again.');
    } finally {
      setInitialLoading(false);
    }
  };

  const startCamera = async () => {
    try {
      setPhotoError('');
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
            setPhotoError('Camera took too long to initialize. Please try again.');
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
            setPhotoError('Failed to start camera preview. Please try again.');
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
    } catch (error: any) {
      console.error('Camera access error:', error);
      const errorMessage = 
        error?.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow camera access and try again.'
          : error?.name === 'NotFoundError'
          ? 'No camera found. Please ensure your device has a camera.'
          : 'Failed to access camera. Please ensure your device has a camera and try again.';
      
      setPhotoError(errorMessage);
      setIsCapturing(false);
      setIsCameraLoading(false);
      setIsVideoReady(false);
      streamRef.current = null;
      toast.error(errorMessage);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) {
      setPhotoError('Camera not initialized. Please try again.');
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
      toast.success('Photo captured successfully!');

      // Stop camera stream
      stopCamera();
    } catch (error: any) {
      console.error('Photo capture error:', error);
      const errorMessage = `Failed to capture photo: ${error.message || 'Unknown error'}`;
      setPhotoError(errorMessage);
      toast.error(errorMessage);
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
    setPhotoError('');
  };


  const handleSubmit = async () => {
    if (!currentWorkEntry) {
      toast.error('No active work entry found. Please start work from the dashboard first.');
      return;
    }

    if (!achievedQuantity || !rejectedQuantity) {
      toast.error('Please enter both achieved and rejected quantities');
      return;
    }

    if (!photo) {
      toast.error('Please capture a photo of your work');
      setPhotoError('Photo is required');
      return;
    }

    setLoading(true);
    try {
      const workEntryId = getWorkEntryId(currentWorkEntry);
      // Submitting work entry with ID
      // Current work entry
      
      const updatedWorkEntry = await workEntryService.completeWork(workEntryId, {
        achieved: parseInt(achievedQuantity),
        rejected: parseInt(rejectedQuantity),
        photo: photo,
        reasonForLessProduction: reasonForLessProduction || undefined
      });
      
      toast.success('Work entry submitted successfully!');
      
      // Reset form
      setAchievedQuantity('');
      setRejectedQuantity('');
      setReasonForLessProduction('');
      setPhoto('');
      setCurrentWorkEntry(null);
      stopCamera();
      
      // Navigate back to dashboard to see updated work entries
      toast.success('Work entry submitted successfully! Redirecting to dashboard...');
      setTimeout(() => {
        // Navigating to dashboard after work entry submission
        navigate('/employee/');
      }, 1500);
      
    } catch (error) {
      // Failed to submit work entry
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error('Failed to submit work entry: ' + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Show loading state
  if (initialLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Work Entry</h1>
              <p className="text-muted-foreground">Submit your work completion details</p>
            </div>
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-center h-64">
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span>Loading work entry data...</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  // Show error state
  if (error) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Work Entry</h1>
              <p className="text-muted-foreground">Submit your work completion details</p>
            </div>
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-center h-64 text-center">
                <div className="space-y-4">
                  <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
                  <div>
                    <h3 className="text-lg font-semibold text-red-600">Error Loading Data</h3>
                    <p className="text-muted-foreground">{error}</p>
                    <Button 
                      onClick={() => {
                        setError(null);
                        loadCurrentWorkEntry();
                      }}
                      className="mt-4"
                    >
                      Try Again
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  if (!currentWorkEntry) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Work Entry</h1>
              <p className="text-muted-foreground">Submit your work completion details</p>
            </div>
            <Button 
              onClick={loadCurrentWorkEntry}
              variant="outline"
              size="sm"
              disabled={initialLoading}
            >
              {initialLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Refresh
                </>
              )}
            </Button>
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-center h-64 text-center">
                <div className="space-y-4">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" />
                  <div>
                    <h3 className="text-lg font-semibold">No Active Work</h3>
                    <p className="text-muted-foreground">
                      You need to start work from the dashboard first before you can submit a work entry.
                    </p>
                    <Button 
                      onClick={() => window.location.href = '/employee/'} 
                      className="mt-4"
                      variant="outline"
                    >
                      Go to Dashboard
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Submit Work Entry</h1>
            <p className="text-muted-foreground">Complete your work and submit details</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Work Completion Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Current Work Info */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                              <div>
                  <Label className="text-sm font-medium">Process</Label>
                  <p className="text-sm text-muted-foreground">
                    {(currentWorkEntry.processId as Process)?.name || 'N/A'}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Machine</Label>
                  <p className="text-sm text-muted-foreground">
                    {currentWorkEntry.machineId ? getMachineNameById(currentWorkEntry.machineId) : 'Not selected'}
                  </p>
                </div>
              <div>
                <Label className="text-sm font-medium">Target Quantity</Label>
                <p className="text-sm text-muted-foreground">{currentWorkEntry.targetQuantity}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Start Time</Label>
                <p className="text-sm text-muted-foreground">
                  {new Date(currentWorkEntry.startTime).toLocaleTimeString()}
                </p>
              </div>
            </div>

            {/* Quantity Inputs */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="achieved">Achieved Quantity *</Label>
                <Input
                  id="achieved"
                  type="number"
                  min="0"
                  value={achievedQuantity}
                  onChange={(e) => setAchievedQuantity(e.target.value)}
                  placeholder="Enter achieved quantity"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rejected">Rejected Quantity *</Label>
                <Input
                  id="rejected"
                  type="number"
                  min="0"
                  value={rejectedQuantity}
                  onChange={(e) => setRejectedQuantity(e.target.value)}
                  placeholder="Enter rejected quantity"
                />
              </div>
            </div>

            {/* Reason for Less Production */}
            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Less Production (Optional)</Label>
              <Textarea
                id="reason"
                value={reasonForLessProduction}
                onChange={(e) => setReasonForLessProduction(e.target.value)}
                placeholder="Explain if production was less than target..."
                rows={3}
              />
            </div>

            {/* Photo Capture - Camera Only */}
            <div className="space-y-2">
              <Label>Work Photo *</Label>
              <div className="border-2 border-dashed border-muted-foreground rounded-lg p-6 text-center">
                {photo ? (
                  <div className="space-y-4">
                    <img src={photo} alt="Captured work" className="mx-auto max-w-xs rounded-lg" />
                    <Button 
                      onClick={() => {
                        setPhoto('');
                        stopCamera();
                      }} 
                      variant="outline" 
                      size="sm"
                    >
                      Retake Photo
                    </Button>
                  </div>
                ) : isCapturing ? (
                  <div className="space-y-4">
                    {photoError ? (
                      <div className="p-4 bg-destructive/10 border border-destructive rounded-lg">
                        <p className="text-sm text-destructive">{photoError}</p>
                        <Button
                          onClick={stopCamera}
                          variant="outline"
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
                            onClick={capturePhoto} 
                            disabled={loading || isCameraLoading || !isVideoReady}
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
                            onClick={stopCamera}
                            variant="outline"
                            className="flex-1"
                            disabled={isCameraLoading}
                          >
                            Cancel
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Camera className="h-12 w-12 mx-auto text-muted-foreground" />
                    <div>
                      <Button 
                        onClick={startCamera} 
                        disabled={loading}
                        className="w-full"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Loading...
                          </>
                        ) : (
                          <>
                            <Camera className="h-4 w-4 mr-2" />
                            Start Camera
                          </>
                        )}
                      </Button>
                      <p className="text-sm text-muted-foreground mt-2">
                        {photoError && <span className="text-red-500 block">{photoError}</span>}
                        {!photoError && "Camera capture only - no gallery access"}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <Button 
              onClick={handleSubmit} 
              disabled={loading || !achievedQuantity || !rejectedQuantity || !photo}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Work Entry'
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default WorkEntry;