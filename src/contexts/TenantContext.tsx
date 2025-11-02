import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { Factory } from '@/types';
import { factoryService } from '@/services/api';

interface TenantContextType {
  currentFactory: Factory | null;
  setCurrentFactory: (factory: Factory | null) => void;
  factoryId: string | null;
  isLoading: boolean;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};

interface TenantProviderProps {
  children: React.ReactNode;
}

export const TenantProvider: React.FC<TenantProviderProps> = ({ children }) => {
  const { user } = useAuthStore();
  const [currentFactory, setCurrentFactory] = useState<Factory | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadFactory = useCallback(async (factoryId: string) => {
    if (!factoryId) return;
    
    setIsLoading(true);
    try {
      const response = await factoryService.getFactory(factoryId);
      
      // Handle different response structures
      let factoryData: Factory | null = null;
      
      if (response && typeof response === 'object') {
        // Check if response has a data property
        if ('data' in response && response.data) {
          factoryData = response.data;
        } else if ('_id' in response || 'id' in response) {
          // Response is the factory object directly
          factoryData = response as Factory;
        }
      }
      
      if (factoryData && (factoryData._id || factoryData.id)) {
        setCurrentFactory(factoryData);
      } else {
        setCurrentFactory(null);
      }
    } catch (error) {
      console.error('❌ Failed to load factory:', error);
      setCurrentFactory(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // For super_admin, we don't need to load factory data
    if (user?.role === 'super_admin') {
      setCurrentFactory(null);
      return;
    }
    
    if (user?.factoryId) {
      // Extract factory ID - handle both string and object formats
      const factoryId = typeof user.factoryId === 'string' 
        ? user.factoryId 
        : user.factoryId._id || user.factoryId.id;
      
      if (factoryId) {
        loadFactory(factoryId);
      } else {
        setCurrentFactory(null);
      }
    } else {
      setCurrentFactory(null);
    }
  }, [user?.factoryId, user?.role, loadFactory]);

  const factoryId = currentFactory?._id || currentFactory?.id ||
    (typeof user?.factoryId === 'string' 
      ? user.factoryId 
      : user?.factoryId?._id || user?.factoryId?.id) || 
    null;

  return (
    <TenantContext.Provider value={{
      currentFactory,
      setCurrentFactory,
      factoryId,
      isLoading,
    }}>
      {children}
    </TenantContext.Provider>
  );
};