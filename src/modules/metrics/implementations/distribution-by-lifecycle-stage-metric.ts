import { IndependentMetric } from '../base'
import { DistributionByLifecycleStageModelsMetricResult } from '../interfaces'

export class DistributionByLifecycleStageMetric extends IndependentMetric<DistributionByLifecycleStageModelsMetricResult> {
  calculate(): DistributionByLifecycleStageModelsMetricResult {
    const filteredModels = this.filterModels(
      this.models,
      this.startDate,
      this.endDate
    )

    // Use a Map to dynamically count occurrences of each model_status
    const lifecycleStages = new Map<string, number>()

    // Iterate through all models to count model_status occurrences
    filteredModels.forEach((model) => {
      const status = model.model_status

      if (!status) {
        return
      }

      if (lifecycleStages.has(status)) {
        lifecycleStages.set(status, lifecycleStages.get(status)! + 1)
      } else {
        lifecycleStages.set(status, 1)
      }
    })

    // Convert the Map to an array of [status, count] pairs
    return Array.from(lifecycleStages.entries()) as DistributionByLifecycleStageModelsMetricResult
  }

  private filterModels(
    models,
    startDate: string | null,
    endDate: string | null
  ) {
    const { actualStartDate, actualEndDate } = this.getActualDateRange(startDate, endDate)

    return models.filter((model) => {
      const createDate = model.create_date ? new Date(model.create_date) : null

      /**
       * 1. Условие: Если "Дата создания" модели входит в выбранный временной срез,
       *    ТО модель попадает в категорию "Распределение моделей по этапам жцм".
       */
      if (this.isWithinDateRange(createDate, actualStartDate, actualEndDate)) {
        return true
      }
    })
  }
}
