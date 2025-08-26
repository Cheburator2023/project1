import { IndependentMetric } from '../base'
import { MetricResult } from '../interfaces'

export class DevelopedMetric extends IndependentMetric<MetricResult> {
  private filteredModels: any[] = [];

  calculate() {
    const countFilteredModels = this.filterModels(
      this.models,
      this.startDate,
      this.endDate
    )

    const count = countFilteredModels.length
    
    // Новая delta логика по точным датам
    const delta = this.calculateDeltaByExactDates()

    this.filteredModels = countFilteredModels;

    return {
      count,
      delta
    }
  }

  public getFilteredRowData() {
    return this.filteredModels.map((model) => ({
      system_model_id: model.system_model_id,
      ds_stream: model.ds_stream
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
      ds_stream: model.ds_stream,
      date_of_introduction_into_operation: model.date_of_introduction_into_operation,
      developing_end_date: model.developing_end_date,
      data_completion_of_stage_05a: model.data_completion_of_stage_05a,
      period: 'current'
    })));
    
    // Модели в delta диапазоне
    result.push(...deltaRangeModels.map((model) => ({
      system_model_id: model.system_model_id,
      ds_stream: model.ds_stream,
      date_of_introduction_into_operation: model.date_of_introduction_into_operation,
      developing_end_date: model.developing_end_date,
      data_completion_of_stage_05a: model.data_completion_of_stage_05a,
      period: 'past'
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
      const releaseDate = model.date_of_introduction_into_operation ? new Date(model.date_of_introduction_into_operation) : null
      const developingEndDate = model.developing_end_date ? new Date(model.developing_end_date) : null
      const pilotEndDate = model.data_completion_of_stage_05a ? new Date(model.data_completion_of_stage_05a) : null

      /**
       * 1. Условие: модель с завершенной стадией разработки,
       *    НО при этом еще НЕ внедренная.
       *    Дата окончания разработки должна попадать в диапазон [startDate, endDate]
       */
      if (
        this.isOutsideDateRange(releaseDate, startDate, endDate) &&
        this.isWithinDateRange(developingEndDate, startDate, endDate)
      ) {
        return true
      }

      /**
       * 2. Условие: модель с завершенной стадией пилота (05A),
       *    НО при этом НЕ завершена стадия разработки (04) И НЕ внедрена.
       *    Дата завершения пилота должна попадать в диапазон [startDate, endDate]
       */
      if (
        this.isOutsideDateRange(releaseDate, startDate, endDate) &&
        this.isOutsideDateRange(developingEndDate, startDate, endDate) &&
        this.isWithinDateRange(pilotEndDate, startDate, endDate)
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
      const releaseDate = model.date_of_introduction_into_operation ? new Date(model.date_of_introduction_into_operation) : null
      const developingEndDate = model.developing_end_date ? new Date(model.developing_end_date) : null
      const pilotEndDate = model.data_completion_of_stage_05a ? new Date(model.data_completion_of_stage_05a) : null

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
