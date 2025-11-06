import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Settings as SettingsIcon,
  Clock,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  MapPin
} from 'lucide-react';
import { factoryService } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';
import { Factory } from '@/types';

// Utility function to convert 24-hour format to 12-hour format
const formatTimeTo12Hour = (time24: string): string => {
  if (!time24) return '';
  
  // Handle both 24-hour format (HH:MM) and 12-hour format (H:MM AM/PM)
  if (time24.includes('AM') || time24.includes('PM')) {
    return time24; // Already in 12-hour format
  }
  
  const [hours, minutes] = time24.split(':');
  const hour24 = parseInt(hours, 10);
  const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
  const ampm = hour24 >= 12 ? 'PM' : 'AM';
  
  return `${hour12}:${minutes} ${ampm}`;
};

interface Shift {
  name: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

export default function FactorySettings() {
  const { user } = useAuthStore();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [factory, setFactory] = useState<Factory | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  
  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  
  // Form states
  const [shiftForm, setShiftForm] = useState({
    name: '',
    startTime: '',
    endTime: '',
    isActive: true
  });

  // Geofence form state
  const [geofenceForm, setGeofenceForm] = useState({
    latitude: '',
    longitude: '',
    radius: ''
  });

  useEffect(() => {
    loadFactory();
    loadShifts();
  }, []);

  const loadFactory = async () => {
    if (!user?.factoryId) {
      setError('Factory ID not found');
      return;
    }

    try {
      const response = await factoryService.getFactory(user.factoryId);
      const factoryData = response.data;
      setFactory(factoryData);
      
      // Initialize geofence form with current values
      if (factoryData?.geofence) {
        setGeofenceForm({
          latitude: factoryData.geofence.latitude?.toString() || '',
          longitude: factoryData.geofence.longitude?.toString() || '',
          radius: factoryData.geofence.radius?.toString() || '100'
        });
      }
    } catch (error: any) {
      console.error('Failed to load factory:', error);
      toast.error('Failed to load factory data');
    }
  };

  const loadShifts = async () => {
    setLoading(true);
    try {
      const response = await factoryService.getShifts();
      
      // Try multiple possible data structures
      const shiftsData = response.data?.shifts || response.shifts || [];
      setShifts(shiftsData);
    } catch (error: any) {
      console.error('❌ Failed to load shifts:', error);
      console.error('❌ Error response:', error.response);
      
      // Check if it's an authentication error
      if (error.response?.status === 401) {
        setError('Authentication expired. Please log out and log back in.');
        toast.error('Authentication expired. Please log out and log back in.');
      } else {
        setError('Failed to load shifts');
        toast.error('Failed to load shifts');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddShift = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!shiftForm.name || !shiftForm.startTime || !shiftForm.endTime) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      await factoryService.createShift(shiftForm);
      toast.success('Shift added successfully');
      setAddDialogOpen(false);
      setShiftForm({ name: '', startTime: '', endTime: '', isActive: true });
      loadShifts();
    } catch (error: any) {
      console.error('Failed to add shift:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to add shift';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleEditShift = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingShift || !shiftForm.name || !shiftForm.startTime || !shiftForm.endTime) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      await factoryService.updateShift(editingShift.name, shiftForm);
      toast.success('Shift updated successfully');
      setEditDialogOpen(false);
      setEditingShift(null);
      setShiftForm({ name: '', startTime: '', endTime: '', isActive: true });
      loadShifts();
    } catch (error: any) {
      console.error('Failed to update shift:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to update shift';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteShift = async (shiftName: string) => {
    if (!confirm(`Are you sure you want to delete the shift "${shiftName}"?`)) {
      return;
    }

    setLoading(true);
    try {
      await factoryService.deleteShift(shiftName);
      toast.success('Shift deleted successfully');
      loadShifts();
    } catch (error: any) {
      console.error('Failed to delete shift:', error);
      toast.error(error.message || 'Failed to delete shift');
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (shift: Shift) => {
    setEditingShift(shift);
    setShiftForm({
      name: shift.name,
      startTime: formatTimeTo12Hour(shift.startTime),
      endTime: formatTimeTo12Hour(shift.endTime),
      isActive: shift.isActive
    });
    setEditDialogOpen(true);
  };

  const closeDialogs = () => {
    setAddDialogOpen(false);
    setEditDialogOpen(false);
    setEditingShift(null);
    setShiftForm({ name: '', startTime: '', endTime: '', isActive: true });
  };

  const getCurrentLocation = async () => {
    setLocationLoading(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        });
      });

      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;
      const accuracy = position.coords.accuracy || 0;

      setGeofenceForm(prev => ({
        ...prev,
        latitude: latitude.toFixed(6),
        longitude: longitude.toFixed(6)
      }));

      const accuracyLevel = accuracy <= 10 ? 'Excellent' : 
                           accuracy <= 20 ? 'Good' : 
                           accuracy <= 50 ? 'Fair' : 'Poor';
      
      toast.success(`📍 Location detected! Accuracy: ${accuracy.toFixed(1)}m (${accuracyLevel})`);
    } catch (error: any) {
      console.error('Location error:', error);
      toast.error('Failed to get current location. Please enable location services.');
    } finally {
      setLocationLoading(false);
    }
  };

  const handleUpdateGeofence = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.factoryId) {
      toast.error('Factory ID not found');
      return;
    }

    // Validation
    const latitude = parseFloat(geofenceForm.latitude);
    const longitude = parseFloat(geofenceForm.longitude);
    const radius = parseInt(geofenceForm.radius);

    if (isNaN(latitude) || latitude < -90 || latitude > 90) {
      toast.error('Latitude must be between -90 and 90');
      return;
    }

    if (isNaN(longitude) || longitude < -180 || longitude > 180) {
      toast.error('Longitude must be between -180 and 180');
      return;
    }

    if (isNaN(radius) || radius < 50 || radius > 1000) {
      toast.error('Radius must be between 50 and 1000 meters');
      return;
    }

    setLoading(true);
    try {
      await factoryService.updateFactory(user.factoryId, {
        geofence: {
          latitude,
          longitude,
          radius
        }
      });
      toast.success('Geofence settings updated successfully');
      loadFactory(); // Reload factory data
    } catch (error: any) {
      console.error('Failed to update geofence:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to update geofence settings';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="Factory Settings">
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Factory Settings</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Manage your factory configuration and shifts</p>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Shift Management */}
        <Card className="p-3 sm:p-4 md:p-6">
          <CardHeader className="pb-3 sm:pb-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
              <div className="flex-1">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
                  Shift Management
                </CardTitle>
                <CardDescription className="text-sm">
                  Manage work shifts for your factory
                </CardDescription>
              </div>
              <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full sm:w-auto min-h-[44px]">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Shift
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-[95vw] max-w-md sm:max-w-lg p-4 sm:p-6">
                  <DialogHeader>
                    <DialogTitle className="text-base sm:text-lg">Add New Shift</DialogTitle>
                    <DialogDescription className="text-sm">
                      Create a new work shift for your factory. Employees will be able to select this shift when starting work.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleAddShift} className="space-y-4">
                    <div>
                      <Label htmlFor="name" className="text-sm sm:text-base">Shift Name</Label>
                      <Input
                        id="name"
                        value={shiftForm.name}
                        onChange={(e) => setShiftForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g., Morning Shift"
                        required
                        className="text-sm sm:text-base mt-1"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <Label htmlFor="startTime" className="text-sm sm:text-base">Start Time</Label>
                        <Input
                          id="startTime"
                          type="text"
                          placeholder="9:00 AM"
                          value={shiftForm.startTime}
                          onChange={(e) => setShiftForm(prev => ({ ...prev, startTime: e.target.value }))}
                          required
                          className="text-sm sm:text-base mt-1"
                        />
                        <p className="text-xs text-muted-foreground mt-1">Format: 9:00 AM</p>
                      </div>
                      <div>
                        <Label htmlFor="endTime" className="text-sm sm:text-base">End Time</Label>
                        <Input
                          id="endTime"
                          type="text"
                          placeholder="5:00 PM"
                          value={shiftForm.endTime}
                          onChange={(e) => setShiftForm(prev => ({ ...prev, endTime: e.target.value }))}
                          required
                          className="text-sm sm:text-base mt-1"
                        />
                        <p className="text-xs text-muted-foreground mt-1">Format: 5:00 PM</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="isActive"
                        checked={shiftForm.isActive}
                        onCheckedChange={(checked) => setShiftForm(prev => ({ ...prev, isActive: checked }))}
                      />
                      <Label htmlFor="isActive" className="text-sm sm:text-base">Active</Label>
                    </div>
                    <div className="flex flex-col sm:flex-row justify-end gap-2">
                      <Button type="button" variant="outline" onClick={closeDialogs} className="w-full sm:w-auto min-h-[44px]">
                        Cancel
                      </Button>
                      <Button type="submit" disabled={loading} className="w-full sm:w-auto min-h-[44px]">
                        <Save className="h-4 w-4 mr-2" />
                        {loading ? 'Adding...' : 'Add Shift'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {shifts.length === 0 ? (
              <div className="text-center py-6 sm:py-8">
                <Clock className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-muted-foreground mb-3 sm:mb-4" />
                <h3 className="text-base sm:text-lg font-medium mb-2">No shifts configured</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Add shifts to allow employees to select their work schedule
                </p>
                <Button onClick={() => setAddDialogOpen(true)} className="min-h-[44px]">
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Shift
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-3 sm:mx-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs sm:text-sm">Shift Name</TableHead>
                      <TableHead className="text-xs sm:text-sm">Start Time</TableHead>
                      <TableHead className="text-xs sm:text-sm">End Time</TableHead>
                      <TableHead className="text-xs sm:text-sm">Duration</TableHead>
                      <TableHead className="text-xs sm:text-sm">Status</TableHead>
                      <TableHead className="text-right text-xs sm:text-sm">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shifts.map((shift) => {
                      const startTime = new Date(`2000-01-01T${shift.startTime}`);
                      const endTime = new Date(`2000-01-01T${shift.endTime}`);
                      const duration = endTime.getTime() - startTime.getTime();
                      const hours = Math.floor(duration / (1000 * 60 * 60));
                      const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
                      const durationText = `${hours}h ${minutes}m`;

                      return (
                        <TableRow key={shift.name}>
                          <TableCell className="font-medium text-xs sm:text-sm">{shift.name}</TableCell>
                          <TableCell className="text-xs sm:text-sm">{formatTimeTo12Hour(shift.startTime)}</TableCell>
                          <TableCell className="text-xs sm:text-sm">{formatTimeTo12Hour(shift.endTime)}</TableCell>
                          <TableCell className="text-xs sm:text-sm">{durationText}</TableCell>
                          <TableCell>
                            <Badge variant={shift.isActive ? 'default' : 'secondary'} className="text-xs">
                              {shift.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1 sm:gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEditDialog(shift)}
                                className="min-h-[36px] min-w-[36px] sm:min-w-[auto]"
                              >
                                <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteShift(shift.name)}
                                className="text-red-600 hover:text-red-700 min-h-[36px] min-w-[36px] sm:min-w-[auto]"
                              >
                                <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Geofence Settings */}
        <Card className="p-3 sm:p-4 md:p-6">
          <CardHeader className="pb-3 sm:pb-4">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <MapPin className="h-4 w-4 sm:h-5 sm:w-5" />
                Geofence Settings
              </CardTitle>
              <CardDescription className="text-sm">
                Configure the factory location and geofence radius for attendance check-in validation
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateGeofence} className="space-y-4">
              {/* Current Location Display */}
              {factory?.geofence && (
                <div className="bg-muted p-3 sm:p-4 rounded-lg mb-4">
                  <p className="text-sm font-medium mb-2">Current Geofence Settings</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs sm:text-sm">
                    <div>
                      <span className="text-muted-foreground">Latitude:</span>
                      <span className="ml-2 font-mono">{factory.geofence.latitude?.toFixed(6)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Longitude:</span>
                      <span className="ml-2 font-mono">{factory.geofence.longitude?.toFixed(6)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Radius:</span>
                      <span className="ml-2 font-mono">{factory.geofence.radius}m</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <Label htmlFor="latitude" className="text-sm sm:text-base">
                    Latitude
                  </Label>
                  <Input
                    id="latitude"
                    type="number"
                    step="0.000001"
                    min="-90"
                    max="90"
                    value={geofenceForm.latitude}
                    onChange={(e) => setGeofenceForm(prev => ({ ...prev, latitude: e.target.value }))}
                    placeholder="12.874547"
                    required
                    className="text-sm sm:text-base mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Range: -90 to 90</p>
                </div>
                <div>
                  <Label htmlFor="longitude" className="text-sm sm:text-base">
                    Longitude
                  </Label>
                  <Input
                    id="longitude"
                    type="number"
                    step="0.000001"
                    min="-180"
                    max="180"
                    value={geofenceForm.longitude}
                    onChange={(e) => setGeofenceForm(prev => ({ ...prev, longitude: e.target.value }))}
                    placeholder="74.825728"
                    required
                    className="text-sm sm:text-base mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Range: -180 to 180</p>
                </div>
              </div>

              <div>
                <Label htmlFor="radius" className="text-sm sm:text-base">
                  Radius (meters)
                </Label>
                <Input
                  id="radius"
                  type="number"
                  step="10"
                  min="50"
                  max="1000"
                  value={geofenceForm.radius}
                  onChange={(e) => setGeofenceForm(prev => ({ ...prev, radius: e.target.value }))}
                  placeholder="100"
                  required
                  className="text-sm sm:text-base mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">Range: 50 to 1000 meters</p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={getCurrentLocation}
                  disabled={locationLoading || loading}
                  className="w-full sm:w-auto min-h-[44px]"
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  {locationLoading ? 'Getting Location...' : 'Get Current Location'}
                </Button>
                <Button
                  type="submit"
                  disabled={loading || locationLoading}
                  className="flex-1 sm:flex-initial min-h-[44px]"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? 'Saving...' : 'Save Geofence Settings'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Edit Shift Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="w-[95vw] max-w-md sm:max-w-lg p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-base sm:text-lg">Edit Shift</DialogTitle>
              <DialogDescription className="text-sm">
                Modify the shift details. Changes will be reflected immediately for employees.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEditShift} className="space-y-4">
              <div>
                <Label htmlFor="editName" className="text-sm sm:text-base">Shift Name</Label>
                <Input
                  id="editName"
                  value={shiftForm.name}
                  onChange={(e) => setShiftForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Morning Shift"
                  required
                  className="text-sm sm:text-base mt-1"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <Label htmlFor="editStartTime" className="text-sm sm:text-base">Start Time</Label>
                  <Input
                    id="editStartTime"
                    type="text"
                    placeholder="9:00 AM"
                    value={shiftForm.startTime}
                    onChange={(e) => setShiftForm(prev => ({ ...prev, startTime: e.target.value }))}
                    required
                    className="text-sm sm:text-base mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Format: 9:00 AM</p>
                </div>
                <div>
                  <Label htmlFor="editEndTime" className="text-sm sm:text-base">End Time</Label>
                  <Input
                    id="editEndTime"
                    type="text"
                    placeholder="5:00 PM"
                    value={shiftForm.endTime}
                    onChange={(e) => setShiftForm(prev => ({ ...prev, endTime: e.target.value }))}
                    required
                    className="text-sm sm:text-base mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Format: 5:00 PM</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="editIsActive"
                  checked={shiftForm.isActive}
                  onCheckedChange={(checked) => setShiftForm(prev => ({ ...prev, isActive: checked }))}
                />
                <Label htmlFor="editIsActive" className="text-sm sm:text-base">Active</Label>
              </div>
              <div className="flex flex-col sm:flex-row justify-end gap-2">
                <Button type="button" variant="outline" onClick={closeDialogs} className="w-full sm:w-auto min-h-[44px]">
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} className="w-full sm:w-auto min-h-[44px]">
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? 'Updating...' : 'Update Shift'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
