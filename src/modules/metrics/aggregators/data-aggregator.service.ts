import { Injectable } from '@nestjs/common'
import * as NodeCache from 'node-cache'
import { ModelsService } from 'src/modules/models/models.service'
import { Model as AppModel } from 'src/modules/models/interfaces'
import { Task } from 'src/modules/tasks/interfaces'
import { UsersTasksService } from 'src/modules/tasks/services/users-tasks.service'
import { MODEL_STATUS } from 'src/system/common/constants'

@Injectable()
export class DataAggregator {
  private readonly cache: NodeCache

  constructor(
    private readonly modelsService: ModelsService,
    private readonly usersTasksService: UsersTasksService
  ) {
    this.cache = new NodeCache({ stdTTL: 300 }) // Кэш на 5 минут
  }

  async aggregateData(streams: string[]): Promise<any> {
    const models = await this.getCachedModels()

    const modelsWithoutInvalidStatuses = this.filterModelsForMetrics(models)

    const tasks = await this.getCachedTasks(modelsWithoutInvalidStatuses)

    const filteredModels = this.filterByStreams(modelsWithoutInvalidStatuses, streams, 'ds_stream')
    const filteredTasks = this.filterByStreamsTasks(tasks, streams, 'ds_stream')

    return {
      models: filteredModels,
      tasks: filteredTasks
    }
  }

  private async getCachedModels(): Promise<AppModel[]> {
    const cacheKey = 'models_metrics'
    const cachedModels = this.cache.get<AppModel[]>(cacheKey)

    if (cachedModels) return cachedModels

    const models = await this.modelsService.getModels({ ignoreModeFilter: true })
    this.cache.set(cacheKey, models)
    return models
  }

  private async getCachedTasks(models: any[]): Promise<Task[]> {
    const cacheKey = 'tasks'
    const cachedTasks = this.cache.get<Task[]>(cacheKey)

    if (cachedTasks) return cachedTasks

    const tasks = await this.usersTasksService.getUsersActiveTasks(models);
    this.cache.set(cacheKey, tasks)
    return tasks
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


