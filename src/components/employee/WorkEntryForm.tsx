import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Camera, Upload, X } from 'lucide-react';
import { useSubmitWork } from '@/hooks/useApi';
import { useTenant } from '@/contexts/TenantContext';
import { CameraCapture } from '@/components/CameraCapture';

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

  const handleCameraCapture = (photoDataUrl: string) => {
    setPhoto(photoDataUrl);
    form.setValue('photo', photoDataUrl);
    setIsCapturing(false);
  };

  const handleCameraCancel = () => {
    setIsCapturing(false);
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
                  onClick={() => setIsCapturing(true)}
                  className="w-full h-32 border-dashed border-2 flex flex-col gap-2"
                >
                  <Camera className="h-8 w-8 text-muted-foreground" />
                  <span>Tap to capture photo</span>
                  <span className="text-xs text-muted-foreground">Camera only - no gallery access</span>
                </Button>
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
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCapturing(true)}
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