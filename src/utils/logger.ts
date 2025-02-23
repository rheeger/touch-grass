// Logger utility for structured logging
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogMessage {
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  timestamp: string;
}

class Logger {
  private static formatMessage(message: string, context?: Record<string, unknown>): LogMessage {
    return {
      level: 'error',
      message,
      context,
      timestamp: new Date().toISOString(),
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static debug(message: string, context?: Record<string, unknown>): void {
    // No-op for debug logs
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static info(message: string, context?: Record<string, unknown>): void {
    // No-op for info logs
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static warn(message: string, context?: Record<string, unknown>): void {
    // No-op for warn logs
  }

  static error(message: string, context?: Record<string, unknown>): void {
    const logMessage = this.formatMessage(message, context);
    logMessage.level = 'error';
    console.error(JSON.stringify(logMessage));
  }
}

export default Logger; 