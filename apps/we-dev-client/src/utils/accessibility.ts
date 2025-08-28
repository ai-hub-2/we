export class AccessibilityUtils {
  // Focus management
  static focusElement(selector: string): void {
    const element = document.querySelector(selector) as HTMLElement;
    if (element) {
      element.focus();
    }
  }

  // Announce to screen readers
  static announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }

  // Skip to main content
  static createSkipLink(): void {
    const skipLink = document.createElement('a');
    skipLink.href = '#main-content';
    skipLink.textContent = 'Skip to main content';
    skipLink.className = 'skip-link';
    skipLink.style.cssText = `
      position: absolute;
      top: -40px;
      left: 6px;
      background: #000;
      color: #fff;
      padding: 8px;
      text-decoration: none;
      z-index: 1000;
      transition: top 0.3s;
    `;
    
    skipLink.addEventListener('focus', () => {
      skipLink.style.top = '6px';
    });
    
    skipLink.addEventListener('blur', () => {
      skipLink.style.top = '-40px';
    });
    
    document.body.insertBefore(skipLink, document.body.firstChild);
  }

  // Keyboard navigation
  static setupKeyboardNavigation(): void {
    document.addEventListener('keydown', (event) => {
      // Escape key to close modals
      if (event.key === 'Escape') {
        const modals = document.querySelectorAll('[role="dialog"]');
        const lastModal = modals[modals.length - 1] as HTMLElement;
        if (lastModal) {
          const closeButton = lastModal.querySelector('[aria-label*="close"], [aria-label*="Close"]') as HTMLElement;
          if (closeButton) {
            closeButton.click();
          }
        }
      }

      // Tab key management
      if (event.key === 'Tab') {
        const focusableElements = document.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    });
  }

  // High contrast mode detection
  static isHighContrastMode(): boolean {
    return window.matchMedia('(prefers-contrast: high)').matches;
  }

  // Reduced motion detection
  static prefersReducedMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  // Color scheme detection
  static getColorScheme(): 'light' | 'dark' | 'no-preference' {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    if (mediaQuery.matches) return 'dark';
    if (window.matchMedia('(prefers-color-scheme: light)').matches) return 'light';
    return 'no-preference';
  }

  // Font size detection
  static getFontSize(): 'small' | 'medium' | 'large' {
    const fontSize = window.getComputedStyle(document.documentElement).fontSize;
    const size = parseFloat(fontSize);
    
    if (size < 14) return 'small';
    if (size > 18) return 'large';
    return 'medium';
  }

  // Apply accessibility enhancements
  static enhanceAccessibility(): void {
    // Add skip link
    this.createSkipLink();
    
    // Setup keyboard navigation
    this.setupKeyboardNavigation();
    
    // Add main content landmark
    const mainContent = document.querySelector('#root') as HTMLElement;
    if (mainContent) {
      mainContent.id = 'main-content';
      mainContent.setAttribute('role', 'main');
    }
    
    // Announce page load
    this.announce('Page loaded successfully');
  }
}

// Initialize accessibility enhancements
if (typeof window !== 'undefined') {
  AccessibilityUtils.enhanceAccessibility();
}