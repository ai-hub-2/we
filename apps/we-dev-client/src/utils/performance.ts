export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetric[] = [];
  private observers: Map<string, PerformanceObserver> = new Map();

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  // Monitor Core Web Vitals
  monitorCoreWebVitals(): void {
    // LCP (Largest Contentful Paint)
    this.observeLCP();
    
    // FID (First Input Delay)
    this.observeFID();
    
    // CLS (Cumulative Layout Shift)
    this.observeCLS();
    
    // FCP (First Contentful Paint)
    this.observeFCP();
  }

  private observeLCP(): void {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      
      this.recordMetric('LCP', lastEntry.startTime, 'ms');
      
      // Report to analytics
      if (window.gtag) {
        window.gtag('event', 'web_vitals', {
          event_category: 'Web Vitals',
          event_label: 'LCP',
          value: Math.round(lastEntry.startTime),
        });
      }
    });
    
    observer.observe({ entryTypes: ['largest-contentful-paint'] });
    this.observers.set('LCP', observer);
  }

  private observeFID(): void {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        this.recordMetric('FID', entry.processingStart - entry.startTime, 'ms');
        
        if (window.gtag) {
          window.gtag('event', 'web_vitals', {
            event_category: 'Web Vitals',
            event_label: 'FID',
            value: Math.round(entry.processingStart - entry.startTime),
          });
        }
      });
    });
    
    observer.observe({ entryTypes: ['first-input'] });
    this.observers.set('FID', observer);
  }

  private observeCLS(): void {
    let clsValue = 0;
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry: any) => {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      });
      
      this.recordMetric('CLS', clsValue, 'score');
      
      if (window.gtag) {
        window.gtag('event', 'web_vitals', {
          event_category: 'Web Vitals',
          event_label: 'CLS',
          value: Math.round(clsValue * 1000) / 1000,
        });
      }
    });
    
    observer.observe({ entryTypes: ['layout-shift'] });
    this.observers.set('CLS', observer);
  }

  private observeFCP(): void {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const firstEntry = entries[0];
      
      this.recordMetric('FCP', firstEntry.startTime, 'ms');
      
      if (window.gtag) {
        window.gtag('event', 'web_vitals', {
          event_category: 'Web Vitals',
          event_label: 'FCP',
          value: Math.round(firstEntry.startTime),
        });
      }
    });
    
    observer.observe({ entryTypes: ['first-contentful-paint'] });
    this.observers.set('FCP', observer);
  }

  // Monitor API performance
  monitorApiPerformance(): void {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const startTime = performance.now();
      const url = typeof args[0] === 'string' ? args[0] : args[0].url;
      
      try {
        const response = await originalFetch(...args);
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        this.recordMetric('API_RESPONSE_TIME', duration, 'ms', url);
        
        if (duration > 5000) { // Log slow requests
          console.warn(`Slow API request: ${url} took ${duration.toFixed(2)}ms`);
        }
        
        return response;
      } catch (error) {
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        this.recordMetric('API_ERROR_TIME', duration, 'ms', url);
        throw error;
      }
    };
  }

  // Monitor memory usage
  monitorMemoryUsage(): void {
    if ('memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory;
        this.recordMetric('MEMORY_USED', memory.usedJSHeapSize / 1024 / 1024, 'MB');
        this.recordMetric('MEMORY_TOTAL', memory.totalJSHeapSize / 1024 / 1024, 'MB');
      }, 30000); // Every 30 seconds
    }
  }

  // Record custom metric
  recordMetric(name: string, value: number, unit: string, label?: string): void {
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: Date.now(),
    };
    
    this.metrics.push(metric);
    
    // Keep only last 1000 metrics
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Performance] ${name}: ${value}${unit}${label ? ` (${label})` : ''}`);
    }
  }

  // Get metrics
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  // Get metrics by name
  getMetricsByName(name: string): PerformanceMetric[] {
    return this.metrics.filter(metric => metric.name === name);
  }

  // Get average metric value
  getAverageMetric(name: string): number {
    const metrics = this.getMetricsByName(name);
    if (metrics.length === 0) return 0;
    
    const sum = metrics.reduce((acc, metric) => acc + metric.value, 0);
    return sum / metrics.length;
  }

  // Disconnect all observers
  disconnect(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
  }
}

// Initialize performance monitoring
export const performanceMonitor = PerformanceMonitor.getInstance();

if (typeof window !== 'undefined') {
  performanceMonitor.monitorCoreWebVitals();
  performanceMonitor.monitorApiPerformance();
  performanceMonitor.monitorMemoryUsage();
}