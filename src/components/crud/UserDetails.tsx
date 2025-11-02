import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { User, Process } from '@/types';
import { processService, userService } from '@/services/api';
import { 
  User as UserIcon, 
  Mail, 
  Phone, 
  Calendar, 
  Smartphone, 
  CheckCircle, 
  XCircle, 
  Clock,
  Building,
  Settings,
  Loader2
} from 'lucide-react';

interface UserDetailsProps {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const UserDetails: React.FC<UserDetailsProps> = ({ user, open, onOpenChange }) => {
  const [assignedProcessDetails, setAssignedProcessDetails] = useState<Process[]>([]);
  const [loadingProcesses, setLoadingProcesses] = useState(false);
  const [cleaningUp, setCleaningUp] = useState(false);

  useEffect(() => {
    const fetchAssignedProcessDetails = async () => {
      if (user?.assignedProcesses && user.assignedProcesses.length > 0) {
        setLoadingProcesses(true);
        try {
          // Check if assignedProcesses are already populated objects or just IDs
          const firstProcess = user.assignedProcesses[0];
          if (typeof firstProcess === 'object' && firstProcess.name) {
            // Processes are already populated, use them directly
            setAssignedProcessDetails(user.assignedProcesses as Process[]);
            setLoadingProcesses(false);
            return;
          }

          // Processes are just IDs, fetch them
          const processDetails = await Promise.all(
            user.assignedProcesses.map(async (processId) => {
              try {
                // Extract the actual ID if it's an object
                const id = typeof processId === 'object' ? processId._id || processId.id : processId;
                // Ensure id is a string, not an object
                const processIdString = typeof id === 'string' ? id : String(id);
                const response = await processService.getProcess(processIdString);
                return response.data || response;
              } catch (error: any) {
                // Handle different error types gracefully
                const id = typeof processId === 'object' ? processId._id || processId.id : processId;
                const processIdString = typeof id === 'string' ? id : String(id);
                if (error.message === 'Access denied' || error.status === 403) {
                  // Access denied for process
                  return { _id: processIdString, name: 'Access Restricted', stage: 'N/A' };
                } else if (error.status === 404) {
                  // Process not found - likely deleted or invalid ID
                  return { _id: processIdString, name: 'Process Not Found', stage: 'N/A' };
                }
                return { _id: processIdString, name: 'Unknown Process', stage: 'N/A' };
              }
            })
          );
          
          const validProcesses = processDetails.filter(process => process !== null);
          setAssignedProcessDetails(validProcesses);
          
          // Check if there are any "Process Not Found" entries and log them for cleanup
          const notFoundProcesses = processDetails.filter(process => 
            process && process.name === 'Process Not Found'
          );
          if (notFoundProcesses.length > 0) {
            console.warn('Found invalid process references:', notFoundProcesses.map(p => p._id));
          }
        } catch (error) {
          setAssignedProcessDetails([]);
        } finally {
          setLoadingProcesses(false);
        }
      } else {
        setAssignedProcessDetails([]);
        setLoadingProcesses(false);
      }
    };

    if (open && user) {
      fetchAssignedProcessDetails();
    }
  }, [user, open]);

