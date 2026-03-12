import { Injectable } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { ConfigService } from '@nestjs/config'
import { firstValueFrom } from 'rxjs'
import { ICamundaService } from './interfaces'
import {
  CamundaTask,
  CamundaProcessInstance,
  CamundaProcessDefinition
} from './entities'
import * as querystring from 'querystring'

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
    this.authorizationHeader = `Basic ${Buffer.from(`${user}:${pwd}`).toString(
      'base64'
    )}`
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
    const url = `${this.baseUrl}/${endpoint}`
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
        `Failed to make ${method.toUpperCase()} request to ${url}: ${
          error.message
        }`
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
      const tasks = await this.makeRequest<any[]>('get', 'task', params)
      return tasks
    } catch (error) {
      throw new Error(`Failed to fetch tasks by groups: ${error.message}`)
    }
  }

  async tasks(groups: string[] = ['mipm']): Promise<CamundaTask[]> {
    const queryParams = querystring.stringify({
      candidateGroups: groups.join(','),
      includeAssignedTasks: true
    })

    try {
      return await this.makeRequest<CamundaTask[]>('get', `task?${queryParams}`)
    } catch (error) {
      throw new Error(`Failed to fetch tasks: ${error.message}`)
    }
  }

  /**
   * Retrieves a list of process instances by model ID in it's variables.
   * @param modelId
   * @returns A promise that resolves to an array of CamundaProcessInstance objects.
   */
  async getProcessInstancesByModel(
    modelId: string
  ): Promise<CamundaProcessInstance[]> {
    const params: Record<string, any> = {}
    params.variables = `model_eq_${modelId}`

    try {
      const processInstances = await this.makeRequest<any[]>(
        'get',
        'process-instance',
        params
      )
      return processInstances
    } catch (error) {
      throw new Error(
        `Failed to fetch process instances by model: ${error.message}`
      )
    }
  }

  /**
   * Retrieves a process definition according to the ProcessDefinition interface in the engine.
   * @param processDefinitionId
   * @returns A promise that resolves to a CamundaProcessDefinition object.
   */
  async getProcessDefinitionById(
    processDefinitionId: string
  ): Promise<CamundaProcessDefinition> {
    try {
      const processDefinition = await this.makeRequest<any>(
        'get',
        `process-definition/${processDefinitionId}`
      )
      return processDefinition
    } catch (error) {
      throw new Error(
        `Failed to fetch process definition by id: ${error.message}`
      )
    }
  }
}
