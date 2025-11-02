import React from 'react';
import { useAuthStore } from '@/stores/authStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';

export const AuthDebug: React.FC = () => {
  const { user, accessToken, refreshToken, isAuthenticated, isInitialized } = useAuthStore();

  const getTokenStatus = () => {
    if (!accessToken) return { status: 'missing', color: 'bg-red-100 text-red-800', icon: XCircle };
    if (accessToken.length < 10) return { status: 'invalid', color: 'bg-yellow-100 text-yellow-800', icon: AlertTriangle };
    return { status: 'valid', color: 'bg-green-100 text-green-800', icon: CheckCircle };
  };

  const getRefreshTokenStatus = () => {
    if (!refreshToken) return { status: 'missing', color: 'bg-red-100 text-red-800', icon: XCircle };
    if (refreshToken.length < 10) return { status: 'invalid', color: 'bg-yellow-100 text-yellow-800', icon: AlertTriangle };
    return { status: 'valid', color: 'bg-green-100 text-green-800', icon: CheckCircle };
  };

  const accessTokenStatus = getTokenStatus();
  const refreshTokenStatus = getRefreshTokenStatus();

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Authentication Debug
        </CardTitle>
        <CardDescription>
          Current authentication status and token information
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <h3 className="font-semibold">Authentication Status</h3>
            <div className="flex items-center gap-2">
              {isAuthenticated ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
              <span>Authenticated: {isAuthenticated ? 'Yes' : 'No'}</span>
            </div>
            <div className="flex items-center gap-2">
              {isInitialized ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
              <span>Initialized: {isInitialized ? 'Yes' : 'No'}</span>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">User Information</h3>
            <div className="flex items-center gap-2">
              {user ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
              <span>User: {user ? 'Loaded' : 'Not loaded'}</span>
            </div>
            {user && (
              <div className="text-sm text-muted-foreground">
                <div>Role: {user.role}</div>
                <div>Factory ID: {user.factoryId}</div>
                <div>Active: {user.isActive ? 'Yes' : 'No'}</div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="font-semibold">Token Status</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <accessTokenStatus.icon className="h-4 w-4" />
              <Badge className={accessTokenStatus.color}>
                Access Token: {accessTokenStatus.status}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <refreshTokenStatus.icon className="h-4 w-4" />
              <Badge className={refreshTokenStatus.color}>
                Refresh Token: {refreshTokenStatus.status}
              </Badge>
            </div>
          </div>
        </div>

        {accessToken && (
          <div className="space-y-2">
            <h3 className="font-semibold">Token Details</h3>
            <div className="text-xs bg-gray-100 p-2 rounded overflow-auto">
              <div>Access Token: {accessToken.substring(0, 20)}...</div>
              <div>Refresh Token: {refreshToken?.substring(0, 20)}...</div>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button 
            onClick={() => window.location.reload()} 
            variant="outline" 
            size="sm"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Page
          </Button>
          <Button 
            onClick={() => {
              localStorage.clear();
              window.location.reload();
            }} 
            variant="destructive" 
            size="sm"
          >
            Clear Storage & Reload
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
