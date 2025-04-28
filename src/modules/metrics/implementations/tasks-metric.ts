import { USER_ROLES } from 'src/system/common';
import { IndependentMetric } from '../base';
import { TasksMetricResult } from '../interfaces';

export class TasksMetric extends IndependentMetric<TasksMetricResult> {
  private filteredTasks: Array<{
    model_id: string;
    role: string;
    ds_stream: string;
    name: string;
    task_id: string;
    effective_from: string;
    update_date: string;
    user_name: string;
  }> = [];

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
    const filtered = this.filterTasks(this.tasks, this.startDate, this.endDate);
    const grouped = this.groupTasksByRole(filtered);

    this.filteredTasks = this.flattenGroupedTasks(grouped);
    return this.buildResultFromGroupedTasks(grouped);
  }

  private filterTasks(tasks: any[], startDate: string | null, endDate: string | null): any[] {
    const { actualStartDate, actualEndDate } = this.getActualDateRange(startDate, endDate);

    return tasks.filter((task) =>
      this.isWithinDateRange(
        task.update_date ? new Date(task.update_date) : null,
        actualStartDate,
        actualEndDate
      )
    );
  }

  private groupTasksByRole(tasks: any[]): Record<string, any[]> {
    const groupedTasks: Record<string, any[]> = {};
    this.ROLES.forEach(role => {
      groupedTasks[role] = [];
    });

    tasks.forEach((task) => {
      const { role } = task;

      if (this.ROLES.includes(role) && this.shouldIncludeTask(task)) {
        groupedTasks[role].push(task);
      }
    });

    return groupedTasks;
  }

  private flattenGroupedTasks(tasksByRole: Record<string, any[]>): any[] {
    return Object.values(tasksByRole).flat();
  }

  private buildResultFromGroupedTasks(groupedTasks: Record<string, any[]>): TasksMetricResult {
    const metricsResult: Partial<TasksMetricResult> = {};

    this.ROLES.forEach(role => {
      metricsResult[role] = groupedTasks[role].length;
    });

    return metricsResult as TasksMetricResult;
  }

  private shouldIncludeTask(task: any): boolean {
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
      effective_from: task.effective_from,
      update_date: task.update_date,
      user_name: task.user_name,
    }));
  }
}