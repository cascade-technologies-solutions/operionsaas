import { useState } from 'react';
import { Plus, Edit, Trash2, Search, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useProcesses, useProducts, useCreateProcess, useUpdateProcess, useDeleteProcess } from '@/hooks/useApi';
import { ProcessForm } from './ProcessForm';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { Process } from '@/types';

export const ProcessesManager = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProcess, setSelectedProcess] = useState<Process | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const { data: processes, isLoading } = useProcesses();
  const { data: products } = useProducts();
  const createProcess = useCreateProcess();
  const updateProcess = useUpdateProcess();
  const deleteProcess = useDeleteProcess();

  const filteredProcesses = processes?.filter(process =>
    process.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const getProductName = (productId: string) => {
    return products?.find(p => p.id === productId)?.name || 'Unknown Product';
  };

  const handleCreate = () => {
    setSelectedProcess(null);
    setIsFormOpen(true);
  };

  const handleEdit = (process: Process) => {
    setSelectedProcess(process);
    setIsFormOpen(true);
  };

  const handleDelete = (process: Process) => {
    setSelectedProcess(process);
    setIsDeleteOpen(true);
  };

  const handleSubmit = async (data: any) => {
    try {
      if (selectedProcess) {
        await updateProcess.mutateAsync({ id: selectedProcess.id, data });
      } else {
        await createProcess.mutateAsync(data);
      }
      setIsFormOpen(false);
      setSelectedProcess(null);
    } catch (error) {
      // Error saving process
    }
  };

  const handleConfirmDelete = async () => {
    if (selectedProcess) {
      try {
        await deleteProcess.mutateAsync(selectedProcess.id);
        setIsDeleteOpen(false);
        setSelectedProcess(null);
          } catch (error) {
      // Error deleting process
    }
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
          <h2 className="text-2xl font-bold">Processes</h2>
          <p className="text-muted-foreground">Manage production processes</p>
        </div>
        <Button onClick={handleCreate} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Add Process
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search processes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Processes Grid */}
      <div className="grid gap-4">
        {filteredProcesses.map((process) => (
          <Card key={process.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Settings2 className="h-5 w-5 text-primary" />
                    {process.name}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Product: {getProductName(process.productId)} • Stage: {process.stage}
                  </p>
                  <p className="text-sm text-success mt-1">
                    Target: {process.targetPerHour} per hour
                  </p>
                  {process.description && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {process.description}
                    </p>
                  )}
                </div>
                <Badge variant={process.isActive ? 'default' : 'secondary'}>
                  {process.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(process)}
                  className="flex-1"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(process)}
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
      {filteredProcesses.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Settings2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No processes found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm ? 'Try a different search term' : 'Create your first process to get started'}
            </p>
            {!searchTerm && (
              <Button onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Add Process
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Process Form Dialog */}
      <ProcessForm
        process={selectedProcess}
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmit={handleSubmit}
        isLoading={createProcess.isPending || updateProcess.isPending}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        onConfirm={handleConfirmDelete}
        isLoading={deleteProcess.isPending}
        title="Delete Process"
        description={`Are you sure you want to delete "${selectedProcess?.name}"? This action cannot be undone.`}
      />
    </div>
  );
};