import { Injectable } from '@nestjs/common'
import {
  KeycloakConnectOptions,
  KeycloakConnectOptionsFactory,
  TokenValidation
} from 'nest-keycloak-connect'

@Injectable()
export class KeycloakConfigService implements KeycloakConnectOptionsFactory {
  createKeycloakConnectOptions():
    | Promise<KeycloakConnectOptions>
    | KeycloakConnectOptions {
    return {
      authServerUrl: process.env.KEYCLOAK_URL,
      realm: process.env.KEYCLOAK_REALMS,
      resource: process.env.KEYCLOAK_CLIENT,
      tokenValidation: TokenValidation.OFFLINE,
      secret: ''
    }
  }
}
