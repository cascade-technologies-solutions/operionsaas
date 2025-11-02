import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { ProcessesManager } from '@/components/crud/ProcessesManager';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Plus, Edit, Trash2, Settings2, ArrowUpDown } from 'lucide-react';
import { processService, productService } from '@/services/api';
import { Process, Product } from '@/types';
import { toast } from '@/hooks/use-toast';
import { useAuthStore } from '@/stores/authStore';

const Processes = () => {
  const { user } = useAuthStore();
  const [processes, setProcesses] = useState<Process[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProcess, setEditingProcess] = useState<Process | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    productId: '',
    machineNumber: '',
    targetOutput: 0,
    cycleTime: 0,
    status: 'active',
    assignedEmployees: []
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (!user?.factoryId) return;
    setLoading(true);
    try {
      const [processData, productData] = await Promise.all([
        processService.getProcesses(),
        productService.getProducts(),
      ]);
      setProcesses(processData.processes || []);
      setProducts(productData.products || []);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.factoryId) return;
    
    try {
      if (editingProcess) {
        const updated = await processService.updateProcess(editingProcess.id, formData);
        // Optimistic update
        setProcesses(prev => prev.map(p => p.id === editingProcess.id ? updated : p));
        toast({
          title: 'Success',
          description: 'Process updated successfully',
        });
      } else {
        const newProcess = await processService.createProcess({
          ...formData,
          isActive: true,
        });
        // Optimistic update
        setProcesses(prev => [...prev, newProcess]);
        toast({
          title: 'Success',
          description: 'Process created successfully',
        });
      }
      handleCloseDialog();
      // Refresh data to ensure consistency with server
      await loadData();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save process',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this process?')) {
      try {
        // Call API to delete process
        await processService.deleteProcess(id);
        // Optimistic update
        setProcesses(prev => prev.filter(p => p.id !== id));
        toast({
          title: 'Success',
          description: 'Process deleted successfully',
        });
        // Refresh data to ensure consistency with server
        await loadData();
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to delete process',
          variant: 'destructive',
        });
      }
    }
  };

  const handleEdit = (process: Process) => {
    setEditingProcess(process);
    setFormData({
      name: process.name,
      productId: process.productId,
      machineNumber: process.machineNumber || '',
      targetOutput: process.targetOutput || 0,
      cycleTime: process.cycleTime || 0,
      status: process.status || 'active',
      assignedEmployees: process.assignedEmployees || []
    });
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingProcess(null);
    setFormData({
      name: '',
      productId: '',
      machineNumber: '',
      targetOutput: 0,
      cycleTime: 0,
      status: 'active',
      assignedEmployees: []
    });
  };

  const getProductName = (productId: string) => {
    return products.find(p => p.id === productId)?.name || 'Unknown';
  };

  return (
    <Layout title="Process Management">
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Processes</h2>
          <p className="text-muted-foreground">Define production stages and targets</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleCloseDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Process
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md" aria-describedby="process-form-description">
            <DialogHeader>
              <DialogTitle>
                {editingProcess ? 'Edit Process' : 'Add New Process'}
              </DialogTitle>
              <DialogDescription id="process-form-description">
                {editingProcess ? 'Update process information below.' : 'Fill in the details to create a new process.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Process Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="product">Product</Label>
                <Select
                  value={formData.productId}
                  onValueChange={(value) => setFormData({ ...formData, productId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="machineNumber">Machine Number</Label>
                <Input
                  id="machineNumber"
                  value={formData.machineNumber}
                  onChange={(e) => setFormData({ ...formData, machineNumber: e.target.value })}
                  placeholder="Enter machine number"
                />
              </div>
              <div>
                <Label htmlFor="targetOutput">Target Output</Label>
                <Input
                  id="targetOutput"
                  type="number"
                  min="1"
                  value={formData.targetOutput}
                  onChange={(e) => setFormData({ ...formData, targetOutput: parseInt(e.target.value) || 0 })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="cycleTime">Cycle Time (minutes)</Label>
                <Input
                  id="cycleTime"
                  type="number"
                  min="1"
                  value={formData.cycleTime}
                  onChange={(e) => setFormData({ ...formData, cycleTime: parseInt(e.target.value) || 0 })}
                  required
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  {editingProcess ? 'Update' : 'Create'}
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

      <Card>
        <div className="p-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Machine</TableHead>
                  <TableHead>Process Name</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="hidden md:table-cell">Target Output</TableHead>
                  <TableHead className="hidden lg:table-cell">Cycle Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : processes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">
                      No processes found. Add your first process.
                    </TableCell>
                  </TableRow>
                ) : (
                  processes.map((process) => (
                      <TableRow key={process.id}>
                                              <TableCell>
                        {process.machineNumber || '-'}
                      </TableCell>
                      <TableCell className="font-medium">{process.name}</TableCell>
                      <TableCell>{getProductName(process.productId)}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        {process.targetOutput}
                      </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {process.cycleTime} min
                        </TableCell>
                        <TableCell>
                          <Badge variant={process.isActive ? 'default' : 'secondary'}>
                            {process.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(process)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDelete(process.id)}
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

      {/* Process Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Processes</p>
              <p className="text-2xl font-bold">{processes.length}</p>
            </div>
            <Settings2 className="h-8 w-8 text-primary" />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Active Processes</p>
              <p className="text-2xl font-bold">
                {processes.filter(p => p.isActive).length}
              </p>
            </div>
            <Settings2 className="h-8 w-8 text-success" />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Avg Target/Hour</p>
              <p className="text-2xl font-bold">
                {processes.length > 0
                  ? Math.round(
                      processes.reduce((acc, p) => acc + p.targetPerHour, 0) / processes.length
                    )
                  : 0}
              </p>
            </div>
            <Settings2 className="h-8 w-8 text-primary" />
          </div>
        </Card>
      </div>
    </Layout>
  );
};

export default Processes;