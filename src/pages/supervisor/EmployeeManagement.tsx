
import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { UserForm } from '@/components/crud/UserForm';
import { DeleteConfirmDialog } from '@/components/crud/DeleteConfirmDialog';
import { UserDetails } from '@/components/crud/UserDetails';
import { userService } from '@/services/api/user.service';
import { User } from '@/types';
import { 
  Users, 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Smartphone, 
  Shield, 
  CheckCircle, 
  XCircle,
  RefreshCw,
  Loader2,
  Eye
} from 'lucide-react';
import { toast } from 'sonner';

export default function EmployeeManagement() {
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [resetLoadingId, setResetLoadingId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const response = await userService.getEmployees();
      
      // Extract employees data from response
      let employeesData: User[] = [];
      if (Array.isArray(response)) {
        employeesData = response;
      } else if (response && response.data && Array.isArray(response.data)) {
        employeesData = response.data;
      } else {
        console.error('Unexpected response format:', response);
        employeesData = [];
      }
      
      setEmployees(employeesData);
    } catch (error) {
      console.error('❌ Failed to load employees:', error);
      toast.error('Failed to load employees. Please check your connection and try again.');
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredEmployees = employees.filter(employee => {
    const firstName = employee.profile.firstName?.toLowerCase() || '';
    const lastName = employee.profile.lastName?.toLowerCase() || '';
    const searchLower = searchTerm.toLowerCase();
    
    return firstName.includes(searchLower) || 
           lastName.includes(searchLower);
  });



  const handleCreateUser = async (userData: Partial<User>) => {
    setActionLoading(true);
    try {
      await userService.createUser({
        ...userData,
        role: 'employee' as const,
      } as any); // Cast to any to include password field
      toast.success('Employee created successfully');
      setIsCreateDialogOpen(false);
      loadEmployees();
    } catch (error) {
      console.error('Failed to create employee:', error);
      toast.error('Failed to create employee');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateUser = async (userData: Partial<User>) => {
    if (!selectedUser) return;
    

    setActionLoading(true);
    try {
      // Update basic user data
      await userService.updateUser(selectedUser._id!, userData);
      
      // If assignedProcesses are provided, update them separately
      if (userData.assignedProcesses) {
        const processIds = userData.assignedProcesses.map(p => typeof p === 'string' ? p : p._id || p.id);
        await userService.updateUserProcesses(selectedUser._id!, processIds);
      }
      
      toast.success('Employee updated successfully');
      setIsEditDialogOpen(false);
      setSelectedUser(null);
      loadEmployees();
    } catch (error) {
      console.error('Failed to update employee:', error);
      toast.error('Failed to update employee');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetDevice = async (userId: string, userName: string) => {
    setActionLoading(true);
    setResetLoadingId(userId);
    try {
      await userService.resetDevice(userId);
      toast.success(`Device reset for ${userName}`);
      loadEmployees();
    } catch (error) {
      console.error('Failed to reset device:', error);
      toast.error('Failed to reset device');
    } finally {
      setActionLoading(false);
      setResetLoadingId(null);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    
    setDeleteLoading(true);
    try {
      await userService.deleteUser(selectedUser._id!);
      toast.success('Employee deleted successfully');
      setIsDeleteDialogOpen(false);
      setSelectedUser(null);
      loadEmployees();
    } catch (error) {
      console.error('Failed to delete employee:', error);
      toast.error('Failed to delete employee');
    } finally {
      setDeleteLoading(false);
    }
  };

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <Badge className="bg-green-100 text-green-800">
        <CheckCircle className="h-3 w-3 mr-1" />
        Active
      </Badge>
    ) : (
      <Badge variant="secondary">
        <XCircle className="h-3 w-3 mr-1" />
        Inactive
      </Badge>
    );
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <span className="text-lg">Loading employees...</span>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Employee Management</h1>
            <p className="text-muted-foreground">
              Manage factory employees and their access
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={loadEmployees} variant="outline" size="sm" className="w-full sm:w-auto">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={() => setIsCreateDialogOpen(true)} className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Add Employee
            </Button>
          </div>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search employees by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Employees List */}
        <div className="grid gap-4">
          {filteredEmployees.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No employees found</h3>
                  <p className="text-muted-foreground">
                    {searchTerm 
                      ? 'Try adjusting your search criteria'
                      : 'No employees have been added yet'
                    }
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            filteredEmployees.map((employee) => (
              <Card key={employee._id || employee.id || employee.email} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <Users className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">
                          {employee.profile.firstName} {employee.profile.lastName}
                        </h3>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {getStatusBadge(employee.isActive)}
                          {employee.deviceId && (
                            <Badge variant="outline" className="text-xs">
                              <Smartphone className="h-3 w-3 mr-1" />
                              Device Bound
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedUser(employee);
                          setIsDetailsDialogOpen(true);
                        }}
                        className="h-9 w-9 p-0"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleResetDevice(employee._id!, `${employee.profile.firstName} ${employee.profile.lastName}`)}
                        disabled={actionLoading || resetLoadingId === employee._id}
                        className="h-9 w-9 p-0"
                        title="Reset Device"
                      >
                        {actionLoading || resetLoadingId === employee._id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Smartphone className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedUser(employee);
                          setIsEditDialogOpen(true);
                        }}
                        disabled={actionLoading || deleteLoading}
                        className="h-9 w-9 p-0"
                        title="Edit Employee"
                      >
                        {actionLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Edit className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedUser(employee);
                          setIsDeleteDialogOpen(true);
                        }}
                        disabled={deleteLoading || actionLoading}
                        className="h-9 w-9 p-0 text-red-600 hover:text-red-700"
                        title="Delete Employee"
                      >
                        {deleteLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Create Employee Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-w-2xl" aria-describedby="create-employee-description">
            <DialogHeader>
              <DialogTitle>Add New Employee</DialogTitle>
              <DialogDescription id="create-employee-description">
                Create a new employee account with basic information
              </DialogDescription>
            </DialogHeader>
            <UserForm
              onSubmit={handleCreateUser}
              onCancel={() => setIsCreateDialogOpen(false)}
              isLoading={actionLoading}
              initialData={null}
              restrictRoleToEmployee={true}
            />
          </DialogContent>
        </Dialog>

        {/* Edit Employee Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl" aria-describedby="edit-employee-description">
            <DialogHeader>
              <DialogTitle>Edit Employee</DialogTitle>
              <DialogDescription id="edit-employee-description">
                Update employee information and settings
              </DialogDescription>
            </DialogHeader>
            {selectedUser && (
              <UserForm
                onSubmit={handleUpdateUser}
                onCancel={() => {
                  setIsEditDialogOpen(false);
                  setSelectedUser(null);
                }}
                isLoading={actionLoading}
                initialData={selectedUser}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <DeleteConfirmDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          onConfirm={handleDeleteUser}
          isLoading={deleteLoading}
          title="Delete Employee"
          description={`Are you sure you want to delete ${selectedUser?.profile.firstName} ${selectedUser?.profile.lastName}? This action cannot be undone.`}
        />

        {/* User Details Dialog */}
        <UserDetails
          user={selectedUser}
          open={isDetailsDialogOpen}
          onOpenChange={(open) => {
            setIsDetailsDialogOpen(open);
            if (!open) {
              setSelectedUser(null);
            }
          }}
        />

      </div>
    </Layout>
  );
}
