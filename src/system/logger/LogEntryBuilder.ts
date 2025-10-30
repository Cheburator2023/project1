import { v4 as uuidv4 } from 'uuid';
import { UserDataExtractor, UserData, UserFieldsMapping } from './UserDataExtractor';
import { CallerInfoExtractor } from './CallerInfoExtractor';
import { DataSanitizer } from './DataSanitizer';

interface LogEntryConfig {
  appName: string;
  risCode: string;
  projectCode: string;
  appType: string;
  envType: string;
  namespace?: string;
  podName?: string;
  podIp?: string;
  nodeName?: string;
  tslgClientVersion: string;
  enableUserData: boolean;
  sanitizeSensitiveData: boolean;
  enableFullContext: boolean;
  sanitizePercentage: number;
  userFieldsMapping?: UserFieldsMapping;
}

export class LogEntryBuilder {
  constructor(private config: LogEntryConfig) {}

  buildLogEntry(level: string, message: string, event: string, error: Error | null, additionalData: any) {
    const timestamp = new Date();
    const callerInfo = CallerInfoExtractor.getCallerInfo(additionalData);

    const sanitizedMessage = this.sanitizeMessage(message);

    const userData = this.extractAndSanitizeUserData(additionalData);
    const sanitizedData = this.config.sanitizeSensitiveData ?
      DataSanitizer.sanitizeData(additionalData, this.config.sanitizePercentage) : additionalData;

    const logText = this.createLogText(sanitizedMessage, userData, event);

    const logEntry: any = {
      "eventId": uuidv4(),
      "appName": this.config.appName,
      "level": level.toUpperCase(),
      "text": logText,
      "localTime": timestamp.toISOString(),
      "tslgClientVersion": this.config.tslgClientVersion,
      "risCode": this.config.risCode,
      "projectCode": this.config.projectCode,
      "appType": this.config.appType,
      "envType": this.config.envType,
      "PID": process.pid,
      "loggerName": callerInfo.loggerName || 'application',
      "threadName": `node-${process.pid}`,
      "event": event
    };

    this.addUserData(logEntry, userData);
    this.addKubernetesData(logEntry);
    this.addCallerInfo(logEntry, callerInfo);
    this.addErrorInfo(logEntry, error, additionalData);
    this.addAdditionalData(logEntry, sanitizedData);

    return logEntry;
  }

  private sanitizeMessage(message: string): string {
    if (typeof message !== 'string') return message;

    const jwtPattern = /eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/g;
    const matches = message.match(jwtPattern);

    if (matches) {
      let sanitizedMessage = message;
      matches.forEach(jwt => {
        sanitizedMessage = sanitizedMessage.replace(
          jwt,
          UserDataExtractor.sanitizeJwtToken(jwt, this.config.sanitizePercentage)
        );
      });
      return sanitizedMessage;
    }

    return message;
  }

  private extractAndSanitizeUserData(additionalData: any): UserData {
    if (!this.config.enableUserData) {
      return {};
    }

    let userData: UserData = {};

    if (additionalData.user && typeof additionalData.user === 'object') {
      userData = UserDataExtractor.extractUserDataFromPayload(additionalData.user, this.config.userFieldsMapping);
    } else if (additionalData.jwt || additionalData.token) {
      const token = additionalData.jwt || additionalData.token;
      if (typeof token === 'string') {
        userData = UserDataExtractor.extractFromToken(token, this.config.userFieldsMapping);
      }
    } else if (additionalData.userId || additionalData.username) {
      userData = {
        userId: additionalData.userId,
        username: additionalData.username,
        firstName: additionalData.firstName,
        lastName: additionalData.lastName
      };
    }

    return UserDataExtractor.sanitizeUserData(userData, this.config.sanitizePercentage);
  }

  private createLogText(message: string, userData: UserData, event: string): string {
    let text = typeof message === 'string' ? message : JSON.stringify(message, null, 2);

    if (this.config.enableUserData) {
      const userInfo = UserDataExtractor.getSanitizedUserInfo(userData);
      if (userInfo) {
        text = `[${userInfo}] ${text}`;
      }
    }

    if (event && event !== 'Информация' && this.config.enableFullContext) {
      text += ` | Событие: ${event}`;
    }

    return text;
  }

  private addUserData(logEntry: any, userData: UserData) {
    if (this.config.enableUserData && userData.userId) {
      logEntry.userId = userData.userId;
      if (userData.username) logEntry.username = userData.username;
      if (userData.firstName) logEntry.firstName = userData.firstName;
      if (userData.lastName) logEntry.lastName = userData.lastName;
      if (userData.email) logEntry.email = userData.email;
      if (userData.roles && userData.roles.length > 0) logEntry.userRoles = userData.roles;
      if (userData.groups && userData.groups.length > 0) logEntry.userGroups = userData.groups;
    }
  }

  private addKubernetesData(logEntry: any) {
    if (this.config.envType === 'K8S') {
      logEntry.namespace = this.config.namespace;
      logEntry.podName = this.config.podName;
      logEntry.tec = {
        "podIp": this.config.podIp,
        "nodeName": this.config.nodeName
      };
    }
  }

  private addCallerInfo(logEntry: any, callerInfo: any) {
    if (callerInfo.callerClass && callerInfo.callerClass !== 'unknown') {
      logEntry.callerClass = callerInfo.callerClass;
    }
    if (callerInfo.callerMethod && callerInfo.callerMethod !== 'anonymous') {
      logEntry.callerMethod = callerInfo.callerMethod;
    }
    if (callerInfo.callerLine) {
      logEntry.callerLine = callerInfo.callerLine;
    }
  }

  private addErrorInfo(logEntry: any, error: Error | null, additionalData: any) {
    if (error) {
      logEntry.errorMessage = error.message;
      logEntry.stack = this.cleanStack(error.stack);
      logEntry.errorType = error.constructor.name;

      if (additionalData.errorCode) {
        logEntry.errorCode = additionalData.errorCode;
      }
    }
  }

  private addAdditionalData(logEntry: any, sanitizedData: any) {
    const excludedFields = [
      'context', 'params', 'stack', 'errorMessage',
      'user', 'jwt', 'token', 'errorCode', 'httpStatus',
      'userId', 'username', 'firstName', 'lastName', 'email'
    ];

    Object.keys(sanitizedData).forEach(key => {
      if (!logEntry.hasOwnProperty(key) && !excludedFields.includes(key)) {
        logEntry[key] = sanitizedData[key];
      }
    });

    if (sanitizedData.params && Array.isArray(sanitizedData.params)) {
      sanitizedData.params.forEach((param: any, index: number) => {
        if (typeof param === 'string' && param.length > 0) {
          logEntry[`param${index}`] = param;
        }
      });
    }
  }

  private cleanStack(stack?: string): string {
    if (!stack) return '';
    return stack
      .split('\n')
      .slice(1)
      .map(line => line.trim())
      .join('\n');
  }
}