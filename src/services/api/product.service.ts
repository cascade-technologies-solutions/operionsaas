// Product Service
import { Product } from '@/types';
import { apiClient } from './client';

export const productService = {
  async getProducts(): Promise<{ data: Product[] }> {
    // Clear cache for products to ensure fresh data
    // This prevents stale/cached data from other endpoints
    if (typeof (apiClient as any).clearCache === 'function') {
      (apiClient as any).clearCache('/products');
    }
    
    // Pass limit=100 to fetch all products (backend default is 10)
    // Add timestamp to ensure fresh request (bypasses any remaining cache)
    const timestamp = Date.now();
    console.log('🔍 Calling apiClient.get("/products", { limit: 100, _t: timestamp })');
    const response = await apiClient.get('/products', { limit: 100, _t: timestamp });
    
    // Debug logging to understand the response structure
    console.log('🔍 Raw API response:', response);
    console.log('🔍 Response message:', (response as any)?.message);
    console.log('🔍 Response keys:', Object.keys(response || {}));
    console.log('🔍 response.data:', (response as any)?.data);
    console.log('🔍 response.data?.products:', (response as any)?.data?.products);
    console.log('🔍 response.data?.processes:', (response as any)?.data?.processes);
    
    // Check if we got the wrong response (processes instead of products)
    if ((response as any)?.message?.includes('Processes')) {
      console.error('❌ ERROR: Received processes response instead of products!');
      console.error('❌ This suggests a cache issue or wrong endpoint');
      return { data: [] };
    }
    
    // Handle different response formats - backend returns: { success: true, data: { products: [...], pagination: {...} } }
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
      console.warn('⚠️ Full response:', JSON.stringify(response, null, 2));
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