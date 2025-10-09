export class DataSanitizer {
  static sanitizeData(data: any, sanitizePercentage: number = 60): any {
    if (!data || typeof data !== 'object') return {};

    const sensitiveFields = [
      'password', 'token', 'jwt', 'accessToken', 'refreshToken', 'authorization',
      'secret', 'apiKey', 'credentials', 'privateKey', 'certificate', 'signature',
      'bearer', 'auth', 'authentication', 'pwd', 'pass', 'key'
    ];

    const sanitized = JSON.parse(JSON.stringify(data));
    this.sanitizeRecursive(sanitized, sensitiveFields, sanitizePercentage);
    return sanitized;
  }

  private static sanitizeRecursive(obj: any, sensitiveFields: string[], sanitizePercentage: number) {
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        if (sensitiveFields.includes(key.toLowerCase())) {
          if (typeof obj[key] === 'string') {
            obj[key] = this.sanitizeString(obj[key], sanitizePercentage);
          } else {
            obj[key] = '*****';
          }
        } else if (typeof obj[key] === 'string') {
          obj[key] = this.sanitizeSensitivePatterns(obj[key], sanitizePercentage);
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          this.sanitizeRecursive(obj[key], sensitiveFields, sanitizePercentage);
        }
      }
    }
  }

  private static sanitizeString(str: string, percentage: number): string {
    const charsToKeep = Math.floor(str.length * (percentage / 100));
    const visiblePart = str.substring(0, charsToKeep);
    const hiddenPart = '*'.repeat(str.length - charsToKeep);
    return visiblePart + hiddenPart;
  }

  private static sanitizeSensitivePatterns(value: string, sanitizePercentage: number): string {
    const patterns = [
      /eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/g, // JWT tokens
      /[A-Za-z0-9+/]{40,}={0,2}/g, // Base64-like strings
    ];

    let result = value;
    patterns.forEach(pattern => {
      const matches = result.match(pattern);
      if (matches) {
        matches.forEach(match => {
          result = result.replace(match, this.sanitizeString(match, sanitizePercentage));
        });
      }
    });

    return result;
  }
}