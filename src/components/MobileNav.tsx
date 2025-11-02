import { NavLink } from 'react-router-dom';
import { Home, Package, Settings2, Users, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';

const MobileNav = () => {
  const { user } = useAuthStore();

  const getNavItems = () => {
    if (!user) return [];

    switch (user.role) {
      case 'super_admin':
        return [
          { path: '/super-admin', icon: Home, label: 'Dashboard' },
          { path: '/super-admin/factories', icon: Package, label: 'Factories' },
          { path: '/super-admin/settings', icon: Settings2, label: 'Settings' },
        ];
      case 'factory_admin':
        return [
          { path: '/admin', icon: Home, label: 'Dashboard' },
          { path: '/admin/products', icon: Package, label: 'Products' },
          { path: '/admin/processes', icon: Settings2, label: 'Processes' },
          { path: '/admin/users', icon: Users, label: 'Users' },
          { path: '/admin/reports', icon: BarChart3, label: 'Reports' },
        ];
      case 'supervisor':
        return [
          { path: '/supervisor', icon: Home, label: 'Dashboard' },
          { path: '/supervisor/employees', icon: Users, label: 'Employees' },
          { path: '/supervisor/validation', icon: Package, label: 'Validate' },
          { path: '/supervisor/reports', icon: BarChart3, label: 'Reports' },
        ];
      case 'employee':
        return [
          { path: '/employee', icon: Home, label: 'Dashboard' },
          { path: '/employee/work', icon: Package, label: 'Work Entry' },
          { path: '/employee/performance', icon: BarChart3, label: 'Performance' },
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  if (navItems.length === 0) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background border-t">
      <div className="grid grid-cols-5 h-16">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center gap-1 text-xs transition-colors',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )
            }
          >
            <item.icon className="h-5 w-5" />
            <span className="truncate px-1">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default MobileNav;