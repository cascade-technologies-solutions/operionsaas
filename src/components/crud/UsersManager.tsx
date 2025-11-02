import { useState } from 'react';
import { Plus, Edit, Trash2, Search, Users, UserPlus, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUsers, useCreateUser, useUpdateUser } from '@/hooks/useApi';
import { UserForm } from './UserForm';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { User, UserRole } from '@/types';
import { userService } from '@/services/api';
import { toast } from 'sonner';

export const UsersManager = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isResetting, setIsResetting] = useState<string | null>(null);

  const { data: users, isLoading } = useUsers(roleFilter === 'all' ? undefined : roleFilter);
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();

  const filteredUsers = users?.filter(user =>
    (user.profile.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
     user.profile.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
     user.email.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (roleFilter === 'all' || user.role === roleFilter)
  ) || [];

  const handleCreate = () => {
    setSelectedUser(null);
    setIsFormOpen(true);
  };

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setIsFormOpen(true);
  };

  const handleDelete = (user: User) => {
    setSelectedUser(user);
    setIsDeleteOpen(true);
  };

  const handleResetDevice = async (userId: string) => {
    setIsResetting(userId);
    try {
      await userService.resetDevice('factory-1', userId);
      toast.success('Device reset successfully');
    } catch (error) {
      toast.error('Failed to reset device');
    } finally {
      setIsResetting(null);
    }
  };

  const handleSubmit = async (data: any) => {
    try {
      if (selectedUser) {
        await updateUser.mutateAsync({ id: selectedUser.id, data });
      } else {
        await createUser.mutateAsync(data);
      }
      setIsFormOpen(false);
      setSelectedUser(null);
    } catch (error) {
      // Error saving user
    }
  };

  const getRoleBadgeVariant = (role: UserRole) => {
    switch (role) {
      case 'factory_admin': return 'destructive';
      case 'supervisor': return 'default';
      case 'employee': return 'secondary';
      default: return 'outline';
    }
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'factory_admin': return 'Admin';
      case 'supervisor': return 'Supervisor';
      case 'employee': return 'Employee';
      default: return role;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Users</h2>
          <p className="text-muted-foreground">Manage factory users and permissions</p>
        </div>
        <Button onClick={handleCreate} className="w-full sm:w-auto">
          <UserPlus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={roleFilter} onValueChange={(value: any) => setRoleFilter(value)}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="factory_admin">Admin</SelectItem>
            <SelectItem value="supervisor">Supervisor</SelectItem>
            <SelectItem value="employee">Employee</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Users Grid */}
      <div className="grid gap-4">
        {filteredUsers.map((user) => (
          <Card key={user.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    {user.profile.firstName} {user.profile.lastName}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {user.email} • {user.profile.phone}
                  </p>
                  {user.role === 'employee' && user.deviceId && (
                    <p className="text-xs text-info mt-1">
                      Device: {user.deviceId}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Badge variant={getRoleBadgeVariant(user.role)}>
                    {getRoleLabel(user.role)}
                  </Badge>
                  <Badge variant={user.isActive ? 'default' : 'secondary'}>
                    {user.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(user)}
                  className="flex-1"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                {user.role === 'employee' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleResetDevice(user.id)}
                    disabled={isResetting === user.id}
                    className="flex-1"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reset Device
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(user)}
                  className="flex-1 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredUsers.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No users found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || roleFilter !== 'all' 
                ? 'Try adjusting your search or filters' 
                : 'Create your first user to get started'}
            </p>
            {!searchTerm && roleFilter === 'all' && (
              <Button onClick={handleCreate}>
                <UserPlus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* User Form Dialog */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-background border rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <UserForm
              initialData={selectedUser}
              onSubmit={handleSubmit}
              onCancel={() => {
                setIsFormOpen(false);
                setSelectedUser(null);
              }}
              isLoading={createUser.isPending || updateUser.isPending}
            />
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        onConfirm={async () => {/* handle delete */}}
        isLoading={false}
        title="Delete User"
        description={`Are you sure you want to delete "${selectedUser?.profile.firstName} ${selectedUser?.profile.lastName}"? This action cannot be undone.`}
      />
    </div>
  );
};