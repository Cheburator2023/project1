import { IndependentMetric } from '../base'
import { DistributionByLifecycleStageModelsMetricResult } from '../interfaces'

export class DistributionByLifecycleStageMetric extends IndependentMetric<DistributionByLifecycleStageModelsMetricResult> {
  calculate(): DistributionByLifecycleStageModelsMetricResult {
    return [
      ['Инициализация', 0],
      ['Разработка витрины', 0],
      ['Разработка модели', 0],
      ['Сокращенное з-ние', 0],
    ]
  }
}
