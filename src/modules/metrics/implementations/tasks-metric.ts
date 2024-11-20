import { IndependentMetric } from '../base'
import { TasksMetricResult } from '../interfaces'

export class TasksMetric extends IndependentMetric<TasksMetricResult> {
  calculate() {
    return {
      datasources: 0,
      validation: 0
    }
  }
}
