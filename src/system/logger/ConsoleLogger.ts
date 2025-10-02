import { LoggerInterface } from './LoggerInterface';

export class ConsoleLogger extends LoggerInterface {
  private originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info,
    debug: console.debug
  };

  private safeStringify(obj: any, depth: number = 0): string {
    if (depth > 10) return '[Circular]';

    try {
      if (obj === null || obj === undefined) return String(obj);
      if (typeof obj === 'string') return obj;
      if (typeof obj === 'number' || typeof obj === 'boolean') return String(obj);
      if (obj instanceof Error) return obj.toString();
      if (typeof obj === 'object') {
        return JSON.stringify(obj, null, 2);
      }
      return String(obj);
    } catch (error) {
      return `[Stringification error: ${error.message}]`;
    }
  }

  private formatMessage(level: string, message: string, event: string, error: Error | null, additionalData: any): string {
    const timestamp = new Date().toISOString();
    const levelUpper = level.toUpperCase();

    let logMessage = `[${timestamp}] [${levelUpper}] [${event}] ${this.safeStringify(message)}`;

    if (error) {
      logMessage += ` | Error: ${this.safeStringify(error)}`;
    }

    if (additionalData && Object.keys(additionalData).length > 0) {
      logMessage += ` | Data: ${this.safeStringify(additionalData)}`;
    }

    return logMessage;
  }

  log(level: string, message: string, event: string = 'Информация', error: Error | null = null, additionalData: any = {}): void {
    const formattedMessage = this.formatMessage(level, message, event, error, additionalData);

    switch (level) {
      case 'error':
        this.originalConsole.error(formattedMessage);
        if (error && error.stack) {
          this.originalConsole.error(error.stack);
        }
        break;
      case 'warn':
        this.originalConsole.warn(formattedMessage);
        break;
      case 'info':
      default:
        this.originalConsole.log(formattedMessage);
    }
  }

  info(message: string, event: string = 'Информация', additionalData: any = {}): void {
    this.log('info', message, event, null, additionalData);
  }

  warn(message: string, event: string = 'Предупреждение', additionalData: any = {}): void {
    this.log('warn', message, event, null, additionalData);
  }

  error(message: string, event: string = 'Ошибка', error: Error | null = null, additionalData: any = {}): void {
    this.log('error', message, event, error, additionalData);
  }

  sys(message: string, additionalData: any = {}): void {
    this.log('info', message, 'Системное', null, additionalData);
  }

  close(): void {
    // Nothing to close for console logger
  }

  getStatus(): any {
    return {
      type: 'ConsoleLogger',
      isProduction: false,
      isConnected: true
    };
  }
}