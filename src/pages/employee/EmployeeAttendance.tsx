
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Clock, 
  MapPin, 
  CheckCircle, 
  XCircle,
  Calendar,
  Timer,
  Target,
  Loader2,
  Filter,
  TrendingUp,
  BarChart3,
  Activity,
  Package
} from 'lucide-react';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { useAuthStore } from '@/stores/authStore';
import { attendanceService, workEntryService, machineService } from '@/services/api';
import { Attendance, WorkEntry, Machine } from '@/types';
import { formatDate, formatTime, formatHours, calculateHours } from '@/utils/dateUtils';
import { toast } from 'sonner';

/**
 * Safely extracts a string value from a potentially nested object structure.
 * Handles cases where the value might be:
 * - null/undefined
 * - a string
 * - an object with a `name` property (which might also be a string or object)
 * - an object with `_id` and `name` properties
 */
const getSafeStringValue = (value: any): string => {
  if (value === null || value === undefined) {
    return '';
  }
  
  // If it's already a string, return it
  if (typeof value === 'string') {
    return value;
  }
  
  // If it's an object, try to extract the name property
  if (typeof value === 'object') {
    // If the object has a `name` property
    if ('name' in value && value.name !== null && value.name !== undefined) {
      const nameValue = value.name;
      // If name is a string, return it
      if (typeof nameValue === 'string') {
        return nameValue;
      }
      // If name is also an object, recursively extract
      if (typeof nameValue === 'object' && nameValue !== null) {
        return getSafeStringValue(nameValue);
      }
    }
    // Fallback: try to get _id or convert to string
    if ('_id' in value && value._id !== null && value._id !== undefined) {
      return String(value._id);
    }
    // Last resort: convert to string (but avoid [object Object])
    try {
      const stringValue = String(value);
      if (stringValue === '[object Object]') {
        return '';
      }
      return stringValue;
    } catch {
      return '';
    }
  }
  
  // For any other type, convert to string
  return String(value);
};

