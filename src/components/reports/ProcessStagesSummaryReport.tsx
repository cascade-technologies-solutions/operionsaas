import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Download, 
  FileSpreadsheet, 
  FileText, 
  RefreshCw, 
  Calendar,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Printer
} from 'lucide-react';
import { reportsService, ReportFilters } from '@/services/api/reports.service';
import { ProcessStagesSummaryReport, ProductSummary, ProcessSummary } from '@/types';
import { toast } from 'sonner';

interface ProcessStagesSummaryReportProps {
  className?: string;
  showFilters?: boolean;
  showExport?: boolean;
  showPrint?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function ProcessStagesSummaryReport({
  className = '',
  showFilters = true,
  showExport = true,
  showPrint = true,
  autoRefresh = false,
  refreshInterval = 30000
}: ProcessStagesSummaryReportProps) {
  const [reportData, setReportData] = useState<ProcessStagesSummaryReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState<ReportFilters>({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    viewType: 'product'
  });

  const loadReport = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const data = await reportsService.getProcessStagesSummary(filters);
      setReportData(data);
    } catch (error) {
      console.error('Error loading process stages summary:', error);
      toast.error('Failed to load process stages summary');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [filters]);

  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(() => {
        loadReport(true);
      }, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  const handleExport = async (format: 'pdf' | 'excel') => {
    try {
      const blob = await reportsService.exportProcessStagesSummary(filters, format);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `process-stages-summary-${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success(`${format.toUpperCase()} report downloaded successfully`);
    } catch (error) {
      console.error('Error exporting report:', error);
      toast.error(`Failed to export ${format.toUpperCase()} report`);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency >= 100) return 'text-green-600';
    if (efficiency >= 80) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getAvailabilityStatus = (available: number, achieved: number) => {
    if (available === 0) return { status: 'empty', color: 'bg-red-100 text-red-800' };
    if (available < achieved * 0.1) return { status: 'low', color: 'bg-yellow-100 text-yellow-800' };
    return { status: 'good', color: 'bg-green-100 text-green-800' };
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading process stages summary...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={className}>
      {/* Filters */}
      {showFilters && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Report Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="viewType">View Type</Label>
                <Select
                  value={filters.viewType}
                  onValueChange={(value: 'product' | 'process') => setFilters(prev => ({ ...prev, viewType: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="product">Product-centric</SelectItem>
                    <SelectItem value="process">Process-centric</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button 
                  onClick={() => loadReport(true)} 
                  disabled={refreshing}
                  className="w-full"
                >
                  {refreshing ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Refresh
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      {reportData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Achieved</p>
                  <p className="text-2xl font-bold">{reportData.grandTotals.totalAchieved.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <AlertTriangle className="h-8 w-8 text-red-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Rejected</p>
                  <p className="text-2xl font-bold">{reportData.grandTotals.totalRejected.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Available</p>
                  <p className="text-2xl font-bold">{reportData.grandTotals.totalAvailable.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Overall Efficiency</p>
                  <p className="text-2xl font-bold">
                    {reportData.grandTotals.totalAchieved + reportData.grandTotals.totalRejected > 0 
                      ? ((reportData.grandTotals.totalAchieved / (reportData.grandTotals.totalAchieved + reportData.grandTotals.totalRejected)) * 100).toFixed(1)
                      : 0}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Export and Print Buttons */}
      {(showExport || showPrint) && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-2">
              {showExport && (
                <>
                  <Button onClick={() => handleExport('excel')} variant="outline">
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Export Excel
                  </Button>
                  <Button onClick={() => handleExport('pdf')} variant="outline">
                    <FileText className="h-4 w-4 mr-2" />
                    Export PDF
                  </Button>
                </>
              )}
              {showPrint && (
                <Button onClick={handlePrint} variant="outline">
                  <Printer className="h-4 w-4 mr-2" />
                  Print Report
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Report Data */}
      {reportData && (
        <Tabs value={reportData.viewType} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="product">Product View</TabsTrigger>
            <TabsTrigger value="process">Process View</TabsTrigger>
          </TabsList>

          <TabsContent value="product" className="space-y-4">
            {reportData.products && reportData.products.length > 0 ? (
              reportData.products.map((product: ProductSummary) => (
                <Card key={product.productId}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{product.productCode} - {product.productName}</span>
                      <div className="flex gap-2">
                        <Badge variant="outline">
                          {product.processes.length} Process{product.processes.length !== 1 ? 'es' : ''}
                        </Badge>
                        <Badge className={getAvailabilityStatus(product.totals.totalAvailable, product.totals.totalAchieved).color}>
                          {getAvailabilityStatus(product.totals.totalAvailable, product.totals.totalAchieved).status}
                        </Badge>
                      </div>
                    </CardTitle>
                    <CardDescription>
                      Total: {product.totals.totalAchieved.toLocaleString()} achieved, {product.totals.totalRejected.toLocaleString()} rejected, {product.totals.totalAvailable.toLocaleString()} available
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Process</TableHead>
                          <TableHead>Stage Order</TableHead>
                          <TableHead>Achieved</TableHead>
                          <TableHead>Rejected</TableHead>
                          <TableHead>Available</TableHead>
                          <TableHead>Target</TableHead>
                          <TableHead>Efficiency</TableHead>
                          <TableHead>Work Entries</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {product.processes
                          .sort((a, b) => (a.stageOrder || 0) - (b.stageOrder || 0))
                          .map((process) => (
                          <TableRow key={process.processId}>
                            <TableCell className="font-medium">{process.processName}</TableCell>
                            <TableCell>{process.stageOrder}</TableCell>
                            <TableCell>{process.achievedQuantity.toLocaleString()}</TableCell>
                            <TableCell>{process.rejectedQuantity.toLocaleString()}</TableCell>
                            <TableCell>
                              <Badge className={getAvailabilityStatus(process.availableQuantity, process.achievedQuantity).color}>
                                {process.availableQuantity.toLocaleString()}
                              </Badge>
                            </TableCell>
                            <TableCell>{process.targetQuantity.toLocaleString()}</TableCell>
                            <TableCell className={getEfficiencyColor(process.efficiency)}>
                              {process.efficiency.toFixed(1)}%
                            </TableCell>
                            <TableCell>{process.workEntryCount}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-gray-500">No product data available for the selected date range.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="process" className="space-y-4">
            {reportData.processes && reportData.processes.length > 0 ? (
              reportData.processes.map((process: ProcessSummary) => (
                <Card key={process.processId}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{process.processName} (Stage {process.stageOrder})</span>
                      <div className="flex gap-2">
                        <Badge variant="outline">
                          {process.products.length} Product{process.products.length !== 1 ? 's' : ''}
                        </Badge>
                        <Badge className={getAvailabilityStatus(process.totals.totalAvailable, process.totals.totalAchieved).color}>
                          {getAvailabilityStatus(process.totals.totalAvailable, process.totals.totalAchieved).status}
                        </Badge>
                      </div>
                    </CardTitle>
                    <CardDescription>
                      Total: {process.totals.totalAchieved.toLocaleString()} achieved, {process.totals.totalRejected.toLocaleString()} rejected, {process.totals.totalAvailable.toLocaleString()} available
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>Achieved</TableHead>
                          <TableHead>Rejected</TableHead>
                          <TableHead>Available</TableHead>
                          <TableHead>Target</TableHead>
                          <TableHead>Efficiency</TableHead>
                          <TableHead>Work Entries</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {process.products.map((product) => (
                          <TableRow key={product.productId}>
                            <TableCell className="font-medium">
                              {product.productCode} - {product.productName}
                            </TableCell>
                            <TableCell>{product.achievedQuantity.toLocaleString()}</TableCell>
                            <TableCell>{product.rejectedQuantity.toLocaleString()}</TableCell>
                            <TableCell>
                              <Badge className={getAvailabilityStatus(product.availableQuantity, product.achievedQuantity).color}>
                                {product.availableQuantity.toLocaleString()}
                              </Badge>
                            </TableCell>
                            <TableCell>{product.targetQuantity.toLocaleString()}</TableCell>
                            <TableCell className={getEfficiencyColor(product.efficiency)}>
                              {product.efficiency.toFixed(1)}%
                            </TableCell>
                            <TableCell>{product.workEntryCount}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-gray-500">No process data available for the selected date range.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
