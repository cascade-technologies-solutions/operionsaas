import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { useTenant } from '@/contexts/TenantContext';
import { productService, processService, userService, dashboardService, attendanceService, workEntryService } from '@/services/api';
import { toast } from 'sonner';
import type { UserRole } from '@/types';

// Query Keys
export const QUERY_KEYS = {
  products: (factoryId: string) => ['products', factoryId],
  processes: (factoryId: string) => ['processes', factoryId],
  users: (factoryId: string, role?: UserRole) => ['users', factoryId, role],
  dashboard: (factoryId: string) => ['dashboard', factoryId],
  attendance: (employeeId: string) => ['attendance', employeeId],
  workEntries: (filters?: any) => ['workEntries', filters],
  factories: ['factories'],
} as const;

// Products
export const useProducts = () => {
  const { factoryId } = useTenant();
  return useQuery({
    queryKey: QUERY_KEYS.products(factoryId!),
    queryFn: async () => {
      const result = await productService.getProducts(factoryId!);
      return result.products || [];
    },
    enabled: !!factoryId,
  });
};

export const useCreateProduct = () => {
  const queryClient = useQueryClient();
  const { factoryId } = useTenant();
  
  return useMutation({
    mutationFn: (data: any) => productService.createProduct(factoryId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products(factoryId!) });
      toast.success('Product created successfully');
    },
    onError: () => {
      toast.error('Failed to create product');
    },
  });
};

export const useUpdateProduct = () => {
  const queryClient = useQueryClient();
  const { factoryId } = useTenant();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      productService.updateProduct(factoryId!, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products(factoryId!) });
      toast.success('Product updated successfully');
    },
    onError: () => {
      toast.error('Failed to update product');
    },
  });
};

export const useDeleteProduct = () => {
  const queryClient = useQueryClient();
  const { factoryId } = useTenant();
  
  return useMutation({
    mutationFn: (id: string) => productService.deleteProduct(factoryId!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products(factoryId!) });
      toast.success('Product deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete product');
    },
  });
};

// Processes
export const useProcesses = () => {
  const { factoryId } = useTenant();
  
  return useQuery({
    queryKey: QUERY_KEYS.processes(factoryId!),
    queryFn: async () => {
      const result = await processService.getProcesses();
      
      // Handle the actual backend response structure
      if (result.processes && Array.isArray(result.processes)) {
        return result.processes;
      } else if (result.data?.processes && Array.isArray(result.data.processes)) {
        return result.data.processes;
      } else if (Array.isArray(result.data)) {
        return result.data;
      } else if (Array.isArray(result)) {
        return result;
      } else {
              return [];
      }
    },
    enabled: !!factoryId,
    retry: 3,
    retryDelay: 1000,
  });
};

export const useCreateProcess = () => {
  const queryClient = useQueryClient();
  const { factoryId } = useTenant();
  
  return useMutation({
    mutationFn: (data: any) => processService.createProcess(factoryId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.processes(factoryId!) });
      toast.success('Process created successfully');
    },
    onError: () => {
      toast.error('Failed to create process');
    },
  });
};

export const useUpdateProcess = () => {
  const queryClient = useQueryClient();
  const { factoryId } = useTenant();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      processService.updateProcess(factoryId!, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.processes(factoryId!) });
      toast.success('Process updated successfully');
    },
    onError: () => {
      toast.error('Failed to update process');
    },
  });
};

export const useDeleteProcess = () => {
  const queryClient = useQueryClient();
  const { factoryId } = useTenant();
  
  return useMutation({
    mutationFn: (id: string) => processService.deleteProcess(factoryId!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.processes(factoryId!) });
      toast.success('Process deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete process');
    },
  });
};

// Users
export const useUsers = (role?: UserRole) => {
  const { factoryId } = useTenant();
  return useQuery({
    queryKey: QUERY_KEYS.users(factoryId!, role),
    queryFn: async () => {
      const result = await userService.getUsers(factoryId!, role ? { role } : undefined);
      // Handle both response formats: { users: [...] } and { data: { users: [...] } }
      if (result.users) {
        return result.users;
      } else if (result.data?.users) {
        return result.data.users;
      } else if (Array.isArray(result)) {
        return result;
      } else if (Array.isArray(result.data)) {
        return result.data;
      }
      return [];
    },
    enabled: !!factoryId,
  });
};

export const useCreateUser = () => {
  const queryClient = useQueryClient();
  const { factoryId } = useTenant();
  
  return useMutation({
    mutationFn: (data: any) => userService.createUser(factoryId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.users(factoryId!) });
      toast.success('User created successfully');
    },
    onError: () => {
      toast.error('Failed to create user');
    },
  });
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();
  const { factoryId } = useTenant();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      userService.updateUser(factoryId!, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.users(factoryId!) });
      toast.success('User updated successfully');
    },
    onError: () => {
      toast.error('Failed to update user');
    },
  });
};

// Dashboard
export const useDashboard = () => {
  const { factoryId } = useTenant();
  return useQuery({
    queryKey: QUERY_KEYS.dashboard(factoryId!),
    queryFn: () => dashboardService.getStats(factoryId!),
    enabled: !!factoryId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
};

// Attendance
export const useAttendance = () => {
  const { user } = useAuthStore();
  return useQuery({
    queryKey: QUERY_KEYS.attendance(user?.id!),
    queryFn: () => attendanceService.getTodayAttendance(user?.id!),
    enabled: !!user?.id && user.role === 'employee',
  });
};

export const useMarkAttendance = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { factoryId } = useTenant();
  
  return useMutation({
    mutationFn: (data: any) => attendanceService.markAttendance({
      ...data,
      employeeId: user?.id!,
      factoryId: factoryId!,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.attendance(user?.id!) });
      toast.success('Attendance marked successfully');
    },
    onError: () => {
      toast.error('Failed to mark attendance');
    },
  });
};

// Work Entries
export const useWorkEntries = (filters?: any) => {
  const { factoryId } = useTenant();
  return useQuery({
    queryKey: QUERY_KEYS.workEntries(filters),
    queryFn: async () => {
      const result = await workEntryService.getWorkEntries(factoryId!, filters);
      return result.entries || [];
    },
    enabled: !!factoryId,
  });
};

export const useSubmitWork = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { factoryId } = useTenant();
  
  return useMutation({
    mutationFn: (data: any) => workEntryService.submitWork({
      ...data,
      employeeId: user?.id!,
      factoryId: factoryId!,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.workEntries() });
      toast.success('Work entry submitted successfully');
    },
    onError: () => {
      toast.error('Failed to submit work entry');
    },
  });
};
