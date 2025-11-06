// Product Service
import { Product } from '@/types';
import { apiClient } from './client';

export const productService = {
  async getProducts(): Promise<{ data: Product[] }> {
    // Pass limit=100 to fetch all products (backend default is 10)
    const response = await apiClient.get('/products', { limit: 100 });
    
    // Debug logging to understand the response structure
    console.log('🔍 Raw API response:', response);
    console.log('🔍 Response keys:', Object.keys(response || {}));
    console.log('🔍 response.data:', (response as any)?.data);
    console.log('🔍 response.data?.products:', (response as any)?.data?.products);
    
    // Handle different response formats
    if ((response as any)?.data?.data?.products) {
      console.log('✅ Using response.data.data.products');
      return { data: (response as any).data.data.products };
    } else if ((response as any)?.data?.products) {
      console.log('✅ Using response.data.products');
      return { data: (response as any).data.products };
    } else if (Array.isArray((response as any)?.data)) {
      console.log('✅ Using response.data as array');
      return { data: (response as any).data };
    } else if (Array.isArray(response)) {
      console.log('✅ Using response as array');
      return { data: response };
    } else {
      console.warn('⚠️ No products found in response, returning empty array');
      return { data: [] };
    }
  },

  async getProduct(id: string): Promise<{ data: Product }> {
    const response = await apiClient.get(`/products/${id}`);
    return response.data || response;
  },

  async createProduct(data: Partial<Product>): Promise<{ data: Product }> {
    const response = await apiClient.post('/products', data);
    return response.data || response;
  },

  async updateProduct(id: string, data: Partial<Product>): Promise<{ data: Product }> {
    const response = await apiClient.put(`/products/${id}`, data);
    return response.data || response;
  },

  async deleteProduct(id: string): Promise<{ message: string }> {
    const response = await apiClient.delete(`/products/${id}`);
    return response.data || response;
  },

  async updateStock(id: string, quantity: number, operation: 'add' | 'subtract'): Promise<{ data: Product }> {
    const response = await apiClient.patch(`/products/${id}/stock`, { quantity, operation });
    return response.data || response;
  },

  async getLowStockProducts(): Promise<{ data: Product[] }> {
    const response = await apiClient.get('/products/low-stock');
    return response.data || response;
  },

  async updateDailyTarget(id: string, dailyTarget: number): Promise<{ data: Product }> {
    const response = await apiClient.patch(`/products/${id}/daily-target`, { dailyTarget });
    return response.data || response;
  },

  async getProductsByProcess(processId: string): Promise<{ data: Product[] }> {
    const response = await apiClient.get(`/products/by-process/${processId}`);
    
    // Handle different response formats
    if (response.data?.data) {
      return { data: response.data.data };
    } else if (Array.isArray(response.data)) {
      return { data: response.data };
    } else if (Array.isArray(response)) {
      return { data: response };
    } else {
      return { data: [] };
    }
  },
};