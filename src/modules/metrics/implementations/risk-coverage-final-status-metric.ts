import { DependentMetric } from '../base'
import { MetricDependencyMap, RiskCoverageFinalStatusResult } from '../interfaces'
import { MetricsEnum } from '../enums'

export class RiskCoverageFinalStatusMetric extends DependentMetric<RiskCoverageFinalStatusResult, Pick<MetricDependencyMap, MetricsEnum.MrmModelsMetric | MetricsEnum.FinalStatusModelsMetric>> {
  calculate(): RiskCoverageFinalStatusResult {
    const { count: finalStatusCount, delta: finalStatusDelta } =
      this.dependencies[MetricsEnum.FinalStatusModelsMetric]
    const { count: mrmModelsCount, delta: mrmModelsDelta } =
      this.dependencies[MetricsEnum.MrmModelsMetric]

    const prevTotalModelsCount = finalStatusCount - finalStatusDelta
    const prevMrmModelsCount = mrmModelsCount - mrmModelsDelta

    const riskCoverageFinalStatusCount = this.calculatePercentageCount(
      finalStatusCount,
      mrmModelsCount
    )

    const deltaPercent = this.calculatePercentageDelta(
      riskCoverageFinalStatusCount,
      this.calculatePercentageCount(
        prevTotalModelsCount,
        prevMrmModelsCount
      )
    )

    return {
      countPercent: riskCoverageFinalStatusCount,
      deltaPercent: deltaPercent
    }
  }
}
