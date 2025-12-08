import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { HttpService } from '@nestjs/axios'
import { firstValueFrom } from 'rxjs'
import * as FormData from 'form-data'
import { TokenRequestDto, IntrospectRequestDto, TokenResponseDto } from '../dto/auth.dto'

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)
  private readonly keycloakUrl: string
  private readonly keycloakRealm: string

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService
  ) {
    this.keycloakUrl = this.configService.get<string>('KEYCLOAK_URL') || ''
    this.keycloakRealm = this.configService.get<string>('KEYCLOAK_REALMS') || 'test-cym'
  }

  async getToken(request: TokenRequestDto): Promise<TokenResponseDto> {
    const formData = new FormData()
    formData.append('grant_type', request.grant_type)
    formData.append('client_id', request.client_id)

    if (request.client_secret && request.client_secret.trim() !== '') {
      formData.append('client_secret', request.client_secret)
    }

    formData.append('username', request.username)
    formData.append('password', request.password)

    if (request.scope) {
      formData.append('scope', request.scope)
    }

    const url = `${this.keycloakUrl}realms/${this.keycloakRealm}/protocol/openid-connect/token`

    try {
      const response = await firstValueFrom(
        this.httpService.post(url, formData, {
          headers: {
            ...formData.getHeaders(),
          },
        })
      )

      return response.data
    } catch (error) {
      this.logger.error(`Ошибка получения токена: ${error.message}`, error.stack)
      throw error
    }
  }

  async refreshToken(request: any): Promise<TokenResponseDto> {
    const formData = new FormData()
    formData.append('grant_type', 'refresh_token')
    formData.append('client_id', request.client_id)

    if (request.client_secret && request.client_secret.trim() !== '') {
      formData.append('client_secret', request.client_secret)
    }

    formData.append('refresh_token', request.refresh_token)

    const url = `${this.keycloakUrl}realms/${this.keycloakRealm}/protocol/openid-connect/token`

    try {
      const response = await firstValueFrom(
        this.httpService.post(url, formData, {
          headers: {
            ...formData.getHeaders(),
          },
        })
      )

      return response.data
    } catch (error) {
      this.logger.error(`Ошибка обновления токена: ${error.message}`, error.stack)
      throw error
    }
  }

  async introspectToken(request: IntrospectRequestDto): Promise<any> {
    const formData = new FormData()
    formData.append('token', request.token)
    formData.append('client_id', request.client_id)

    if (request.client_secret && request.client_secret.trim() !== '') {
      formData.append('client_secret', request.client_secret)
    }

    const url = `${this.keycloakUrl}realms/${this.keycloakRealm}/protocol/openid-connect/token/introspect`

    try {
      const response = await firstValueFrom(
        this.httpService.post(url, formData, {
          headers: {
            ...formData.getHeaders(),
          },
        })
      )

      const introspectData = response.data

      return {
        active: introspectData.active || false,
        exp: introspectData.exp || null,
        iat: introspectData.iat || null,
        sub: introspectData.sub || '',
        username: introspectData.preferred_username || introspectData.sub || '',
        email: introspectData.email || '',
        roles: introspectData.realm_access?.roles || [],
        groups: introspectData.groups || []
      }
    } catch (error) {
      this.logger.error(`Ошибка интроспекции токена: ${error.message}`, error.stack)
      throw error
    }
  }

  async validateToken(token: string): Promise<boolean> {
    try {
      const introspectData = await this.introspectToken({
        token,
        client_id: 'frontend',
        client_secret: ''
      })

      return introspectData.active === true
    } catch (error) {
      this.logger.error(`Ошибка валидации токена: ${error.message}`, error.stack)
      return false
    }
  }
}