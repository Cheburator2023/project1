import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { HttpService } from '@nestjs/axios'
import { firstValueFrom } from 'rxjs'
import * as FormData from 'form-data'
import { TokenRequestDto, IntrospectRequestDto, TokenResponseDto } from '../dto/auth.dto'
import { ErrorHandlerService } from 'src/common/services/error-handler.service'

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)
  private readonly keycloakUrl: string
  private readonly keycloakRealm: string

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly errorHandler: ErrorHandlerService
  ) {
    this.keycloakUrl = this.configService.get<string>('KEYCLOAK_URL') || ''
    this.keycloakRealm = this.configService.get<string>('KEYCLOAK_REALMS') || 'test-cym'
  }

  async getToken(request: TokenRequestDto): Promise<TokenResponseDto> {
    try {
      const formData = this.createFormData({
        grant_type: request.grant_type,
        client_id: request.client_id,
        client_secret: request.client_secret,
        username: request.username,
        password: request.password,
        scope: request.scope
      })

      const url = this.buildTokenUrl()
      const response = await this.makeKeycloakRequest(url, formData)

      return response.data
    } catch (error) {
      this.logger.error(`Ошибка получения токена: ${error.message}`, error.stack)
      throw this.errorHandler.handleError(error)
    }
  }

  async refreshToken(request: any): Promise<TokenResponseDto> {
    try {
      const formData = this.createFormData({
        grant_type: 'refresh_token',
        client_id: request.client_id,
        client_secret: request.client_secret,
        refresh_token: request.refresh_token
      })

      const url = this.buildTokenUrl()
      const response = await this.makeKeycloakRequest(url, formData)

      return response.data
    } catch (error) {
      this.logger.error(`Ошибка обновления токена: ${error.message}`, error.stack)
      throw this.errorHandler.handleError(error)
    }
  }

  async introspectToken(request: IntrospectRequestDto): Promise<any> {
    try {
      const formData = this.createFormData({
        token: request.token,
        client_id: request.client_id,
        client_secret: request.client_secret
      })

      const url = `${this.keycloakUrl}realms/${this.keycloakRealm}/protocol/openid-connect/token/introspect`
      const response = await this.makeKeycloakRequest(url, formData)

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
      throw this.errorHandler.handleError(error)
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

  private createFormData(data: Record<string, any>): FormData {
    const formData = new FormData()

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        formData.append(key, value)
      }
    })

    return formData
  }

  private buildTokenUrl(): string {
    return `${this.keycloakUrl}realms/${this.keycloakRealm}/protocol/openid-connect/token`
  }

  private async makeKeycloakRequest(url: string, formData: FormData): Promise<any> {
    return firstValueFrom(
      this.httpService.post(url, formData, {
        headers: {
          ...formData.getHeaders(),
        },
        timeout: 5000
      })
    )
  }
}
