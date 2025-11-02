import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Building, MapPin, User, Calendar, Eye, Check, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { factoryService } from '@/services/api';

interface FactoryRequest {
  id: string;
  name: string;
  adminName: string;
  adminEmail: string;
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
  };
  subscription: {
    plan: 'basic' | 'pro' | 'enterprise';
    maxUsers: number;
  };
  geofence: {
    latitude: number;
    longitude: number;
    radius: number;
  };
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
  documents?: string[];
}

export default function FactoryApproval() {
  const [requests, setRequests] = useState<FactoryRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<FactoryRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Load factory requests on mount
  useEffect(() => {
    const loadRequests = async () => {
      try {
        const factoryRequestsResponse = await factoryService.getFactoryRequests();
        // Map the API response to our component interface
        const mappedRequests = factoryRequestsResponse.requests.map(req => ({
          id: req.id,
          name: req.name,
          adminName: `${req.adminProfile.firstName} ${req.adminProfile.lastName}`,
          adminEmail: req.adminEmail,
          address: req.address,
          subscription: {
            plan: 'basic' as const,
            maxUsers: 50
          },
          geofence: req.geofence,
          status: req.status,
          createdAt: req.createdAt,
          documents: req.documents || []
        }));
        setRequests(mappedRequests);
      } catch (error) {
        console.error('Failed to load factory requests:', error);
        toast.error('Failed to load factory requests');
      } finally {
        setInitialLoading(false);
      }
    };

    loadRequests();
  }, []);

  const handleApprove = async (requestId: string) => {
    setLoading(true);
    try {
      await factoryService.approveFactoryRequest(requestId);
      
      setRequests(prev => prev.map(req => 
        req.id === requestId 
          ? { ...req, status: 'approved' as const }
          : req
      ));
      
      toast.success('Factory approved successfully! Admin account created.');
    } catch (error) {
      toast.error('Failed to approve factory');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (requestId: string, reason: string) => {
    setLoading(true);
    try {
      await factoryService.rejectFactoryRequest(requestId, reason);
      
      setRequests(prev => prev.map(req => 
        req.id === requestId 
          ? { ...req, status: 'rejected' as const }
          : req
      ));
      
      toast.success('Factory request rejected');
      setRejectionReason('');
    } catch (error) {
      toast.error('Failed to reject factory');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-warning text-warning-foreground';
      case 'approved': return 'bg-success text-success-foreground';
      case 'rejected': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const pendingRequests = requests.filter(req => req.status === 'pending');
  const processedRequests = requests.filter(req => req.status !== 'pending');

  if (initialLoading) {
    return (
      <Layout title="Factory Approval">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Factory Approval">
      <div className="space-y-6">
        {/* Pending Requests */}
        {pendingRequests.length > 0 && (
          <div>
            <h2 className="text-xl font-bold mb-4">Pending Approval ({pendingRequests.length})</h2>
            <div className="grid gap-4">
              {pendingRequests.map((request) => (
                <Card key={request.id} className="shadow-md">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Building className="h-5 w-5" />
                          {request.name}
                        </CardTitle>
                        <div className="mt-2 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            {request.adminName} ({request.adminEmail})
                          </div>
                        </div>
                      </div>
                      <Badge className={getStatusColor(request.status)}>
                        {request.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium mb-2 flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          Address
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {request.address.street}<br />
                          {request.address.city}, {request.address.state} {request.address.zipCode}<br />
                          {request.address.country}
                        </p>
                      </div>
                      <div>
                        <h4 className="font-medium mb-2">Subscription</h4>
                        <p className="text-sm text-muted-foreground">
                          Plan: <span className="capitalize font-medium">{request.subscription.plan}</span><br />
                          Max Users: {request.subscription.maxUsers}
                        </p>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium mb-2">Geofence</h4>
                        <p className="text-sm text-muted-foreground">
                          Lat: {request.geofence.latitude.toFixed(6)}<br />
                          Lng: {request.geofence.longitude.toFixed(6)}<br />
                          Radius: {request.geofence.radius}m
                        </p>
                      </div>
                      <div>
                        <h4 className="font-medium mb-2 flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          Submitted
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {new Date(request.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {request.documents && (
                      <div>
                        <h4 className="font-medium mb-2">Documents</h4>
                        <div className="flex flex-wrap gap-2">
                          {request.documents.map((doc, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {doc}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 pt-4">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setSelectedRequest(request)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl" aria-describedby="factory-request-description">
                          <DialogHeader>
                            <DialogTitle>Factory Request Details</DialogTitle>
                            <DialogDescription id="factory-request-description">
                              Review all information before making a decision
                            </DialogDescription>
                          </DialogHeader>
                          {selectedRequest && (
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <strong>Factory Name:</strong> {selectedRequest.name}
                                </div>
                                <div>
                                  <strong>Admin:</strong> {selectedRequest.adminName}
                                </div>
                                <div>
                                  <strong>Email:</strong> {selectedRequest.adminEmail}
                                </div>
                                <div>
                                  <strong>Plan:</strong> {selectedRequest.subscription.plan}
                                </div>
                              </div>
                              <div>
                                <strong>Full Address:</strong>
                                <p className="text-muted-foreground">
                                  {selectedRequest.address.street}, {selectedRequest.address.city}, 
                                  {selectedRequest.address.state} {selectedRequest.address.zipCode}, 
                                  {selectedRequest.address.country}
                                </p>
                              </div>
                              <div>
                                <strong>Geofence Coordinates:</strong>
                                <p className="text-muted-foreground">
                                  {selectedRequest.geofence.latitude}, {selectedRequest.geofence.longitude} 
                                  (Radius: {selectedRequest.geofence.radius}m)
                                </p>
                              </div>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>

                      <Button 
                        size="sm" 
                        onClick={() => handleApprove(request.id)}
                        disabled={loading}
                        className="bg-success hover:bg-success/90"
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Approve
                      </Button>

                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="destructive" size="sm" disabled={loading}>
                            <X className="h-4 w-4 mr-2" />
                            Reject
                          </Button>
                        </DialogTrigger>
                        <DialogContent aria-describedby="reject-factory-description">
                          <DialogHeader>
                            <DialogTitle>Reject Factory Request</DialogTitle>
                            <DialogDescription id="reject-factory-description">
                              Please provide a reason for rejection
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <Textarea
                              placeholder="Enter rejection reason..."
                              value={rejectionReason}
                              onChange={(e) => setRejectionReason(e.target.value)}
                            />
                            <div className="flex gap-2">
                              <Button
                                variant="destructive"
                                onClick={() => handleReject(request.id, rejectionReason)}
                                disabled={!rejectionReason.trim() || loading}
                              >
                                Reject Request
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Processed Requests */}
        {processedRequests.length > 0 && (
          <div>
            <h2 className="text-xl font-bold mb-4">Recent Decisions</h2>
            <div className="grid gap-4">
              {processedRequests.map((request) => (
                <Card key={request.id} className="shadow-md opacity-75">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Building className="h-5 w-5" />
                          {request.name}
                        </CardTitle>
                        <CardDescription>
                          {request.adminName} ({request.adminEmail})
                        </CardDescription>
                      </div>
                      <Badge className={getStatusColor(request.status)}>
                        {request.status}
                      </Badge>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        )}

        {requests.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <Building className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No Factory Requests</h3>
              <p className="text-muted-foreground">
                There are currently no factory requests to review.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
