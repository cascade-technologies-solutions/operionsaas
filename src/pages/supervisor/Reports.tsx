import { useState, useEffect, useCallback } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  FileText, 
  Download, 
  Search,
  Calendar as CalendarIcon,
  Loader2,
  X,
  Package,
  Settings
} from 'lucide-react';
import { format as dateFnsFormat, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { toast } from 'sonner';
import { reportsService } from '@/services/api/reports.service';
import { productService } from '@/services/api/product.service';
import { processService } from '@/services/api/process.service';
import { useAuthStore } from '@/stores/authStore';
import { Label } from '@/components/ui/label';
import { Product, Process } from '@/types';

interface ReportDataRow {
  date: string;
  processStageId?: string;
  processStageName?: string;
  stageOrder?: number;
  totalAchieved: number;
  totalRejected: number;
  machines: string[];
  machinesUsed: string;
  efficiency: number;
  target: number;
}

export default function Reports() {
  const { user } = useAuthStore();
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'product' | 'process' | null>(null);
  const [selectedItem, setSelectedItem] = useState<Product | Process | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // Filter state
  const [dateFilter, setDateFilter] = useState<'daily' | 'weekly' | 'monthly' | 'yearly' | 'all'>('all');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  
  // Data state
  const [products, setProducts] = useState<Product[]>([]);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [reportData, setReportData] = useState<ReportDataRow[]>([]);
  const [searchName, setSearchName] = useState('');
  
  // Loading states
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [dropdownLoading, setDropdownLoading] = useState(false);

  // Load products and processes for search
  const loadDropdownData = useCallback(async () => {
    if (!user?.factoryId) return;
    
    setDropdownLoading(true);
    try {
      const [productsResponse, processesResponse] = await Promise.all([
        productService.getProducts(),
        processService.getProcesses(),
      ]);

      const productsData = productsResponse.data || [];
      const processesData = processesResponse.data || [];

      setProducts(productsData);
      setProcesses(processesData);
    } catch (error) {
      console.error('Error loading dropdown data:', error);
      toast.error('Failed to load products and processes');
    } finally {
      setDropdownLoading(false);
    }
  }, [user?.factoryId]);

  useEffect(() => {
    loadDropdownData();
  }, [loadDropdownData]);

  // Filter suggestions based on search query
  const filteredItems = searchQuery.trim()
    ? [
        ...products
          .filter(p => 
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.code?.toLowerCase().includes(searchQuery.toLowerCase())
          )
          .map(p => ({ ...p, type: 'product' as const })),
        ...processes
          .filter(p => 
            p.name.toLowerCase().includes(searchQuery.toLowerCase())
          )
          .map(p => ({ ...p, type: 'process' as const }))
      ].slice(0, 10)
    : [];

  // Handle search
  const handleSearch = useCallback(async () => {
    if (!selectedItem || !searchType) {
      toast.error('Please select a product or process stage');
      return;
    }

    setSearchLoading(true);
    try {
      // Calculate date range based on filter
      let startDate: string | undefined;
      let endDate: string | undefined;

      if (dateFilter !== 'all' && selectedDate) {
        const date = selectedDate;
        switch (dateFilter) {
          case 'daily': {
            startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString();
            const nextDay = new Date(date);
            nextDay.setDate(nextDay.getDate() + 1);
            endDate = nextDay.toISOString();
            break;
          }
          case 'weekly': {
            startDate = startOfWeek(date).toISOString();
            endDate = endOfWeek(date).toISOString();
            break;
          }
          case 'monthly': {
            startDate = startOfMonth(date).toISOString();
            endDate = endOfMonth(date).toISOString();
            break;
          }
          case 'yearly': {
            startDate = startOfYear(date).toISOString();
            endDate = endOfYear(date).toISOString();
            break;
          }
        }
      }

      const itemId = selectedItem._id || selectedItem.id;
      if (!itemId) {
        toast.error('Invalid item selected');
        return;
      }

      const result = await reportsService.searchProductionReport({
        searchType,
        searchId: itemId,
        dateFilter: dateFilter !== 'all' ? dateFilter : undefined,
        startDate,
        endDate
      });


      const dataArray = Array.isArray(result.data) ? result.data : [];
      setReportData(dataArray);
      setSearchName(result.searchName || '');
      
      if (dataArray.length === 0) {
        toast.warning('No data found for the selected criteria');
      } else {
        toast.success(`Report data loaded: ${dataArray.length} records found`);
      }
    } catch (error) {
      console.error('Error searching report:', error);
      toast.error('Failed to load report data');
    } finally {
      setSearchLoading(false);
    }
  }, [selectedItem, searchType, dateFilter, selectedDate]);

  // Handle export
  const handleExport = async (format: 'pdf' | 'excel') => {
    if (!selectedItem || !searchType) {
      toast.error('Please search for a product or process first');
      return;
    }
    
    setLoading(true);
    try {
      let startDate: string | undefined;
      let endDate: string | undefined;

      if (dateFilter !== 'all' && selectedDate) {
        const date = selectedDate;
        switch (dateFilter) {
          case 'daily': {
            startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString();
            const nextDay = new Date(date);
            nextDay.setDate(nextDay.getDate() + 1);
            endDate = nextDay.toISOString();
            break;
          }
          case 'weekly': {
            startDate = startOfWeek(date).toISOString();
            endDate = endOfWeek(date).toISOString();
            break;
          }
          case 'monthly': {
            startDate = startOfMonth(date).toISOString();
            endDate = endOfMonth(date).toISOString();
            break;
          }
          case 'yearly': {
            startDate = startOfYear(date).toISOString();
            endDate = endOfYear(date).toISOString();
            break;
          }
        }
      }

      const itemId = selectedItem._id || selectedItem.id;
      if (!itemId) {
        toast.error('Invalid item selected');
        return;
      }

      const blob = await reportsService.exportSearchReport({
        searchType,
        searchId: itemId,
        dateFilter: dateFilter !== 'all' ? dateFilter : undefined,
        startDate,
        endDate
      }, format);
      
      // Validate blob before creating object URL
      if (!(blob instanceof Blob)) {
        console.error('Invalid blob received:', blob);
        throw new Error('Invalid file response from server');
      }
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const fileName = `production-report-${searchType}-${searchName.replace(/[^a-z0-9]/gi, '-')}-${Date.now()}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }, 100);
      
      toast.success(`Report exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Error exporting report:', error);
      toast.error('Failed to export report');
    } finally {
      setLoading(false);
    }
  };

  // Handle item selection from suggestions
  const handleSelectItem = (item: Product | Process, type: 'product' | 'process') => {
    setSelectedItem(item);
    setSearchType(type);
    setSearchQuery(type === 'product' 
      ? `${(item as Product).code || ''} - ${item.name}`.trim()
      : item.name
    );
    setShowSuggestions(false);
  };

  // Clear search
  const handleClearSearch = () => {
    setSearchQuery('');
    setSelectedItem(null);
    setSearchType(null);
    setReportData([]);
    setSearchName('');
  };

  return (
    <Layout title="Supervisor's Reports">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Supervisor's Reports</h1>
            <p className="text-muted-foreground">
              Search for a product or process stage to view production data
            </p>
          </div>
        </div>

        {/* Search Section */}
        <Card>
          <CardHeader>
            <CardTitle>Search Production Data</CardTitle>
            <CardDescription>
              Search by product or process stage to view detailed production reports
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search Input */}
            <div className="space-y-2">
              <Label htmlFor="search">Search Product or Process Stage</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSuggestions(true);
                    if (!e.target.value.trim()) {
                      handleClearSearch();
                    }
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder="Type to search for products or process stages..."
                  className="pl-10 pr-10"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                    onClick={handleClearSearch}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
                
                {/* Suggestions Dropdown */}
                {showSuggestions && filteredItems.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-auto">
                    {filteredItems.map((item, idx) => (
                      <button
                        key={`${item.type}-${item._id || item.id || idx}`}
                        className="w-full text-left px-4 py-2 hover:bg-accent focus:bg-accent focus:outline-none"
                        onClick={() => handleSelectItem(item, item.type)}
                      >
                        <div className="flex items-center gap-2">
                          {item.type === 'product' ? (
                            <Package className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Settings className="h-4 w-4 text-muted-foreground" />
                          )}
                          <div>
                            <div className="font-medium">{item.name}</div>
                            {item.type === 'product' && (item as Product).code && (
                              <div className="text-sm text-muted-foreground">
                                Code: {(item as Product).code}
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {selectedItem && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Selected: </span>
                  <span className="font-medium">{searchQuery}</span>
                </div>
              )}
            </div>

            {/* Date Filter */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dateFilter">Date Filter</Label>
                <Select 
                  value={dateFilter} 
                  onValueChange={(value: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'all') => {
                    setDateFilter(value);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Dates</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date Picker */}
              {dateFilter !== 'all' && (
                <div className="space-y-2">
                  <Label htmlFor="date">Select Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? dateFnsFormat(selectedDate, 'PPP') : 'Pick a date'}
            </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>

            {/* Search Button */}
            <div className="flex gap-2">
            <Button 
                onClick={handleSearch} 
                disabled={!selectedItem || searchLoading}
                className="flex-1"
              >
                {searchLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Search
                  </>
                )}
            </Button>
          </div>
          </CardContent>
        </Card>

        {/* Results Table */}
        {reportData.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-lg sm:text-xl">Production Report: {searchName}</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    {dateFilter !== 'all' 
                      ? `Date Filter: ${dateFilter.charAt(0).toUpperCase() + dateFilter.slice(1)}`
                      : 'Date Range: All Dates'
                    }
                  </CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    onClick={() => handleExport('excel')}
                    disabled={loading}
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export Excel
                  </Button>
                  <Button
                    onClick={() => handleExport('pdf')}
                    disabled={loading}
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Export PDF
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[100px]">Date</TableHead>
                      {searchType === 'product' && (
                        <>
                          <TableHead className="min-w-[120px]">Process Stage</TableHead>
                          <TableHead className="min-w-[60px]">Order</TableHead>
                        </>
                      )}
                      <TableHead className="min-w-[100px] whitespace-nowrap">Total Achieved</TableHead>
                      <TableHead className="min-w-[100px] whitespace-nowrap">Total Rejected</TableHead>
                      <TableHead className="min-w-[120px] whitespace-nowrap">Machines Used</TableHead>
                      <TableHead className="min-w-[100px]">Efficiency %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.map((row, idx) => (
                      <TableRow key={`${row.date}-${row.processStageId || ''}-${idx}`}>
                        <TableCell className="font-medium whitespace-nowrap">{dateFnsFormat(new Date(row.date), 'MMM dd, yyyy')}</TableCell>
                        {searchType === 'product' && (
                          <>
                            <TableCell className="whitespace-nowrap">{row.processStageName || 'N/A'}</TableCell>
                            <TableCell>{row.stageOrder || '-'}</TableCell>
                          </>
                        )}
                        <TableCell className="font-medium whitespace-nowrap">{row.totalAchieved.toLocaleString()}</TableCell>
                        <TableCell className="text-red-600 whitespace-nowrap">{row.totalRejected.toLocaleString()}</TableCell>
                        <TableCell className="text-sm whitespace-nowrap">{row.machinesUsed}</TableCell>
                        <TableCell className="whitespace-nowrap">{row.efficiency.toFixed(2)}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!searchLoading && reportData.length === 0 && selectedItem && (
            <Card>
            <CardContent className="py-10 text-center">
              <p className="text-muted-foreground">
                No data found for the selected criteria. Try adjusting your filters or search again.
              </p>
              </CardContent>
            </Card>
        )}
      </div>
    </Layout>
  );
}
