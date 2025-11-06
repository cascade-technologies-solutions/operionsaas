import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Search, 
  Filter,
  Image as ImageIcon,
  User,
  Calendar,
  Package,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { workEntryService } from '@/services/api/workEntry.service';
import { WorkEntry } from '@/types';
import { format } from 'date-fns';
import { wsService } from '@/services/websocket.service';

/**
 * Safely extracts a string value from a potentially nested object structure.
 * Handles cases where the value might be:
 * - null/undefined
 * - a string
 * - an object with a `name` property (which might also be a string or object)
 * - an object with `_id` and `name` properties
 */
const getSafeStringValue = (value: any): string => {
  if (value === null || value === undefined) {
    return '';
  }
  
  // If it's already a string, return it
  if (typeof value === 'string') {
    return value;
  }
  
  // If it's an object, try to extract the name property
  if (typeof value === 'object') {
    // If the object has a `name` property
    if ('name' in value && value.name !== null && value.name !== undefined) {
      const nameValue = value.name;
      // If name is a string, return it
      if (typeof nameValue === 'string') {
        return nameValue;
      }
      // If name is also an object, recursively extract
      if (typeof nameValue === 'object' && nameValue !== null) {
        return getSafeStringValue(nameValue);
      }
    }
    // Fallback: try to get _id or convert to string
    if ('_id' in value && value._id !== null && value._id !== undefined) {
      return String(value._id);
    }
    // Last resort: convert to string (but avoid [object Object])
    try {
      const stringValue = String(value);
      if (stringValue === '[object Object]') {
        return '';
      }
      return stringValue;
    } catch {
      return '';
    }
  }
  
  // For any other type, convert to string
  return String(value);
};

