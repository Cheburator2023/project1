import * as dns from 'dns';
import * as net from 'net';

export class TSLGConnectionTester {
  private lastTestTime: number = 0;
  private cacheTTL: number = 30000;
  private hostStatus: any = null;

  constructor(private config: { host: string; port: number }) {}

  async testConnection(): Promise<any> {
    const now = Date.now();
    if (this.hostStatus && (now - this.lastTestTime) < this.cacheTTL) {
      return this.hostStatus;
    }

    try {
      await this.testDNS();
      const isReachable = await this.testTCP();

      this.hostStatus = {
        dnsResolved: true,
        tcpReachable: isReachable,
        lastTest: now
      };

    } catch (error) {
      this.hostStatus = {
        dnsResolved: false,
        tcpReachable: false,
        lastTest: now,
        error: error.message
      };
    }

    this.lastTestTime = now;
    return this.hostStatus;
  }

  private testDNS(): Promise<string> {
    return new Promise((resolve, reject) => {
      dns.lookup(this.config.host, (err, address) => {
        if (err) {
          reject(new Error(`DNS resolution failed for ${this.config.host}: ${err.message}`));
        } else {
          resolve(address);
        }
      });
    });
  }

  private testTCP(): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = net.createConnection({
        host: this.config.host,
        port: this.config.port,
        timeout: 5000
      });

      const timeout = setTimeout(() => {
        socket.destroy();
        resolve(false);
      }, 5000);

      socket.on('connect', () => {
        clearTimeout(timeout);
        socket.destroy();
        resolve(true);
      });

      socket.on('error', () => {
        clearTimeout(timeout);
        resolve(false);
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve(false);
      });
    });
  }

  async isTSLGAvailable(): Promise<boolean> {
    const status = await this.testConnection();
    return status.tcpReachable;
  }

  getStatus(): any {
    return this.hostStatus;
  }
}