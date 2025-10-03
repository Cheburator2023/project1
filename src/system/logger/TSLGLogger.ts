import * as net from 'net';
import { v4 as uuidv4 } from 'uuid';
import * as os from 'os';
import { LoggerInterface } from './LoggerInterface';

export class TSLGLogger extends LoggerInterface {
  private socket: net.Socket | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private lastConnectionTime: number = 0;
  private isFlushing: boolean = false;
  private logBuffer: string[] = [];
  private connectionAttempts: number = 0;
  private maxConnectionAttempts: number = 3;
  private maxBufferSize: number = 1000;

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
      consoleOutput: process.env.TSLG_CONSOLE_OUTPUT === 'true'
    };

    return { ...defaults, ...config };
  }

  private initializeMetrics() {
    return {
      sentLogs: 0,
      failedLogs: 0,
      reconnections: 0,
      bufferFlushes: 0,
      connectionErrors: 0
    };
  }

  private initializeBuffer() {
    this.logBuffer = [];
    this.maxBufferSize = this.config.maxBufferSize;
    this.isFlushing = false;
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
        port: this.config.port
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
          const success = this.socket!.write(logData);

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

  private createLogEntry(level: string, message: string, event: string, error: Error | null, additionalData: any) {
    const timestamp = new Date();

    const logEntry: any = {
      "@timestamp": timestamp.getTime() / 1000,
      "level": level.toLowerCase(),
      "eventId": uuidv4(),
      "text": typeof message === 'string' ? message : JSON.stringify(message, null, 2),
      "localTime": timestamp.toISOString(),
      "PID": process.pid,
      "appType": this.config.appType,
      "projectCode": this.config.projectCode,
      "appName": this.config.appName,
      "timestamp": timestamp.toISOString(),
      "envType": this.config.envType,
      "namespace": this.config.namespace,
      "podName": this.config.podName,
      "tec": {
        "nodeName": this.config.nodeName,
        "podIp": this.config.podIp
      },
      "tslgClientVersion": this.config.tslgClientVersion,
      "eventOutcome": event,
      "risCode": this.config.risCode,
      ...this.sanitizeData(additionalData)
    };

    if (this.config.enableTraceFields) {
      logEntry.workerId = 0;
    }

    if (error) {
      if (error instanceof Error) {
        logEntry.stack = error.stack ? error.stack.split('\n').map((line: string) => line.trim()).join('\n') : '';
        logEntry.errorMessage = error.message;

        if (this.config.enableTraceFields) {
          logEntry.stack = logEntry.stack;
        }
      } else {
        logEntry.error = JSON.stringify(error);
      }
    }

    return logEntry;
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
    const logData = JSON.stringify(logEntry) + '\n';

    if (this.config.consoleOutput) {
      this.writeToConsole(level, message, event, error);
    }

    if (!this.isConnected()) {
      this.bufferLog(logData);
      return;
    }

    try {
      if (this.socket!.writableLength < 65536) {
        const success = this.socket!.write(logData);
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

  private writeToConsole(level: string, message: string, event: string, error: Error | null) {
    const timestamp = new Date().toISOString();
    const levelUpper = level.toUpperCase();
    const logMessage = `[${timestamp}] [${levelUpper}] [${event}] ${message}`;

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
        const success = this.socket!.write(logData);

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
      isProduction: true,
      isConnected: this.isConnected(),
      config: {
        host: this.config.host,
        port: this.config.port,
        appName: this.config.appName
      },
      metrics: { ...this.metrics },
      bufferSize: this.logBuffer.length,
      connectionAttempts: this.connectionAttempts
    };
  }
}