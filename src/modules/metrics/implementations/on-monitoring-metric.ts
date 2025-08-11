import { IndependentMetric } from '../base'
import { MetricResult } from '../interfaces'

export class OnMonitoringMetric extends IndependentMetric<MetricResult> {
  private filteredModels: any[] = [];

  calculate(): MetricResult {
    const currentFilteredModels = this.filterModels(
      this.models,
      this.startDate,
      this.endDate
    )

    const count = currentFilteredModels.length
    
    const delta = this.calculateDeltaByExactDates()

    this.filteredModels = currentFilteredModels;

    return {
      count,
      delta
    }
  }

  public getFilteredRowData() {
    return this.filteredModels.map((model) => ({
      system_model_id: model.system_model_id,
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

  private calculateDeltaByExactDates(): number {
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

    return currentDayModels.length - deltaDayModels.length;
  }

  // Отдельный метод для фильтрации по точным датам (только для delta)
  private filterModelsByExactDate(
    models,
    exactStartDate: Date,
    exactEndDate: Date
  ) {
    return models.filter((model) => {
      const modelEpic12 = model.model_epic_12_date ? new Date(model.model_epic_12_date) : null

      if (
        this.isWithinDateRange(modelEpic12, exactStartDate, exactEndDate)
      ) {
        return true
      }

      return false
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