export default function WorkValidation() {
  const [entries, setEntries] = useState<WorkEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedEntry, setSelectedEntry] = useState<WorkEntry | null>(null);
  const [validationNotes, setValidationNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    loadWorkEntries();
  }, []);

  // WebSocket listeners for real-time updates
  useEffect(() => {
    const unsubscribeSubmitted = wsService.subscribe('work_entry_submitted', loadWorkEntries);
    const unsubscribeValidated = wsService.subscribe('work_entry_validated', loadWorkEntries);
    const unsubscribeProduction = wsService.subscribe('production_data_updated', loadWorkEntries);

    return () => {
      unsubscribeSubmitted();
      unsubscribeValidated();
      unsubscribeProduction();
    };
  }, []);

  const loadWorkEntries = async () => {
    setDataLoading(true);
    try {
      const response = await workEntryService.getWorkEntries();
      const workEntries = response.workEntries || [];
      setEntries(workEntries);
    } catch (error) {
      console.error('Failed to load work entries:', error);
      toast.error('Failed to load work entries');
    } finally {
      setDataLoading(false);
    }
  };

  const filteredEntries = entries.filter(entry => {
    const employeeName = `${entry.employeeId?.profile?.firstName || ''} ${entry.employeeId?.profile?.lastName || ''}`.toLowerCase();
    const processName = getSafeStringValue(entry.processId).toLowerCase();
    const productName = getSafeStringValue(entry.productId).toLowerCase();
    
    const matchesSearch = 
      employeeName.includes(searchTerm.toLowerCase()) ||
      productName.includes(searchTerm.toLowerCase()) ||
      processName.includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || entry.validationStatus === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleValidate = async (entryId: string, status: 'approved' | 'rejected', notes: string) => {
    setLoading(true);
    try {
      await workEntryService.validateWorkEntry(entryId, status, notes);
      
      // Optimistic update - update local state immediately
      setEntries(prev => prev.map(entry => 
        entry._id === entryId 
          ? {
              ...entry,
              validationStatus: status,
              validationNotes: notes,
              validatedAt: new Date(),
            }
          : entry
      ));
      
      toast.success(`Work entry ${status} successfully`);
      setValidationNotes('');
      setSelectedEntry(null);
      
      // Refresh work entries to ensure consistency with server
      await loadWorkEntries();
    } catch (error) {
      console.error('Failed to validate work entry:', error);
      toast.error('Failed to validate work entry');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Rejected';
      default:
        return 'Pending';
    }
  };

  if (dataLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <span className="text-lg">Loading work entries...</span>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-2 sm:space-y-4 md:space-y-6 max-w-full overflow-x-hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Work Validation</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Review and validate employee work entries
            </p>
          </div>
        </div>

        {/* Filters */}
        <Card className="overflow-hidden">
          <CardContent className="pt-3 sm:pt-4 md:pt-6 px-3 sm:px-4 md:px-6 pb-3 sm:pb-4 md:pb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 min-w-0">
                <Label htmlFor="search" className="text-sm">Search</Label>
                <div className="relative mt-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Search by employee, product, or process..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 text-sm"
                  />
                </div>
              </div>
              <div className="w-full sm:w-48">
                <Label htmlFor="status-filter" className="text-sm">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Work Entries List */}
        <div className="space-y-2 sm:space-y-3 md:space-y-4 max-w-full">
          {filteredEntries.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No work entries found</h3>
                  <p className="text-muted-foreground">
                    {searchTerm || statusFilter !== 'all' 
                      ? 'Try adjusting your search or filter criteria'
                      : 'No work entries have been submitted yet'
                    }
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            filteredEntries.map((entry) => (
              <Card key={entry._id} className="hover:shadow-md transition-shadow overflow-hidden">
                <CardContent className="pt-3 sm:pt-4 md:pt-6 px-3 sm:px-4 md:px-6 pb-3 sm:pb-4 md:pb-6">
                  <div className="flex flex-col lg:flex-row gap-3 sm:gap-4">
                    {/* Entry Details */}
                    <div className="flex-1 space-y-2 sm:space-y-3 min-w-0 max-w-full">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                        <div className="flex-1 min-w-0 max-w-full">
                          <h3 className="font-semibold text-xs sm:text-sm md:text-base truncate leading-tight">
                            {entry.employeeId?.profile?.firstName} {entry.employeeId?.profile?.lastName}
                          </h3>
                          <div className="text-xs sm:text-sm md:text-base text-muted-foreground space-y-0.5 mt-1">
                            <div className="truncate">{getSafeStringValue(entry.processId) || 'N/A'}</div>
                            <div className="truncate">{getSafeStringValue(entry.productId) || 'N/A'}</div>
                            <div className="truncate">Size: {entry.sizeCode || 'N/A'}</div>
                          </div>
                        </div>
                        <Badge className={`${getStatusColor(entry.validationStatus)} shrink-0 text-xs`}>
                          {getStatusIcon(entry.validationStatus)}
                          <span className="ml-1">{getStatusText(entry.validationStatus)}</span>
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
                        <div className="flex flex-col min-w-0">
                          <span className="text-muted-foreground text-xs sm:text-sm leading-tight">Target:</span>
                          <span className="font-medium text-sm sm:text-base mt-0.5 truncate">{entry.targetQuantity}</span>
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-muted-foreground text-xs sm:text-sm leading-tight">Achieved:</span>
                          <span className="font-medium text-green-600 text-sm sm:text-base mt-0.5 truncate">{entry.achieved}</span>
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-muted-foreground text-xs sm:text-sm leading-tight">Rejected:</span>
                          <span className="font-medium text-red-600 text-sm sm:text-base mt-0.5 truncate">{entry.rejected}</span>
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-muted-foreground text-xs sm:text-sm leading-tight">Efficiency:</span>
                          <span className="font-medium text-sm sm:text-base mt-0.5 truncate">
                            {entry.targetQuantity > 0 
                              ? Math.round((entry.achieved / entry.targetQuantity) * 100)
                              : 0
                            }%
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1.5 sm:gap-2 text-xs sm:text-sm md:text-base text-muted-foreground">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Calendar className="h-4 w-4 shrink-0" />
                          <span className="break-words min-w-0">
                            {entry.createdAt 
                              ? format(new Date(entry.createdAt), 'MMM dd, yyyy HH:mm')
                              : 'Unknown date'
                            }
                          </span>
                        </div>
                        {entry.machineCode && (
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Package className="h-4 w-4 shrink-0" />
                            <span className="truncate min-w-0">{entry.machineCode}</span>
                          </div>
                        )}
                      </div>

                      {entry.reasonForLessProduction && (
                        <div className="text-xs sm:text-sm md:text-base">
                          <span className="text-muted-foreground block mb-1">Reason for less production:</span>
                          <p className="text-amber-700 bg-amber-50 p-2 rounded break-words leading-relaxed">
                            {entry.reasonForLessProduction}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 lg:w-48 w-full min-w-0">
                      {entry.photo && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="w-full text-xs sm:text-sm md:text-base h-11 sm:h-9">
                              <ImageIcon className="h-4 w-4 mr-2 shrink-0" />
                              <span className="truncate">View Photo</span>
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-[95vw] sm:max-w-2xl" aria-describedby="work-photo-description">
                            <DialogHeader>
                              <DialogTitle className="text-base sm:text-lg">Work Photo</DialogTitle>
                              <DialogDescription id="work-photo-description" className="text-xs sm:text-sm">
                                Photo submitted by {entry.employeeId?.profile?.firstName} {entry.employeeId?.profile?.lastName}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="flex justify-center">
                              <img 
                                src={entry.photo} 
                                alt="Work submission" 
                                className="max-w-full h-auto rounded-lg"
                              />
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}

                      {entry.validationStatus === 'pending' && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="w-full text-xs sm:text-sm md:text-base h-11 sm:h-9"
                              onClick={() => setSelectedEntry(entry)}
                            >
                              <Eye className="h-4 w-4 mr-2 shrink-0" />
                              <span className="truncate">Review & Validate</span>
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-[95vw] sm:max-w-md" aria-describedby="validate-work-description">
                            <DialogHeader>
                              <DialogTitle className="text-base sm:text-lg">Validate Work Entry</DialogTitle>
                              <DialogDescription id="validate-work-description" className="text-xs sm:text-sm">
                                Review the work entry and provide validation feedback
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="validation-notes" className="text-xs sm:text-sm">Validation Notes (Optional)</Label>
                                <Textarea
                                  id="validation-notes"
                                  placeholder="Add any notes about the validation..."
                                  value={validationNotes}
                                  onChange={(e) => setValidationNotes(e.target.value)}
                                  rows={3}
                                  className="text-xs sm:text-sm mt-1"
                                />
                              </div>
                              <div className="flex flex-col sm:flex-row gap-2">
                                <Button
                                  onClick={() => handleValidate(entry._id!, 'approved', validationNotes)}
                                  disabled={loading}
                                  className="flex-1 text-sm sm:text-base h-11 sm:h-10"
                                  variant="default"
                                >
                                  {loading ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                  ) : (
                                    <ThumbsUp className="h-4 w-4 mr-2" />
                                  )}
                                  Approve
                                </Button>
                                <Button
                                  onClick={() => handleValidate(entry._id!, 'rejected', validationNotes)}
                                  disabled={loading}
                                  className="flex-1 text-sm sm:text-base h-11 sm:h-10"
                                  variant="destructive"
                                >
                                  {loading ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                  ) : (
                                    <ThumbsDown className="h-4 w-4 mr-2" />
                                  )}
                                  Reject
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}

                      {entry.validationStatus !== 'pending' && (
                        <div className="text-xs sm:text-sm md:text-base text-muted-foreground space-y-1 leading-relaxed">
                          <p className="break-words min-w-0">Validated by: {entry.validatedBy?.profile?.firstName} {entry.validatedBy?.profile?.lastName}</p>
                          <p className="break-words min-w-0">Date: {entry.validatedAt ? format(new Date(entry.validatedAt), 'MMM dd, yyyy HH:mm') : 'Unknown'}</p>
                          {entry.validationNotes && (
                            <p className="mt-2 break-words min-w-0">Notes: {entry.validationNotes}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}