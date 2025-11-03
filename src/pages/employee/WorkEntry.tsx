import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Camera, Loader2, AlertCircle, X } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { workEntryService, machineService } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { WorkEntry as WorkEntryType, Process, Machine } from '@/types';
import { CameraCapture } from '@/components/CameraCapture';

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
  const [machines, setMachines] = useState<Machine[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);

  useEffect(() => {
    loadCurrentWorkEntry();
    loadMachines();
  }, []);

  const handleCameraCapture = (photoDataUrl: string) => {
    setPhoto(photoDataUrl);
    setIsCapturing(false);
    toast.success('Photo captured successfully!');
  };

  const handleCameraCancel = () => {
    setIsCapturing(false);
  };

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
              {!photo && !isCapturing && (
                <div className="border-2 border-dashed border-muted-foreground rounded-lg p-6 text-center">
                  <Camera className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <Button 
                    onClick={() => setIsCapturing(true)} 
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
                        Capture Photo
                      </>
                    )}
                  </Button>
                  <p className="text-sm text-muted-foreground mt-2">
                    Camera capture only - no gallery access
                  </p>
                </div>
              )}

              {isCapturing && (
                <CameraCapture
                  onCapture={handleCameraCapture}
                  onCancel={handleCameraCancel}
                />
              )}

              {photo && (
                <div className="space-y-4">
                  <div className="relative">
                    <img src={photo} alt="Captured work" className="mx-auto max-w-xs rounded-lg" />
                    <Button 
                      onClick={() => {
                        setPhoto('');
                        setIsCapturing(false);
                      }} 
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button 
                    onClick={() => setIsCapturing(true)} 
                    variant="outline" 
                    size="sm"
                    className="w-full"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Retake Photo
                  </Button>
                </div>
              )}
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