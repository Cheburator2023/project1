import { LoggerInterface } from './LoggerInterface';
import { ConsoleLogger } from './ConsoleLogger';
import { ProductionLogger } from './ProductionLogger';

export class LoggerFactory {
  static createLogger(config: any = {}): LoggerInterface {
    const isProduction = process.env.NODE_ENV === 'production';
    const isDevelopment = process.env.NODE_ENV === 'develop' || process.env.NODE_ENV === 'development';

    if (isDevelopment) {
      return new ConsoleLogger(config);
    }

    if (isProduction) {
      return new ProductionLogger(config);
    }

    return new ConsoleLogger(config);
  }
}