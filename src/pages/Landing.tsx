
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { InstallPWAButton } from '@/components/InstallPWAButton';
import { Factory, Package, Users, BarChart3, Shield, Globe } from 'lucide-react';

const Landing = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Factory,
      title: 'Multi-Tenant Architecture',
      description: 'Isolated factory management with complete data separation'
    },
    {
      icon: Users,
      title: 'Role-Based Access',
      description: 'Super Admin, Factory Admin, Supervisor, and Employee roles'
    },
    {
      icon: Package,
      title: 'Production Management',
      description: 'Track products, processes, and real-time production data'
    },
    {
      icon: BarChart3,
      title: 'Analytics & Reports',
      description: 'Comprehensive analytics with efficiency and rejection tracking'
    },
    {
      icon: Shield,
      title: 'Secure & Scalable',
      description: 'Enterprise-grade security with JWT authentication'
    },
    {
      icon: Globe,
      title: 'Offline Support',
      description: 'Work seamlessly offline with automatic sync'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-primary/5 -z-10" />
        <div className="container mx-auto px-4 py-16 md:py-24">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6 animate-fade-in">
              Factory Management System
            </h1>
            <p className="text-xl text-muted-foreground mb-8 animate-fade-in animation-delay-200">
              Streamline your factory operations with our comprehensive multi-tenant management platform
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in animation-delay-400">
              <Button 
                size="lg" 
                onClick={() => navigate('/register-factory')}
                className="text-lg px-8"
              >
                Get Started - Register Your Factory
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                onClick={() => navigate('/login')}
                className="text-lg px-8"
              >
                Login to Existing Account
              </Button>
              <InstallPWAButton 
                size="lg" 
                variant="outline"
                className="text-lg px-8"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 py-16">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
          Powerful Features for Modern Factories
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <Card 
              key={index}
              className="p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 animate-scale-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <feature.icon className="h-12 w-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* How it Works Section */}
      <div className="bg-muted/30 py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            How It Works
          </h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary">1</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Register Your Factory</h3>
              <p className="text-muted-foreground">
                Fill out your factory details, admin information, and geofence location
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary">2</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Wait for Approval</h3>
              <p className="text-muted-foreground">
                Our team reviews your application and approves your factory setup
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Start Managing</h3>
              <p className="text-muted-foreground">
                Access your dashboard and start managing products, processes, and employees
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-primary/5 py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Transform Your Factory?
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join hundreds of factories already using our platform to improve efficiency and reduce costs
          </p>
          <Button 
            size="lg"
            onClick={() => navigate('/register-factory')}
            className="text-lg px-10 py-6"
          >
            Register Your Factory Now
          </Button>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t py-8 mt-16">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>&copy; 2024 Factory Management System. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
