import { DependentMetric } from '../base'
import { MetricDependencyMap, RegistryCoverageResult } from '../interfaces'
import { MetricsEnum } from '../enums'

export class RegistryCoverageMetric extends DependentMetric<RegistryCoverageResult, Pick<MetricDependencyMap, MetricsEnum.ImplementedModelsMetric | MetricsEnum.DevelopedModelsMetric | MetricsEnum.MrmModelsMetric>> {
  calculate(): RegistryCoverageResult {
    const totalModels = Object
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

    const { count: mrmModelsCount, delta: mrmModelsDelta } =
      this.dependencies[MetricsEnum.MrmModelsMetric]
    const { count: totalModelsCount, delta: totalModelsDelta } =
      totalModels

    const prevTotalModelsCount = totalModelsCount - totalModelsDelta
    const prevMrmModelsCount = mrmModelsCount - mrmModelsDelta

    const registryCoverageModelsCount = this.calculatePercentageCount(
      totalModelsCount,
      mrmModelsCount
    )

    const deltaPercent = this.calculatePercentageDelta(
      registryCoverageModelsCount,
      this.calculatePercentageCount(
        prevTotalModelsCount,
        prevMrmModelsCount
      )
    )

    return {
      countPercent: registryCoverageModelsCount,
      deltaPercent: deltaPercent
    }
  }
}
