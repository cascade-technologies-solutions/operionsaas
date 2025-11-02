import { NavLink } from 'react-router-dom';
import { 
  Home, 
  Package, 
  Settings2, 
  Users, 
  BarChart3,
  ClipboardCheck,
  Camera,
  TrendingUp,
  Factory,
  UserPlus,
  FileText,
  Clock,
  CheckSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { Badge } from '@/components/ui/badge';

const EnhancedMobileNav = () => {
  const { user } = useAuthStore();

  const getNavItems = () => {
    if (!user) return [];

    switch (user.role) {
      case 'super_admin':
        return [
          { path: '/super-admin', icon: Home, label: 'Dashboard', badge: null },
          { path: '/super-admin/factories', icon: Factory, label: 'Factories', badge: '3' },
          { path: '/super-admin/analytics', icon: BarChart3, label: 'Analytics', badge: null },
          { path: '/super-admin/settings', icon: Settings2, label: 'Settings', badge: null },
        ];
      case 'factory_admin':
        return [
          { path: '/admin', icon: Home, label: 'Dashboard', badge: null },
          { path: '/admin/products', icon: Package, label: 'Products', badge: null },
          { path: '/admin/users', icon: Users, label: 'Users', badge: null },
          { path: '/admin/machines', icon: Settings2, label: 'Machines', badge: null },
          { path: '/admin/reports', icon: BarChart3, label: 'Reports', badge: null },
          { path: '/admin/settings', icon: Settings2, label: 'Settings', badge: null },
        ];
      case 'supervisor':
        return [
          { path: '/supervisor', icon: Home, label: 'Dashboard', badge: null },
          { path: '/supervisor/employees', icon: Users, label: 'Employees', badge: null },
          { path: '/supervisor/validation', icon: ClipboardCheck, label: 'Validate', badge: '12' },
          { path: '/supervisor/attendance', icon: Clock, label: 'Attendance', badge: null },
          { path: '/supervisor/reports', icon: FileText, label: 'Reports', badge: null },
        ];
      case 'employee':
        return [
          { path: '/employee', icon: Home, label: 'Dashboard', badge: null },
          { path: '/employee/performance', icon: TrendingUp, label: 'Performance', badge: null },
          { path: '/employee/attendance', icon: Clock, label: 'Attendance', badge: null },
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  if (navItems.length === 0) return null;

  return (
    <nav className={cn(
      "fixed bottom-0 left-0 right-0 z-50 bg-card border-t shadow-lg",
      user?.role === 'employee' ? '' : 'md:hidden'
    )}>
      <div className={cn(
        "grid h-16 px-1 sm:px-2",
        navItems.length === 4 ? "grid-cols-4" : 
        navItems.length === 5 ? "grid-cols-5" : 
        navItems.length === 6 ? "grid-cols-6" :
        "grid-cols-4"
      )}>
        {navItems.map((item) => {
          // Only use exact matching for dashboard routes to prevent them from being active on sub-routes
          const isDashboardRoute = item.path === '/super-admin' || item.path === '/admin' || item.path === '/supervisor' || item.path === '/employee';
          
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={isDashboardRoute}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center justify-center gap-1 text-xs transition-all duration-200 relative p-1 sm:p-2 rounded-lg mx-0.5 sm:mx-1',
                  isActive
                    ? 'text-primary bg-primary/10 shadow-md'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <div className="relative">
                    <item.icon className={cn("h-4 w-4 sm:h-5 sm:w-5", isActive && "scale-110")} />
                    {item.badge && (
                      <Badge 
                        variant="destructive" 
                        className="absolute -top-1 -right-1 h-3 w-3 sm:h-4 sm:w-4 p-0 text-xs flex items-center justify-center"
                      >
                        {item.badge}
                      </Badge>
                    )}
                  </div>
                  <span className={cn(
                    "truncate px-0.5 sm:px-1 font-medium text-xs", 
                    isActive && "text-primary"
                  )}>
                    {item.label}
                  </span>
                  {isActive && (
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-6 sm:w-8 h-1 bg-primary rounded-t-full" />
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

export default EnhancedMobileNav;