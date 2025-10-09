export interface UserData {
  userId?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  roles?: string[];
  groups?: string[];
}

export interface UserFieldsMapping {
  userId?: string;
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
}

export class UserDataExtractor {
  static extractFromToken(token: string, fieldsMapping?: UserFieldsMapping): UserData {
    if (!token || typeof token !== 'string' || token.length < 100) {
      return {};
    }

    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return {};
      }

      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      return this.extractUserDataFromPayload(payload, fieldsMapping);
    } catch (error) {
      return {};
    }
  }

  static extractUserDataFromPayload(payload: any, fieldsMapping?: UserFieldsMapping): UserData {
    const userData: UserData = {};

    const mapping = fieldsMapping || {
      userId: 'sub',
      username: 'preferred_username',
      email: 'email',
      firstName: 'given_name',
      lastName: 'family_name'
    };

    userData.userId = this.getNestedValue(payload, mapping.userId || 'sub');
    userData.username = this.getNestedValue(payload, mapping.username || 'preferred_username');
    userData.email = this.getNestedValue(payload, mapping.email || 'email');
    userData.firstName = this.getNestedValue(payload, mapping.firstName || 'given_name');
    userData.lastName = this.getNestedValue(payload, mapping.lastName || 'family_name');

    if ((!userData.firstName || !userData.lastName) && payload.name) {
      const nameParts = payload.name.split(' ');
      if (nameParts.length >= 2) {
        userData.firstName = nameParts[0];
        userData.lastName = nameParts.slice(1).join(' ');
      } else if (nameParts.length === 1) {
        userData.firstName = nameParts[0];
      }
    }

    if (payload.roles && Array.isArray(payload.roles)) {
      userData.roles = payload.roles;
    } else if (payload.realm_access && payload.realm_access.roles) {
      userData.roles = payload.realm_access.roles;
    }

    if (payload.groups && Array.isArray(payload.groups)) {
      userData.groups = payload.groups;
    }

    return userData;
  }

  private static getNestedValue(obj: any, path: string): any {
    if (!path) return undefined;

    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  static sanitizeUserData(userData: UserData, sanitizePercentage: number = 60): UserData {
    const sanitized: UserData = { ...userData };

    const sanitizeString = (str: string | undefined, percentage: number): string | undefined => {
      if (!str || str.length <= 3) return str;

      const charsToKeep = Math.max(1, Math.floor(str.length * (percentage / 100)));
      const visiblePart = str.substring(0, charsToKeep);
      const hiddenPart = '*'.repeat(Math.max(0, str.length - charsToKeep));

      return visiblePart + hiddenPart;
    };

    sanitized.userId = sanitizeString(sanitized.userId, sanitizePercentage);
    sanitized.username = sanitizeString(sanitized.username, sanitizePercentage);
    sanitized.firstName = sanitizeString(sanitized.firstName, sanitizePercentage);
    sanitized.lastName = sanitizeString(sanitized.lastName, sanitizePercentage);

    if (sanitized.email) {
      const [localPart, domain] = sanitized.email.split('@');
      if (localPart && domain) {
        const sanitizedLocal = sanitizeString(localPart, sanitizePercentage) || localPart;
        sanitized.email = `${sanitizedLocal}@${domain}`;
      }
    }

    return sanitized;
  }

  static getSanitizedUserInfo(userData: UserData): string {
    const parts: string[] = [];

    if (userData.userId) {
      parts.push(`userId: ${userData.userId}`);
    }

    if (userData.username) {
      parts.push(`user: ${userData.username}`);
    }

    if (userData.firstName && userData.lastName) {
      parts.push(`name: ${userData.firstName} ${userData.lastName}`);
    } else if (userData.firstName) {
      parts.push(`firstName: ${userData.firstName}`);
    } else if (userData.lastName) {
      parts.push(`lastName: ${userData.lastName}`);
    }

    return parts.length > 0 ? parts.join(' | ') : '';
  }

  static sanitizeJwtToken(token: string, sanitizePercentage: number = 60): string {
    if (!token || token.length < 100) return token;

    try {
      const parts = token.split('.');
      if (parts.length !== 3) return this.sanitizeString(token, sanitizePercentage);

      const header = parts[0];
      const payloadStart = parts[1].substring(0, 10);
      const signatureStart = parts[2].substring(0, 10);

      return `${header}.${payloadStart}...${signatureStart}... [SANITIZED]`;
    } catch (error) {
      return this.sanitizeString(token, sanitizePercentage);
    }
  }

  private static sanitizeString(str: string, percentage: number): string {
    const charsToKeep = Math.max(1, Math.floor(str.length * (percentage / 100)));
    const visiblePart = str.substring(0, charsToKeep);
    const hiddenPart = '*'.repeat(Math.max(0, str.length - charsToKeep));
    return visiblePart + hiddenPart;
  }
}