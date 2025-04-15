import { IndependentMetric } from '../base'
import { TasksMetricResult } from '../interfaces'

export class TasksMetric extends IndependentMetric<TasksMetricResult> {
  private filteredTasks: any[] = [];

  calculate() {
    const filteredTasks = this.filterTasks(
      this.tasks,
      this.startDate,
      this.endDate
    )

    const { dataSourcesSet, validationSet } = this.groupTasksByRole(filteredTasks)

    this.filteredTasks = [...dataSourcesSet.values(), ...validationSet.values()];

    return {
      datasources: dataSourcesSet.size,
      validation: validationSet.size
    }
  }

  private filterTasks(tasks, startDate: string | null, endDate: string | null) {
    const { actualStartDate, actualEndDate } = this.getActualDateRange(startDate, endDate)

    return tasks.filter((task) =>
      this.isWithinDateRange(
        task.update_date ? new Date(task.update_date) : null,
        actualStartDate,
        actualEndDate
      )
    )
  }

  public getFilteredRowData() {
    return this.filteredTasks.map((task) => ({
      system_model_id: task.model_id,
      role: task.role,
    }));
  }
  
  private groupTasksByRole(tasks) {
    const dataSourcesSet = new Map<string, any>()
    const validationSet = new Map<string, any>()

    tasks.forEach(({ role, model_id, processInstanceId }) => {
      const uniqueKey = `${model_id}-${role}-${processInstanceId}`
      
      if (this.isDataSourceRole(role) && !dataSourcesSet.has(uniqueKey)) {
        dataSourcesSet.set(uniqueKey, { model_id, role, processInstanceId})
      }

      if (this.isValidationRole(role) && !dataSourcesSet.has(uniqueKey)) {
        validationSet.set(uniqueKey, { model_id, role, processInstanceId})
      }
    })

    return { dataSourcesSet, validationSet }
  }

  private isDataSourceRole(role: string): boolean {
    return ['ds', 'ds_lead'].includes(role)
  }

  private isValidationRole(role: string): boolean {
    return ['validator', 'validator_lead'].includes(role)
  }
}



