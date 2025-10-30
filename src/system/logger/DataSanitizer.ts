import { UserDataExtractor } from './UserDataExtractor';

export class DataSanitizer {
  static sanitizeData(data: any, sanitizePercentage: number = 60): any {
    if (!data || typeof data !== 'object') return data || {};

    const sensitiveFields = [
      'password', 'token', 'jwt', 'accessToken', 'refreshToken', 'authorization',
      'secret', 'apiKey', 'credentials', 'privateKey', 'certificate', 'signature',
      'bearer', 'auth', 'authentication', 'pwd', 'pass', 'key'
    ];

    const sensitivePatterns = [
      /eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/g, // JWT tokens
    ];

    const sanitized = JSON.parse(JSON.stringify(data));
    this.sanitizeRecursive(sanitized, sensitiveFields, sensitivePatterns, sanitizePercentage);
    return sanitized;
  }

  private static sanitizeRecursive(
    obj: any,
    sensitiveFields: string[],
    sensitivePatterns: RegExp[],
    sanitizePercentage: number
  ) {
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        if (sensitiveFields.includes(key.toLowerCase())) {
          if ((key.toLowerCase().includes('token') || key.toLowerCase().includes('jwt')) &&
            typeof obj[key] === 'string' && obj[key].length > 100) {
            obj[key] = UserDataExtractor.sanitizeJwtToken(obj[key], sanitizePercentage);
          } else if (typeof obj[key] === 'string') {
            obj[key] = this.sanitizeString(obj[key], sanitizePercentage);
          } else {
            obj[key] = '*****';
          }
        } else if (typeof obj[key] === 'string') {
          obj[key] = this.sanitizeSensitivePatterns(obj[key], sensitivePatterns, sanitizePercentage);
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          this.sanitizeRecursive(obj[key], sensitiveFields, sensitivePatterns, sanitizePercentage);
        }
      }
    }
  }

  private static sanitizeSensitivePatterns(value: string, patterns: RegExp[], sanitizePercentage: number): string {
    let result = value;
    patterns.forEach(pattern => {
      const matches = result.match(pattern);
      if (matches) {
        matches.forEach(match => {
          result = result.replace(match, UserDataExtractor.sanitizeJwtToken(match, sanitizePercentage));
        });
      }
    });
    return result;
  }

  private static sanitizeString(str: string, percentage: number): string {
    if (str.length <= 3) return str;
    const charsToKeep = Math.max(1, Math.floor(str.length * (percentage / 100)));
    const visiblePart = str.substring(0, charsToKeep);
    const hiddenPart = '*'.repeat(Math.max(0, str.length - charsToKeep));
    return visiblePart + hiddenPart;
  }
}