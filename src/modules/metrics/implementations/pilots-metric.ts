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
    const { actualStartDate, actualEndDate } = this.getActualDateRange(startDate, endDate, isDeltaCalculation)

    return models.filter((model) => {
      const releaseDate = model.date_of_introduction_into_operation ? new Date(model.date_of_introduction_into_operation) : null

      /**
       * 1. Условие: Если "Дата релиза" модели входит в выбранный временной срез,
       *    ТО модель попадает в категорию "Внедренные модели".
       */
      if (
        this.isWithinDateRange(releaseDate, actualStartDate, actualEndDate)
      ) {
        return true
      }

      return false
    })
  }
}
