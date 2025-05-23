import { USER_ROLES } from 'src/system/common';
import { IndependentMetric } from '../base';
import { TasksMetricResult } from '../interfaces';

interface TaskMetricItem {
  model_id: string;
  role: string;
  ds_stream: string;
  name: string;
  task_id: string;
  effective_from: string;
  update_date: string;
  assignee: string;
}


export class TasksMetric extends IndependentMetric<TasksMetricResult> {
  private filteredTasks: TaskMetricItem[] = [];

  private readonly ROLES: (keyof TasksMetricResult)[] = [
    USER_ROLES.DS,
    USER_ROLES.DS_LEAD,
    USER_ROLES.DE,
    USER_ROLES.DE_LEAD,
    USER_ROLES.MODELOPS,
    USER_ROLES.MODELOPS_LEAD,
    USER_ROLES.MIPM,
    USER_ROLES.VALIDATOR,
    USER_ROLES.VALIDATOR_LEAD,
  ];

  private readonly VALIDATION_TASK_IDS = [
    'requirements_first_valid_datamart',
    'validation_parameters_approving',
  ];

  calculate(): TasksMetricResult {
    const filtered = this.filterTasks(this.tasks as TaskMetricItem[], this.startDate, this.endDate);
    const grouped = this.groupTasksByRole(filtered);

    this.filteredTasks = this.flattenGroupedTasks(grouped);
    return this.buildResultFromGroupedTasks(grouped);
  }

  private filterTasks(tasks: TaskMetricItem[], startDate: string | null, endDate: string | null): TaskMetricItem[] {
    const { actualStartDate, actualEndDate } = this.getActualDateRange(startDate, endDate);

    return tasks.filter((task) =>
      this.isWithinDateRange(
        task.update_date ? new Date(task.update_date) : null,
        actualStartDate,
        actualEndDate
      )
    );
  }

  private groupTasksByRole(tasks: TaskMetricItem[]): Record<USER_ROLES, TaskMetricItem[]> {
    const groupedTasks = Object.fromEntries(
      this.ROLES.map(role => [role, []])
    ) as Record<USER_ROLES, TaskMetricItem[]>;

    for (const task of tasks) {
      const roles = (typeof task.role === 'string' ? task.role.split(',') : [])
        .map(r => r.trim())
        .filter((r): r is USER_ROLES => this.ROLES.includes(r as USER_ROLES));

      for (const role of roles) {
        if (this.shouldIncludeTask({ ...task, role })) {
          groupedTasks[role].push({ ...task, role });
        }
      }
    }

    return groupedTasks;
  }

  private flattenGroupedTasks(tasksByRole: Record<USER_ROLES, TaskMetricItem[]>): TaskMetricItem[] {
    return Object.values(tasksByRole).flat();
  }

  private buildResultFromGroupedTasks(groupedTasks: Record<USER_ROLES, TaskMetricItem[]>): TasksMetricResult {
    const metricsResult: Partial<TasksMetricResult> = {};

    this.ROLES.forEach(role => {
      metricsResult[role] = groupedTasks[role].length;
    });

    return metricsResult as TasksMetricResult;
  }

  private shouldIncludeTask(task: TaskMetricItem): boolean {
    const { role, task_id } = task;

    if (role === USER_ROLES.VALIDATOR || role === USER_ROLES.VALIDATOR_LEAD) {
      return this.VALIDATION_TASK_IDS.includes(task_id);
    }

    return true;
  }

  public getFilteredRowData() {
    return this.filteredTasks.map((task) => ({
      system_model_id: task.model_id,
      role: task.role,
      ds_stream: task.ds_stream,
      name: task.name,
      task_id: task.task_id,
      update_date: new Date(task.update_date).toISOString().replace('T', ' ').substring(0, 19),
      assignee: task.assignee,
    }));
  }
}
