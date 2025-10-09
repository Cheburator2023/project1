interface CallerInfo {
  callerClass?: string;
  callerMethod?: string;
  callerLine?: number;
  callerFile?: string;
  loggerName?: string;
}

export class CallerInfoExtractor {
  static getCallerInfo(additionalData: any): CallerInfo {
    if (additionalData.context && typeof additionalData.context === 'string') {
      if (!additionalData.context.includes('\n    at ')) {
        return {
          loggerName: additionalData.context
        };
      }
    }

    const error = {} as any;
    Error.captureStackTrace(error);

    const stackLines = error.stack.split('\n');

    for (let i = 4; i < stackLines.length; i++) {
      const line = stackLines[i];
      const match = line.match(/at\s+(.+)\s+\((.+):(\d+):(\d+)\)/) ||
        line.match(/at\s+(.+):(\d+):(\d+)/);

      if (match) {
        let className = 'unknown';
        let methodName = 'anonymous';

        if (match[1] && match[1] !== 'Object.<anonymous>') {
          const parts = match[1].split('.');
          if (parts.length > 1) {
            className = parts[parts.length - 2] || 'unknown';
            methodName = parts[parts.length - 1];
          } else {
            methodName = parts[0];
          }
        }

        if (match[2] && !match[2].includes('node_modules') && !match[2].includes('internal/')) {
          const fileName = match[2].split('/').pop() || match[2];
          return {
            loggerName: className,
            callerClass: fileName.replace('.ts', '').replace('.js', ''),
            callerMethod: methodName,
            callerLine: parseInt(match[3], 10),
            callerFile: fileName
          };
        }
      }
    }

    return { loggerName: 'application' };
  }
}