import { IndependentMetric } from '../base'
import { MetricPercentResult } from '../interfaces'

export class TakenOutOfOperationMetric extends IndependentMetric<MetricPercentResult> {
  private filteredModels: any[] = [];

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

    this.filteredModels = currentFilteredModels;

    return {
      count,
      deltaPercent
    }
  }

  public getFilteredRowData() {
    return this.filteredModels.map((model) => ({
      system_model_id: model.system_model_id
    }));
  }

  private filterModels(
    models,
    startDate: string | null,
    endDate: string | null,
    isDeltaCalculation: boolean = false
  ) {
    const { actualStartDate, actualEndDate } = this.getActualDateRange(startDate, endDate, isDeltaCalculation ? 7 : null)

    return models.filter((model) => {
      const decomissDate = model.rs_model_decommiss_date ? new Date(model.rs_model_decommiss_date) : null

      /**
       * 1. Условие: Если "Дата выведения РС/Модели из эксплуатации" модели входит в выбранный временной срез,
       *    ТО модель попадает в категорию "Кол-во моделей, выведенных из эксп.".
       */
      return this.isWithinDateRange(decomissDate, actualStartDate, actualEndDate);
    })
  }
}
