/**
 * Custom logger utility for DRIVN platform
 * Provides environment-aware logging that only shows in development
 */

type LogLevel = "info" | "warn" | "error" | "debug";

/**
 * Environment-aware logger class
 */
class Logger {
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === "development";
  }

  /**
   * Log info messages
   */
  info(...args: any[]): void {
    if (this.isDevelopment) {
      console.info("[INFO]", ...args);
    }
  }

  /**
   * Log warning messages
   */
  warn(...args: any[]): void {
    if (this.isDevelopment) {
      console.warn("[WARN]", ...args);
    }
  }

  /**
   * Log error messages
   */
  error(...args: any[]): void {
    if (this.isDevelopment) {
      console.error("[ERROR]", ...args);
    }
  }

  /**
   * Log debug messages
   */
  debug(...args: any[]): void {
    if (this.isDevelopment) {
      console.debug("[DEBUG]", ...args);
    }
  }

  /**
   * Log messages with custom level
   */
  log(level: LogLevel, ...args: any[]): void {
    if (this.isDevelopment) {
      const prefix = `[${level.toUpperCase()}]`;
      switch (level) {
        case "info":
          console.info(prefix, ...args);
          break;
        case "warn":
          console.warn(prefix, ...args);
          break;
        case "error":
          console.error(prefix, ...args);
          break;
        case "debug":
          console.debug(prefix, ...args);
          break;
        default:
          console.log(prefix, ...args);
      }
    }
  }

  /**
   * Log messages regardless of environment (production-safe)
   * Use sparingly and only for critical production logging
   */
  production(...args: any[]): void {
    console.error("[PROD]", ...args);
  }
}

// Create a singleton instance
const logger = new Logger();

export default logger;
export { logger };
