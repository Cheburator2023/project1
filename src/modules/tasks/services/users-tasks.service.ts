import { Injectable } from '@nestjs/common'
import { CamundaService } from 'src/system/camunda/camunda.service'
import { BpmnService } from 'src/modules/bpmn/bpmn.service'
import { AssignmentService } from 'src/modules/assignments/assignment.service'
import { ArtefactService } from 'src/modules/artefacts/artefact.services'
import { USER_ROLES, MODEL_SOURCES } from 'src/system/common/constants'
import { Assignment, Model, RawCamundaTask, Task } from '../interfaces'

@Injectable()
export class UsersTasksService {
  constructor(
    private readonly camundaService: CamundaService,
    private readonly bpmnService: BpmnService,
    private readonly assignmentService: AssignmentService,
    private readonly artefactService: ArtefactService
  ) {}

  public async getUsersActiveTasks(models: Model[]): Promise<Task[]> {
    const userTasksRaw = await this.getUserTasks()
    const userTasks = this.filterPreferLeadTasks(userTasksRaw)

    const bpmnInstances = await this.bpmnService.getInstances(
      userTasks.map((task) => task.processInstanceId)
    )

    const instanceMap = new Map(
      bpmnInstances.map((instance) => [instance.bpmn_instance_id, instance])
    )

    const modelIds = Array.from(
      new Set(
        Array.from(instanceMap.values()).map((instance) => instance.model_id)
      )
    )

    const assigneeHist =
      await this.assignmentService.getAssignmentsWithRolesByModelId(modelIds, 0)

    const modelMap = new Map(
      models.map((model) => [model.system_model_id, model])
    )

    const filteredUserTasks = userTasks.filter((task) => {
      const instance = instanceMap.get(task.processInstanceId)
      return instance && modelMap.has(instance.model_id)
    })

    const enrichedTasks = this.enrichTasks(
      filteredUserTasks,
      instanceMap,
      assigneeHist,
      modelMap
    )

    return this.updateTasksWithArtefacts(enrichedTasks)
  }

  /**
   * Обогащает задачи информацией о модели и роли исполнителя.
   * Использует карту инстансов и карту моделей, чтобы дополнить задачу
   * сведениями о model_id, ключе процесса (bpmn_key) и стриме (ds_stream).
   * Также вычисляет корректную роль исполнителя на основе истории назначений.
   *
   * @param {Task[]} userTasks - Список задач пользователей из Camunda.
   * @param {Map<string, any>} instanceMap - Карта BPMN-инстансов: processInstanceId → BPMN instance.
   * @param {any[]} assigneeHist - История назначений с полями model_id, assignee_name, functional_role.
   * @param {Map<string, Model>} modelMap - Карта моделей: model_id → метаданные модели.
   * @returns {Task[]} Список обогащённых задач.
   */
  private enrichTasks(
    userTasks: Task[],
    instanceMap: Map<string, { model_id: string }>,
    assigneeHist: Assignment[],
    modelMap: Map<string, Model>
  ): Task[] {
    return userTasks
      .map((task) => {
        const instance = instanceMap.get(task.processInstanceId)
        if (!instance) return null

        const modelId = instance.model_id
        const model = modelMap.get(modelId)

        return {
          task_id: task.task_id,
          name: task.name,
          assignee: task.assignee,
          role: this.getEffectiveFunctionalRole(
            task,
            assigneeHist,
            instanceMap
          ),
          model_id: modelId,
          bpmn_key: model?.bpmn_key,
          ds_stream: model?.ds_stream
        }
      })
      .filter(Boolean)
  }

  private async updateTasksWithArtefacts(tasks: Task[]): Promise<Task[]> {
    return Promise.all(
      tasks.map(async (task) => {
        const [{ update_date }] =
          await this.artefactService.getMaxArtefactUpdateDate(
            task.model_id,
            MODEL_SOURCES.SUM
          )
        return { ...task, update_date }
      })
    )
  }

  private formatUserTasks = (userTasks: RawCamundaTask[][]): Task[] =>
    userTasks.reduce(
      (allTasks: Task[], groupTask: RawCamundaTask[], index: number) => {
        const formattedGroupTasks: Task[] = groupTask.map(
          ({ taskDefinitionKey, name, processInstanceId, assignee }) => ({
            task_id: taskDefinitionKey,
            name,
            processInstanceId,
            assignee,
            role: Object.values(USER_ROLES)[index]
          })
        )

        return [...allTasks, ...formattedGroupTasks]
      },
      []
    )

  /**
   * Получает задачи всех пользователей на основе ролей.
   * @returns {Array} Сформатированный массив задач пользователей.
   */
  async getUserTasks(): Promise<Task[]> {
    const userRoles = Object.values(USER_ROLES) as USER_ROLES[]
    const userTasksPromises: Promise<RawCamundaTask[]>[] = userRoles.map(
      (userRole) => this.camundaService.tasks([userRole])
    )

    const userTasksResults = await Promise.all(userTasksPromises)
    const formattedTasks = this.formatUserTasks(userTasksResults)

    return formattedTasks
  }

  /**
   * Возвращает функциональную роль на основе совпадения assignee в истории.
   * Если не найдено — возвращает исходную роль из задачи.
   *
   * @param {Object} task - Задача Camunda (с processInstanceId, assignee, role).
   * @param {Array} assigneeHist - Массив строк с MODEL_ID, ASSIGNEE_NAME, FUNCTIONAL_ROLE.
   * @param {Map<string, Object>} instanceMap - Map по processInstanceId → BPMN instance (с MODEL_ID).
   * @returns {string} - Роль задачи
   */
  private getEffectiveFunctionalRole(
    task: Task,
    assigneeHist: Assignment[],
    instanceMap: Map<string, { model_id: string }>
  ): string {
    const instance = instanceMap.get(task.processInstanceId)
    if (!instance || !task.assignee) return task.role

    const modelId = instance.model_id

    const match = assigneeHist.find(
      (row) =>
        row.model_id === modelId &&
        row.assignee_name?.split(', ').includes(task.assignee)
    )

    return match?.functional_role || task.role
  }

  /**
   * Фильтрует задачи, оставляя одну на комбинацию processInstanceId + name,
   * с приоритетом роли *_lead.
   *
   * @param {Array} tasks - Список задач
   * @returns {Array} Отфильтрованный список задач
   */
  private filterPreferLeadTasks(tasks: Task[]): Task[] {
    const taskMap = new Map<string, Task>()

    for (const task of tasks) {
      const key = `${task.processInstanceId}::${task.name}`
      const isLead = task.role.endsWith('_lead')

      if (!taskMap.has(key)) {
        taskMap.set(key, task)
      } else {
        const existing = taskMap.get(key)!
        const existingIsLead = existing.role.endsWith('_lead')

        // если текущий — не lead, а новый — lead — заменяем
        if (isLead && !existingIsLead) {
          taskMap.set(key, task)
        }
      }
    }

    return Array.from(taskMap.values())
  }
}
