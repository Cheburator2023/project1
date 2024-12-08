import { IndependentMetric } from '../base'
import { MetricResult } from '../interfaces'

export class DevelopedMetric extends IndependentMetric<MetricResult> {
  calculate() {
    const countFilteredModels = this.filterModels(
      this.models,
      this.startDate,
      this.endDate
    )

    const deltaFilteredModels = this.filterModels(
      countFilteredModels,
      this.startDate,
      this.endDate,
      true
    )

    const count = countFilteredModels.length
    const delta = count - deltaFilteredModels.length

    return {
      count,
      delta
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
      const releaseDate = model.date_of_introduction_into_operation ? new Date(model.date_of_introduction_into_operation) : null
      const developingEndDate = model.developing_end_date ? new Date(model.developing_end_date) : null
      const pilotEndDate = model.model_epic_05_date ? new Date(model.model_epic_05_date) : null

      /**
       * 1. Условие: Если "Дата релиза" модели НЕ входит в выбранный временной срез,
       *    И "Дата окончания разработки" модели входит в выбранный временной срез,
       *    ТО модель попадает в категорию "Разработанные модели".
       */
      if (
        this.isOutsideDateRange(releaseDate, actualStartDate, actualEndDate) &&
        this.isWithinDateRange(developingEndDate, actualStartDate, actualEndDate)
      ) {
        return true
      }

      /**
       * 2. Условие: Если Дата релиза модели НЕ входит в выбранный временной срез,
       *    И Дата окончания разработки модели НЕ входит в выбранный временной срез,
       *    И Дата завершения разработки пилота входит в выбранный временной срез,
       *    ТО модель попадает в категорию "Разработанные модели".
       */
      if (
        this.isOutsideDateRange(releaseDate, actualStartDate, actualEndDate) &&
        this.isOutsideDateRange(developingEndDate, actualStartDate, actualEndDate) &&
        this.isWithinDateRange(pilotEndDate, actualStartDate, actualEndDate)
      ) {
        return true
      }

      return false
    })
  }
}
