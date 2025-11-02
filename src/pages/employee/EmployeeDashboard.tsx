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
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraVideo, setCameraVideo] = useState<HTMLVideoElement | null>(null);
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
    
    const product = products.find(p => p._id === selectedProduct);
    if (!product || !product.processes) return [];
    
    // Get only processes that belong to this product
    const productProcessIds = product.processes.map(p => p.processId);
    const filtered = processes.filter(proc => productProcessIds.includes(proc._id));
    
    
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
      // Restore product selection
      const savedProduct = getSelectionFromStorage('employee_selected_product');
      if (savedProduct && products.find(p => p._id === savedProduct)) {
        setSelectedProduct(savedProduct);
      }

      // Restore machine selection
      const savedMachine = getSelectionFromStorage('employee_selected_machine');
      if (savedMachine && machines.find(m => m._id === savedMachine)) {
        setSelectedMachine(savedMachine);
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
        // Check if the saved process is valid for the selected product
        const product = products.find(p => p._id === selectedProduct);
        if (product && product.processes) {
          const productProcessIds = product.processes.map(p => p.processId);
          if (productProcessIds.includes(savedProcess)) {
            setSelectedProcess(savedProcess);
          }
        }
      }
    }
  }, [selectedProduct, processes, products]);

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
      const processesArray = Array.isArray(allProcesses) ? allProcesses : [];
      
      if (processesArray.length > 0) {
        setProcesses(processesArray);
        
        // Load machines
        const machinesResponse = await machineService.getMachines();
        const allMachines = 'data' in machinesResponse ? machinesResponse.data : machinesResponse;
        const machinesArray = Array.isArray(allMachines) ? allMachines : [];
        setMachines(machinesArray);
        
        // Load products
        const productsResponse = await productService.getProducts();
        const allProducts = 'data' in productsResponse ? productsResponse.data : productsResponse;
        const productsArray = Array.isArray(allProducts) ? allProducts : [];
        setProducts(productsArray);
        
        // Set default selections only if no saved selections exist
        // The restoration logic will be handled by the useEffect hooks
        if (productsArray.length > 0 && !getSelectionFromStorage('employee_selected_product')) {
          setSelectedProduct(productsArray[0]._id);
        }
        
        if (processesArray.length > 0 && !getSelectionFromStorage('employee_selected_process')) {
          setSelectedProcess(processesArray[0]._id);
        }
        
        if (machinesArray.length > 0 && !getSelectionFromStorage('employee_selected_machine')) {
          setSelectedMachine(machinesArray[0]._id);
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
        } catch (error) {
          console.error('❌ Failed to load shifts in employee dashboard:', error);
          console.error('❌ Error response:', error.response);
          
          // Set default shifts if factory data fails to load
          const defaultShifts = [
            { name: 'Morning', startTime: '08:00 AM', endTime: '04:00 PM', isActive: true },
            { name: 'Evening', startTime: '04:00 PM', endTime: '12:00 AM', isActive: true },
            { name: 'Night', startTime: '12:00 AM', endTime: '08:00 AM', isActive: true }
          ];
          setShifts(defaultShifts);
          setSelectedShift('Morning');
        }
        
        // Load today's attendance
        try {
          const attendanceResponse = await attendanceService.getTodayAttendance(user.id || user._id);
          const attendanceData = attendanceResponse.data;
          // Attendance data loaded
          setAttendance(attendanceData);
        } catch (error) {
          // No attendance data yet (normal for new users)
        }
        
        // Load work entries
        try {
          const workResponse = await workEntryService.getWorkEntriesByEmployee(user.id || user._id, { today: 'true' });
          const allWorkEntries = 'data' in workResponse ? workResponse.data : workResponse;
          const workEntriesArray = Array.isArray(allWorkEntries) ? allWorkEntries : [];
          setAllWorkEntries(workEntriesArray);
        } catch (error) {
          // Failed to load work entries
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

  // Filter products based on selected process
  const filteredProducts = useMemo(() => {
    if (!selectedProcess) return products;
    return products.filter(product => 
      product.processes?.some(proc => proc.processId === selectedProcess)
    );
  }, [selectedProcess, products]);

  // Update selected product when process changes
  useEffect(() => {
    if (selectedProcess && filteredProducts.length > 0) {
      const currentProduct = products.find(p => p._id === selectedProduct);
      const isCurrentProductValid = currentProduct?.processes?.some(proc => proc.processId === selectedProcess);
      
      if (!isCurrentProductValid) {
        setSelectedProduct(filteredProducts[0]._id);
      }
    }
  }, [selectedProcess, filteredProducts, selectedProduct, products]);


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

  // Calculate total work hours from today's completed work entries only
  const calculateTotalWorkHours = useMemo(() => {
    let totalHours = 0;
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
    
    allWorkEntries.forEach(entry => {
      // Only count entries from today
      const entryDate = new Date(entry.startTime || entry.createdAt);
      if (entryDate >= todayStart && entryDate <= todayEnd) {
        if (entry.startTime && entry.endTime) {
          const startTime = new Date(entry.startTime);
          const endTime = entry.endTime ? new Date(entry.endTime) : new Date();
          const duration = endTime.getTime() - startTime.getTime();
          const hours = duration / (1000 * 60 * 60);
          totalHours += hours;
        }
      }
    });

    return Math.round(totalHours * 100) / 100; // Round to 2 decimal places
  }, [allWorkEntries]);

  // Calculate total achieved and rejected quantities for the day
  const calculateTotalProduction = useMemo(() => {
    let totalAchieved = 0;
    let totalRejected = 0;
    
    allWorkEntries.forEach(entry => {
      if (entry.achieved) {
        totalAchieved += entry.achieved;
      }
      if (entry.rejected) {
        totalRejected += entry.rejected;
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
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
    
    const todayEntries = allWorkEntries.filter(entry => {
      const entryDate = new Date(entry.startTime || entry.createdAt);
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
    
    todayEntries.forEach(entry => {
      const machineName = entry.machineId ? getMachineName(typeof entry.machineId === 'string' ? entry.machineId : (entry.machineId as any)._id) : 'Unknown';
      const productName = entry.productId ? getProductName(typeof entry.productId === 'string' ? entry.productId : (entry.productId as any)._id) : 'Unknown';
      const processName = entry.processId ? getProcessName(typeof entry.processId === 'string' ? entry.processId : (entry.processId as any)._id) : 'Unknown';
      
      if (entry.machineId) uniqueMachines.add(machineName);
      if (entry.productId) uniqueProducts.add(productName);
      
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

      // Group by process and product
      const processId = typeof entry.processId === 'string' ? entry.processId : (entry.processId as any)._id;
      const productId = typeof entry.productId === 'string' ? entry.productId : (entry.productId as any)._id;
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
      group.achieved += entry.achieved || 0;
      group.rejected += entry.rejected || 0;
      group.entries += 1;
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

      // Validate required fields before sending
      if (!selectedProcess) {
        toast.error('Please select a process before checking in');
        return;
      }

      const attendanceData = await attendanceService.checkIn({
        employeeId: user?.id || '',
        processId: selectedProcess,
        location: location,
        shiftType: selectedShift as 'morning' | 'evening' | 'night',
        target: 0
      });
      setAttendance(attendanceData.data);
      
      toast.success('Checked in successfully');
    } catch (error: any) {
      console.error('Check-in error:', error);
      toast.error(error.message || 'Failed to check in');
    } finally {
      setLoading(false);
    }
  };

  // handleCheckOut removed - production submission now acts as checkout

  const handleOpenCamera = async () => {
    try {
      // Check if camera is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast.error('Camera not available on this device');
        return;
      }

      // Get camera stream - try back camera first, then any camera
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: 'environment', // Use back camera if available
            width: { ideal: 1280 },
            height: { ideal: 720 }
          } 
        });
      } catch (backCameraError) {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: { ideal: 1280 },
            height: { ideal: 720 }
          } 
        });
      }
      
      // Check if we have video tracks
      const videoTracks = stream.getVideoTracks();
      if (videoTracks.length === 0) {
        toast.error('No video tracks available');
        return;
      }
      
      setCameraStream(stream);
      setIsCameraOpen(true);
      toast.success('Camera opened. Position your device and click "Capture" to take the photo.');
      
    } catch (error: any) {
      console.error('Camera open error:', error);
      toast.error('Failed to open camera. Please try again.');
    }
  };

  const handleCapturePhoto = () => {
    if (!cameraVideo || !cameraStream) {
      toast.error('Camera not ready. Please try again.');
      return;
    }

    try {
      // Create a canvas to capture the photo
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      
      if (!context) {
        toast.error('Failed to create canvas context');
        return;
      }

      // Set canvas dimensions to match video
      canvas.width = cameraVideo.videoWidth;
      canvas.height = cameraVideo.videoHeight;

      // Draw video frame to canvas
      context.drawImage(cameraVideo, 0, 0, canvas.width, canvas.height);

      // Convert canvas to base64 image
      const photoDataUrl = canvas.toDataURL('image/jpeg', 0.8);
      setCapturedPhoto(photoDataUrl);

      // Close camera
      handleCloseCamera();

      toast.success('Photo captured successfully!');
      
    } catch (error: any) {
      console.error('Photo capture error:', error);
      toast.error('Failed to capture photo. Please try again.');
    }
  };


  const handleCloseCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    if (cameraVideo) {
      document.body.removeChild(cameraVideo);
      setCameraVideo(null);
    }
    setIsCameraOpen(false);
  };

  // Handle camera video element when camera is opened
  useEffect(() => {
    if (isCameraOpen && cameraStream && !cameraVideo) {
      const video = document.createElement('video');
      video.style.position = 'fixed';
      video.style.top = '0';
      video.style.left = '0';
      video.style.width = '100%';
      video.style.height = '100%';
      video.style.objectFit = 'cover';
      video.style.zIndex = '9999';
      video.style.backgroundColor = 'black';
      video.autoplay = true;
      video.muted = true;
      video.playsInline = true;
      video.controls = false;
      video.loop = false;
      
      // Add to DOM first
      document.body.appendChild(video);
      setCameraVideo(video);
      
      // Then set the stream
      video.srcObject = cameraStream;
      
      // Wait for the video to be ready
      video.onloadedmetadata = () => {
        video.play().catch(error => {
          console.error('Video play error:', error);
        });
      };
      
      video.oncanplay = () => {
        if (video.paused) {
          video.play().catch(error => {
            console.error('Video play error on canplay:', error);
          });
        }
      };
      
      video.onerror = (error) => {
        console.error('Video error:', error);
      };
      
      // Force play after a short delay
      setTimeout(() => {
        if (video.paused && video.readyState >= 2) {
          video.play().catch(error => {
            console.error('Forced video play error:', error);
          });
        }
      }, 500);
    }
  }, [isCameraOpen, cameraStream, cameraVideo]);

  // Cleanup camera on component unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
      if (cameraVideo) {
        document.body.removeChild(cameraVideo);
      }
    };
  }, [cameraStream, cameraVideo]);

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
            location: attendance?.checkIn?.location || null
          };
          
          const response = await workEntryService.createDirectWorkEntry(directWorkEntryData);
          
          // Optimistically update state with returned work entry
          const newWorkEntry = (response as any).data?.data || (response as any).data || response;
          if (newWorkEntry && typeof newWorkEntry === 'object' && ('_id' in newWorkEntry || 'id' in newWorkEntry)) {
            setAllWorkEntries(prev => [newWorkEntry, ...prev]);
          }
          
          toast.success('Production submitted successfully!');
          
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
        location: attendance?.checkIn?.location || null,
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
      
      // Calculate total hours worked
      if (attendance && attendance.checkIn && attendance.checkIn.time) {
        const checkInTime = new Date(attendance.checkIn.time);
        const checkOutTime = new Date();
        const totalHours = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
        
        
        // Perform checkout with location
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

          await attendanceService.checkOut(attendance._id, location);
          setAttendance(null);
          
          toast.success(`Production submitted and checked out successfully! Total hours: ${totalHours.toFixed(2)}h`);
        } catch (checkoutError: any) {
          console.error('Checkout error:', checkoutError);
          toast.error('Production submitted but checkout failed. Please contact supervisor.');
        }
      } else {
        toast.success('Production data submitted successfully');
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
            {attendance ? (
              <div className="space-y-3">
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
              <p className="text-red-700">Available machine IDs: {machines.map(m => m._id).join(', ')}</p>
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
                    <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                      <SelectTrigger id="product-select" className="h-12 sm:h-10">
                        <SelectValue placeholder="Choose product" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredProducts.length > 0 ? (
                          filteredProducts.map((product) => (
                            <SelectItem key={product._id} value={product._id}>
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
                      value={selectedProcess} 
                      onValueChange={setSelectedProcess}
                      disabled={!selectedProduct}
                    >
                      <SelectTrigger id="process-select" className="h-12 sm:h-10">
                        <SelectValue placeholder={selectedProduct ? "Choose process" : "Select product first"} />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredProcesses.length > 0 ? (
                          filteredProcesses.map((process) => (
                            <SelectItem key={process._id} value={process._id}>
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
                    <Select value={selectedMachine} onValueChange={setSelectedMachine}>
                      <SelectTrigger id="machine-select" className="h-12 sm:h-10">
                        <SelectValue placeholder="Choose machine" />
                      </SelectTrigger>
                      <SelectContent>
                        {machines.length > 0 ? (
                          machines.map((machine) => (
                            <SelectItem key={machine._id} value={machine._id}>
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
                    <div className="flex gap-2">
                      {!isCameraOpen ? (
                        <div className="flex gap-2 w-full">
                          <Button 
                            type="button"
                            variant="outline"
                            onClick={handleOpenCamera}
                            disabled={loading}
                            className="flex-1"
                          >
                            <Camera className="h-4 w-4 mr-2" />
                            {capturedPhoto ? 'Retake Photo' : 'Open Camera'}
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-2 w-full">
                          <Button
                            type="button"
                            onClick={handleCapturePhoto}
                            className="flex-1 bg-green-600 hover:bg-green-700"
                          >
                            <Camera className="h-4 w-4 mr-2" />
                            Capture
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleCloseCamera}
                            className="px-3"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                      {capturedPhoto && !isCameraOpen && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setCapturedPhoto(null)}
                          className="px-3"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    {capturedPhoto && !isCameraOpen && (
                      <div className="mt-2">
                        <img 
                          src={capturedPhoto} 
                          alt="Captured production photo" 
                          className="w-full max-w-xs h-auto rounded-lg border"
                        />
                      </div>
                    )}
                    {isCameraOpen && (
                      <div className="mt-2 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="text-sm text-blue-800">
                          📷 Camera is open. Position your device and click "Capture" to take the photo.
                        </div>
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