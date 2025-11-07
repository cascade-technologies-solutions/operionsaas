
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Factory, MapPin, User, Building, Loader2, ArrowLeft, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { factoryService } from '@/services/api';

const factoryRegistrationSchema = z.object({
  factoryName: z.string().min(2, 'Factory name must be at least 2 characters'),
  adminFirstName: z.string().min(2, 'First name must be at least 2 characters'),
  adminLastName: z.string().min(2, 'Last name must be at least 2 characters'),
  adminEmail: z.string().email('Invalid email address'),
  adminPhone: z.string().min(10, 'Phone number must be at least 10 digits'),
  adminUsername: z.string().email('Username must be a valid email address'),
  adminPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string(),
  street: z.string().min(5, 'Street address is required'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  country: z.string().min(2, 'Country is required'),
  zipCode: z.string().min(5, 'ZIP code is required'),
  latitude: z.number().min(-90).max(90, 'Invalid latitude'),
  longitude: z.number().min(-180).max(180, 'Invalid longitude'),
  radius: z.number().min(50).max(1000, 'Radius must be between 50-1000 meters'),
}).refine((data) => data.adminPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type FactoryRegistrationForm = z.infer<typeof factoryRegistrationSchema>;

export default function FactoryRegistration() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const navigate = useNavigate();

  const form = useForm<FactoryRegistrationForm>({
    resolver: zodResolver(factoryRegistrationSchema),
    defaultValues: {
      factoryName: '',
      adminFirstName: '',
      adminLastName: '',
      adminEmail: '',
      adminPhone: '',
      adminUsername: '',
      adminPassword: '',
      confirmPassword: '',
      street: '',
      city: '',
      state: '',
      country: 'India',
      zipCode: '',
      latitude: 0,
      longitude: 0,
      radius: 150,
    },
  });

  const onSubmit = async (data: FactoryRegistrationForm) => {
    setIsLoading(true);
    try {
      await factoryService.registerFactory({
        name: data.factoryName,
        address: {
          street: data.street,
          city: data.city,
          state: data.state,
          country: data.country,
          zipCode: data.zipCode,
        },
        geofence: {
          latitude: data.latitude,
          longitude: data.longitude,
          radius: data.radius,
        },
        adminEmail: data.adminEmail,
        adminProfile: {
          firstName: data.adminFirstName,
          lastName: data.adminLastName,
          phone: data.adminPhone,
          address: `${data.street}, ${data.city}, ${data.state} ${data.zipCode}`,
        },
        adminCredentials: {
          username: data.adminUsername,
          password: data.adminPassword,
        },
        // subscription: {
        //   plan: 'basic',
        //   maxUsers: 50,
        // },
      });

      setIsSubmitted(true);
      toast.success('Factory registration submitted successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          form.setValue('latitude', position.coords.latitude);
          form.setValue('longitude', position.coords.longitude);
          toast.success('Location detected successfully');
        },
        () => {
          toast.error('Unable to detect location. Please enter coordinates manually.');
        }
      );
    } else {
      toast.error('Geolocation is not supported by this browser');
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-primary/5 p-4 sm:p-6">
        <Card className="w-full max-w-[95vw] sm:max-w-xl md:max-w-2xl shadow-xl text-center">
          <CardHeader className="p-6 sm:p-8">
            <div className="flex items-center justify-center mb-4 sm:mb-5">
              <div className="p-2 sm:p-3 bg-success/20 rounded-xl">
                <Factory className="h-6 w-6 sm:h-9 sm:w-9 text-success" />
              </div>
            </div>
            <CardTitle className="text-xl sm:text-2xl">Registration Submitted!</CardTitle>
            <CardDescription className="text-sm sm:text-base mt-3">
              Your factory registration has been submitted successfully.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 sm:space-y-6 p-6 sm:p-8">
            <Alert>
              <AlertDescription>
                Our team will review your application and notify you via email once approved. 
                This usually takes 1-2 business days.
              </AlertDescription>
            </Alert>
            <div className="space-y-3 sm:space-y-4">
              <Button onClick={() => navigate('/login')} className="w-full py-3 sm:py-4 text-sm sm:text-base">
                Go to Login
              </Button>
              <Button variant="outline" onClick={() => navigate('/')} className="w-full py-3 sm:py-4 text-sm sm:text-base">
                Back to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-primary/5 p-4 sm:p-6">
      <div className="mx-auto w-full max-w-[95vw] sm:max-w-2xl md:max-w-3xl lg:max-w-4xl py-6 sm:py-10">
        <div className="mb-4 sm:mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="mb-2 sm:mb-4 text-sm sm:text-base"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </div>

        <Card className="shadow-xl">
          <CardHeader className="text-center p-6 sm:p-8">
            <div className="flex items-center justify-center mb-4 sm:mb-5">
              <div className="p-2 sm:p-3 bg-gradient-primary rounded-xl shadow-glow">
                <Factory className="h-6 w-6 sm:h-9 sm:w-9 text-primary" />
              </div>
            </div>
            <CardTitle className="text-xl sm:text-2xl">Register Your Factory</CardTitle>
            <CardDescription className="text-sm sm:text-base mt-3">
              Fill out the details below to register your factory for management system access
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 sm:p-8">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 sm:space-y-8">
                {/* Factory Information */}
                <div className="space-y-4 sm:space-y-6">
                  <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                    <Building className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    Factory Information
                  </h3>
                  <FormField
                    control={form.control}
                    name="factoryName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Factory Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter factory name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Admin Information */}
                <div className="space-y-4 sm:space-y-6">
                  <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                    <User className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    Admin Information
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <FormField
                      control={form.control}
                      name="adminFirstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter first name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="adminLastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter last name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="adminEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="admin@factory.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="adminPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="+1 (555) 000-0000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Admin Login Credentials */}
                  <div className="space-y-4 sm:space-y-6 p-4 sm:p-5 bg-muted/20 rounded-lg border">
                    <h4 className="font-medium text-xs sm:text-sm text-muted-foreground flex items-center gap-2">
                      <Lock className="h-3 w-3 sm:h-4 sm:w-4" />
                      Login Credentials (You'll use these after approval)
                    </h4>
                    <FormField
                      control={form.control}
                      name="adminUsername"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter username" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="adminPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Enter password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Confirm password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Address Information */}
                <div className="space-y-4 sm:space-y-6">
                  <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                    <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    Factory Address
                  </h3>
                  <FormField
                    control={form.control}
                    name="street"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Street Address</FormLabel>
                        <FormControl>
                          <Input placeholder="123 Industrial Blvd" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter city" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter state" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <FormField
                      control={form.control}
                      name="country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Country</FormLabel>
                          <FormControl>
                            <Input placeholder="India" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="zipCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ZIP Code</FormLabel>
                          <FormControl>
                            <Input placeholder="123456" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Geofence Information */}
                <div className="space-y-4 sm:space-y-6">
                  <h3 className="text-base sm:text-lg font-semibold">Geofence Location</h3>
                  <div className="flex gap-2 mb-4 sm:mb-5">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={getCurrentLocation}
                      className="flex-1 text-sm sm:text-base"
                    >
                      <MapPin className="h-4 w-4 mr-2" />
                      <span className="hidden sm:inline">Detect Current Location</span>
                      <span className="sm:hidden">Detect Location</span>
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <FormField
                      control={form.control}
                      name="latitude"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Latitude</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="any"
                              placeholder="40.7128"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="longitude"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Longitude</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="any"
                              placeholder="-74.0060"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="radius"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Geofence Radius (meters)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="150"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 150)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Subscription Section - Commented for now */}
                {/* <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Subscription Plan</h3>
                  <div className="grid gap-4">
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium">Basic Plan</h4>
                      <p className="text-sm text-muted-foreground">Up to 50 users, basic features</p>
                    </div>
                  </div>
                </div> */}

                <Button 
                  type="submit" 
                  className="w-full bg-gradient-primary hover:shadow-glow transition-all text-foreground text-sm sm:text-base"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      <span className="hidden sm:inline">Submitting Registration...</span>
                      <span className="sm:hidden">Submitting...</span>
                    </>
                  ) : (
                    <>
                      <span className="hidden sm:inline">Submit Factory Registration</span>
                      <span className="sm:hidden">Submit Registration</span>
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
