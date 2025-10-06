import * as net from 'net';
import { v4 as uuidv4 } from 'uuid';
import { LoggerInterface } from './LoggerInterface';

interface CallerInfo {
  callerClass?: string;
  callerMethod?: string;
  callerLine?: number;
  callerFile?: string;
  loggerName?: string;
}

export class TSLGLogger extends LoggerInterface {
  private socket: net.Socket | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private lastConnectionTime: number = 0;
  private isFlushing: boolean = false;
  private logBuffer: string[] = [];
  private connectionAttempts: number = 0;
  private maxConnectionAttempts: number = 10;
  private maxBufferSize: number = 1000;
  private ttlInterval: NodeJS.Timeout | null = null;

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
    this.initializeBuffer();
    this.connect();
    this.startTTLMonitor();
  }

  private mergeWithDefaults(config: any): any {
    const defaults = {
      host: process.env.TSLG_AGENT_HOST || 'tslg-agent-svc-main',
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
      namespace: process.env.KUBERNETES_NAMESPACE || 'dk1-sumd01-sumd-core',
      podName: process.env.POD_NAME || 'surm-backend-7c8b5d9f6-abc123',
      podIp: process.env.POD_IP || '10.244.1.25',
      nodeName: process.env.NODE_NAME || 'dk1-sumd01-node-05',
      enableTraceFields: process.env.TSLG_ENABLE_TRACE_FIELDS === 'true',
      consoleOutput: process.env.TSLG_CONSOLE_OUTPUT === 'true' || process.env.NODE_ENV !== 'production',
      debugJson: process.env.DEBUG_JSON === 'true'
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
      ttlReconnections: 0
    };
  }

  private initializeBuffer() {
    this.logBuffer = [];
    this.maxBufferSize = this.config.maxBufferSize;
    this.isFlushing = false;
  }

  private startTTLMonitor(): void {
    if (this.ttlInterval) {
      clearInterval(this.ttlInterval);
    }

    this.ttlInterval = setInterval(async () => {
      if (!this.isConnected()) {
        return;
      }

      const now = Date.now();
      const timeSinceReconnect = now - this.lastConnectionTime;

      if (timeSinceReconnect >= this.config.connectionTTL) {
        this.originalConsole.log(`[TSLG] TTL ${this.config.connectionTTL}ms expired, scheduling reconnection for load balancing`);
        await this.performGracefulReconnect();
      }
    }, 1000);
  }

  private async performGracefulReconnect(): Promise<void> {
    try {
      this.originalConsole.log('[TSLG] Starting graceful reconnection for load balancing');

      if (this.isConnected()) {
        const status = this.getStatus();

        if (status.bufferSize > 0) {
          this.originalConsole.log(`[TSLG] Waiting for ${status.bufferSize} buffered logs to be sent`);
          await this.waitForBufferFlush(status.bufferSize);
        }

        if (this.socket) {
          this.socket.destroy();
          this.socket = null;
        }
      }

      this.connect();
      this.lastConnectionTime = Date.now();
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

  private isConnected(): boolean {
    return !!(this.socket && !this.socket.destroyed && this.socket.writable);
  }

  private connect() {
    if (this.connectionAttempts >= this.maxConnectionAttempts) {
      this.originalConsole.error(`[TSLG] Max connection attempts (${this.maxConnectionAttempts}) reached. Giving up.`);
      return;
    }

    this.connectionAttempts++;

    try {
      this.originalConsole.log(`[TSLG] Attempting to connect to TSLG agent at ${this.config.host}:${this.config.port} (attempt ${this.connectionAttempts})`);

      this.socket = net.createConnection({
        host: this.config.host,
        port: this.config.port,
        timeout: this.config.socketTimeout
      });

      this.setupSocketEventHandlers();
      this.socket.setTimeout(this.config.socketTimeout);
      this.socket.setKeepAlive(true, 60000);

    } catch (error) {
      this.originalConsole.error('[TSLG] Failed to create TSLG connection:', error);
      this.scheduleReconnect();
    }
  }

  private setupSocketEventHandlers() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this.lastConnectionTime = Date.now();
      this.connectionAttempts = 0;
      this.metrics.reconnections++;
      this.originalConsole.log(`[TSLG] Connected successfully to ${this.config.host}:${this.config.port}`);
      this.flushBuffer();
    });

    this.socket.on('error', (error) => {
      this.metrics.connectionErrors++;
      this.originalConsole.error(`[TSLG] Connection error: ${error.message}`);
      this.scheduleReconnect();
    });

    this.socket.on('close', (hadError) => {
      this.originalConsole.log(`[TSLG] Connection closed${hadError ? ' with error' : ''}`);
      if (hadError) {
        this.scheduleReconnect();
      }
    });

    this.socket.on('timeout', () => {
      this.originalConsole.error('[TSLG] Connection timeout');
      this.safeReconnect();
    });

    this.socket.on('drain', () => {
      this.flushBuffer();
    });
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    const delay = this.calculateReconnectDelay();
    this.originalConsole.log(`[TSLG] Scheduling reconnect in ${delay}ms`);

    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }

  private calculateReconnectDelay(): number {
    const baseDelay = this.config.reconnectionDelay;
    const maxDelay = 30000;
    const delay = Math.min(baseDelay * Math.pow(1.5, this.connectionAttempts - 1), maxDelay);
    return delay;
  }

  private safeReconnect() {
    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }
    this.scheduleReconnect();
  }

  private bufferLog(logData: string) {
    if (this.logBuffer.length >= this.maxBufferSize) {
      this.logBuffer.shift();
      this.metrics.failedLogs++;
      this.originalConsole.warn('[TSLG] Buffer overflow, removed oldest log');
    }

    this.logBuffer.push(logData);

    if (!this.isFlushing && this.isConnected()) {
      setImmediate(() => this.flushBuffer());
    }
  }

  private async flushBuffer() {
    if (!this.isConnected() || this.isFlushing || this.logBuffer.length === 0) {
      return;
    }

    this.isFlushing = true;
    this.metrics.bufferFlushes++;

    try {
      while (this.logBuffer.length > 0 && this.isConnected()) {
        const logData = this.logBuffer[0];

        try {
          const success = this.socket!.write(logData + '\n');

          if (success) {
            this.logBuffer.shift();
            this.metrics.sentLogs++;
          } else {
            break;
          }
        } catch (error) {
          this.originalConsole.error('[TSLG] Error writing to socket:', error);
          break;
        }

        if (this.logBuffer.length > 5) {
          await new Promise(resolve => setImmediate(resolve));
        }
      }
    } finally {
      this.isFlushing = false;
    }
  }

  private getCallerInfo(additionalData: any): CallerInfo {
    if (additionalData.context && typeof additionalData.context === 'string') {
      if (!additionalData.context.includes('\n    at ')) {
        return {
          loggerName: additionalData.context
        };
      }
    }

    const error = {} as any;
    Error.captureStackTrace(error);

    const stackLines = error.stack.split('\n');

    for (let i = 4; i < stackLines.length; i++) {
      const line = stackLines[i];
      const match = line.match(/at\s+(.+)\s+\((.+):(\d+):(\d+)\)/) ||
        line.match(/at\s+(.+):(\d+):(\d+)/);

      if (match) {
        let className = 'unknown';
        let methodName = 'anonymous';

        if (match[1] && match[1] !== 'Object.<anonymous>') {
          const parts = match[1].split('.');
          if (parts.length > 1) {
            className = parts[parts.length - 2] || 'unknown';
            methodName = parts[parts.length - 1];
          } else {
            methodName = parts[0];
          }
        }

        if (match[2] && !match[2].includes('node_modules') && !match[2].includes('internal/')) {
          const fileName = match[2].split('/').pop() || match[2];
          return {
            loggerName: className,
            callerClass: fileName.replace('.ts', '').replace('.js', ''),
            callerMethod: methodName,
            callerLine: parseInt(match[3], 10),
            callerFile: fileName
          };
        }
      }
    }

    return { loggerName: 'application' };
  }

  private createLogEntry(level: string, message: string, event: string, error: Error | null, additionalData: any) {
    const timestamp = new Date();
    const callerInfo = this.getCallerInfo(additionalData);

    const logEntry: any = {
      "eventId": uuidv4(),
      "appName": this.config.appName,
      "level": level.toUpperCase(), // Верхний регистр как в образце
      "text": typeof message === 'string' ? message : JSON.stringify(message, null, 2),
      "localTime": timestamp.toISOString(),
      "tslgClientVersion": this.config.tslgClientVersion,
      "risCode": this.config.risCode,
      "projectCode": this.config.projectCode,
      "appType": this.config.appType,
      "envType": this.config.envType,
      "PID": process.pid,
      "loggerName": callerInfo.loggerName || 'application'
    };

    if (this.config.envType === 'K8S') {
      logEntry.namespace = this.config.namespace;
      logEntry.podName = this.config.podName;
      logEntry.tec = {
        "podIp": this.config.podIp,
        "nodeName": this.config.nodeName
      };
    }

    if (callerInfo.callerClass && callerInfo.callerClass !== 'unknown') {
      logEntry.callerClass = callerInfo.callerClass;
    }
    if (callerInfo.callerMethod && callerInfo.callerMethod !== 'anonymous') {
      logEntry.callerMethod = callerInfo.callerMethod;
    }
    if (callerInfo.callerLine) {
      logEntry.callerLine = callerInfo.callerLine;
    }

    if (error) {
      if (error instanceof Error) {
        logEntry.stack = this.cleanStack(error.stack);
        logEntry.errorMessage = error.message;
      } else {
        logEntry.error = JSON.stringify(error);
      }
    }

    const sanitizedData = this.sanitizeData(additionalData);
    Object.keys(sanitizedData).forEach(key => {
      if (!logEntry.hasOwnProperty(key) &&
        key !== 'context' &&
        key !== 'params' &&
        key !== 'stack') {
        logEntry[key] = sanitizedData[key];
      }
    });

    if (sanitizedData.params && Array.isArray(sanitizedData.params)) {
      sanitizedData.params.forEach((param: any, index: number) => {
        if (typeof param === 'string' && param.length > 0) {
          logEntry[`param${index}`] = param;
        }
      });
    }

    return logEntry;
  }

  private cleanStack(stack?: string): string {
    if (!stack) return '';
    return stack
      .split('\n')
      .slice(1)
      .map(line => line.trim())
      .join('\n');
  }

  private sanitizeData(data: any): any {
    if (!data || typeof data !== 'object') return {};

    const sensitiveFields = [
      'password', 'token', 'jwt', 'accessToken', 'refreshToken',
      'authorization', 'secret', 'apiKey', 'credentials'
    ];

    const sanitized = JSON.parse(JSON.stringify(data));

    const sanitizeRecursive = (obj: any) => {
      for (const key in obj) {
        if (sensitiveFields.includes(key.toLowerCase())) {
          obj[key] = '*****';
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          sanitizeRecursive(obj[key]);
        }
      }
    };

    if (Object.keys(sanitized).length > 0) {
      sanitizeRecursive(sanitized);
    }

    return sanitized;
  }

  log(level: string, message: string, event: string = 'Информация', error: Error | null = null, additionalData: any = {}): void {
    const logEntry = this.createLogEntry(level, message, event, error, additionalData);
    const logData = JSON.stringify(logEntry);

    this.writeToConsole(level, message, event, error, additionalData);

    if (this.config.debugJson) {
      this.originalConsole.log(logData);
    }

    if (!this.isConnected()) {
      this.bufferLog(logData);
      return;
    }

    try {
      if (this.socket!.writableLength < 65536) {
        const success = this.socket!.write(logData + '\n');
        if (success) {
          this.metrics.sentLogs++;
        } else {
          this.bufferLog(logData);
        }
      } else {
        this.bufferLog(logData);
      }
    } catch (error) {
      this.originalConsole.error('[TSLG] Failed to send log to TSLG:', error);
      this.bufferLog(logData);
    }
  }

  private writeToConsole(level: string, message: string, event: string, error: Error | null, additionalData: any = {}): void {
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

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    if (this.logBuffer.length > 0) {
      this.originalConsole.log(`[TSLG] Attempting to flush ${this.logBuffer.length} buffered logs before shutdown`);
      this.flushBufferSync();
    }

    if (this.socket) {
      this.socket.destroy();
    }

    this.originalConsole.log('[TSLG] Logger closed');
  }

  private flushBufferSync() {
    if (!this.isConnected() || this.logBuffer.length === 0) return;

    let attempts = 0;
    while (this.logBuffer.length > 0 && attempts < 3) {
      try {
        const logData = this.logBuffer[0];
        const success = this.socket!.write(logData + '\n');

        if (success) {
          this.logBuffer.shift();
          this.metrics.sentLogs++;
        } else {
          attempts++;
        }
      } catch (error) {
        attempts++;
        break;
      }
    }
  }

  getStatus(): any {
    return {
      type: 'TSLGLogger',
      isProduction: process.env.NODE_ENV === 'production',
      isConnected: this.isConnected(),
      config: {
        host: this.config.host,
        port: this.config.port,
        appName: this.config.appName,
        consoleOutput: this.config.consoleOutput,
        connectionTTL: this.config.connectionTTL,
        reconnectionDelay: this.config.reconnectionDelay
      },
      metrics: { ...this.metrics },
      bufferSize: this.logBuffer.length,
      connectionAttempts: this.connectionAttempts,
      lastConnectionTime: this.lastConnectionTime,
      isFlushing: this.isFlushing,
      socketWritable: this.socket ? this.socket.writable : false,
      socketBufferSize: this.socket ? this.socket.writableLength : 0
    };
  }
}