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
import { Badge } from '@/components/ui/badge';
import { Plus, Settings } from 'lucide-react';
import { machineService } from '@/services/api';
import { Machine } from '@/types';
import { toast } from '@/hooks/use-toast';

const Machines = () => {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(false);
  const [machineDialog, setMachineDialog] = useState(false);
  const [machineForm, setMachineForm] = useState({ name: '' });

  useEffect(() => {
    loadMachines();
  }, []);

  const loadMachines = async () => {
    setLoading(true);
    try {
      const response = await machineService.getMachines();
      setMachines(response.data || []);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load machines',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMachine = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await machineService.createMachine({
        name: machineForm.name
      });
      toast({
        title: 'Success',
        description: 'Machine created successfully',
      });
      setMachineDialog(false);
      setMachineForm({ name: '' });
      loadMachines();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create machine',
        variant: 'destructive',
      });
    }
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
            <h1 className="text-3xl font-bold">Machine Management</h1>
            <p className="text-muted-foreground">Manage factory machines independently</p>
          </div>
        </div>

        {/* Machine Management Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Machines
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <Dialog open={machineDialog} onOpenChange={setMachineDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Machine
                  </Button>
                </DialogTrigger>
                <DialogContent aria-describedby="add-machine-description">
                  <DialogHeader>
                    <DialogTitle>Add New Machine</DialogTitle>
                    <DialogDescription id="add-machine-description">
                      Create a new machine independently.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateMachine} className="space-y-4">
                    <div>
                      <Label htmlFor="machineName">Machine Name</Label>
                      <Input
                        id="machineName"
                        value={machineForm.name}
                        onChange={(e) => setMachineForm({ name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" className="flex-1">
                        Create Machine
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setMachineDialog(false)}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Machines List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {machines.map((machine) => (
                <div key={machine._id} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{machine.name}</div>
                      <div className="text-sm text-muted-foreground">
                        Created: {new Date(machine.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <Badge variant="outline">Active</Badge>
                  </div>
                </div>
              ))}
              {machines.length === 0 && (
                <div className="col-span-full text-center py-8 text-muted-foreground">
                  No machines found. Create your first machine to get started.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Machines;
