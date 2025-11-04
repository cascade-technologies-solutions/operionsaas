import { useEffect, useState, useMemo, useCallback } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { attendanceService, workEntryService, processService, machineService, factoryService, productService } from '@/services/api';

import { Attendance, Process, Machine, WorkEntry, Product } from '@/types';

interface Shift {
  name: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
}
import { 
  Clock, 
  Target, 
  TrendingUp, 
  Camera,
  Loader2,
  CheckCircle,
  AlertCircle,
  Play,
  Square,
  Settings,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';
import { useNavigate } from 'react-router-dom';
import { formatDate, formatTime, formatHours, calculateHours } from '@/utils/dateUtils';
import { PWAInstallPrompt } from '@/components/PWAInstallPrompt';
import { CameraCapture } from '@/components/CameraCapture';

export default function EmployeeDashboard() {
  const { user, updateUser, refreshUser, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const [attendance, setAttendance] = useState<Attendance | null>(null);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [selectedMachine, setSelectedMachine] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedShift, setSelectedShift] = useState('');
  const [selectedProcess, setSelectedProcess] = useState('');
  const [achievedQuantity, setAchievedQuantity] = useState('');
  const [rejectedQuantity, setRejectedQuantity] = useState('');
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allWorkEntries, setAllWorkEntries] = useState<WorkEntry[]>([]);
  const [refreshingAfterWorkEntry, setRefreshingAfterWorkEntry] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [hasRefreshedUser, setHasRefreshedUser] = useState(false);
  const [processQuantityStatus, setProcessQuantityStatus] = useState<any>(null);

  // localStorage helper functions
  const saveSelectionToStorage = (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.warn('Failed to save selection to localStorage:', error);
    }
  };

  const getSelectionFromStorage = (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.warn('Failed to get selection from localStorage:', error);
      return null;
    }
  };

  const clearSelectionStorage = () => {
    try {
      localStorage.removeItem('employee_selected_product');
      localStorage.removeItem('employee_selected_process');
      localStorage.removeItem('employee_selected_machine');
      localStorage.removeItem('employee_selected_shift');
    } catch (error) {
      console.warn('Failed to clear selection storage:', error);
    }
  };

  // Save selections to localStorage whenever they change
  useEffect(() => {
    if (selectedProduct) {
      saveSelectionToStorage('employee_selected_product', selectedProduct);
    }
  }, [selectedProduct]);

  useEffect(() => {
    if (selectedProcess) {
      saveSelectionToStorage('employee_selected_process', selectedProcess);
    }
  }, [selectedProcess]);

  useEffect(() => {
    if (selectedMachine) {
      saveSelectionToStorage('employee_selected_machine', selectedMachine);
    }
  }, [selectedMachine]);

  useEffect(() => {
    if (selectedShift) {
      saveSelectionToStorage('employee_selected_shift', selectedShift);
    }
  }, [selectedShift]);

  // Filter processes based on selected product
  const filteredProcesses = useMemo(() => {
    if (!selectedProduct || !products.length || !processes.length) return [];
    
    // Filter out null/undefined products
    const validProducts = products.filter(p => p && p._id);
    const product = validProducts.find(p => String(p._id) === String(selectedProduct));
    if (!product || !product.processes || !Array.isArray(product.processes)) return [];
    
    // Filter out null/undefined process items from product.processes
    const validProductProcesses = product.processes.filter(p => p != null);
    
    // Get only processes that belong to this product
    // Handle both string and ObjectId comparisons for processId
    const productProcessIds = validProductProcesses.map(p => {
      if (!p) return null; // Additional safety check
      const pid = p.processId;
      if (!pid) return null;
      return typeof pid === 'string' ? pid : String(pid);
    }).filter((id): id is string => id !== null);
    
    // Filter out null/undefined processes before filtering
    const validProcesses = processes.filter(proc => proc != null && proc._id);
    
    const filtered = validProcesses.filter(proc => {
      if (!proc || !proc._id) return false;
      const procIdStr = typeof proc._id === 'string' ? proc._id : String(proc._id);
      return productProcessIds.includes(procIdStr);
    });
    
    return filtered;
  }, [selectedProduct, products, processes]);

  // Clear process selection when product changes
  useEffect(() => {
    if (selectedProduct) {
      setSelectedProcess('');
      setProcessQuantityStatus(null);
    }
  }, [selectedProduct]);

  // Restore selections from localStorage when data is loaded
  useEffect(() => {
    if (products.length > 0 && processes.length > 0 && machines.length > 0 && shifts.length > 0) {
      // Restore product selection - ensure string comparison
      const savedProduct = getSelectionFromStorage('employee_selected_product');
      if (savedProduct && products.find(p => String(p._id) === String(savedProduct))) {
        setSelectedProduct(String(savedProduct));
      }

      // Restore machine selection - ensure string comparison
      const savedMachine = getSelectionFromStorage('employee_selected_machine');
      if (savedMachine && machines.find(m => String(m._id) === String(savedMachine))) {
        setSelectedMachine(String(savedMachine));
      }

      // Restore shift selection
      const savedShift = getSelectionFromStorage('employee_selected_shift');
      if (savedShift && shifts.find(s => s.name === savedShift)) {
        setSelectedShift(savedShift);
      }

      // Process selection will be restored after product is set
    }
  }, [products, processes, machines, shifts]);

  // Restore process selection after product is restored
  useEffect(() => {
    if (selectedProduct && processes.length > 0) {
      const savedProcess = getSelectionFromStorage('employee_selected_process');
      if (savedProcess) {
        // Check if the saved process is valid for the selected product - ensure string comparison
        const product = products.find(p => String(p._id) === String(selectedProduct));
        if (product && product.processes && Array.isArray(product.processes)) {
          // Filter out null/undefined items before mapping and convert to strings
          const productProcessIds = product.processes
            .filter(p => p != null)
            .map(p => String(p.processId))
            .filter(id => id != null && id !== 'undefined');
          if (productProcessIds.includes(String(savedProcess))) {
            setSelectedProcess(String(savedProcess));
          }
        }
      }
    }
  }, [selectedProduct, processes, products]);

  // Reset selectedProcess if it doesn't exist in filteredProcesses
  useEffect(() => {
    if (selectedProcess && filteredProcesses.length > 0) {
      const processExists = filteredProcesses.some(p => String(p._id) === String(selectedProcess));
      if (!processExists) {
        setSelectedProcess('');
        setProcessQuantityStatus(null);
      }
    }
  }, [selectedProcess, filteredProcesses]);

  // Reset selectedProduct if it doesn't exist in products list
  useEffect(() => {
    if (selectedProduct && products.length > 0) {
      const productExists = products.some(p => String(p._id) === String(selectedProduct));
      if (!productExists) {
        setSelectedProduct('');
        setSelectedProcess('');
        setProcessQuantityStatus(null);
      }
    }
  }, [selectedProduct, products]);

  // Reset selectedMachine if it doesn't exist in machines list
  useEffect(() => {
    if (selectedMachine && machines.length > 0) {
      const machineExists = machines.some(m => String(m._id) === String(selectedMachine));
      if (!machineExists) {
        setSelectedMachine('');
      }
    }
  }, [selectedMachine, machines]);

  // Location tracking removed for now - will be implemented later


  // Set initializing to false after authentication is complete
  useEffect(() => {
    if (isAuthenticated !== undefined) {
      const timer = setTimeout(() => {
        setInitializing(false);
      }, 1000); // Give auth initialization time to complete
      
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated]);

  // Define loadDashboardData function first
  const loadDashboardData = useCallback(async () => {
    if (!user) {
      return;
    }

    setLoading(true);
    try {
      // Load processes for the factory - employees can work on any process
      const processesResponse = await processService.getProcesses();
      const allProcesses = 'data' in processesResponse ? processesResponse.data : processesResponse;
      // ROOT FIX: Filter out null/undefined processes at source
      const processesArray = Array.isArray(allProcesses) 
        ? allProcesses.filter(p => p != null && p._id != null) 
        : [];
      
      if (processesArray.length > 0) {
        setProcesses(processesArray);
        
        // Load machines
        const machinesResponse = await machineService.getMachines();
        const allMachines = 'data' in machinesResponse ? machinesResponse.data : machinesResponse;
        // ROOT FIX: Filter out null/undefined machines at source
        const machinesArray = Array.isArray(allMachines) 
          ? allMachines.filter(m => m != null && m._id != null) 
          : [];
        setMachines(machinesArray);
        
        // Load products
        const productsResponse = await productService.getProducts();
        const allProducts = 'data' in productsResponse ? productsResponse.data : productsResponse;
        // ROOT FIX: Filter out null/undefined products at source
        const productsArray = Array.isArray(allProducts) 
          ? allProducts.filter(p => p != null && p._id != null) 
          : [];
        setProducts(productsArray);
        
        // Set default selections only if no saved selections exist
        // The restoration logic will be handled by the useEffect hooks
        if (productsArray.length > 0 && !getSelectionFromStorage('employee_selected_product')) {
          const firstProductId = productsArray[0]?._id;
          if (firstProductId) {
            setSelectedProduct(typeof firstProductId === 'string' ? firstProductId : String(firstProductId));
          }
        }
        
        if (processesArray.length > 0 && !getSelectionFromStorage('employee_selected_process')) {
          const firstProcessId = processesArray[0]?._id;
          if (firstProcessId) {
            setSelectedProcess(typeof firstProcessId === 'string' ? firstProcessId : String(firstProcessId));
          }
        }
        
        if (machinesArray.length > 0 && !getSelectionFromStorage('employee_selected_machine')) {
          const firstMachineId = machinesArray[0]?._id;
          if (firstMachineId) {
            setSelectedMachine(typeof firstMachineId === 'string' ? firstMachineId : String(firstMachineId));
          }
        }
        
        // Load shifts from factory settings
        try {
          const shiftsResponse = await factoryService.getShifts();
          
          // Try multiple possible data structures
          const shiftsData = shiftsResponse.data?.shifts || shiftsResponse.data || [];
          
          const activeShifts = Array.isArray(shiftsData) ? shiftsData.filter((shift: any) => shift.isActive !== false) : [];
          
          if (activeShifts.length > 0) {
            setShifts(activeShifts);
            
            // Set default shift only if no saved selection exists
            if (!getSelectionFromStorage('employee_selected_shift')) {
              setSelectedShift(activeShifts[0].name);
            }
          } else {
            // If no shifts are configured, use default shifts
            const defaultShifts = [
              { name: 'Morning', startTime: '08:00 AM', endTime: '04:00 PM', isActive: true },
              { name: 'Evening', startTime: '04:00 PM', endTime: '12:00 AM', isActive: true },
              { name: 'Night', startTime: '12:00 AM', endTime: '08:00 AM', isActive: true }
            ];
            setShifts(defaultShifts);
            
            // Set default shift only if no saved selection exists
            if (!getSelectionFromStorage('employee_selected_shift')) {
              setSelectedShift('Morning');
            }
          }
        } catch (error: unknown) {
          console.error('❌ Failed to load shifts in employee dashboard:', error);
          console.error('❌ Error response:', (error as any)?.response);
          
          // Set default shifts if factory data fails to load
          const defaultShifts = [
            { name: 'Morning', startTime: '08:00 AM', endTime: '04:00 PM', isActive: true },
            { name: 'Evening', startTime: '04:00 PM', endTime: '12:00 AM', isActive: true },
            { name: 'Night', startTime: '12:00 AM', endTime: '08:00 AM', isActive: true }
          ];
          setShifts(defaultShifts);
          setSelectedShift('Morning');
        }
        
        // Load today's attendance data for summary display
        try {
          // Use _id (ObjectId) consistently - it matches what the backend expects
          const userId = user._id || user.id;
          if (userId) {
            const attendanceResponse = await attendanceService.getTodayAttendance(userId.toString());
            const attendanceData = attendanceResponse.data;
            if (attendanceData && typeof attendanceData === 'object' && '_id' in attendanceData) {
              setAttendance(attendanceData);
            } else {
              setAttendance(null);
            }
          }
        } catch (error: unknown) {
          // Failed to load attendance - this is okay if employee hasn't checked in yet
          console.debug('No attendance record found for today (this is normal if not checked in)');
          setAttendance(null);
        }
        
        // Load work entries
        try {
          const userId = user.id || user._id;
          if (!userId) {
            console.error('User ID not available for loading work entries');
            setAllWorkEntries([]);
          } else {
            // Use _id (ObjectId) consistently for API calls
            const userIdForWorkEntries = user._id || user.id;
            const workResponse = await workEntryService.getWorkEntriesByEmployee(userIdForWorkEntries?.toString() || userId, { today: 'true' });
            console.debug('Work entries response:', workResponse);
            
            // Handle different response structures
            let workEntriesArray: WorkEntry[] = [];
            
            if ('data' in workResponse) {
              const responseData = workResponse.data;
              if (Array.isArray(responseData)) {
                workEntriesArray = responseData;
              } else if (responseData && typeof responseData === 'object') {
                // Backend returns { workEntries: [...], pagination: {...} } or nested data
                const dataObj = responseData as any;
                if ('workEntries' in dataObj && Array.isArray(dataObj.workEntries)) {
                  workEntriesArray = dataObj.workEntries;
                } else if ('data' in dataObj) {
                  // Nested data structure
                  const nestedData = dataObj.data;
                  if (Array.isArray(nestedData?.workEntries)) {
                    workEntriesArray = nestedData.workEntries;
                  } else if (Array.isArray(nestedData)) {
                    workEntriesArray = nestedData;
                  }
                }
              }
            } else if (Array.isArray(workResponse)) {
              workEntriesArray = workResponse;
            } else if (workResponse && typeof workResponse === 'object') {
              const responseObj = workResponse as any;
              if ('workEntries' in responseObj && Array.isArray(responseObj.workEntries)) {
                workEntriesArray = responseObj.workEntries;
              }
            }
            
            console.debug(`Loaded ${workEntriesArray.length} work entries for today`);
            setAllWorkEntries(workEntriesArray);
          }
        } catch (error) {
          // Failed to load work entries
          console.error('Failed to load work entries:', error);
          setAllWorkEntries([]);
        }
        
        // Check for active work entry
        try {
          const activeResponse = await workEntryService.getActiveWorkEntry();
          const activeWorkEntry = activeResponse.data;
          // Active work entry check removed
        } catch (error) {
          // No active work entry (normal)
        }
        
        // Default target quantity removed
      } else {
        // No processes available
        setError('No processes available. Please contact your supervisor.');
      }
    } catch (error) {
      // Failed to load dashboard data
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Main effect to handle user data
  useEffect(() => {
    if (!user) return;
    loadDashboardData();
  }, [user, loadDashboardData]);

  // Load quantity status when process is selected
  useEffect(() => {
    if (selectedProcess) {
      loadProcessQuantityStatus(selectedProcess);
    } else {
      setProcessQuantityStatus(null);
    }
  }, [selectedProcess]);

  // Reset quantities when selections change
  useEffect(() => {
    setAchievedQuantity('');
    setRejectedQuantity('');
  }, [selectedProduct, selectedProcess, selectedMachine]);

  // All products are shown - no filtering based on process
  // Products are filtered by factory at the backend level


  // Connect to WebSocket for real-time updates

  // Refresh data when component comes into focus
  useEffect(() => {
    const handleFocus = () => {
      if (user?.role === 'employee') {
        setRefreshingAfterWorkEntry(true);
        loadDashboardData().finally(() => {
          setRefreshingAfterWorkEntry(false);
        });
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [user]);


  // Helper function to get shift name
  const getShiftName = (shiftName: string) => {
    const shift = shifts.find(s => s.name === shiftName);
    if (shift) {
      // Format times to 12-hour format for display
      const formatTimeTo12Hour = (time24: string): string => {
        if (!time24) return '';
        if (time24.includes('AM') || time24.includes('PM')) {
          return time24; // Already in 12-hour format
        }
        const [hours, minutes] = time24.split(':');
        const hour24 = parseInt(hours, 10);
        const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
        const ampm = hour24 >= 12 ? 'PM' : 'AM';
        return `${hour12}:${minutes} ${ampm}`;
      };
      
      return `${shift.name} (${formatTimeTo12Hour(shift.startTime)} - ${formatTimeTo12Hour(shift.endTime)})`;
    }
    return shiftName;
  };

  // Helper function to get product name by ID
  const getProductNameById = (productId: string) => {
    const product = products.find(p => p._id === productId);
    return product?.name || 'Unknown Product';
  };

  // Helper function to get process name by ID
  const getProcessNameById = (processId: string) => {
    const process = processes.find(p => p._id === processId);
    return process?.name || 'Unknown Process';
  };

  // Helper function to get machine name by ID
  const getMachineNameById = (machineId: string) => {
    if (!machineId) return 'Not selected';
    
    const machine = machines.find(m => m._id === machineId);
    if (!machine) {
      // Machine not found for ID
      // Available machines debug info removed
      return 'Unknown Machine';
    }
    return machine.name || 'Unknown Machine';
  };

  const getCurrentShift = () => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 14) return 'morning';
    if (hour >= 14 && hour < 22) return 'evening';
    return 'night';
  };

  // Load all work entries for today
  const loadAllWorkEntries = async () => {
    try {
      const userId = user?.id || user?._id;
      if (!userId) return;

      const response = await workEntryService.getWorkEntriesByEmployee(userId);
      
      const workEntriesData = response.data || response;
      if (Array.isArray(workEntriesData)) {
        setAllWorkEntries(workEntriesData);
      } else {
        setAllWorkEntries([]);
      }
    } catch (error) {
      // Failed to load work entries
      setAllWorkEntries([]);
    }
  };

  // Load quantity status for selected process
  const loadProcessQuantityStatus = async (processId: string) => {
    try {
      // Always call backend to get accurate ProcessStage data
      const response = await processService.getQuantityStatus(processId, selectedProduct);
      setProcessQuantityStatus(response.data || response);
    } catch (error) {
      console.error('Failed to load quantity status:', error);
      // Set safe default instead of null to prevent UI issues
      setProcessQuantityStatus({
        availableQuantity: 0,
        isLocked: false,
        dailyTarget: 0,
        totalAchieved: 0,
        totalRejected: 0
      });
    }
  };

  // Calculate total work hours - prioritize attendance.workHours from backend, then work entries, then check-in/check-out times
  const calculateTotalWorkHours = useMemo(() => {
    // First, check if attendance has workHours calculated by backend (after check-out)
    if (attendance?.workHours !== undefined && attendance.workHours !== null) {
      return Math.round(Number(attendance.workHours) * 100) / 100;
    }
    
    // Second, calculate from work entries
    let totalHours = 0;
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
    
    allWorkEntries.forEach(entry => {
      // Use startTime if available, otherwise fallback to createdAt
      const entryDate = entry.startTime 
        ? new Date(entry.startTime) 
        : (entry.createdAt ? new Date(entry.createdAt) : null);
      
      // Only count entries from today
      if (entryDate && entryDate >= todayStart && entryDate <= todayEnd) {
        if (entry.startTime && entry.endTime) {
          const startTime = new Date(entry.startTime);
          const endTime = entry.endTime ? new Date(entry.endTime) : new Date();
          const duration = endTime.getTime() - startTime.getTime();
          const hours = duration / (1000 * 60 * 60);
          totalHours += hours;
        }
      }
    });

    // If we have work hours from entries, use that
    if (totalHours > 0) {
      return Math.round(totalHours * 100) / 100;
    }
    
    // Third, fallback to calculating from check-in/check-out times if available
    if (attendance?.checkIn?.time && attendance?.checkOut?.time) {
      const checkInTime = new Date(attendance.checkIn.time);
      const checkOutTime = new Date(attendance.checkOut.time);
      const duration = checkOutTime.getTime() - checkInTime.getTime();
      const hours = duration / (1000 * 60 * 60);
      return Math.round(hours * 100) / 100;
    }
    
    // If check-in exists but no check-out yet, calculate from check-in to now
    if (attendance?.checkIn?.time && !attendance?.checkOut?.time) {
      const checkInTime = new Date(attendance.checkIn.time);
      const now = new Date();
      const duration = now.getTime() - checkInTime.getTime();
      const hours = duration / (1000 * 60 * 60);
      return Math.round(hours * 100) / 100;
    }

    return 0;
  }, [attendance, allWorkEntries]);

  // Calculate total achieved and rejected quantities for the day
  const calculateTotalProduction = useMemo(() => {
    let totalAchieved = 0;
    let totalRejected = 0;
    
    // Filter to today's entries only
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
    
    allWorkEntries.forEach(entry => {
      // Use startTime if available, otherwise fallback to createdAt
      const entryDate = entry.startTime 
        ? new Date(entry.startTime) 
        : (entry.createdAt ? new Date(entry.createdAt) : null);
      
      // Only count entries from today
      if (entryDate && entryDate >= todayStart && entryDate <= todayEnd) {
        if (entry.achieved) {
          totalAchieved += entry.achieved;
        }
        if (entry.rejected) {
          totalRejected += entry.rejected;
        }
      }
    });

    return {
      achieved: totalAchieved,
      rejected: totalRejected,
      total: totalAchieved + totalRejected
    };
  }, [allWorkEntries]);

  // Get unique machines from today's work entries
  const getTodayWorkSummary = useMemo(() => {
    // Use consistent date filtering with backend - match startTime (preferred) or createdAt
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
    
    // Filter entries by startTime (preferred) or createdAt (fallback) to match backend logic
    const todayEntries = allWorkEntries.filter(entry => {
      // Use startTime if available, otherwise fallback to createdAt
      const entryDate = entry.startTime 
        ? new Date(entry.startTime) 
        : (entry.createdAt ? new Date(entry.createdAt) : null);
      
      if (!entryDate) return false;
      
      // Compare dates (ignore time for day comparison)
      return entryDate >= todayStart && entryDate <= todayEnd;
    });

    const uniqueMachines = new Set<string>();
    const uniqueProducts = new Set<string>();
    const machineStats: { machine: string; achieved: number; rejected: number; entries: number }[] = [];

    // Helper function to get machine name from machine ID
    const getMachineName = (machineId: string) => {
      if (!machineId) return 'Unknown Machine';
      const machine = machines.find(m => m._id === machineId);
      return machine ? machine.name : `Unknown Machine (ID: ${machineId})`;
    };

    // Helper function to get product name from product ID
    const getProductName = (productId: string) => {
      if (!productId) return 'Unknown Product';
      const product = products.find(p => p._id === productId);
      return product ? product.name : 'Unknown Product';
    };

    // Helper function to get process name from process ID
    const getProcessName = (processId: string) => {
      if (!processId) return 'Unknown Process';
      const process = processes.find(p => p._id === processId);
      return process ? process.name : 'Unknown Process';
    };

    // Group by process and product for process breakdown
    const processGroups = new Map<string, any>();
    
    // ROOT FIX: Safe ID extraction helper to prevent null._id errors
    const getSafeId = (item: any): string | null => {
      if (!item) return null;
      if (typeof item === 'string') return item;
      // Handle populated MongoDB documents
      if (item && typeof item === 'object' && item._id) {
        return typeof item._id === 'string' ? item._id : String(item._id);
      }
      return null;
    };
    
    todayEntries.forEach(entry => {
      // ROOT FIX: Safely extract IDs with null checks
      const machineId = getSafeId(entry.machineId);
      const productId = getSafeId(entry.productId);
      const processId = getSafeId(entry.processId);
      
      const machineName = machineId ? getMachineName(machineId) : 'Unknown';
      const productName = productId ? getProductName(productId) : 'Unknown';
      const processName = processId ? getProcessName(processId) : 'Unknown';
      
      if (machineId) uniqueMachines.add(machineName);
      if (productId) uniqueProducts.add(productName);
      
      // Group by machine
      const existing = machineStats.find(stat => stat.machine === machineName);
      
      if (existing) {
        existing.achieved += entry.achieved || 0;
        existing.rejected += entry.rejected || 0;
        existing.entries += 1;
      } else {
        machineStats.push({
          machine: machineName,
          achieved: entry.achieved || 0,
          rejected: entry.rejected || 0,
          entries: 1
        });
      }

      // Group by process and product - skip if IDs are null
      if (processId && productId) {
        const processKey = `${processId}-${productId}`;
        if (!processGroups.has(processKey)) {
          processGroups.set(processKey, {
            processId: processId,
            processName: processName,
            productId: productId,
            productName: productName,
            achieved: 0,
            rejected: 0,
            entries: 0
          });
        }
        
        const group = processGroups.get(processKey);
        if (group) {
          group.achieved += entry.achieved || 0;
          group.rejected += entry.rejected || 0;
          group.entries += 1;
        }
      }
    });

    return {
      uniqueMachines: Array.from(uniqueMachines),
      uniqueProducts: Array.from(uniqueProducts),
      machineStats,
      processSummary: Array.from(processGroups.values()),
      totalEntries: todayEntries.length
    };
  }, [allWorkEntries, machines, products, processes]);

  // Get active work entry (not completed)
  const getActiveWorkEntry = () => {
    return allWorkEntries.find(entry => 
      entry.validationStatus === 'pending' && 
      (!entry.endTime || new Date(entry.endTime) > new Date())
    ) || null;
  };

  // Get completed work entries
  const getCompletedWorkEntries = () => {
    return allWorkEntries.filter(entry => 
      entry.endTime && new Date(entry.endTime) <= new Date()
    );
  };

  // Handle completing work - removed (using direct production submission now)

  const handleCheckIn = async () => {
    let checkInData: any = null;
    
    try {
      setLoading(true);
      
      // Get current location
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        });
      });

      const location = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      };

      // Ensure user ID is available
      const userId = user?._id || user?.id;
      if (!userId) {
        toast.error('User ID not found. Please log in again.');
        return;
      }

      // Validate all required fields
      if (!selectedProcess) {
        toast.error('Please select a process before checking in');
        return;
      }

      if (!selectedShift) {
        toast.error('Please select a shift before checking in');
        return;
      }

      // Validate location coordinates
      if (isNaN(location.latitude) || isNaN(location.longitude)) {
        toast.error('Invalid location coordinates. Please enable location services.');
        return;
      }

      // Normalize shift type - handle case variations
      let normalizedShiftType: 'morning' | 'evening' | 'night' = 'morning';
      const shiftLower = selectedShift.toLowerCase();
      if (shiftLower.includes('morning') || shiftLower === 'morning') {
        normalizedShiftType = 'morning';
      } else if (shiftLower.includes('evening') || shiftLower === 'evening') {
        normalizedShiftType = 'evening';
      } else if (shiftLower.includes('night') || shiftLower === 'night') {
        normalizedShiftType = 'night';
      } else {
        toast.error('Invalid shift type. Please select a valid shift.');
        return;
      }

      // Prepare check-in data with explicit type validation
      // Ensure employeeId is a valid string (MongoDB ObjectId format)
      if (!userId || typeof userId !== 'string' || userId.trim() === '') {
        toast.error('Invalid user ID. Please log in again.');
        setLoading(false);
        return;
      }

      if (!selectedProcess || typeof selectedProcess !== 'string' || selectedProcess.trim() === '') {
        toast.error('Invalid process ID. Please select a process.');
        setLoading(false);
        return;
      }

      checkInData = {
        employeeId: String(userId).trim(),
        processId: String(selectedProcess).trim(),
        location: {
          latitude: Number(location.latitude),
          longitude: Number(location.longitude)
        },
        shiftType: normalizedShiftType,
        target: Number(0)
      };

      // Validate all required fields are present
      if (!checkInData.employeeId || !checkInData.processId || !checkInData.location || 
          isNaN(checkInData.location.latitude) || isNaN(checkInData.location.longitude)) {
        console.error('❌ Invalid check-in data:', checkInData);
        toast.error('Invalid check-in data. Please try again.');
        setLoading(false);
        return;
      }

      console.log('✅ Check-in data validated and being sent:', checkInData);
      console.log('✅ Employee ID type:', typeof checkInData.employeeId, 'Value:', checkInData.employeeId);
      console.log('✅ Process ID type:', typeof checkInData.processId, 'Value:', checkInData.processId);

      const attendanceData = await attendanceService.checkIn(checkInData);
      setAttendance(attendanceData.data);
      
      toast.success('Checked in successfully');
    } catch (error: any) {
      console.error('Check-in error:', error);
      
      // Handle ApiError with preserved response data
      const errorMessage = error?.responseData?.error || 
                          error?.responseData?.message || 
                          error?.message || 
                          'Failed to check in';
      
      const errorDetails = {
        message: errorMessage,
        status: error?.status,
        responseData: error?.responseData,
        requestData: checkInData
      };
      
      console.error('Full error details:', errorDetails);
      
      // Show more specific error message
      if (error?.status === 500) {
        toast.error(`Server error: ${errorMessage}. Please check backend logs or contact support.`);
      } else if (error?.status === 400) {
        toast.error(`Validation error: ${errorMessage}`);
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  // handleCheckOut removed - production submission now acts as checkout

  const handleCameraCapture = (photoDataUrl: string) => {
    setCapturedPhoto(photoDataUrl);
    setIsCameraOpen(false);
    toast.success('Photo captured successfully!');
  };

  const handleCameraCancel = () => {
    setIsCameraOpen(false);
  };

  const handleSubmitProduction = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (loading) return;
    
    // Capture form data immediately to prevent race conditions
    const formData = {
      processId: selectedProcess,
      productId: selectedProduct,
      machineId: selectedMachine,
      shiftType: selectedShift,
      achieved: parseInt(achievedQuantity) || 0,
      rejected: parseInt(rejectedQuantity) || 0,
      photo: capturedPhoto
    };
    
    
    // Validate required fields
    if (!formData.productId || !formData.processId || !formData.machineId || !formData.shiftType) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    if (!formData.achieved || formData.achieved <= 0) {
      toast.error('Please enter a valid achieved quantity');
      return;
    }

    // Validate photo is captured
    if (!formData.photo || formData.photo.trim() === '') {
      toast.error('Please capture a photo before submitting production data');
      return;
    }

    // Check available quantity for non-first stages
    const selectedProductData = products.find(p => p._id === formData.productId);
    const isFirstProcess = selectedProductData?.processes?.find(p => p.processId === formData.processId)?.order === 1;
    
    
    if (!isFirstProcess && processQuantityStatus) {
      // For non-first stages, check if there's enough available quantity to consume
      // We need to check total consumption (achieved + rejected)
      const totalToConsume = formData.achieved + formData.rejected;
      if (processQuantityStatus.availableQuantity < totalToConsume) {
        toast.error(`Insufficient quantity available for consumption. Available: ${processQuantityStatus.availableQuantity}, Required: ${totalToConsume}`);
        return;
      }
      
      // Check if consumption would lock the stage
      const remainingAfterConsumption = processQuantityStatus.availableQuantity - totalToConsume;
      if (remainingAfterConsumption <= 0) {
        toast.warning(`This will consume all available units and lock the stage. Remaining after consumption: ${remainingAfterConsumption}`);
      }
    }

    // Check user role before attempting to submit
    if (!user) {
      toast.error('User not found. Please log in again.');
      return;
    }

    try {
      setLoading(true);

      // Check if this is the first process stage
      const selectedProductData = products.find(p => p._id === formData.productId);
      const isFirstProcess = selectedProductData?.processes?.find(p => p.processId === formData.processId)?.order === 1;
      
      if (isFirstProcess) {
        // Call new direct work entry endpoint for first process stage
        try {
          const directWorkEntryData = {
            processId: formData.processId,
            productId: formData.productId,
            achieved: formData.achieved,
            rejected: formData.rejected,
            photo: formData.photo || 'default_photo_placeholder',
            shiftType: formData.shiftType,
            machineId: formData.machineId,
            location: attendance?.checkIn?.location || undefined
          };
          
          const response = await workEntryService.createDirectWorkEntry(directWorkEntryData);
          
          // Optimistically update state with returned work entry
          const newWorkEntry = (response as any).data?.data || (response as any).data || response;
          if (newWorkEntry && typeof newWorkEntry === 'object' && ('_id' in newWorkEntry || 'id' in newWorkEntry)) {
            setAllWorkEntries(prev => [newWorkEntry, ...prev]);
          }
          
          // Get attendance for check-out - use existing or fetch today's attendance
          let attendanceForCheckout = attendance;
          
          if (!attendanceForCheckout || !attendanceForCheckout._id) {
            // Try to fetch today's attendance if not available
            try {
              const userId = user?._id || user?.id;
              if (userId) {
                const attendanceResponse = await attendanceService.getTodayAttendance(userId.toString());
                attendanceForCheckout = attendanceResponse.data;
              }
            } catch (attendanceError) {
              console.warn('Could not fetch today\'s attendance for check-out', attendanceError);
            }
          }
          
          // Perform checkout if attendance exists and has check-in
          if (attendanceForCheckout && attendanceForCheckout._id && attendanceForCheckout.checkIn?.time) {
            const checkInTime = new Date(attendanceForCheckout.checkIn.time);
            const checkOutTime = new Date();
            const totalHours = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
            
            // Only check-out if not already checked out
            if (!attendanceForCheckout.checkOut?.time) {
              try {
                const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                  navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                  });
                });

                const location = {
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude
                };

                const checkoutResponse = await attendanceService.checkOut(attendanceForCheckout._id, location);
                
                // Update attendance state with the response data which includes workHours
                if (checkoutResponse?.data) {
                  const updatedAttendance = checkoutResponse.data;
                  setAttendance(updatedAttendance);
                  // Use workHours from backend response if available
                  const workHoursFromBackend = (updatedAttendance as any)?.workHours || totalHours;
                  toast.success(`Production submitted and checked out successfully! Work hours: ${workHoursFromBackend.toFixed(2)}h`);
                } else {
                  // Fallback: reload attendance data to get updated workHours
                  try {
                    const userId = user?._id || user?.id;
                    if (userId) {
                      const attendanceResponse = await attendanceService.getTodayAttendance(userId.toString());
                      if (attendanceResponse.data && typeof attendanceResponse.data === 'object' && '_id' in attendanceResponse.data) {
                        setAttendance(attendanceResponse.data);
                      }
                    }
                  } catch (refreshError) {
                    console.warn('Failed to refresh attendance after check-out', refreshError);
                  }
                  toast.success(`Production submitted and checked out successfully! Work hours: ${totalHours.toFixed(2)}h`);
                }
              } catch (checkoutError: any) {
                console.error('Checkout error:', checkoutError);
                const errorMessage = checkoutError?.responseData?.error || checkoutError?.message || 'Unknown error';
                
                // If already checked out, refresh attendance and show success
                if (checkoutError?.status === 409 || errorMessage.includes('already checked out')) {
                  // Try to refresh attendance to get updated workHours
                  try {
                    const userId = user?._id || user?.id;
                    if (userId) {
                      const attendanceResponse = await attendanceService.getTodayAttendance(userId.toString());
                      if (attendanceResponse.data && typeof attendanceResponse.data === 'object' && '_id' in attendanceResponse.data) {
                        setAttendance(attendanceResponse.data);
                      }
                    }
                  } catch (refreshError) {
                    console.warn('Failed to refresh attendance', refreshError);
                  }
                  toast.success(`Production submitted successfully! Work hours: ${totalHours.toFixed(2)}h (Already checked out)`);
                } else {
                  toast.warning(`Production submitted successfully. However, checkout failed: ${errorMessage}`);
                }
              }
            } else {
              // Already checked out, refresh attendance to get workHours
              try {
                const userId = user?._id || user?.id;
                if (userId) {
                  const attendanceResponse = await attendanceService.getTodayAttendance(userId.toString());
                  if (attendanceResponse.data && typeof attendanceResponse.data === 'object' && '_id' in attendanceResponse.data) {
                    setAttendance(attendanceResponse.data);
                  }
                }
              } catch (refreshError) {
                console.warn('Failed to refresh attendance', refreshError);
              }
              toast.success(`Production submitted successfully! Work hours: ${totalHours.toFixed(2)}h`);
            }
          } else {
            // No attendance or no check-in - work entry submitted but can't check-out
            toast.success('Production submitted successfully!');
            if (!attendanceForCheckout) {
              console.warn('No attendance record found for check-out');
            }
          }
          
          // Reset form and reload data for full sync
          await loadDashboardData();
          setAchievedQuantity('');
          setRejectedQuantity('');
          setCapturedPhoto(null);
          // Keep Product, Process, Machine, and Shift selections
          
          return;
        } catch (error: any) {
          console.error('Direct work entry error:', error);
          toast.error('Failed to submit production. Please try again.');
          return;
        }
      }
      
      // First start work to create a work entry
      // Get machine data for machineId and machineCode
      const selectedMachineData = machines.find(machine => machine._id === formData.machineId);
      if (!selectedMachineData) {
        toast.error('Selected machine not found');
        setLoading(false);
        return;
      }
      
      const startWorkData = {
        processId: formData.processId,
        productId: formData.productId,
        targetQuantity: formData.achieved + formData.rejected,
        location: attendance?.checkIn?.location || undefined,
        machineId: formData.machineId,
        machineCode: selectedMachineData.name,
        shiftType: formData.shiftType
      };
      
      const startResponse = await workEntryService.startWork(startWorkData);
      
      // Then complete the work with production data
      const workEntryId = startResponse.data?._id || (startResponse as any)._id;
      
      const completeWorkData = {
        achieved: formData.achieved,
        rejected: formData.rejected,
        photo: formData.photo || 'default_photo_placeholder'
      };
      
      const response = await workEntryService.completeWork(workEntryId, completeWorkData);
      
      // Optimistically update state with returned work entry
      const updatedWorkEntry = (response as any).data?.data || (response as any).data || response;
      if (updatedWorkEntry && typeof updatedWorkEntry === 'object' && ('_id' in updatedWorkEntry || 'id' in updatedWorkEntry)) {
        setAllWorkEntries(prev => {
          const existingIndex = prev.findIndex(
            entry => entry._id === updatedWorkEntry._id || entry.id === updatedWorkEntry._id
          );
          
          if (existingIndex >= 0) {
            // Update existing entry
            return prev.map(entry => 
              entry._id === updatedWorkEntry._id || entry.id === updatedWorkEntry._id 
                ? updatedWorkEntry 
                : entry
            );
          } else {
            // Add new entry if it doesn't exist yet
            return [updatedWorkEntry, ...prev];
          }
        });
      }
      
      // Get attendance for check-out - use existing or fetch today's attendance
      let attendanceForCheckout = attendance;
      
      if (!attendanceForCheckout || !attendanceForCheckout._id) {
        // Try to fetch today's attendance if not available
        try {
          const userId = user?._id || user?.id;
          if (userId) {
            const attendanceResponse = await attendanceService.getTodayAttendance(userId.toString());
            attendanceForCheckout = attendanceResponse.data;
          }
        } catch (attendanceError) {
          console.warn('Could not fetch today\'s attendance for check-out', attendanceError);
        }
      }
      
      // Perform checkout if attendance exists and has check-in (only for last stage typically)
      if (attendanceForCheckout && attendanceForCheckout._id && attendanceForCheckout.checkIn?.time) {
        const checkInTime = new Date(attendanceForCheckout.checkIn.time);
        const checkOutTime = new Date();
        const totalHours = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
        
        // Only check-out if not already checked out
        if (!attendanceForCheckout.checkOut?.time && attendanceForCheckout._id) {
          try {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
              });
            });

            const location = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            };

            const checkoutResponse = await attendanceService.checkOut(attendanceForCheckout._id, location);
            
            // Update attendance state with the response data which includes workHours
            if (checkoutResponse?.data) {
              const updatedAttendance = checkoutResponse.data;
              setAttendance(updatedAttendance);
              // Use workHours from backend response if available
              const workHoursFromBackend = (updatedAttendance as any)?.workHours || totalHours;
              toast.success(`Production submitted and checked out successfully! Work hours: ${workHoursFromBackend.toFixed(2)}h`);
            } else {
              // Fallback: reload attendance data to get updated workHours
              try {
                const userId = user?._id || user?.id;
                if (userId) {
                  const attendanceResponse = await attendanceService.getTodayAttendance(userId.toString());
                  if (attendanceResponse.data && typeof attendanceResponse.data === 'object' && '_id' in attendanceResponse.data) {
                    setAttendance(attendanceResponse.data);
                  }
                }
              } catch (refreshError) {
                console.warn('Failed to refresh attendance after check-out', refreshError);
              }
              toast.success(`Production submitted and checked out successfully! Work hours: ${totalHours.toFixed(2)}h`);
            }
          } catch (checkoutError: any) {
            console.error('Checkout error:', checkoutError);
            const errorMessage = checkoutError?.responseData?.error || checkoutError?.message || 'Unknown error';
            
            // If already checked out, refresh attendance and show success
            if (checkoutError?.status === 409 || errorMessage.includes('already checked out')) {
              // Try to refresh attendance to get updated workHours
              try {
                const userId = user?._id || user?.id;
                if (userId) {
                  const attendanceResponse = await attendanceService.getTodayAttendance(userId.toString());
                  if (attendanceResponse.data && typeof attendanceResponse.data === 'object' && '_id' in attendanceResponse.data) {
                    setAttendance(attendanceResponse.data);
                  }
                }
              } catch (refreshError) {
                console.warn('Failed to refresh attendance', refreshError);
              }
              toast.success(`Production submitted successfully! Work hours: ${totalHours.toFixed(2)}h (Already checked out)`);
            } else {
              toast.warning(`Production submitted successfully. However, checkout failed: ${errorMessage}`);
            }
          }
        } else {
          // Already checked out, refresh attendance to get workHours
          try {
            const userId = user?._id || user?.id;
            if (userId) {
              const attendanceResponse = await attendanceService.getTodayAttendance(userId.toString());
              if (attendanceResponse.data && typeof attendanceResponse.data === 'object' && '_id' in attendanceResponse.data) {
                setAttendance(attendanceResponse.data);
              }
            }
          } catch (refreshError) {
            console.warn('Failed to refresh attendance', refreshError);
          }
          toast.success(`Production submitted successfully! Work hours: ${totalHours.toFixed(2)}h`);
        }
      } else {
        // No attendance or no check-in - work entry submitted but can't check-out
        toast.success('Production data submitted successfully');
        if (!attendanceForCheckout) {
          console.warn('No attendance record found for check-out');
        }
      }
      
      // Reset form and reload data
      await loadDashboardData();
      setAchievedQuantity('');
      setRejectedQuantity('');
      setCapturedPhoto(null);
      
    } catch (error: any) {
      console.error('❌ Production submission error:', {
        error: error.message,
        stack: error.stack,
        formData,
        user: user?.id,
        attendance: attendance?._id,
        isFirstProcess: selectedProductData?.processes?.find(p => p.processId === formData.processId)?.order === 1
      });
      toast.error(`Failed to submit production: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleStartWork = async (e?: React.MouseEvent) => {
    // Prevent any default form submission behavior
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (!selectedProduct || !selectedMachine || !selectedShift || !achievedQuantity) {
      toast.error('Please select product, machine, shift, and enter achieved quantity');
      return;
    }

    // Check user role before attempting to start work
    if (!user) {
      toast.error('User not found. Please log in again.');
      return;
    }

    if (user.role !== 'employee' && user.role !== 'supervisor') {
      toast.error(`Access denied. Employee or supervisor role required. Current role: ${user.role}`);
      return;
    }

    setLoading(true);
    try {
      const userId = user?.id || user?._id;
      if (!userId) {
        toast.error('User ID not found. Please log in again.');
        return;
      }

      // Validate selected machine exists
      const selectedMachineData = machines.find(machine => machine._id === selectedMachine);
      
      if (!selectedMachineData) {
        toast.error('Selected machine not found');
        return;
      }

      if (!selectedProcess) {
        toast.error('Please select a process.');
        return;
      }

      // Check quantity status before starting work
      if (processQuantityStatus) {
        if (processQuantityStatus.isLocked) {
          toast.error('This process stage is locked. Please wait for supervisor to unlock it.');
          return;
        }
        if (processQuantityStatus.remainingQuantity <= 0) {
          toast.error('No quantity available for this stage. Please wait for the previous stage to complete.');
          return;
        }
      }

      if (!selectedMachine) {
        toast.error('Please select a machine.');
        return;
      }

      if (!achievedQuantity || parseInt(achievedQuantity) <= 0) {
        toast.error('Please enter a valid achieved quantity.');
        return;
      }

      // Simplified work start - no complex location tracking
      const workEntryData: {
        processId: string;
        productId: string;
        achievedQuantity: number;
        rejectedQuantity: number;
        machineId: string;
        machineCode: string;
        shiftType: string;
      } = {
        processId: selectedProcess,
        productId: selectedProduct, // Use selected product instead of process product
        achievedQuantity: parseInt(achievedQuantity),
        rejectedQuantity: parseInt(rejectedQuantity || '0'),
        machineId: selectedMachine,
        machineCode: selectedMachineData.name,
        shiftType: selectedShift
      };

      try {
        const workEntryResponse = await workEntryService.startWork(workEntryData);
        
        // Show success message
        toast.success('Work started successfully! Attendance marked automatically.');
        
        // Immediately update UI state
        setRefreshingAfterWorkEntry(true);
        
        // Refresh data to get the latest work entry details
        await loadDashboardData();
        
        // Reset refreshing state
        setRefreshingAfterWorkEntry(false);
        
      } catch (workEntryError: any) {
        // Work entry start failed
        console.error('❌ Work entry error:', workEntryError);
        console.error('❌ Error response:', workEntryError.response);
        console.error('❌ Error data:', workEntryError.response?.data);
        
        // Handle specific error types
        if (workEntryError.message?.includes('401') || workEntryError.message?.includes('Unauthorized')) {
          toast.error('Authentication failed. Please log in again.');
        } else if (workEntryError.message?.includes('403') || workEntryError.message?.includes('Forbidden')) {
          toast.error('Access denied. Please contact your supervisor.');
        } else if (workEntryError.message?.includes('Validation failed') || workEntryError.response?.status === 400) {
          // Show validation errors
          const errorMessage = workEntryError.response?.data?.error || workEntryError.message || 'Validation failed';
          console.error('❌ Validation error details:', {
            status: workEntryError.response?.status,
            data: workEntryError.response?.data,
            message: workEntryError.message
          });
          toast.error(`Validation failed: ${errorMessage}`);
          
          if (workEntryError.data?.errors) {
            const errorMessages = workEntryError.data.errors.map((err: any) => err.msg).join(', ');
            toast.error(`Validation details: ${errorMessages}`);
          }
        } else {
          const errorMessage = workEntryError.response?.data?.error || workEntryError.message || 'Failed to start work entry';
          console.error('❌ General error details:', {
            status: workEntryError.response?.status,
            data: workEntryError.response?.data,
            message: workEntryError.message
          });
          toast.error(`Failed to start work: ${errorMessage}`);
        }
      }

    } catch (error: any) {
      // Failed to start work
      // Work start error
      
      // Handle specific error types
      if (error.message?.includes('403') || error.message?.includes('Forbidden')) {
        toast.error('Access denied. Please ensure you have employee role and are properly authenticated.');
      } else if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
        toast.error('Authentication failed. Please log in again.');
      } else if (error.message?.includes('You are not assigned to this process')) {
        toast.error('You are not assigned to this process. Please contact your supervisor.');
      } else if (error.message?.includes('Process does not belong to your factory')) {
        toast.error('Process access denied. Please contact your supervisor.');
      } else {
        toast.error(error.message || 'Failed to start work. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Simplified location handling - removed complex tracking for now
  // Will be implemented later with proper location-based attendance



  // Show loading state while authentication is being initialized
  if (initializing && !user && isAuthenticated === false) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <span className="text-lg">Initializing...</span>
            <p className="text-sm text-muted-foreground mt-2">Please wait while we restore your session</p>
          </div>
        </div>
      </Layout>
    );
  }

  // Show loading state while data is being loaded
  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <span className="text-lg">Loading dashboard...</span>
            <p className="text-sm text-muted-foreground mt-2">Please wait while we load your data</p>
          </div>
        </div>
      </Layout>
    );
  }


  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Employee Dashboard</h1>
            <p className="text-muted-foreground">Welcome back, {user?.profile?.firstName}!</p>
          </div>
          <div className="flex items-center gap-2">
            {refreshingAfterWorkEntry && (
              <div className="flex items-center gap-2 text-blue-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Refreshing...</span>
              </div>
            )}
            <Badge variant={attendance ? "default" : "secondary"}>
              {attendance ? (attendance.status === 'present' ? 'Present' : 
                           attendance.status === 'absent' ? 'Absent' : 
                           attendance.status === 'half-day' ? 'Half Day' : 
                           attendance.status || 'Unknown') : "Not Marked"}
            </Badge>
            {attendance && (
              <Badge variant="outline">
                Check-in: {attendance.checkIn?.time ? 
                  formatTime(attendance.checkIn.time) : 
                  'Time not available'}
              </Badge>
            )}
          </div>
        </div>

        {/* PWA Install Prompt */}
        <PWAInstallPrompt />


        {/* Attendance Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Today's Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            {attendance || getTodayWorkSummary.totalEntries > 0 ? (
              <div className="space-y-3">
                {attendance && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Status:</span>
                      {(() => {
                        return (
                          <Badge 
                            variant={attendance.status === 'present' ? 'default' : 
                                   attendance.status === 'absent' ? 'destructive' : 
                                   attendance.status === 'half-day' ? 'secondary' : 'outline'}
                            className={attendance.status === 'present' ? 'bg-green-100 text-green-800' : 
                                     attendance.status === 'absent' ? 'bg-red-100 text-red-800' : 
                                     attendance.status === 'half-day' ? 'bg-yellow-100 text-yellow-800' : ''}
                          >
                            {attendance.status === 'present' ? 'Present' : 
                             attendance.status === 'absent' ? 'Absent' : 
                             attendance.status === 'half-day' ? 'Half Day' : 
                             attendance.status || 'Unknown'}
                          </Badge>
                        );
                      })()}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Check-in Time:</span>
                      <span className="text-sm text-muted-foreground">
                        {attendance.checkIn?.time ? 
                          new Date(attendance.checkIn.time).toLocaleString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                          }) : 
                          'Time not available'}
                      </span>
                    </div>
                    {attendance.checkOut?.time && (
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Check-out Time:</span>
                        <span className="text-sm text-muted-foreground">
                          {new Date(attendance.checkOut.time).toLocaleString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                          })}
                        </span>
                      </div>
                    )}
                  </>
                )}
                <div className="flex items-center justify-between">
                  <span className="font-medium">Total Work Hours:</span>
                  <span className="text-sm text-muted-foreground">
                    {calculateTotalWorkHours} hours
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium">Work Entries:</span>
                  <span className="text-sm text-muted-foreground">
                    {getTodayWorkSummary.totalEntries} today
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium">Products Used:</span>
                  <span className="text-sm text-muted-foreground">
                    {getTodayWorkSummary.uniqueProducts && getTodayWorkSummary.uniqueProducts.length > 0 ? 
                      getTodayWorkSummary.uniqueProducts.join(', ') : 
                      'None'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium">Machines Used:</span>
                  <span className="text-sm text-muted-foreground">
                    {getTodayWorkSummary.uniqueMachines.length > 0 ? 
                      getTodayWorkSummary.uniqueMachines.join(', ') : 
                      'None'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium">Total Achieved:</span>
                  <span className="text-sm text-green-600 font-medium">
                    {calculateTotalProduction.achieved} units
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium">Total Rejected:</span>
                  <span className="text-sm text-red-600 font-medium">
                    {calculateTotalProduction.rejected} units
                  </span>
                </div>
                
                {/* Product and Machine Breakdown */}
                {getTodayWorkSummary.machineStats && getTodayWorkSummary.machineStats.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="font-medium mb-2">Machine Breakdown:</h4>
                    <div className="space-y-2">
                      {getTodayWorkSummary.machineStats.map((stat, index) => (
                        <div key={index} className="bg-gray-50 p-2 rounded text-sm">
                          <div className="flex justify-between items-center">
                            <span className="font-medium">{stat.machine}</span>
                            <span className="text-xs text-muted-foreground">{stat.entries} entries</span>
                          </div>
                          <div className="flex justify-between text-xs mt-1">
                            <span className="text-green-600">✓ {stat.achieved}</span>
                            <span className="text-red-600">✗ {stat.rejected}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Process Breakdown */}
                {getTodayWorkSummary.processSummary && getTodayWorkSummary.processSummary.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="font-medium mb-2">Process Breakdown:</h4>
                    <div className="space-y-2">
                      {getTodayWorkSummary.processSummary.map((stat, index) => (
                        <div key={index} className="bg-gray-50 p-2 rounded text-sm">
                          <div className="font-medium">{stat.processName}</div>
                          <div className="text-xs text-muted-foreground">{stat.productName}</div>
                          <div className="flex justify-between text-xs mt-1">
                            <span className="text-green-600">Achieved: {stat.achieved}</span>
                            <span className="text-red-600">Rejected: {stat.rejected}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <Clock className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No work started today</p>
                <p className="text-sm text-muted-foreground">Start your first work entry above</p>
              </div>
            )}
          </CardContent>
        </Card>



        {/* Backend Connection Alert - Only show if backend health check fails */}
        {products.length === 0 && machines.length === 0 && !loading && processes.length === 0 && (
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="text-red-800">⚠️ Connection Error</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-red-700">Cannot connect to server. Please ensure the backend server is running.</p>
              <p className="text-sm text-red-600 mt-2">
                Backend API: {import.meta.env.VITE_API_URL || 'Not configured'}
              </p>
            </CardContent>
          </Card>
        )}


        {selectedMachine && !machines.find(m => m._id === selectedMachine) && (
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="text-red-800">⚠️ Machine Not Found</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-red-700">Selected machine ID: {selectedMachine}</p>
              <p className="text-red-700">Available machine IDs: {machines.map(m => typeof m._id === 'string' ? m._id : String(m._id)).join(', ')}</p>
              <p className="text-red-700">Please reselect a machine from the dropdown.</p>
            </CardContent>
          </Card>
        )}



        {/* Attendance Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Attendance
            </CardTitle>
            <CardDescription>
              Mark your attendance using geofence location
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {!attendance ? (
                <div className="text-center py-6">
                  <Button 
                    onClick={handleCheckIn}
                    disabled={loading}
                    className="w-full h-12 text-base"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Checking In...
                      </>
                    ) : (
                      <>
                        <Clock className="h-4 w-4 mr-2" />
                        Check In
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 text-green-800 mb-2">
                      <CheckCircle className="h-4 w-4" />
                      <span className="font-medium">Checked In</span>
                    </div>
                    <div className="text-sm text-green-600">
                      Time: {new Date(attendance.checkIn.time).toLocaleTimeString()}
                    </div>
                    <div className="text-sm text-blue-600 mt-2">
                      💡 Submit production to automatically check out
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Daily Task Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Production Entry
            </CardTitle>
            <CardDescription>
              Enter your achieved and rejected quantities
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="product-select">Select Product</Label>
                    <Select 
                      value={typeof selectedProduct === 'string' ? selectedProduct : (selectedProduct ? String(selectedProduct) : '')} 
                      onValueChange={(value) => setSelectedProduct(value)}
                    >
                      <SelectTrigger id="product-select" className="h-12 sm:h-10">
                        <SelectValue placeholder="Choose product" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.length > 0 ? (
                          products.map((product) => (
                            <SelectItem key={product._id} value={typeof product._id === 'string' ? product._id : String(product._id)}>
                              {product.name} - T-{product.dailyTarget || 0}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-products" disabled>
                            No products available
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="process-select">Select Process</Label>
                    <Select 
                      value={typeof selectedProcess === 'string' ? selectedProcess : (selectedProcess ? String(selectedProcess) : '')} 
                      onValueChange={(value) => setSelectedProcess(value)}
                      disabled={!selectedProduct}
                    >
                      <SelectTrigger id="process-select" className="h-12 sm:h-10">
                        <SelectValue placeholder={selectedProduct ? "Choose process" : "Select product first"} />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredProcesses.length > 0 ? (
                          filteredProcesses.map((process) => (
                            <SelectItem key={process._id} value={typeof process._id === 'string' ? process._id : String(process._id)}>
                              {process.name}
                            </SelectItem>
                          ))
                        ) : selectedProduct ? (
                          <SelectItem value="no-processes" disabled>
                            No processes available for this product
                          </SelectItem>
                        ) : (
                          <SelectItem value="no-product" disabled>
                            Select a product first
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="machine-select">Select Machine</Label>
                    <Select 
                      value={typeof selectedMachine === 'string' ? selectedMachine : (selectedMachine ? String(selectedMachine) : '')} 
                      onValueChange={(value) => setSelectedMachine(value)}
                    >
                      <SelectTrigger id="machine-select" className="h-12 sm:h-10">
                        <SelectValue placeholder="Choose machine" />
                      </SelectTrigger>
                      <SelectContent>
                        {machines.length > 0 ? (
                          machines.map((machine) => (
                            <SelectItem key={machine._id} value={typeof machine._id === 'string' ? machine._id : String(machine._id)}>
                              {machine.name}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-machines" disabled>
                            No machines available
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="shift-select">Select Shift</Label>
                    <Select value={selectedShift} onValueChange={setSelectedShift}>
                      <SelectTrigger id="shift-select" className="h-12 sm:h-10">
                        <SelectValue placeholder="Choose shift" />
                      </SelectTrigger>
                      <SelectContent>
                        {shifts.length > 0 ? (
                          shifts.map((shift) => (
                            <SelectItem key={shift.name} value={shift.name}>
                              {shift.name} ({shift.startTime} - {shift.endTime})
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-shifts" disabled>
                            No shifts available
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Process Quantity Status */}
                {selectedProcess && processQuantityStatus && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="h-4 w-4 text-blue-600" />
                      <span className="font-medium text-blue-900">Process Status</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-600">Available:</span>
                      <span className="ml-1 font-medium text-blue-600 text-lg">{processQuantityStatus.availableQuantity || 0}</span>
                      <span className="text-xs text-gray-500 block mt-1">Remaining from previous stage</span>
                    </div>
                    {processQuantityStatus.isLocked && (
                      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                        ⚠️ This process stage is locked. No work can be started until it's unlocked by a supervisor.
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="achieved-quantity">Achieved Quantity</Label>
                  <Input
                      id="achieved-quantity"
                    type="number"
                      placeholder="Enter achieved quantity"
                      value={achievedQuantity}
                      onChange={(e) => setAchievedQuantity(e.target.value)}
                    className="h-12 sm:h-10"
                  />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rejected-quantity">Rejected Quantity</Label>
                    <Input
                      id="rejected-quantity"
                      type="number"
                      placeholder="Enter rejected quantity"
                      value={rejectedQuantity}
                      onChange={(e) => setRejectedQuantity(e.target.value)}
                      className="h-12 sm:h-10"
                    />
                  </div>
                </div>

                {/* Photo Capture Section */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="photo-capture">Production Photo (Optional)</Label>
                    {!capturedPhoto && !isCameraOpen && (
                      <Button 
                        type="button"
                        variant="outline"
                        onClick={() => setIsCameraOpen(true)}
                        disabled={loading}
                        className="w-full"
                      >
                        <Camera className="h-4 w-4 mr-2" />
                        Capture Photo
                      </Button>
                    )}
                    {isCameraOpen && (
                      <CameraCapture
                        onCapture={handleCameraCapture}
                        onCancel={handleCameraCancel}
                      />
                    )}
                    {capturedPhoto && !isCameraOpen && (
                      <div className="space-y-2">
                        <div className="relative">
                          <img 
                            src={capturedPhoto} 
                            alt="Captured production photo" 
                            className="w-full max-w-xs h-auto rounded-lg border"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => setCapturedPhoto(null)}
                            className="absolute top-2 right-2"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsCameraOpen(true)}
                          className="w-full"
                        >
                          <Camera className="h-4 w-4 mr-2" />
                          Retake Photo
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                <Button 
                  type="button"
                  onClick={(e) => handleSubmitProduction(e)} 
                  disabled={
                    !selectedProduct ||
                    !selectedMachine ||
                    !selectedShift ||
                    !selectedProcess ||
                    !achievedQuantity || 
                    loading ||
                    (processQuantityStatus && processQuantityStatus.isLocked) ||
                    (processQuantityStatus && processQuantityStatus.remainingQuantity <= 0 && 
                     !(products.find(p => p._id === selectedProduct)?.processes?.find(proc => proc.processId === selectedProcess)?.order === 1))
                  }
                  className="w-full h-12 sm:h-10 text-base sm:text-sm"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Target className="h-4 w-4 mr-2" />
                      Submit Production
                    </>
                  )}
                </Button>
              </div>
          </CardContent>
        </Card>

        {/* Location tracking UI removed - will be implemented later */}

      </div>
    </Layout>
  );
}