import { IndependentMetric } from '../base'
import { TasksMetricResult } from '../interfaces'

export class TasksMetric extends IndependentMetric<TasksMetricResult> {
  calculate() {
    const filteredTasks = this.filterTasks(
      this.tasks,
      this.startDate,
      this.endDate
    )

    const { dataSourcesSet, validationSet } = this.groupTasksByRole(filteredTasks)

    return {
      datasources: dataSourcesSet.size,
      validation: validationSet.size
    }
  }

  private filterTasks(tasks, startDate: string | null, endDate: string | null) {
    const { actualStartDate, actualEndDate } = this.getActualDateRange(startDate, endDate)

    return tasks.filter((task) =>
      this.isWithinDateRange(
        task.effective_from ? new Date(task.effective_from) : null,
        actualStartDate,
        actualEndDate
      )
    )
  }

  private groupTasksByRole(tasks) {
    const dataSourcesSet = new Set()
    const validationSet = new Set()

    tasks.forEach(({ role, model_id }) => {
      if (this.isDataSourceRole(role)) {
        dataSourcesSet.add(model_id)
      }

      if (this.isValidationRole(role)) {
        validationSet.add(model_id)
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
