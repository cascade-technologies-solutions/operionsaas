import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuthStore } from "@/stores/authStore";
import EnhancedMobileNav from './components/layout/EnhancedMobileNav';
import { TenantProvider } from './contexts/TenantContext';
import { queryClient } from './lib/queryClient';
import React, { useEffect } from "react";

// Pages
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import EmployeeLogin from "./pages/EmployeeLogin";
import SupervisorLogin from "./pages/SupervisorLogin";
import SuperAdminLogin from "./pages/SuperAdminLogin";
import FactoryRegistration from "./pages/FactoryRegistration";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

// Super Admin Pages
import SuperAdminDashboard from "./pages/super-admin/SuperAdminDashboard";
import FactoryApproval from "./pages/super-admin/FactoryApproval";
import SuperAdminSettings from "./pages/super-admin/SuperAdminSettings";
import FactoryCreation from "./pages/super-admin/FactoryCreation";

// Admin Pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import Products from "./pages/admin/Products";
import Machines from "./pages/admin/Machines";
import Users from "./pages/admin/Users";
import AdminFactoryRegistration from "./pages/admin/FactoryRegistration";
import AdminReports from "./pages/admin/AdminReports";
import FactorySettings from "./pages/admin/FactorySettings";
import ProcessStagesSummaryPage from "./pages/admin/ProcessStagesSummaryPage";
import DisplayPage from "./pages/DisplayPage";

// Supervisor Pages
import SupervisorDashboard from "./pages/supervisor/SupervisorDashboard";
import EmployeeManagement from "./pages/supervisor/EmployeeManagement";
import WorkValidation from "./pages/supervisor/WorkValidation";
import Reports from "./pages/supervisor/Reports";
import SupervisorAttendance from "./pages/supervisor/SupervisorAttendance";
import ProductReport from "./pages/supervisor/ProductReport";
import ProcessStagesSummaryReport from "./pages/supervisor/ProcessStagesSummaryReport";

// Employee Pages
import EmployeeDashboard from "./pages/employee/EmployeeDashboard";
import WorkEntry from "./pages/employee/WorkEntry";
import EmployeePerformance from "./pages/employee/EmployeePerformance";
import EmployeeAttendance from "./pages/employee/EmployeeAttendance";

