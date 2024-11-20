import { IndependentMetric } from '../base'
import { FinalStatusByMonthModelsMetricResult } from '../interfaces'

export class FinalStatusByMonthsMetric extends IndependentMetric<FinalStatusByMonthModelsMetricResult> {
  calculate() {
    return Array(11).fill(0)
  }
}
