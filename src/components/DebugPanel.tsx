import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/stores/authStore';
import { useTenant } from '@/contexts/TenantContext';
import { userService } from '@/services/api/user.service';
import { factoryService } from '@/services/api/factory.service';
import { Bug, RefreshCw, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { AuthDebug } from './AuthDebug';

interface DebugPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DebugPanel: React.FC<DebugPanelProps> = ({ isOpen, onClose }) => {
  const { user, isAuthenticated } = useAuthStore();
  const { currentFactory, factoryId } = useTenant();
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const runDiagnostics = async () => {
    setIsLoading(true);
    try {
      const diagnostics = {
        timestamp: new Date().toISOString(),
        auth: {
          isAuthenticated,
          user: user ? {
            id: user._id || user.id,
            role: user.role,
            factoryId: user.factoryId,
            isActive: user.isActive
          } : null
        },
        tenant: {
          currentFactory: currentFactory ? {
            id: currentFactory._id || currentFactory.id,
            name: currentFactory.name,
            isActive: currentFactory.isActive
          } : null,
          factoryId
        },
        api: {
          employees: null,
          factory: null,
          errors: []
        }
      };

      // Test employees API
      try {
        const employeesResponse = await userService.getEmployees();
        diagnostics.api.employees = {
          success: true,
          data: employeesResponse.data,
          count: Array.isArray(employeesResponse.data) ? employeesResponse.data.length : 0
        };
      } catch (error) {
        diagnostics.api.employees = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
        diagnostics.api.errors.push('Employees API failed');
      }

      // Test factory API
      if (factoryId) {
        try {
          const factoryResponse = await factoryService.getFactory(factoryId);
          diagnostics.api.factory = {
            success: true,
            data: factoryResponse
          };
        } catch (error) {
          diagnostics.api.factory = {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
          diagnostics.api.errors.push('Factory API failed');
        }
      }

      setDebugInfo(diagnostics);
    } catch (error) {
      console.error('Diagnostics failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      runDiagnostics();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-4xl max-h-[80vh] overflow-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bug className="h-5 w-5" />
            Debug Panel
          </CardTitle>
          <CardDescription>
            System diagnostics and API status
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={runDiagnostics} disabled={isLoading} size="sm">
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Run Diagnostics
            </Button>
            <Button onClick={onClose} variant="outline" size="sm">
              Close
            </Button>
          </div>

          <AuthDebug />

          {debugInfo && (
            <div className="space-y-4">
              {/* Auth Status */}
              <div>
                <h3 className="font-semibold mb-2">Authentication</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    {debugInfo.auth.isAuthenticated ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span>Authenticated: {debugInfo.auth.isAuthenticated ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {debugInfo.auth.user ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span>User: {debugInfo.auth.user ? 'Loaded' : 'Not loaded'}</span>
                  </div>
                </div>
                {debugInfo.auth.user && (
                  <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
                    {JSON.stringify(debugInfo.auth.user, null, 2)}
                  </pre>
                )}
              </div>

              {/* Tenant Status */}
              <div>
                <h3 className="font-semibold mb-2">Tenant Context</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    {debugInfo.tenant.currentFactory ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span>Factory: {debugInfo.tenant.currentFactory ? 'Loaded' : 'Not loaded'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {debugInfo.tenant.factoryId ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span>Factory ID: {debugInfo.tenant.factoryId || 'None'}</span>
                  </div>
                </div>
              </div>

              {/* API Status */}
              <div>
                <h3 className="font-semibold mb-2">API Status</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {debugInfo.api.employees?.success ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span>Employees API: {debugInfo.api.employees?.success ? 'Success' : 'Failed'}</span>
                    {debugInfo.api.employees?.success && (
                      <Badge variant="outline" className="text-xs">
                        {debugInfo.api.employees.count} employees
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {debugInfo.api.factory?.success ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span>Factory API: {debugInfo.api.factory?.success ? 'Success' : 'Failed'}</span>
                  </div>
                </div>
              </div>

              {/* Errors */}
              {debugInfo.api.errors.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2 text-red-600">Errors</h3>
                  <div className="space-y-1">
                    {debugInfo.api.errors.map((error: string, index: number) => (
                      <div key={index} className="flex items-center gap-2 text-sm text-red-600">
                        <AlertTriangle className="h-4 w-4" />
                        <span>{error}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Raw Data */}
              <details className="mt-4">
                <summary className="cursor-pointer font-semibold">Raw Debug Data</summary>
                <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-40">
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
