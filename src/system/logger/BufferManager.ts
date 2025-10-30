export class BufferManager {
  private logBuffer: string[] = [];
  private isFlushing: boolean = false;
  private maxBufferSize: number;
  private metrics: any;

  constructor(maxBufferSize: number, metrics: any) {
    this.maxBufferSize = maxBufferSize;
    this.metrics = metrics;
  }

  bufferLog(logData: string): void {
    if (this.logBuffer.length >= this.maxBufferSize) {
      this.logBuffer.shift();
      this.metrics.failedLogs++;
      this.metrics.bufferOverflows++;
    }

    this.logBuffer.push(logData);
  }

  async flushBuffer(writeFunction: (data: string) => boolean): Promise<void> {
    if (this.isFlushing || this.logBuffer.length === 0) {
      return;
    }

    this.isFlushing = true;
    this.metrics.bufferFlushes++;

    try {
      while (this.logBuffer.length > 0) {
        const logData = this.logBuffer[0];
        const success = writeFunction(logData);

        if (success) {
          this.logBuffer.shift();
          this.metrics.sentLogs++;
        } else {
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

  flushBufferSync(writeFunction: (data: string) => boolean): void {
    let attempts = 0;
    while (this.logBuffer.length > 0 && attempts < 3) {
      try {
        const logData = this.logBuffer[0];
        const success = writeFunction(logData);

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

  getBufferSize(): number {
    return this.logBuffer.length;
  }

  clear(): void {
    this.logBuffer = [];
  }
}