import { Injectable } from '@nestjs/common'
import * as NodeCache from 'node-cache'
import { ModelsService } from 'src/modules/models/models.service'
import { BiDatamartService } from 'src/modules/bi-datamart/bi-datamart.service'
import { TasksDatamartService } from 'src/modules/bi-datamart/tasks-datamart.service'
import { MrmDatabaseService } from 'src/system/mrm-database/database.service'
import { Model, Task } from 'src/modules/tasks/interfaces'
import { UsersTasksService } from 'src/modules/tasks/services/users-tasks.service'

@Injectable()
export class DataAggregator {
  private readonly cache: NodeCache

  constructor(
    private readonly modelsService: ModelsService,
    private readonly biDatamartService: BiDatamartService,
    private readonly tasksDatamartService: TasksDatamartService,
    private readonly mrmDatabaseService: MrmDatabaseService,
    private readonly usersTasksService: UsersTasksService
  ) {
    this.cache = new NodeCache({ stdTTL: 300 }) // Кэш на 5 минут
  }

  async aggregateData(streams: string[], mode, useDatamart: boolean = false): Promise<any> {
    const models = await this.getCachedModels(mode, useDatamart)
    const tasks = await this.getCachedTasks(models, useDatamart)

    const filteredModels = this.filterByStreams(models, streams, 'ds_stream')
    const filteredTasks = this.filterByStreamsTasks(tasks, streams, 'ds_stream')

    return {
      models: filteredModels,
      tasks: filteredTasks
    }
  }

  private async getCachedModels(mode, useDatamart: boolean = false): Promise<any[]> {
    const cacheKey = useDatamart ? `models_datamart_${mode}` : `models_${mode}`
    const cachedModels = this.cache.get<Model[]>(cacheKey)

    if (cachedModels) return cachedModels

    const models = useDatamart 
      ? await this.getModelsFromDatamart(mode)
      : await this.modelsService.getModels({ mode })
    
    this.cache.set(cacheKey, models)
    return models
  }

  /**
   * Получение моделей из BI витрины
   */
  private async getModelsFromDatamart(mode): Promise<any[]> {
    try {
      // Запрос к витрине с учётом mode фильтров
      const query = `
        SELECT 
          system_model_id,
          model_data,
          created_at,
          updated_at
        FROM models_bi_datamart 
        ORDER BY system_model_id
      `
      
      const rows = await this.mrmDatabaseService.query(query, {})
      
      // Преобразуем данные из витрины в нужный формат
      const models = rows.map(row => {
        const modelData = typeof row.model_data === 'string' 
          ? JSON.parse(row.model_data) 
          : row.model_data
        
        return {
          ...modelData,
          // Добавляем метаданные из витрины
          _datamart_created_at: row.created_at,
          _datamart_updated_at: row.updated_at
        }
      })

      return models
      
    } catch (error) {
      // Fallback на обычный сервис
      return await this.modelsService.getModels({ mode })
    }
  }

  private async getCachedTasks(models: Model[], useDatamart: boolean = false): Promise<Task[]> {
    const cacheKey = useDatamart ? 'tasks_datamart' : 'tasks'
    const cachedTasks = this.cache.get<Task[]>(cacheKey)

    if (cachedTasks) return cachedTasks

    const tasks = useDatamart
      ? await this.getTasksFromDatamart()
      : await this.usersTasksService.getUsersActiveTasks(models);
    
    this.cache.set(cacheKey, tasks)
    return tasks
  }

  /**
   * Получение задач из BI витрины
   */
  private async getTasksFromDatamart(): Promise<Task[]> {
    try {
      return await this.tasksDatamartService.getTasksFromDatamart()
    } catch (error) {
      // Fallback на обычный сервис
      const models = await this.modelsService.getModels({ ignoreModeFilter: true })
      return await this.usersTasksService.getUsersActiveTasks(models as any)
    }
  }

  private filterByStreams<T extends Record<string, any>>(
    items: T[],
    values: string[],
    key: keyof T
  ): T[] {

    return items.filter((item) => values.includes(item[key]))
  }

  private filterByStreamsTasks<T extends Record<string, any>>(
    items: T[],
    values: string[],
    key: keyof T
  ): T[] {
    return items.filter((item) => {
      const streams = item[key]?.split(',').map((stream) => stream.trim());
      return streams?.some((stream) => values.includes(stream));
    });
  }
}


