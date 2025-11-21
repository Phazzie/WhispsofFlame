export abstract class ErrorReporterPort {
  /**
   * Capture an exception with context
   */
  abstract captureException(error: Error, context?: Record<string, unknown>): void;

  /**
   * Capture a message (for warnings, info)
   */
  abstract captureMessage(message: string, level: 'info' | 'warning' | 'error'): void;
}
