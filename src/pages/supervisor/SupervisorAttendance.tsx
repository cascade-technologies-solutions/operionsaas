import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

import { attendanceService, userService } from '@/services/api';
import { Attendance, User } from '@/types';
import { formatDate, formatTime, formatHours, calculateHours } from '@/utils/dateUtils';
import { useAuthStore } from '@/stores/authStore';
import { 
  Users, 
  CheckCircle, 
  XCircle, 
  Clock,
  Calendar as CalendarIcon,
  RefreshCw,
  Loader2,
  TrendingUp,
  AlertTriangle,
  Search,
  Filter,
  Download,
  ArrowLeft,
  User as UserIcon,
  FileText
} from 'lucide-react';
import { format as dateFnsFormat, startOfDay, endOfDay, isToday, subDays } from 'date-fns';
import { toast } from 'sonner';

export default function SupervisorAttendance() {
  const { user } = useAuthStore();
  const [employees, setEmployees] = useState<User[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<User | null>(null);
  const [employeeAttendance, setEmployeeAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<{start: Date | undefined, end: Date | undefined}>({
    start: startOfDay(subDays(new Date(), 7)), // 7 days ago
    end: endOfDay(new Date()),
  });
  const [filterType, setFilterType] = useState<'last7days' | 'custom'>('last7days');
  const [todayAttendance, setTodayAttendance] = useState<Attendance[]>([]);

  useEffect(() => {
    if (user?.factoryId) {
      loadEmployees();
      loadTodayAttendance();
    }
  }, [user?.factoryId]);

  useEffect(() => {
    if (selectedEmployee) {
      loadEmployeeAttendance();
    }
  }, [selectedEmployee, dateRange, filterType]);

  const loadEmployees = async () => {
    if (!user?.factoryId) {
      return;
    }
    
    setLoading(true);
    try {
      // Load employees
      const employeeResponse = await userService.getEmployees();
      
      // Extract employees data from response (same logic as EmployeeManagement.tsx)
      let employeesData: User[] = [];
      if (Array.isArray(employeeResponse)) {
        employeesData = employeeResponse;
      } else if (employeeResponse && (employeeResponse as any).data && Array.isArray((employeeResponse as any).data)) {
        employeesData = (employeeResponse as any).data;
      } else {
        employeesData = [];
      }
      
      setEmployees(employeesData);

    } catch (error: any) {
      
      if (error.response?.status === 401) {
        toast.error('Authentication failed. Please log in again.');
      } else if (error.response?.status === 403) {
        toast.error('Access denied. You do not have permission to view employee data.');
      } else {
        toast.error('Failed to load employee data. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadEmployeeAttendance = async () => {
    if (!selectedEmployee || !user?.factoryId) {
      return;
    }
    
    try {
      const response = await attendanceService.getAttendanceByEmployee(selectedEmployee._id || selectedEmployee.id);
      
      let attendanceData: Attendance[] = [];
      
      // Handle different response structures
      if (response.data && Array.isArray(response.data)) {
        attendanceData = response.data;
      } else if (Array.isArray(response)) {
        attendanceData = response;
      } else if (response && typeof response === 'object' && 'data' in response) {
        attendanceData = Array.isArray(response.data) ? response.data : [];
      }
      
      // Filter by date range if specified
      if (dateRange.start && dateRange.end) {
        const startDate = startOfDay(dateRange.start);
        const endDate = endOfDay(dateRange.end);
        
        attendanceData = attendanceData.filter(attendance => {
          // Handle different date field structures
          const attendanceDate = new Date(
            attendance.date || 
            attendance.checkIn?.date || 
            attendance.createdAt || 
            attendance.updatedAt
          );
          return attendanceDate >= startDate && attendanceDate <= endDate;
        });
      }
      
             setEmployeeAttendance(attendanceData);
      
         } catch (error: any) {
       toast.error('Failed to load attendance data');
       setEmployeeAttendance([]);
     }
  };


  const loadTodayAttendance = async () => {
    if (!user?.factoryId) return;
    
    try {
      const response = await attendanceService.getAttendance();
      
      const allAttendance = response.data || [];
      
      // Filter for today's attendance
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const todayRecords = allAttendance.filter(attendance => {
        const attendanceDate = new Date(attendance.date || attendance.checkIn?.date || attendance.createdAt);
        return attendanceDate >= today && attendanceDate < tomorrow;
      });
      
      setTodayAttendance(todayRecords);
      
         } catch (error: any) {
       setTodayAttendance([]);
     }
  };

  const getStatusBadge = (status: string) => {
    // Handle different status formats and nested structures
    const normalizedStatus = status?.toLowerCase() || 'unknown';
    
    switch (normalizedStatus) {
      case 'present':
      case 'checked-in':
      case 'check-in':
        return <Badge className="bg-green-100 text-green-800 text-xs px-2 py-1">Present</Badge>;
      case 'absent':
        return <Badge className="bg-red-100 text-red-800 text-xs px-2 py-1">Absent</Badge>;
      case 'half-day':
      case 'halfday':
      case 'half_day':
        return <Badge className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1">Half Day</Badge>;
      case 'late':
        return <Badge className="bg-orange-100 text-orange-800 text-xs px-2 py-1">Late</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs px-2 py-1">{status || 'Unknown'}</Badge>;
    }
  };

  const calculateStats = () => {
    const totalEmployees = employees.length;
    
    // Calculate present and absent from today's attendance across all employees
    const present = todayAttendance.filter(a => {
      const status = a.status || a.checkIn?.status;
      return status === 'present';
    }).length;
    
    const absent = todayAttendance.filter(a => {
      const status = a.status || a.checkIn?.status;
      return status === 'absent';
    }).length;

    return { totalEmployees, present, absent };
  };

  const filteredEmployees = employees.filter(employee => {
    const fullName = `${employee.profile.firstName} ${employee.profile.lastName}`.toLowerCase();
    return fullName.includes(searchTerm.toLowerCase());
  });

  const stats = calculateStats();

  const handleLast7DaysFilter = () => {
    setFilterType('last7days');
    setDateRange({
      start: startOfDay(subDays(new Date(), 7)),
      end: endOfDay(new Date()),
    });
  };

  const handleCustomFilter = () => {
    setFilterType('custom');
  };

  const handleBackToEmployees = () => {
    setSelectedEmployee(null);
    setEmployeeAttendance([]);
  };

     const handleEmployeeClick = (employee: User) => {
     setSelectedEmployee(employee);
     // Clear previous attendance data
     setEmployeeAttendance([]);
   };

  const exportToExcel = () => {
    if (!selectedEmployee) return;

    // Create CSV content
    const headers = ['Date', 'Status', 'Check-in Time', 'Check-out Time', 'Total Hours'];
    const csvContent = [
      headers.join(','),
      ...employeeAttendance.map(attendance => {
        const date = dateFnsFormat(new Date(attendance.date || attendance.checkIn?.date || attendance.createdAt), 'yyyy-MM-dd');
        const status = attendance.status || attendance.checkIn?.status || 'Unknown';
        const checkInTime = attendance.checkIn?.time ? dateFnsFormat(new Date(attendance.checkIn.time), 'HH:mm') : 'N/A';
        const checkOutTime = attendance.checkOut?.time ? dateFnsFormat(new Date(attendance.checkOut.time), 'HH:mm') : 'N/A';
        
        // Use workHours from API if available (calculated from WorkEntry data), otherwise calculate from checkIn/checkOut
        let totalHours = 'N/A';
        if ((attendance as any).workHours !== undefined && (attendance as any).workHours > 0) {
          totalHours = ((attendance as any).workHours).toFixed(2);
        } else if (attendance.checkIn?.time && attendance.checkOut?.time) {
          totalHours = ((new Date(attendance.checkOut.time).getTime() - new Date(attendance.checkIn.time).getTime()) / (1000 * 60 * 60)).toFixed(2);
        }
        
        return [date, status, checkInTime, checkOutTime, totalHours].join(',');
      })
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedEmployee.profile.firstName}_${selectedEmployee.profile.lastName}_attendance.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    toast.success('Attendance data exported successfully!');
  };

  




  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <span className="text-lg">Loading...</span>
          </div>
        </div>
      </Layout>
    );
  }

  // Show employee attendance view
  if (selectedEmployee) {
    return (
      <Layout>
        <div className="space-y-6 p-4">
          {/* Header - Mobile Optimized */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button 
                onClick={handleBackToEmployees} 
                variant="outline" 
                size="sm"
                className="h-10 w-10 p-0 sm:h-9 sm:w-auto sm:px-3"
              >
                <ArrowLeft className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Back</span>
              </Button>
              <div className="min-w-0 flex-1">
                <h1 className="text-xl sm:text-2xl font-bold truncate">Employee Attendance</h1>
                <p className="text-sm text-muted-foreground truncate">
                  {selectedEmployee.profile.firstName} {selectedEmployee.profile.lastName}
                </p>
              </div>
            </div>
            <Button 
              onClick={exportToExcel} 
              variant="outline" 
              size="sm"
              className="h-10 w-full sm:w-auto sm:h-9"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            
          </div>

          {/* Filters - Mobile Optimized */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Date Filter</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button 
                  variant={filterType === 'last7days' ? 'default' : 'outline'} 
                  size="sm"
                  onClick={handleLast7DaysFilter}
                  className="flex-1 sm:flex-none"
                >
                  Last 7 Days
                </Button>
                <Button 
                  variant={filterType === 'custom' ? 'default' : 'outline'} 
                  size="sm"
                  onClick={handleCustomFilter}
                  className="flex-1 sm:flex-none"
                >
                  Custom Range
                </Button>
              </div>

                               {/* Custom Date Range - Simplified */}
                {filterType === 'custom' && (
                  <div className="pt-2 space-y-3">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">
                        Custom date range functionality has been simplified. Using Last 7 Days by default.
                      </p>
                    </div>
                  </div>
                )}
            </CardContent>
          </Card>

          {/* Summary Cards - Mobile Optimized */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
              <CardContent className="p-3 sm:p-4">
                <div className="flex flex-col items-center text-center">
                  <div className="p-2 bg-blue-100 rounded-lg mb-2">
                    <Users className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground font-medium mb-1">Total</p>
                  <p className="text-xl sm:text-3xl font-extrabold text-blue-700">{stats.totalEmployees}</p>
                </div>
              </CardContent>
            </Card>
            
            <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
              <CardContent className="p-3 sm:p-4">
                <div className="flex flex-col items-center text-center">
                  <div className="p-2 bg-green-100 rounded-lg mb-2">
                    <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground font-medium mb-1">Present</p>
                  <p className="text-xl sm:text-3xl font-extrabold text-green-700">{stats.present}</p>
                </div>
              </CardContent>
            </Card>
            
            <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
              <CardContent className="p-3 sm:p-4">
                <div className="flex flex-col items-center text-center">
                  <div className="p-2 bg-red-100 rounded-lg mb-2">
                    <XCircle className="h-6 w-6 sm:h-8 sm:w-8 text-red-600" />
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground font-medium mb-1">Absent</p>
                  <p className="text-xl sm:text-3xl font-extrabold text-red-700">{stats.absent}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          



           {/* Detailed Attendance Table */}
           <Card className="shadow-sm border border-gray-200">
             <CardHeader className="pb-3 bg-gray-50 rounded-t-lg">
               <CardTitle className="text-lg text-gray-800">Detailed Attendance History</CardTitle>
               <CardDescription className="text-sm text-gray-600">
                 Complete attendance records for {selectedEmployee.profile.firstName} {selectedEmployee.profile.lastName}
               </CardDescription>
             </CardHeader>
             <CardContent className="p-0">
               <div className="overflow-x-auto">
                 <table className="w-full">
                   <thead className="bg-gray-50 border-b">
                     <tr>
                       <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                       <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Day</th>
                       <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check-in</th>
                       <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check-out</th>
                       <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hours</th>
                       <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                     </tr>
                   </thead>
                   <tbody className="bg-white divide-y divide-gray-200">
                     {employeeAttendance.length > 0 ? (
                       employeeAttendance
                         .sort((a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime())
                         .map((attendance, index) => {
                          const attendanceDate = new Date(attendance.date || attendance.checkIn?.date || attendance.createdAt);
                          const checkInTime = attendance.checkIn?.time ? new Date(attendance.checkIn.time) : null;
                          const checkOutTime = attendance.checkOut?.time ? new Date(attendance.checkOut.time) : null;
                          const status = attendance.status || attendance.checkIn?.status || 'present';
                          
                          // Calculate hours worked - prefer workHours from API (calculated from WorkEntry data)
                          // Fallback to checkIn/checkOut calculation if not available
                          let hoursWorked = 0;
                          
                          // First, check if workHours is provided by the API (from WorkEntry calculation)
                          if ((attendance as any).workHours !== undefined && (attendance as any).workHours > 0) {
                            hoursWorked = (attendance as any).workHours;
                          } else if (checkInTime && checkOutTime) {
                            // Fallback to checkIn/checkOut calculation
                            hoursWorked = calculateHours(checkInTime, checkOutTime);
                          } else if (checkInTime && !checkOutTime) {
                            // If no checkout time but it's today, calculate from checkin to now
                            const today = new Date();
                            const checkInDate = new Date(checkInTime);
                            const isToday = checkInDate.toDateString() === today.toDateString();
                            if (isToday) {
                              hoursWorked = calculateHours(checkInTime, today);
                            }
                          }
                           
                           return (
                             <tr key={index} className="hover:bg-gray-50">
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
                               <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                 {formatHours(hoursWorked)}
                               </td>
                               <td className="px-4 py-3 whitespace-nowrap">
                                 <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                   status === 'present' 
                                     ? 'bg-green-100 text-green-800' 
                                     : status === 'absent'
                                     ? 'bg-red-100 text-red-800'
                                     : 'bg-yellow-100 text-yellow-800'
                                 }`}>
                                   {status === 'present' ? 'Present' : 
                                    status === 'absent' ? 'Absent' : 
                                    status === 'half-day' ? 'Half Day' : 'Present'}
                                 </span>
                               </td>
                             </tr>
                           );
                         })
                     ) : (
                       <tr>
                         <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                           No attendance records found
                         </td>
                       </tr>
                     )}
                   </tbody>
                 </table>
               </div>
             </CardContent>
           </Card>



                     
        </div>
      </Layout>
    );
  }

  // Show employee list view - Mobile Optimized
  return (
    <Layout>
      <div className="space-y-4 p-4">
        {/* Header - Mobile Optimized */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl font-bold">Employee Attendance</h1>
            <p className="text-sm text-muted-foreground">
              Select an employee to view their attendance
            </p>
          </div>
          <Button 
            onClick={loadEmployees} 
            variant="outline" 
            size="sm"
            className="h-10 w-full sm:w-auto sm:h-9"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Search Bar - Mobile Optimized */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Search Employees</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input 
                placeholder="Search employees by name..." 
                className="pl-10 h-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        

        {/* Summary Cards - Mobile Optimized */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-col items-center text-center">
                <div className="p-2 bg-blue-100 rounded-lg mb-2">
                  <Users className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground font-medium mb-1">Total</p>
                <p className="text-xl sm:text-3xl font-extrabold text-blue-700">{stats.totalEmployees}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-col items-center text-center">
                <div className="p-2 bg-green-100 rounded-lg mb-2">
                  <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground font-medium mb-1">Present</p>
                <p className="text-xl sm:text-3xl font-extrabold text-green-700">{stats.present}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-col items-center text-center">
                <div className="p-2 bg-red-100 rounded-lg mb-2">
                  <XCircle className="h-6 w-6 sm:h-8 sm:w-8 text-red-600" />
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground font-medium mb-1">Absent</p>
                <p className="text-xl sm:text-3xl font-extrabold text-red-700">{stats.absent}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Employee List - Mobile Optimized */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Employees</CardTitle>
            <CardDescription className="text-sm">
              Click on an employee to view their attendance
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {filteredEmployees.length === 0 ? (
              <div className="text-center py-12 px-4">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No employees found</h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  {searchTerm ? 'No employees found matching your search' : 'No employees available'}
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredEmployees.map((employee) => (
                  <div 
                    key={employee._id || employee.id} 
                    className="p-4 hover:bg-gray-50 cursor-pointer transition-colors active:bg-gray-100"
                    onClick={() => handleEmployeeClick(employee)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <UserIcon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm sm:text-base truncate">
                          {employee.profile.firstName} {employee.profile.lastName}
                        </h3>
                      </div>
                      <div className="flex-shrink-0">
                        <Badge variant="outline" className="text-xs px-2 py-1">
                          View
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
