import { Injectable } from '@nestjs/common'
import { ModelsService } from 'src/modules/models/models.service'
import { Model as AppModel } from 'src/modules/models/interfaces'
import { Task } from 'src/modules/tasks/interfaces'
import { UsersTasksService } from 'src/modules/tasks/services/users-tasks.service'
import { MODEL_STATUS } from 'src/system/common/constants'
import { BiDatamartService, TasksDatamartService } from 'src/modules/bi-datamart'
import { MrmDatabaseService } from 'src/system/mrm-database/database.service'

@Injectable()
export class DataAggregator {
  constructor(
    private readonly modelsService: ModelsService,
    private readonly biDatamartService: BiDatamartService,
    private readonly tasksDatamartService: TasksDatamartService,
    private readonly mrmDatabaseService: MrmDatabaseService,
    private readonly usersTasksService: UsersTasksService
  ) {}

  async aggregateData(streams: string[], useDatamart: boolean): Promise<any> {
    const models = await this.getModels(useDatamart)

    const modelsWithoutInvalidStatuses = this.filterModelsForMetrics(models)

    const tasks = await this.getTasks(modelsWithoutInvalidStatuses, useDatamart)

    const filteredModels = this.filterByStreams(modelsWithoutInvalidStatuses, streams, 'ds_stream')
    const filteredTasks = this.filterByStreamsTasks(tasks, streams, 'ds_stream')

    return {
      models: filteredModels,
      tasks: filteredTasks
    }
  }

  private async getModels(useDatamart: boolean): Promise<AppModel[]> {
    if (useDatamart) {
      return await this.getModelsFromDatamart()
    }
    return await this.modelsService.getModels({ ignoreModeFilter: true })
  }

  private async getTasks(models: any[], useDatamart: boolean): Promise<Task[]> {
    if (useDatamart) {
      return await this.getTasksFromDatamart()
    }
    return await this.usersTasksService.getUsersActiveTasks(models);
  }

  private filterByStreams<T extends Record<string, any>>(
    items: T[],
    values: string[],
    key: keyof T
  ): T[] {
    // Добавляем проверку на undefined
    if (!values || values.length === 0) {
      return items; // Возвращаем все элементы, если фильтр не задан
    }

    return items.filter((item) => values.includes(item[key]))
  }

  /**
   * Получение моделей из BI витрины
   */
  private async getModelsFromDatamart(): Promise<any[]> {
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
      return await this.modelsService.getModels({ ignoreModeFilter: true })
    }
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

  private filterByStreamsTasks<T extends Record<string, any>>(
    items: T[],
    values: string[],
    key: keyof T
  ): T[] {
    // Добавляем проверку на undefined
    if (!values || values.length === 0) {
      return items; // Возвращаем все элементы, если фильтр не задан
    }
    
    return items.filter((item) => {
      const streams = item[key]?.split(',').map((stream) => stream.trim());
      return streams?.some((stream) => values.includes(stream));
    });
  }

  private filterModelsForMetrics(models: AppModel[]): AppModel[] {
    return models.filter((model) => 
      model.business_status !== MODEL_STATUS.CREATION_ERROR &&
      model.business_status !== MODEL_STATUS.PENDING_DELETE
    )
  }
}