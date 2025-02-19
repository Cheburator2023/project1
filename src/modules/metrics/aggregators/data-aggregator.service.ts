import { Injectable } from '@nestjs/common'
import * as NodeCache from 'node-cache'
import { CamundaService } from 'src/system/camunda/camunda.service'
import { ModelsService } from 'src/modules/models/models.service'
import { ArtefactService } from 'src/modules/artefacts/artefact.services'
import { AssignmentService } from 'src/modules/assignments/assignment.service'
import { BpmnService } from 'src/modules/bpmn/bpmn.service'
import { MODEL_SOURCES, USER_ROLES } from 'src/system/common/constants'
import { KeycloakService } from 'src/system/keycloak/keycloak.service'
// import { DEPARTMENT_TO_STREAM_MAPPING } from 'src/modules/models/constants'

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

const user_roles = [
  "de",
  "de_lead",
  "ds",
  "ds_lead",
  "mipm",
  "mipm_lead",
  "modelops",
  "modelops_lead",
  "validator",
  "validator_lead",
  "business_customer",
];


@Injectable()
export class DataAggregator {
  private readonly cache: NodeCache

  constructor(
    private readonly camundaService: CamundaService,
    private readonly modelsService: ModelsService,
    private readonly artefactService: ArtefactService,
    private readonly assignmentService: AssignmentService,
    private readonly bpmnService: BpmnService,
    private readonly keycloakService: KeycloakService
  ) {
    this.cache = new NodeCache({ stdTTL: 300 }) // Кэш на 5 минут
  }

  async aggregateData(streams: string[]): Promise<any> {
    const models = await this.getCachedModels()
    const tasks = await this.getCachedTasks(models)

    const filteredModels = this.filterByStreams(models, streams, 'ds_stream')
    const filteredTasks = this.filterByStreamsTasks(tasks, streams, 'ds_stream')

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

    const tasks = await this.usersActiveTasks(models)
    this.cache.set(cacheKey, tasks)
    return tasks
  }

  private usersActiveTasks = async (models) => {
    const userTasksPromises = user_roles.map((userRole) => this.camundaService.tasks([userRole]))

    const userTasks = this.formatUserTasks(await Promise.all(userTasksPromises))
    const taskMap = new Map(userTasks.map(task => [task.processInstanceId + task.role, task]))

    const bpmnInstances = await this.bpmnService.getInstances(userTasks.map((task) => task.processInstanceId))

    const instanceMap = new Map(bpmnInstances.map(instance => [instance.model_id, instance]))

    const assignments = await this.assignmentService.getAssignmentsWithRolesByModelId(
      Array.from(instanceMap.keys()),
      5
    );

    // TODO: Реализовать получение пользователей по группам из Keycloak
    // Закомментировано временно, так как сейчас работа ведётся без групповой фильтрации.
    // Позже нужно вернуть этот код, если появится необходимость учитывать группы пользователей.
    /*
    const allGroups = await this.keycloakService.getSubGroupsByGroupsName([
      'departament',
      'departament_business_customer',
    ]);
  
    const users = await this.getUsersInGroups(allGroups);
    */

    const enrichedTasks = this.enrichTasksWithAssignments(assignments, taskMap, instanceMap, models, 
      // users
    )

    return this.updateTasksWithArtefacts(enrichedTasks)
  }

  // TODO: Реализовать получение пользователей по группам из Keycloak
  // Закомментировано временно, так как сейчас работа ведётся без групповой фильтрации.
  // Позже нужно вернуть этот код, если появится необходимость учитывать группы пользователей.
  /*
  private async getUsersInGroups(groups: any[]): Promise<Record<string, string[]>> {
    const userGroupsMap: Record<string, string[]> = {};
  
    for (const group of groups) {
      const users = await this.keycloakService.getUsersInGroup(group.id);
      users.forEach((user) => {
        const username = user.username;
        if (!userGroupsMap[username]) {
          userGroupsMap[username] = [];
        }
        userGroupsMap[username].push(group.name);
      });
    }
  
    return userGroupsMap;
  }
  */

  private formatUserTasks = (userTasks) =>
    userTasks.reduce((allTasks, groupTask, index) => {
      const formattedGroupTasks = groupTask.map(
        ({ name, processInstanceId }) => ({
          name,
          processInstanceId,
          role: Object.values(USER_ROLES)[index],
        })
      );
  
      return [...allTasks, ...formattedGroupTasks];
    }, []);
    

  private enrichTasksWithAssignments(
    assignments: any[],
    taskMap: any,
    instanceMap: Map<string, any>,
    models: Model[],
    // users: Record<string, string[]>
  ): Task[] {
    return assignments.reduce<Task[]>((acc, assigneeHistItem) => {
      const instance = instanceMap.get(assigneeHistItem.model_id)
      if (!instance) return acc

      const taskKey = instance.bpmn_instance_id + assigneeHistItem.functional_role
      const task = taskMap.get(taskKey)
      if (!task || task.role !== assigneeHistItem.functional_role) return acc

      const model = models.find((model) => model.system_model_id === assigneeHistItem.model_id)
      
      // TODO: Вернуть логику определения streams, если снова потребуется учитывать привязку пользователей к департаментам.
      // Сейчас streams не используется, поэтому код временно закомментирован, но может понадобиться в будущем.
      /*
      const streams = new Set<string>();
      assigneeHistItem.assignee_name.split(',').map((username) => {
        if (username in users) {
          users[username].map(department => {
            const streamsAfterMapping = DEPARTMENT_TO_STREAM_MAPPING[department];
            if (Array.isArray(streamsAfterMapping)) {
              streamsAfterMapping.forEach((stream) => streams.add(stream));
            } else if (streamsAfterMapping) {
              streams.add(streamsAfterMapping);
            }
          });
        }
      });
      */

      acc.push({
        ...task,
        model_id: assigneeHistItem.model_id,
        effective_from: assigneeHistItem.update_date,
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


