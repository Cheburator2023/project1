import { IndependentMetric } from '../base'
import { PilotsMetricResult } from '../interfaces'

export class PilotsMetric extends IndependentMetric<PilotsMetricResult> {
  calculate(): PilotsMetricResult {
    const countFilteredModels = this.filterModels(
      this.models,
      this.startDate,
      this.endDate
    )

    const stage05A = countFilteredModels.length
    const stage05B = 0

    return {
      stage05A,
      stage05B
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
      const pilotEndDate = model.model_epic_05_date ? new Date(model.model_epic_05_date) : null

      /**
       * 1. Условие: Если "Дата завершения разработки пилота" модели входит в выбранный временной срез,
       *    ТО модель попадает в категорию "Пилоты".
       */
      if (
        this.isWithinDateRange(pilotEndDate, actualStartDate, actualEndDate)
      ) {
        return true
      }

      return false
    })
  }
}
