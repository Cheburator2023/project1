import { LoggerInterface } from './LoggerInterface';
import { ConsoleLogger } from './ConsoleLogger';
import { TSLGLogger } from './TSLGLogger';
import { TSLGConnectionTester } from './TSLGConnectionTester';

export class ProductionLogger extends LoggerInterface {
  private currentLogger: LoggerInterface;
  private loggerType: string = 'console';
  private initialized: boolean = false;
  private ttlInterval: NodeJS.Timeout | null = null;
  private lastReconnectTime: number = 0;
  private connectionTTL: number = 2000;
  private isReconnecting: boolean = false;
  private pendingReconnect: boolean = false;
  private consoleOutput: boolean = false; // ВЫКЛЮЧАЕМ консольный вывод в ProductionLogger

  private originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info
  };

  constructor(private config: any) {
    super();
    this.currentLogger = new ConsoleLogger(config);
    this.connectionTTL = config.connectionTTL || 2000;
    this.consoleOutput = false; // Явно выключаем дублирование в консоль
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      this.initialized = true;

      if (process.env.NODE_ENV === 'production') {
        await this.trySwitchToTSLG();
        this.startTTLMonitor();
      } else {
        this.loggerType = 'console';
      }
    } catch (error) {
      this.originalConsole.error('[ProductionLogger] Failed to initialize:', error);
      this.initialized = false;
    }
  }

  private startTTLMonitor(): void {
    if (this.ttlInterval) {
      clearInterval(this.ttlInterval);
    }

    this.ttlInterval = setInterval(async () => {
      if (this.isReconnecting || this.pendingReconnect) {
        return;
      }

      const now = Date.now();
      const timeSinceReconnect = now - this.lastReconnectTime;

      if (timeSinceReconnect >= this.connectionTTL) {
        this.originalConsole.log(`[TSLG] TTL ${this.connectionTTL}ms expired, scheduling reconnection for load balancing`);
        await this.scheduleGracefulReconnect();
      }
    }, 1000);
  }

  private async scheduleGracefulReconnect(): Promise<void> {
    if (this.isReconnecting) {
      return;
    }

    this.pendingReconnect = true;

    setTimeout(async () => {
      if (this.isReconnecting) {
        return;
      }

      try {
        await this.performGracefulReconnect();
      } catch (error) {
        this.originalConsole.error('[TSLG] Graceful reconnection failed:', error);
      } finally {
        this.pendingReconnect = false;
      }
    }, 500);
  }

  private async performGracefulReconnect(): Promise<void> {
    if (this.isReconnecting) {
      return;
    }

    this.isReconnecting = true;

    try {
      this.originalConsole.log('[TSLG] Starting graceful reconnection for load balancing');

      if (this.loggerType === 'tslg' && this.currentLogger instanceof TSLGLogger) {
        const status = this.currentLogger.getStatus();

        if (status.bufferSize > 0) {
          this.originalConsole.log(`[TSLG] Waiting for ${status.bufferSize} buffered logs to be sent`);
          await this.waitForBufferFlush(status.bufferSize);
        }

        this.currentLogger.close();
      }

      await this.trySwitchToTSLG();
      this.lastReconnectTime = Date.now();

      this.originalConsole.log('[TSLG] Graceful reconnection completed successfully');

    } catch (error) {
      this.originalConsole.error('[TSLG] Graceful reconnection failed:', error);
      throw error;
    } finally {
      this.isReconnecting = false;
    }
  }

  private async waitForBufferFlush(initialBufferSize: number): Promise<void> {
    return new Promise((resolve) => {
      let attempts = 0;
      const maxAttempts = 10;

      const checkBuffer = () => {
        attempts++;

        if (this.loggerType !== 'tslg' || !(this.currentLogger instanceof TSLGLogger)) {
          resolve();
          return;
        }

        const status = this.currentLogger.getStatus();

        if (status.bufferSize === 0 || attempts >= maxAttempts) {
          if (status.bufferSize > 0) {
            this.originalConsole.warn(`[TSLG] Buffer not fully flushed after ${attempts} attempts, ${status.bufferSize} logs remaining`);
          }
          resolve();
        } else {
          setTimeout(checkBuffer, 500);
        }
      };

      setTimeout(checkBuffer, 500);
    });
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
        this.lastReconnectTime = Date.now();

        this.originalConsole.log(`[TSLG] Successfully switched to TSLG logger. Connected to ${this.config.host}:${this.config.port}`);
      } else {
        this.originalConsole.warn('[TSLG] TSLG agent not available, using console logger');
        this.loggerType = 'console';
      }
    } catch (error) {
      this.originalConsole.error('[TSLG] Failed to switch to TSLG logger:', error);
      this.loggerType = 'console';
    }
  }

  log(level: string, message: string, event: string = 'Информация', error: Error | null = null, additionalData: any = {}): void {
    // УБИРАЕМ вывод в консоль здесь - это вызывает дублирование
    // Консольный вывод будет только через TSLGLogger если включен consoleOutput

    if (!this.initialized) {
      return;
    }

    if (this.isReconnecting) {
      return;
    }

    try {
      this.currentLogger.log(level, message, event, error, additionalData);
    } catch (logError) {
      this.originalConsole.error('[ProductionLogger] Error in logger:', logError);
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
    if (this.ttlInterval) {
      clearInterval(this.ttlInterval);
      this.ttlInterval = null;
    }

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
      currentLogger: this.currentLogger ? this.currentLogger.constructor.name : 'none',
      connectionTTL: this.connectionTTL,
      lastReconnectTime: this.lastReconnectTime,
      timeSinceLastReconnect: Date.now() - this.lastReconnectTime,
      isReconnecting: this.isReconnecting,
      pendingReconnect: this.pendingReconnect,
      consoleOutput: this.consoleOutput
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