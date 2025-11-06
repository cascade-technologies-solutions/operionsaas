import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User } from '@/types';
import { 
  User as UserIcon, 
  Mail, 
  Phone, 
  Calendar, 
  Smartphone, 
  CheckCircle, 
  XCircle, 
  Clock,
  Edit,
  Trash2,
  RefreshCw,
  Loader2
} from 'lucide-react';

interface UserDetailsProps {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onResetDevice?: (userId: string, userName: string) => void;
  actionLoading?: boolean;
  resetLoadingId?: string | null;
  deleteLoading?: boolean;
}

export const UserDetails: React.FC<UserDetailsProps> = ({ 
  user, 
  open, 
  onOpenChange,
  onEdit,
  onDelete,
  onResetDevice,
  actionLoading = false,
  resetLoadingId = null,
  deleteLoading = false
}) => {
  if (!user) return null;

  const handleResetDevice = () => {
    if (onResetDevice && (user._id || user.id)) {
      onResetDevice(user._id || user.id || '', `${user.profile.firstName} ${user.profile.lastName}`);
    }
  };

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
      <DialogContent className="w-[95vw] sm:w-full max-w-4xl max-h-[90vh] overflow-y-auto" aria-describedby="user-details-description">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserIcon className="h-5 w-5" />
            Employee Details
          </DialogTitle>
          <p id="user-details-description" className="sr-only">
            View detailed information about the selected employee including their profile and account details.
          </p>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <UserIcon className="h-4 w-4" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 space-y-4">
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
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Smartphone className="h-4 w-4" />
                Device Information
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
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

          {/* Timestamps */}
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Clock className="h-4 w-4" />
                Account Information
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
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

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2 sm:justify-end pt-4 border-t">
          {onEdit && (
            <Button
              variant="outline"
              onClick={onEdit}
              disabled={actionLoading || deleteLoading}
              className="w-full sm:w-auto"
            >
              {actionLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </>
              )}
            </Button>
          )}
          {onResetDevice && (user._id || user.id) && user.deviceId && (
            <Button
              variant="outline"
              onClick={handleResetDevice}
              disabled={actionLoading || resetLoadingId === (user._id || user.id) || deleteLoading}
              className="w-full sm:w-auto"
            >
              {actionLoading || resetLoadingId === (user._id || user.id) ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Resetting...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reset Device
                </>
              )}
            </Button>
          )}
          {onDelete && (
            <Button
              variant="destructive"
              onClick={onDelete}
              disabled={actionLoading || deleteLoading}
              className="w-full sm:w-auto"
            >
              {deleteLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </>
              )}
            </Button>
          )}
          <Button
            variant="secondary"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
