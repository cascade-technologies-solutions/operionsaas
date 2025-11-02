import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Settings as SettingsIcon,
  User, 
  Shield, 
  Smartphone,
  Download,
  LogOut,
  Eye,
  EyeOff,
  Save
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { authService } from '@/services/api';
import { toast } from 'sonner';

export default function Settings() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Account Settings
  const [accountSettings, setAccountSettings] = useState({
    firstName: user?.profile.firstName || '',
    lastName: user?.profile.lastName || '',
    phone: user?.profile.phone || '',
  });

  // Security Settings
  const [securitySettings, setSecuritySettings] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    showPasswords: false,
  });

  // PWA Settings
  const [pwaSettings, setPwaSettings] = useState({
    isInstalled: false,
    canInstall: false,
    deferredPrompt: null as any,
  });

  useEffect(() => {
    checkPWAStatus();
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const checkPWAStatus = () => {
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches;
    setPwaSettings(prev => ({ ...prev, isInstalled }));
  };

  const handleBeforeInstallPrompt = (e: any) => {
    e.preventDefault();
    setPwaSettings(prev => ({ 
      ...prev, 
      canInstall: true, 
      deferredPrompt: e 
    }));
  };

  const handleAppInstalled = () => {
    setPwaSettings(prev => ({ 
      ...prev, 
      isInstalled: true, 
      canInstall: false 
    }));
    toast.success('App installed successfully!');
  };

  const handleInstallPWA = async () => {
    if (pwaSettings.deferredPrompt) {
      pwaSettings.deferredPrompt.prompt();
      const { outcome } = await pwaSettings.deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setPwaSettings(prev => ({ 
          ...prev, 
          canInstall: false, 
          deferredPrompt: null 
        }));
      }
    }
  };

  const handleAccountSave = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await authService.updateProfile({
        firstName: accountSettings.firstName,
        lastName: accountSettings.lastName,
        phone: accountSettings.phone,
      });

      setSuccess('Account settings updated successfully');
      toast.success('Account settings saved');
    } catch (err: any) {
      setError(err.message || 'Failed to update account settings');
      toast.error('Failed to save account settings');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (securitySettings.newPassword !== securitySettings.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (securitySettings.newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await authService.updatePassword(securitySettings.currentPassword, securitySettings.newPassword);
      
      setSuccess('Password changed successfully');
      setSecuritySettings(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }));
      toast.success('Password changed successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to change password');
      toast.error('Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
      logout();
      navigate('/login');
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
      logout();
      navigate('/login');
    }
  };

  const togglePasswordVisibility = () => {
    setSecuritySettings(prev => ({
      ...prev,
      showPasswords: !prev.showPasswords
    }));
  };

  return (
    <Layout title="Settings">
      <div className="space-y-4 sm:space-y-6">

        {/* Account Settings */}
        <Card className="p-3 sm:p-4 md:p-6">
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="flex items-center text-base sm:text-lg">
              <User className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
              Account Settings
            </CardTitle>
            <CardDescription className="text-sm">
              Update your personal information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {success && (
              <Alert>
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <Label htmlFor="firstName" className="text-sm sm:text-base">First Name</Label>
                <Input
                  id="firstName"
                  value={accountSettings.firstName}
                  onChange={(e) => setAccountSettings(prev => ({ ...prev, firstName: e.target.value }))}
                  className="mt-1 text-sm sm:text-base"
                />
              </div>
              <div>
                <Label htmlFor="lastName" className="text-sm sm:text-base">Last Name</Label>
                <Input
                  id="lastName"
                  value={accountSettings.lastName}
                  onChange={(e) => setAccountSettings(prev => ({ ...prev, lastName: e.target.value }))}
                  className="mt-1 text-sm sm:text-base"
                />
              </div>
              <div>
                <Label htmlFor="phone" className="text-sm sm:text-base">Phone Number</Label>
                <Input
                  id="phone"
                  value={accountSettings.phone}
                  onChange={(e) => setAccountSettings(prev => ({ ...prev, phone: e.target.value }))}
                  className="mt-1 text-sm sm:text-base"
                />
              </div>
              <div>
                <Label htmlFor="email" className="text-sm sm:text-base">Email (Read-only)</Label>
                <Input
                  id="email"
                  value={user?.email || ''}
                  disabled
                  className="mt-1 bg-muted text-sm sm:text-base"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-0">
              <Button onClick={handleAccountSave} disabled={loading} className="w-full sm:w-auto min-h-[44px]">
                <Save className="h-4 w-4 mr-2" />
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card className="p-3 sm:p-4 md:p-6">
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="flex items-center text-base sm:text-lg">
              <Shield className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
              Security Settings
            </CardTitle>
            <CardDescription className="text-sm">
              Change your password
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="currentPassword" className="text-sm sm:text-base">Current Password</Label>
                <div className="relative mt-1">
                  <Input
                    id="currentPassword"
                    type={securitySettings.showPasswords ? 'text' : 'password'}
                    value={securitySettings.currentPassword}
                    onChange={(e) => setSecuritySettings(prev => ({ ...prev, currentPassword: e.target.value }))}
                    className="text-sm sm:text-base pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent min-h-[44px]"
                    onClick={togglePasswordVisibility}
                  >
                    {securitySettings.showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div>
                <Label htmlFor="newPassword" className="text-sm sm:text-base">New Password</Label>
                <Input
                  id="newPassword"
                  type={securitySettings.showPasswords ? 'text' : 'password'}
                  value={securitySettings.newPassword}
                  onChange={(e) => setSecuritySettings(prev => ({ ...prev, newPassword: e.target.value }))}
                  className="mt-1 text-sm sm:text-base"
                />
              </div>
              <div>
                <Label htmlFor="confirmPassword" className="text-sm sm:text-base">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type={securitySettings.showPasswords ? 'text' : 'password'}
                  value={securitySettings.confirmPassword}
                  onChange={(e) => setSecuritySettings(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className="mt-1 text-sm sm:text-base"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-0">
              <Button onClick={handlePasswordChange} disabled={loading} className="w-full sm:w-auto min-h-[44px]">
                <Shield className="h-4 w-4 mr-2" />
                {loading ? 'Changing...' : 'Change Password'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* PWA Settings */}
        <Card className="p-3 sm:p-4 md:p-6">
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="flex items-center text-base sm:text-lg">
              <Smartphone className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
              Progressive Web App
            </CardTitle>
            <CardDescription className="text-sm">
              Install the app on your device
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
              <div>
                <Label className="text-sm sm:text-base">Installation Status</Label>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {pwaSettings.isInstalled ? 'App is installed' : 'App is not installed'}
                </p>
              </div>
              <Badge variant={pwaSettings.isInstalled ? 'default' : 'secondary'} className="text-xs sm:text-sm">
                {pwaSettings.isInstalled ? 'Installed' : 'Not Installed'}
              </Badge>
            </div>
            
            {pwaSettings.canInstall && !pwaSettings.isInstalled && (
              <div className="p-3 sm:p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
                  <div className="flex-1">
                    <h4 className="font-medium text-sm sm:text-base text-blue-900">Install App</h4>
                    <p className="text-xs sm:text-sm text-blue-700">
                      Install this app on your device for quick access
                    </p>
                  </div>
                  <Button onClick={handleInstallPWA} className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto min-h-[44px]">
                    <Download className="h-4 w-4 mr-2" />
                    Install
                  </Button>
                </div>
              </div>
            )}

            {pwaSettings.isInstalled && (
              <div className="p-3 sm:p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-start sm:items-center gap-2">
                  <Smartphone className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-sm sm:text-base text-green-900">App Installed</h4>
                    <p className="text-xs sm:text-sm text-green-700">
                      The app is installed on your device
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Logout Section */}
        <Card className="border-red-200 p-3 sm:p-4 md:p-6">
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="text-base sm:text-lg text-red-600">Danger Zone</CardTitle>
            <CardDescription className="text-sm">
              Irreversible actions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
              <div>
                <h4 className="font-medium text-sm sm:text-base">Logout</h4>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Sign out of your account
                </p>
              </div>
              <Button variant="destructive" onClick={handleLogout} className="w-full sm:w-auto min-h-[44px]">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
