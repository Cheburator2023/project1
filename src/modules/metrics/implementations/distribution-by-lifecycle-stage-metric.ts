import { IndependentMetric } from '../base'
import { DistributionByLifecycleStageModelsMetricResult } from '../interfaces'

export class DistributionByLifecycleStageMetric extends IndependentMetric<DistributionByLifecycleStageModelsMetricResult> {
  calculate(): DistributionByLifecycleStageModelsMetricResult {
    // Use a Map to dynamically count occurrences of each model_status
    const lifecycleStages = new Map<string, number>()

    // Iterate through all models to count model_status occurrences
    this.models.forEach((model) => {
      const status = model.model_status
      if (lifecycleStages.has(status)) {
        lifecycleStages.set(status, lifecycleStages.get(status)! + 1)
      } else {
        lifecycleStages.set(status, 1)
      }
    })

    // Convert the Map to an array of [status, count] pairs
    return Array.from(lifecycleStages.entries()) as DistributionByLifecycleStageModelsMetricResult
  }
}
