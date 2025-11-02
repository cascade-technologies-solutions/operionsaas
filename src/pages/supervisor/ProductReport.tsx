import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Calendar, Download, Filter } from 'lucide-react';
import { productService, workEntryService } from '@/services/api';
import { Product } from '@/types';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';

interface ProcessData {
  name: string;
  achieved: number;
  rejected: number;
  entries: Array<{
    employeeName: string;
    achieved: number;
    rejected: number;
    startTime: Date;
    endTime?: Date;
  }>;
}

interface ReportData {
  date: string;
  [key: string]: string | ProcessData;
}

interface ProductReportData {
  product: {
    id: string;
    name: string;
    code: string;
    dailyTarget: number;
  };
  processes: Array<{
    id: string;
    name: string;
    order: number;
  }>;
  reportData: ReportData[];
  dateRange: {
    start: Date;
    end: Date;
  };
}

export default function ProductReport() {
  const { user } = useAuthStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [period, setPeriod] = useState('weekly');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportData, setReportData] = useState<ProductReportData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const response = await productService.getProducts();
      const productsData = (response as any).products || (response as any).data?.products || (response as any).data || [];
      setProducts(productsData);
    } catch (error) {
      console.error('Failed to load products:', error);
      toast.error('Failed to load products');
    }
  };

  const handleSearch = async () => {
    if (!selectedProduct) {
      toast.error('Please select a product');
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (period !== 'custom') {
        params.append('period', period);
      } else if (startDate && endDate) {
        params.append('startDate', startDate);
        params.append('endDate', endDate);
      }

      const response = await workEntryService.getProductReport(selectedProduct, params.toString());
      setReportData(response);
    } catch (error) {
      console.error('Failed to load report:', error);
      toast.error('Failed to load product report');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(product => 
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const exportToExcel = () => {
    if (!reportData) return;
    
    // Simple CSV export
    const csvContent = generateCSVContent();
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `product-report-${reportData.product.code}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const generateCSVContent = () => {
    if (!reportData) return '';
    
    const headers = ['Date', ...reportData.processes.map(p => `${p.name} (Achieved)`, `${p.name} (Rejected)`).flat()];
    const rows = reportData.reportData.map(row => {
      const date = row.date;
      const processData = reportData.processes.map(process => {
        const processKey = `process_${process.order}`;
        const data = row[processKey] as ProcessData;
        return data ? `${data.achieved},${data.rejected}` : '0,0';
      });
      return [date, ...processData].join(',');
    });
    
    return [headers.join(','), ...rows].join('\n');
  };

  return (
    <Layout title="Product Report">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold">Product Report</h2>
            <p className="text-muted-foreground">View production data by product and process</p>
          </div>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search & Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="search">Search Products</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Search by product name or code..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="product">Select Product</Label>
                <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a product" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredProducts.map((product) => (
                      <SelectItem key={product._id} value={product._id}>
                        {product.name} ({product.code}) - T-{product.dailyTarget || 0}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="period">Time Period</Label>
                <Select value={period} onValueChange={setPeriod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">This Week</SelectItem>
                    <SelectItem value="monthly">This Month</SelectItem>
                    <SelectItem value="yearly">This Year</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {period === 'custom' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate">End Date</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSearch} disabled={loading || !selectedProduct}>
                <Filter className="h-4 w-4 mr-2" />
                {loading ? 'Loading...' : 'Generate Report'}
              </Button>
              {reportData && (
                <Button variant="outline" onClick={exportToExcel}>
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Process Analytics Summary */}
        {reportData && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Process Analytics Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {reportData.processes.map((process) => {
                  // Calculate total achieved and rejected for this process
                  const totalAchieved = reportData.reportData.reduce((sum, row) => {
                    const processKey = `process_${process.order}`;
                    const data = row[processKey] as ProcessData;
                    return sum + (data?.achieved || 0);
                  }, 0);
                  
                  const totalRejected = reportData.reportData.reduce((sum, row) => {
                    const processKey = `process_${process.order}`;
                    const data = row[processKey] as ProcessData;
                    return sum + (data?.rejected || 0);
                  }, 0);
                  
                  const totalQuantity = totalAchieved + totalRejected;
                  const rejectionRate = totalQuantity > 0 ? (totalRejected / totalQuantity) * 100 : 0;
                  
                  return (
                    <div key={process.id} className={`p-4 rounded-lg border ${
                      rejectionRate > 10 ? 'border-red-200 bg-red-50' : 
                      rejectionRate > 5 ? 'border-yellow-200 bg-yellow-50' : 
                      'border-green-200 bg-green-50'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium">{process.name}</h3>
                        <Badge variant={rejectionRate > 10 ? 'destructive' : rejectionRate > 5 ? 'secondary' : 'default'}>
                          Order {process.order}
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>Total Achieved:</span>
                          <span className="font-medium text-green-600">{totalAchieved}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Total Rejected:</span>
                          <span className="font-medium text-red-600">{totalRejected}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Rejection Rate:</span>
                          <span className={`font-medium ${
                            rejectionRate > 10 ? 'text-red-600' : 
                            rejectionRate > 5 ? 'text-yellow-600' : 
                            'text-green-600'
                          }`}>
                            {rejectionRate.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Report Results */}
        {reportData && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Report Results
              </CardTitle>
              <div className="text-sm text-muted-foreground">
                Product: {reportData.product.name} ({reportData.product.code}) - Daily Target: {reportData.product.dailyTarget}
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      {reportData.processes.map((process) => (
                        <TableHead key={process.id} className="text-center">
                          {process.name}
                          <div className="text-xs text-muted-foreground mt-1">
                            (Order: {process.order})
                          </div>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.reportData.map((row, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">
                          {formatDate(row.date)}
                        </TableCell>
                        {reportData.processes.map((process) => {
                          const processKey = `process_${process.order}`;
                          const data = row[processKey] as ProcessData;
                          return (
                            <TableCell key={process.id} className="text-center">
                              {data ? (
                                <div className="space-y-1">
                                  <div className="flex items-center justify-center gap-2">
                                    <Badge variant="outline" className="text-green-600">
                                      {data.achieved}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">achieved</span>
                                  </div>
                                  <div className="flex items-center justify-center gap-2">
                                    <Badge variant="outline" className="text-red-600">
                                      {data.rejected}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">rejected</span>
                                  </div>
                                  {data.achieved + data.rejected > 0 && (
                                    <div className="text-xs text-center">
                                      <span className={`font-medium ${
                                        (data.rejected / (data.achieved + data.rejected)) > 0.1 
                                          ? 'text-red-600' 
                                          : 'text-green-600'
                                      }`}>
                                        {((data.rejected / (data.achieved + data.rejected)) * 100).toFixed(1)}% rejection
                                      </span>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="text-muted-foreground text-sm">
                                  No data
                                </div>
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
