import { IndependentMetric } from '../base'
import { TasksMetricResult } from '../interfaces'

export class TasksMetric extends IndependentMetric<TasksMetricResult> {
  calculate() {
    const filteredAssignments = this.filterAssignments(
      this.assignments,
      this.startDate,
      this.endDate
    )

    const { dataSourcesSet, validationSet } = this.groupAssignmentsByRole(filteredAssignments)

    return {
      datasources: dataSourcesSet.size,
      validation: validationSet.size
    }
  }

  private filterAssignments(assignments, startDate: string | null, endDate: string | null) {
    const { actualStartDate, actualEndDate } = this.getActualDateRange(startDate, endDate)

    return assignments.filter((assignment) =>
      this.isWithinDateRange(
        assignment.effective_from ? new Date(assignment.effective_from) : null,
        actualStartDate,
        actualEndDate
      )
    )
  }

  private groupAssignmentsByRole(assignments) {
    const dataSourcesSet = new Set()
    const validationSet = new Set()

    assignments.forEach(({ functional_role, model_id }) => {
      if (this.isDataSourceRole(functional_role)) {
        dataSourcesSet.add(model_id)
      }

      if (this.isValidationRole(functional_role)) {
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
