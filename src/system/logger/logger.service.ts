import { Injectable, OnModuleDestroy, LoggerService as NestLoggerService } from '@nestjs/common';
import { LoggerFactory } from './LoggerFactory';

@Injectable()
export class LoggerService implements NestLoggerService, OnModuleDestroy {
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
      connectionTTL: parseInt(process.env.TSLG_CONNECTION_TTL_MS || '0', 10),
      socketTimeout: parseInt(process.env.TSLG_SOCKET_TIMEOUT_MS || '10000', 10),
      maxBufferSize: parseInt(process.env.TSLG_MAX_BUFFER_SIZE || '1000', 10),
      enableTraceFields: process.env.TSLG_ENABLE_TRACE_FIELDS === 'true',
      consoleOutput: process.env.TSLG_CONSOLE_OUTPUT === 'true' || process.env.NODE_ENV !== 'production',
      debugJson: process.env.DEBUG_JSON === 'true',
      enableUserData: process.env.TSLG_ENABLE_USER_DATA === 'true',
      sanitizeSensitiveData: process.env.TSLG_SANITIZE_SENSITIVE_DATA !== 'false'
    };

    this.logger = LoggerFactory.createLogger(config);
  }

  log(message: any, ...optionalParams: any[]) {
    this.logger.info(message, 'Информация', this.parseOptionalParams(optionalParams));
  }

  error(message: any, ...optionalParams: any[]) {
    let error: Error | null = null;
    let additionalData: any = {};

    if (optionalParams.length > 0) {
      const firstParam = optionalParams[0];
      if (firstParam instanceof Error) {
        error = firstParam;
        additionalData = this.parseOptionalParams(optionalParams.slice(1));
      } else if (typeof firstParam === 'string') {
        additionalData = { context: firstParam, ...this.parseOptionalParams(optionalParams.slice(1)) };
      } else {
        additionalData = this.parseOptionalParams(optionalParams);
      }
    }

    this.logger.error(message, 'Ошибка', error, additionalData);
  }

  warn(message: any, ...optionalParams: any[]) {
    this.logger.warn(message, 'Предупреждение', this.parseOptionalParams(optionalParams));
  }

  debug(message: any, ...optionalParams: any[]) {
    this.logger.debug(message, 'Отладка', this.parseOptionalParams(optionalParams));
  }

  verbose(message: any, ...optionalParams: any[]) {
    this.logger.verbose(message, 'Подробно', this.parseOptionalParams(optionalParams));
  }

  private parseOptionalParams(optionalParams: any[]): any {
    if (optionalParams.length === 0) {
      return {};
    }

    if (optionalParams.length === 1 && typeof optionalParams[0] === 'object' && !Array.isArray(optionalParams[0])) {
      return optionalParams[0];
    }

    return { params: optionalParams };
  }

  info(message: string, event: string = 'Информация', additionalData: any = {}) {
    this.logger.info(message, event, additionalData);
  }

  warnMessage(message: string, event: string = 'Предупреждение', additionalData: any = {}) {
    this.logger.warn(message, event, additionalData);
  }

  errorMessage(message: string, event: string = 'Ошибка', error: Error | null = null, additionalData: any = {}) {
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