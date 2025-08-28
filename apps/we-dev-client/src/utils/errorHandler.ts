export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: number;
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorLog: AppError[] = [];

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  logError(code: string, message: string, details?: any): void {
    const error: AppError = {
      code,
      message,
      details,
      timestamp: Date.now(),
    };

    this.errorLog.push(error);
    console.error(`[${code}] ${message}`, details);

    // Send to analytics in production
    if (process.env.NODE_ENV === 'production') {
      this.sendToAnalytics(error);
    }
  }

  private sendToAnalytics(error: AppError): void {
    // Implement analytics sending logic
    try {
      // Example: send to error tracking service
      if (window.gtag) {
        window.gtag('event', 'error', {
          error_code: error.code,
          error_message: error.message,
        });
      }
    } catch (e) {
      console.warn('Failed to send error to analytics:', e);
    }
  }

  getErrorLog(): AppError[] {
    return [...this.errorLog];
  }

  clearErrorLog(): void {
    this.errorLog = [];
  }

  formatErrorMessage(error: any): string {
    if (typeof error === 'string') {
      return error;
    }
    
    if (error?.message) {
      return error.message;
    }
    
    if (error?.response?.data?.message) {
      return error.response.data.message;
    }
    
    return 'An unexpected error occurred';
  }
}

export const errorHandler = ErrorHandler.getInstance();

// Global error handler
window.addEventListener('error', (event) => {
  errorHandler.logError('GLOBAL_ERROR', event.message, {
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
  });
});

window.addEventListener('unhandledrejection', (event) => {
  errorHandler.logError('UNHANDLED_REJECTION', 'Unhandled promise rejection', {
    reason: event.reason,
  });
});