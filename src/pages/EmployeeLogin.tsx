import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { User, Loader2, Smartphone, Lock } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { authService } from '@/services/api';
import { toast } from 'sonner';

export default function EmployeeLogin() {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const navigate = useNavigate();
  const location = useLocation();
  const { login, clearInvalidAuth } = useAuthStore();

  const from = location.state?.from?.pathname || '/employee';

  useEffect(() => {
    // Auto-detect device ID for employees
    const detectDeviceId = () => {
      // Try to get device ID from various sources
      const deviceIdFromStorage = localStorage.getItem('deviceId');
      if (deviceIdFromStorage) {
        setDeviceId(deviceIdFromStorage);
        return;
      }

      // Generate a device ID based on browser fingerprint
      const generateDeviceId = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx?.fillText('Device ID', 10, 10);
        const fingerprint = canvas.toDataURL();
        
        // Create a hash from fingerprint
        let hash = 0;
        for (let i = 0; i < fingerprint.length; i++) {
          const char = fingerprint.charCodeAt(i);
          hash = ((hash << 5) - hash) + char;
          hash = hash & hash; // Convert to 32-bit integer
        }
        
        return `EMP_DEV_${Math.abs(hash).toString(36).toUpperCase()}`;
      };

      const newDeviceId = generateDeviceId();
      setDeviceId(newDeviceId);
      localStorage.setItem('deviceId', newDeviceId);
    };

    detectDeviceId();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await authService.login({ userId, password, deviceId });
      
      if (response.user.role !== 'employee') {
        throw new Error('Access denied. Employee credentials required.');
      }
      
      login(response.user, response.accessToken, deviceId);
      navigate('/employee');
      toast.success('Welcome back, ' + response.user.profile.firstName + '!');
    } catch (err: any) {
      setError(err.message || 'Invalid credentials');
      toast.error('Login failed');
      
      // Clear any invalid authentication state
      clearInvalidAuth();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-3">
          <div className="flex items-center justify-center mb-2">
            <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl shadow-lg">
              <User className="h-8 w-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">Employee Login</CardTitle>
          <CardDescription className="text-center">
            Enter your Employee ID and Password
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="userId">Employee ID</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="userId"
                  type="text"
                  placeholder="Enter your Employee ID"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  required
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="deviceId">Device ID</Label>
              <div className="relative">
                <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="deviceId"
                  type="text"
                  placeholder="Auto-detected device ID"
                  value={deviceId}
                  onChange={(e) => setDeviceId(e.target.value)}
                  className="pl-10 bg-muted"
                  readOnly
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Device ID is automatically detected for security
              </p>
            </div>
            
            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logging in...
                </>
              ) : (
                'Login as Employee'
              )}
            </Button>
          </form>
          
          <div className="mt-6 space-y-2">
            <p className="text-sm text-center text-muted-foreground">
              Use your assigned Employee ID and Password
            </p>
          </div>

          <div className="mt-4 text-center space-y-2">
            <Button
              variant="link"
              size="sm"
              onClick={() => navigate('/supervisor-login')}
              className="text-green-600 hover:text-green-700"
            >
              Supervisor Login →
            </Button>
            <br />
            <Button
              variant="link"
              size="sm"
              onClick={() => navigate('/login')}
              className="text-gray-600 hover:text-gray-700"
            >
              ← Back to Main Login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
