import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { UsersManager } from '@/components/crud/UsersManager';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Edit, Trash2, Users, UserCheck, UserX, RotateCcw, Eye } from 'lucide-react';
import { userService } from '@/services/api';
import { User } from '@/types';
import { toast } from '@/hooks/use-toast';
import { useAuthStore } from '@/stores/authStore';

const UserManagement = () => {
  const { user } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [generatedCredentials, setGeneratedCredentials] = useState<{
    userId: string;
    password: string;
    email: string;
  } | null>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    password: '',
    role: 'employee' as 'supervisor' | 'employee',
  });
  const [selectedProcesses, setSelectedProcesses] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) {
      console.log('No user found, cannot load data');
      return;
    }
    
    console.log('Current user:', user);
    console.log('User factoryId:', user.factoryId);
    console.log('User role:', user.role);
    
    setLoading(true);
    try {
      console.log('Loading users for user:', user);
      const userData = await userService.getUsers();

      console.log('User data response:', userData);
      
      // Handle different response structures from backend
      let usersArray = [];
      
      if (userData) {
        console.log('Response structure:', {
          hasData: !!userData.data,
          dataType: typeof userData.data,
          isArray: Array.isArray(userData.data),
          hasUsers: !!(userData.data && userData.data.users),
          usersType: userData.data?.users ? typeof userData.data.users : 'undefined'
        });
        
        if (Array.isArray(userData.data)) {
          // Direct array response
          usersArray = userData.data;
        } else if (userData.data && Array.isArray(userData.data.users)) {
          // Nested users array
          usersArray = userData.data.users;
        } else if (Array.isArray(userData)) {
          // Response is directly an array
          usersArray = userData;
        } else if (userData.users && Array.isArray(userData.users)) {
          // Users at root level
          usersArray = userData.users;
        }
      }
      
      console.log('Users array:', usersArray);
      console.log('Users array length:', usersArray.length);
      setUsers(usersArray);
    } catch (error) {
      console.error('Error loading users:', error);
      
      // Check if it's a network error or server error
      if (error.message && error.message.includes('Failed to fetch')) {
        toast({
          title: 'Connection Error',
          description: 'Cannot connect to server. Please ensure the backend is running.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load users. Please try again.',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.factoryId) return;
    

    
    // Client-side validation
    if (!formData.firstName || formData.firstName.length < 2) {
      toast({
        title: 'Error',
        description: 'First name must be at least 2 characters',
        variant: 'destructive',
      });
      return;
    }
    
    if (!formData.lastName || formData.lastName.length < 2) {
      toast({
        title: 'Error',
        description: 'Last name must be at least 2 characters',
        variant: 'destructive',
      });
      return;
    }
    
    if (!formData.phone || formData.phone.length < 5) {
      toast({
        title: 'Error',
        description: 'Phone number must have at least 5 digits',
        variant: 'destructive',
      });
      return;
    }
    
    if (!formData.password || formData.password.length < 6) {
      toast({
        title: 'Error',
        description: 'Password must be at least 6 characters',
        variant: 'destructive',
      });
      return;
    }
    
    setLoading(true);
    
    try {
      const userData = {
        role: formData.role,
        password: formData.password,
        factoryId: user.factoryId,
        profile: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
        },
        isActive: true,
      };




      if (editingUser) {
        const response = await userService.updateUser(editingUser.id, userData);
        setUsers(prev => prev.map(u => u.id === editingUser.id ? response.data : u));
        toast({
          title: 'Success',
          description: 'User updated successfully',
        });
      } else {
        const response = await userService.createUser(userData);
        
        // Check if user was created successfully
        if (response.data) {
          // Extract the user data (without generatedCredentials)
          const newUser = { ...response.data };
          delete newUser.generatedCredentials;
          
          // Check if user already exists to avoid duplication
          const existingUser = users.find(u => u.id === newUser.id || u.username === newUser.username);
          if (!existingUser) {
            setUsers(prev => [...prev, newUser]);
          }
          
          // Show generated credentials
          if (response.data.generatedCredentials) {
            setGeneratedCredentials(response.data.generatedCredentials);
          }
          
          toast({
            title: 'Success',
            description: 'User created successfully. Please note the credentials below.',
          });
          
          // Refresh the user list to ensure we have the latest data
          setTimeout(() => {
            loadData();
          }, 1000);
        }
      }
      handleCloseDialog();
    } catch (error: any) {
      console.error('User creation error:', error);
      console.error('Error response:', error?.response?.data);
      
      let errorMessage = error?.response?.data?.error || error?.message || 'Failed to save user';
      
      // Handle validation errors with specific details
      if (error?.response?.status === 400 && error?.response?.data?.data?.errors) {
        const validationErrors = error.response.data.data.errors;
        const errorDetails = validationErrors.map((err: any) => err.msg).join(', ');
        errorMessage = `Validation failed: ${errorDetails}`;
      }
      // Handle specific error cases
      else if (error?.response?.status === 409) {
        if (errorMessage.includes('phone number')) {
          errorMessage = 'Phone number already exists in this factory. Please use a different phone number.';
        } else if (errorMessage.includes('User ID')) {
          errorMessage = 'User ID already exists. Please try again.';
        } else if (errorMessage.includes('Email already exists')) {
          errorMessage = 'Email already exists. Please use a different email.';
        } else if (errorMessage.includes('Username already exists')) {
          errorMessage = 'Username already exists. Please try again.';
        }
      }
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this user?')) {
      try {
        // API call would go here
        setUsers(prev => prev.filter(u => u.id !== id));
        toast({
          title: 'Success',
          description: 'User deleted successfully',
        });
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to delete user',
          variant: 'destructive',
        });
      }
    }
  };

  const handleResetDevice = async (userId: string) => {
    if (confirm('Are you sure you want to reset this user\'s device?')) {
      try {
        await userService.resetDevice(userId);
        setUsers(prev => prev.map(u => 
          u.id === userId ? { ...u, deviceId: undefined } : u
        ));
        toast({
          title: 'Success',
          description: 'Device reset successfully',
        });
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to reset device',
          variant: 'destructive',
        });
      }
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      firstName: user.profile.firstName,
      lastName: user.profile.lastName,
      phone: user.profile.phone,
      role: user.role as 'supervisor' | 'employee',
    });
    setSelectedProcesses(user.assignedProcesses || []);
    setIsDialogOpen(true);
  };

  const handleViewDetails = (user: User) => {
    setViewingUser(user);
    setIsViewDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingUser(null);
    setFormData({
      firstName: '',
      lastName: '',
      phone: '',
      password: '',
      role: 'employee',
    });
    setSelectedProcesses([]);
  };

  const supervisors = users.filter(u => u?.role === 'supervisor');
  const employees = users.filter(u => u?.role === 'employee');

  return (
    <Layout title="User Management">
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Users</h2>
          <p className="text-muted-foreground">Manage supervisors and employees</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={loadData}
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Refresh'}
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleCloseDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" aria-describedby="user-form-description">
            <DialogHeader>
              <DialogTitle>
                {editingUser ? 'Edit User' : 'Add New User'}
              </DialogTitle>
              <DialogDescription id="user-form-description">
                {editingUser ? 'Update user information below.' : 'Fill in the details to create a new user.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="role">Role</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value: 'supervisor' | 'employee') => 
                    setFormData({ ...formData, role: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="supervisor">Supervisor</SelectItem>
                    <SelectItem value="employee">Employee</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Enter login password"
                  required
                />
              </div>


              <div className="flex gap-2">
                <Button type="submit" className="flex-1" disabled={loading}>
                  {loading ? 'Creating...' : (editingUser ? 'Update' : 'Create')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseDialog}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Generated Credentials Dialog */}
      <Dialog open={!!generatedCredentials} onOpenChange={() => setGeneratedCredentials(null)}>
        <DialogContent className="max-w-md" aria-describedby="credentials-description">
          <DialogHeader>
            <DialogTitle>User Credentials Generated</DialogTitle>
            <DialogDescription id="credentials-description">
              Please save these credentials. They will not be shown again.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Alert>
              <AlertDescription>
                User created successfully! The password you entered during creation will be used for login.
              </AlertDescription>
            </Alert>
            <div className="space-y-3">
              <div>
                <Label className="text-sm font-medium">User ID (for login)</Label>
                <div className="p-2 bg-muted rounded text-sm font-mono">
                  {generatedCredentials?.userId}
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium">Email</Label>
                <div className="p-2 bg-muted rounded text-sm font-mono">
                  {generatedCredentials?.email}
                </div>
              </div>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                <p className="text-sm text-blue-800">
                  <strong>Login Instructions:</strong><br/>
                  • Use the User ID above to login<br/>
                  • Use the password you entered during user creation<br/>
                  • Keep these credentials secure
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                className="flex-1"
                onClick={() => {
                  if (generatedCredentials) {
                    navigator.clipboard.writeText(
                      `User ID: ${generatedCredentials.userId}\nEmail: ${generatedCredentials.email}\n\nLogin with the password you entered during user creation.`
                    );
                    toast.success('User ID and Email copied to clipboard');
                  }
                }}
              >
                Copy ID & Email
              </Button>
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setGeneratedCredentials(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View User Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" aria-describedby="user-details-description">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription id="user-details-description">
              View detailed information about this user.
            </DialogDescription>
          </DialogHeader>
          {viewingUser && (
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Full Name</Label>
                  <p className="text-sm">{viewingUser.profile.firstName} {viewingUser.profile.lastName}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Role</Label>
                  <div className="mt-1">
                    <Badge variant="outline">{viewingUser.role}</Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                  <p className="text-sm">{viewingUser.email || 'No email'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Username</Label>
                  <p className="text-sm">{viewingUser.username || 'No username'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Phone</Label>
                  <p className="text-sm">{viewingUser.profile.phone}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                  <div className="mt-1">
                    <Badge variant={viewingUser.isActive ? 'default' : 'secondary'}>
                      {viewingUser.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">User ID</Label>
                  <p className="text-sm font-mono bg-muted p-2 rounded">{viewingUser.id || viewingUser._id}</p>
                </div>
                
                {viewingUser.deviceId && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Device ID</Label>
                    <p className="text-sm font-mono bg-muted p-2 rounded">{viewingUser.deviceId}</p>
                  </div>
                )}

                {viewingUser.assignedProcesses && viewingUser.assignedProcesses.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Assigned Processes</Label>
                    <div className="mt-1 space-y-1">
                      {viewingUser.assignedProcesses.map((process, index) => (
                        <Badge key={index} variant="secondary" className="mr-1">
                          {typeof process === 'string' ? process : process.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Created At</Label>
                    <p className="text-sm">{new Date(viewingUser.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Last Updated</Label>
                    <p className="text-sm">{new Date(viewingUser.updatedAt).toLocaleDateString()}</p>
                  </div>
                </div>

                {viewingUser.lastLogin && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Last Login</Label>
                    <p className="text-sm">{new Date(viewingUser.lastLogin).toLocaleString()}</p>
                  </div>
                )}
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2 mt-6">
            <Button
              variant="outline"
              onClick={() => setIsViewDialogOpen(false)}
            >
              Close
            </Button>
            <Button
              onClick={() => {
                setIsViewDialogOpen(false);
                handleEdit(viewingUser!);
              }}
            >
              Edit User
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full md:w-[400px] grid-cols-3">
          <TabsTrigger value="all">All Users</TabsTrigger>
          <TabsTrigger value="supervisors">Supervisors</TabsTrigger>
          <TabsTrigger value="employees">Employees</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <Card>
            <div className="p-6">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead className="hidden md:table-cell">Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="hidden lg:table-cell">Phone</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center">
                          Loading...
                        </TableCell>
                      </TableRow>
                    ) : users.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center">
                          No users found. Add your first user.
                        </TableCell>
                      </TableRow>
                    ) : (
                      users.map((user) => (
                        <TableRow key={user.id || user._id || user.username}>
                          <TableCell className="font-medium">
                            {user.profile.firstName} {user.profile.lastName}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">{user.email}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{user.role}</Badge>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">{user.profile.phone}</TableCell>
                          <TableCell>
                            <Badge variant={user.isActive ? 'default' : 'secondary'}>
                              {user.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleViewDetails(user)}
                                title="View Details"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEdit(user)}
                                title="Edit User"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              {user.role === 'employee' && user.deviceId && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleResetDevice(user.id)}
                                  title="Reset Device"
                                >
                                  <RotateCcw className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDelete(user.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="supervisors" className="mt-6">
          <Card>
            <div className="p-6">
              <div className="grid gap-4">
                {supervisors.map((supervisor) => (
                  <Card key={supervisor.id || supervisor._id || supervisor.username} className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold">
                          {supervisor.profile.firstName} {supervisor.profile.lastName}
                        </h4>
                        <p className="text-sm text-muted-foreground">{supervisor.email}</p>
                        <p className="text-sm text-muted-foreground">
                          {employees.filter(e => e.supervisorId === supervisor.id).length} employees
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleViewDetails(supervisor)} title="View Details">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleEdit(supervisor)}>
                          Edit
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDelete(supervisor.id)}>
                          Delete
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="employees" className="mt-6">
          <Card>
            <div className="p-6">
              <div className="grid gap-4">
                {employees.map((employee) => {
                  const supervisor = users.find(u => u.id === employee.supervisorId);
                  return (
                    <Card key={employee.id || employee._id || employee.username} className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold">
                            {employee.profile.firstName} {employee.profile.lastName}
                          </h4>
                          <p className="text-sm text-muted-foreground">{employee.email}</p>
                          {supervisor && (
                            <p className="text-sm text-muted-foreground">
                              Supervisor: {supervisor.profile.firstName} {supervisor.profile.lastName}
                            </p>
                          )}
                          {employee.assignedProcesses && employee.assignedProcesses.length > 0 && (
                            <p className="text-sm text-muted-foreground">
                              {employee.assignedProcesses.length} processes assigned
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleViewDetails(employee)} title="View Details">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleEdit(employee)}>
                            Edit
                          </Button>
                          {employee.deviceId && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleResetDevice(employee.id)}
                              title="Reset Device"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          )}
                          <Button size="sm" variant="destructive" onClick={() => handleDelete(employee.id)}>
                            Delete
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* User Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Users</p>
              <p className="text-2xl font-bold">{users.length}</p>
            </div>
            <Users className="h-8 w-8 text-primary" />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Supervisors</p>
              <p className="text-2xl font-bold">{supervisors.length}</p>
            </div>
            <UserCheck className="h-8 w-8 text-success" />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Employees</p>
              <p className="text-2xl font-bold">{employees.length}</p>
            </div>
            <Users className="h-8 w-8 text-primary" />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Inactive</p>
              <p className="text-2xl font-bold">
                {users.filter(u => !u.isActive).length}
              </p>
            </div>
            <UserX className="h-8 w-8 text-destructive" />
          </div>
        </Card>
      </div>
    </Layout>
  );
};

export default UserManagement;