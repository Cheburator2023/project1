import { DependentMetric } from '../base'
import { MetricDependencyMap, RegistryCoverageResult } from '../interfaces'
import { MetricsEnum } from '../enums'

export class RegistryCoverageMetric extends DependentMetric<RegistryCoverageResult,
  Pick<MetricDependencyMap,
    MetricsEnum.ImplementedModelsMetric | MetricsEnum.DevelopedModelsMetric | MetricsEnum.MrmModelsMetric>> {
  calculate(): RegistryCoverageResult {
    // Summing up the total count and delta for all models
    const { count: totalModelsCount, delta: totalModelsDelta } = Object
      .keys(this.dependencies)
      .reduce(
        (acc, current: MetricsEnum) => {
          if (
            current === MetricsEnum.DevelopedModelsMetric ||
            current === MetricsEnum.ImplementedModelsMetric
          ) {
            acc.count += this.dependencies[current].count
            acc.delta += this.dependencies[current].delta
          }
          return acc
        },
        { count: 0, delta: 0 }
      )

    // Getting count and delta for MRM models
    const { count: mrmModelsCount, delta: mrmModelsDelta } =
      this.dependencies[MetricsEnum.MrmModelsMetric]

    // Calculating values for the current period
    const currentRegistryCoveragePercent = this.calculatePercentageCount(
      totalModelsCount,
      mrmModelsCount
    )

    // Calculating values for the previous period
    const previousTotalModelsCount = totalModelsCount - totalModelsDelta
    const previousMrmModelsCount = mrmModelsCount - mrmModelsDelta
    const previousRegistryCoveragePercent = this.calculatePercentageCount(
      previousTotalModelsCount,
      previousMrmModelsCount
    )

    // Calculating the percentage change (delta)
    const deltaPercent = this.calculatePercentageDelta(
      currentRegistryCoveragePercent,
      previousRegistryCoveragePercent
    )

    return {
      countPercent: currentRegistryCoveragePercent,
      deltaPercent: deltaPercent
    }
  }
}
