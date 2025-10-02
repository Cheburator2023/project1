import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { LoggerFactory } from './LoggerFactory';

@Injectable()
export class LoggerService implements OnModuleDestroy {
  private logger;

  constructor() {
    const config = {
      host: process.env.TSLG_AGENT_HOST,
      port: parseInt(process.env.TSLG_AGENT_PORT || '5170', 10),
      appName: process.env.APP_NAME || 'surm-backend',
      projectCode: process.env.PROJECT_CODE || 'SURM',
      risCode: process.env.RIS_CODE || '1404',
      namespace: process.env.KUBERNETES_NAMESPACE || 'local-dev',
      podName: process.env.POD_NAME || 'localhost',
      podIp: process.env.POD_IP || '127.0.0.1',
      nodeName: process.env.NODE_NAME || 'local-machine',
      tslgClientVersion: process.env.TSLG_CLIENT_VERSION || '1.0.0'
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