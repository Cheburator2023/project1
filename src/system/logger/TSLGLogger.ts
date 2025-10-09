import * as net from 'net';
import { LoggerInterface } from './LoggerInterface';
import { LogEntryBuilder } from './LogEntryBuilder';
import { ConnectionManager } from './ConnectionManager';
import { BufferManager } from './BufferManager';

export class TSLGLogger extends LoggerInterface {
  private connectionManager: ConnectionManager;
  private bufferManager: BufferManager;
  private logEntryBuilder: LogEntryBuilder;
  private ttlInterval: NodeJS.Timeout | null = null;
  private flushInterval: NodeJS.Timeout | null = null;

  private config: any;
  private metrics: any;

  private originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info
  };

  constructor(config: any = {}) {
    super();
    this.config = this.mergeWithDefaults(config);
    this.metrics = this.initializeMetrics();

    this.connectionManager = new ConnectionManager(
      {
        host: this.config.host,
        port: this.config.port,
        socketTimeout: this.config.socketTimeout,
        reconnectionDelay: this.config.reconnectionDelay,
        maxConnectionAttempts: this.config.maxConnectionAttempts
      },
      this.originalConsole
    );

    this.bufferManager = new BufferManager(this.config.maxBufferSize, this.metrics);

    this.logEntryBuilder = new LogEntryBuilder({
      appName: this.config.appName,
      risCode: this.config.risCode,
      projectCode: this.config.projectCode,
      appType: this.config.appType,
      envType: this.config.envType,
      namespace: this.config.namespace,
      podName: this.config.podName,
      podIp: this.config.podIp,
      nodeName: this.config.nodeName,
      tslgClientVersion: this.config.tslgClientVersion,
      enableUserData: this.config.enableUserData,
      sanitizeSensitiveData: this.config.sanitizeSensitiveData,
      enableFullContext: this.config.enableFullContext,
      sanitizePercentage: this.config.sanitizePercentage,
      userFieldsMapping: this.config.userFieldsMapping
    });

    this.connectionManager.connect();

    if (this.config.connectionTTL > 0) {
      this.startTTLMonitor();
    }

    this.startBufferFlushMonitor();
  }

  private mergeWithDefaults(config: any): any {
    const defaults = {
      host: process.env.TSLG_AGENT_HOST || 'tslg-agent-svc-main.dk1-sumd01-sumd-core.svc.cluster.local',
      port: parseInt(process.env.TSLG_AGENT_PORT || '5170', 10),
      appName: process.env.APP_NAME || 'surm-backend',
      projectCode: process.env.PROJECT_CODE || 'SURM',
      risCode: process.env.RIS_CODE || '1404',
      appType: 'NODEJS',
      envType: 'K8S',
      tslgClientVersion: process.env.TSLG_CLIENT_VERSION || '1.0.0',
      reconnectionDelay: parseInt(process.env.TSLG_RECONNECTION_DELAY_MS || '1000', 10),
      connectionTTL: parseInt(process.env.TSLG_CONNECTION_TTL_MS || '2000', 10),
      socketTimeout: parseInt(process.env.TSLG_SOCKET_TIMEOUT_MS || '10000', 10),
      maxBufferSize: parseInt(process.env.TSLG_MAX_BUFFER_SIZE || '1000', 10),
      maxConnectionAttempts: parseInt(process.env.TSLG_MAX_CONNECTION_ATTEMPTS || '10', 10),
      namespace: process.env.KUBERNETES_NAMESPACE || 'dk1-sumd01-sumd-core',
      podName: process.env.POD_NAME || 'surm-backend-7c8b5d9f6-abc123',
      podIp: process.env.POD_IP || '10.244.1.25',
      nodeName: process.env.NODE_NAME || 'dk1-sumd01-node-05',
      enableTraceFields: process.env.TSLG_ENABLE_TRACE_FIELDS === 'true',
      consoleOutput: process.env.TSLG_CONSOLE_OUTPUT === 'true' || process.env.NODE_ENV !== 'production',
      debugJson: process.env.DEBUG_JSON === 'true',
      enableUserData: process.env.TSLG_ENABLE_USER_DATA === 'true',
      sanitizeSensitiveData: process.env.TSLG_SANITIZE_SENSITIVE_DATA !== 'false',
      enableFullContext: process.env.TSLG_ENABLE_FULL_CONTEXT === 'true',
      bufferFlushInterval: parseInt(process.env.TSLG_BUFFER_FLUSH_INTERVAL_MS || '500', 10),
      sanitizePercentage: parseInt(process.env.TSLG_SANITIZE_PERCENTAGE || '60', 10),
      logLevel: process.env.TSLG_LOG_LEVEL || 'info',
      userFieldsMapping: {
        userId: process.env.TSLG_USER_ID || 'sub',
        username: process.env.TSLG_USER_USERNAME || 'preferred_username',
        email: process.env.TSLG_USER_EMAIL || 'email',
        firstName: process.env.TSLG_USER_FIRSTNAME || 'given_name',
        lastName: process.env.TSLG_USER_LASTNAME || 'family_name'
      }
    };

    return { ...defaults, ...config };
  }

  private initializeMetrics() {
    return {
      sentLogs: 0,
      failedLogs: 0,
      reconnections: 0,
      bufferFlushes: 0,
      connectionErrors: 0,
      ttlReconnections: 0,
      sanitizedDataCount: 0,
      bufferOverflows: 0,
      forcedFlushes: 0
    };
  }

  private shouldLog(level: string): boolean {
    const levels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3,
      verbose: 4
    };

    const currentLevel = levels[level as keyof typeof levels] || 2;
    const configuredLevel = levels[this.config.logLevel as keyof typeof levels] || 2;

    return currentLevel <= configuredLevel;
  }

  log(level: string, message: string, event: string = 'Информация', error: Error | null = null, additionalData: any = {}): void {
    if (!this.shouldLog(level)) {
      return;
    }

    try {
      const logEntry = this.logEntryBuilder.buildLogEntry(level, message, event, error, additionalData);
      const logData = JSON.stringify(logEntry);

      this.writeToConsole(level, message, event, error, additionalData);

      if (this.config.debugJson) {
        this.originalConsole.log('[TSLG DEBUG JSON]:', logData);
      }

      if (Buffer.byteLength(logData, 'utf8') > 1000000) {
        this.originalConsole.warn('[TSLG] Log message too large, truncating');
        const truncatedEntry = { ...logEntry, text: logEntry.text.substring(0, 1000) + ' [TRUNCATED]' };
        const truncatedData = JSON.stringify(truncatedEntry);
        this.sendLogData(truncatedData);
      } else {
        this.sendLogData(logData);
      }
    } catch (logError) {
      this.originalConsole.error('[TSLG] Error building log entry:', logError);
      this.writeToConsole(level, message, event, error, additionalData);
    }
  }

  private sendLogData(logData: string): void {
    if (!this.connectionManager.isConnected()) {
      this.bufferManager.bufferLog(logData);
      return;
    }

    try {
      const success = this.connectionManager.write(logData + '\n');
      if (!success) {
        this.bufferManager.bufferLog(logData);
      } else {
        this.metrics.sentLogs++;
      }
    } catch (error) {
      this.originalConsole.error('[TSLG] Failed to send log to TSLG:', error);
      this.bufferManager.bufferLog(logData);
    }
  }

  private writeToConsole(level: string, message: string, event: string, error: Error | null, additionalData: any = {}): void {
    if (!this.config.consoleOutput) return;

    const timestamp = new Date().toISOString();
    const levelUpper = level.toUpperCase();

    let logMessage = `[${timestamp}] [${levelUpper}] [${event}] ${this.safeStringify(message)}`;

    if (error) {
      logMessage += ` | Error: ${this.safeStringify(error)}`;
    }

    if (additionalData && Object.keys(additionalData).length > 0) {
      logMessage += ` | Data: ${this.safeStringify(additionalData)}`;
    }

    switch (level) {
      case 'error':
        this.originalConsole.error(logMessage);
        if (error && error.stack) {
          this.originalConsole.error(error.stack);
        }
        break;
      case 'warn':
        this.originalConsole.warn(logMessage);
        break;
      case 'info':
      default:
        this.originalConsole.log(logMessage);
    }
  }

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

  debug(message: string, event: string = 'Отладка', additionalData: any = {}): void {
    this.log('debug', message, event, null, additionalData);
  }

  verbose(message: string, event: string = 'Подробно', additionalData: any = {}): void {
    this.log('verbose', message, event, null, additionalData);
  }

  close(): void {
    if (this.ttlInterval) {
      clearInterval(this.ttlInterval);
      this.ttlInterval = null;
    }

    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }

    if (this.bufferManager.getBufferSize() > 0) {
      this.originalConsole.log(`[TSLG] Attempting to flush ${this.bufferManager.getBufferSize()} buffered logs before shutdown`);
      this.bufferManager.flushBufferSync((data) => this.connectionManager.write(data + '\n'));
    }

    this.connectionManager.close();
    this.originalConsole.log('[TSLG] Logger closed');
  }

  getStatus(): any {
    return {
      type: 'TSLGLogger',
      isProduction: process.env.NODE_ENV === 'production',
      isConnected: this.connectionManager.isConnected(),
      config: {
        host: this.config.host,
        port: this.config.port,
        appName: this.config.appName,
        consoleOutput: this.config.consoleOutput,
        connectionTTL: this.config.connectionTTL,
        reconnectionDelay: this.config.reconnectionDelay,
        enableUserData: this.config.enableUserData,
        sanitizeSensitiveData: this.config.sanitizeSensitiveData,
        enableFullContext: this.config.enableFullContext,
        sanitizePercentage: this.config.sanitizePercentage,
        logLevel: this.config.logLevel,
        userFieldsMapping: this.config.userFieldsMapping
      },
      metrics: { ...this.metrics },
      bufferSize: this.bufferManager.getBufferSize(),
      connectionAttempts: this.connectionManager.getConnectionAttempts(),
      lastConnectionTime: this.connectionManager.getLastConnectionTime()
    };
  }

  // Остальные методы класса остаются без изменений
  private startTTLMonitor(): void {
    if (this.ttlInterval) {
      clearInterval(this.ttlInterval);
    }

    this.ttlInterval = setInterval(async () => {
      if (!this.connectionManager.isConnected()) {
        return;
      }

      const now = Date.now();
      const timeSinceReconnect = now - this.connectionManager.getLastConnectionTime();

      if (timeSinceReconnect >= this.config.connectionTTL) {
        this.originalConsole.log(`[TSLG] TTL ${this.config.connectionTTL}ms expired, scheduling reconnection for load balancing`);
        await this.performGracefulReconnect();
      }
    }, 1000);
  }

  private startBufferFlushMonitor(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }

    this.flushInterval = setInterval(() => {
      if (this.bufferManager.getBufferSize() > 0 &&
        this.connectionManager.isConnected() &&
        !this.bufferManager['isFlushing']) {
        this.metrics.forcedFlushes++;
        this.bufferManager.flushBuffer((data) => this.connectionManager.write(data + '\n'));
      }
    }, this.config.bufferFlushInterval);
  }

  private async performGracefulReconnect(): Promise<void> {
    try {
      this.originalConsole.log('[TSLG] Starting graceful reconnection for load balancing');

      if (this.connectionManager.isConnected()) {
        const status = this.getStatus();

        if (status.bufferSize > 0) {
          this.originalConsole.log(`[TSLG] Waiting for ${status.bufferSize} buffered logs to be sent`);
          await this.waitForBufferFlush(status.bufferSize);
        }

        this.connectionManager.close();
      }

      this.connectionManager.connect();
      this.metrics.ttlReconnections++;

      this.originalConsole.log('[TSLG] Graceful reconnection completed successfully');

    } catch (error) {
      this.originalConsole.error('[TSLG] Graceful reconnection failed:', error);
    }
  }

  private async waitForBufferFlush(initialBufferSize: number): Promise<void> {
    return new Promise((resolve) => {
      let attempts = 0;
      const maxAttempts = 10;

      const checkBuffer = () => {
        attempts++;

        const status = this.getStatus();

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
}