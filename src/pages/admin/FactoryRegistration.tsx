import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { MapPin, Building, User, CreditCard, Upload, Map } from 'lucide-react';
import { toast } from 'sonner';
import { geolocationService } from '@/services/geolocationService';

interface FactoryFormData {
  name: string;
  description: string;
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
  };
  geofence: {
    latitude: number | null;
    longitude: number | null;
    radius: number;
  };
  subscription: {
    plan: 'basic' | 'pro' | 'enterprise';
    maxUsers: number;
  };
  documents: File[];
}

export default function FactoryRegistration() {
  const [formData, setFormData] = useState<FactoryFormData>({
    name: '',
    description: '',
    address: {
      street: '',
      city: '',
      state: '',
      country: '',
      zipCode: '',
    },
    geofence: {
      latitude: null,
      longitude: null,
      radius: 100,
    },
    subscription: {
      plan: 'basic',
      maxUsers: 50,
    },
    documents: [],
  });

  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [accuracyTrackingTimer, setAccuracyTrackingTimer] = useState<number>(0);
  const [isAccuracyTracking, setIsAccuracyTracking] = useState<boolean>(false);

  const handleInputChange = (field: string, value: any) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...(prev[parent as keyof FactoryFormData] as object),
          [child]: value,
        },
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const getCurrentLocation = async () => {
    setLocationLoading(true);
    try {
      // Start 5-second high-accuracy location tracking
      const preciseLocation = await startAccuracyTracking();
      
      if (!preciseLocation) {
        toast.error('Failed to get precise factory location. Please try again.');
        setLocationLoading(false);
        return;
      }

      setFormData(prev => ({
        ...prev,
        geofence: {
          ...prev.geofence,
          latitude: preciseLocation.latitude,
          longitude: preciseLocation.longitude,
        },
      }));
      
      // Show location info with accuracy details
      const accuracyLevel = preciseLocation.accuracy <= 10 ? 'Excellent' : 
                           preciseLocation.accuracy <= 20 ? 'Good' : 
                           preciseLocation.accuracy <= 50 ? 'Fair' : 'Poor';
      
      toast.success(`📍 Factory location set! Accuracy: ${preciseLocation.accuracy.toFixed(1)}m (${accuracyLevel})`);
    } catch (error) {
      toast.error('Failed to get factory location');
    } finally {
      setLocationLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setFormData(prev => ({ ...prev, documents: [...prev.documents, ...files] }));
  };

  const removeDocument = (index: number) => {
    setFormData(prev => ({
      ...prev,
      documents: prev.documents.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.geofence.latitude || !formData.geofence.longitude) {
      toast.error('Please set the factory location');
      return;
    }

    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.success('Factory registration submitted for approval');
      
      // Reset form
      setFormData({
        name: '',
        description: '',
        address: {
          street: '',
          city: '',
          state: '',
          country: '',
          zipCode: '',
        },
        geofence: {
          latitude: null,
          longitude: null,
          radius: 100,
        },
        subscription: {
          plan: 'basic',
          maxUsers: 50,
        },
        documents: [],
      });
    } catch (error) {
      toast.error('Failed to submit registration');
    } finally {
      setLoading(false);
    }
  };

  // 5-second high-accuracy location tracking for factory location
  const startAccuracyTracking = async (): Promise<{latitude: number, longitude: number, accuracy: number} | null> => {
    setIsAccuracyTracking(true);
    setAccuracyTrackingTimer(5);
    

    
    // Show initial countdown
    toast.info('🎯 Getting precise factory location... (5 seconds)');
    
    // Countdown timer
    const countdownInterval = setInterval(() => {
      setAccuracyTrackingTimer(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    // Get multiple high-accuracy readings over 5 seconds
    const locationReadings: Array<{latitude: number, longitude: number, accuracy: number}> = [];
    
    for (let i = 0; i < 5; i++) {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 8000,  // 8 seconds timeout for each reading
            maximumAge: 0   // Force fresh GPS reading
          });
        });
        
        locationReadings.push({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
        

        
        // Wait 1 second between readings
        if (i < 4) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        // Location reading failed
      }
    }
    
    clearInterval(countdownInterval);
    setIsAccuracyTracking(false);
    setAccuracyTrackingTimer(0);
    
    if (locationReadings.length === 0) {
      toast.error('❌ Failed to get accurate factory location');
      return null;
    }
    
    // Calculate average location and find best accuracy
    const avgLat = locationReadings.reduce((sum, reading) => sum + reading.latitude, 0) / locationReadings.length;
    const avgLng = locationReadings.reduce((sum, reading) => sum + reading.longitude, 0) / locationReadings.length;
    const bestAccuracy = Math.min(...locationReadings.map(r => r.accuracy));
    
    const finalLocation = {
      latitude: avgLat,
      longitude: avgLng,
      accuracy: bestAccuracy
    };
    

    
    toast.success(`✅ Precise factory location acquired! Accuracy: ${bestAccuracy.toFixed(1)}m`);
    
    return finalLocation;
  };

  const subscriptionPlans = {
    basic: { maxUsers: 50, price: '$99/month' },
    pro: { maxUsers: 100, price: '$199/month' },
    enterprise: { maxUsers: 500, price: '$499/month' },
  };

  return (
    <Layout title="Factory Registration">
      <div className="max-w-4xl mx-auto">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-6 w-6" />
              Register New Factory
            </CardTitle>
            <CardDescription>
              Please provide all required information to register your factory. 
              Your submission will be reviewed by our team.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Factory Information
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Factory Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="Enter factory name"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      placeholder="Brief description of your factory"
                    />
                  </div>
                </div>
              </div>

              {/* Address Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Factory Address
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label htmlFor="street">Street Address *</Label>
                    <Input
                      id="street"
                      value={formData.address.street}
                      onChange={(e) => handleInputChange('address.street', e.target.value)}
                      placeholder="Enter street address"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      value={formData.address.city}
                      onChange={(e) => handleInputChange('address.city', e.target.value)}
                      placeholder="Enter city"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">State/Province *</Label>
                    <Input
                      id="state"
                      value={formData.address.state}
                      onChange={(e) => handleInputChange('address.state', e.target.value)}
                      placeholder="Enter state or province"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="country">Country *</Label>
                    <Input
                      id="country"
                      value={formData.address.country}
                      onChange={(e) => handleInputChange('address.country', e.target.value)}
                      placeholder="Enter country"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="zipCode">ZIP/Postal Code *</Label>
                    <Input
                      id="zipCode"
                      value={formData.address.zipCode}
                      onChange={(e) => handleInputChange('address.zipCode', e.target.value)}
                      placeholder="Enter ZIP code"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Geofence Setup */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <Map className="h-5 w-5" />
                  Geofence Location
                </h3>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="latitude">Latitude</Label>
                    <Input
                      id="latitude"
                      type="number"
                      step="any"
                      value={formData.geofence.latitude || ''}
                      onChange={(e) => handleInputChange('geofence.latitude', parseFloat(e.target.value))}
                      placeholder="Latitude"
                      disabled
                    />
                  </div>
                  <div>
                    <Label htmlFor="longitude">Longitude</Label>
                    <Input
                      id="longitude"
                      type="number"
                      step="any"
                      value={formData.geofence.longitude || ''}
                      onChange={(e) => handleInputChange('geofence.longitude', parseFloat(e.target.value))}
                      placeholder="Longitude"
                      disabled
                    />
                  </div>
                  <div>
                    <Label htmlFor="radius">Radius (meters)</Label>
                    <Input
                      id="radius"
                      type="number"
                      min="50"
                      max="1000"
                      value={formData.geofence.radius}
                      onChange={(e) => handleInputChange('geofence.radius', parseInt(e.target.value))}
                      placeholder="100"
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={getCurrentLocation}
                  disabled={locationLoading}
                  className="w-full"
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  {locationLoading ? 'Getting Location...' : 'Use Current Location'}
                </Button>
                
                {/* Accuracy Tracking Countdown */}
                {isAccuracyTracking && (
                  <div className="bg-gradient-to-r from-orange-50 to-amber-50 p-4 rounded-lg border border-orange-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-orange-500 animate-pulse"></div>
                        <span className="font-medium text-orange-800">
                          🎯 Getting Precise Factory Location...
                        </span>
                      </div>
                      <div className="text-2xl font-bold text-orange-600">
                        {accuracyTrackingTimer}s
                      </div>
                    </div>
                    <div className="mt-2 text-sm text-orange-700">
                      Taking multiple GPS readings for maximum accuracy...
                    </div>
                  </div>
                )}
                
                {formData.geofence.latitude && formData.geofence.longitude && (
                  <div className="p-3 bg-success/10 rounded-lg">
                    <p className="text-sm text-success">
                      Location set: {formData.geofence.latitude.toFixed(6)}, {formData.geofence.longitude.toFixed(6)}
                    </p>
                  </div>
                )}
              </div>

              {/* Subscription Plan */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Subscription Plan
                </h3>
                <div className="grid md:grid-cols-3 gap-4">
                  {Object.entries(subscriptionPlans).map(([plan, details]) => (
                    <Card 
                      key={plan}
                      className={`cursor-pointer transition-colors ${
                        formData.subscription.plan === plan 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => {
                        handleInputChange('subscription.plan', plan);
                        handleInputChange('subscription.maxUsers', details.maxUsers);
                      }}
                    >
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm capitalize">{plan}</CardTitle>
                        <CardDescription>{details.price}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm">Up to {details.maxUsers} users</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Document Upload */}
              <div className="space-y-4">
                <h3 className="text-base sm:text-lg font-medium flex items-center gap-2">
                  <Upload className="h-4 w-4 sm:h-5 sm:w-5" />
                  Required Documents
                </h3>
                <div>
                  <Label htmlFor="documents" className="text-sm sm:text-base">
                    Upload business license, tax certificates, and other required documents
                  </Label>
                  <Input
                    id="documents"
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileUpload}
                    className="mt-2 h-12 sm:h-10"
                  />
                </div>
                {formData.documents.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm sm:text-base">Uploaded Documents:</Label>
                    <div className="flex flex-wrap gap-2">
                      {formData.documents.map((file, index) => (
                        <Badge key={index} variant="outline" className="pr-1 text-xs sm:text-sm">
                          {file.name}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="ml-1 h-4 w-4 p-0"
                            onClick={() => removeDocument(index)}
                          >
                            ×
                          </Button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 sm:h-10 text-base sm:text-sm bg-gradient-primary hover:shadow-glow"
                size="lg"
              >
                {loading ? 'Submitting...' : 'Submit Registration'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}