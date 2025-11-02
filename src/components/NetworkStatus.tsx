import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface NetworkStatusProps {
  showDetails?: boolean;
}

export const NetworkStatus: React.FC<NetworkStatusProps> = ({ showDetails = false }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check server status
    const checkServerStatus = async () => {
      try {
        const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const healthUrl = backendUrl.replace('/api', '') + '/health';
        const response = await fetch(healthUrl, {
          method: 'GET',
          signal: AbortSignal.timeout(5000)
        });
        setServerStatus(response.ok ? 'online' : 'offline');
      } catch (error) {
        setServerStatus('offline');
      }
    };

    checkServerStatus();
    const interval = setInterval(checkServerStatus, 30000); // Check every 30 seconds

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const getStatusColor = () => {
    if (!isOnline) return 'bg-red-100 text-red-800';
    if (serverStatus === 'offline') return 'bg-yellow-100 text-yellow-800';
    if (serverStatus === 'checking') return 'bg-blue-100 text-blue-800';
    return 'bg-green-100 text-green-800';
  };

  const getStatusIcon = () => {
    if (!isOnline) return <WifiOff className="h-3 w-3" />;
    if (serverStatus === 'offline') return <AlertCircle className="h-3 w-3" />;
    return <Wifi className="h-3 w-3" />;
  };

  const getStatusText = () => {
    if (!isOnline) return 'Offline';
    if (serverStatus === 'offline') return 'Server Unavailable';
    if (serverStatus === 'checking') return 'Checking...';
    return 'Connected';
  };

  if (!showDetails) {
    return (
      <Badge className={`${getStatusColor()} text-xs`}>
        {getStatusIcon()}
        <span className="ml-1">{getStatusText()}</span>
      </Badge>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Badge className={`${getStatusColor()} text-xs`}>
          {getStatusIcon()}
          <span className="ml-1">{getStatusText()}</span>
        </Badge>
      </div>
      {showDetails && (
        <div className="text-xs text-muted-foreground">
          <div>Network: {isOnline ? 'Online' : 'Offline'}</div>
          <div>Server: {serverStatus}</div>
        </div>
      )}
    </div>
  );
};
