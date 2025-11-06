// Blocking redirect component for iOS PWA
// This component checks auth state SYNCHRONOUSLY before render to prevent landing page flash
import React, { useEffect, useState } from 'react';

const ROLE_DASHBOARD_PATHS: Record<string, string> = {
  super_admin: '/super-admin',
  factory_admin: '/admin',
  supervisor: '/supervisor',
  employee: '/employee'
};

interface PWALandingRedirectProps {
  children: React.ReactNode;
}

// Synchronous check function - runs immediately
const checkAuthAndRedirect = (): boolean => {
  // Check if iOS standalone mode or PWA standalone mode
  const isIOSStandalone = (window.navigator as any).standalone === true;
  const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || isIOSStandalone;
  
  // Only do blocking redirect for standalone mode
  if (!isStandaloneMode) {
    return true; // Allow render
  }

  // Check localStorage SYNCHRONOUSLY for auth state
  try {
    const authStorage = localStorage.getItem('auth-storage');
    
    if (authStorage) {
      const authData = JSON.parse(authStorage);
      
      // Handle Zustand persist format - state is at root or wrapped
      const state = authData.state || authData;
      
      if (state && typeof state === 'object') {
        const user = state.user;
        const isAuthenticated = state.isAuthenticated === true;
        const accessToken = state.accessToken;
        
        // If authenticated, redirect immediately using window.location
        // This bypasses React Router and prevents any render
        if (isAuthenticated && user && accessToken && user.role) {
          const dashboardPath = ROLE_DASHBOARD_PATHS[user.role];
          
          if (dashboardPath && dashboardPath !== '/') {
            // Use window.location.replace for immediate redirect
            // This happens synchronously before React can render
            window.location.replace(dashboardPath);
            return false; // Don't render anything
          }
        }
      }
    }
  } catch (e) {
    // If localStorage check fails, allow normal render
    console.warn('PWA redirect check failed:', e);
  }
  
  // If we get here, user is not authenticated or redirect failed
  return true; // Allow normal render
};

export const PWALandingRedirect: React.FC<PWALandingRedirectProps> = ({ children }) => {
  // Check synchronously on first render - this runs before any JSX is returned
  const [shouldRender] = useState(() => {
    // This function runs synchronously during useState initialization
    return checkAuthAndRedirect();
  });

  // Also run useEffect as backup in case useState check didn't catch it
  useEffect(() => {
    // Double-check if we're still on "/" and should redirect
    // This is a backup in case the useState check didn't work
    const isIOSStandalone = (window.navigator as any).standalone === true;
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || isIOSStandalone;
    
    if (isStandaloneMode && window.location.pathname === '/') {
      // Check again - if redirect happens, function returns false
      // If it returns false, redirect is already happening via window.location.replace
      checkAuthAndRedirect();
    }
  }, []);

  // Don't render children if redirect is happening
  if (!shouldRender) {
    return null; // Return null to prevent any render
  }

  return <>{children}</>;
};

