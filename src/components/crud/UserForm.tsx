import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, UserRole, Process } from '@/types';
import { useTenant } from '@/contexts/TenantContext';
import { processService } from '@/services/api/process.service';

// Base schema for all users
const baseUserSchema = z.object({
  profile: z.object({
    firstName: z.string().min(2, 'First name must be at least 2 characters'),
    lastName: z.string().min(2, 'Last name must be at least 2 characters'),
    phone: z.string()
      .min(1, 'Phone is required')
      .regex(/^\+?[\d\s-()]+$/, 'Please provide a valid phone number')
      .refine((value) => {
        const cleanPhone = value.replace(/\D/g, '');
        return cleanPhone.length >= 5;
      }, 'Phone number must have at least 5 digits'),
  }),
  isActive: z.boolean(),
  assignedProcesses: z.array(z.string()).optional(),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
});

// Extended schema for admin users (with email)
const adminUserSchema = baseUserSchema.extend({
  email: z.string().email('Please enter a valid email'),
});

type BaseUserFormData = z.infer<typeof baseUserSchema>;
type AdminUserFormData = z.infer<typeof adminUserSchema>;
type UserFormData = BaseUserFormData | AdminUserFormData;

interface UserFormProps {
  initialData?: User | null;
  onSubmit: (data: Partial<User>) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
  defaultRole?: UserRole;
  restrictRoleToEmployee?: boolean; // For supervisors who can only create employees
}

export const UserForm: React.FC<UserFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  isLoading,
  defaultRole = 'employee',
  restrictRoleToEmployee = false
}) => {
  const { factoryId } = useTenant();
  const [selectedRole, setSelectedRole] = useState<UserRole>(initialData?.role || defaultRole);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [selectedProcesses, setSelectedProcesses] = useState<string[]>([]);
  const [loadingProcesses, setLoadingProcesses] = useState(false);
  
  const isAdminRole = selectedRole === 'factory_admin' || selectedRole === 'super_admin';
  const userSchema = isAdminRole ? adminUserSchema : baseUserSchema;

  const form = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      profile: {
        firstName: initialData?.profile.firstName || '',
        lastName: initialData?.profile.lastName || '',
        phone: initialData?.profile.phone || '',
      },
      isActive: initialData?.isActive ?? true,
      assignedProcesses: initialData?.assignedProcesses || [],
      password: '', // Add password field
      ...(isAdminRole ? { email: initialData?.email || '' } : {}),
    } as UserFormData,
  });

  // Load processes when component mounts or when editing an employee
  useEffect(() => {
    if (selectedRole === 'employee' || (initialData && initialData.role === 'employee')) {
      loadProcesses();
    }
  }, [selectedRole, initialData]);

  // Set selected processes when initial data changes
  useEffect(() => {
    if (initialData?.assignedProcesses) {
      const processIds = initialData.assignedProcesses.map(process => 
        typeof process === 'string' ? process : (process as any)._id || (process as any).id
      );
      setSelectedProcesses(processIds);
    } else {
      setSelectedProcesses([]);
    }
  }, [initialData]);

  const loadProcesses = async () => {
    setLoadingProcesses(true);
    try {
      const response = await processService.getProcesses();
      const processesArray = (response as any).processes || (response as any).data?.processes || (response as any).data || [];
      setProcesses(processesArray);
    } catch (error) {
      console.error('Failed to load processes:', error);
    } finally {
      setLoadingProcesses(false);
    }
  };

  useEffect(() => {
    if (initialData) {
      const formData = {
        profile: {
          firstName: initialData.profile?.firstName || '',
          lastName: initialData.profile?.lastName || '',
          phone: initialData.profile?.phone || '',
        },
        isActive: initialData.isActive ?? true,
        assignedProcesses: initialData.assignedProcesses || [],
        ...(isAdminRole ? { email: initialData.email || '' } : {}),
      } as UserFormData;
      
      form.reset(formData);
    } else {
      const defaultData = {
        profile: {
          firstName: '',
          lastName: '',
          phone: '',
        },
        isActive: true,
        assignedProcesses: [],
        ...(isAdminRole ? { email: '' } : {}),
      } as UserFormData;
      form.reset(defaultData);
    }
  }, [initialData, form, isAdminRole]);

  const handleSubmit = async (data: UserFormData) => {
    if (!factoryId) return;
    
    // Prepare the submission data
    const submissionData: any = {
      ...data, 
      role: selectedRole,
      factoryId,
      id: initialData?.id || initialData?._id || '',
      assignedProcesses: selectedProcesses,
      profile: {
        firstName: data.profile.firstName,
        lastName: data.profile.lastName,
        phone: data.profile.phone,
        avatar: initialData?.profile.avatar,
      },
      createdAt: initialData?.createdAt || new Date(),
      updatedAt: new Date(),
    };

    // Only include password if it's provided and not empty
    if (data.password && data.password.trim().length > 0) {
      submissionData.password = data.password;
    }


    await onSubmit(submissionData);
  };


  return (
    <div className="space-y-4">
      <div className="space-y-4">
        <h3 className="text-lg font-medium">
          {initialData ? 'Edit User' : 'Create User'}
        </h3>
      </div>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Role Selection - Only show if creating new user and not restricted */}
            {!initialData && !restrictRoleToEmployee && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Role</label>
                <Select
                  value={selectedRole}
                  onValueChange={(value: UserRole) => {
                    setSelectedRole(value);
                    // Reset form when role changes
                    const currentValues = form.getValues();
                    form.reset({
                      profile: {
                        firstName: currentValues.profile.firstName,
                        lastName: currentValues.profile.lastName,
                        phone: currentValues.profile.phone,
                      },
                      isActive: currentValues.isActive,
                      password: currentValues.password,
                      ...(value === 'factory_admin' || value === 'super_admin' ? {
                        email: '',
                      } : {}),
                    } as UserFormData);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">Employee</SelectItem>
                    <SelectItem value="supervisor">Supervisor</SelectItem>
                    <SelectItem value="factory_admin">Factory Admin</SelectItem>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="profile.firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter first name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="profile.lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter last name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Email field - Only show for factory_admin and super_admin */}
            {isAdminRole && (
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input 
                        type="email" 
                        placeholder="Enter email address" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="profile.phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter phone number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Password field - Only show when creating new user */}
            {!initialData && (
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="Enter password (min 6 characters)" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Process Assignment - Only show for employees and not when restricted */}
            {(selectedRole === 'employee' || (initialData && initialData.role === 'employee')) && !restrictRoleToEmployee && (
              <FormField
                control={form.control}
                name="assignedProcesses"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assigned Process</FormLabel>
                    <FormControl>
                      <Select
                        value={selectedProcesses[0] || ''}
                        onValueChange={(value) => {
                          const newProcesses = value ? [value] : [];
                          setSelectedProcesses(newProcesses);
                          field.onChange(newProcesses);
                        }}
                        disabled={loadingProcesses}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={loadingProcesses ? "Loading processes..." : "Select a process"} />
                        </SelectTrigger>
                        <SelectContent>
                          {processes.map((process) => (
                            <SelectItem key={process._id || process.id} value={process._id || process.id}>
                              {process.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                    <div className="text-sm text-muted-foreground">
                      {initialData ? 'Change the employee\'s assigned process' : 'Assign a process to this employee'}
                    </div>
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Active Status</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      Enable this user account
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

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                className="flex-1"
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={isLoading}>
                {isLoading ? 'Saving...' : initialData ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </Form>
    </div>
  );
};