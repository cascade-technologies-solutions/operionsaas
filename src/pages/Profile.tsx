import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  User, 
  Mail, 
  Phone, 
  Building, 
  Shield, 
  Edit, 
  Save, 
  X, 
  Camera,
  Key,
  Smartphone,
  Calendar,
  MapPin
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { authService } from '@/services/api';
import { toast } from 'sonner';

export default function Profile() {
  const { user, updateUser } = useAuthStore();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    firstName: user?.profile.firstName || '',
    lastName: user?.profile.lastName || '',
    phone: user?.profile.phone || '',
    email: user?.email || '',
  });

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.profile.firstName || '',
        lastName: user.profile.lastName || '',
        phone: user.profile.phone || '',
        email: user.email || '',
      });
    }
  }, [user]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormData({
      firstName: user?.profile.firstName || '',
      lastName: user?.profile.lastName || '',
      phone: user?.profile.phone || '',
      email: user?.email || '',
    });
  };

  const handleSave = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await authService.updateProfile({
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
      });

      updateUser(response.user);
      setIsEditing(false);
      toast.success('Profile updated successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'super_admin': return 'bg-red-100 text-red-800';
      case 'factory_admin': return 'bg-blue-100 text-blue-800';
      case 'supervisor': return 'bg-green-100 text-green-800';
      case 'employee': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'super_admin': return '👑';
      case 'factory_admin': return '🏭';
      case 'supervisor': return '👨‍💼';
      case 'employee': return '👷';
      default: return '👤';
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <p>Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-3 sm:p-4 md:p-6 max-w-4xl">
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Profile</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Manage your account information</p>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto min-h-[44px]"
          >
            ← Back
          </Button>
        </div>

        {/* Profile Card */}
        <Card className="shadow-lg p-3 sm:p-4 md:p-6">
          <CardHeader className="pb-3 sm:pb-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
                <Avatar className="h-16 w-16 sm:h-20 sm:w-20 flex-shrink-0">
                  <AvatarImage src={user.profile.avatar} />
                  <AvatarFallback className="text-base sm:text-lg">
                    {user.profile.firstName?.[0]}{user.profile.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-xl sm:text-2xl truncate">
                    {user.profile.firstName} {user.profile.lastName}
                  </CardTitle>
                  <CardDescription className="text-sm sm:text-base truncate">
                    {user.email}
                  </CardDescription>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <Badge className={getRoleColor(user.role)}>
                      <span className="mr-1">{getRoleIcon(user.role)}</span>
                      <span className="text-xs sm:text-sm">{user.role.replace('_', ' ').toUpperCase()}</span>
                    </Badge>
                    {user.deviceId && (
                      <Badge variant="outline" className="text-xs">
                        <Smartphone className="h-3 w-3 mr-1" />
                        Device: {user.deviceId.slice(0, 8)}...
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              {!isEditing && (
                <Button onClick={handleEdit} className="w-full sm:w-auto min-h-[44px] flex items-center justify-center space-x-2">
                  <Edit className="h-4 w-4" />
                  <span>Edit Profile</span>
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-4 sm:space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription className="text-sm">{error}</AlertDescription>
              </Alert>
            )}

            {/* Personal Information */}
            <div>
              <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center">
                <User className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                Personal Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <Label htmlFor="firstName" className="text-sm sm:text-base">First Name</Label>
                  {isEditing ? (
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="mt-1 text-sm sm:text-base min-h-[44px]"
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground mt-1">
                      {user.profile.firstName || 'Not provided'}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="lastName" className="text-sm sm:text-base">Last Name</Label>
                  {isEditing ? (
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="mt-1 text-sm sm:text-base min-h-[44px]"
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground mt-1">
                      {user.profile.lastName || 'Not provided'}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="email" className="text-sm sm:text-base">Email</Label>
                  <p className="text-sm text-muted-foreground mt-1 flex items-center">
                    <Mail className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span className="break-all">{user.email}</span>
                  </p>
                </div>
                <div>
                  <Label htmlFor="phone" className="text-sm sm:text-base">Phone</Label>
                  {isEditing ? (
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="mt-1 text-sm sm:text-base min-h-[44px]"
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground mt-1 flex items-center">
                      <Phone className="h-4 w-4 mr-2 flex-shrink-0" />
                      {user.profile.phone || 'Not provided'}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Account Information */}
            <div>
              <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center">
                <Shield className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                Account Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <Label className="text-sm sm:text-base">User ID</Label>
                  <p className="text-sm text-muted-foreground mt-1 flex items-center">
                    <Key className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span className="break-all">{user.username || user.email}</span>
                  </p>
                </div>
                <div>
                  <Label className="text-sm sm:text-base">Role</Label>
                  <p className="text-sm text-muted-foreground mt-1 flex items-center">
                    <Shield className="h-4 w-4 mr-2 flex-shrink-0" />
                    {user.role.replace('_', ' ').toUpperCase()}
                  </p>
                </div>
                <div>
                  <Label className="text-sm sm:text-base">Status</Label>
                  <div className="text-sm text-muted-foreground mt-1">
                    <Badge variant={user.isActive ? 'default' : 'secondary'} className="text-xs">
                      {user.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-sm sm:text-base">Email Verified</Label>
                  <div className="text-sm text-muted-foreground mt-1">
                    <Badge variant={user.emailVerified ? 'default' : 'secondary'} className="text-xs">
                      {user.emailVerified ? 'Verified' : 'Not Verified'}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Factory Information (if applicable) */}
            {user.factoryId && (
              <>
                <Separator />
                <div>
                  <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center">
                    <Building className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                    Factory Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <Label className="text-sm sm:text-base">Factory</Label>
                      <p className="text-sm text-muted-foreground mt-1 flex items-center">
                        <Building className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span className="break-words">{user.factory?.name || 'Factory Name'}</span>
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm sm:text-base">Factory Status</Label>
                      <div className="text-sm text-muted-foreground mt-1">
                        <Badge variant={user.factory?.status === 'approved' ? 'default' : 'secondary'} className="text-xs">
                          {user.factory?.status?.toUpperCase() || 'UNKNOWN'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Activity Information */}
            <Separator />
            <div>
              <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                Activity Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <Label className="text-sm sm:text-base">Last Login</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}
                  </p>
                </div>
                <div>
                  <Label className="text-sm sm:text-base">Account Created</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}
                  </p>
                </div>
              </div>
            </div>

            {/* Edit Actions */}
            {isEditing && (
              <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={loading}
                  className="w-full sm:w-auto min-h-[44px]"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={loading}
                  className="w-full sm:w-auto min-h-[44px]"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
