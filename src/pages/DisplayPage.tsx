import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Activity, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Monitor,
  ToggleLeft,
  ToggleRight,
  BarChart3
} from 'lucide-react';
import { DisplayAnalyticsReport, HourlyProductionData, ProductPlanData } from '@/types';
import { reportsService } from '@/services/api';
import { wsService } from '@/services/websocket.service';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function DisplayPage() {
  const [data, setData] = useState<DisplayAnalyticsReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewType, setViewType] = useState<'analytics' | 'table'>('analytics');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await reportsService.getRealtimeDisplay({});
      
      if (response) {
        setData(response);
        setLastUpdated(new Date());
      } else {
        setData({
          products: [],
          grandTotals: {
            totalAchieved: 0,
            totalRejected: 0,
            totalAvailable: 0,
            totalTarget: 0
          },
          activeSessions: [],
          analytics: {
            plan: 0,
            actual: 0,
            expected: 0,
            avgCycleTime: 0,
            totalProducts: 0,
            totalProcesses: 0,
            efficiency: 0
          },
          hourlyData: [],
          productPlanData: [],
          processStagesData: [],
          analyticsGrandTotals: {
            totalPlan: 0,
            totalProduction: 0,
            totalExpected: 0,
            overallAchievement: 0
          },
          lastUpdated: new Date().toISOString(),
          realtime: true
        });
      }
    } catch (error: any) {
      console.error('❌ Error loading realtime display data:', error);
      console.error('❌ Error details:', {
        message: error?.message,
        response: error?.response?.data,
        status: error?.response?.status
      });
      
      setError(error?.response?.data?.message || error?.message || 'Failed to load data');
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
        analytics: {
          plan: 0,
          actual: 0,
          expected: 0,
          avgCycleTime: 0,
          totalProducts: 0,
          totalProcesses: 0,
          efficiency: 0
        },
        hourlyData: [],
        productPlanData: [],
        processStagesData: [],
        analyticsGrandTotals: {
          totalPlan: 0,
          totalProduction: 0,
          totalExpected: 0,
          overallAchievement: 0
        },
        lastUpdated: new Date().toISOString(),
        realtime: true
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial data load
    loadData();

    // Connect to WebSocket for real-time updates
    const connectWebSocket = async () => {
      try {
        await wsService.connect();
        setWsConnected(true);
      } catch (error) {
        console.error('❌ WebSocket connection failed:', error);
        setWsConnected(false);
        // Fallback to polling if WebSocket fails
        const interval = setInterval(() => {
          loadData();
        }, 5000);
        return () => clearInterval(interval);
      }
    };

    // Subscribe to production data updates
    const unsubscribe = wsService.subscribe('production_data_updated', () => {
      loadData();
    });

    connectWebSocket();

    return () => {
      unsubscribe();
      wsService.disconnect();
    };
  }, []);

  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency >= 90) return 'text-green-400';
    if (efficiency >= 70) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getEfficiencyIcon = (efficiency: number) => {
    if (efficiency >= 90) return <CheckCircle className="h-4 w-4 text-green-400" />;
    if (efficiency >= 70) return <AlertTriangle className="h-4 w-4 text-yellow-400" />;
    return <AlertTriangle className="h-4 w-4 text-red-400" />;
  };

  const getAvailabilityIcon = (available: number, target: number) => {
    if (available < target * 0.1) return <AlertTriangle className="h-4 w-4 text-red-500" />;
    if (available < target * 0.3) return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    return <CheckCircle className="h-4 w-4 text-green-500" />;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 animate-spin mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Loading Real-time Data</h2>
          <p className="text-gray-400">Fetching latest production information...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-red-400" />
          <h2 className="text-2xl font-bold mb-2">Error Loading Data</h2>
          <p className="text-gray-400 mb-4">{error}</p>
          <Button onClick={loadData} className="bg-blue-600 hover:bg-blue-700">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <h2 className="text-2xl font-bold mb-2">No Data Available</h2>
          <p className="text-gray-400 mb-4">No production data found for the current period.</p>
          <Button onClick={loadData} className="bg-blue-600 hover:bg-blue-700">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 lg:p-8">
      <div className="w-full max-w-none">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
          <div className="flex-1">
            <h1 className="text-2xl lg:text-4xl font-bold mb-2">IFB PRODUCTION STATUS - FRONT LOADER</h1>
            <p className="text-lg lg:text-xl text-gray-300">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
            {/* WebSocket Status */}

            {/* View Toggle */}
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">Analytics</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewType(viewType === 'analytics' ? 'table' : 'analytics')}
                className="bg-gray-800 border-gray-600 hover:bg-gray-700"
              >
                {viewType === 'analytics' ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
              </Button>
              <span className="text-sm font-medium">Table</span>
            </div>
            
            <Button
              onClick={loadData}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Analytics View */}
        {viewType === 'analytics' ? (
          <>
            {/* Production by Product Analytics Chart */}
            {(data.products || []).map((product: any, productIndex: number) => (
              <Card key={productIndex} className="bg-gray-800 border-gray-700 mb-8">
                <CardHeader>
                  <CardTitle className="text-white text-2xl flex items-center">
                    <BarChart3 className="h-6 w-6 mr-2" />
                    {product.productName} - Production by Date
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Daily production trends for {product.productName}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64 sm:h-80 lg:h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={(product.dailyData || data.hourlyData || []).map((dayData: any, index: number) => {
                        // Handle daily data
                        let date, displayDate;
                        try {
                          if (dayData.date) {
                            const dateObj = new Date(dayData.date);
                            if (!isNaN(dateObj.getTime())) {
                              date = dayData.date;
                              displayDate = dateObj.getDate().toString(); // Show day number (1, 2, 3, etc.)
                            } else {
                              // Fallback if date is invalid
                              date = new Date().toISOString().split('T')[0];
                              displayDate = `${index + 1}`;
                            }
                          } else {
                            // Fallback if no date
                            date = new Date().toISOString().split('T')[0];
                            displayDate = `${index + 1}`;
                          }
                        } catch (error) {
                          // Fallback if any error occurs
                          date = new Date().toISOString().split('T')[0];
                          displayDate = `${index + 1}`;
                        }
                        
                        return {
                          date,
                          displayDate,
                          production: dayData.totalAchieved || dayData.production || 0,
                          rejected: dayData.totalRejected || dayData.rejected || 0,
                          efficiency: dayData.totalTarget > 0 ? (dayData.totalAchieved / dayData.totalTarget) * 100 : 0
                        };
                      })}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis 
                          dataKey="displayDate" 
                          stroke="#9CA3AF"
                          fontSize={12}
                          angle={-45}
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis 
                          stroke="#9CA3AF"
                          fontSize={14}
                          label={{ value: 'Production Count', angle: -90, position: 'insideLeft', style: { fontSize: '14px' } }}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#1F2937', 
                            border: '1px solid #374151',
                            borderRadius: '8px',
                            color: '#F9FAFB'
                          }}
                          formatter={(value, name) => [value, name === 'production' ? 'Production' : 'Rejected']}
                          labelFormatter={(label, payload) => {
                            const data = payload?.[0]?.payload;
                            return data ? `${data.date} - ${label}` : label;
                          }}
                        />
                        <Bar 
                          dataKey="production" 
                          fill="#10B981" 
                          name="production"
                          radius={[2, 2, 0, 0]}
                          maxBarSize={40}
                        />
                        <Bar 
                          dataKey="rejected" 
                          fill="#EF4444" 
                          name="rejected"
                          radius={[2, 2, 0, 0]}
                          maxBarSize={40}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Process Stages Analytics Chart */}
            {(data.products || []).map((product: any, productIndex: number) => (
              <Card key={`process-${productIndex}`} className="bg-gray-800 border-gray-700 mb-8">
                <CardHeader>
                  <CardTitle className="text-white text-2xl flex items-center">
                    <BarChart3 className="h-6 w-6 mr-2" />
                    {product.productName} - Process Stages Analytics
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Achieved vs Rejected quantities by process stage for {product.productName}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64 sm:h-80 lg:h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={(product.processes || []).map((process: any) => ({
                        name: process.processName,
                        processName: process.processName,
                        stageOrder: process.stageOrder,
                        achieved: process.achievedQuantity,
                        rejected: process.rejectedQuantity
                      })).sort((a: any, b: any) => a.stageOrder - b.stageOrder)}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis 
                          dataKey="name" 
                          stroke="#9CA3AF"
                          fontSize={14}
                          angle={-45}
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis 
                          stroke="#9CA3AF"
                          fontSize={14}
                          label={{ value: 'Quantity', angle: -90, position: 'insideLeft', style: { fontSize: '14px' } }}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#1F2937', 
                            border: '1px solid #374151',
                            borderRadius: '8px',
                            color: '#F9FAFB'
                          }}
                          formatter={(value, name) => [value, name === 'achieved' ? 'Achieved' : 'Rejected']}
                          labelFormatter={(label) => `Process: ${label}`}
                        />
                        <Bar 
                          dataKey="achieved" 
                          fill="#10B981" 
                          name="achieved"
                          radius={[2, 2, 0, 0]}
                          maxBarSize={40}
                        />
                        <Bar 
                          dataKey="rejected" 
                          fill="#EF4444" 
                          name="rejected"
                          radius={[2, 2, 0, 0]}
                          maxBarSize={40}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Product Plan Table */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white text-2xl">Production Plan Status</CardTitle>
                <CardDescription className="text-gray-400">
                  Current production vs plan by product
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-600">
                        <TableHead className="text-gray-300 text-xs sm:text-sm">SEQUENCE</TableHead>
                        <TableHead className="text-gray-300 text-xs sm:text-sm">MODEL CODE</TableHead>
                        <TableHead className="text-gray-300 text-xs sm:text-sm">MODEL NAME</TableHead>
                        <TableHead className="text-gray-300 text-xs sm:text-sm">PRODUCTION</TableHead>
                        <TableHead className="text-gray-300 text-xs sm:text-sm">REJECTED</TableHead>
                        <TableHead className="text-gray-300 text-xs sm:text-sm">EFFICIENCY (%)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(data.productPlanData || []).map((product, index) => (
                        <TableRow key={index} className="border-gray-600 hover:bg-gray-700">
                          <TableCell className="text-white font-medium text-xs sm:text-sm">
                            {product.sequence}
                          </TableCell>
                          <TableCell className="text-gray-300 text-xs sm:text-sm">
                            {product.modelCode}
                          </TableCell>
                          <TableCell className="text-white font-medium text-xs sm:text-sm">
                            {product.modelName}
                          </TableCell>
                          <TableCell className="text-green-400 font-bold text-xs sm:text-sm">
                            {product.production}
                          </TableCell>
                          <TableCell className="text-red-400 font-bold text-xs sm:text-sm">
                            {product.rejected}
                          </TableCell>
                          <TableCell className={`font-bold text-xs sm:text-sm ${
                            product.efficiency >= 90 ? 'text-green-400' :
                            product.efficiency >= 70 ? 'text-yellow-400' : 'text-red-400'
                          }`}>
                            {product.efficiency.toFixed(1)}%
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          /* Table View - Original Product Tables */
          <div className="space-y-8">
            {(data.products || []).map((product) => (
              <Card key={product.productId} className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white text-2xl">
                    {product.productName} ({product.productCode})
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Product-wise process stages overview
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-gray-600">
                          <TableHead className="text-gray-300">Process</TableHead>
                          <TableHead className="text-gray-300">Stage</TableHead>
                          <TableHead className="text-gray-300">Achieved</TableHead>
                          <TableHead className="text-gray-300">Rejected</TableHead>
                          <TableHead className="text-gray-300">Available</TableHead>
                          <TableHead className="text-gray-300">Efficiency</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(product.processes || [])
                          .sort((a, b) => (a.stageOrder || 0) - (b.stageOrder || 0))
                          .map((process, index) => (
                          <TableRow key={index} className="border-gray-600 hover:bg-gray-700">
                            <TableCell className="text-white font-medium">
                              {process.processName}
                            </TableCell>
                            <TableCell className="text-gray-300">
                              {process.stageOrder}
                            </TableCell>
                            <TableCell className="text-green-400 font-bold">
                              {process.achievedQuantity}
                            </TableCell>
                            <TableCell className="text-red-400 font-bold">
                              {process.rejectedQuantity}
                            </TableCell>
                            <TableCell className="text-blue-400 font-bold">
                              <div className="flex items-center">
                                {getAvailabilityIcon(process.availableQuantity, process.targetQuantity)}
                                <span className="ml-2">{process.availableQuantity}</span>
                              </div>
                            </TableCell>
                            <TableCell className={`font-bold ${getEfficiencyColor(process.efficiency)}`}>
                              <div className="flex items-center">
                                {getEfficiencyIcon(process.efficiency)}
                                <span className="ml-2">{process.efficiency.toFixed(1)}%</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}