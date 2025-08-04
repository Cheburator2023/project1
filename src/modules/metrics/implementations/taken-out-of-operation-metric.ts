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

    const count = currentFilteredModels.length
    
    // Новая delta логика по точным датам
    const deltaPercent = this.calculateDeltaPercentByExactDates()

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

  public getFilteredDeltaRowData() {
    const { currentRange, deltaRange } = this.getCorrectDateRangeForDelta(this.startDate, this.endDate);
    
    // Модели за текущую дату
    const currentDayModels = this.filterModelsByExactDate(
      this.models,
      currentRange.actualStartDate,
      currentRange.actualEndDate
    );
    
    // Модели за delta дату
    const deltaDayModels = this.filterModelsByExactDate(
      this.models,
      deltaRange.actualStartDate,
      deltaRange.actualEndDate
    );

    const result = [];
    
    // Модели за текущую дату
    result.push(...currentDayModels.map((model) => ({
      system_model_id: model.system_model_id,
      period: 'current'
    })));
    
    // Модели за delta дату
    result.push(...deltaDayModels.map((model) => ({
      system_model_id: model.system_model_id,
      period: 'delta'
    })));

    return result;
  }

  // Новый метод для расчета deltaPercent по точным датам
  private calculateDeltaPercentByExactDates(): number {
    const { currentRange, deltaRange } = this.getCorrectDateRangeForDelta(this.startDate, this.endDate);
    
    // Модели точно на текущую дату (или endDate)
    const currentDayModels = this.filterModelsByExactDate(
      this.models,
      currentRange.actualStartDate,
      currentRange.actualEndDate
    );
    
    // Модели точно на дату-7 дней
    const deltaDayModels = this.filterModelsByExactDate(
      this.models,
      deltaRange.actualStartDate,
      deltaRange.actualEndDate
    );

    return this.calculatePercentageDelta(
      currentDayModels.length,
      deltaDayModels.length
    );
  }

  // Отдельный метод для фильтрации по точным датам (только для delta)
  private filterModelsByExactDate(
    models,
    exactStartDate: Date,
    exactEndDate: Date
  ) {
    return models.filter((model) => {
      const decomissDate = model.rs_model_decommiss_date ? new Date(model.rs_model_decommiss_date) : null

      /**
       * 1. Условие: Если "Дата вывода из экспл." модели входит в выбранный временной срез,
       *    ТО модель попадает в категорию "Кол-во моделей, выведенных из эксп.".
       */
      return this.isWithinDateRange(decomissDate, exactStartDate, exactEndDate);
    })
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
