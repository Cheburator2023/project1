import { IndependentMetric } from '../base'
import { MetricResult } from '../interfaces'

export class FinalStatusMetric extends IndependentMetric<MetricResult> {
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
    const { actualStartDate, actualEndDate } = this.getActualDateRange(startDate, endDate, isDeltaCalculation)

    return models.filter((model) => {
      const removeDate = model.remove_date ? new Date(model.remove_date) : null
      const releaseDate = model.date_of_introduction_into_operation ? new Date(model.date_of_introduction_into_operation) : null
      const developingEndDate = model.developing_end_date ? new Date(model.developing_end_date) : null
      const pilotEndDate = model.data_completion_of_stage_05a ? new Date(model.data_completion_of_stage_05a) : null
      const createDate = model.create_date ? new Date(model.create_date) : null
      const modelStatus = model.model_status

      /**
       * 1. Условие: Если "Дата выведения РС/Модели из эксплуатации" входит в выбранный временной срез,
       *    ИЛИ "Дата релиза" модели входит в выбранный временной срез,
       *    ИЛИ "Дата окончания разработки Модели" входит в выбранный временной срез,
       *    ИЛИ "Дата завершения разработки пилота" модели входит в выбранный временной срез,
       *    ИЛИ "Дата создания" модели входит в выбранный временной срез,
       *    ТО модель попадает в категорию "Модели с финальным статусом".
       */
      const isWithinTimeRange =
        this.isWithinDateRange(removeDate, actualStartDate, actualEndDate) ||
        this.isWithinDateRange(releaseDate, actualStartDate, actualEndDate) ||
        this.isWithinDateRange(developingEndDate, actualStartDate, actualEndDate) ||
        this.isWithinDateRange(pilotEndDate, actualStartDate, actualEndDate) ||
        this.isWithinDateRange(createDate, actualStartDate, actualEndDate)

      /**
       * 2. Условие: Если "Статус модели" равен одному из значений
       */
      const hasFinalStatus = this.isFinalStatus(modelStatus)

      return isWithinTimeRange && hasFinalStatus
    })
  }
}
