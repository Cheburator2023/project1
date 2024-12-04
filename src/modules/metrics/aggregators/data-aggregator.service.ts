import { Injectable } from '@nestjs/common'
import * as NodeCache from 'node-cache'
import { CamundaService } from 'src/system/camunda/camunda.service'
import { ModelsService } from 'src/modules/models/models.service'
import { ArtefactService } from 'src/modules/artefacts/artefact.services'
import { AssignmentService } from 'src/modules/assignments/assignment.service'
import { BpmnService } from 'src/modules/bpmn/bpmn.service'
import { MODEL_SOURCES, USER_ROLES } from 'src/system/common/constants'
import { VALID_BPMN_KEYS } from '../constants'

type Model = {
  bpmn_key: string
  system_model_id: string;
  ds_stream: string;
};

type Task = {
  processInstanceId: string;
  role: string;
  model_id?: string;
  effective_from?: string;
  bpmn_key?: string;
  ds_stream?: string;
  update_date?: string;
};

@Injectable()
export class DataAggregator {
  private readonly cache: NodeCache

  constructor(
    private readonly camundaService: CamundaService,
    private readonly modelsService: ModelsService,
    private readonly artefactService: ArtefactService,
    private readonly assignmentService: AssignmentService,
    private readonly bpmnService: BpmnService
  ) {
    this.cache = new NodeCache({ stdTTL: 300 }) // Кэш на 5 минут
  }

  async aggregateData(streams: string[]): Promise<any> {
    const models = await this.getCachedModels()
    const tasks = await this.getCachedTasks(models)

    const filteredModels = this.filterByStreams(models, streams, 'ds_stream')
    const filteredTasks = this.filterByStreams(tasks, streams, 'ds_stream')
      .filter((task) => this.filterByBpmnKey(VALID_BPMN_KEYS, task.bpmn_key))

    return {
      models: filteredModels,
      tasks: filteredTasks
    }
  }

  private async getCachedModels(): Promise<any[]> {
    const cacheKey = 'models'
    const cachedModels = this.cache.get<Model[]>(cacheKey)

    if (cachedModels) return cachedModels

    const models = await this.modelsService.getModels()
    this.cache.set(cacheKey, models)
    return models
  }

  private async getCachedTasks(models: Model[]): Promise<Task[]> {
    const cacheKey = 'tasks'
    const cachedTasks = this.cache.get<Task[]>(cacheKey)

    if (cachedTasks) return cachedTasks

    const tasks = await this.fetchUserTasks(models)
    this.cache.set(cacheKey, tasks)
    return tasks
  }

  private async fetchUserTasks(models: Model[]): Promise<Task[]> {
    const rawTasks = await this.fetchRawTasks()
    const taskMap = new Map(rawTasks.map((task) => [task.processInstanceId + task.role, task]))

    const instances = await this.bpmnService.getInstances(rawTasks.map((task) => task.processInstanceId))
    const instanceMap = new Map(instances.map((instance) => [instance.model_id, instance]))

    const assignments = await this.assignmentService.getAssignmentsWithRolesByModelId(
      instances.map((instance) => instance.model_id)
    )

    const enrichedTasks = this.enrichTasksWithAssignments(assignments, taskMap, instanceMap, models)

    return this.updateTasksWithArtefacts(enrichedTasks)
  }

  private async fetchRawTasks(): Promise<Task[]> {
    const tasks: Task[] = []
    for (const role of Object.values(USER_ROLES)) {
      const roleTasks = await this.camundaService.getTasksByGroups([role])
      tasks.push(...roleTasks.map((task) => ({ ...task, role })))
    }
    return tasks
  }

  private enrichTasksWithAssignments(
    assignments: any[],
    taskMap: Map<string, Task>,
    instanceMap: Map<string, any>,
    models: Model[]
  ): Task[] {
    return assignments.reduce<Task[]>((acc, assignment) => {
      const instance = instanceMap.get(assignment.model_id)
      if (!instance) return acc

      const taskKey = instance.bpmn_instance_id + assignment.functional_role
      const task = taskMap.get(taskKey)

      if (!task || task.role !== assignment.functional_role) return acc

      const model = models.find((model) => model.system_model_id === assignment.model_id)
      acc.push({
        ...task,
        model_id: assignment.model_id,
        effective_from: assignment.effective_from,
        bpmn_key: model?.bpmn_key || null,
        ds_stream: model?.ds_stream || null
      })

      return acc
    }, [])
  }

  private async updateTasksWithArtefacts(tasks: Task[]): Promise<Task[]> {
    return Promise.all(
      tasks.map(async (task) => {
        const [{ update_date }] = await this.artefactService.getMaxArtefactUpdateDate(
          task.model_id,
          MODEL_SOURCES.SUM
        )
        return { ...task, update_date }
      })
    )
  }

  private filterByStreams<T extends Record<string, any>>(
    items: T[],
    values: string[],
    key: keyof T
  ): T[] {
    return items.filter((item) => values.includes(item[key]))
  }

  private filterByBpmnKey(validBpmnKeys: string[], key: string | undefined): boolean {
    return validBpmnKeys.includes(key || '')
  }
}
