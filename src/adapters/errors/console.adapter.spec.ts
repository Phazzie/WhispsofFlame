import { ConsoleAdapter } from './console.adapter';

describe('ConsoleAdapter', () => {
  let adapter: ConsoleAdapter;
  let consoleErrorSpy: jasmine.Spy;
  let consoleWarnSpy: jasmine.Spy;
  let consoleInfoSpy: jasmine.Spy;

  beforeEach(() => {
    adapter = new ConsoleAdapter();
    consoleErrorSpy = spyOn(console, 'error');
    consoleWarnSpy = spyOn(console, 'warn');
    consoleInfoSpy = spyOn(console, 'info');
  });

  describe('captureException', () => {
    it('should log error to console.error', () => {
      const error = new Error('Test error');

      adapter.captureException(error);

      expect(consoleErrorSpy).toHaveBeenCalledTimes(2); // message + stack
      expect(consoleErrorSpy.calls.argsFor(0)[0]).toContain('ERROR: Test error');
    });

    it('should include timestamp in error message', () => {
      const error = new Error('Test error');

      adapter.captureException(error);

      const message = consoleErrorSpy.calls.argsFor(0)[0];
      // Check for timestamp pattern [YYYY-MM-DD HH:MM:SS]
      expect(message).toMatch(/\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\]/);
    });

    it('should log context when provided', () => {
      const error = new Error('Test error');
      const context = { sessionId: 'ABC123', userId: '456' };

      adapter.captureException(error, context);

      expect(consoleErrorSpy).toHaveBeenCalledTimes(3); // message + context + stack
      expect(consoleErrorSpy.calls.argsFor(1)[0]).toContain('Context:');
      expect(consoleErrorSpy.calls.argsFor(1)[1]).toEqual(context);
    });

    it('should not log context when not provided', () => {
      const error = new Error('Test error');

      adapter.captureException(error);

      expect(consoleErrorSpy).toHaveBeenCalledTimes(2); // message + stack only
    });

    it('should not log context when empty object provided', () => {
      const error = new Error('Test error');

      adapter.captureException(error, {});

      expect(consoleErrorSpy).toHaveBeenCalledTimes(2); // message + stack only
    });

    it('should include stack trace', () => {
      const error = new Error('Test error');

      adapter.captureException(error);

      const stackCall = consoleErrorSpy.calls.argsFor(1)[0];
      expect(stackCall).toContain('Stack:');
      expect(stackCall).toContain('Error: Test error');
    });

    it('should format stack trace with indentation', () => {
      const error = new Error('Test error');

      adapter.captureException(error);

      const stackCall = consoleErrorSpy.calls.argsFor(1)[0];
      // Check that stack lines are indented
      const lines = stackCall.split('\n');
      expect(lines.some((line: string) => line.startsWith('    '))).toBe(true);
    });

    it('should use ANSI color codes for formatting', () => {
      const error = new Error('Test error');

      adapter.captureException(error);

      const message = consoleErrorSpy.calls.argsFor(0)[0];
      // Check for ANSI color codes (red for errors)
      expect(message).toContain('\x1b[31m'); // Red color
      expect(message).toContain('\x1b[0m');  // Reset color
    });
  });

  describe('captureMessage', () => {
    it('should log info message to console.info', () => {
      adapter.captureMessage('Test info message', 'info');

      expect(consoleInfoSpy).toHaveBeenCalledTimes(1);
      expect(consoleInfoSpy.calls.argsFor(0)[0]).toContain('INFO: Test info message');
    });

    it('should log warning message to console.warn', () => {
      adapter.captureMessage('Test warning message', 'warning');

      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      expect(consoleWarnSpy.calls.argsFor(0)[0]).toContain('WARNING: Test warning message');
    });

    it('should log error message to console.error', () => {
      adapter.captureMessage('Test error message', 'error');

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy.calls.argsFor(0)[0]).toContain('ERROR: Test error message');
    });

    it('should include timestamp in info message', () => {
      adapter.captureMessage('Test message', 'info');

      const message = consoleInfoSpy.calls.argsFor(0)[0];
      expect(message).toMatch(/\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\]/);
    });

    it('should include timestamp in warning message', () => {
      adapter.captureMessage('Test message', 'warning');

      const message = consoleWarnSpy.calls.argsFor(0)[0];
      expect(message).toMatch(/\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\]/);
    });

    it('should include timestamp in error message', () => {
      adapter.captureMessage('Test message', 'error');

      const message = consoleErrorSpy.calls.argsFor(0)[0];
      expect(message).toMatch(/\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\]/);
    });

    it('should use blue ANSI color for info messages', () => {
      adapter.captureMessage('Test message', 'info');

      const message = consoleInfoSpy.calls.argsFor(0)[0];
      expect(message).toContain('\x1b[34m'); // Blue color
      expect(message).toContain('\x1b[0m');  // Reset color
    });

    it('should use yellow ANSI color for warning messages', () => {
      adapter.captureMessage('Test message', 'warning');

      const message = consoleWarnSpy.calls.argsFor(0)[0];
      expect(message).toContain('\x1b[33m'); // Yellow color
      expect(message).toContain('\x1b[0m');  // Reset color
    });

    it('should use red ANSI color for error messages', () => {
      adapter.captureMessage('Test message', 'error');

      const message = consoleErrorSpy.calls.argsFor(0)[0];
      expect(message).toContain('\x1b[31m'); // Red color
      expect(message).toContain('\x1b[0m');  // Reset color
    });
  });

  describe('integration', () => {
    it('should handle multiple consecutive calls', () => {
      adapter.captureMessage('First message', 'info');
      adapter.captureMessage('Second message', 'warning');
      adapter.captureException(new Error('Test error'));

      expect(consoleInfoSpy).toHaveBeenCalledTimes(1);
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledTimes(2); // message + stack
    });

    it('should handle errors without stack traces', () => {
      const error = new Error('Test error');
      delete (error as any).stack;

      // Should not throw
      expect(() => adapter.captureException(error)).not.toThrow();
    });
  });
});
