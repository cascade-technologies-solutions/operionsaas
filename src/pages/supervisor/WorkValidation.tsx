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
    const processName = entry.processId?.name?.toLowerCase() || '';
    const productName = entry.productId?.name?.toLowerCase() || '';
    
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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Work Validation</h1>
            <p className="text-muted-foreground">
              Review and validate employee work entries
            </p>
          </div>
          <Button onClick={loadWorkEntries} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Label htmlFor="search">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Search by employee, product, or process..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="sm:w-48">
                <Label htmlFor="status-filter">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
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
        <div className="space-y-4">
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
              <Card key={entry._id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex flex-col lg:flex-row gap-4">
                    {/* Entry Details */}
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold">
                            {entry.employeeId?.profile?.firstName} {entry.employeeId?.profile?.lastName}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {entry.processId?.name} • {entry.productId?.name} • Size: {entry.sizeCode}
                          </p>
                        </div>
                        <Badge className={getStatusColor(entry.validationStatus)}>
                          {getStatusIcon(entry.validationStatus)}
                          <span className="ml-1">{getStatusText(entry.validationStatus)}</span>
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Target:</span>
                          <span className="ml-1 font-medium">{entry.targetQuantity}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Achieved:</span>
                          <span className="ml-1 font-medium text-green-600">{entry.achieved}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Rejected:</span>
                          <span className="ml-1 font-medium text-red-600">{entry.rejected}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Efficiency:</span>
                          <span className="ml-1 font-medium">
                            {entry.targetQuantity > 0 
                              ? Math.round((entry.achieved / entry.targetQuantity) * 100)
                              : 0
                            }%
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {entry.createdAt 
                              ? format(new Date(entry.createdAt), 'MMM dd, yyyy HH:mm')
                              : 'Unknown date'
                            }
                          </span>
                        </div>
                        {entry.machineCode && (
                          <div className="flex items-center gap-1">
                            <Package className="h-4 w-4" />
                            <span>{entry.machineCode}</span>
                          </div>
                        )}
                      </div>

                      {entry.reasonForLessProduction && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">Reason for less production:</span>
                          <p className="mt-1 text-amber-700 bg-amber-50 p-2 rounded">
                            {entry.reasonForLessProduction}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 lg:w-48">
                      {entry.photo && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="w-full">
                              <ImageIcon className="h-4 w-4 mr-2" />
                              View Photo
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl" aria-describedby="work-photo-description">
                            <DialogHeader>
                              <DialogTitle>Work Photo</DialogTitle>
                              <DialogDescription id="work-photo-description">
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
                              className="w-full"
                              onClick={() => setSelectedEntry(entry)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Review & Validate
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-md" aria-describedby="validate-work-description">
                            <DialogHeader>
                              <DialogTitle>Validate Work Entry</DialogTitle>
                              <DialogDescription id="validate-work-description">
                                Review the work entry and provide validation feedback
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="validation-notes">Validation Notes (Optional)</Label>
                                <Textarea
                                  id="validation-notes"
                                  placeholder="Add any notes about the validation..."
                                  value={validationNotes}
                                  onChange={(e) => setValidationNotes(e.target.value)}
                                  rows={3}
                                />
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  onClick={() => handleValidate(entry._id!, 'approved', validationNotes)}
                                  disabled={loading}
                                  className="flex-1"
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
                                  className="flex-1"
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
                        <div className="text-sm text-muted-foreground">
                          <p>Validated by: {entry.validatedBy?.profile?.firstName} {entry.validatedBy?.profile?.lastName}</p>
                          <p>Date: {entry.validatedAt ? format(new Date(entry.validatedAt), 'MMM dd, yyyy HH:mm') : 'Unknown'}</p>
                          {entry.validationNotes && (
                            <p className="mt-2">Notes: {entry.validationNotes}</p>
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