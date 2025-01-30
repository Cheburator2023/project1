import { DependentMetric } from '../base'
import { MetricDependencyMap, RiskCoverageFinalStatusResult } from '../interfaces'
import { MetricsEnum } from '../enums'

export class RiskCoverageFinalStatusMetric extends DependentMetric<RiskCoverageFinalStatusResult,
  Pick<MetricDependencyMap, MetricsEnum.MrmModelsMetric | MetricsEnum.FinalStatusModelsMetric>> {
  calculate(): RiskCoverageFinalStatusResult {
    // Retrieve the count and delta for models with final status
    const { count: finalStatusModelsCount, delta: finalStatusModelsDelta } =
      this.dependencies[MetricsEnum.FinalStatusModelsMetric]

    // Retrieve the count and delta for MRM models
    const { count: mrmModelsCount, delta: mrmModelsDelta } =
      this.dependencies[MetricsEnum.MrmModelsMetric]

    // Calculate values for the previous period
    const previousFinalStatusModelsCount = finalStatusModelsCount - finalStatusModelsDelta
    const previousMrmModelsCount = mrmModelsCount - mrmModelsDelta

    // Calculate the current percentage of risk coverage based on final status
    const currentRiskCoverageFinalStatusPercent = this.calculatePercentageCount(
      finalStatusModelsCount,
      mrmModelsCount
    )

    // Calculate the percentage change (delta)
    const deltaPercent = this.calculatePercentageDelta(
      currentRiskCoverageFinalStatusPercent,
      this.calculatePercentageCount(
        previousFinalStatusModelsCount,
        previousMrmModelsCount
      )
    )

    return {
      countPercent: currentRiskCoverageFinalStatusPercent,
      deltaPercent: deltaPercent
    }
  }
}
