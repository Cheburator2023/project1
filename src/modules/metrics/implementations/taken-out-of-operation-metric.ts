import { IndependentMetric } from '../base'
import { MetricPercentResult } from '../interfaces'

export class TakenOutOfOperationMetric extends IndependentMetric<MetricPercentResult> {
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
    const { actualStartDate, actualEndDate } = this.getActualDateRange(startDate, endDate, isDeltaCalculation)

    return models.filter((model) => {
      const removeDate = model.remove_date ? new Date(model.remove_date) : null

      /**
       * 1. Условие: Если "Дата выведения РС/Модели из эксплуатации" модели входит в выбранный временной срез,
       *    ТО модель попадает в категорию "Кол-во моделей, выведенных из эксп.".
       */
      return this.isWithinDateRange(removeDate, actualStartDate, actualEndDate);
    })
  }
}
