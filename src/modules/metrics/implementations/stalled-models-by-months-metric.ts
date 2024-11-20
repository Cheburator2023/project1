import { IndependentMetric } from '../base'
import { StalledModelsByMonthMetricResult } from '../interfaces'

export class StalledModelsByMonthsMetric extends IndependentMetric<StalledModelsByMonthMetricResult> {
  calculate() {
    return Array(11).fill(0)
  }
}
