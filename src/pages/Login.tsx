import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Factory, Loader2, Smartphone, User, Lock } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { authService } from '@/services/api';
import { toast } from 'sonner';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuthStore();

  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Determine if input is email or username
      const isEmail = email.includes('@');
      const loginData = isEmail 
        ? { email, password, deviceId }
        : { userId: email, password, deviceId };
      
      const response = await authService.login(loginData);
      login(response.user, response.accessToken);
      
      // Navigate based on role
      switch (response.user.role) {
        case 'super_admin':
          navigate('/super-admin');
          break;
        case 'factory_admin':
          navigate('/admin');
          break;
        case 'supervisor':
          navigate('/supervisor');
          break;
        case 'employee':
          navigate('/employee');
          break;
        default:
          navigate(from);
      }
      
      toast.success('Welcome back, ' + response.user.profile.firstName + '!');
    } catch (err: any) {
      setError(err.message || 'Invalid credentials');
      toast.error('Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-primary/5 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-3">
          <div className="flex items-center justify-center mb-2">
            <div className="p-3 bg-gradient-primary rounded-xl shadow-glow">
              <Factory className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">MFMS Login</CardTitle>
          <CardDescription className="text-center">
            Multi-Tenant Factory Management System
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
              <Label htmlFor="email">Email or Username</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="text"
                  placeholder="Enter your email or username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
              <div className="text-right">
                <Link 
                  to="/forgot-password" 
                  className="text-sm text-blue-600 hover:underline"
                >
                  Forgot Password?
                </Link>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="deviceId">Device ID (Employees only)</Label>
              <div className="relative">
                <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="deviceId"
                  type="text"
                  placeholder="Optional - for employees"
                  value={deviceId}
                  onChange={(e) => setDeviceId(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Button 
              type="submit" 
              className="w-full bg-gradient-primary hover:shadow-glow transition-all"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logging in...
                </>
              ) : (
                'Login'
              )}
            </Button>
          </form>
          
          <div className="mt-6 space-y-2">
            <p className="text-sm text-center text-muted-foreground">
              Use your factory credentials to login
            </p>
          </div>

          <div className="mt-4 text-center space-y-2">
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/supervisor-login')}
                className="text-green-600 hover:text-green-700 border-green-200"
              >
                Supervisor Login
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/employee-login')}
                className="text-blue-600 hover:text-blue-700 border-blue-200"
              >
                Employee Login
              </Button>
            </div>
            <Button
              variant="link"
              size="sm"
              onClick={() => navigate('/super-admin-login')}
              className="text-red-600 hover:text-red-700"
            >
              Super Admin Login →
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
