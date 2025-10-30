export abstract class LoggerInterface {
  abstract log(level: string, message: string, event?: string, error?: Error, additionalData?: any): void;
  abstract info(message: string, event?: string, additionalData?: any): void;
  abstract warn(message: string, event?: string, additionalData?: any): void;
  abstract error(message: string, event?: string, error?: Error, additionalData?: any): void;
  abstract sys(message: string, additionalData?: any): void;
  abstract close(): void;
  abstract getStatus(): any;
  abstract debug(message: string, event?: string, additionalData?: any): void;
  abstract verbose(message: string, event?: string, additionalData?: any): void;
}