import { isBrowser } from './environment'

export interface LoggerOptions {
  /** Whether to enable log output */
  enabled: boolean
  /** Log prefix */
  prefix: string
}

/**
 * Generic Logger Utility
 * Supports browser and Node.js environments, providing unified log output format
 */
export class Logger {
  private options: LoggerOptions

  /**
   * Create Logger instance
   * @param options Log configuration options
   */
  constructor(options: Partial<LoggerOptions> = {}) {
    this.options = {
      enabled: options.enabled ?? false,
      prefix: options.prefix ?? '[SDK]',
    }
  }

  private formatMessage(message: string): string {
    return `${this.options.prefix} ${message}`
  }

  /**
   * Output normal log
   * @param message Log message
   * @param args Other arguments
   */
  log(message: string, ...args: any[]): void {
    if (!this.options.enabled) return

    const formattedMessage = this.formatMessage(message)

    if (isBrowser()) {
      console.log(formattedMessage, ...args)
    } else {
      console.log(formattedMessage, ...args)
    }
  }

  /**
   * Output info log
   * @param message Log message
   * @param args Other arguments
   */
  info(message: string, ...args: any[]): void {
    if (!this.options.enabled) return

    const formattedMessage = this.formatMessage(message)

    if (isBrowser()) {
      console.info(formattedMessage, ...args)
    } else {
      console.info(formattedMessage, ...args)
    }
  }

  /**
   * Output warning log
   * Warning logs are not controlled by the enabled option and are always output
   * @param message Log message
   * @param args Other arguments
   */
  warn(message: string, ...args: any[]): void {
    const formattedMessage = this.formatMessage(message)

    if (isBrowser()) {
      console.warn(formattedMessage, ...args)
    } else {
      console.warn(formattedMessage, ...args)
    }
  }

  /**
   * Output error log
   * Error logs are not controlled by the enabled option and are always output
   * @param message Log message
   * @param args Other arguments
   */
  error(message: string, ...args: any[]): void {
    const formattedMessage = this.formatMessage(message)

    if (isBrowser()) {
      console.error(formattedMessage, ...args)
    } else {
      console.error(formattedMessage, ...args)
    }
  }

  /**
   * Set whether to enable log output
   * @param enabled true: enable, false: disable
   */
  setEnabled(enabled: boolean): void {
    this.options.enabled = enabled
  }
}