  const cleanupInvalidProcesses = async () => {
    if (!user || !user.assignedProcesses) return;
    
    setCleaningUp(true);
    try {
      // Filter out invalid process IDs by checking which ones exist
      const validProcessIds = await Promise.all(
        user.assignedProcesses.map(async (processId) => {
          try {
            // Extract the actual ID if it's an object
            const id = typeof processId === 'object' ? processId._id || processId.id : processId;
            const processIdString = typeof id === 'string' ? id : String(id);
            await processService.getProcess(processIdString);
            return processIdString; // Process exists
          } catch (error: any) {
            if (error.status === 404) {
              return null; // Process doesn't exist
            }
            // Extract the actual ID if it's an object
            const id = typeof processId === 'object' ? processId._id || processId.id : processId;
            const processIdString = typeof id === 'string' ? id : String(id);
            return processIdString; // Other errors, keep the process
          }
        })
      );
      
      const cleanedProcessIds = validProcessIds.filter(id => id !== null) as string[];
      
      if (cleanedProcessIds.length !== user.assignedProcesses.length) {
        // Update user with cleaned process list
        await userService.updateUserProcesses(user._id || user.id, cleanedProcessIds);
        // Refresh the process details
        if (user.assignedProcesses && user.assignedProcesses.length > 0) {
          const fetchAssignedProcessDetails = async () => {
            setLoadingProcesses(true);
            try {
              const processDetails = await Promise.all(
                cleanedProcessIds.map(async (processId) => {
                  try {
                    const response = await processService.getProcess(processId);
                    return response.data || response;
                  } catch (error: any) {
                    if (error.status === 404) {
                      return { _id: processId, name: 'Process Not Found', stage: 'N/A' };
                    }
                    return { _id: processId, name: 'Unknown Process', stage: 'N/A' };
                  }
                })
              );
              setAssignedProcessDetails(processDetails.filter(process => process !== null));
            } catch (error) {
              setAssignedProcessDetails([]);
            } finally {
              setLoadingProcesses(false);
            }
          };
          fetchAssignedProcessDetails();
        }
      }
    } catch (error) {
      console.error('Error cleaning up invalid processes:', error);
    } finally {
      setCleaningUp(false);
    }
  };

  if (!user) return null;

  const formatDate = (dateString: string | Date) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRoleDisplayName = (role: string) => {
    const roleMap: Record<string, string> = {
      'super_admin': 'Super Admin',
      'factory_admin': 'Factory Admin',
      'supervisor': 'Supervisor',
      'employee': 'Employee'
    };
    return roleMap[role] || role;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" aria-describedby="user-details-description">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserIcon className="h-5 w-5" />
            Employee Details
          </DialogTitle>
          <p id="user-details-description" className="sr-only">
            View detailed information about the selected employee including their profile, assigned processes, and account details.
          </p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserIcon className="h-4 w-4" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                  <p className="text-lg font-semibold">
                    {user.profile.firstName} {user.profile.lastName}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Role</label>
                  <Badge variant="outline" className="mt-1">
                    {getRoleDisplayName(user.role)}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Username</label>
                  <p className="text-sm">{user.username || 'Not provided'}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Phone</label>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm">{user.profile.phone}</p>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <div className="flex items-center gap-2 mt-1">
                    {user.isActive ? (
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <XCircle className="h-3 w-3 mr-1" />
                        Inactive
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Device Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                Device Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Device ID</label>
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-mono">
                      {user.deviceId || 'No device assigned'}
                    </p>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email Verification</label>
                  <Badge variant={user.emailVerified ? "default" : "secondary"} className="mt-1">
                    {user.emailVerified ? 'Verified' : 'Not Verified'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Assigned Processes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Assigned Processes
                </div>
                {assignedProcessDetails.some(p => p.name === 'Process Not Found') && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={cleanupInvalidProcesses}
                    disabled={cleaningUp}
                  >
                    {cleaningUp ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Cleaning...
                      </>
                    ) : (
                      'Clean Up'
                    )}
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingProcesses ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Loading processes...</span>
                </div>
              ) : assignedProcessDetails.length > 0 ? (
                <div className="space-y-3">
                  {assignedProcessDetails.map((process) => (
                    <div key={process._id || process.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">
                          {typeof process.name === 'string' 
                            ? process.name 
                            : process.name?.name || process.name?._id || 'Unknown Process'
                          }
                        </p>
                        <p className="text-sm text-muted-foreground">Stage {process.stage}</p>
                      </div>
                      <Badge variant="outline">Assigned</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No processes assigned</p>
              )}
            </CardContent>
          </Card>

          {/* Timestamps */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Account Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Created</label>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm">{formatDate(user.createdAt)}</p>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm">{formatDate(user.updatedAt)}</p>
                  </div>
                </div>
                {user.lastLogin && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Last Login</label>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm">{formatDate(user.lastLogin)}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>


        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
