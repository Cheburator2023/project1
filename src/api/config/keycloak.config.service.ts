import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import {
  KeycloakConnectOptions,
  KeycloakConnectOptionsFactory,
  TokenValidation
} from 'nest-keycloak-connect'

@Injectable()
export class KeycloakConfigService implements KeycloakConnectOptionsFactory {
  constructor(private readonly configService: ConfigService) {}

  createKeycloakConnectOptions():
    | Promise<KeycloakConnectOptions>
    | KeycloakConnectOptions {
    if (this.configService.get<string>('NODE_ENV') === 'development') {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
    }

    const keycloakUrl = this.getRequiredConfig('KEYCLOAK_URL')
    const realm = this.getRequiredConfig('KEYCLOAK_REALMS')
    const clientId = this.getRequiredConfig('KEYCLOAK_CLIENT')
    const secret = this.getRequiredConfig('KEYCLOAK_SECRET')

    return {
      authServerUrl: keycloakUrl,
      realm: realm,
      clientId: clientId,
      secret: secret,
      tokenValidation: TokenValidation.OFFLINE,
      bearerOnly: true
    }
  }

  private getRequiredConfig(key: string): string {
    const value = this.configService.get<string>(key)
    if (!value) {
      throw new Error(`Missing required environment variable: ${key}`)
    }
    return value
  }
}
