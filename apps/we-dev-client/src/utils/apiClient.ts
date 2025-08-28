import { errorHandler } from './errorHandler';

export interface ApiConfig {
  baseURL: string;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

export interface ApiResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Headers;
}

export class ApiClient {
  private config: ApiConfig;
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

  constructor(config: ApiConfig) {
    this.config = {
      timeout: 30000,
      retries: 3,
      retryDelay: 1000,
      ...config,
    };
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private getCacheKey(url: string, options?: RequestInit): string {
    const method = options?.method || 'GET';
    const body = options?.body ? JSON.stringify(options.body) : '';
    return `${method}:${url}:${body}`;
  }

  private isCacheValid(key: string): boolean {
    const cached = this.cache.get(key);
    if (!cached) return false;
    
    const now = Date.now();
    return (now - cached.timestamp) < cached.ttl;
  }

  private setCache(key: string, data: any, ttl: number = 5 * 60 * 1000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  private clearExpiredCache(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if ((now - value.timestamp) >= value.ttl) {
        this.cache.delete(key);
      }
    }
  }

  async request<T = any>(
    url: string,
    options: RequestInit = {},
    useCache: boolean = false,
    cacheTTL: number = 5 * 60 * 1000
  ): Promise<ApiResponse<T>> {
    const fullUrl = url.startsWith('http') ? url : `${this.config.baseURL}${url}`;
    const cacheKey = this.getCacheKey(fullUrl, options);

    // Check cache for GET requests
    if (useCache && options.method === 'GET' && this.isCacheValid(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      return {
        data: cached!.data,
        status: 200,
        statusText: 'OK (Cached)',
        headers: new Headers(),
      };
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.config.retries!; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        const response = await fetch(fullUrl, {
          ...options,
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            ...options.headers,
          },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        // Cache successful GET responses
        if (useCache && options.method === 'GET') {
          this.setCache(cacheKey, data, cacheTTL);
        }

        return {
          data,
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
        };
      } catch (error: any) {
        lastError = error;
        
        if (error.name === 'AbortError') {
          errorHandler.logError('API_TIMEOUT', `Request timeout: ${fullUrl}`, { attempt });
        } else {
          errorHandler.logError('API_ERROR', `Request failed: ${fullUrl}`, { 
            attempt, 
            error: error.message 
          });
        }

        if (attempt < this.config.retries!) {
          await this.delay(this.config.retryDelay! * Math.pow(2, attempt));
        }
      }
    }

    throw lastError || new Error('Request failed after all retries');
  }

  async get<T = any>(url: string, useCache: boolean = true): Promise<ApiResponse<T>> {
    return this.request<T>(url, { method: 'GET' }, useCache);
  }

  async post<T = any>(url: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(url, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T = any>(url: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(url, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T = any>(url: string): Promise<ApiResponse<T>> {
    return this.request<T>(url, { method: 'DELETE' });
  }

  // Clear expired cache entries periodically
  startCacheCleanup(interval: number = 60 * 1000): void {
    setInterval(() => {
      this.clearExpiredCache();
    }, interval);
  }
}

// Create default API client instance
export const apiClient = new ApiClient({
  baseURL: process.env.APP_BASE_URL || '',
});

// Start cache cleanup
apiClient.startCacheCleanup();