
import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Building2, MapPin, Users, Calendar } from 'lucide-react';
import { factoryService } from '@/services/api';
import { toast } from 'sonner';

export default function FactoryCreation() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    street: '',
    city: '',
    state: '',
    country: '',
    zipCode: '',
    latitude: '',
    longitude: '',
    radius: '100',
    adminEmail: '',
    adminFirstName: '',
    adminLastName: '',
    adminPhone: '',
    plan: 'basic' as 'basic' | 'pro' | 'enterprise',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const factoryData = {
        name: formData.name,
        address: {
          street: formData.street,
          city: formData.city,
          state: formData.state,
          country: formData.country,
          zipCode: formData.zipCode,
        },
        geofence: {
          latitude: parseFloat(formData.latitude),
          longitude: parseFloat(formData.longitude),
          radius: parseInt(formData.radius),
        },
        adminEmail: formData.adminEmail,
        adminProfile: {
          firstName: formData.adminFirstName,
          lastName: formData.adminLastName,
          phone: formData.adminPhone,
        },
        subscription: {
          plan: formData.plan,
          // Add validUntil to satisfy Factory['subscription'] type
          validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          maxUsers: formData.plan === 'basic' ? 25 : formData.plan === 'pro' ? 100 : 500,
        },
      };

      await factoryService.createFactory(factoryData);
      toast.success('Factory created successfully and sent for approval');
      
      // Reset form
      setFormData({
        name: '',
        street: '',
        city: '',
        state: '',
        country: '',
        zipCode: '',
        latitude: '',
        longitude: '',
        radius: '100',
        adminEmail: '',
        adminFirstName: '',
        adminLastName: '',
        adminPhone: '',
        plan: 'basic',
      });
    } catch (error) {
      toast.error('Failed to create factory');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Layout title="Create Factory">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Create New Factory</h1>
          <p className="text-muted-foreground">
            Set up a new factory with admin account and subscription
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Factory Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Factory Information
              </CardTitle>
              <CardDescription>
                Basic details about the factory
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Factory Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Enter factory name"
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Address Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Address & Location
              </CardTitle>
              <CardDescription>
                Physical address and geofence settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="street">Street Address</Label>
                <Input
                  id="street"
                  value={formData.street}
                  onChange={(e) => handleInputChange('street', e.target.value)}
                  placeholder="Enter street address"
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    placeholder="Enter city"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => handleInputChange('state', e.target.value)}
                    placeholder="Enter state"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={(e) => handleInputChange('country', e.target.value)}
                    placeholder="Enter country"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="zipCode">Zip Code</Label>
                  <Input
                    id="zipCode"
                    value={formData.zipCode}
                    onChange={(e) => handleInputChange('zipCode', e.target.value)}
                    placeholder="Enter zip code"
                    required
                  />
                </div>
              </div>
              
              {/* Geofence Settings */}
              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Geofence Settings</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="latitude">Latitude</Label>
                    <Input
                      id="latitude"
                      type="number"
                      step="any"
                      value={formData.latitude}
                      onChange={(e) => handleInputChange('latitude', e.target.value)}
                      placeholder="e.g., 42.3314"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="longitude">Longitude</Label>
                    <Input
                      id="longitude"
                      type="number"
                      step="any"
                      value={formData.longitude}
                      onChange={(e) => handleInputChange('longitude', e.target.value)}
                      placeholder="e.g., -83.0458"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="radius">Radius (meters)</Label>
                    <Input
                      id="radius"
                      type="number"
                      value={formData.radius}
                      onChange={(e) => handleInputChange('radius', e.target.value)}
                      placeholder="100"
                      required
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Admin Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Factory Admin
              </CardTitle>
              <CardDescription>
                Create admin account for this factory
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="adminEmail">Admin Email</Label>
                <Input
                  id="adminEmail"
                  type="email"
                  value={formData.adminEmail}
                  onChange={(e) => handleInputChange('adminEmail', e.target.value)}
                  placeholder="admin@factory.com"
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="adminFirstName">First Name</Label>
                  <Input
                    id="adminFirstName"
                    value={formData.adminFirstName}
                    onChange={(e) => handleInputChange('adminFirstName', e.target.value)}
                    placeholder="John"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="adminLastName">Last Name</Label>
                  <Input
                    id="adminLastName"
                    value={formData.adminLastName}
                    onChange={(e) => handleInputChange('adminLastName', e.target.value)}
                    placeholder="Doe"
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="adminPhone">Phone Number</Label>
                <Input
                  id="adminPhone"
                  type="tel"
                  value={formData.adminPhone}
                  onChange={(e) => handleInputChange('adminPhone', e.target.value)}
                  placeholder="+1234567890"
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Subscription Plan */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Subscription Plan
              </CardTitle>
              <CardDescription>
                Choose the appropriate plan for this factory
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {['basic', 'pro', 'enterprise'].map((plan) => (
                  <div
                    key={plan}
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      formData.plan === plan ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => handleInputChange('plan', plan)}
                  >
                    <div className="text-center">
                      <h4 className="font-semibold capitalize">{plan}</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Max {plan === 'basic' ? '25' : plan === 'pro' ? '100' : '500'} users
                      </p>
                      <Badge variant={formData.plan === plan ? 'default' : 'outline'} className="mt-2">
                        {formData.plan === plan ? 'Selected' : 'Select'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-center">
            <Button
              type="submit"
              size="lg"
              disabled={isSubmitting}
              className="w-full md:w-auto px-8"
            >
              {isSubmitting ? 'Creating Factory...' : 'Create Factory'}
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
