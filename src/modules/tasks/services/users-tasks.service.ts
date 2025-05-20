
import { Injectable } from '@nestjs/common';
import { CamundaService } from 'src/system/camunda/camunda.service';
import { BpmnService } from 'src/modules/bpmn/bpmn.service';
import { AssignmentService } from 'src/modules/assignments/assignment.service';
import { ArtefactService } from 'src/modules/artefacts/artefact.services';
import { USER_ROLES, MODEL_SOURCES } from 'src/system/common/constants';
import { AggregatedTask, Assignment, Model, Task } from '../interfaces';
// import { DEPARTMENT_TO_STREAM_MAPPING } from 'src/modules/models/constants'

@Injectable()
export class UsersTasksService {
  constructor(
    private readonly camundaService: CamundaService,
    private readonly bpmnService: BpmnService,
    private readonly assignmentService: AssignmentService,
    private readonly artefactService: ArtefactService,
    // private readonly keycloakService: KeycloakService
  ) {}

  public async getUsersActiveTasks(models: Model[]): Promise<Task[]> {
    const userRoles = Object.values(USER_ROLES) as USER_ROLES[];
    const userTasksPromises = userRoles.map((userRole) => this.camundaService.tasks([userRole]))

    const userTasks = this.formatUserTasks(await Promise.all(userTasksPromises))
    const taskMap: Map<string, Task> = new Map(
      userTasks.map((task) => [task.processInstanceId + task.role, task])
    );

    const bpmnInstances = await this.bpmnService.getInstances(userTasks.map((task) => task.processInstanceId))

    const instanceMap = new Map(bpmnInstances.map(instance => [instance.bpmn_instance_id, instance]));

    const modelIds = Array.from(
      new Set(Array.from(instanceMap.values()).map(i => i.model_id))
    );

    const assignments = await this.assignmentService.getAssignmentsWithRolesByModelId(
      modelIds,
      0
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

  private enrichTasksWithAssignments(
    assignments: any[],
    taskMap: Map<string, Task>,
    instanceMap: Map<string, any>,
    models: Model[]
  ): Task[] {
    const ROLE_TO_LEAD_ROLE = this.mapRolesToLeads();

    const aggregated = assignments.reduce<Record<string, any>>((acc, item) => {
      const instance = instanceMap.get(item.bpmn_instance_id);
      if (!instance) return acc;

      const taskKey = instance.bpmn_instance_id + item.functional_role;
      const task = taskMap.get(taskKey);
      if (!task) return acc;

      const key = item.bpmn_instance_id;
      if (!acc[key]) {
        const model = models.find((model) => model.system_model_id === item.model_id);

        acc[key] = {
          ...this.initializeTaskItem(item),
          DS_STREAM: model?.ds_stream || null,
          BPMN_KEY: model?.bpmn_key || null,
        };
      }

      acc[key].TASK_NAMES.add(task.name);
      acc[key].TASK_IDS.add(task.task_id || '');
      acc[key].USER_NAMES.add(item.assignee_name);
      acc[key].ASSIGNEES.add(task.assignee || '');

      this.setRole(acc[key], task, item, ROLE_TO_LEAD_ROLE);

      return acc;
    }, {});

    return Object.values(aggregated).map(this.formatTaskResult);
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

  private formatUserTasks = (userTasks) =>
    userTasks.reduce((allTasks, groupTask, index) => {      
      const formattedGroupTasks = groupTask.map(
        ({ taskDefinitionKey, name, processInstanceId, assignee }) => ({
          task_id: taskDefinitionKey,
          name,
          processInstanceId,
          assignee,
          role: Object.values(USER_ROLES)[index],
        })
      );
  
      return [...allTasks, ...formattedGroupTasks];
  }, []);

  private mapRolesToLeads(): Record<string, USER_ROLES> {
    const allRoles = Object.values(USER_ROLES);
    return allRoles.reduce((map, role) => {
      if (!String(role).includes('_lead')) {
        const leadRole = `${role}_lead`;
        if (allRoles.includes(leadRole as USER_ROLES)) {
          map[role] = leadRole as USER_ROLES;
        }
      }
      return map;
    }, {} as Record<string, USER_ROLES>);
  }

  private initializeTaskItem(item: Assignment): AggregatedTask {
    return {
      MODEL_ID: item.model_id,
      MODEL_NAME: item.model_name,
      MODEL_ALIAS: `model${item.root_model_id}-v${item.model_version}`,
      UPDATE_DATE: item.update_date,
      STATUS: item.status,
      TASK_NAMES: new Set<string>(),
      TASK_IDS: new Set<string>(),
      USER_NAMES: new Set<string>(),
      ASSIGNEES: new Set<string>(),
      STREAMS: new Set<string>(),
      ROLES: new Set<string>(),
      ROLE: '',
      DS_STREAM: null,
      BPMN_KEY: null,
    };
  }

  private setRole(taskItem: AggregatedTask, task: Task, item: Assignment, roleToLead: Record<string, string>) {
    if (task.assignee && item.assignee_name.split(', ').includes(task.assignee)) {
      taskItem.ROLE = item.functional_role;
    } else {
      const role = task.role.includes('_lead') ? task.role : roleToLead[task.role];
      if (role) taskItem.ROLES.add(role);
    }
  }

  private formatTaskResult(item: AggregatedTask): Task {
    return {
      model_id: item.MODEL_ID,
      task_id: Array.from(item.TASK_IDS).join(', '),
      role: item.ROLE || Array.from(item.ROLES).join(', '),
      bpmn_key: item.BPMN_KEY,
      ds_stream: item.DS_STREAM,
      update_date: item.UPDATE_DATE,
      assignee: Array.from(item.ASSIGNEES).join(', '),
      name: Array.from(item.TASK_NAMES).join(', '),
    };
  }
}