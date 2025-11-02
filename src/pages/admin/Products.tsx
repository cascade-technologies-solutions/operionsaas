import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Package, Settings, Layers, Clock, Target, ArrowUp, ArrowDown, GripVertical } from 'lucide-react';
import { productService, processService, machineService } from '@/services/api';
import { Product, Process } from '@/types';
import { toast } from '@/hooks/use-toast';
import { useAuthStore } from '@/stores/authStore';
import { SortableProcessList } from '@/components/SortableProcessList';

interface Machine {
  _id: string;
  name: string;
  factoryId: string;
  createdAt: Date;
  updatedAt: Date;
}

interface WorkEntry {
  processId: string;
  machineId: string;
  targetQuantity: number;
  achievedQuantity: number;
  rejectedQuantity: number;
  startTime: Date;
  endTime?: Date;
  totalWorkHours?: number;
}

const Products = () => {
  const { user } = useAuthStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [machines, setMachines] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Dialog states
  const [productDialog, setProductDialog] = useState(false);
  const [processDialog, setProcessDialog] = useState(false);
  const [dailyTargetDialog, setDailyTargetDialog] = useState(false);
  
  // Form states
  const [productForm, setProductForm] = useState({ 
    name: '', 
    dailyTarget: '', 
    selectedProcesses: [] as string[] 
  });
  const [processForm, setProcessForm] = useState({ 
    stages: [{ name: '' }] // name field kept for compatibility but not used
  });
  const [dailyTargetForm, setDailyTargetForm] = useState({ 
    processId: '', 
    target: '' 
  });
  const [selectedProductForEdit, setSelectedProductForEdit] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Employee work entry states
  const [selectedProcess, setSelectedProcess] = useState('');
  const [selectedMachine, setSelectedMachine] = useState('');
  const [workEntry, setWorkEntry] = useState<WorkEntry>({
    processId: '',
    machineId: '',
    targetQuantity: 0,
    achievedQuantity: 0,
    rejectedQuantity: 0,
    startTime: new Date()
  });
  const [isWorking, setIsWorking] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async (forceRefresh = false) => {
    if (forceRefresh) {
      setRefreshKey(prev => prev + 1);
    }
    
    setLoading(true);
    try {
      const [productData, processData] = await Promise.all([
        productService.getProducts(),
        processService.getProcesses(),
      ]);
      
      // Handle nested data structure from backend
      const productsArray = (productData as any).products || (productData as any).data?.products || (productData as any).data || [];
      const processesArray = (processData as any).processes || (processData as any).data?.processes || (processData as any).data || [];
      
      setProducts(productsArray);
      setProcesses(processesArray);
      
    } catch (error) {
      console.error('❌ Failed to load data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Product Management
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const processes = productForm.selectedProcesses.map((processId, index) => ({
        processId,
        order: index + 1
      }));
      
      const newProduct = { 
        name: productForm.name, 
        code: productForm.name.toUpperCase().replace(/\s+/g, ''),
        dailyTarget: parseInt(productForm.dailyTarget) || 0,
        processes
      };
      
      const response = await productService.createProduct(newProduct);
      
      // Optimistic update - add the new product to the state immediately
      if (response.data) {
        setProducts(prevProducts => [...prevProducts, response.data]);
      }
      
      toast({
        title: 'Success',
        description: 'Product created successfully',
      });
      setProductDialog(false);
      setProductForm({ name: '', dailyTarget: '', selectedProcesses: [] });
      
      // Also reload data to ensure consistency
      loadData(true);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create product',
        variant: 'destructive',
      });
    }
  };

  // Process Management - Multi-stage creation
  const addProcessStage = () => {
    setProcessForm(prev => ({
      ...prev,
      stages: [...prev.stages, { name: '' }]
    }));
  };

  const removeProcessStage = (index: number) => {
    setProcessForm(prev => ({
      ...prev,
      stages: prev.stages.filter((_, i) => i !== index)
    }));
  };

  const updateProcessStage = (index: number, name: string) => {
    setProcessForm(prev => ({
      ...prev,
      stages: prev.stages.map((stage, i) => i === index ? { name } : stage)
    }));
  };

  const handleCreateProcess = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Create multiple processes
      const validStages = processForm.stages.filter(stage => stage.name.trim());
      
      if (validStages.length === 0) {
        toast({
          title: 'Error',
          description: 'Please add at least one process stage with a name',
          variant: 'destructive',
        });
        return;
      }

      // Create each process stage with user's provided names
      for (const stage of validStages) {
        const result = await processService.createProcess({
          name: stage.name // User's descriptive name
        });
      }

      toast({
        title: 'Success',
        description: `${validStages.length} process stage(s) created successfully`,
      });
      setProcessDialog(false);
      setProcessForm({ stages: [{ name: '' }] });
      loadData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create process stages',
        variant: 'destructive',
      });
    }
  };

  const handleSetDailyTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!dailyTargetForm.processId || !dailyTargetForm.target) {
        toast({
          title: 'Error',
          description: 'Please select a process and enter a target quantity',
          variant: 'destructive',
        });
        return;
      }

      const target = parseInt(dailyTargetForm.target);
      if (isNaN(target) || target <= 0) {
        toast({
          title: 'Error',
          description: 'Please enter a valid positive number for target quantity',
          variant: 'destructive',
        });
        return;
      }

      await processService.setDailyTarget(dailyTargetForm.processId, target);

      toast({
        title: 'Success',
        description: `Daily target of ${target} units set for ${processes.find(p => p._id === dailyTargetForm.processId)?.name}`,
      });
      
      setDailyTargetDialog(false);
      setDailyTargetForm({ processId: '', target: '' });
      loadData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to set daily target',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateProductTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!dailyTargetForm.target) {
        toast({
          title: 'Error',
          description: 'Please enter a target quantity',
          variant: 'destructive',
        });
        return;
      }

      const target = parseInt(dailyTargetForm.target);
      if (isNaN(target) || target < 0) {
        toast({
          title: 'Error',
          description: 'Please enter a valid non-negative number for target quantity',
          variant: 'destructive',
        });
        return;
      }

      if (!selectedProductForEdit) {
        toast({
          title: 'Error',
          description: 'No product selected for editing',
          variant: 'destructive',
        });
        return;
      }

      const response = await productService.updateDailyTarget(selectedProductForEdit, target);
      
      // Optimistic update - update the product in the state immediately
      if (response.data) {
        setProducts(prevProducts => 
          prevProducts.map(product => 
            product._id === selectedProductForEdit 
              ? { ...product, dailyTarget: target }
              : product
          )
        );
      }
      
      toast({
        title: 'Success',
        description: 'Product target updated successfully',
      });
      setDailyTargetDialog(false);
      setDailyTargetForm({ processId: '', target: '' });
      setSelectedProductForEdit(null);
      
      // Also reload data to ensure consistency
      loadData(true);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update product target',
        variant: 'destructive',
      });
    }
  };





  // Employee Work Entry
  const handleStartWork = () => {
    if (!selectedProcess || !selectedMachine || workEntry.targetQuantity <= 0) {
      toast({
        title: 'Error',
        description: 'Please select all required fields and enter target quantity',
        variant: 'destructive',
      });
      return;
    }

    setIsWorking(true);
    setWorkEntry(prev => ({
      ...prev,
      processId: selectedProcess,
      machineId: selectedMachine,
      startTime: new Date()
    }));
    
    toast({
      title: 'Work Started',
      description: 'Your work session has begun. Timer is running.',
    });
  };

  const handleCompleteWork = () => {
    if (workEntry.achievedQuantity <= 0) {
      toast({
        title: 'Error',
        description: 'Please enter achieved quantity',
        variant: 'destructive',
      });
      return;
    }

    const endTime = new Date();
    const totalHours = (endTime.getTime() - workEntry.startTime.getTime()) / (1000 * 60 * 60);
    
    const completedWork = {
      ...workEntry,
      endTime,
      totalWorkHours: totalHours
    };

    
    
    setIsWorking(false);
    setSelectedProcess('');
    setSelectedMachine('');
    setWorkEntry({
      processId: '',
      machineId: '',
      targetQuantity: 0,
      achievedQuantity: 0,
      rejectedQuantity: 0,
      startTime: new Date()
    });

    toast({
      title: 'Work Completed',
      description: `Total work hours: ${totalHours.toFixed(2)} hours`,
    });
  };

  const getProcessesForProduct = (productId: string) => {
    return processes.filter(process => {
      // Handle both populated and unpopulated productId
      const processProductId = typeof process.productId === 'string' 
        ? process.productId 
        : (process.productId as any)?._id || (process.productId as any)?.id;
      return processProductId === productId;
    }).sort((a, b) => (a.order || 0) - (b.order || 0));
  };


  const getAvailableMachines = () => {
    // For now, return all machines since they're independent
    return machines;
  };




  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">Loading...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Factory Management</h1>
            <p className="text-muted-foreground">Manage products, processes, sizes, and machines</p>
          </div>
        </div>

        {/* Product Management Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Product Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <Dialog open={productDialog} onOpenChange={setProductDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Product
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[90vh] flex flex-col" aria-describedby="add-product-description">
                  <DialogHeader>
                    <DialogTitle>Add New Product</DialogTitle>
                    <DialogDescription id="add-product-description">
                      Create a new product with name only.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateProduct} className="flex flex-col flex-1 min-h-0">
                    <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                      <div>
                        <Label htmlFor="productName">Product Name</Label>
                        <Input
                          id="productName"
                          value={productForm.name}
                          onChange={(e) => setProductForm(prev => ({ ...prev, name: e.target.value }))}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="dailyTarget">Daily Target</Label>
                        <Input
                          id="dailyTarget"
                          type="number"
                          min="0"
                          value={productForm.dailyTarget}
                          onChange={(e) => setProductForm(prev => ({ ...prev, dailyTarget: e.target.value }))}
                          placeholder="Enter daily target quantity"
                        />
                      </div>
                      <div>
                        <Label>Assign Processes</Label>
                        <div className="mt-2 space-y-2">
                          {processes.map((process) => (
                            <div key={process._id} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id={`process-${process._id}`}
                                checked={productForm.selectedProcesses?.includes(process._id) || false}
                                onChange={(e) => {
                                  const isChecked = e.target.checked;
                                  setProductForm(prev => ({
                                    ...prev,
                                    selectedProcesses: isChecked
                                      ? [...(prev.selectedProcesses || []), process._id]
                                      : (prev.selectedProcesses || []).filter(id => id !== process._id)
                                  }));
                                }}
                                className="rounded"
                              />
                              <label htmlFor={`process-${process._id}`} className="text-sm">
                                {process.name}
                              </label>
                            </div>
                          ))}
                        </div>
                        
                        {/* Process Ordering */}
                        {productForm.selectedProcesses && productForm.selectedProcesses.length > 0 && (
                          <div className="mt-4">
                            <Label>Process Order (drag to reorder)</Label>
                            <div className="mt-2 space-y-2">
                              {productForm.selectedProcesses.map((processId, index) => {
                                const process = processes.find(p => p._id === processId);
                                return (
                                  <div key={processId} className="flex items-center space-x-2 p-2 border rounded-lg bg-gray-50">
                                    <GripVertical className="h-4 w-4 text-gray-400 cursor-move" />
                                    <span className="text-sm font-medium">Order {index + 1}:</span>
                                    <span className="text-sm">{process?.name}</span>
                                    <div className="flex space-x-1 ml-auto">
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          if (index > 0) {
                                            const newOrder = [...productForm.selectedProcesses];
                                            [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
                                            setProductForm(prev => ({
                                              ...prev,
                                              selectedProcesses: newOrder
                                            }));
                                          }
                                        }}
                                        disabled={index === 0}
                                      >
                                        <ArrowUp className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          if (index < productForm.selectedProcesses.length - 1) {
                                            const newOrder = [...productForm.selectedProcesses];
                                            [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
                                            setProductForm(prev => ({
                                              ...prev,
                                              selectedProcesses: newOrder
                                            }));
                                          }
                                        }}
                                        disabled={index === productForm.selectedProcesses.length - 1}
                                      >
                                        <ArrowDown className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4 pt-4 border-t">
                      <Button type="submit" className="flex-1">
                        Create Product
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setProductDialog(false)}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Products List */}
            <div className="space-y-4" key={refreshKey}>
              {products.map((product) => (
                <div key={`${product._id}-${refreshKey}`} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Package className="h-5 w-5 text-primary" />
                      <div>
                        <div className="font-semibold">{product.name}</div>
                        <div className="text-sm text-muted-foreground">{product.code}</div>
                        {product.dailyTarget && (
                          <div className="text-sm text-blue-600">Daily Target: {product.dailyTarget}</div>
                        )}
                        {product.processes && product.processes.length > 0 && (
                          <div className="text-sm text-green-600">
                            Processes: {product.processes
                              .sort((a, b) => a.order - b.order)
                              .map((p, index) => {
                                const process = processes.find(proc => proc._id === p.processId);
                                return `${index + 1}. ${process?.name || p.processId}`;
                              })
                              .join(', ')}
                          </div>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedProductForEdit(product._id);
                        setDailyTargetForm({ processId: '', target: product.dailyTarget?.toString() || '' });
                        setProductDialog(false);
                        setDailyTargetDialog(true);
                      }}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit Target
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Process Management Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Process Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <Dialog open={processDialog} onOpenChange={setProcessDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Process Stages
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md" aria-describedby="add-stages-description">
                  <DialogHeader>
                    <DialogTitle>Add Process Stages</DialogTitle>
                    <DialogDescription id="add-stages-description">
                      Add multiple process stages. Enter descriptive names for each stage.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateProcess} className="space-y-4">
                    <div className="space-y-3">
                      <Label>Process Stages</Label>
                      {processForm.stages.map((stage, index) => (
                        <div key={index} className="flex gap-2">
                          <Input
                            value={stage.name}
                            onChange={(e) => updateProcessStage(index, e.target.value)}
                            placeholder={`Enter process stage ${index + 1} name`}
                            required
                          />
                          {processForm.stages.length > 1 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeProcessStage(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={addProcessStage}
                        className="w-full"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add One More Process Stage
                      </Button>
                    </div>

                    <div className="flex gap-2">
                      <Button type="submit" className="flex-1">
                        Save All Process Stages
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setProcessDialog(false)}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Processes List */}
            <div className="space-y-4 mt-6" key={`processes-${refreshKey}`}>
              <h3 className="text-lg font-semibold">All Processes</h3>
              {processes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No processes found. Create your first process above.
                </div>
              ) : (
                <div className="space-y-2">
                  {processes
                    .map((process, index) => (
                      <div key={`${process._id}-${refreshKey}`} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                            {index + 1}
                          </div>
                          <div>
                            <div className="font-medium">{process.name}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Daily Target Setting Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Daily Production Targets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <Dialog open={dailyTargetDialog} onOpenChange={setDailyTargetDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Target className="h-4 w-4 mr-2" />
                    Set Daily Target
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Set Daily Production Target</DialogTitle>
                    <DialogDescription>
                      Set the daily starting quantity for a process stage. This is typically done for Process 1.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSetDailyTarget} className="space-y-4">
                    <div>
                      <Label htmlFor="targetProcess">Select Process</Label>
                      <Select 
                        value={dailyTargetForm.processId} 
                        onValueChange={(value) => setDailyTargetForm(prev => ({ ...prev, processId: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a process stage" />
                        </SelectTrigger>
                        <SelectContent>
                          {processes
                            .map((process) => (
                              <SelectItem key={process._id} value={process._id}>
                                {process.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="targetQuantity">Daily Target Quantity</Label>
                      <Input
                        id="targetQuantity"
                        type="number"
                        min="1"
                        value={dailyTargetForm.target}
                        onChange={(e) => setDailyTargetForm(prev => ({ ...prev, target: e.target.value }))}
                        placeholder="Enter daily target quantity"
                        required
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button type="submit" className="flex-1">
                        Set Target
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setDailyTargetDialog(false)}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Process Status Display */}
            {processes.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">Process Status</h4>
                {processes
                  .sort((a, b) => (a.order || 0) - (b.order || 0))
                  .map((process, index) => (
                    <div key={process._id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium">{process.name}</div>
                          <div className="text-sm text-muted-foreground">
                            Available: {process.availableQuantity || 0} | 
                            Target: {process.dailyTarget || 0} | 
                            Status: {process.isLocked ? 'Locked' : 'Active'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Employee Work Entry Section */}
        {user?.role === 'employee' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Work Entry
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Process Selection */}
                <div>
                  <Label htmlFor="workProcess">Select Process Stage</Label>
                  <Select 
                    value={selectedProcess} 
                    onValueChange={setSelectedProcess}
                    disabled={isWorking}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a process stage" />
                    </SelectTrigger>
                    <SelectContent>
                      {processes.map((process) => (
                        <SelectItem key={process._id} value={process._id}>
                          {process.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>


                {/* Machine Selection */}
                <div>
                  <Label htmlFor="workMachine">Select Machine</Label>
                  <Select 
                    value={selectedMachine} 
                    onValueChange={setSelectedMachine}
                    disabled={isWorking}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a machine" />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableMachines().map((machine) => (
                        <SelectItem key={machine._id} value={machine._id}>
                          {machine.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Target Quantity */}
                <div>
                  <Label htmlFor="targetQuantity">Target Quantity</Label>
                  <Input
                    id="targetQuantity"
                    type="number"
                    value={workEntry.targetQuantity}
                    onChange={(e) => setWorkEntry({ ...workEntry, targetQuantity: parseInt(e.target.value) || 0 })}
                    disabled={isWorking}
                    min="1"
                  />
                </div>

                {isWorking ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2 text-green-800">
                        <Clock className="h-4 w-4" />
                        <span className="font-medium">Work in Progress</span>
                      </div>
                      <div className="text-sm text-green-600 mt-1">
                        Started at: {workEntry.startTime.toLocaleTimeString()}
                      </div>
                    </div>

                    {/* Achieved Quantity */}
                    <div>
                      <Label htmlFor="achievedQuantity">Achieved Quantity</Label>
                      <Input
                        id="achievedQuantity"
                        type="number"
                        value={workEntry.achievedQuantity}
                        onChange={(e) => setWorkEntry({ ...workEntry, achievedQuantity: parseInt(e.target.value) || 0 })}
                        min="0"
                      />
                    </div>

                    {/* Rejected Quantity */}
                    <div>
                      <Label htmlFor="rejectedQuantity">Rejected Quantity</Label>
                      <Input
                        id="rejectedQuantity"
                        type="number"
                        value={workEntry.rejectedQuantity}
                        onChange={(e) => setWorkEntry({ ...workEntry, rejectedQuantity: parseInt(e.target.value) || 0 })}
                        min="0"
                      />
                    </div>

                    <Button onClick={handleCompleteWork} className="w-full">
                      Complete Work
                    </Button>
                  </div>
                ) : (
                  <Button 
                    onClick={handleStartWork} 
                    className="w-full"
                    disabled={!selectedProcess || !selectedMachine || workEntry.targetQuantity <= 0}
                  >
                    <Target className="h-4 w-4 mr-2" />
                    Start Work
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Edit Target Dialog */}
        <Dialog open={dailyTargetDialog} onOpenChange={setDailyTargetDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Daily Target</DialogTitle>
              <DialogDescription>
                Update the daily target for this product.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpdateProductTarget} className="space-y-4">
              <div>
                <Label htmlFor="target">Daily Target</Label>
                <Input
                  id="target"
                  type="number"
                  min="0"
                  value={dailyTargetForm.target}
                  onChange={(e) => setDailyTargetForm(prev => ({ ...prev, target: e.target.value }))}
                  placeholder="Enter daily target quantity"
                  required
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  Update Target
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDailyTargetDialog(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default Products;