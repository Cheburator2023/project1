import * as net from 'net';

export class ConnectionManager {
  private socket: net.Socket | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private connectionAttempts: number = 0;
  private maxConnectionAttempts: number = 10;
  private lastConnectionTime: number = 0;

  constructor(
    private config: {
      host: string;
      port: number;
      socketTimeout: number;
      reconnectionDelay: number;
      maxConnectionAttempts?: number;
    },
    private originalConsole: any
  ) {
    this.maxConnectionAttempts = config.maxConnectionAttempts || 10;
  }

  connect(): void {
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
      this.originalConsole.log(`[TSLG] Connected successfully to ${this.config.host}:${this.config.port}`);
    });

    this.socket.on('error', (error) => {
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

  isConnected(): boolean {
    return !!(this.socket && !this.socket.destroyed && this.socket.writable);
  }

  write(data: string): boolean {
    if (!this.isConnected()) {
      return false;
    }

    try {
      return this.socket!.write(data);
    } catch (error) {
      this.originalConsole.error('[TSLG] Error writing to socket:', error);
      return false;
    }
  }

  close(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    if (this.socket) {
      this.socket.destroy();
    }
  }

  getLastConnectionTime(): number {
    return this.lastConnectionTime;
  }

  getConnectionAttempts(): number {
    return this.connectionAttempts;
  }
}