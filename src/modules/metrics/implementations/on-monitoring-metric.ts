import { IndependentMetric } from '../base'
import { MetricPercentResult } from '../interfaces'

export class OnMonitoringMetric extends IndependentMetric<MetricPercentResult> {
  calculate(): MetricPercentResult {
    const currentFilteredModels = this.filterModels(
      this.models,
      this.startDate,
      this.endDate
    )

    const previousFilteredModels = this.filterModels(
      currentFilteredModels,
      this.startDate,
      this.endDate,
      true
    )

    const count = currentFilteredModels.length
    const deltaPercent = this.calculatePercentageDelta(
      currentFilteredModels.length,
      previousFilteredModels.length
    )

    return {
      count,
      deltaPercent
    }
  }

  private filterModels(
    models,
    startDate: string | null,
    endDate: string | null,
    isDeltaCalculation: boolean = false
  ) {
    const { actualStartDate, actualEndDate } = this.getActualDateRange(startDate, endDate, isDeltaCalculation ? 7 : null)

    return models.filter((model) => {
      const modelEpic12 = model.model_epic_12_date ? new Date(model.model_epic_12_date) : null

      /**
       * 1. Условие: Если "Дата решения для эпика 12" модели входит в выбранный временной срез,
       *    ТО модель попадает в категорию "Модели на мониторинге".
       */
      if (
        this.isWithinDateRange(modelEpic12, actualStartDate, actualEndDate)
      ) {
        return true
      }

      return false
    })
  }
}
