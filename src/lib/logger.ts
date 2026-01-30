/**
 * Conditional logger that only logs in development
 * Prevents console spam and security leaks in production
 */

const isDev = import.meta.env.DEV || import.meta.env.MODE === 'development';

export const logger = {
  /**
   * Log general information (only in dev)
   */
  log: (message: string, ...args: any[]) => {
    if (isDev) {
      console.log(`[LOG] ${message}`, ...args);
    }
  },

  /**
   * Log errors (always logged, even in production)
   */
  error: (message: string, error?: any) => {
    console.error(`[ERROR] ${message}`, error);
    // TODO: In future, send to error tracking service (Sentry)
  },

  /**
   * Log warnings (only in dev)
   */
  warn: (message: string, ...args: any[]) => {
    if (isDev) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  },

  /**
   * Log info (only in dev)
   */
  info: (message: string, ...args: any[]) => {
    if (isDev) {
      console.info(`[INFO] ${message}`, ...args);
    }
  },

  /**
   * Log debug info (only in dev)
   */
  debug: (message: string, ...args: any[]) => {
    if (isDev) {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  }
};

// Export for backward compatibility
export default logger;
