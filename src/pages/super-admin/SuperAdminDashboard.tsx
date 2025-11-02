import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Factory, CheckCircle, XCircle, Clock, Globe, Users, TrendingUp, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { factoryService } from '@/services/api';
import { Factory as FactoryType } from '@/types';
import { toast } from '@/hooks/use-toast';

const SuperAdminDashboard = () => {
  const navigate = useNavigate();
  const [factories, setFactories] = useState<FactoryType[]>([]);
  const [selectedFactory, setSelectedFactory] = useState<FactoryType | null>(null);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalFactories: 0,
    pendingApprovals: 0,
    activeFactories: 0,
    totalUsers: 0
  });

  useEffect(() => {
    loadFactories();
  }, []);

  const loadFactories = async () => {
    setLoading(true);
    try {
      const response = await factoryService.getFactories();
      const factoriesData = response.data || [];
      setFactories(factoriesData);
      
      // Calculate stats
      const totalFactories = factoriesData.length;
      const pendingApprovals = factoriesData.filter(f => f.status === 'pending').length;
      const activeFactories = factoriesData.filter(f => f.status === 'approved' && f.isActive).length;
      const totalUsers = factoriesData.reduce((acc, factory) => acc + (factory.subscription?.maxUsers || 0), 0);
      
      setStats({
        totalFactories,
        pendingApprovals,
        activeFactories,
        totalUsers
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load factories',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (factoryId: string) => {
    try {
      await factoryService.updateFactory(factoryId, { status: 'approved' });
      setFactories(prev => 
        prev.map(f => f._id === factoryId ? { ...f, status: 'approved' } : f)
      );
      toast({
        title: 'Success',
        description: 'Factory approved successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to approve factory',
        variant: 'destructive',
      });
    }
  };

  const handleReject = async (factoryId: string) => {
    try {
      await factoryService.updateFactory(factoryId, { status: 'suspended' });
      setFactories(prev => 
        prev.map(f => f._id === factoryId ? { ...f, status: 'suspended' } : f)
      );
      toast({
        title: 'Success',
        description: 'Factory rejected',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to reject factory',
        variant: 'destructive',
      });
    }
  };



  return (
    <Layout>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Factories</p>
              <p className="text-2xl font-bold">{stats.totalFactories}</p>
            </div>
            <Factory className="h-8 w-8 text-primary" />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Pending Approvals</p>
              <p className="text-2xl font-bold">{stats.pendingApprovals}</p>
            </div>
            <Clock className="h-8 w-8 text-warning" />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Active Factories</p>
              <p className="text-2xl font-bold">{stats.activeFactories}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-success" />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Users</p>
              <p className="text-2xl font-bold">{stats.totalUsers}</p>
            </div>
            <Users className="h-8 w-8 text-primary" />
          </div>
        </Card>
      </div>

      {/* Factory Management Tabs */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full md:w-[400px] grid-cols-3">
          <TabsTrigger value="all">All Factories</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">All Factories</h3>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Factory Name</TableHead>
                      <TableHead className="hidden md:table-cell">Location</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {factories.map((factory) => (
                      <TableRow key={factory.id}>
                        <TableCell className="font-medium">{factory.name}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          {factory.address.city}, {factory.address.state}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{factory.subscription.plan}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              factory.status === 'approved' ? 'default' :
                              factory.status === 'pending' ? 'secondary' : 'destructive'
                            }
                          >
                            {factory.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => setSelectedFactory(factory)}
                                >
                                  View
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl" aria-describedby="factory-details-description">
                                <DialogHeader>
                                  <DialogTitle>{selectedFactory?.name}</DialogTitle>
                                  <DialogDescription id="factory-details-description">
                                    Factory details and status information
                                  </DialogDescription>
                                </DialogHeader>
                                {selectedFactory && (
                                  <div className="space-y-4">
                                    <div>
                                      <h4 className="font-semibold mb-2">Address</h4>
                                      <p className="text-sm text-muted-foreground">
                                        {selectedFactory.address.street}<br />
                                        {selectedFactory.address.city}, {selectedFactory.address.state} {selectedFactory.address.zipCode}<br />
                                        {selectedFactory.address.country}
                                      </p>
                                    </div>
                                    <div>
                                      <h4 className="font-semibold mb-2">Geofence</h4>
                                      <p className="text-sm text-muted-foreground">
                                        Lat: {selectedFactory.geofence.latitude}, 
                                        Long: {selectedFactory.geofence.longitude}<br />
                                        Radius: {selectedFactory.geofence.radius}m
                                      </p>
                                    </div>
                                    <div>
                                      <h4 className="font-semibold mb-2">Subscription</h4>
                                      <p className="text-sm text-muted-foreground">
                                        Plan: {selectedFactory.subscription.plan}<br />
                                        Valid Until: {new Date(selectedFactory.subscription.validUntil).toLocaleDateString()}<br />
                                        Max Users: {selectedFactory.subscription.maxUsers}
                                      </p>
                                    </div>
                                    {selectedFactory.status === 'pending' && (
                                      <div className="flex gap-2 pt-4">
                                        <Button 
                                          onClick={() => handleApprove(selectedFactory.id)}
                                          className="flex-1"
                                        >
                                          <CheckCircle className="h-4 w-4 mr-2" />
                                          Approve
                                        </Button>
                                        <Button 
                                          variant="destructive"
                                          onClick={() => handleReject(selectedFactory.id)}
                                          className="flex-1"
                                        >
                                          <XCircle className="h-4 w-4 mr-2" />
                                          Reject
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </DialogContent>
                            </Dialog>
                            {factory.status === 'pending' && (
                              <>
                                <Button 
                                  size="sm"
                                  onClick={() => handleApprove(factory.id)}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                                <Button 
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleReject(factory.id)}
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="pending" className="mt-6">
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Pending Approvals</h3>
              {factories.filter(f => f.status === 'pending').length === 0 ? (
                <p className="text-muted-foreground">No pending approvals</p>
              ) : (
                <div className="space-y-4">
                  {factories.filter(f => f.status === 'pending').map((factory) => (
                    <Card key={factory.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold">{factory.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {factory.address.city}, {factory.address.state}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={() => handleApprove(factory.id)}>
                            Approve
                          </Button>
                          <Button variant="destructive" onClick={() => handleReject(factory.id)}>
                            Reject
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="approved" className="mt-6">
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Approved Factories</h3>
              <div className="grid gap-4">
                {factories.filter(f => f.status === 'approved').map((factory) => (
                  <Card key={factory.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold">{factory.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          Plan: {factory.subscription.plan} | Users: {factory.subscription.maxUsers}
                        </p>
                      </div>
                      <Button 
                        variant="outline"
                        onClick={() => navigate(`/super-admin/factory/${factory.id}`)}
                      >
                        Manage
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        <Card className="p-6 cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/super-admin/factory-approval')}>
          <CheckCircle className="h-8 w-8 text-primary mb-2" />
          <h3 className="font-semibold">Factory Approvals</h3>
          <p className="text-sm text-muted-foreground">
            {stats.pendingApprovals} pending approval{stats.pendingApprovals !== 1 ? 's' : ''}
          </p>
        </Card>
        <Card className="p-6 cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/super-admin/settings')}>
          <Settings className="h-8 w-8 text-primary mb-2" />
          <h3 className="font-semibold">System Settings</h3>
          <p className="text-sm text-muted-foreground">Configure global settings</p>
        </Card>
      </div>
    </Layout>
  );
};

export default SuperAdminDashboard;