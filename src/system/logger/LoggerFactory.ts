import { LoggerInterface } from './LoggerInterface';
import { ConsoleLogger } from './ConsoleLogger';
import { ProductionLogger } from './ProductionLogger';

export class LoggerFactory {
  static createLogger(config: any = {}): LoggerInterface {
    const isProduction = process.env.NODE_ENV === 'production';

    if (isProduction) {
      return new ProductionLogger(config);
    }

    return new ConsoleLogger();
  }
}