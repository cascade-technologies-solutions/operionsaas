import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Process } from '@/types';
import { useTenant } from '@/contexts/TenantContext';
import { useProducts } from '@/hooks/useApi';

const processSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  machineNumber: z.string().optional(),
  stage: z.number().min(1, 'Stage must be at least 1'),
  targetPerHour: z.number().min(1, 'Target per hour must be at least 1'),
  description: z.string().optional(),
  isActive: z.boolean(),
});

type ProcessFormData = z.infer<typeof processSchema>;

interface ProcessFormProps {
  process: Process | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ProcessFormData & { factoryId: string }) => Promise<void>;
  isLoading: boolean;
}

export const ProcessForm: React.FC<ProcessFormProps> = ({
  process,
  open,
  onOpenChange,
  onSubmit,
  isLoading,
}) => {
  const { factoryId } = useTenant();
  const { data: products } = useProducts();
  
  const form = useForm<ProcessFormData>({
    resolver: zodResolver(processSchema),
    defaultValues: {
      productId: '',
      machineNumber: '',
      stage: 1,
      targetPerHour: 10,
      description: '',
      isActive: true,
    },
  });

  useEffect(() => {
    if (process) {
      form.reset({
        productId: process.productId,
        machineNumber: process.machineNumber || '',
        stage: process.stage,
        targetPerHour: process.targetPerHour,
        description: process.description || '',
        isActive: process.isActive,
      });
    } else {
      form.reset({
        productId: '',
        machineNumber: '',
        stage: 1,
        targetPerHour: 10,
        description: '',
        isActive: true,
      });
    }
  }, [process, form]);

  const handleSubmit = async (data: ProcessFormData) => {
    if (!factoryId) return;
    await onSubmit({ ...data, factoryId });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" aria-describedby="process-form-description">
        <DialogHeader>
          <DialogTitle>
            {process ? 'Edit Process' : 'Create Process'}
          </DialogTitle>
          <DialogDescription id="process-form-description">
            {process ? 'Update the process details below. Process name is auto-generated and cannot be changed.' : 'Fill in the details to create a new process. Process name will be auto-generated based on order.'}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">

            <FormField
              control={form.control}
              name="productId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a product" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {products?.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name} ({product.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="machineNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Machine Number (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., HT-63, FM-59, VMC-13" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="stage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stage</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="1" 
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="targetPerHour"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target/Hour</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="10" 
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter process description (optional)" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Active Status</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      Enable this process for production
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={isLoading}>
                {isLoading ? 'Saving...' : process ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};