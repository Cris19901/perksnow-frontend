/**
 * Conditional logger that only logs in development
 * Prevents console spam and security leaks in production
 * Stores recent errors in-memory for admin review
 */

const isDev = import.meta.env.DEV || import.meta.env.MODE === 'development';

// In-memory error buffer (keeps last 50 errors for admin review)
const MAX_ERROR_BUFFER = 50;
interface ErrorEntry {
  message: string;
  error?: string;
  timestamp: string;
  url: string;
}
const errorBuffer: ErrorEntry[] = [];

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
   * Also stores in buffer for admin review
   */
  error: (message: string, error?: any) => {
    console.error(`[ERROR] ${message}`, error);

    // Store in error buffer
    errorBuffer.push({
      message,
      error: error?.message || error?.toString?.() || String(error || ''),
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.pathname : '',
    });
    if (errorBuffer.length > MAX_ERROR_BUFFER) {
      errorBuffer.shift();
    }
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
  },

  /**
   * Get recent errors from buffer (for admin dashboard)
   */
  getRecentErrors: (): ErrorEntry[] => {
    return [...errorBuffer];
  },
};

// Export for backward compatibility
export default logger;
