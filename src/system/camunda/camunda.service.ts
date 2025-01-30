import { Injectable } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { ConfigService } from '@nestjs/config'
import { firstValueFrom } from 'rxjs'
import { ICamundaService } from './interfaces'
import { CamundaTask } from './entities'

@Injectable()
export class CamundaService implements ICamundaService {
  private readonly baseUrl: string
  private readonly authorizationHeader: string

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService
  ) {
    const user = this.configService.get<string>('BPMN_USER', 'demo')
    const pwd = this.configService.get<string>('BPMN_PWD', 'demo')
    this.baseUrl = this.configService.get<string>(
      'BPMN_API',
      `${process.env.BPMN_API}`
    )
    this.authorizationHeader = `Basic ${ Buffer.from(`${ user }:${ pwd }`).toString('base64') }`
  }

  /**
   * Make an HTTP request to Camunda API with preconfigured headers.
   * @param method - HTTP method (GET, POST, etc.).
   * @param endpoint - API endpoint relative to the base URL.
   * @param params - Optional query parameters.
   * @param data - Optional request body.
   * @returns A promise that resolves to the response data.
   */
  private async makeRequest<T>(
    method: 'get' | 'post' | 'put' | 'delete',
    endpoint: string,
    params?: Record<string, any>,
    data?: Record<string, any>
  ): Promise<T> {
    const url = `${ this.baseUrl }/${ endpoint }`
    try {
      const response = await firstValueFrom(
        this.httpService.request<T>({
          method,
          url,
          headers: { Authorization: this.authorizationHeader },
          params,
          data
        })
      )

      return response.data
    } catch (error) {
      console.error('Request error:', error)
      throw new Error(
        `Failed to make ${ method.toUpperCase() } request to ${ url }: ${ error.message }`
      )
    }
  }

  /**
   * Get tasks by groups from Camunda.
   * @param groups - Optional array of group IDs.
   * @returns A promise that resolves to the list of tasks.
   */
  async getTasksByGroups(groups?: string[]): Promise<CamundaTask[]> {
    const params: Record<string, any> = {}
    if (groups && groups.length > 0) {
      params.candidateGroup = groups.join(',')
    }

    try {
      const tasks = await this.makeRequest<any[]>(
        'get',
        'task',
        params
      )
      return tasks
    } catch (error) {
      throw new Error(`Failed to fetch tasks by groups: ${ error.message }`)
    }
  }
}
