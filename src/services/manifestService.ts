// Manifest Service for dynamically updating PWA manifest based on user role

interface UserRole {
  role: 'super_admin' | 'factory_admin' | 'supervisor' | 'employee';
}

const ROLE_DASHBOARD_NAMES: Record<string, { name: string; short_name: string }> = {
  super_admin: {
    name: 'Super Admin Dashboard',
    short_name: 'Super Admin'
  },
  factory_admin: {
    name: 'Admin Dashboard',
    short_name: 'Admin'
  },
  supervisor: {
    name: 'Supervisor Dashboard',
    short_name: 'Supervisor'
  },
  employee: {
    name: 'Employee Dashboard',
    short_name: 'Employee'
  }
};

const ROLE_DASHBOARD_PATHS: Record<string, string> = {
  super_admin: '/super-admin',
  factory_admin: '/admin',
  supervisor: '/supervisor',
  employee: '/employee'
};

/**
 * Updates the manifest link dynamically based on user role
 * This helps the PWA show the correct name when installed
 */
export const updateManifestForRole = (user: UserRole | null): void => {
  if (typeof window === 'undefined') return;

  // Get or create manifest link
  let manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
  
  if (!manifestLink) {
    manifestLink = document.createElement('link');
    manifestLink.rel = 'manifest';
    document.head.appendChild(manifestLink);
  }

  if (user && user.role && ROLE_DASHBOARD_NAMES[user.role]) {
    const roleInfo = ROLE_DASHBOARD_NAMES[user.role];
    const dashboardPath = ROLE_DASHBOARD_PATHS[user.role];
    
    // Create a dynamic manifest URL with role-specific data
    // Note: We use a query parameter to force manifest update, but the actual manifest.json
    // will still be served. The PWARedirect component will handle routing.
    const manifestUrl = `/manifest.json?role=${user.role}`;
    manifestLink.href = manifestUrl;

    // Update meta tags for better mobile experience
    updateMetaTags(roleInfo.name, roleInfo.short_name);
  } else {
    // Reset to default
    manifestLink.href = '/manifest.json';
    updateMetaTags('Operion', 'Operion');
  }
};

/**
 * Updates meta tags for mobile web app
 */
const updateMetaTags = (name: string, shortName: string): void => {
  // Update apple-mobile-web-app-title
  let appleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
  if (!appleTitle) {
    appleTitle = document.createElement('meta');
    appleTitle.setAttribute('name', 'apple-mobile-web-app-title');
    document.head.appendChild(appleTitle);
  }
  appleTitle.setAttribute('content', shortName);

  // Update document title
  document.title = `${shortName} - Factory Management System`;
};

/**
 * Gets the dashboard path for a user role
 */
export const getDashboardPathForRole = (role: string | undefined): string => {
  if (!role || !ROLE_DASHBOARD_PATHS[role]) {
    return '/';
  }
  return ROLE_DASHBOARD_PATHS[role];
};

/**
 * Gets the display name for a user role
 */
export const getDisplayNameForRole = (role: string | undefined): string => {
  if (!role || !ROLE_DASHBOARD_NAMES[role]) {
    return 'Operion';
  }
  return ROLE_DASHBOARD_NAMES[role].name;
};

