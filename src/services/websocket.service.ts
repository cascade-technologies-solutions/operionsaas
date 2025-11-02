// Production-ready WebSocket Service
import { useAuthStore } from '@/stores/authStore';
import { apiClient } from './api/client';

export type WSEvent = 
  | 'attendance_marked'
  | 'work_entry_submitted'
  | 'work_entry_validated'
  | 'production_data_updated'
  | 'user_created'
  | 'user_updated'
  | 'user_deleted'
  | 'product_created'
  | 'product_updated'
  | 'product_deleted'
  | 'process_created'
  | 'process_updated'
  | 'process_deleted'
  | 'factory_approved'
  | 'factory_updated'
  | 'alert_created'
  | 'sync_required';

export interface WSMessage {
  id: string;
  type: WSEvent;
  data: any;
  timestamp: string;
  factoryId?: string;
  userId?: string;
}

interface WSOptions {
  reconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
}

class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private options: Required<WSOptions>;
  private listeners: Map<WSEvent, Set<(data: any) => void>> = new Map();
  private messageQueue: WSMessage[] = [];
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isConnecting = false;

  constructor(options: WSOptions = {}) {
    this.options = {
      reconnect: true,
      reconnectInterval: 1000,
      maxReconnectAttempts: 10,
      heartbeatInterval: 30000,
      ...options,
    };
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      if (this.isConnecting) {
        resolve();
        return;
      }

      const { user } = useAuthStore.getState();
      if (!user) {
        reject(new Error('No authenticated user'));
        return;
      }

      // Use _id if id is not available
      const userId = user.id || user._id;
      if (!userId) {
        reject(new Error('User ID not available'));
        return;
      }

      this.isConnecting = true;

      try {
        this.ws = apiClient.createWebSocket(userId);
        
        this.ws.onopen = () => {
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          this.flushMessageQueue();
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WSMessage = JSON.parse(event.data);
            
            // Handle heartbeat
            if (message.type === 'ping' as any) {
              this.sendMessage({ type: 'pong' as any, data: null });
              return;
            }
            
            this.handleMessage(message);
          } catch (error) {
            // Failed to parse WebSocket message
          }
        };

        this.ws.onclose = (event) => {
          this.isConnecting = false;
          this.stopHeartbeat();
          
          if (this.options.reconnect && !event.wasClean) {
            this.attemptReconnect();
          }
        };

        this.ws.onerror = (error) => {
          this.isConnecting = false;
          reject(error);
        };
      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  disconnect() {
    this.options.reconnect = false;
    this.stopHeartbeat();
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
  }

  private handleMessage(message: WSMessage) {
    const listeners = this.listeners.get(message.type);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(message.data);
        } catch (error) {
          // Error in WebSocket listener
        }
      });
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.options.maxReconnectAttempts) {
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(
      this.options.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1),
      30000
    );

    this.reconnectTimer = setTimeout(() => {
      this.connect().catch(() => {});
    }, delay);
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.sendMessage({ type: 'ping' as any, data: null });
      }
    }, this.options.heartbeatInterval);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private flushMessageQueue() {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) {
        this.emit(message.type, message.data);
      }
    }
  }

  subscribe(event: WSEvent, callback: (data: any) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(event);
      if (listeners) {
        listeners.delete(callback);
        if (listeners.size === 0) {
          this.listeners.delete(event);
        }
      }
    };
  }

  emit(event: WSEvent, data: any) {
    const user = useAuthStore.getState().user;
    const userId = user?.id || user?._id;
    
    const message: WSMessage = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: event,
      data,
      timestamp: new Date().toISOString(),
      factoryId: user?.factoryId,
      userId: userId,
    };

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.sendMessage(message);
    } else {
      // Queue message for later sending
      this.messageQueue.push(message);
    }
  }

  private sendMessage(message: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  getConnectionState(): 'connecting' | 'connected' | 'disconnected' {
    if (this.isConnecting) return 'connecting';
    if (this.ws?.readyState === WebSocket.OPEN) return 'connected';
    return 'disconnected';
  }
}

export const wsService = new WebSocketService();

// React Hook for WebSocket
import { useEffect, useCallback, useState } from 'react';

export function useWebSocket(event: WSEvent, handler: (data: any) => void) {
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');

  useEffect(() => {
    // Only check connection state when needed, not every second
    const updateConnectionState = () => {
      setConnectionState(wsService.getConnectionState());
    };
    
    // Initial state check
    updateConnectionState();
    
    // Listen for connection state changes instead of polling
    const unsubscribe = wsService.subscribe('connection_state_changed', updateConnectionState);
    
    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = wsService.subscribe(event, handler);
    return unsubscribe;
  }, [event, handler]);

  const emit = useCallback((data: any) => {
    wsService.emit(event, data);
  }, [event]);

  return { emit, connectionState };
}