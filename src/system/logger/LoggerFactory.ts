import { LoggerInterface } from './LoggerInterface';
import { TSLGLogger } from './TSLGLogger';

export class LoggerFactory {
  static createLogger(config: any = {}): LoggerInterface {
    return new TSLGLogger(config);
  }
}