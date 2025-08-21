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
    
    // Модели в текущем диапазоне (от startDate до endDate)
    const currentRangeModels = this.filterModelsByDateRange(
      this.models,
      currentRange.actualStartDate,
      currentRange.actualEndDate
    );
    
    // Модели в delta диапазоне (от startDate до endDate - 7 дней)
    const deltaRangeModels = this.filterModelsByDateRange(
      this.models,
      deltaRange.actualStartDate,
      deltaRange.actualEndDate
    );

    const result = [];
    
    // Модели в текущем диапазоне
    result.push(...currentRangeModels.map((model) => ({
      system_model_id: model.system_model_id,
      period: 'current'
    })));
    
    // Модели в delta диапазоне
    result.push(...deltaRangeModels.map((model) => ({
      system_model_id: model.system_model_id,
      period: 'delta'
    })));

    return result;
  }

  // Новый метод для расчета delta по временным диапазонам
  private calculateDeltaByExactDates(): number {
    const { currentRange, deltaRange } = this.getCorrectDateRangeForDelta(this.startDate, this.endDate);
    
    // Модели в текущем диапазоне (от startDate до endDate)
    const currentRangeModels = this.filterModelsByDateRange(
      this.models,
      currentRange.actualStartDate,
      currentRange.actualEndDate
    );
    
    // Модели в delta диапазоне (от startDate до endDate - 7 дней)
    const deltaRangeModels = this.filterModelsByDateRange(
      this.models,
      deltaRange.actualStartDate,
      deltaRange.actualEndDate
    );

    return currentRangeModels.length - deltaRangeModels.length;
  }

  // Отдельный метод для фильтрации по временным диапазонам (для delta)
  private filterModelsByDateRange(
    models,
    startDate: Date,
    endDate: Date
  ) {
    return models.filter((model) => {
      const modelEpic12 = model.model_epic_12_date ? new Date(model.model_epic_12_date) : null

      /**
       * Условие: Если "Дата Epic 12" модели входит в выбранный временной срез,
       * ТО модель попадает в категорию "На мониторинге".
       * Дата Epic 12 должна попадать в диапазон [startDate, endDate]
       */
      if (
        this.isWithinDateRange(modelEpic12, startDate, endDate)
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
    const { actualStartDate, actualEndDate } = this.getActualDateRange(startDate, endDate, null)

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
