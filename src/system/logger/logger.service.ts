import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { LoggerFactory } from './LoggerFactory';

@Injectable()
export class LoggerService implements OnModuleDestroy {
  private logger;

  constructor() {
    const config = {
      host: process.env.TSLG_AGENT_HOST || 'tslg-agent-svc-main.dk1-sumd01-sumd-core.svc.cluster.local',
      port: parseInt(process.env.TSLG_AGENT_PORT || '5170', 10),
      appName: process.env.APP_NAME || 'surm-backend',
      projectCode: process.env.PROJECT_CODE || 'SURM',
      risCode: process.env.RIS_CODE || '1404',
      namespace: process.env.KUBERNETES_NAMESPACE || 'dk1-sumd01-sumd-core',
      podName: process.env.POD_NAME || 'surm-backend-7c8b5d9f6-abc123',
      podIp: process.env.POD_IP || '10.244.1.25',
      nodeName: process.env.NODE_NAME || 'dk1-sumd01-node-05',
      tslgClientVersion: process.env.TSLG_CLIENT_VERSION || '1.0.0',
      reconnectionDelay: parseInt(process.env.TSLG_RECONNECTION_DELAY_MS || '1000', 10),
      connectionTTL: parseInt(process.env.TSLG_CONNECTION_TTL_MS || '2000', 10),
      socketTimeout: parseInt(process.env.TSLG_SOCKET_TIMEOUT_MS || '10000', 10),
      maxBufferSize: parseInt(process.env.TSLG_MAX_BUFFER_SIZE || '1000', 10),
      enableTraceFields: process.env.TSLG_ENABLE_TRACE_FIELDS === 'true',
      consoleOutput: process.env.TSLG_CONSOLE_OUTPUT === 'true'
    };

    this.logger = LoggerFactory.createLogger(config);
  }

  info(message: string, event: string = 'Информация', additionalData: any = {}) {
    this.logger.info(message, event, additionalData);
  }

  warn(message: string, event: string = 'Предупреждение', additionalData: any = {}) {
    this.logger.warn(message, event, additionalData);
  }

  error(message: string, event: string = 'Ошибка', error: Error | null = null, additionalData: any = {}) {
    this.logger.error(message, event, error, additionalData);
  }

  sys(message: string, additionalData: any = {}) {
    this.logger.sys(message, additionalData);
  }

  getStatus() {
    return this.logger.getStatus();
  }

  onModuleDestroy() {
    this.logger.close();
  }
}