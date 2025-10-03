import { LoggerInterface } from './LoggerInterface';
import { ConsoleLogger } from './ConsoleLogger';
import { TSLGLogger } from './TSLGLogger';
import { TSLGConnectionTester } from './TSLGConnectionTester';

export class ProductionLogger extends LoggerInterface {
  private currentLogger: LoggerInterface;
  private loggerType: string = 'console';
  private initialized: boolean = false;

  private originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info
  };

  constructor(private config: any) {
    super();
    this.currentLogger = new ConsoleLogger(config);
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      this.initialized = true;

      if (process.env.NODE_ENV === 'production') {
        await this.trySwitchToTSLG();
      } else {
        this.loggerType = 'console';
      }
    } catch (error) {
      this.originalConsole.error('[ProductionLogger] Failed to initialize:', error);
      this.initialized = false;
    }
  }

  private async trySwitchToTSLG(): Promise<void> {
    try {
      const tester = new TSLGConnectionTester({
        host: this.config.host,
        port: this.config.port
      });

      const isAvailable = await tester.isTSLGAvailable();

      if (isAvailable) {
        const tslgLogger = new TSLGLogger(this.config);

        if (this.currentLogger && this.currentLogger.close) {
          this.currentLogger.close();
        }
        this.currentLogger = tslgLogger;
        this.loggerType = 'tslg';

        this.originalConsole.log(`[TSLG] Successfully switched to TSLG logger. Connected to ${this.config.host}:${this.config.port}`);
      } else {
        this.originalConsole.warn('[TSLG] TSLG agent not available, using console logger');
      }
    } catch (error) {
      this.originalConsole.error('[TSLG] Failed to switch to TSLG logger:', error);
    }
  }

  log(level: string, message: string, event: string = 'Информация', error: Error | null = null, additionalData: any = {}): void {
    if (!this.initialized) {
      this.fallbackLog(level, message, event, error, additionalData);
      return;
    }

    try {
      this.currentLogger.log(level, message, event, error, additionalData);
    } catch (logError) {
      this.originalConsole.error('[ProductionLogger] Error in logger:', logError);
      this.fallbackLog(level, message, event, error, additionalData);
    }
  }

  private fallbackLog(level: string, message: string, event: string, error: Error | null, additionalData: any): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[FALLBACK] [${timestamp}] [${level.toUpperCase()}] [${event}] ${message}`;

    if (error) {
      this.originalConsole.error(logMessage, error);
    } else {
      this.originalConsole.log(logMessage);
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
    if (this.currentLogger && this.currentLogger.close) {
      try {
        this.currentLogger.close();
      } catch (error) {
        this.originalConsole.error('[ProductionLogger] Error closing logger:', error);
      }
    }
    this.initialized = false;
  }

  getStatus(): any {
    if (!this.initialized) {
      return {
        type: 'ProductionLogger',
        initialized: false,
        status: 'uninitialized'
      };
    }

    const baseStatus = {
      type: 'ProductionLogger',
      initialized: true,
      loggerType: this.loggerType,
      currentLogger: this.currentLogger ? this.currentLogger.constructor.name : 'none'
    };

    if (this.currentLogger && this.currentLogger.getStatus) {
      try {
        const loggerStatus = this.currentLogger.getStatus();
        return { ...baseStatus, ...loggerStatus };
      } catch (error: any) {
        return { ...baseStatus, statusError: error.message };
      }
    }

    return baseStatus;
  }
}