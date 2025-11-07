import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CameraCapture } from '@/components/CameraCapture';
import { productionService, productService, machineService, factoryService } from '@/services/api';
import { apiClient } from '@/services/api/client';
import { Product, Machine } from '@/types';
import { Camera, Loader2, CheckCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';

interface Shift {
  name: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

interface ProcessStage {
  processId: string;
  processName: string;
  stageOrder: number;
}

interface ProcessStatus {
  availableQuantity: number;
  stageOrder: number;
  isFirstStage: boolean;
}

export default function ProductionEntry() {
  const { user } = useAuthStore();
  const [checkinTime, setCheckinTime] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [processStages, setProcessStages] = useState<ProcessStage[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedProcess, setSelectedProcess] = useState('');
  const [selectedMachine, setSelectedMachine] = useState('');
  const [selectedShift, setSelectedShift] = useState('');
  const [achievedQuantity, setAchievedQuantity] = useState('');
  const [rejectedQuantity, setRejectedQuantity] = useState('');
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [processStatus, setProcessStatus] = useState<ProcessStatus | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [loadingStages, setLoadingStages] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  // Load initial data
  useEffect(() => {
    loadProducts();
    loadMachines();
    loadShifts();
  }, []);

  // Load process stages when product changes
  useEffect(() => {
    if (selectedProduct) {
      loadProcessStages(selectedProduct);
      setSelectedProcess(''); // Reset process selection
      setProcessStatus(null); // Reset status
    } else {
      setProcessStages([]);
      setProcessStatus(null);
    }
  }, [selectedProduct]);

  // Load process status when process changes
  useEffect(() => {
    if (selectedProduct && selectedProcess) {
      loadProcessStatus(selectedProduct, selectedProcess);
    } else {
      setProcessStatus(null);
    }
  }, [selectedProduct, selectedProcess]);

  const loadProducts = async () => {
    try {
      const response = await productService.getProducts();
      const productsArray = response.data?.products || response.data || [];
      setProducts(Array.isArray(productsArray) ? productsArray : []);
    } catch (error: any) {
      console.error('Failed to load products:', error);
      toast.error('Failed to load products');
    }
  };

  const loadProcessStages = async (productId: string) => {
    setLoadingStages(true);
    try {
      const response = await productionService.getProcessStagesByProduct(productId);
      setProcessStages(response.data.stages || []);
    } catch (error: any) {
      console.error('Failed to load process stages:', error);
      toast.error(error.message || 'Failed to load process stages');
      setProcessStages([]);
    } finally {
      setLoadingStages(false);
    }
  };

  const loadMachines = async () => {
    try {
      const response = await machineService.getMachines();
      setMachines(response.data || []);
    } catch (error: any) {
      console.error('Failed to load machines:', error);
      toast.error('Failed to load machines');
    }
  };

  const loadShifts = async () => {
    try {
      if (!user?.factoryId) {
        toast.error('Factory information not found. Please contact your administrator.');
        setShifts([]);
        return;
      }

      // Clear cached shifts so we always get the latest from factory settings
      apiClient.clearCache('/factories/');

      const response = await factoryService.getFactory(user.factoryId, { noCache: true });
      const factoryData = response.data || response;
      const shiftsArray = factoryData?.settings?.shifts || [];

      // Only keep active shifts
      setShifts(Array.isArray(shiftsArray) ? shiftsArray.filter(shift => shift.isActive !== false) : []);
    } catch (error: any) {
      console.error('Failed to load shifts:', error);
      toast.error('Failed to load shifts');
    }
  };

  const loadProcessStatus = async (productId: string, stageId: string) => {
    setLoadingStatus(true);
    try {
      const response = await productionService.getProcessStatus(productId, stageId);
      setProcessStatus(response.data);
    } catch (error: any) {
      console.error('Failed to load process status:', error);
      toast.error(error.message || 'Failed to load process status');
      setProcessStatus(null);
    } finally {
      setLoadingStatus(false);
    }
  };

  const handleCheckIn = async () => {
    setCheckingIn(true);
    try {
      const response = await productionService.checkIn();
      setCheckinTime(response.data.checkinTime);
      toast.success('Check-in successful');
    } catch (error: any) {
      console.error('Check-in failed:', error);
      toast.error(error.message || 'Failed to check in');
    } finally {
      setCheckingIn(false);
    }
  };

  const handleCameraCapture = (photoDataUrl: string) => {
    setCapturedPhoto(photoDataUrl);
    setIsCameraOpen(false);
  };

  const handleCameraCancel = () => {
    setIsCameraOpen(false);
  };

  const handleSubmit = async () => {
    if (!checkinTime) {
      toast.error('Please check in first');
      return;
    }

    if (!selectedProduct || !selectedProcess || !selectedMachine || !selectedShift) {
      toast.error('Please fill in all required fields');
      return;
    }

    const numericAchieved = parseInt(achievedQuantity);
    const numericRejected = parseInt(rejectedQuantity || '0');

    if (isNaN(numericAchieved) || numericAchieved <= 0) {
      toast.error('Please enter a valid achieved quantity');
      return;
    }

    if (isNaN(numericRejected) || numericRejected < 0) {
      toast.error('Please enter a valid rejected quantity');
      return;
    }

    if (!capturedPhoto) {
      toast.error('Please capture a photo');
      return;
    }

    // Validate available quantity for non-first stages
    if (processStatus && !processStatus.isFirstStage) {
      const totalToConsume = numericAchieved + numericRejected;
      if (totalToConsume > processStatus.availableQuantity) {
        toast.error(`Insufficient quantity available. Available: ${processStatus.availableQuantity}, Required: ${totalToConsume}`);
        return;
      }
    }

    setLoading(true);
    try {
      await productionService.submitProduction({
        checkinTime,
        productId: selectedProduct,
        processId: selectedProcess,
        machineId: selectedMachine,
        shiftType: selectedShift,
        achieved: numericAchieved,
        rejected: numericRejected,
        photo: capturedPhoto
      });

      toast.success('Production entry submitted successfully');
      
      // Reset form
      setCheckinTime(null);
      setSelectedProduct('');
      setSelectedProcess('');
      setSelectedMachine('');
      setSelectedShift('');
      setAchievedQuantity('');
      setRejectedQuantity('');
      setCapturedPhoto(null);
      setProcessStatus(null);
    } catch (error: any) {
      console.error('Submit failed:', error);
      toast.error(error.message || 'Failed to submit production entry');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Production Entry</h1>
            <p className="text-muted-foreground">Enter your production data</p>
          </div>
        </div>

        {/* Check-in Section */}
        <Card>
          <CardHeader>
            <CardTitle>Check-in</CardTitle>
            <CardDescription>Start your production session</CardDescription>
          </CardHeader>
          <CardContent>
            {!checkinTime ? (
              <Button 
                onClick={handleCheckIn} 
                disabled={checkingIn}
                className="w-full"
                size="lg"
              >
                {checkingIn ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Checking in...
                  </>
                ) : (
                  <>
                    <Clock className="mr-2 h-4 w-4" />
                    Check In
                  </>
                )}
              </Button>
            ) : (
              <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="font-medium">Checked in at {new Date(checkinTime).toLocaleTimeString()}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Production Form */}
        {checkinTime && (
          <Card>
            <CardHeader>
              <CardTitle>Production Details</CardTitle>
              <CardDescription>Fill in the production information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Product Selection */}
              <div className="space-y-2">
                <Label htmlFor="product">Product *</Label>
                <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                  <SelectTrigger id="product">
                    <SelectValue placeholder="Select a product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product._id || product.id} value={String(product._id || product.id)}>
                        {product.name} ({product.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Process Stage Selection */}
              {selectedProduct && (
                <div className="space-y-2">
                  <Label htmlFor="process">Process Stage *</Label>
                  <Select 
                    value={selectedProcess} 
                    onValueChange={setSelectedProcess}
                    disabled={loadingStages}
                  >
                    <SelectTrigger id="process">
                      <SelectValue placeholder={loadingStages ? "Loading stages..." : "Select a process stage"} />
                    </SelectTrigger>
                    <SelectContent>
                      {processStages.map((stage) => (
                        <SelectItem key={stage.processId} value={stage.processId}>
                          Stage {stage.stageOrder}: {stage.processName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Process Status Display */}
              {selectedProcess && processStatus && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Available from Previous Stage:</span>
                    <span className="text-2xl font-bold">
                      {processStatus.isFirstStage ? 'Unlimited' : processStatus.availableQuantity}
                    </span>
                  </div>
                  {loadingStatus && (
                    <div className="mt-2 text-sm text-muted-foreground">
                      <Loader2 className="inline h-3 w-3 animate-spin mr-1" />
                      Calculating...
                    </div>
                  )}
                </div>
              )}

              {/* Machine Selection */}
              <div className="space-y-2">
                <Label htmlFor="machine">Machine *</Label>
                <Select value={selectedMachine} onValueChange={setSelectedMachine}>
                  <SelectTrigger id="machine">
                    <SelectValue placeholder="Select a machine" />
                  </SelectTrigger>
                  <SelectContent>
                    {machines.map((machine) => (
                      <SelectItem key={machine._id || machine.id} value={String(machine._id || machine.id)}>
                        {machine.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Shift Selection */}
              <div className="space-y-2">
                <Label htmlFor="shift">Shift *</Label>
                <Select value={selectedShift} onValueChange={setSelectedShift}>
                  <SelectTrigger id="shift">
                    <SelectValue placeholder="Select a shift" />
                  </SelectTrigger>
                  <SelectContent>
                    {shifts.map((shift) => (
                      <SelectItem key={shift.name} value={shift.name}>
                        {shift.name} ({shift.startTime} - {shift.endTime})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Quantity Inputs */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="achieved">Achieved Quantity *</Label>
                  <Input
                    id="achieved"
                    type="number"
                    min="0"
                    value={achievedQuantity}
                    onChange={(e) => setAchievedQuantity(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rejected">Rejected Quantity</Label>
                  <Input
                    id="rejected"
                    type="number"
                    min="0"
                    value={rejectedQuantity}
                    onChange={(e) => setRejectedQuantity(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Photo Capture */}
              <div className="space-y-2">
                <Label>Photo *</Label>
                {capturedPhoto ? (
                  <div className="space-y-2">
                    <img 
                      src={capturedPhoto} 
                      alt="Captured" 
                      className="w-full max-w-md rounded-lg border"
                    />
                    <Button
                      variant="outline"
                      onClick={() => setCapturedPhoto(null)}
                    >
                      Remove Photo
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCameraOpen(true)}
                    className="w-full"
                  >
                    <Camera className="mr-2 h-4 w-4" />
                    Capture Photo
                  </Button>
                )}
              </div>

              {/* Submit Button */}
              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Production'
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Camera Modal */}
        {isCameraOpen && (
          <CameraCapture
            onCapture={handleCameraCapture}
            onCancel={handleCameraCancel}
          />
        )}
      </div>
    </Layout>
  );
}

