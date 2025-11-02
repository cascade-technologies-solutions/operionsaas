import { ReactNode } from 'react';
import { Menu, LogOut, User, Factory, BarChart3, Users, Package, Settings, Clock, Wrench, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/authStore';
import { useTenant } from '@/contexts/TenantContext';
import { useNavigate } from 'react-router-dom';
import { NetworkStatus } from '@/components/NetworkStatus';
import { InstallPWAButton } from '@/components/InstallPWAButton';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import EnhancedMobileNav from './layout/EnhancedMobileNav';

interface LayoutProps {
  children: ReactNode;
  title?: string;
}

export const Layout: React.FC<LayoutProps> = ({ children, title }) => {
  const { user, logout } = useAuthStore();
  const { currentFactory } = useTenant();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getNavItems = () => {
    if (!user) return [];

    switch (user.role) {
      case 'super_admin':
        return [
          { icon: Factory, label: 'Factories', path: '/super-admin' },
          { icon: Settings, label: 'Settings', path: '/super-admin/settings' },
        ];
      case 'factory_admin':
        return [
          { icon: BarChart3, label: 'Dashboard', path: '/admin' },
          { icon: Package, label: 'Products', path: '/admin/products' },
          { icon: Users, label: 'Users', path: '/admin/users' },
          { icon: FileText, label: 'Product Report', path: '/supervisor/product-report' },
          { icon: Wrench, label: 'Factory Settings', path: '/admin/factory-settings' },
          { icon: Settings, label: 'Settings', path: '/admin/settings' },
        ];
      case 'supervisor':
        return [
          { icon: BarChart3, label: 'Dashboard', path: '/supervisor' },
          { icon: Users, label: 'Employees', path: '/supervisor/employees' },
          { icon: Package, label: 'Validation', path: '/supervisor/validation' },
          { icon: Clock, label: 'Attendance', path: '/supervisor/attendance' },
          { icon: FileText, label: 'Product Report', path: '/supervisor/product-report' },
        ];
      case 'employee':
        return [
          { icon: BarChart3, label: 'Dashboard', path: '/employee' },
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-card shadow-sm">
        <div className="flex h-14 items-center px-3 sm:px-4">
          <div className="flex items-center gap-3 sm:gap-4 flex-1">
            <h1 className="text-base sm:text-lg font-semibold text-foreground truncate">
              {title || (user?.role === 'super_admin' ? 'MFMS' : currentFactory?.name || 'MFMS')}
            </h1>
            <NetworkStatus />
            <InstallPWAButton variant="ghost" size="sm" className="hidden sm:flex" />
          </div>
          
          <div className="flex items-center gap-2">
            <InstallPWAButton variant="ghost" size="icon" className="sm:hidden" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="ml-auto h-9 w-9 sm:h-10 sm:w-10">
                  <Menu className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {user?.profile.firstName} {user?.profile.lastName}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {navItems.map((item) => (
                  <DropdownMenuItem
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className="cursor-pointer"
                  >
                    <item.icon className="mr-2 h-4 w-4" />
                    <span>{item.label}</span>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/profile')} className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className={cn(
        "flex-1 p-3 sm:p-4 md:p-6 max-w-7xl mx-auto w-full",
        user?.role === 'employee' ? 'pb-20 sm:pb-24' : 'pb-16 sm:pb-20 md:pb-6'
      )}>
        {children}
      </main>
      
      {/* Mobile Navigation */}
      <div className="md:hidden">
        <EnhancedMobileNav />
      </div>
    </div>
  );
};