const App = () => {
  const { isAuthenticated, user, initializeAuth, setDeviceId, getDeviceId } = useAuthStore();

  // Initialize authentication on app start
  useEffect(() => {
    // Initialize device ID for employees
    const initializeDeviceId = () => {
      const currentDeviceId = getDeviceId();
      if (!currentDeviceId) {
        // Generate device ID if not exists
        const generateDeviceId = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          ctx?.fillText('Device ID', 10, 10);
          const fingerprint = canvas.toDataURL();
          
          let hash = 0;
          for (let i = 0; i < fingerprint.length; i++) {
            const char = fingerprint.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
          }
          
          return `EMP_DEV_${Math.abs(hash).toString(36).toUpperCase()}`;
        };

        const deviceId = generateDeviceId();
        setDeviceId(deviceId);
        localStorage.setItem('deviceId', deviceId);
      }
    };

    initializeDeviceId();
    
    initializeAuth().catch((error) => {
      // Authentication initialization failed
    });
  }, [initializeAuth, setDeviceId, getDeviceId]);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster position="top-right" />
        <Sonner position="top-right" />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <div className="min-h-screen">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
                          <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
                          <Route path="/employee-login" element={<EmployeeLogin />} />
              <Route path="/supervisor-login" element={<SupervisorLogin />} />
              <Route path="/register-factory" element={<FactoryRegistration />} />
              <Route path="/super-admin-login" element={<SuperAdminLogin />} />
              <Route path="/profile" element={<Profile />} />
              
              {/* Super Admin Routes - Wrapped with TenantProvider */}
              <Route path="/super-admin/*" element={
                <TenantProvider>
                  <Routes>
                    <Route path="/" element={
                      <ProtectedRoute allowedRoles={['super_admin']}>
                        <SuperAdminDashboard />
                      </ProtectedRoute>
                    } />
                    <Route path="/factories" element={
                      <ProtectedRoute allowedRoles={['super_admin']}>
                        <FactoryApproval />
                      </ProtectedRoute>
                    } />
                    <Route path="/create-factory" element={
                      <ProtectedRoute allowedRoles={['super_admin']}>
                        <FactoryCreation />
                      </ProtectedRoute>
                    } />
                    <Route path="/settings" element={
                      <ProtectedRoute allowedRoles={['super_admin']}>
                        <SuperAdminSettings />
                      </ProtectedRoute>
                    } />
                  </Routes>
                </TenantProvider>
              } />
              
              {/* Tenant-based Routes - Wrapped with TenantProvider */}
              <Route path="/admin/*" element={
                <TenantProvider>
                  <Routes>
                    <Route path="/" element={
                      <ProtectedRoute allowedRoles={['factory_admin']}>
                        <AdminDashboard />
                      </ProtectedRoute>
                    } />
                    <Route path="/products" element={
                      <ProtectedRoute allowedRoles={['factory_admin']}>
                        <Products />
                      </ProtectedRoute>
                    } />
                    <Route path="/machines" element={
                      <ProtectedRoute allowedRoles={['factory_admin']}>
                        <Machines />
                      </ProtectedRoute>
                    } />
                    <Route path="/users" element={
                      <ProtectedRoute allowedRoles={['factory_admin']}>
                        <Users />
                      </ProtectedRoute>
                    } />
                    <Route path="/reports" element={
                      <ProtectedRoute allowedRoles={['factory_admin']}>
                        <AdminReports />
                      </ProtectedRoute>
                    } />
                    <Route path="/register" element={
                      <ProtectedRoute allowedRoles={['factory_admin']}>
                        <AdminFactoryRegistration />
                      </ProtectedRoute>
                    } />
                    <Route path="/settings" element={
                      <ProtectedRoute allowedRoles={['factory_admin']}>
                        <Settings />
                      </ProtectedRoute>
                    } />
                    <Route path="/factory-settings" element={
                      <ProtectedRoute allowedRoles={['factory_admin']}>
                        <FactorySettings />
                      </ProtectedRoute>
                    } />
                    <Route path="/reports/process-stages" element={
                      <ProtectedRoute allowedRoles={['factory_admin']}>
                        <ProcessStagesSummaryPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/display" element={
                      <ProtectedRoute allowedRoles={['factory_admin']}>
                        <DisplayPage />
                      </ProtectedRoute>
                    } />
                  </Routes>
                </TenantProvider>
              } />
              
              <Route path="/supervisor/*" element={
                <TenantProvider>
                  <Routes>
                    <Route path="/" element={
                      <ProtectedRoute allowedRoles={['supervisor']}>
                        <SupervisorDashboard />
                      </ProtectedRoute>
                    } />
                    <Route path="/employees" element={
                      <ProtectedRoute allowedRoles={['supervisor']}>
                        <EmployeeManagement />
                      </ProtectedRoute>
                    } />
                    <Route path="/validation" element={
                      <ProtectedRoute allowedRoles={['supervisor']}>
                        <WorkValidation />
                      </ProtectedRoute>
                    } />
                    <Route path="/reports" element={
                      <ProtectedRoute allowedRoles={['supervisor']}>
                        <Reports />
                      </ProtectedRoute>
                    } />
                    <Route path="/attendance" element={
                      <ProtectedRoute allowedRoles={['supervisor']}>
                        <SupervisorAttendance />
                      </ProtectedRoute>
                    } />
                    <Route path="/product-report" element={
                      <ProtectedRoute allowedRoles={['supervisor', 'factory_admin']}>
                        <ProductReport />
                      </ProtectedRoute>
                    } />
                    <Route path="/reports/process-stages" element={
                      <ProtectedRoute allowedRoles={['supervisor']}>
                        <ProcessStagesSummaryReport />
                      </ProtectedRoute>
                    } />
                    <Route path="/display" element={
                      <ProtectedRoute allowedRoles={['supervisor']}>
                        <DisplayPage />
                      </ProtectedRoute>
                    } />
                  </Routes>
                </TenantProvider>
              } />
              
              <Route path="/employee/*" element={
                <TenantProvider>
                  <Routes>
                    <Route path="/" element={
                      <ProtectedRoute allowedRoles={['employee']}>
                        <EmployeeDashboard />
                      </ProtectedRoute>
                    } />
                    <Route path="/work" element={
                      <ProtectedRoute allowedRoles={['employee']}>
                        <WorkEntry />
                      </ProtectedRoute>
                    } />
                    <Route path="/performance" element={
                      <ProtectedRoute allowedRoles={['employee']}>
                        <EmployeePerformance />
                      </ProtectedRoute>
                    } />
                    <Route path="/attendance" element={
                      <ProtectedRoute allowedRoles={['employee']}>
                        <EmployeeAttendance />
                      </ProtectedRoute>
                    } />
                    <Route path="/display" element={
                      <ProtectedRoute allowedRoles={['employee']}>
                        <DisplayPage />
                      </ProtectedRoute>
                    } />
                  </Routes>
                </TenantProvider>
              } />
              
              {/* Display Route - Public access for factory displays */}
              <Route path="/display" element={<DisplayPage />} />
              
              {/* Catch all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
