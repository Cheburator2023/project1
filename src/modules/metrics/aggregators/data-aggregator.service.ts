import { Injectable } from '@nestjs/common'
import * as NodeCache from 'node-cache'
import { ModelsService } from 'src/modules/models/models.service'
import { Model, Task } from 'src/modules/tasks/interfaces'
import { UsersTasksService } from 'src/modules/tasks/services/users-tasks.service'

@Injectable()
export class DataAggregator {
  private readonly cache: NodeCache

  constructor(
    private readonly modelsService: ModelsService,
    private readonly usersTasksService: UsersTasksService
  ) {
    this.cache = new NodeCache({ stdTTL: 300 }) // Кэш на 5 минут
  }

  async aggregateData(streams: string[], mode): Promise<any> {
    const models = await this.getCachedModels(mode)
    const tasks = await this.getCachedTasks(models)

    const filteredModels = this.filterByStreams(models, streams, 'ds_stream')
    const filteredTasks = this.filterByStreamsTasks(tasks, streams, 'ds_stream')

    return {
      models: filteredModels,
      tasks: filteredTasks
    }
  }

  private async getCachedModels(mode): Promise<any[]> {
    const cacheKey = `models_${mode}`
    const cachedModels = this.cache.get<Model[]>(cacheKey)

    if (cachedModels) return cachedModels

    const models = await this.modelsService.getModels({ mode })
    this.cache.set(cacheKey, models)
    return models
  }

  private async getCachedTasks(models: Model[]): Promise<Task[]> {
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


