// Centralized Error Handling Service
import { toast } from 'sonner';

export interface AppError {
  id: string;
  message: string;
  code?: string;
  statusCode?: number;
  details?: any;
  timestamp: Date;
  context?: string;
  stack?: string;
}

interface ErrorHandlerOptions {
  showToast?: boolean;
  logToConsole?: boolean;
  reportToBackend?: boolean;
  context?: string;
}

class ErrorHandlingService {
  private errors: AppError[] = [];
  private maxErrors = 100;
  private errorListeners: Set<(error: AppError) => void> = new Set();

  handleError(error: unknown, options: ErrorHandlerOptions = {}): AppError {
    const {
      showToast = true,
      logToConsole = true,
      reportToBackend = true,
      context = 'Unknown',
    } = options;

    const appError = this.normalizeError(error, context);
    
    // Store error
    this.errors.unshift(appError);
    if (this.errors.length > this.maxErrors) {
      this.errors.pop();
    }

    // Log to console (removed for production)

    // Show toast notification
    if (showToast) {
      this.showErrorToast(appError);
    }

    // Report to backend
    if (reportToBackend) {
      this.reportToBackend(appError);
    }

    // Notify listeners
    this.errorListeners.forEach(listener => listener(appError));

    return appError;
  }

  private normalizeError(error: unknown, context: string): AppError {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date();

    if (error instanceof Error) {
      return {
        id,
        message: error.message,
        stack: error.stack,
        timestamp,
        context,
      };
    }

    if (typeof error === 'string') {
      return {
        id,
        message: error,
        timestamp,
        context,
      };
    }

    if (error && typeof error === 'object') {
      const e = error as any;
      return {
        id,
        message: e.message || e.error || 'An error occurred',
        code: e.code,
        statusCode: e.statusCode || e.status,
        details: e.details || e.data,
        timestamp,
        context,
      };
    }

    return {
      id,
      message: 'An unexpected error occurred',
      details: error,
      timestamp,
      context,
    };
  }

  private showErrorToast(error: AppError) {
    const message = this.getUserFriendlyMessage(error);
    toast.error(message, {
      description: error.code ? `Error Code: ${error.code}` : undefined,
    });
  }

  private getUserFriendlyMessage(error: AppError): string {
    // Map common error codes to user-friendly messages
    const errorMessages: Record<string, string> = {
      NETWORK_ERROR: 'Connection error. Please check your internet connection.',
      UNAUTHORIZED: 'You are not authorized to perform this action.',
      FORBIDDEN: 'Access denied.',
      NOT_FOUND: 'The requested resource was not found.',
      VALIDATION_ERROR: 'Please check your input and try again.',
      SERVER_ERROR: 'Server error. Please try again later.',
      TIMEOUT: 'Request timeout. Please try again.',
      OFFLINE: 'You are currently offline. Changes will be synced when connection is restored.',
    };

    if (error.code && errorMessages[error.code]) {
      return errorMessages[error.code];
    }

    // Handle HTTP status codes
    if (error.statusCode) {
      if (error.statusCode >= 400 && error.statusCode < 500) {
        return error.message || 'Request error. Please check your input.';
      }
      if (error.statusCode >= 500) {
        return 'Server error. Please try again later.';
      }
    }

    return error.message || 'An unexpected error occurred';
  }

  private async reportToBackend(error: AppError) {
    try {
      // Only report in production
      if (import.meta.env.MODE !== 'production') return;

      const { apiClient } = await import('./api/client');
      await apiClient.post('/errors/report', {
        ...error,
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: error.timestamp.toISOString(),
      });
    } catch (reportError) {
      // Failed to report error to backend
    }
  }

  getErrors(): AppError[] {
    return [...this.errors];
  }

  clearErrors() {
    this.errors = [];
  }

  subscribe(listener: (error: AppError) => void): () => void {
    this.errorListeners.add(listener);
    return () => this.errorListeners.delete(listener);
  }
}

export const errorService = new ErrorHandlingService();

// Global error handlers
if (typeof window !== 'undefined') {
  // Unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    errorService.handleError(event.reason, {
      context: 'UnhandledPromiseRejection',
      showToast: true,
    });
    event.preventDefault();
  });

  // Global errors
  window.addEventListener('error', (event) => {
    errorService.handleError(event.error || event.message, {
      context: 'GlobalError',
      showToast: true,
    });
    event.preventDefault();
  });
}