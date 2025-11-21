import { ErrorReporterPort } from '../../core/ports/error-reporter.port';

/**
 * Console-based error reporter for development and debugging
 */
export class ConsoleAdapter extends ErrorReporterPort {
  // ANSI color codes for terminal output
  private readonly COLORS = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    gray: '\x1b[90m',
  };

  /**
   * Capture an exception and log it to console with formatting
   */
  captureException(error: Error, context?: Record<string, unknown>): void {
    const timestamp = this.formatTimestamp();
    const message = `${this.COLORS.red}[${timestamp}] ERROR: ${error.message}${this.COLORS.reset}`;

    console.error(message);

    if (context && Object.keys(context).length > 0) {
      console.error(`  ${this.COLORS.gray}Context:${this.COLORS.reset}`, context);
    }

    if (error.stack) {
      console.error(`  ${this.COLORS.gray}Stack:${this.COLORS.reset}\n${this.formatStack(error.stack)}`);
    }
  }

  /**
   * Capture a message and log it to console with appropriate level
   */
  captureMessage(message: string, level: 'info' | 'warning' | 'error'): void {
    const timestamp = this.formatTimestamp();
    const levelUpper = level.toUpperCase();

    switch (level) {
      case 'info':
        console.info(`${this.COLORS.blue}[${timestamp}] INFO: ${message}${this.COLORS.reset}`);
        break;
      case 'warning':
        console.warn(`${this.COLORS.yellow}[${timestamp}] WARNING: ${message}${this.COLORS.reset}`);
        break;
      case 'error':
        console.error(`${this.COLORS.red}[${timestamp}] ERROR: ${message}${this.COLORS.reset}`);
        break;
    }
  }

  /**
   * Format timestamp in ISO-like format
   */
  private formatTimestamp(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  /**
   * Format stack trace with indentation
   */
  private formatStack(stack: string): string {
    return stack
      .split('\n')
      .map(line => `    ${line}`)
      .join('\n');
  }
}