export default function EmployeeAttendance() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [todayAttendance, setTodayAttendance] = useState<Attendance | null>(null);
  const [attendanceHistory, setAttendanceHistory] = useState<Attendance[]>([]);
  const [todayWorkEntries, setTodayWorkEntries] = useState<WorkEntry[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  // Filter states
  const [attendanceFilter, setAttendanceFilter] = useState<'weekly' | 'monthly'>('weekly');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const loadTodayAttendance = useCallback(async () => {
    try {
      const userId = user?.id || user?._id;
      if (!userId) {
        // No user ID available
        return;
      }

      // Loading today attendance for user
      const response = await attendanceService.getTodayAttendance(userId);
      
      const attendanceData = response.data;
      
      if (attendanceData && typeof attendanceData === 'object' && '_id' in attendanceData) {
        setTodayAttendance(attendanceData);
        // Today attendance loaded
        toast.success('Today\'s attendance loaded successfully!');
      } else {
        setTodayAttendance(null);
        // No attendance record for today
      }
    } catch (error) {
      // Failed to load today attendance
      setTodayAttendance(null);
      toast.error('Failed to load today\'s attendance');
    }
  }, [user]);

  const loadAttendanceHistory = useCallback(async () => {
    try {
      setLoadingHistory(true);
      const userId = user?.id || user?._id;
      if (!userId) {
        // No user ID available for history
        return;
      }

      // Loading attendance history for user
      const response = await attendanceService.getAttendanceByEmployee(userId);
      
      const historyData = response.data;
      
      if (Array.isArray(historyData)) {
        setAttendanceHistory(historyData);
        // Attendance history loaded
        toast.success(`Loaded ${historyData.length} attendance records`);
      } else {
        setAttendanceHistory([]);
        // No attendance history found or invalid format
      }
    } catch (error) {
      // Failed to load attendance history
      setAttendanceHistory([]);
      toast.error('Failed to load attendance history');
    } finally {
      setLoadingHistory(false);
    }
  }, [user]);



  // Load work entries (today's only)
  const loadAllWorkEntries = useCallback(async () => {
    try {
      const userId = user?.id || user?._id;
      if (!userId) return;

      // Get today's work entries only
      const todayResponse = await workEntryService.getWorkEntriesByEmployee(userId, { today: 'true' });
      const todayEntries = todayResponse.data || [];
      
      if (Array.isArray(todayEntries)) {
        setTodayWorkEntries(todayEntries);
        // Today's work entries loaded
      } else {
        setTodayWorkEntries([]);
      }
    } catch (error) {
      // Failed to load work entries
      setTodayWorkEntries([]);
    }
  }, [user]);

  // Load machines for name mapping
  const loadMachines = useCallback(async () => {
    try {
      // Load machines
      const machinesResponse = await machineService.getMachines();
      const machinesData = Array.isArray(machinesResponse.data) ? machinesResponse.data : 
                          (machinesResponse.data as { machines?: Machine[] })?.machines || [];
      setMachines(machinesData);

    } catch (error) {
      // Failed to load machines
      setMachines([]);
    }
  }, []);

  // Load today's attendance and history
  useEffect(() => {
    if (user?.id || user?._id) {
      loadTodayAttendance();
      loadAttendanceHistory();
      loadAllWorkEntries();
      loadMachines();
    }
  }, [user, loadTodayAttendance, loadAttendanceHistory, loadAllWorkEntries, loadMachines]);

  // Calculate total work hours from today's completed work entries only
  const calculateTotalWorkHours = useMemo(() => {
    let totalHours = 0;
    
    todayWorkEntries.forEach(entry => {
      // Only calculate for completed entries (have end time)
      if (entry.startTime && entry.endTime) {
        const startTime = new Date(entry.startTime);
        const endTime = entry.endTime ? new Date(entry.endTime) : new Date();
        const duration = endTime.getTime() - startTime.getTime();
        const hours = duration / (1000 * 60 * 60);
        totalHours += hours;
      }
    });

    return Math.round(totalHours * 100) / 100;
  }, [todayWorkEntries]);

  // Calculate total achieved and rejected quantities for the day
  const calculateTotalProduction = useMemo(() => {
    let totalAchieved = 0;
    let totalRejected = 0;
    
    todayWorkEntries.forEach(entry => {
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
  }, [todayWorkEntries]);


  // Filter attendance history based on selected period
  const filteredAttendanceHistory = useMemo(() => {
    const now = new Date();
    let startDate: Date;

    switch (attendanceFilter) {
      case 'weekly':
        startDate = startOfWeek(now, { weekStartsOn: 1 }); // Monday start
        break;
      case 'monthly':
        startDate = startOfMonth(now);
        break;
      default:
        startDate = startOfWeek(now, { weekStartsOn: 1 }); // Default to weekly
    }

    return attendanceHistory.filter(attendance => {
      const attendanceDate = new Date(attendance.createdAt || attendance.date);
      return attendanceDate >= startDate;
    });
  }, [attendanceHistory, attendanceFilter]);


  // Get the latest check-out time from completed work entries
  const getLatestCheckOutTime = useMemo(() => {
    const completedEntries = todayWorkEntries.filter(entry => 
      entry.endTime
    );
    
    if (completedEntries.length === 0) return null;
    
    const latestEntry = completedEntries.reduce((latest, current) => {
      const latestTime = new Date(latest.endTime || latest.updatedAt || latest.createdAt);
      const currentTime = new Date(current.endTime || current.updatedAt || current.createdAt);
      return currentTime > latestTime ? current : latest;
    });
    
    return latestEntry.endTime || latestEntry.updatedAt || latestEntry.createdAt;
  }, [todayWorkEntries]);

  // Helper functions for name mapping
  const getMachineName = (machineCode: string) => {
    const machine = machines.find(m => m._id === machineCode);
    return machine ? machine.name : machineCode;
  };

  const getSizeName = (sizeCode: string) => {
    return 'N/A';
  };

  // Calculate work hours from attendance (legacy method)
  const calculateWorkHours = (attendance: Attendance) => {
    if (!attendance.checkIn?.time) return 0;
    
    const checkInTime = new Date(attendance.checkIn.time);
    const checkOutTime = attendance.checkOut?.time ? new Date(attendance.checkOut.time) : new Date();
    
    const diffMs = checkOutTime.getTime() - checkInTime.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    
    return Math.round(diffHours * 100) / 100; // Round to 2 decimal places
  };

  const isMarked = !!todayAttendance;
  const hasCheckedOut = todayAttendance?.checkOut;
  const workHours = todayAttendance ? calculateWorkHours(todayAttendance) : 0;

  return (
    <Layout title="Attendance">
      <div className="space-y-4 sm:space-y-6 p-2 sm:p-0">
        {/* Header - Responsive */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold">Attendance & Work Overview</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Track your attendance, work hours, and performance
            </p>
          </div>
          <Button 
            onClick={() => {
              loadTodayAttendance();
              loadAttendanceHistory();
              loadAllWorkEntries();
            }}
            variant="outline"
            size="sm"
            disabled={loading}
            className="w-full sm:w-auto"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <Activity className="h-4 w-4 mr-2" />
                Refresh
              </>
            )}
          </Button>
        </div>

        {/* Current Status Card */}
        <Card className="shadow-lg border-l-4 border-l-primary bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Clock className="h-5 w-5" />
              Current Status - {todayAttendance ? formatDate(todayAttendance.date || todayAttendance.createdAt) : formatDate(currentTime)}
            </CardTitle>
            <CardDescription>
              Real-time status as of {formatTime(currentTime)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
              <div className="text-center p-3 sm:p-4 bg-white rounded-lg shadow-sm">
                <div className="flex items-center justify-center gap-2 mb-2">
                  {isMarked ? (
                    <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-success" />
                  ) : (
                    <XCircle className="h-6 w-6 sm:h-8 sm:w-8 text-destructive" />
                  )}
                </div>
                <p className="text-sm sm:text-base lg:text-lg font-semibold break-words">
                  {isMarked ? (todayAttendance?.status === 'present' ? 'Present' : 
                             todayAttendance?.status === 'absent' ? 'Absent' : 
                             todayAttendance?.status === 'half-day' ? 'Half Day' : 
                             todayAttendance?.status || 'Present') : 'Not Marked'}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  {isMarked && todayAttendance?.checkIn 
                    ? `Check-in: ${formatTime(todayAttendance.checkIn.time)}`
                    : 'No check-in today'
                  }
                </p>
              </div>
              
              <div className="text-center p-3 sm:p-4 bg-white rounded-lg shadow-sm">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Timer className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
                </div>
                <p className="text-xl sm:text-2xl font-bold text-primary">
                  {calculateTotalWorkHours}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground">Total Hours</p>
              </div>
              
              <div className="text-center p-3 sm:p-4 bg-white rounded-lg shadow-sm">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Target className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
                </div>
                <p className="text-xl sm:text-2xl font-bold text-green-600">
                  {calculateTotalProduction.achieved}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground">Achieved</p>
              </div>
              
              <div className="text-center p-3 sm:p-4 bg-white rounded-lg shadow-sm">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <BarChart3 className="h-6 w-6 sm:h-8 sm:w-8 text-orange-600" />
                </div>
                <p className="text-xl sm:text-2xl font-bold text-orange-600">
                  {todayWorkEntries.length}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground">Work Entries</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Automatic Attendance Notice */}
        {!isMarked && (
          <Card className="shadow-md border-blue-200 bg-gradient-to-r from-blue-50 to-cyan-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-800">
                <MapPin className="h-5 w-5" />
                Automatic Attendance System
              </CardTitle>
              <CardDescription className="text-blue-700">
                Your attendance is automatically marked when you start work from the Dashboard
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-4">
                <div className="bg-white rounded-lg p-4 mb-4">
                  <p className="text-blue-700 mb-3">
                    To mark attendance, go to the <strong>Dashboard</strong> tab and click "Start Work & Mark Attendance"
                  </p>
                  <Button 
                    onClick={() => navigate('/employee/')}
                    variant="outline"
                    className="border-blue-300 text-blue-700 hover:bg-blue-100"
                  >
                    Go to Dashboard
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content Tabs - Responsive */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-2">
            <TabsTrigger value="overview" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
              <Activity className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Overview</span>
              <span className="sm:hidden">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="attendance-history" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
              <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Attendance</span>
              <span className="sm:hidden">Attend.</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">

            {/* Today's Work Entries */}
            {todayWorkEntries.length > 0 && (
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                    <Target className="h-4 w-4 sm:h-5 sm:w-5" />
                    Today's Work Entries
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    All work entries for today ({todayWorkEntries.length} total)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {todayWorkEntries.length > 0 ? (
                    <div className="space-y-3">
                      {todayWorkEntries.map((entry, index) => {
                        const duration = entry.endTime && entry.startTime 
                          ? formatHours(calculateHours(entry.startTime, entry.endTime))
                          : '0.00h';
                        
                        return (
                          <div key={entry._id || index} className="p-3 sm:p-4 border rounded-lg bg-gradient-to-r from-gray-50 to-white hover:shadow-md transition-shadow">
                            {/* Header with entry number and status */}
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 gap-2">
                              <span className="font-medium text-base sm:text-lg">Work Entry #{index + 1}</span>
                              <Badge 
                                variant={entry.achieved > 0 || entry.rejected > 0 ? "default" : "secondary"}
                                className="text-xs w-fit"
                              >
                                {entry.achieved > 0 || entry.rejected > 0 ? "Completed" : "In Progress"}
                              </Badge>
                            </div>
                            
                            {/* Responsive grid - stacks on mobile */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 text-xs sm:text-sm">
                              <div className="bg-white p-2 rounded border">
                                <span className="text-muted-foreground">Machine:</span> <span className="font-medium">{getMachineName(entry.machineCode || '')}</span>
                              </div>
                              <div className="bg-white p-2 rounded border">
                                <span className="text-muted-foreground">Target:</span> <span className="font-medium">{entry.targetQuantity}</span>
                              </div>
                              <div className="bg-white p-2 rounded border">
                                <span className="text-muted-foreground">Started:</span> <span className="font-medium">{entry.startTime ? formatTime(entry.startTime) : 'N/A'}</span>
                              </div>
                              <div className="bg-white p-2 rounded border">
                                <span className="text-muted-foreground">Ended:</span> <span className="font-medium">{(entry.achieved > 0 || entry.rejected > 0) ? formatTime(entry.endTime) : 'In Progress'}</span>
                              </div>
                              {entry.endTime && entry.startTime && (
                                <div className="bg-blue-50 p-2 rounded border border-blue-200">
                                  <span className="text-blue-700 font-medium">Duration:</span> <span className="font-semibold">{duration}</span>
                                </div>
                              )}
                              {entry.achieved && (
                                <div className="bg-green-50 p-2 rounded border border-green-200">
                                  <span className="text-green-700 font-medium">Achieved:</span> <span className="font-semibold">{entry.achieved}</span>
                                </div>
                              )}
                              {entry.rejected && (
                                <div className="bg-red-50 p-2 rounded border border-red-200">
                                  <span className="text-red-700 font-medium">Rejected:</span> <span className="font-semibold">{entry.rejected}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      <div className="pt-4 border-t bg-gradient-to-r from-blue-50 to-indigo-50 p-3 sm:p-4 rounded-lg">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <span className="font-semibold text-base sm:text-lg">Total Work Hours Today:</span>
                          <span className="text-xl sm:text-2xl font-bold text-primary">
                            {calculateTotalWorkHours} hours
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-lg font-medium text-muted-foreground">No work entries for today</p>
                      <p className="text-sm text-muted-foreground">Start your first work entry from the Dashboard</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Attendance History Tab */}
          <TabsContent value="attendance-history" className="space-y-6">
            <Card className="shadow-lg">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                      <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
                      Attendance History
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      Your attendance records with work hours
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <Select value={attendanceFilter} onValueChange={(value: 'weekly' | 'monthly') => setAttendanceFilter(value)}>
                      <SelectTrigger className="w-full sm:w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loadingHistory ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    <span>Loading attendance history...</span>
                  </div>
                ) : filteredAttendanceHistory.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Day</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check-in</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check-out</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Work Hours</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredAttendanceHistory
                          .sort((a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime())
                          .map((attendance, index) => {
                            const attendanceDate = new Date(attendance.date || attendance.createdAt);
                            const checkInTime = attendance.checkIn?.time ? new Date(attendance.checkIn.time) : null;
                            const checkOutTime = attendance.checkOut?.time ? new Date(attendance.checkOut.time) : null;
                            const status = attendance.status || 'present';
                            
                            // Use workHours from API response if available, otherwise calculate
                            let workHours = 0;
                            if ((attendance as any).workHours !== undefined) {
                              workHours = (attendance as any).workHours;
                            } else if (checkInTime && checkOutTime) {
                              workHours = calculateHours(checkInTime, checkOutTime);
                            } else if (checkInTime && !checkOutTime) {
                              // If no checkout time but it's today, calculate from checkin to now
                              const today = new Date();
                              const checkInDate = new Date(checkInTime);
                              const isToday = checkInDate.toDateString() === today.toDateString();
                              if (isToday) {
                                workHours = calculateHours(checkInTime, today);
                              }
                            }
                            
                            return (
                              <tr key={attendance._id || index} className="hover:bg-gray-50">
                                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {formatDate(attendanceDate)}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                  {attendanceDate.toLocaleDateString('en-US', { weekday: 'long' })}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                  {checkInTime ? formatTime(checkInTime) : '-'}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                  {checkOutTime ? formatTime(checkOutTime) : 'On duty'}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 font-medium">
                                  {workHours > 0 ? `${formatHours(workHours)}` : '-'}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <Badge 
                                    variant={status === 'present' ? 'default' : status === 'absent' ? 'destructive' : 'secondary'}
                                    className="text-xs"
                                  >
                                    {status === 'present' ? 'Present' : 
                                     status === 'absent' ? 'Absent' : 
                                     status === 'half-day' ? 'Half Day' : 'Present'}
                                  </Badge>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No attendance records found for selected period</p>
                    <p className="text-sm">Your attendance history will appear here</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </div>
    </Layout>
  );
}