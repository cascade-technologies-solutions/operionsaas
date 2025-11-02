import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Download, 
  FileText, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Activity
} from 'lucide-react';
import { ProductProcessStagesReport, ProductProcessStagesData, ProcessStageData } from '@/types';
import { reportsService } from '@/services/api';
import { toast } from 'sonner';

interface ProductProcessStagesTableProps {
  filters: {
    startDate?: string;
    endDate?: string;
    factoryId?: string;
    realtime?: boolean;
  };
  showExport?: boolean;
  showRefresh?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export default function ProductProcessStagesTable({
  filters,
  showExport = true,
  showRefresh = true,
  autoRefresh = false,
  refreshInterval = 5000
}: ProductProcessStagesTableProps) {
  const [data, setData] = useState<ProductProcessStagesReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await reportsService.getProductProcessStages(filters);
      setData(response);
    } catch (error) {
      console.error('Error loading product process stages:', error);
      toast.error('Failed to load data');
      // Set empty data to prevent white screen
      setData({
        products: [],
        grandTotals: {
          totalAchieved: 0,
          totalRejected: 0,
          totalAvailable: 0,
          totalTarget: 0
        },
        activeSessions: [],
        lastUpdated: new Date().toISOString(),
        realtime: false
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filters]);

  useEffect(() => {
    if (autoRefresh && filters.realtime) {
      const interval = setInterval(loadData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, filters.realtime, refreshInterval]);

  const handleExport = async (format: 'pdf' | 'excel') => {
    try {
      setExporting(true);
      const blob = await reportsService.exportProductProcessStages(filters, format);
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `product-process-stages-${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success(`Report exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export report');
    } finally {
      setExporting(false);
    }
  };

  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency >= 90) return 'text-green-600';
    if (efficiency >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getEfficiencyBadge = (efficiency: number) => {
    if (efficiency >= 90) return <Badge variant="default" className="bg-green-100 text-green-800">Excellent</Badge>;
    if (efficiency >= 70) return <Badge variant="default" className="bg-yellow-100 text-yellow-800">Good</Badge>;
    return <Badge variant="destructive">Needs Attention</Badge>;
  };

  const getAvailabilityWarning = (available: number, target: number) => {
    if (available < target * 0.1) return <AlertTriangle className="h-4 w-4 text-red-500" />;
    if (available < target * 0.3) return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    return <CheckCircle className="h-4 w-4 text-green-500" />;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            <span>Loading product process stages...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Fallback for when data is null
  if (!data) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No data available</p>
            <Button onClick={loadData} className="mt-4">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.products.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No product process stages data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Grand Totals */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Production Overview
            </div>
            <div className="flex items-center gap-2">
              {filters.realtime && (
                <Badge variant="outline" className="animate-pulse">
                  <Clock className="h-3 w-3 mr-1" />
                  Live
                </Badge>
              )}
              {showRefresh && (
                <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              )}
              {showExport && (
                <>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleExport('excel')}
                    disabled={exporting}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Excel
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleExport('pdf')}
                    disabled={exporting}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    PDF
                  </Button>
                </>
              )}
            </div>
          </CardTitle>
          <CardDescription>
            {filters.realtime ? 'Real-time production data' : 'Historical production data'}
            {data.lastUpdated && (
              <span className="ml-2 text-xs">
                Last updated: {new Date(data.lastUpdated).toLocaleTimeString()}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {data.grandTotals.totalAchieved.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">Total Achieved</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {data.grandTotals.totalRejected.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">Total Rejected</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {data.grandTotals.totalAvailable.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">Total Available</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {data.grandTotals.totalTarget.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">Total Target</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Sessions */}
      {data.activeSessions && data.activeSessions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Active Work Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.activeSessions.map((session, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <div>
                      <p className="font-medium">{session.employeeName}</p>
                      <p className="text-sm text-muted-foreground">
                        {session.productName} - {session.processName}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {session.currentAchieved} achieved, {session.currentRejected} rejected
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Started: {new Date(session.startTime).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Product Tables */}
      {data.products.map((product: ProductProcessStagesData) => (
        <Card key={product.productId}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>{product.productCode} - {product.productName}</span>
                {product.processes.some(p => p.activeWorkSessions && p.activeWorkSessions > 0) && (
                  <Badge variant="outline" className="animate-pulse">
                    <Activity className="h-3 w-3 mr-1" />
                    Active
                  </Badge>
                )}
              </div>
              <div className="text-sm text-muted-foreground">
                Total: {product.totals.totalAchieved} achieved, {product.totals.totalRejected} rejected
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Process</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Achieved</TableHead>
                  <TableHead>Rejected</TableHead>
                  <TableHead>Available</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Efficiency</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {product.processes
                  .sort((a, b) => (a.stageOrder || 0) - (b.stageOrder || 0))
                  .map((process: ProcessStageData) => (
                  <TableRow key={process.processId}>
                    <TableCell className="font-medium">{process.processName}</TableCell>
                    <TableCell>{process.stageOrder}</TableCell>
                    <TableCell className="text-green-600 font-medium">
                      {process.achievedQuantity.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-red-600 font-medium">
                      {process.rejectedQuantity.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getAvailabilityWarning(process.availableQuantity, process.targetQuantity)}
                        <span className="font-medium">{process.availableQuantity.toLocaleString()}</span>
                      </div>
                    </TableCell>
                    <TableCell>{process.targetQuantity.toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${getEfficiencyColor(process.efficiency)}`}>
                          {process.efficiency.toFixed(1)}%
                        </span>
                        {getEfficiencyBadge(process.efficiency)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {process.activeWorkSessions && process.activeWorkSessions > 0 && (
                          <Badge variant="outline" className="animate-pulse">
                            <Activity className="h-3 w-3 mr-1" />
                            {process.activeWorkSessions} active
                          </Badge>
                        )}
                        {process.latestEntry && (
                          <span className="text-xs text-muted-foreground">
                            Last: {new Date(process.latestEntry).toLocaleTimeString()}
                          </span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
