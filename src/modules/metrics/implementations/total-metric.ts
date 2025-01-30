import { DependentMetric } from '../base'
import { MetricsEnum } from '../enums'
import { MetricDependencyMap, MetricResult } from '../interfaces'

export class TotalMetric extends DependentMetric<MetricResult, Pick<MetricDependencyMap, MetricsEnum.ImplementedModelsMetric | MetricsEnum.DevelopedModelsMetric>> {
  calculate() {
    return Object
      .keys(this.dependencies)
      .reduce((acc, current: MetricsEnum) => {
        if (
          current === MetricsEnum.DevelopedModelsMetric ||
          current === MetricsEnum.ImplementedModelsMetric
        ) {
          acc.count += this.dependencies[current].count
          acc.delta += this.dependencies[current].delta
        }

        return acc
      }, {
        count: 0,
        delta: 0
      })
  }
}
