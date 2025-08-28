export class SecurityUtils {
  // Sanitize user input to prevent XSS
  static sanitizeInput(input: string): string {
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
  }

  // Validate API key format
  static validateApiKey(apiKey: string, provider: string): boolean {
    if (!apiKey || typeof apiKey !== 'string') {
      return false;
    }

    const patterns: Record<string, RegExp> = {
      openai: /^sk-[a-zA-Z0-9]{32,}$/,
      openrouter: /^sk-or-v1-[a-zA-Z0-9]{32,}$/,
      anthropic: /^sk-ant-[a-zA-Z0-9]{32,}$/,
      groq: /^gsk_[a-zA-Z0-9]{32,}$/,
      deepseek: /^sk-[a-zA-Z0-9]{32,}$/,
      mistral: /^[a-zA-Z0-9]{32,}$/,
      cohere: /^[a-zA-Z0-9]{32,}$/,
      perplexity: /^pplx-[a-zA-Z0-9]{32,}$/,
      together: /^[a-zA-Z0-9]{32,}$/,
      fireworks: /^[a-zA-Z0-9]{32,}$/,
      xai: /^xai-[a-zA-Z0-9]{32,}$/,
      deepinfra: /^[a-zA-Z0-9]{32,}$/,
      replicate: /^r8_[a-zA-Z0-9]{32,}$/,
    };

    const pattern = patterns[provider];
    return pattern ? pattern.test(apiKey) : true;
  }

  // Mask sensitive data in logs
  static maskSensitiveData(data: any): any {
    if (typeof data === 'string') {
      // Mask API keys
      return data.replace(/sk-[a-zA-Z0-9]{8,}/g, 'sk-***');
    }
    
    if (typeof data === 'object' && data !== null) {
      const masked = { ...data };
      for (const [key, value] of Object.entries(masked)) {
        if (key.toLowerCase().includes('key') || key.toLowerCase().includes('token')) {
          masked[key] = '***';
        } else {
          masked[key] = this.maskSensitiveData(value);
        }
      }
      return masked;
    }
    
    return data;
  }

  // Generate secure random string
  static generateSecureId(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const randomArray = new Uint8Array(length);
    crypto.getRandomValues(randomArray);
    
    for (let i = 0; i < length; i++) {
      result += chars.charAt(randomArray[i] % chars.length);
    }
    
    return result;
  }

  // Validate URL format
  static validateUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  // Rate limiting utility
  static createRateLimiter(maxRequests: number, timeWindow: number) {
    const requests = new Map<string, number[]>();
    
    return (key: string): boolean => {
      const now = Date.now();
      const userRequests = requests.get(key) || [];
      
      // Remove old requests outside the time window
      const validRequests = userRequests.filter(time => now - time < timeWindow);
      
      if (validRequests.length >= maxRequests) {
        return false; // Rate limit exceeded
      }
      
      validRequests.push(now);
      requests.set(key, validRequests);
      return true; // Request allowed
    };
  }
}

// Create rate limiter for API requests
export const apiRateLimiter = SecurityUtils.createRateLimiter(100, 60000); // 100 requests per minute