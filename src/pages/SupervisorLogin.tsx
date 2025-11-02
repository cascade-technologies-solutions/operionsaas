import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { User, Loader2, Lock } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { authService } from '@/services/api';
import { toast } from 'sonner';

export default function SupervisorLogin() {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuthStore();

  const from = location.state?.from?.pathname || '/supervisor';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await authService.login({ userId, password });
      
      if (response.user.role !== 'supervisor') {
        throw new Error('Access denied. Supervisor credentials required.');
      }
      
      login(response.user, response.accessToken);
      navigate('/supervisor');
      toast.success('Welcome back, ' + response.user.profile.firstName + '!');
    } catch (err: any) {
      setError(err.message || 'Invalid credentials');
      toast.error('Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-3">
          <div className="flex items-center justify-center mb-2">
            <div className="p-3 bg-gradient-to-r from-green-500 to-green-600 rounded-xl shadow-lg">
              <User className="h-8 w-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">Supervisor Login</CardTitle>
          <CardDescription className="text-center">
            Enter your Supervisor ID and Password
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
              <Label htmlFor="userId">Supervisor ID</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="userId"
                  type="text"
                  placeholder="Enter your Supervisor ID"
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
            
            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logging in...
                </>
              ) : (
                'Login as Supervisor'
              )}
            </Button>
          </form>
          
          <div className="mt-6 space-y-2">
            <p className="text-sm text-center text-muted-foreground">
              Use your assigned Supervisor ID and Password
            </p>
          </div>

          <div className="mt-4 text-center space-y-2">
            <Button
              variant="link"
              size="sm"
              onClick={() => navigate('/employee-login')}
              className="text-blue-600 hover:text-blue-700"
            >
              Employee Login →
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
